import type { OmsSnapshot, CommandContext, Entity } from './types';
import type { InboundPlan, InboundOrder, OutboundOrder, OutboundPlan, PlatformAllocation, PurchaseOrder, ReplenishmentPlan, ReplenishmentPluginTask, TransferOrder } from './replenishment';
import { allocationTotal, destinationNeedsPlatform, itemTotal } from './replenishment';

export type ReplenishmentCommand =
  | { type: 'replenishment_create'; plan: Omit<ReplenishmentPlan, keyof Entity | 'status' | 'createdAt'>; submit?: boolean }
  | { type: 'inbound_create'; plan: Omit<InboundPlan, keyof Entity | 'status' | 'createdAt'>; submit?: boolean }
  | { type: 'inbound_submit'; inboundPlanId: string }
  | { type: 'inbound_approve'; inboundPlanId: string }
  | { type: 'inbound_start_processing'; inboundPlanId: string }
  | { type: 'inbound_confirm_destination'; inboundPlanId: string }
  | { type: 'inbound_cancel'; inboundPlanId: string; reason: string }
  | { type: 'inbound_advance_platform'; inboundPlanId: string; stage: 'request' | 'request_result' | 'packing_options' | 'packing_confirm' | 'packing_submit' | 'placement_options' | 'placement_confirm' | 'transport_options' | 'transport_confirm' | 'labels' | 'placement_direct' }
  | { type: 'inbound_update_boxes'; inboundPlanId: string; allocationId: string; boxes: import('./replenishment').PackingBox[] }
  | { type: 'inbound_confirm_packing'; inboundPlanId: string; allocationId: string; boxes?: import('./replenishment').PackingBox[] }
  | { type: 'inbound_select_packing_option'; inboundPlanId: string; optionId: string }
  | { type: 'inbound_select_placement_option'; inboundPlanId: string; optionId: string }
  | { type: 'inbound_select_transport_option'; inboundPlanId: string; allocationId: string; optionId: string }
  | { type: 'inbound_update_shipment_tracking'; inboundPlanId: string; allocationId: string; carrier: string; trackingNumber: string; shippedAt?: string }
  | { type: 'inbound_save_packing_boxes'; inboundPlanId: string; packingGroupBoxes: Record<string, import('./replenishment').PackingBox[]> }
  | { type: 'inbound_packing_boxes_submit'; inboundPlanId: string; packingGroupBoxes: Record<string, import('./replenishment').PackingBox[]> }
  | { type: 'inbound_confirm_all_transport'; inboundPlanId: string; selections: { allocationId: string; optionId: string }[] }
  | { type: 'replenishment_submit'; planId: string }
  | { type: 'replenishment_approve'; planId: string }
  | { type: 'replenishment_cancel'; planId: string; reason: string }
  | { type: 'inbound_request_platform'; inboundPlanId: string }
  | { type: 'inbound_generate_execution'; inboundPlanId: string }
  | { type: 'inbound_release_source'; inboundPlanId: string }
  | { type: 'inbound_record_direct_dispatch'; inboundPlanId: string; reference: string; carrier: string; trackingNumber: string; shippedAt?: string }
  | { type: 'inbound_receive'; inboundOrderId: string; received: number; damaged: number; reference: string }
  | { type: 'outbound_request_labels'; outboundOrderId: string; kind: 'platform_box' | 'platform_item' | 'oms_carton' | 'packing_list' }
  | { type: 'outbound_mark_dispatched'; outboundOrderId: string; carrier: string; trackingNumber: string };

const entity = (s: OmsSnapshot, id: string): Entity => ({ tenantId: s.tenantId, companyId: s.companyId, merchantId: s.merchantId, id, revision: 1 });
const fail = (message: string): never => { throw new Error(message); };
const planFor = (s: OmsSnapshot, id: string) => s.replenishmentPlans?.find(v => v.id === id) ?? fail('补货计划不存在');
const inboundFor = (s: OmsSnapshot, id: string) => s.inboundPlansV2?.find(v => v.id === id) ?? fail('入库计划不存在');
const nowIso = (ctx: CommandContext) => new Date(ctx.now).toISOString();

export function executeReplenishment(current: OmsSnapshot, command: ReplenishmentCommand, context: CommandContext): OmsSnapshot {
  if (!current.merchantId || current.merchantId === 'all') fail('业务操作必须归属具体商家');
  if (!context.canWrite) fail('当前角色没有操作权限');
  if (context.expectedRevision !== undefined && current.revision !== context.expectedRevision) fail('业务记录已变化，请刷新后重试');
  if (current.commandIds.includes(context.id)) return current;
  const s = structuredClone(current);
  s.replenishmentPlans ??= []; s.transferOrders ??= []; s.purchaseOrders ??= []; s.inboundPlansV2 ??= []; s.platformAllocations ??= [];
  s.outboundPlans ??= []; s.inboundOrders ??= []; s.outboundOrdersV2 ??= []; s.replenishmentPluginTasks ??= [];
  let target = '';
  if (command.type === 'inbound_create') {
    const p = command.plan;
    if (!p.number.trim() || !p.lines.length || !p.destinationType || !p.sourceType) fail('入库计划必须填写编号、发货方、收货目标和商品');
    if (!p.sourceAddress?.address1?.trim() || !p.sourceAddress.country?.trim()) fail('入库计划必须填写一个真实发货地址');
    if (!p.lines.every(l => Number.isSafeInteger(l.quantity) && l.quantity > 0 && l.sku.trim())) fail('入库计划商品数量无效');
    if (p.destinationType === 'amazon_fba' && (!p.connectionId || !p.site)) fail('Amazon FBA 入库计划必须选择连接和站点');
    target = `ip:${context.id}`;
    s.inboundPlansV2.push({ ...entity(s, target), ...p, status: command.submit ? 'pending_approval' : 'draft', platformStage: 'not_started', pluginStatus: 'not_submitted', createdAt: nowIso(context), allocationIds: p.allocationIds?.length ? p.allocationIds : [], inboundOrderIds: p.inboundOrderIds?.length ? p.inboundOrderIds : [], outboundPlanIds: p.outboundPlanIds?.length ? p.outboundPlanIds : [] });
  } else if (command.type === 'inbound_submit') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (inbound.status !== 'draft') fail('只有草稿状态的入库计划可以提交');
    if (!inbound.sourceAddress?.address1?.trim()) fail('请先补充唯一发货地址');
    inbound.status = destinationNeedsPlatform(inbound.destinationType) ? 'awaiting_platform' : 'ready_for_execution'; inbound.revision++;
  } else if (command.type === 'inbound_approve') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (inbound.status !== 'pending_approval') fail('只有待审批的入库计划可以审批');
    inbound.status = 'approved'; inbound.platformStage = 'not_started'; inbound.confirmedAt = nowIso(context); inbound.revision++;
  } else if (command.type === 'inbound_start_processing') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (inbound.status !== 'approved') fail('只有已审批的入库计划可以开始办理');
    if (destinationNeedsPlatform(inbound.destinationType)) {
      // 平台类目标：直接合并「开始办理」+「申请入仓」两步，一次点击完成
      inbound.status = 'awaiting_platform';
      inbound.platformStage = 'request_submitted';
      inbound.platformOperationId = `op-${inbound.number}-request`;
      inbound.platform = { provider: inbound.destinationType, externalStatus: 'request_submitted', syncedAt: nowIso(context) };
      inbound.pluginStatus = 'submitting';
    } else {
      inbound.status = 'preparing';
    }
    inbound.revision++;
  } else if (command.type === 'inbound_confirm_destination') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!['preparing', 'ready_for_execution'].includes(inbound.status)) fail('当前状态不可确认收货目标');
    inbound.status = 'ready_for_execution'; inbound.revision++;
  } else if (command.type === 'inbound_cancel') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!command.reason.trim()) fail('取消入库计划必须填写原因');
    if (!['draft', 'pending_approval', 'approved', 'preparing', 'awaiting_platform', 'packing_options', 'packing', 'placement_options', 'transport_preparing', 'platform_confirmed', 'ready_for_execution', 'executing'].includes(inbound.status)) fail('当前状态不允许取消入库计划');
    inbound.status = 'cancelled'; inbound.revision++;
  } else if (command.type === 'inbound_advance_platform') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!destinationNeedsPlatform(inbound.destinationType)) fail('自有仓或三方仓不需要平台流程');
    const stage = command.stage;
    const next: Record<typeof stage, InboundPlan['status']> = { request: 'awaiting_platform', request_result: 'awaiting_platform', packing_options: 'packing', packing_confirm: 'packing', packing_submit: 'placement_options', placement_options: 'placement_options', placement_confirm: 'transport_preparing', transport_options: 'transport_preparing', transport_confirm: 'ready_for_execution', labels: 'ready_for_execution', placement_direct: 'placement_options' };
    if (!['awaiting_platform', 'packing_options', 'packing', 'placement_options', 'transport_preparing', 'platform_confirmed', 'ready_for_execution'].includes(inbound.status)) fail('当前平台节点不可执行');
    if (stage === 'packing_options' && inbound.platformStage !== 'request_confirmed') fail('平台申请尚未受理，不能获取包装方案');
    if (stage === 'request_result' && inbound.platformStage !== 'request_submitted') fail('没有待查询的平台申请');
    if (stage === 'placement_direct' && inbound.platformStage !== 'request_confirmed') fail('平台申请尚未受理');
    inbound.platformStage = stage === 'request' ? 'request_submitted' : stage === 'request_result' ? 'request_confirmed' : stage === 'packing_options' ? 'packing_confirmed' : stage === 'packing_confirm' ? 'packing_confirmed' : stage === 'packing_submit' ? 'placement_options_ready' : stage === 'placement_options' ? 'placement_options_ready' : stage === 'placement_confirm' ? 'placement_confirmed' : stage === 'transport_options' ? 'transport_options_ready' : stage === 'transport_confirm' ? 'transport_confirmed' : 'labels_ready';
    inbound.platformOperationId = `op-${inbound.number}-${stage}`;
    if (stage === 'request') inbound.platform = { provider: inbound.destinationType, externalStatus: 'request_submitted', syncedAt: nowIso(context) };
    if (stage === 'request_result') {
      inbound.platform = { ...inbound.platform, provider: inbound.destinationType, externalStatus: 'request_confirmed', externalPlanId: `FBA-INBD-${inbound.number.replace(/^IP-/, '')}`, syncedAt: nowIso(context) };
      inbound.pluginStatus = 'success';
    }
    inbound.status = next[stage];

    // ── 模拟平台返回数据 ──────────────────────────────────────────────────────
    const expiresAt = new Date(new Date(nowIso(context)).getTime() + 24 * 3600 * 1000).toISOString();

    if (stage === 'packing_options') {
      // 平台返回包装方案选项（2个）
      inbound.packingOptions = ([
        {
          id: `po:${inbound.id}:1`,
          externalOptionId: 'FBA-PKG-OPT-001',
          label: '标准分组（推荐）',
          packingGroups: [{
            id: `pg:${inbound.id}:1a`, externalGroupId: 'PG-STANDARD',
            lines: inbound.lines.map(l => ({ lineId: l.id, quantity: l.quantity })),
            supportedTransportModes: ['SPD', 'LTL'] as ('SPD' | 'LTL' | 'FTL')[],
          }],
          fees: [] as { currency: string; amount: number; type: string }[],
          expiresAt,
        },
        ...(inbound.lines.length > 1 ? [{
          id: `po:${inbound.id}:2`,
          externalOptionId: 'FBA-PKG-OPT-002',
          label: '按品类分组',
          packingGroups: inbound.lines.map((l, i) => ({
            id: `pg:${inbound.id}:2${String.fromCharCode(97 + i)}`,
            externalGroupId: `PG-SPLIT-${i + 1}`,
            lines: [{ lineId: l.id, quantity: l.quantity }],
            supportedTransportModes: ['SPD'] as ('SPD' | 'LTL' | 'FTL')[],
          })),
          fees: [{ currency: 'USD', amount: 15, type: '分组处理费' }],
          expiresAt,
        }] : []),
      ] as import('./replenishment').FbaPackingOption[]);
    }

    if (stage === 'packing_submit') {
      // 平台返回分仓方案（2个选项：双仓 or 单仓）
      const half1 = inbound.lines.map(l => ({ lineId: l.id, quantity: Math.max(1, Math.ceil(l.quantity / 2)) }));
      const half2 = inbound.lines.map(l => ({ lineId: l.id, quantity: Math.max(0, l.quantity - Math.max(1, Math.ceil(l.quantity / 2))) }));
      inbound.placementOptions = [
        {
          id: `place:${inbound.id}:1`,
          externalOptionId: 'FBA-PLACE-OPT-001',
          shipments: [
            { externalShipmentId: `FBA-${inbound.number}-SHP-1`, destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', lines: half1 },
            { externalShipmentId: `FBA-${inbound.number}-SHP-2`, destinationCode: 'AMAZON-FC-ORD', destinationName: 'Amazon FC Chicago (ORD4)', lines: half2 },
          ],
          fees: [],
          expiresAt,
        },
        {
          id: `place:${inbound.id}:2`,
          externalOptionId: 'FBA-PLACE-OPT-002',
          shipments: [
            { externalShipmentId: `FBA-${inbound.number}-SHP-A`, destinationCode: 'AMAZON-FC-LAX', destinationName: 'Amazon FC Los Angeles (LAX9)', lines: inbound.lines.map(l => ({ lineId: l.id, quantity: l.quantity })) },
          ],
          fees: [{ currency: 'USD', amount: 28.50, type: '单仓运费折扣' }],
          discount: [{ currency: 'USD', amount: 28.50 }],
          expiresAt,
        },
      ];
    }

    if (stage === 'placement_direct') {
      // 先分仓再装箱：直接生成分仓方案，跳过装箱
      const expiry2 = new Date(new Date(nowIso(context)).getTime() + 24 * 3600 * 1000).toISOString();
      inbound.placementOptions = [
        {
          id: `place:${inbound.id}:1`,
          externalOptionId: 'FBA-PLACE-OPT-001',
          shipments: [
            { externalShipmentId: `FBA-${inbound.number}-SHP-1`, destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', lines: inbound.lines.map(l => ({ lineId: l.id, quantity: Math.ceil(l.quantity / 2) })) },
            { externalShipmentId: `FBA-${inbound.number}-SHP-2`, destinationCode: 'AMAZON-FC-ORD', destinationName: 'Amazon FC Chicago (ORD4)', lines: inbound.lines.map(l => ({ lineId: l.id, quantity: Math.max(0, l.quantity - Math.max(1, Math.ceil(l.quantity / 2))) })) },
          ],
          fees: [],
          expiresAt: expiry2,
        },
        {
          id: `place:${inbound.id}:2`,
          externalOptionId: 'FBA-PLACE-OPT-002',
          shipments: [
            { externalShipmentId: `FBA-${inbound.number}-SHP-A`, destinationCode: 'AMAZON-FC-LAX', destinationName: 'Amazon FC Los Angeles (LAX9)', lines: inbound.lines.map(l => ({ lineId: l.id, quantity: l.quantity })) },
          ],
          fees: [{ currency: 'USD', amount: 28.50, type: '单仓运费折扣' }],
          discount: [{ currency: 'USD', amount: 28.50 }],
          expiresAt: expiry2,
        },
      ];
      inbound.platformStage = 'placement_options_ready';
    }

    if (stage === 'transport_options') {
      // 平台为每票货件返回运输方案
      const allocs = s.platformAllocations?.filter(a => inbound.allocationIds.includes(a.id)) ?? [];
      const arrivalDate = new Date(new Date(nowIso(context)).getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const arrivalDateLtl = new Date(new Date(nowIso(context)).getTime() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      inbound.transportOptions = {};
      allocs.forEach(alloc => {
        const suffix = alloc.externalShipmentId?.slice(-4) ?? alloc.id.slice(-4);
        inbound.transportOptions![alloc.id] = [
          { id: `tr:${alloc.id}:spd`, externalOptionId: `SPD-${suffix}`, mode: 'SPD', carrier: 'UPS', serviceType: 'Ground', isPartnered: true, quote: { currency: 'USD', amount: 42.80, expiresAt }, estimatedArrival: arrivalDate },
          { id: `tr:${alloc.id}:ltl`, externalOptionId: `LTL-${suffix}`, mode: 'LTL', carrier: 'XPO Logistics', serviceType: 'LTL Standard', isPartnered: false, estimatedArrival: arrivalDateLtl },
        ];
      });
    }
    if (stage === 'placement_confirm') {
      const first = Math.ceil(itemTotal(inbound.lines) / 2); const second = itemTotal(inbound.lines) - first; const chunks = second > 0 ? [first, second] : [first];
      inbound.allocationIds = []; chunks.forEach((quantity, index) => { const allocation: PlatformAllocation = { ...entity(s, `allocation:${inbound.id}:${index + 1}`), inboundPlanId: inbound.id, externalShipmentId: `PLATFORM-SHIP-${inbound.number}-${index + 1}`, destinationCode: `${inbound.destinationType.toUpperCase()}-DEST-${index + 1}`, lines: [{ lineId: inbound.lines[0].id, quantity }], status: 'confirmed', sourceExecutionIds: [] }; s.platformAllocations!.push(allocation); inbound.allocationIds.push(allocation.id); }); inbound.platform = { provider: inbound.destinationType, externalPlanId: `PLATFORM-${inbound.number}`, externalStatus: 'placement_confirmed', syncedAt: nowIso(context) };
    }
    if (stage === 'labels') {
      inbound.labelsReady = true;
      // 获取标签时，回填承运信息 + 为 SEND 合作承运商生成追踪号 + 创建标签对象（供 UI 预览下载）
      const labelAllocs = s.platformAllocations?.filter(a => inbound.allocationIds.includes(a.id)) ?? [];
      labelAllocs.forEach(la => {
        const optionId = inbound.selectedTransportOptions?.[la.id];
        const opt = inbound.transportOptions?.[la.id]?.find(o => o.id === optionId);
        if (opt) {
          const seed = (la.externalShipmentId ?? la.id).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-8).padStart(8, '0');
          const autoTracking = opt.isPartnered && opt.mode === 'SPD' && !la.transport?.trackingNumber
            ? `1Z${seed}00000001` : la.transport?.trackingNumber;
          la.transport = {
            ...(la.transport ?? {}),
            mode: la.transport?.mode ?? opt.mode,
            carrier: la.transport?.carrier ?? opt.carrier,
            estimatedArrival: la.transport?.estimatedArrival ?? opt.estimatedArrival,
            ...(autoTracking ? { trackingNumber: autoTracking } : {}),
          };
          const shipId = (la.externalShipmentId ?? la.id).replace(/[^A-Z0-9\-]/gi, '');
          la.labels = [
            { id: `lbl:${la.id}:box`, kind: 'platform_box' as const, fileName: `${shipId}-box-label.pdf`,    status: 'ready' as const, downloadUrl: `/demo-labels/${shipId}-box.pdf`,    readyAt: nowIso(context) },
            { id: `lbl:${la.id}:pl`,  kind: 'packing_list' as const, fileName: `${shipId}-packing-list.pdf`, status: 'ready' as const, downloadUrl: `/demo-labels/${shipId}-pl.pdf`,     readyAt: nowIso(context) },
          ];
          la.revision = (la.revision ?? 1) + 1;
        }
      });
    }
    inbound.revision++;
  } else if (command.type === 'replenishment_create') {
    const p = command.plan;
    if (!p.number.trim() || !p.lines.length || !p.destinationType || !p.sourceType) fail('补货计划必须填写编号、来源、目标和商品');
    if (!p.lines.every(l => Number.isSafeInteger(l.quantity) && l.quantity > 0 && l.sku.trim())) fail('补货计划商品数量无效');
    target = `rp:${context.id}`;
    s.replenishmentPlans.push({ ...entity(s, target), ...p, status: command.submit ? 'pending_approval' : 'draft', createdAt: nowIso(context) });
  } else if (command.type === 'replenishment_submit') {
    const p = planFor(s, command.planId); target = p.id;
    if (p.status !== 'draft') fail('只有草稿状态的补货计划可以提交审批');
    p.status = 'pending_approval'; p.revision++;
  } else if (command.type === 'replenishment_approve') {
    const p = planFor(s, command.planId); target = p.id;
    if (p.status !== 'pending_approval') fail('只有待审批的补货计划可以审批');
    p.status = 'approved'; p.approvedAt = nowIso(context); p.revision++;
    const inboundId = `ip:${p.id}`;
    const inbound: InboundPlan = { ...entity(s, inboundId), number: `IP-${p.number.replace(/^RP-?/, '')}`, replenishmentPlanId: p.id, sourceType: p.sourceType, destinationType: p.destinationType, destinationWarehouseId: p.destinationWarehouseId, connectionId: p.connectionId, site: p.site, lines: structuredClone(p.lines), status: destinationNeedsPlatform(p.destinationType) ? 'awaiting_platform' : 'ready_for_execution', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], purchaseOrderId: p.purchaseOrderId, createdAt: nowIso(context) };
    s.inboundPlansV2.push(inbound); p.inboundPlanId = inboundId; p.status = 'inbound_planning'; p.revision++;
    if (p.sourceType === 'transfer') {
      if (!p.sourceWarehouseId || !p.destinationWarehouseId) fail('调拨补货必须填写来源仓和目标仓');
      const transfer: TransferOrder = { ...entity(s, `to:${p.id}`), number: `TR-${p.number.replace(/^RP-?/, '')}`, replenishmentPlanId: p.id, sourceWarehouseId: p.sourceWarehouseId!, destinationWarehouseId: p.destinationWarehouseId!, lines: structuredClone(p.lines), status: 'planned' };
      s.transferOrders.push(transfer); p.transferOrderId = transfer.id;
    } else if (p.sourceType === 'purchase') {
      if (!p.supplierId) fail('采购补货必须选择供应商');
      const po: PurchaseOrder = { ...entity(s, `po:${p.id}`), number: `PO-${p.number.replace(/^RP-?/, '')}`, replenishmentPlanId: p.id, supplierId: p.supplierId!, destinationWarehouseId: p.destinationWarehouseId, lines: structuredClone(p.lines), status: 'planned' };
      s.purchaseOrders.push(po); p.purchaseOrderId = po.id; inbound.purchaseOrderId = po.id;
    }
  } else if (command.type === 'replenishment_cancel') {
    const p = planFor(s, command.planId); target = p.id;
    if (!command.reason.trim()) fail('取消补货计划必须填写原因');
    if (!['draft', 'pending_approval', 'approved', 'inbound_planning'].includes(p.status)) fail('当前状态不允许取消补货计划');
    p.status = 'cancelled'; p.revision++;
    if (p.inboundPlanId) { const inbound = s.inboundPlansV2!.find(v => v.id === p.inboundPlanId); if (inbound && ['draft', 'awaiting_platform', 'ready_for_execution'].includes(inbound.status)) { inbound.status = 'cancelled'; inbound.revision++; } }
  } else if (command.type === 'inbound_request_platform') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!destinationNeedsPlatform(inbound.destinationType)) fail('该目标仓不需要平台入仓协调');
    if (!['awaiting_platform', 'exception'].includes(inbound.status)) fail('当前入库计划不可提交平台处理');
    const key = `${inbound.id}:create_platform_inbound`;
    if (!s.replenishmentPluginTasks.some(t => t.idempotencyKey === key && t.status !== 'failed')) {
      const task: ReplenishmentPluginTask = { ...entity(s, `plugin:${context.id}`), operation: 'create_platform_inbound', inboundPlanId: inbound.id, provider: inbound.destinationType, status: 'queued', idempotencyKey: key, requestedAt: nowIso(context), request: { lines: inbound.lines } };
      s.replenishmentPluginTasks.push(task); inbound.status = 'awaiting_platform'; inbound.revision++;
    }
  } else if (command.type === 'inbound_generate_execution') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!['ready_for_execution'].includes(inbound.status)) fail('必须先确认运输方案后才能生成执行单');
    if (destinationNeedsPlatform(inbound.destinationType) && !inbound.labelsReady) fail('请先获取标签后再生成执行单');
    if (inbound.inboundOrderIds.length) fail('正式入库单已生成');
    for (const allocationId of inbound.allocationIds.length ? inbound.allocationIds : [undefined]) {
      const allocation = allocationId ? s.platformAllocations!.find(v => v.id === allocationId) : undefined;
      const lines = allocation?.lines ?? inbound.lines.map(l => ({ lineId: l.id, quantity: l.quantity }));
      const inboundOrder: InboundOrder = { ...entity(s, `in:${inbound.id}:${inbound.inboundOrderIds.length + 1}`), number: `IN-${inbound.number.replace(/^IP-?/, '')}-${inbound.inboundOrderIds.length + 1}`, inboundPlanId: inbound.id, allocationId: allocation?.id, destinationCode: allocation?.destinationCode ?? inbound.destinationWarehouseId, lines, status: 'planned', expectedQuantity: allocationTotal(lines), receivedQuantity: 0, damagedQuantity: 0, shortQuantity: 0 };
      s.inboundOrders!.push(inboundOrder); inbound.inboundOrderIds.push(inboundOrder.id);
      const outboundPlan: OutboundPlan = { ...entity(s, `op:${inbound.id}:${inbound.outboundPlanIds.length + 1}`), number: `OP-${inbound.number.replace(/^IP-?/, '')}-${inbound.outboundPlanIds.length + 1}`, inboundPlanId: inbound.id, sourceType: inbound.sourceType, sourceWarehouseId: inbound.sourceWarehouseId ?? (inbound.replenishmentPlanId ? planFor(s, inbound.replenishmentPlanId).sourceWarehouseId : undefined), lines, status: 'planned', outboundOrderIds: [] };
      s.outboundPlans!.push(outboundPlan); inbound.outboundPlanIds.push(outboundPlan.id);
      if (['transfer', 'own_warehouse', 'third_party_warehouse'].includes(inbound.sourceType) && outboundPlan.sourceWarehouseId) {
        const out: OutboundOrder = {
          ...entity(s, `out:${outboundPlan.id}`),
          number: `OUT-${inbound.number.replace(/^IP-?/, '')}-${outboundPlan.outboundOrderIds.length + 1}`,
          outboundPlanId: outboundPlan.id, inboundOrderId: inboundOrder.id,
          sourceWarehouseId: outboundPlan.sourceWarehouseId, destinationCode: inboundOrder.destinationCode,
          lines, packageIds: [], status: 'planned',
          // 标签已就绪时，预建出库单标签对象（供出库单页直接下载）
          ...(inbound.labelsReady ? {
            labels: [
              { id: `lbl:${outboundPlan.id}:box`, kind: 'platform_box' as const, fileName: `${outboundPlan.id}-box-label.pdf`, status: 'ready' as const, downloadUrl: `/demo-labels/${outboundPlan.id}-box.pdf`, readyAt: nowIso(context) },
              { id: `lbl:${outboundPlan.id}:pl`,  kind: 'packing_list' as const, fileName: `${outboundPlan.id}-packing-list.pdf`, status: 'ready' as const, downloadUrl: `/demo-labels/${outboundPlan.id}-pl.pdf`, readyAt: nowIso(context) },
            ] satisfies import('./replenishment').OutboundLabel[],
          } : {}),
        };
        s.outboundOrdersV2!.push(out); outboundPlan.outboundOrderIds.push(out.id);
        if (allocation) allocation.sourceExecutionIds = [out.id];
      }
    }
    inbound.status = 'executing'; inbound.revision++;
  } else if (command.type === 'inbound_release_source') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!inbound.inboundOrderIds.length) fail('请先生成正式入库单');
    if (!['supplier', 'retailer'].includes(inbound.sourceType)) fail('该来源应通过出库单下发');
    if (!['executing', 'receiving'].includes(inbound.status)) fail('当前入库计划不可下发直发任务');
    inbound.sourceDispatchStatus = 'released'; inbound.revision++;
  } else if (command.type === 'inbound_record_direct_dispatch') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!['supplier', 'retailer'].includes(inbound.sourceType)) fail('只有供应商或 Retailer 直发可登记直发');
    if (!inbound.inboundOrderIds.length) fail('请先生成正式入库单');
    if (!command.reference.trim() || !command.carrier.trim() || !command.trackingNumber.trim()) fail('发货凭证、承运商和运单号不能为空');
    inbound.sourceDispatchStatus = 'shipped'; inbound.sourceDispatchReference = command.reference.trim(); inbound.sourceDispatchCarrier = command.carrier.trim(); inbound.sourceDispatchTracking = command.trackingNumber.trim(); inbound.sourceDispatchedAt = command.shippedAt ?? nowIso(context); inbound.status = 'receiving'; inbound.revision++;
    s.inboundOrders!.filter(order => inbound.inboundOrderIds.includes(order.id)).forEach(order => { if (order.status === 'planned') { order.status = 'shipped'; order.revision++; } });
  } else if (command.type === 'inbound_update_boxes') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    const alloc = s.platformAllocations!.find(a => a.id === command.allocationId) ?? fail('货件不存在');
    if (alloc.inboundPlanId !== inbound.id) fail('货件不属于该入库计划');
    alloc.boxes = command.boxes;
    alloc.revision = (alloc.revision ?? 1) + 1;
    inbound.revision++;
  } else if (command.type === 'inbound_confirm_packing') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    const alloc = s.platformAllocations!.find(a => a.id === command.allocationId) ?? fail('货件不存在');
    // 支持内联传入 boxes，实现单步原子提交（避免双次 executeReplenishment 的 revision 冲突）
    if ('boxes' in command && command.boxes?.length) { alloc.boxes = command.boxes; alloc.revision = (alloc.revision ?? 1) + 1; }
    if (!alloc.boxes?.length) fail('请先填写装箱明细再确认');
    const totalPacked = (alloc.boxes ?? []).reduce((sum, box) =>
      sum + box.lines.reduce((s2, bl) => s2 + bl.quantity, 0), 0
    );
    const totalRequired = alloc.lines.reduce((sum, l) => sum + l.quantity, 0);
    if (totalPacked !== totalRequired) fail(`装箱件数（${totalPacked}）与分配件数（${totalRequired}）不一致`);
    inbound.revision++;
  } else if (command.type === 'inbound_select_packing_option') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!inbound.packingOptions?.length) fail('尚未获取包装方案');
    const opt = inbound.packingOptions!.find(o => o.id === command.optionId) ?? fail('包装方案不存在');
    inbound.selectedPackingOptionId = opt.id;
    inbound.status = 'packing'; inbound.platformStage = 'packing_confirmed'; inbound.revision++;
  } else if (command.type === 'inbound_select_placement_option') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!inbound.placementOptions?.length) fail('尚未获取分仓方案');
    const opt = inbound.placementOptions!.find(o => o.id === command.optionId) ?? fail('分仓方案不存在');
    inbound.selectedPlacementOptionId = opt.id;
    // 按选中方案生成 allocations
    inbound.allocationIds = [];
    s.platformAllocations ??= [];
    opt.shipments.forEach((ship, idx) => {
      const a: import('./replenishment').PlatformAllocation = { ...entity(s, `alloc:${inbound.id}:${idx + 1}`), inboundPlanId: inbound.id, externalShipmentId: ship.externalShipmentId, destinationCode: ship.destinationCode, destinationName: ship.destinationName, lines: ship.lines, status: 'confirmed', sourceExecutionIds: [] };
      s.platformAllocations!.push(a); inbound.allocationIds.push(a.id);
    });
    inbound.status = 'transport_preparing'; inbound.platformStage = 'placement_confirmed';
    inbound.platform = { ...inbound.platform, provider: inbound.destinationType, externalStatus: 'placement_confirmed', syncedAt: nowIso(context) };
    inbound.revision++;
  } else if (command.type === 'inbound_select_transport_option') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    const opts = inbound.transportOptions?.[command.allocationId];
    if (!opts?.length) fail('尚未获取运输方案');
    const selOpt = opts!.find(o => o.id === command.optionId) ?? fail('运输方案不存在');
    inbound.selectedTransportOptions = { ...(inbound.selectedTransportOptions ?? {}), [command.allocationId]: command.optionId };
    // 将选定的运输方案信息回填到货件（模拟承运商确认）
    const selAlloc = s.platformAllocations?.find(a => a.id === command.allocationId);
    if (selAlloc) {
      const shipDate = new Date(context.now); shipDate.setDate(shipDate.getDate() + 1);
      const delivDays = selOpt.mode === 'LTL' ? 10 : 6;
      const delivDate = new Date(context.now); delivDate.setDate(delivDate.getDate() + delivDays);
      const delivDateStr = delivDate.toISOString().slice(0, 10);
      selAlloc.transport = {
        ...(selAlloc.transport ?? {}),
        mode: selOpt.mode,
        carrier: selOpt.carrier,
        scheduledPickup: shipDate.toISOString().slice(0, 10),
        estimatedArrival: selOpt.estimatedArrival ?? delivDateStr,
        deliveryWindow: selAlloc.transport?.deliveryWindow ?? { start: `${delivDateStr} 08:00`, end: `${delivDateStr} 12:00`, timezone: 'America/Los_Angeles' },
      };
      selAlloc.revision = (selAlloc.revision ?? 1) + 1;
    }
    // 如果所有货件都已选运输方案，推进到 ready_for_execution
    const allocs = s.platformAllocations?.filter(a => inbound.allocationIds.includes(a.id)) ?? [];
    const allConfirmed = allocs.every(a => inbound.selectedTransportOptions?.[a.id]);
    if (allConfirmed) { inbound.status = 'ready_for_execution'; inbound.platformStage = 'transport_confirmed'; }
    inbound.revision++;
  } else if (command.type === 'inbound_save_packing_boxes') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!['packing', 'packing_options'].includes(inbound.status)) fail('当前状态不支持保存装箱信息');
    inbound.packingGroupBoxes = command.packingGroupBoxes;
    inbound.revision++;
  } else if (command.type === 'inbound_packing_boxes_submit') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (!['packing', 'packing_options'].includes(inbound.status)) fail('当前状态不支持提交装箱信息');
    inbound.packingGroupBoxes = command.packingGroupBoxes;
    // 以下复用 packing_submit 阶段逻辑
    inbound.platformStage = 'placement_options_ready';
    inbound.platformOperationId = `op-${inbound.number}-packing_submit`;
    inbound.status = 'placement_options';
    const expiresAt = new Date(new Date(nowIso(context)).getTime() + 24 * 3600 * 1000).toISOString();
    const half1 = inbound.lines.map(l => ({ lineId: l.id, quantity: Math.ceil(l.quantity / 2) }));
    const half2 = inbound.lines.map(l => ({ lineId: l.id, quantity: Math.max(0, l.quantity - Math.max(1, Math.ceil(l.quantity / 2))) }));
    inbound.placementOptions = [
      {
        id: `place:${inbound.id}:1`,
        externalOptionId: 'FBA-PLACE-OPT-001',
        shipments: [
          { externalShipmentId: `FBA-${inbound.number}-SHP-1`, destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', lines: half1 },
          { externalShipmentId: `FBA-${inbound.number}-SHP-2`, destinationCode: 'AMAZON-FC-ORD', destinationName: 'Amazon FC Chicago (ORD4)', lines: half2 },
        ],
        fees: [],
        expiresAt,
      },
      {
        id: `place:${inbound.id}:2`,
        externalOptionId: 'FBA-PLACE-OPT-002',
        shipments: [
          { externalShipmentId: `FBA-${inbound.number}-SHP-A`, destinationCode: 'AMAZON-FC-LAX', destinationName: 'Amazon FC Los Angeles (LAX9)', lines: inbound.lines.map(l => ({ lineId: l.id, quantity: l.quantity })) },
        ],
        fees: [{ currency: 'USD', amount: 28.50, type: '单仓费率优惠' }],
        discount: [{ currency: 'USD', amount: 28.50 }],
        expiresAt,
      },
    ];
    inbound.revision++;
  } else if (command.type === 'inbound_confirm_all_transport') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    if (inbound.status !== 'transport_preparing') fail('当前状态不支持确认配送方案');
    const allocs = s.platformAllocations?.filter(a => inbound.allocationIds.includes(a.id)) ?? [];
    for (const { allocationId, optionId } of command.selections) {
      const opts = inbound.transportOptions?.[allocationId];
      if (!opts?.length) fail(`货件 ${allocationId} 尚未获取运输方案`);
      const bulkOpt = opts!.find(o => o.id === optionId) ?? fail('运输方案不存在');
      inbound.selectedTransportOptions = { ...(inbound.selectedTransportOptions ?? {}), [allocationId]: optionId };
      // 回填运输信息到货件（模拟承运商一键确认）
      const bulkAlloc = s.platformAllocations?.find(a => a.id === allocationId);
      if (bulkAlloc && !bulkAlloc.transport?.mode) {
        const shipDate = new Date(context.now); shipDate.setDate(shipDate.getDate() + 1);
        const delivDays = bulkOpt.mode === 'LTL' ? 10 : 6;
        const delivDate = new Date(context.now); delivDate.setDate(delivDate.getDate() + delivDays);
        const delivDateStr = delivDate.toISOString().slice(0, 10);
        bulkAlloc.transport = {
          mode: bulkOpt.mode, carrier: bulkOpt.carrier,
          scheduledPickup: shipDate.toISOString().slice(0, 10),
          estimatedArrival: bulkOpt.estimatedArrival ?? delivDateStr,
          deliveryWindow: { start: `${delivDateStr} 08:00`, end: `${delivDateStr} 12:00`, timezone: 'America/Los_Angeles' },
        };
        bulkAlloc.revision = (bulkAlloc.revision ?? 1) + 1;
      }
    }
    const allConfirmed = allocs.every(a => inbound.selectedTransportOptions?.[a.id]);
    if (allConfirmed) { inbound.status = 'ready_for_execution'; inbound.platformStage = 'transport_confirmed'; }
    inbound.revision++;
  } else if (command.type === 'inbound_update_shipment_tracking') {
    const inbound = inboundFor(s, command.inboundPlanId); target = inbound.id;
    const alloc = s.platformAllocations?.find(a => a.id === command.allocationId) ?? fail('货件不存在');
    alloc.transport = { ...(alloc.transport ?? {}), carrier: command.carrier, trackingNumber: command.trackingNumber, actualShipDate: command.shippedAt ?? nowIso(context) };
    alloc.revision = (alloc.revision ?? 1) + 1;
    // 将追踪号同步回关联出库单，并标记已发运
    (alloc.sourceExecutionIds ?? []).forEach(oid => {
      const oo = s.outboundOrdersV2?.find(o => o.id === oid);
      if (oo && !['shipped', 'completed', 'cancelled'].includes(oo.status)) {
        oo.carrier = command.carrier; oo.trackingNumber = command.trackingNumber;
        oo.dispatchedAt = command.shippedAt ?? nowIso(context); oo.status = 'shipped'; oo.revision++;
        // 同步入库单状态
        const relInboundOrder = s.inboundOrders?.find(io => io.id === oo.inboundOrderId);
        if (relInboundOrder && relInboundOrder.status === 'planned') { relInboundOrder.status = 'shipped'; relInboundOrder.revision++; }
      }
    });
    // 检查是否所有货件都已发运
    const allocs = s.platformAllocations?.filter(a => inbound.allocationIds.includes(a.id)) ?? [];
    const allShipped = allocs.every(a => a.transport?.trackingNumber);
    if (allShipped && ['ready_for_execution', 'executing'].includes(inbound.status)) { inbound.status = 'receiving'; }
    inbound.revision++;
  } else if (command.type === 'outbound_request_labels') {
    const order = s.outboundOrdersV2!.find(v => v.id === command.outboundOrderId) ?? fail('出库单不存在'); target = order.id;
    const plan = s.inboundPlansV2!.find(v => v.id === s.inboundOrders!.find(i => i.id === order.inboundOrderId)?.inboundPlanId);
    if (command.kind.startsWith('platform_') && !plan?.platform) fail('平台分仓结果尚未回传，不能获取平台标签');
    order.labels ??= [];
    const existing = order.labels.find(label => label.kind === command.kind);
    if (existing?.status === 'ready') fail('该标签已生成');
    const label = existing ?? { id: `label:${order.id}:${command.kind}`, kind: command.kind, provider: plan?.destinationType, fileName: `${order.number}-${command.kind}.pdf`, status: 'queued' as const };
    label.status = 'ready'; label.readyAt = nowIso(context); label.downloadUrl = `/demo-labels/${encodeURIComponent(label.fileName)}`;
    if (!existing) order.labels.push(label); order.revision++;
    // 获取 platform_box 标签时，同步推进入库计划标签状态并为合作承运商 SPD 生成追踪号
    if (command.kind === 'platform_box' && plan) {
      if (!plan.labelsReady) { plan.labelsReady = true; plan.revision++; }
      const labelIO = s.inboundOrders?.find(io => io.id === order.inboundOrderId);
      const labelAlloc = s.platformAllocations?.find(a => a.id === labelIO?.allocationId);
      if (labelAlloc && !labelAlloc.transport?.trackingNumber) {
        const optionId = plan.selectedTransportOptions?.[labelAlloc.id];
        const opt = plan.transportOptions?.[labelAlloc.id]?.find(o => o.id === optionId);
        if (opt?.isPartnered && opt.mode === 'SPD') {
          const seed = (labelAlloc.externalShipmentId ?? labelAlloc.id).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-8).padStart(8, '0');
          labelAlloc.transport = { ...(labelAlloc.transport ?? {}), trackingNumber: `1Z${seed}00000001` };
          labelAlloc.revision = (labelAlloc.revision ?? 1) + 1;
        }
      }
    }
  } else if (command.type === 'outbound_mark_dispatched') {
    const order = s.outboundOrdersV2!.find(v => v.id === command.outboundOrderId) ?? fail('出库单不存在'); target = order.id;
    if (!command.carrier.trim() || !command.trackingNumber.trim()) fail('承运商和运单号不能为空');
    // 判断是否为平台类型出库单（FBA/WFS/FBT）：标签由平台返回，不要求 OMS 出库单单独打标
    const dispatchIO = s.inboundOrders?.find(io => io.id === order.inboundOrderId);
    const dispatchIP = dispatchIO ? s.inboundPlansV2?.find(p => p.id === dispatchIO.inboundPlanId) : undefined;
    const isPlatformOutbound = dispatchIP && ['amazon_fba', 'tiktok_fulfillment', 'walmart_fc'].includes(dispatchIP.destinationType);
    if (!isPlatformOutbound && !order.labels?.some(label => label.status === 'ready' && (label.kind === 'packing_list' || label.kind === 'oms_carton' || label.kind === 'platform_box'))) fail('请先获取并打印装箱/箱唛标签');
    order.carrier = command.carrier; order.trackingNumber = command.trackingNumber; order.dispatchedAt = nowIso(context); order.status = 'shipped'; order.revision++;
    // 对于平台出库单，同步追踪信息回关联 allocation
    if (isPlatformOutbound && dispatchIO?.allocationId) {
      const dispatchAlloc = s.platformAllocations?.find(a => a.id === dispatchIO.allocationId);
      if (dispatchAlloc) {
        dispatchAlloc.transport = { ...(dispatchAlloc.transport ?? {}), carrier: command.carrier, trackingNumber: command.trackingNumber, actualShipDate: nowIso(context) };
        dispatchAlloc.revision = (dispatchAlloc.revision ?? 1) + 1;
      }
    }
    if (order.inboundOrderId) {
      const inboundOrder = s.inboundOrders!.find(item => item.id === order.inboundOrderId);
      if (inboundOrder && inboundOrder.status === 'planned') { inboundOrder.status = 'shipped'; inboundOrder.revision++; }
      if (inboundOrder) { const inbound = inboundFor(s, inboundOrder.inboundPlanId); if (['executing', 'ready_for_execution'].includes(inbound.status)) { inbound.status = 'receiving'; inbound.revision++; } }
    }
  } else if (command.type === 'inbound_receive') {
    const order = s.inboundOrders!.find(v => v.id === command.inboundOrderId) ?? fail('入库单不存在'); target = order.id;
    if (!['shipped', 'receiving', 'in_progress'].includes(order.status)) fail('入库单尚未发运');
    if (!Number.isSafeInteger(command.received) || command.received < 0 || !Number.isSafeInteger(command.damaged) || command.damaged < 0 || command.received + command.damaged > order.expectedQuantity || !command.reference.trim()) fail('收货数量或凭证无效');
    order.receivedQuantity += command.received; order.damagedQuantity += command.damaged; order.shortQuantity = Math.max(0, order.expectedQuantity - order.receivedQuantity - order.damagedQuantity); order.status = order.receivedQuantity + order.damagedQuantity >= order.expectedQuantity ? 'completed' : 'receiving'; order.revision++;
    const inbound = inboundFor(s, order.inboundPlanId);
    const relatedOrders = s.inboundOrders!.filter(item => item.inboundPlanId === inbound.id);
    const completed = relatedOrders.filter(item => item.status === 'completed').length;
    const received = relatedOrders.some(item => item.receivedQuantity > 0 || item.damagedQuantity > 0);
    inbound.status = completed === relatedOrders.length && relatedOrders.length > 0 ? 'completed' : received ? 'partially_received' : 'receiving';
    inbound.revision++;
  }
  s.commandIds.push(context.id); s.events.push({ id: `${context.id}:replenishment`, commandId: context.id, entityId: target, type: command.type, at: nowIso(context), description: command.type });
  return s;
}
