import { mockProducts } from '@/lib/mock-data/products';
import { acknowledgementRevisionErrors, buildVendorAcknowledgementPayload, buildVendorAsnPayload, buildVendorRoutingPayload, batchErrors, shipmentPartyErrors, withVendorShipmentParties, type VendorBatch, type VendorContainer, type VendorLine, type VendorPO } from '@/lib/vendor-workflow';
import { vendorNodeMappingErrors, type VendorNodeMapping } from '@/lib/vendor-node-mappings';
import { assertOmsInvariants, executeOmsCommand } from './commands';
import type { CommandContext, Entity, OmsSnapshot, SalesOrder } from './types';

export type CanonicalVendorLine = VendorLine & { id: string; omsVariantId: string; title: string; unitPriceMinor: number };
export type VendorOrder = Entity & Omit<VendorPO, 'lines' | 'batches'> & { type: 'retail' | 'df'; currency: string; salesOrderId: string; lines: CanonicalVendorLine[]; fixedWarehouseId?: string; paymentMethod: 'invoice' | 'ers'; region: string; createdAt: string; inventoryPublication?: { at: string; warehouseId: string; nodeId: string; quantities: { sku: string; available: number }[] } };
export type CanonicalVendorBatch = Entity & Omit<VendorBatch, 'id'> & { purchaseOrderId: string; fulfillmentId: string; artifacts?: { labels: string; packingSlip: string }; receiptId?: string };
export type VendorFinanceReceipt = Entity & { purchaseOrderId: string; currency: string; eligibleMinor: number; status: 'accepted'; batchId: string; lines: { lineId: string; received: number; short: number; damaged: number }[]; acceptedAt: string };
export type VendorJob = { id: string; kind: 'ack' | 'routing' | 'asn'; targetId: string; dueAt: number; status: 'queued' | 'completed'; commandId: string };
export type VendorSnapshot = OmsSnapshot & { vendorOrders?: VendorOrder[]; vendorBatches?: CanonicalVendorBatch[]; vendorFinanceReceipts?: VendorFinanceReceipt[]; vendorJobs?: VendorJob[] };
export type VendorCommand =
  | { type: 'vendor_import_samples' }
  | { type: 'vendor_ack'; purchaseOrderId: string; lines: VendorLine[]; reason: string }
  | { type: 'vendor_batch'; purchaseOrderId: string; batch: VendorBatch; node: VendorNodeMapping }
  | { type: 'vendor_route'; batchId: string }
  | { type: 'vendor_asn'; batchId: string; transport: Pick<VendorBatch, 'carrier' | 'tracking' | 'carrierScac' | 'shipType' | 'shippedDate' | 'estimatedDeliveryDate' | 'bol' | 'containers'> }
  | { type: 'vendor_df_fulfill'; purchaseOrderId: string; node: VendorNodeMapping }
  | { type: 'vendor_df_artifacts'; batchId: string }
  | { type: 'vendor_ship'; batchId: string; carrier: string; tracking: string }
  | { type: 'vendor_receive'; batchId: string; lines: VendorFinanceReceipt['lines'] }
  | { type: 'vendor_publish_inventory'; purchaseOrderId: string; node: VendorNodeMapping };
const envelope = (s: OmsSnapshot, id: string): Entity => ({ tenantId: s.tenantId, companyId: s.companyId, merchantId: s.merchantId, id, revision: 1 });
const fail = (errors: string[]) => { if (errors.length) throw new Error([...new Set(errors)].join('；')); };
const event = (s: VendorSnapshot, c: CommandContext, id: string, type: string, description: string, payload?: unknown) => s.events.push({ id: `${c.id}:vendor:${s.events.length}`, commandId: c.id, entityId: id, type, description, at: new Date(c.now).toISOString(), payload });
const poFor = (s: VendorSnapshot, id: string) => { const po = s.vendorOrders?.find(row => row.id === id); if (!po) throw new Error('Vendor PO 不存在或不属于当前商家'); return po; };
const batchFor = (s: VendorSnapshot, id: string) => { const batch = s.vendorBatches?.find(row => row.id === id); if (!batch) throw new Error('Vendor 批次不存在'); return batch; };
export const vendorPoView = (s: VendorSnapshot, po: VendorOrder): VendorPO => ({ ...po, batches: s.vendorBatches?.filter(batch => batch.purchaseOrderId === po.id) ?? [] });
function nodeFor(s: VendorSnapshot, po: VendorOrder, node: VendorNodeMapping, warehouseId: string) {
  fail(vendorNodeMappingErrors(node));
  if (node.companyId !== s.companyId || node.merchantScope !== s.merchantId || node.connectionId !== po.connectionId || node.warehouseId !== warehouseId) throw new Error('发货节点作用域 / 连接 / 仓库不匹配');
  if (po.type === 'df' && warehouseId !== po.fixedWarehouseId) throw new Error('DF 只能从指定外部节点对应仓库履约');
}
function schedule(s: VendorSnapshot, c: CommandContext, kind: VendorJob['kind'], targetId: string) {
  (s.vendorJobs ??= []).push({ id: `${c.id}:${kind}`, kind, targetId, dueAt: c.now + 1200, status: 'queued', commandId: c.id });
}
function core(s: VendorSnapshot, command: Parameters<typeof executeOmsCommand>[1], c: CommandContext, suffix: string): VendorSnapshot {
  return executeOmsCommand(s, command, { ...c, id: `${c.id}:core:${suffix}`, expectedRevision: undefined, domain: 'vendor' }) as VendorSnapshot;
}
function receipt(s: VendorSnapshot, batch: CanonicalVendorBatch, lines: VendorFinanceReceipt['lines'], now: number) {
  if (batch.receiptId) throw new Error('该批次已收货，不可重复计入财务');
  const po = poFor(s, batch.purchaseOrderId);
  if (lines.length !== batch.lines.length || new Set(lines.map(line => line.lineId)).size !== lines.length) throw new Error('收货必须逐行且不可重复');
  let eligibleMinor = 0;
  for (const shipped of batch.lines) {
    const source = po.lines.find(line => line.sku === shipped.sku)!;
    const line = lines.find(row => row.lineId === source.id);
    if (!line || ![line.received, line.short, line.damaged].every(n => Number.isSafeInteger(n) && n >= 0) || line.received + line.short + line.damaged !== shipped.qty) throw new Error('良品、短收、破损之和须等于批次发货数量');
    eligibleMinor += source.unitPriceMinor * line.received;
  }
  if (!Number.isSafeInteger(eligibleMinor)) throw new Error('收货金额溢出');
  const id = `${batch.id}:receipt`;
  (s.vendorFinanceReceipts ??= []).push({ ...envelope(s, id), purchaseOrderId: po.id, batchId: batch.id, currency: po.currency, eligibleMinor, status: 'accepted', lines, acceptedAt: new Date(now).toISOString() });
  batch.receiptId = id; batch.revision++;
}

/** Explicitly labelled local source, imported once; historical local storage is never overwritten. */
export function ensureVendorFixtures(current: OmsSnapshot): OmsSnapshot {
  if (current.companyId !== 'company_northwind' || current.merchantId !== 'merchant_us_amazon' || current.migratedSources.includes('canonical-vendor-source-v1')) return current;
  const s = structuredClone(current) as VendorSnapshot;
  s.vendorOrders ??= []; s.vendorBatches ??= []; s.vendorFinanceReceipts ??= []; s.vendorJobs ??= [];
  for (const [index, type] of (['retail', 'retail', 'df'] as const).entries()) {
    const id = `vendor-source-${index + 1}`;
    const lines: CanonicalVendorLine[] = mockProducts.slice(0, 2).map((product, n) => { const variant = product.variants[0]; return { id: `${id}:line:${n + 1}`, sku: variant.sku, omsVariantId: variant.id, title: product.title, ordered: type === 'df' ? n + 1 : 12 + n * 6, accepted: 0, backorder: 0, rejected: 0, backorderAllowed: type !== 'df', itemSequenceNumber: String(n + 1), vendorProductIdentifier: variant.sku, unitOfMeasure: 'Eaches', unitPriceMinor: Math.round((variant.costPrice ?? variant.price) * 100), netCost: { amount: (variant.costPrice ?? variant.price).toFixed(2), currencyCode: 'USD' } }; });
    const po: VendorOrder = { ...envelope(s, id), reference: type === 'df' ? 'DF-20261104-001' : `PO-20261104-00${index + 1}`, connectionId: 'amz-northwind-vendor-na', type, currency: 'USD', salesOrderId: `${id}:demand`, lines, status: 'pending', reason: '', route: index === 1 ? 'Prepaid' : 'Collect', routingRef: '', carrier: '', tracking: '', asn: '', cartons: 0, shipDate: '', history: ['本地来源 PO 多行样例（未调用 Amazon）'], sellingParty: { partyId: 'NW001' }, shipToParty: { partyId: type === 'df' ? 'DF-CUSTOMER' : 'ONT8', address: { name: type === 'df' ? 'Jamie Parker' : 'Amazon ONT8', addressLine1: '24300 Nandina Ave', city: 'Moreno Valley', stateOrRegion: 'CA', postalCode: '92551', countryCode: 'US' } }, fixedWarehouseId: type === 'df' ? 'wh_lax' : undefined, paymentMethod: index === 1 ? 'ers' : 'invoice', region: 'NA', createdAt: '2026-11-04T08:00:00Z' };
    s.vendorOrders.push(po);
    const address = po.shipToParty!.address!;
    const source: SalesOrder = { ...envelope(s, po.salesOrderId), number: po.reference, sourceId: po.reference, source: type === 'df' ? 'vendor_df' : 'vendor_retail', connectionId: po.connectionId, site: 'US', createdAt: po.createdAt, currency: po.currency, paidMinor: null, paymentStatus: 'Vendor settlement', customer: address.name, address: { name: address.name, phone: '', address1: address.addressLine1, city: address.city, province: address.stateOrRegion, zip: address.postalCode, country: address.countryCode }, note: 'Internal Vendor demand: only accepted quantity is available to allocate.', tags: ['vendor-internal'], lines: lines.map(line => ({ id: line.id, channelLineId: line.itemSequenceNumber!, channelSku: line.sku, omsVariantId: line.omsVariantId, sku: line.sku, title: line.title, quantity: line.ordered, cancelled: line.ordered, unit: '件', unitPriceMinor: line.unitPriceMinor, mappingSnapshot: { channelSku: line.sku, omsVariantId: line.omsVariantId } })) };
    s.orders.push(source);
  }
  s.migratedSources.push('canonical-vendor-source-v1');
  return s;
}

export function executeVendorCommand(current: OmsSnapshot, command: VendorCommand, context: CommandContext): OmsSnapshot {
  if (!current.merchantId || current.merchantId === 'all') throw new Error('请选择具体商家');
  if (current.commandIds.includes(context.id)) return current;
  if (!context.canWrite) throw new Error('当前角色没有操作权限');
  if (context.expectedRevision !== undefined && context.expectedRevision !== current.revision) throw new Error('业务记录已变化，请刷新重试');
  let s = structuredClone(current) as VendorSnapshot;
  if (command.type === 'vendor_import_samples') s = ensureVendorFixtures(s) as VendorSnapshot;
  else if (command.type === 'vendor_ack') {
    const po = poFor(s, command.purchaseOrderId);
    fail(acknowledgementRevisionErrors(vendorPoView(s, po), command.lines, command.reason));
    if (po.type === 'df' && command.lines.some(line => line.backorder > 0)) throw new Error('DF 不支持延期，须接受或拒绝');
    const lines = po.lines.map(old => { const incoming = command.lines.find(line => line.sku === old.sku)!; return { ...old, accepted: incoming.accepted, backorder: incoming.backorder, rejected: incoming.rejected, scheduledShipDate: incoming.scheduledShipDate, rejectionReason: incoming.rejectionReason }; });
    const payload = buildVendorAcknowledgementPayload({ ...vendorPoView(s, po), lines }, po.sellingParty, new Date(context.now).toISOString());
    po.acknowledgement = { status: 'processing', submittedAt: new Date(context.now).toISOString(), transactionId: `LOCAL-${context.id}`, lines, reason: command.reason }; po.revision++;
    schedule(s, context, 'ack', po.id); event(s, context, po.id, 'vendor.ack.pending', '数量确认已进入本地持久化出站队列，回执前不可分配', payload);
  } else if (command.type === 'vendor_batch' || command.type === 'vendor_df_fulfill') {
    const po = poFor(s, command.purchaseOrderId);
    if (po.acknowledgement?.status !== 'completed' || po.status === 'rejected') throw new Error('请等待有效数量确认回执');
    let batch: VendorBatch;
    if (command.type === 'vendor_df_fulfill') {
      if (po.type !== 'df') throw new Error('仅适用 DF');
      const previous = s.vendorBatches?.filter(row => row.purchaseOrderId === po.id) ?? [];
      const lines = po.lines.map(line => ({ sku: line.sku, qty: line.accepted - previous.reduce((sum, row) => sum + (row.lines.find(item => item.sku === line.sku)?.qty ?? 0), 0) })).filter(line => line.qty > 0);
      batch = { id: '', status: 'transport_ready', lines, warehouseId: po.fixedWarehouseId!, route: 'Prepaid', readyDate: new Date(context.now).toISOString().slice(0, 10), cartons: 1, pallets: 0, weightKg: 1, routingRef: '', destination: '', carrier: '', tracking: '', asn: '', submittedAt: '', transactionId: '' };
    } else { if (po.type !== 'retail') throw new Error('DF 必须使用指定节点履约'); batch = structuredClone(command.batch); }
    nodeFor(s, po, command.node, batch.warehouseId);
    batch = withVendorShipmentParties(vendorPoView(s, po), batch, command.node, po.sellingParty!.partyId, po.region);
    if (!['Collect', 'Prepaid', 'You-Ship'].includes(batch.route) || (po.type === 'retail' && batch.route !== po.route)) throw new Error('批次运输条款必须匹配来源 PO');
    fail([...batchErrors(vendorPoView(s, po), batch), ...shipmentPartyErrors(batch)]);
    batch.lines = batch.lines.filter(line => line.qty > 0);
    batch.id = `vendor-batch:${context.id}`; batch.status = batch.route === 'Collect' ? 'routing_pending' : 'transport_ready'; batch.submittedAt = new Date(context.now).toISOString(); batch.transactionId = `LOCAL-${context.id}`;
    const payload = batch.route === 'Collect' ? buildVendorRoutingPayload(vendorPoView(s, po), batch, batch.submittedAt) : { route: batch.route, manualTransport: true };
    s = core(s, { type: 'allocate', orderId: po.salesOrderId, executor: 'warehouse', warehouseId: batch.warehouseId, lines: batch.lines.map(line => ({ lineId: po.lines.find(row => row.sku === line.sku)!.id, quantity: line.qty })) }, context, 'allocate');
    (s.vendorBatches ??= []).push({ ...batch, ...envelope(s, batch.id), purchaseOrderId: po.id, fulfillmentId: `ful:${context.id}:core:allocate` });
    if (batch.route === 'Collect') schedule(s, context, 'routing', batch.id);
    event(s, context, po.id, 'vendor.batch.created', '仅已确认接受数量生成共享仓库任务及真实库存预占', payload);
  } else if (command.type === 'vendor_publish_inventory') {
    const po = poFor(s, command.purchaseOrderId);
    if (po.type !== 'df') throw new Error('仅 DF 发布节点库存');
    nodeFor(s, po, command.node, po.fixedWarehouseId!);
    const quantities = po.lines.map(line => ({ sku: line.sku, available: s.stocks.filter(stock => stock.pool === 'warehouse' && stock.warehouseId === po.fixedWarehouseId && stock.sku === line.sku).reduce((n, stock) => n + stock.onHand - stock.reserved - stock.unfulfillable, 0) }));
    po.inventoryPublication = { at: new Date(context.now).toISOString(), warehouseId: po.fixedWarehouseId!, nodeId: command.node.shipFromParty.partyId, quantities }; po.revision++;
    event(s, context, po.id, 'vendor.df.inventory', '本地库存发布回执：仅指定真实节点逐 SKU 可用库存（未调用 Amazon）', po.inventoryPublication);
  } else {
    const batch = batchFor(s, command.batchId); const po = poFor(s, batch.purchaseOrderId);
    const task = s.fulfillments.find(row => row.id === batch.fulfillmentId);
    if (!task || task.orderId !== po.salesOrderId) throw new Error('批次关联仓库任务无效');
    if (command.type === 'vendor_route') {
      if (batch.status !== 'routing_failed' || batch.route !== 'Collect') throw new Error('仅失败 Collect 路由可重试');
      const payload = buildVendorRoutingPayload(vendorPoView(s, po), batch, new Date(context.now).toISOString());
      batch.status = 'routing_pending'; batch.revision++; schedule(s, context, 'routing', batch.id); event(s, context, po.id, 'vendor.routing.pending', '本地 Collect 路由重试', payload);
    } else if (command.type === 'vendor_asn') {
      if (po.type !== 'retail' || !['routed', 'transport_ready', 'asn_failed'].includes(batch.status) || task.status !== 'packed') throw new Error('仓库打包完成且路由就绪后才能提交 ASN');
      for (const key of ['carrier', 'tracking', 'carrierScac', 'shipType', 'shippedDate', 'estimatedDeliveryDate', 'bol', 'containers'] as const) Object.assign(batch, { [key]: structuredClone(command.transport[key]) });
      const payload = buildVendorAsnPayload(vendorPoView(s, po), batch, new Date(context.now).toISOString());
      batch.status = 'asn_pending'; batch.revision++; schedule(s, context, 'asn', batch.id); event(s, context, po.id, 'vendor.asn.pending', 'ASN 已入本地队列，容器数量已逐行核验', payload);
    } else if (command.type === 'vendor_df_artifacts') {
      if (po.type !== 'df' || task.status !== 'packed' || batch.artifacts) throw new Error('DF 仓库打包完成后生成一次标签及装箱单');
      batch.artifacts = { labels: `LOCAL-LABEL-${batch.id}`, packingSlip: `LOCAL-PACKING-SLIP-${batch.id}` }; batch.revision++;
      event(s, context, po.id, 'vendor.df.artifacts', '本地文本标签 / Packing Slip 凭据已生成（非生产承运标签）', batch.artifacts);
    } else if (command.type === 'vendor_ship') {
      if (batch.status === 'shipped') throw new Error('批次已发货');
      if (po.type === 'retail' && batch.status !== 'asn') throw new Error('请等待 ASN 成功回执');
      if (po.type === 'df' && !batch.artifacts) throw new Error('须先生成 DF 标签及 Packing Slip');
      if (po.type === 'retail' && (command.carrier !== batch.carrier || command.tracking !== batch.tracking)) throw new Error('实际发运信息必须与 ASN 一致');
      s = core(s, { type: 'dispatch', fulfillmentId: task.id, carrier: command.carrier, tracking: command.tracking }, context, 'dispatch');
      const updated = batchFor(s, batch.id); updated.status = 'shipped'; updated.carrier = command.carrier; updated.tracking = command.tracking; updated.revision++;
      const updatedPo = poFor(s, po.id);
      if (updatedPo.lines.every(line => (s.vendorBatches ?? []).filter(row => row.purchaseOrderId === po.id && row.status === 'shipped').reduce((n, row) => n + (row.lines.find(item => item.sku === line.sku)?.qty ?? 0), 0) === line.accepted)) updatedPo.status = 'shipped';
      updatedPo.revision++;
      event(s, context, po.id, 'vendor.shipped', '共享包裹发货及库存消耗完成；确认 / 投递继续由共享运行时处理');
    } else if (command.type === 'vendor_receive') {
      if (po.type !== 'retail' || batch.status !== 'shipped') throw new Error('仅已发运 Retail 批次可录入收货');
      receipt(s, batch, command.lines, context.now); event(s, context, po.id, 'vendor.receipt.accepted', '手工收货凭据已接受，良品金额进入 Invoice / ERS 合格金额', { receiptId: batch.receiptId });
    }
  }
  s.commandIds.push(context.id); assertVendorInvariants(s); return s;
}

export function assertVendorInvariants(s: VendorSnapshot) {
  assertOmsInvariants(s);
  for (const rows of [s.vendorOrders ?? [], s.vendorBatches ?? [], s.vendorFinanceReceipts ?? []]) {
    if (new Set(rows.map(row => row.id)).size !== rows.length || rows.some(row => row.tenantId !== s.tenantId || row.companyId !== s.companyId || row.merchantId !== s.merchantId)) throw new Error('Vendor 实体 ID / 作用域不一致');
  }
  for (const batch of s.vendorBatches ?? []) {
    const po = poFor(s, batch.purchaseOrderId);
    const task = s.fulfillments.find(row => row.id === batch.fulfillmentId);
    if (!task || task.orderId !== po.salesOrderId || task.executor !== 'warehouse' || task.warehouseId !== batch.warehouseId || task.status === 'cancelled' || task.status === 'withdraw_pending') throw new Error('Vendor 批次缺少有效关联仓库任务');
    if (!batch.lines.length || new Set(batch.lines.map(line => line.sku)).size !== batch.lines.length || batch.lines.length !== task.lines.length) throw new Error('Vendor 批次行重复或任务不一致');
    for (const line of batch.lines) {
      const sourceLine = po.lines.find(row => row.sku === line.sku);
      if (!sourceLine || !Number.isSafeInteger(line.qty) || line.qty <= 0 || task.lines.find(row => row.lineId === sourceLine.id)?.quantity !== line.qty) throw new Error('Vendor 批次数量与共享仓库任务不一致');
    }
    if (po.type === 'df' && batch.warehouseId !== po.fixedWarehouseId) throw new Error('DF 批次不属于固定节点');
    if (batch.status === 'shipped' && !s.packages.some(pack => pack.fulfillmentId === task.id)) throw new Error('Vendor 发货缺少共享包裹');
    if (batch.receiptId && !(s.vendorFinanceReceipts ?? []).some(row => row.id === batch.receiptId && row.batchId === batch.id)) throw new Error('Vendor 收货凭据关联无效');
  }
  const receivedBatches = new Set<string>();
  for (const accepted of s.vendorFinanceReceipts ?? []) {
    const batch = batchFor(s, accepted.batchId);
    const po = poFor(s, accepted.purchaseOrderId);
    if (receivedBatches.has(batch.id) || batch.purchaseOrderId !== po.id || batch.receiptId !== accepted.id || batch.status !== 'shipped' || accepted.currency !== po.currency || accepted.status !== 'accepted' || !Number.isSafeInteger(accepted.eligibleMinor) || accepted.eligibleMinor < 0) throw new Error('Vendor 收货凭据重复或金额 / 关联无效');
    receivedBatches.add(batch.id);
    let amount = 0;
    if (accepted.lines.length !== batch.lines.length || new Set(accepted.lines.map(line => line.lineId)).size !== accepted.lines.length) throw new Error('Vendor 收货行缺失或重复');
    for (const shipped of batch.lines) {
      const source = po.lines.find(line => line.sku === shipped.sku)!;
      const line = accepted.lines.find(row => row.lineId === source.id);
      if (!line || ![line.received, line.short, line.damaged].every(n => Number.isSafeInteger(n) && n >= 0) || line.received + line.short + line.damaged !== shipped.qty) throw new Error('Vendor 收货数量不守恒');
      amount += source.unitPriceMinor * line.received;
    }
    if (amount !== accepted.eligibleMinor) throw new Error('Vendor 合格金额与良品净价不一致');
  }
  for (const po of s.vendorOrders ?? []) {
    const source = s.orders.find(row => row.id === po.salesOrderId);
    if (!source || source.source !== (po.type === 'df' ? 'vendor_df' : 'vendor_retail')) throw new Error('Vendor 缺少内部来源需求');
    for (const line of po.lines) {
      const demand = source.lines.find(row => row.id === line.id);
      if (!demand || demand.quantity - demand.cancelled !== line.accepted) throw new Error('Vendor 可分配需求必须等于已接受数量');
      const allocated = (s.vendorBatches ?? []).filter(batch => batch.purchaseOrderId === po.id).reduce((n, batch) => n + batch.lines.filter(row => row.sku === line.sku).reduce((m, row) => m + row.qty, 0), 0);
      if (allocated > line.accepted) throw new Error('Vendor 批次超过接受数量');
    }
  }
}

export function advanceVendorJobs(current: OmsSnapshot, now: number): OmsSnapshot {
  const previous = current as VendorSnapshot;
  const due = previous.vendorJobs?.filter(job => job.status === 'queued' && job.dueAt <= now) ?? [];
  const deliveries = (previous.vendorBatches ?? []).filter(batch => !batch.receiptId && previous.vendorOrders?.some(po => po.id === batch.purchaseOrderId && po.type === 'df') && previous.packages.some(pack => pack.fulfillmentId === batch.fulfillmentId && pack.deliveredAt && pack.confirmation === 'confirmed'));
  if (!due.length && !deliveries.length) return current;
  const s = structuredClone(current) as VendorSnapshot;
  for (const pending of due) {
    const job = s.vendorJobs!.find(row => row.id === pending.id)!;
    const c = { id: job.id, now: job.dueAt, actor: 'local-vendor-provider', canWrite: true };
    if (job.kind === 'ack') {
      const po = poFor(s, job.targetId);
      if (po.acknowledgement?.status === 'processing') {
        po.lines = po.lines.map(old => ({ ...old, ...po.acknowledgement!.lines!.find(line => line.sku === old.sku) })); po.reason = po.acknowledgement.reason ?? ''; po.acknowledgement.status = 'completed'; po.status = po.lines.every(line => line.rejected === line.ordered) ? 'rejected' : 'acknowledged'; po.revision++;
        const source = s.orders.find(row => row.id === po.salesOrderId)!;
        source.lines.forEach(line => { line.cancelled = line.quantity - po.lines.find(row => row.id === line.id)!.accepted; }); source.revision++;
        event(s, c, po.id, 'vendor.ack.confirmed', '本地确认回执已落账；延期 / 拒绝不进入可分配需求');
      }
    } else {
      const batch = batchFor(s, job.targetId); const po = poFor(s, batch.purchaseOrderId);
      if (job.kind === 'routing' && batch.status === 'routing_pending') { batch.status = 'routed'; batch.routingRef = `LOCAL-ROUTE-${batch.id}`; batch.destination = po.shipToParty!.partyId; batch.revision++; }
      if (job.kind === 'asn' && batch.status === 'asn_pending') { batch.status = 'asn'; batch.asn = `LOCAL-ASN-${batch.id}`; batch.revision++; }
      event(s, c, po.id, `vendor.${job.kind}.confirmed`, '本地供应商回执已落账（未调用 Amazon）');
    }
    job.status = 'completed';
  }
  for (const delivered of deliveries) {
    const batch = batchFor(s, delivered.id); const po = poFor(s, batch.purchaseOrderId);
    receipt(s, batch, batch.lines.map(line => ({ lineId: po.lines.find(row => row.sku === line.sku)!.id, received: line.qty, short: 0, damaged: 0 })), now);
    event(s, { id: `${batch.id}:delivery-receipt`, now, actor: 'local-vendor-provider', canWrite: true }, po.id, 'vendor.df.receipt.accepted', 'DF 包裹已确认并投递，生成一次合格金额收货凭据');
  }
  assertVendorInvariants(s); return s;
}
export type { VendorContainer };
