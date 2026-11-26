import { assertOmsInvariants, executeOmsCommand } from './commands';
import type { CommandContext, Entity, ItemQuantity, OmsSnapshot, SalesOrder } from './types';
import { validateBusinessConfig, type Connection } from '@/lib/amazon-connections';

/** OMS-owned task handed to the Amazon app adapter; it is not an Amazon business entity. */
export type AmazonPluginTask = Entity & {
  operation: 'create_inbound_plan' | 'get_placement_options' | 'get_box_labels' | 'submit_shipment' | 'request_appointment' | 'sync_receiving';
  sourceType: 'delivery_plan' | 'inbound_plan' | 'inbound_shipment';
  sourceId: string;
  idempotencyKey: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  requestedAt: string;
  completedAt?: string;
  request?: unknown;
  response?: unknown;
  error?: string;
};

export type FbaPlanLine = { id: string; sku: string; omsVariantId: string; sellerSku: string;
  /**
   * Amazon FNSKU（Fulfillment Network SKU）：Amazon 分配的 FBA 商品唯一条码。
   * 用于打印入仓标签（贴在每件商品上）。来源：Amazon Catalog API / 商品映射。
   * 新建计划时从商品映射中带入；供应商直发时同样必须贴 FNSKU 标签。
   */
  fnsku?: string;
  quantity: number;
};
export type FbaContainer = { id: string; weightKg: number; contents: ItemQuantity[] };
export type FbaPlacement = { id: string; destinations: { code: string; lines: ItemQuantity[] }[]; feeMinor: number };
export type FbaTransport = 'SPD' | 'LTL' | 'FTL';
export type FbaShippingInstruction = {
  /** 目标 FC 代码，如 "US-FC-A" */
  fcCode: string;
  /** Amazon FC 收货地址（供应商发货用） */
  fcAddress: string;
  /** 标签要求与入仓规范摘要 */
  requirements: string;
  /** 发货指令发出时间 */
  instructedAt?: string;
  /** 供应商回传的承运商 */
  supplierCarrier?: string;
  /** 供应商回传的运单号 */
  supplierTracking?: string;
  /** 供应商确认收到指令的时间 */
  supplierConfirmedAt?: string;
};
export type InboundPlan = Entity & {
  number: string; connectionId: string; site: string; warehouseId: string; createdAt: string;
  /** OMS 入库计划；Amazon 标识仅作为插件回传的外部引用。 */
  omsShipmentNumber?: string;
  amazonInboundPlanId?: string;
  amazonSyncStatus?: 'not_requested' | 'queued' | 'running' | 'succeeded' | 'failed';
  amazonSyncError?: string;
  lines: FbaPlanLine[]; containers: FbaContainer[]; placements: FbaPlacement[]; placementId?: string;
  status: 'draft' | 'packed' | 'placement_selected' | 'approved' | 'confirmed' | 'cancelling' | 'cancelled' | 'closed';
  transport?: FbaTransport; feesMinor?: number; sourceOrderId?: string; shipmentIds: string[];
  /** 'warehouse'（默认）：自有仓调拨补货；'supplier'：供应商直发 Amazon FC */
  sourceType?: 'warehouse' | 'supplier';
  /** 供应商直发时必填：供应商名称 */
  supplierName?: string;
  /** 供应商直发时可选：关联采购单号 */
  purchaseOrderRef?: string;
};
export type FbaReceiptLine = ItemQuantity & { damaged: number; shortClosed: number; claimQuantity: number; claimReason?: string };
export type FbaDeliveryWindow = { start: string; end: string };
export type FbaAppointment = { id: string; time: string; carrierConfirmation: string };
export type InboundShipment = Entity & {
  planId: string; connectionId: string; site: string; destination: string; lines: ItemQuantity[];
  /** OMS 出库执行引用；supplier-direct 表示供应商发货执行，不是仓库出库单。 */
  omsOutboundNumber?: string;
  amazonShipmentId?: string;
  amazonDestinationId?: string;
  amazonFcAddress?: string;
  labelStatus?: 'not_requested' | 'queued' | 'ready' | 'failed';
  fulfillmentId: string; outboundId: string; status: 'working' | 'shipped' | 'receiving' | 'cancelled' | 'closed'; receipts: FbaReceiptLine[];
  deliveryWindow?: FbaDeliveryWindow; appointment?: FbaAppointment;
  /** 供应商直发时填充，替代 OMS 出库单 */
  shippingInstruction?: FbaShippingInstruction;
};
export type FbaObservation = Entity & { stockId: string; connectionId: string; site: string; sku: string; onHand: number; reserved: number; unfulfillable: number; observedAt: string; reference: string };
export type RemovalTask = Entity & {
  stockId: string; connectionId: string; site: string; sku: string; quantity: number; bucket: 'sellable' | 'unfulfillable';
  action: 'return' | 'dispose'; status: 'pending' | 'completed'; reference: string; warehouseId?: string; returnedQuantity: number;
};

/**
 * 发货计划（FBA 补货的规划层）
 * 对应领星的"发货计划"概念：在创建 FBA 货件之前先做发货规划，可设审批。
 * 一个发货计划可关联一个 InboundPlan（STA 货件），一个 InboundPlan 也可被多个发货计划关联。
 */
export type ReplenishmentSourceType = 'transfer' | 'purchase' | 'third_party_fulfillment';
export type ReplenishmentDestinationType = 'oms_warehouse' | 'third_party_warehouse' | 'amazon_fba' | 'tiktok_fulfillment' | 'walmart_fc';
export type ReplenishmentReason = 'safety_stock' | 'forecast' | 'promotion' | 'stockout' | 'manual' | 'seasonal';
export type ReplenishmentStatus = 'draft' | 'pending_approval' | 'approved' | 'inbound_planning' | 'executing' | 'partially_completed' | 'completed' | 'cancelled' | 'exception';

/** 通用 OMS 补货计划；平台只是目标类型，不是计划类型。 */
export type FbaDeliveryPlan = Entity & {
  number: string;
  sourceType?: ReplenishmentSourceType;
  destinationType?: ReplenishmentDestinationType;
  reason?: ReplenishmentReason;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  supplierId?: string;
  retailerId?: string;
  thirdPartyWarehouseId?: string;
  connectionId: string;
  site: string;
  /** 兼容旧数据：自有仓来源 */
  warehouseId?: string;
  /** 兼容旧数据：供应商来源 */
  supplierName?: string;
  lines: FbaPlanLine[];
  plannedShipDate?: string;
  plannedArrivalDate?: string;
  status: 'draft' | 'pending' | 'done' | 'cancelled' | 'exception';
  /** 审批后创建的 OMS 入库计划；不等于平台外部计划。 */
  inboundPlanIds?: string[];
  inboundPlanId?: string;
  /** 只有确认目标分仓后才会出现正式执行单。 */
  outboundIds?: string[];
  purchaseOrderIds?: string[];
  approvedAt?: string;
  completedAt?: string;
  note?: string;
  createdAt: string;
};
/** Addons live on the same transactionally persisted OMS aggregate; no FBA workspace store. */
export type FbaSnapshot = OmsSnapshot & { inboundPlans?: InboundPlan[]; inboundShipments?: InboundShipment[]; fbaObservations?: FbaObservation[]; removalTasks?: RemovalTask[]; deliveryPlans?: FbaDeliveryPlan[] };
export type FbaContext = CommandContext & { connection?: Connection };
export type FbaCommand =
  | { type: 'fba_create_plan'; warehouseId: string; connectionId: string; site: string; lines: FbaPlanLine[] }
  | { type: 'fba_pack'; planId: string; containers: FbaContainer[] }
  | { type: 'fba_generate_placements'; planId: string }
  | { type: 'fba_select_placement'; planId: string; placementId: string }
  | { type: 'fba_confirm'; planId: string; transport: FbaTransport; expectedFeesMinor: number }
  /** 分仓结果确认后才创建正式来源执行单；支持用户手动推进。 */
  | { type: 'fba_create_execution'; planId: string; transport: FbaTransport; expectedFeesMinor: number }
  | { type: 'fba_cancel_plan'; planId: string; reason: string }
  | { type: 'fba_set_window'; shipmentId: string; deliveryWindow: FbaDeliveryWindow }
  | { type: 'fba_confirm_appointment'; shipmentId: string; appointment: FbaAppointment }
  | { type: 'fba_reschedule'; shipmentId: string; deliveryWindow: FbaDeliveryWindow }
  | { type: 'fba_receive'; shipmentId: string; lines: { lineId: string; received: number; damaged: number }[]; reference: string }
  | { type: 'fba_short_close'; shipmentId: string; reason: string }
  | { type: 'fba_claim'; shipmentId: string; lineId: string; quantity: number; reason: string }
  | { type: 'fba_observe_stock'; connectionId: string; site: string; sku: string; onHand: number; reserved: number; unfulfillable: number; observedAt: string; reference: string }
  | { type: 'fba_create_removal'; stockId: string; quantity: number; bucket: RemovalTask['bucket']; action: RemovalTask['action']; reference: string; warehouseId?: string }
  | { type: 'fba_complete_removal'; taskId: string }
  | { type: 'fba_receive_return'; taskId: string; quantity: number }
  /** 供应商直发：创建以供应商为来源的补货计划（无需仓库库存）*/
  | { type: 'fba_create_supplier_plan'; connectionId: string; site: string; supplierName: string; purchaseOrderRef: string; lines: FbaPlanLine[] }
  /** 供应商直发：将货件的发货指令标记为已发送给供应商 */
  | { type: 'fba_send_instruction'; shipmentId: string }
  /** 供应商直发：登记供应商回传的承运商和运单号 */
  | { type: 'fba_receive_supplier_tracking'; shipmentId: string; supplierCarrier: string; supplierTracking: string }
  /** 发货计划：新建草稿 */
  | { type: 'fba_create_delivery_plan'; connectionId: string; site: string; warehouseId?: string; supplierName?: string; lines: FbaPlanLine[]; plannedShipDate?: string; note?: string }
  /** 发货计划：提交审批（草稿 → 待审批） */
  | { type: 'fba_submit_delivery_plan'; deliveryPlanId: string }
  /** 发货计划：审批通过（待审批 → 已完成） */
  | { type: 'fba_approve_delivery_plan'; deliveryPlanId: string }
  /** 发货计划：关联 FBA 货件（InboundPlan） */
  | { type: 'fba_link_delivery_plan'; deliveryPlanId: string; inboundPlanId: string }
  /** 发货计划：取消 */
  | { type: 'fba_cancel_delivery_plan'; deliveryPlanId: string; reason: string }
  /** 通用入库计划的平台适配任务；插件 APP 执行后回写结果。 */
  | { type: 'fba_request_plugin_task'; sourceType: AmazonPluginTask['sourceType']; sourceId: string; operation: AmazonPluginTask['operation']; request?: unknown };

function fail(message: string): never { throw new Error(message); }
const positive = (n: number) => { if (!Number.isSafeInteger(n) || n <= 0) fail('数量必须是正整数'); };
const nonnegative = (n: number) => { if (!Number.isSafeInteger(n) || n < 0) fail('数量必须是非负整数'); };
const sum = (lines: ItemQuantity[], id: string) => lines.filter(l => l.lineId === id).reduce((n, l) => n + l.quantity, 0);
const entity = (s: FbaSnapshot, id: string): Entity => ({ tenantId: s.tenantId, companyId: s.companyId, merchantId: s.merchantId, id, revision: 1 });
const planFor = (s: FbaSnapshot, id: string) => s.inboundPlans?.find(p => p.id === id) ?? fail('补货计划不存在');
const shipmentFor = (s: FbaSnapshot, id: string) => s.inboundShipments?.find(p => p.id === id) ?? fail('入库货件不存在');
const removalFor = (s: FbaSnapshot, id: string) => s.removalTasks?.find(p => p.id === id) ?? fail('移除任务不存在');
const deliveryPlanFor = (s: FbaSnapshot, id: string) => s.deliveryPlans?.find(p => p.id === id) ?? fail('发货计划不存在');
function eligible(context: FbaContext, connectionId: string, site: string, inventory = false) {
  const c = context.connection;
  if (!c || c.id !== connectionId || c.identity !== 'seller' || !c.authorized || c.businesses.fba?.status !== 'enabled' || c.businesses.fba.site !== site) fail('Seller 授权、FBA 启用状态或站点不符合要求');
  const errors = validateBusinessConfig(c.businesses.fba!, c, 'fba');
  if (errors.length) fail(errors.join('；'));
  if (inventory && !c.businesses.fba!.syncSettings?.readInventory) fail('连接未开启库存读取');
}
export function fbaFees(plan: InboundPlan, transport: FbaTransport): number {
  if (!['SPD', 'LTL', 'FTL'].includes(transport)) fail('请选择 SPD / LTL / FTL');
  const placement = plan.placements.find(p => p.id === plan.placementId) ?? fail('请先选择分仓方案');
  const weight = plan.containers.reduce((n, c) => n + c.weightKg, 0);
  return placement.feeMinor + (transport === 'SPD' ? Math.ceil(weight * 85) + plan.containers.length * 300 : transport === 'LTL' ? 12000 + Math.ceil(weight * 35) : 45000 + Math.ceil(weight * 10));
}
function exactLines(lines: ItemQuantity[], expected: ItemQuantity[]) {
  if (!lines.length || new Set(lines.map(l => l.lineId)).size !== lines.length) fail('商品行缺失或重复');
  for (const line of lines) { positive(line.quantity); if (!expected.some(e => e.lineId === line.lineId)) fail('商品行不属于计划'); }
  for (const line of expected) if (sum(lines, line.lineId) !== line.quantity) fail('装箱或分仓数量必须与计划完全一致');
}
function validWindow(window: FbaDeliveryWindow) {
  if (!window || !Number.isFinite(Date.parse(window.start)) || !Number.isFinite(Date.parse(window.end)) || Date.parse(window.start) >= Date.parse(window.end)) fail('请填写有效的送达时间窗');
}
function booked(shipment: InboundShipment): boolean {
  const w = shipment.deliveryWindow; const a = shipment.appointment;
  return !!w && !!a && typeof a.id === 'string' && !!a.id.trim() && typeof a.carrierConfirmation === 'string' && !!a.carrierConfirmation.trim() && Number.isFinite(Date.parse(a.time)) && Date.parse(a.time) >= Date.parse(w.start) && Date.parse(a.time) <= Date.parse(w.end);
}
/** Gate the exact source fulfillment, never an appointment belonging to another shipment. */
export function canDispatchFbaSource(state: FbaSnapshot, fulfillmentId: string): boolean {
  const shipment = state.inboundShipments?.find(s => s.fulfillmentId === fulfillmentId);
  const plan = state.inboundPlans?.find(p => p.id === shipment?.planId);
  if (!shipment || !plan || plan.sourceType === 'supplier') return false;
  return plan.status === 'confirmed' && shipment.status === 'working' && (plan.transport === 'SPD' || booked(shipment));
}
export function assertCanDispatchFbaSource(state: FbaSnapshot, fulfillmentId: string): void {
  if (!canDispatchFbaSource(state, fulfillmentId)) fail('补货计划不可发货，或此卡车货件尚未确认送达时间窗及承运商预约');
}
export function canReceiveFbaShipment(state: FbaSnapshot, shipmentId: string): boolean {
  const shipment = state.inboundShipments?.find(s => s.id === shipmentId);
  const plan = state.inboundPlans?.find(p => p.id === shipment?.planId);
  if (!shipment || !plan || plan.status !== 'confirmed' || ['closed', 'cancelled'].includes(shipment.status)) return false;
  if (plan.sourceType === 'supplier') {
    return !!(shipment.shippingInstruction?.supplierTracking) && (plan.transport === 'SPD' || booked(shipment));
  }
  const task = state.fulfillments.find(f => f.id === shipment.fulfillmentId);
  return !!task && ['shipped', 'delivered'].includes(task.status) && (plan.transport === 'SPD' || booked(shipment));
}
function shipped(s: FbaSnapshot, shipment: InboundShipment) {
  const plan = planFor(s, shipment.planId);
  if (plan.sourceType === 'supplier') {
    // 供应商直发：以供应商回传运单号作为"已发货"依据，而非 OMS 仓库出库状态
    if (!shipment.shippingInstruction?.supplierTracking) fail('供应商尚未回传运单号，不能登记收货');
    if (plan.transport !== 'SPD' && !booked(shipment)) fail('卡车货件尚未确认送达时间窗及承运商预约');
    return;
  }
  const task = s.fulfillments.find(f => f.id === shipment.fulfillmentId);
  if (!task || !['shipped', 'delivered'].includes(task.status)) fail('来源仓库尚未实际发货，不能登记入库收货');
  if (plan.transport !== 'SPD' && !booked(shipment)) fail('卡车货件尚未确认送达时间窗及承运商预约');
  const packages = s.packages.filter(p => p.fulfillmentId === task.id);
  for (const line of shipment.lines) if (sum(packages.flatMap(p => p.lines), line.lineId) !== line.quantity) fail('来源包裹发货数量与货件不一致');
}
function updateStatus(s: FbaSnapshot, shipment: InboundShipment) {
  const closed = shipment.lines.every(l => { const r = shipment.receipts.find(r => r.lineId === l.lineId)!; return r.quantity + r.damaged + r.shortClosed === l.quantity; });
  shipment.status = closed ? 'closed' : shipment.receipts.some(r => r.quantity + r.damaged > 0) ? 'receiving' : 'shipped';
  shipment.revision++;
  const plan = planFor(s, shipment.planId);
  if (plan.shipmentIds.every(id => shipmentFor(s, id).status === 'closed')) { plan.status = 'closed'; plan.revision++; }
}

export function executeFba(current: FbaSnapshot, command: FbaCommand, context: FbaContext): FbaSnapshot {
  if (!current.merchantId || current.merchantId === 'all') fail('必须选择具体商家');
  if (current.commandIds.includes(context.id)) return current;
  if (!context.canWrite) fail('当前角色没有操作权限');
  if (context.expectedRevision !== undefined && current.revision !== context.expectedRevision) fail('业务记录已变化，请刷新后重试');
  assertFbaAddons(current);
  let state: FbaSnapshot = structuredClone(current);
  state.inboundPlans ??= []; state.inboundShipments ??= []; state.fbaObservations ??= []; state.removalTasks ??= []; state.deliveryPlans ??= []; state.amazonPluginTasks ??= [];
  let targetId = '';
  if (command.type === 'fba_create_plan') {
    eligible(context, command.connectionId, command.site);
    if (!command.warehouseId.trim() || !command.lines.length || new Set(command.lines.map(l => l.id)).size !== command.lines.length || new Set(command.lines.map(l => l.sku)).size !== command.lines.length) fail('请选择来源仓库及不重复商品行');
    for (const line of command.lines) {
      positive(line.quantity);
      if (![line.id, line.sku, line.omsVariantId, line.sellerSku].every(v => typeof v === 'string' && v.trim())) fail('请完成商品映射');
      if (!state.stocks.some(s => s.pool === 'warehouse' && s.warehouseId === command.warehouseId && s.sku === line.sku)) fail('来源仓库无此商品库存记录');
    }
    targetId = `fba:${state.tenantId}:${state.companyId}:${state.merchantId}:${context.id}`;
    state.inboundPlans.push({ ...entity(state, targetId), number: `FBA-${context.id.slice(-12)}`, connectionId: command.connectionId, site: command.site, warehouseId: command.warehouseId, createdAt: new Date(context.now).toISOString(), lines: structuredClone(command.lines), containers: [], placements: [], status: 'draft', shipmentIds: [] });
  } else if (command.type === 'fba_create_supplier_plan') {
    eligible(context, command.connectionId, command.site);
    if (!command.supplierName.trim()) fail('请填写供应商名称');
    if (!command.lines.length || new Set(command.lines.map(l => l.id)).size !== command.lines.length || new Set(command.lines.map(l => l.sku)).size !== command.lines.length) fail('请填写不重复的商品行');
    for (const line of command.lines) {
      positive(line.quantity);
      if (![line.id, line.sku, line.omsVariantId, line.sellerSku].every(v => typeof v === 'string' && v.trim())) fail('请完成商品映射');
    }
    targetId = `fba:supplier:${state.tenantId}:${state.companyId}:${state.merchantId}:${context.id}`;
    state.inboundPlans.push({ ...entity(state, targetId), number: `FBA-S-${context.id.slice(-10)}`, connectionId: command.connectionId, site: command.site, warehouseId: '', createdAt: new Date(context.now).toISOString(), lines: structuredClone(command.lines), containers: [], placements: [], status: 'draft', shipmentIds: [], sourceType: 'supplier', supplierName: command.supplierName, purchaseOrderRef: command.purchaseOrderRef || undefined });
  } else if (command.type === 'fba_send_instruction') {
    const shipment = shipmentFor(state, command.shipmentId); targetId = shipment.id;
    const plan = planFor(state, shipment.planId);
    eligible(context, shipment.connectionId, shipment.site);
    if (plan.sourceType !== 'supplier') fail('发货指令仅适用于供应商直发计划');
    if (plan.status !== 'confirmed' || shipment.status !== 'working') fail('计划未确认或货件已关闭');
    if (!shipment.shippingInstruction) fail('货件尚未生成发货指令');
    if (shipment.shippingInstruction.instructedAt) fail('发货指令已发送，不可重复');
    shipment.shippingInstruction.instructedAt = new Date(context.now).toISOString();
    shipment.revision++;
  } else if (command.type === 'fba_receive_supplier_tracking') {
    const shipment = shipmentFor(state, command.shipmentId); targetId = shipment.id;
    const plan = planFor(state, shipment.planId);
    eligible(context, shipment.connectionId, shipment.site);
    if (plan.sourceType !== 'supplier') fail('此操作仅适用于供应商直发计划');
    if (plan.status !== 'confirmed' || shipment.status !== 'working') fail('计划未确认或货件已关闭');
    if (!command.supplierCarrier.trim() || !command.supplierTracking.trim()) fail('请填写供应商承运商和运单号');
    if (!shipment.shippingInstruction) fail('货件尚未生成发货指令');
    shipment.shippingInstruction.supplierCarrier = command.supplierCarrier;
    shipment.shippingInstruction.supplierTracking = command.supplierTracking;
    shipment.shippingInstruction.supplierConfirmedAt = new Date(context.now).toISOString();
    shipment.revision++;
  } else if (command.type === 'fba_cancel_plan') {
    const plan = planFor(state, command.planId); targetId = plan.id;
    eligible(context, plan.connectionId, plan.site);
    if (!command.reason.trim()) fail('请填写取消原因');
    if (['closed', 'cancelled', 'cancelling'].includes(plan.status)) fail('计划已关闭或正在取消');
    const isSupplier = plan.sourceType === 'supplier';
    if (isSupplier) {
      // 供应商直发：无仓库预占，直接取消
      if (state.inboundShipments?.some(s => s.planId === plan.id && ['shipped', 'receiving'].includes(s.status))) fail('已有货件实际发货或在途，不能取消整个计划');
      const live = planFor(state, plan.id);
      live.status = 'cancelled'; live.revision++;
      for (const id of live.shipmentIds) { const s = shipmentFor(state, id); s.status = 'cancelled'; s.revision++; }
      if (live.sourceOrderId) { const order = state.orders.find(o => o.id === live.sourceOrderId)!; order.archived = true; order.lines.forEach(l => { l.cancelled = l.quantity; }); order.revision++; }
    } else {
      const tasks = plan.shipmentIds.map(id => state.fulfillments.find(f => f.id === shipmentFor(state, id).fulfillmentId) ?? fail('来源履约不存在'));
      if (tasks.some(t => ['shipped', 'delivered'].includes(t.status))) fail('已有货件实际发货，不能取消整个计划');
      for (const task of tasks) {
        if (['cancelled', 'withdraw_pending'].includes(task.status)) continue;
        state = executeOmsCommand(state, { type: 'withdraw', fulfillmentId: task.id }, { ...context, domain: 'fba', expectedRevision: undefined, id: `${context.id}:withdraw:${task.id}` }) as FbaSnapshot;
      }
      const live = planFor(state, plan.id);
      live.status = tasks.length ? 'cancelling' : 'cancelled'; live.revision++;
    }
  } else if (command.type === 'fba_set_window' || command.type === 'fba_confirm_appointment' || command.type === 'fba_reschedule') {
    const shipment = shipmentFor(state, command.shipmentId); targetId = shipment.id;
    const plan = planFor(state, shipment.planId);
    eligible(context, shipment.connectionId, shipment.site);
    const task = state.fulfillments.find(f => f.id === shipment.fulfillmentId);
    if (plan.status !== 'confirmed' || shipment.status !== 'working' || !task || ['shipped', 'delivered', 'withdraw_pending', 'cancelled'].includes(task.status)) fail('当前货件不可修改送达预约');
    if (plan.transport === 'SPD') fail('小包运输不需要卡车送达预约');
    if (command.type === 'fba_confirm_appointment') {
      if (shipment.appointment) fail('已有预约，请先改约并重新确认');
      shipment.appointment = structuredClone(command.appointment);
      if (!booked(shipment)) fail('预约编号、承运商确认凭证必填，预约时间必须在送达时间窗内');
    } else {
      validWindow(command.deliveryWindow);
      if (command.type === 'fba_set_window' && shipment.appointment) fail('已有预约，请使用改约');
      shipment.deliveryWindow = structuredClone(command.deliveryWindow); delete shipment.appointment;
    }
    shipment.revision++;
  } else if (command.type === 'fba_pack' || command.type === 'fba_generate_placements' || command.type === 'fba_select_placement' || command.type === 'fba_confirm') {
    const c = command;
    const plan = planFor(state, c.planId); targetId = plan.id;
    eligible(context, plan.connectionId, plan.site);
    if (['approved', 'confirmed', 'cancelling', 'cancelled', 'closed'].includes(plan.status)) fail('已确认或取消计划不可修改');
    const expected = plan.lines.map(l => ({ lineId: l.id, quantity: l.quantity }));
    if (c.type === 'fba_pack') {
      if (!c.containers.length || new Set(c.containers.map(p => p.id)).size !== c.containers.length) fail('箱号不能为空或重复');
      for (const box of c.containers) {
        if (!box.id.trim() || !Number.isFinite(box.weightKg) || box.weightKg <= 0 || !box.contents.length || new Set(box.contents.map(l => l.lineId)).size !== box.contents.length) fail('请填写箱号、正数重量及不重复箱内商品');
        box.contents.forEach(l => { positive(l.quantity); if (!expected.some(e => e.lineId === l.lineId)) fail('箱内商品不属于计划'); });
      }
      const totals = expected.map(l => ({ lineId: l.lineId, quantity: sum(c.containers.flatMap(b => b.contents), l.lineId) }));
      exactLines(totals, expected);
      plan.containers = structuredClone(c.containers); plan.placements = []; delete plan.placementId; plan.status = 'packed';
    } else if (c.type === 'fba_generate_placements') {
      if (!plan.containers.length) fail('请先完成装箱');
      const single: FbaPlacement = { id: `${plan.id}:placement:one`, destinations: [{ code: `${plan.site}-FC-A`, lines: expected }], feeMinor: expected.reduce((n, l) => n + l.quantity * 35, 0) };
      const first = expected.map(l => ({ ...l, quantity: Math.ceil(l.quantity / 2) })).filter(l => l.quantity > 0);
      const second = expected.map(l => ({ ...l, quantity: Math.floor(l.quantity / 2) })).filter(l => l.quantity > 0);
      // For one-unit lines, distribute whole lines so a genuine two-destination choice remains possible.
      if (!second.length && first.length > 1) second.push(...first.splice(Math.ceil(first.length / 2)));
      plan.placements = [single, ...(second.length ? [{ id: `${plan.id}:placement:split`, destinations: [{ code: `${plan.site}-FC-A`, lines: first }, { code: `${plan.site}-FC-B`, lines: second }], feeMinor: 0 }] : [])];
      delete plan.placementId; plan.status = 'packed';
    } else if (c.type === 'fba_select_placement') {
      if (!plan.placements.some(p => p.id === c.placementId)) fail('分仓方案不存在');
      plan.placementId = c.placementId; plan.status = 'placement_selected';
    } else if (c.type === 'fba_confirm') {
      if (plan.status !== 'placement_selected') fail('请先选择平台分仓方案');
      const fee = fbaFees(plan, c.transport);
      if (fee !== c.expectedFeesMinor) fail('费用已变化，请重新确认');
      plan.status = 'approved';
      plan.transport = c.transport;
      plan.feesMinor = fee;
      // 这里仅确认平台方案和费用，不创建正式入库单/出库单；由 fba_create_execution 手动或自动推进。
    }
    planFor(state, plan.id).revision++;
  } else if (command.type === 'fba_receive' || command.type === 'fba_short_close' || command.type === 'fba_claim') {
    const shipment = shipmentFor(state, command.shipmentId); targetId = shipment.id;
    eligible(context, shipment.connectionId, shipment.site); shipped(state, shipment);
    if (command.type === 'fba_receive') {
      if (shipment.status === 'closed' || !command.reference.trim() || !command.lines.length || new Set(command.lines.map(l => l.lineId)).size !== command.lines.length) fail('收货已关闭或收货凭证/明细无效');
      for (const line of command.lines) {
        nonnegative(line.received); nonnegative(line.damaged); positive(line.received + line.damaged);
        const expected = shipment.lines.find(l => l.lineId === line.lineId) ?? fail('收货商品不属于货件');
        const receipt = shipment.receipts.find(l => l.lineId === line.lineId)!;
        if (receipt.quantity + receipt.damaged + receipt.shortClosed + line.received + line.damaged > expected.quantity) fail('收货数量超过实际来源发货数量');
        receipt.quantity += line.received; receipt.damaged += line.damaged;
      }
      updateStatus(state, shipment);
    } else if (command.type === 'fba_short_close') {
      if (shipment.status === 'closed' || !command.reason.trim()) fail('货件已关闭或缺少短收原因');
      shipment.receipts.forEach(r => { r.shortClosed = sum(shipment.lines, r.lineId) - r.quantity - r.damaged; });
      updateStatus(state, shipment);
    } else {
      positive(command.quantity); if (!command.reason.trim()) fail('请填写索赔原因');
      const receipt = shipment.receipts.find(r => r.lineId === command.lineId) ?? fail('索赔商品不存在');
      if (receipt.claimQuantity + command.quantity > receipt.shortClosed + receipt.damaged) fail('索赔不能超过短收和损坏数量');
      receipt.claimQuantity += command.quantity; receipt.claimReason = command.reason; shipment.revision++;
    }
  } else if (command.type === 'fba_observe_stock') {
    eligible(context, command.connectionId, command.site, true);
    [command.onHand, command.reserved, command.unfulfillable].forEach(nonnegative);
    if (command.reserved + command.unfulfillable > command.onHand || !command.sku.trim() || !command.reference.trim() || !Number.isFinite(Date.parse(command.observedAt)) || Date.parse(command.observedAt) > context.now) fail('库存观测或凭证无效');
    let stock = state.stocks.find(s => s.pool === 'fba' && s.connectionId === command.connectionId && s.site === command.site && s.sku === command.sku);
    const previous = state.fbaObservations!.filter(o => o.connectionId === command.connectionId && o.site === command.site && o.sku === command.sku).at(-1);
    if (previous && Date.parse(previous.observedAt) >= Date.parse(command.observedAt)) fail('库存观测必须晚于已记录观测');
    const active = state.reservations.filter(r => r.stockId === stock?.id && r.status === 'active').reduce((n, r) => n + r.quantity, 0);
    // Platform reserved is a different bucket from local MCF reservations; preserve both.
    const reserved = command.reserved + active;
    if (reserved + command.unfulfillable > command.onHand) fail('观测库存不足以覆盖平台预留和本地履约预占');
    if (!stock) { stock = { ...entity(state, `fba-stock:${state.merchantId}:${command.connectionId}:${command.site}:${command.sku}`), pool: 'fba', warehouseId: `fba:${command.connectionId}:${command.site}`, connectionId: command.connectionId, site: command.site, sku: command.sku, onHand: 0, reserved: 0, unfulfillable: 0 }; state.stocks.push(stock); }
    const delta = command.onHand - stock.onHand;
    stock.onHand = command.onHand; stock.reserved = reserved; stock.unfulfillable = command.unfulfillable; stock.revision++;
    targetId = stock.id;
    state.fbaObservations!.push({ ...entity(state, `fba-observation:${context.id}`), stockId: stock.id, connectionId: command.connectionId, site: command.site, sku: command.sku, onHand: command.onHand, reserved: command.reserved, unfulfillable: command.unfulfillable, observedAt: command.observedAt, reference: command.reference });
    state.movements.push({ ...entity(state, `${context.id}:reconcile`), stockId: stock.id, referenceId: command.reference, kind: 'adjust', quantity: delta, createdAt: new Date(context.now).toISOString() });
  } else if (command.type === 'fba_create_removal') {
    const stock = state.stocks.find(s => s.id === command.stockId && s.pool === 'fba') ?? fail('FBA 库存不存在');
    eligible(context, stock.connectionId!, stock.site!); positive(command.quantity);
    if (!['sellable', 'unfulfillable'].includes(command.bucket) || !['return', 'dispose'].includes(command.action) || !command.reference.trim()) fail('请选择库存分区、移除方式及凭证');
    if (command.action === 'return' && (!command.warehouseId || !state.stocks.some(s => s.pool === 'warehouse' && s.warehouseId === command.warehouseId))) fail('退回任务需要有效的接收仓库');
    const pending = state.removalTasks!.filter(t => t.stockId === stock.id && t.bucket === command.bucket && t.status === 'pending').reduce((n, t) => n + t.quantity, 0);
    const available = command.bucket === 'unfulfillable' ? stock.unfulfillable : stock.onHand - stock.reserved - stock.unfulfillable;
    if (command.quantity + pending > available) fail('移除数量超过此分区可用库存（含待处理任务）');
    targetId = `fba-removal:${state.merchantId}:${context.id}`;
    state.removalTasks!.push({ ...entity(state, targetId), stockId: stock.id, connectionId: stock.connectionId!, site: stock.site!, sku: stock.sku, quantity: command.quantity, bucket: command.bucket, action: command.action, status: 'pending', reference: command.reference, warehouseId: command.warehouseId, returnedQuantity: 0 });
  } else if (command.type === 'fba_complete_removal' || command.type === 'fba_receive_return') {
    const task = removalFor(state, command.taskId); targetId = task.id; eligible(context, task.connectionId, task.site);
    const stock = state.stocks.find(s => s.id === task.stockId) ?? fail('移除来源库存不存在');
    if (command.type === 'fba_complete_removal') {
      if (task.status !== 'pending') fail('移除任务已完成，不可重复扣减');
      const available = task.bucket === 'unfulfillable' ? stock.unfulfillable : stock.onHand - stock.reserved - stock.unfulfillable;
      if (task.quantity > available) fail('当前库存不足，移除未执行');
      stock.onHand -= task.quantity; if (task.bucket === 'unfulfillable') stock.unfulfillable -= task.quantity; stock.revision++;
      task.status = 'completed'; task.revision++;
      state.movements.push({ ...entity(state, `${task.id}:remove`), stockId: stock.id, referenceId: task.id, kind: 'ship', quantity: task.quantity, createdAt: new Date(context.now).toISOString() });
    } else {
      positive(command.quantity);
      if (task.status !== 'completed' || task.action !== 'return' || !task.warehouseId || task.returnedQuantity + command.quantity > task.quantity) fail('退回数量不可超过已完成移除数量');
      let destination = state.stocks.find(s => s.pool === 'warehouse' && s.warehouseId === task.warehouseId && s.sku === task.sku);
      if (!destination) { destination = { ...entity(state, `${task.id}:return-stock`), pool: 'warehouse', warehouseId: task.warehouseId, sku: task.sku, onHand: 0, reserved: 0, unfulfillable: 0 }; state.stocks.push(destination); }
      destination.onHand += command.quantity;
      // Returned damaged units stay unavailable until a separate quality adjustment.
      if (task.bucket === 'unfulfillable') destination.unfulfillable += command.quantity;
      destination.revision++; task.returnedQuantity += command.quantity; task.revision++;
      state.movements.push({ ...entity(state, `${context.id}:return`), stockId: destination.id, referenceId: task.id, kind: 'receive', quantity: command.quantity, createdAt: new Date(context.now).toISOString() });
    }
  } else if (command.type === 'fba_create_delivery_plan') {
    eligible(context, command.connectionId, command.site);
    if (!command.lines.length || new Set(command.lines.map(l => l.id)).size !== command.lines.length || new Set(command.lines.map(l => l.sku)).size !== command.lines.length) fail('请填写不重复的商品行');
    for (const line of command.lines) { positive(line.quantity); if (![line.id, line.sku, line.omsVariantId, line.sellerSku].every(v => typeof v === 'string' && v.trim())) fail('请完成商品映射'); }
    targetId = `fba-dp:${state.tenantId}:${state.companyId}:${state.merchantId}:${context.id}`;
    state.deliveryPlans!.push({ ...entity(state, targetId), number: `RP-${context.id.slice(-10)}`, connectionId: command.connectionId, site: command.site, warehouseId: command.warehouseId, supplierName: command.supplierName, lines: structuredClone(command.lines), plannedShipDate: command.plannedShipDate, status: 'draft', note: command.note, createdAt: new Date(context.now).toISOString() });
  } else if (command.type === 'fba_submit_delivery_plan') {
    const dp = deliveryPlanFor(state, command.deliveryPlanId); targetId = dp.id;
    eligible(context, dp.connectionId, dp.site);
    if (dp.status !== 'draft') fail('只有草稿状态的发货计划可以提交审批');
    dp.status = 'pending'; dp.revision++;
  } else if (command.type === 'fba_approve_delivery_plan') {
    const dp = deliveryPlanFor(state, command.deliveryPlanId); targetId = dp.id;
    eligible(context, dp.connectionId, dp.site);
    if (dp.status !== 'pending') fail('只有待审批状态的发货计划可以审批');
    dp.status = 'done'; dp.approvedAt = new Date(context.now).toISOString(); dp.revision++;
  } else if (command.type === 'fba_link_delivery_plan') {
    const dp = deliveryPlanFor(state, command.deliveryPlanId); targetId = dp.id;
    eligible(context, dp.connectionId, dp.site);
    if (dp.status === 'cancelled') fail('已取消的发货计划不能关联货件');
    const linked = planFor(state, command.inboundPlanId);
    if (linked.connectionId !== dp.connectionId || linked.site !== dp.site) fail('货件的 Seller 账号或站点与发货计划不一致');
    dp.inboundPlanId = command.inboundPlanId; dp.revision++;
  } else if (command.type === 'fba_create_execution') {
    const plan = planFor(state, command.planId); targetId = plan.id;
    eligible(context, plan.connectionId, plan.site);
    if (plan.status !== 'approved') fail('请先确认平台分仓结果和运输费用，再生成正式入库单和出库单');
    if (plan.shipmentIds.length) fail('正式执行单已生成，不可重复创建');
    const fee = fbaFees(plan, command.transport);
    if (fee !== command.expectedFeesMinor) fail('费用已变化，请重新确认');
    const orderId = `${plan.id}:order`;
    const isSupplier = plan.sourceType === 'supplier';
    const order: Omit<SalesOrder, 'revision'> = { ...entity(state, orderId), number: plan.number, sourceId: plan.id, source: 'internal_transfer', connectionId: plan.connectionId, site: plan.site, createdAt: new Date(context.now).toISOString(), currency: plan.site === 'US' ? 'USD' : plan.site === 'UK' ? 'GBP' : plan.site === 'JP' ? 'JPY' : 'EUR', paidMinor: null, paymentStatus: 'not_applicable', customer: isSupplier ? (plan.supplierName ?? 'Supplier') : 'FBA replenishment', address: null, lines: plan.lines.map(l => ({ id: l.id, channelLineId: l.id, channelSku: l.sellerSku, omsVariantId: l.omsVariantId, sku: l.sku, title: l.sku, quantity: l.quantity, cancelled: 0, unit: '件', unitPriceMinor: null, mappingSnapshot: { channelSku: l.sellerSku, omsVariantId: l.omsVariantId } })), note: isSupplier ? `供应商直发入库（${plan.supplierName ?? ''}${plan.purchaseOrderRef ? ' · ' + plan.purchaseOrderRef : ''}）` : 'FBA 入库来源调拨需求', tags: isSupplier ? ['fba_replenishment', 'supplier_direct'] : ['fba_replenishment'], archived: false };
    state = executeOmsCommand(state, { type: 'create_order', order }, { ...context, domain: 'fba', expectedRevision: undefined, id: `${context.id}:source` }) as FbaSnapshot;
    const livePlan = planFor(state, plan.id);
    const placement = livePlan.placements.find(p => p.id === livePlan.placementId) ?? fail('平台分仓结果不存在');
    placement.destinations.forEach((destination, index) => {
      const id = `${plan.id}:shipment:${index + 1}`;
      if (isSupplier) {
        state.inboundShipments!.push({ ...entity(state, id), planId: plan.id, connectionId: plan.connectionId, site: plan.site, destination: destination.code, lines: structuredClone(destination.lines), fulfillmentId: 'supplier-direct', outboundId: 'supplier-direct', status: 'working', receipts: destination.lines.map(l => ({ lineId: l.lineId, quantity: 0, damaged: 0, shortClosed: 0, claimQuantity: 0 })), shippingInstruction: { fcCode: destination.code, fcAddress: '由平台插件回传', requirements: '按平台回传要求完成标签、包装和运输资料。' } });
      } else {
        const allocationId = `${context.id}:allocation:${index}`;
        state = executeOmsCommand(state, { type: 'allocate', orderId, executor: 'warehouse', warehouseId: livePlan.warehouseId, lines: destination.lines }, { ...context, domain: 'fba', expectedRevision: undefined, id: allocationId }) as FbaSnapshot;
        state.inboundShipments!.push({ ...entity(state, id), planId: plan.id, connectionId: plan.connectionId, site: plan.site, destination: destination.code, lines: structuredClone(destination.lines), fulfillmentId: `ful:${allocationId}`, outboundId: `ob:${allocationId}`, status: 'working', receipts: destination.lines.map(l => ({ lineId: l.lineId, quantity: 0, damaged: 0, shortClosed: 0, claimQuantity: 0 })) });
      }
      planFor(state, plan.id).shipmentIds.push(id);
    });
    const confirmed = planFor(state, plan.id); confirmed.sourceOrderId = orderId; confirmed.status = 'confirmed'; confirmed.transport = command.transport; confirmed.feesMinor = fee;
  } else if (command.type === 'fba_request_plugin_task') {
    const source = command.sourceType === 'inbound_plan' ? planFor(state, command.sourceId) : command.sourceType === 'inbound_shipment' ? shipmentFor(state, command.sourceId) : deliveryPlanFor(state, command.sourceId);
    targetId = source.id;
    const key = `${source.id}:${command.operation}`;
    const existing = state.amazonPluginTasks!.find(task => task.idempotencyKey === key && ['queued', 'running', 'succeeded'].includes(task.status));
    if (!existing) {
      state.amazonPluginTasks!.push({ ...entity(state, `amazon-task:${context.id}`), operation: command.operation, sourceType: command.sourceType, sourceId: source.id, idempotencyKey: key, status: 'queued', requestedAt: new Date(context.now).toISOString(), request: command.request });
    }
  } else if (command.type === 'fba_cancel_delivery_plan') {
    const dp = deliveryPlanFor(state, command.deliveryPlanId); targetId = dp.id;
    eligible(context, dp.connectionId, dp.site);
    if (['done', 'cancelled'].includes(dp.status)) fail('已完成或已取消的发货计划不能再取消');
    if (!command.reason.trim()) fail('请填写取消原因');
    dp.status = 'cancelled'; dp.revision++;
  }
  state.commandIds.push(context.id);
  state.events.push({ id: `${context.id}:fba-event`, commandId: context.id, entityId: targetId, type: command.type, at: new Date(context.now).toISOString(), description: fbaEventDescription(command.type), payload: command });
  assertOmsInvariants(state); assertFbaAddons(state);
  return state;
}
function fbaEventDescription(type: FbaCommand['type']) { return ({ fba_request_plugin_task: '创建渠道插件同步任务', fba_create_plan: '创建仓库调拨补货计划', fba_create_supplier_plan: '创建采购补货计划', fba_pack: '保存逐箱商品明细', fba_generate_placements: '生成可选分仓方案', fba_select_placement: '选择分仓方案', fba_confirm: '确认平台分仓方案与费用（尚未生成来源执行单）', fba_create_execution: '按平台分仓结果生成正式入库单和来源出库单', fba_cancel_plan: '申请取消补货计划', fba_set_window: '保存货件送达时间窗', fba_confirm_appointment: '确认承运商送达预约', fba_reschedule: '调整送达时间窗，等待重新确认预约', fba_receive: '登记实际收货（不自动增加可售库存）', fba_short_close: '短收关闭', fba_claim: '登记有凭证的差异索赔', fba_observe_stock: '依据明确库存观测对账', fba_create_removal: '创建人工移除任务', fba_complete_removal: '确认移除并一次性扣减库存', fba_receive_return: '登记退回仓库实际收货', fba_send_instruction: '发送发货指令给供应商', fba_receive_supplier_tracking: '登记供应商回传运单号', fba_create_delivery_plan: '创建补货计划（草稿）', fba_submit_delivery_plan: '提交补货计划待审批', fba_approve_delivery_plan: '审批通过补货计划', fba_link_delivery_plan: '关联补货计划与入库计划', fba_cancel_delivery_plan: '取消补货计划' })[type]; }

/** Warehouse jobs remain owned by OMS; this only projects actual shared execution onto inbound shipments. */
export function advanceFbaJobs(current: FbaSnapshot, _now: number): FbaSnapshot {
  let state: FbaSnapshot | undefined;
  for (const original of current.inboundShipments ?? []) {
    const task = current.fulfillments.find(f => f.id === original.fulfillmentId);
    const plan = current.inboundPlans?.find(p => p.id === original.planId);
    const isSupplier = plan?.sourceType === 'supplier';
    // 供应商直发货件没有仓库出库单，状态推进依赖 fba_receive_supplier_tracking
    if (!isSupplier && original.status === 'working' && task && ['shipped', 'delivered'].includes(task.status)) {
      state ??= structuredClone(current);
      const shipment = shipmentFor(state, original.id); shipped(state, shipment); shipment.status = 'shipped'; shipment.revision++;
    }
  }
  for (const plan of current.inboundPlans ?? []) {
    if (plan.status !== 'cancelling' || !plan.shipmentIds.every(id => current.fulfillments.find(f => f.id === shipmentFor(current, id).fulfillmentId)?.status === 'cancelled')) continue;
    state ??= structuredClone(current);
    const live = planFor(state, plan.id); live.status = 'cancelled'; live.revision++;
    for (const id of live.shipmentIds) { const shipment = shipmentFor(state, id); shipment.status = 'cancelled'; shipment.revision++; }
    const order = state.orders.find(o => o.id === live.sourceOrderId)!;
    order.archived = true; order.lines.forEach(l => { l.cancelled = l.quantity; }); order.revision++;
  }
  if (state) assertFbaAddons(state);
  return state ?? current;
}

/** Runtime addon validation; absent addons are valid legacy snapshots and are never guessed/migrated. */
export function assertFbaAddons(state: FbaSnapshot): void {
  const collections = [state.inboundPlans, state.inboundShipments, state.fbaObservations, state.removalTasks, state.deliveryPlans, state.amazonPluginTasks];
  for (const list of collections) {
    if (list === undefined) continue;
    if (!Array.isArray(list)) fail('FBA addon 数据损坏，原数据未重置');
    const ids = new Set<string>();
    for (const value of list) {
      if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id || ids.has(value.id) || value.tenantId !== state.tenantId || value.companyId !== state.companyId || value.merchantId !== state.merchantId || !Number.isSafeInteger(value.revision) || value.revision < 1) fail('FBA addon 实体作用域、版本或 ID 无效');
      ids.add(value.id);
    }
  }
  for (const p of state.inboundPlans ?? []) {
    if (!['draft', 'packed', 'placement_selected', 'approved', 'confirmed', 'cancelling', 'cancelled', 'closed'].includes(p.status) || ![p.number, p.connectionId, p.site, p.createdAt].every(v => typeof v === 'string' && !!v) || (p.sourceType !== 'supplier' && !(typeof p.warehouseId === 'string' && !!p.warehouseId)) || (p.sourceType === 'supplier' && !(typeof p.supplierName === 'string' && !!p.supplierName)) || !Array.isArray(p.lines) || !p.lines.length || !Array.isArray(p.containers) || !Array.isArray(p.placements) || !Array.isArray(p.shipmentIds)) fail('FBA 计划格式无效');
    if (new Set(p.lines.map(l => l.id)).size !== p.lines.length || new Set(p.lines.map(l => l.sku)).size !== p.lines.length) fail('FBA 计划商品重复');
    p.lines.forEach(l => { if (![l.id, l.sku, l.omsVariantId, l.sellerSku].every(v => typeof v === 'string' && !!v)) fail('FBA 商品格式无效'); if (l.fnsku !== undefined && (typeof l.fnsku !== 'string' || !l.fnsku.trim())) fail('FBA 商品 FNSKU 格式无效'); positive(l.quantity); });
    const expected = p.lines.map(l => ({ lineId: l.id, quantity: l.quantity }));
    if (p.status !== 'draft' && !(p.status === 'cancelled' && !p.containers.length)) {
      if (!p.containers.length || new Set(p.containers.map(c => c.id)).size !== p.containers.length) fail('FBA 装箱数据缺失或重复');
      p.containers.forEach(c => { if (!c.id || !Number.isFinite(c.weightKg) || c.weightKg <= 0 || !Array.isArray(c.contents) || !c.contents.length || new Set(c.contents.map(l => l.lineId)).size !== c.contents.length) fail('FBA 箱明细无效'); c.contents.forEach(l => { positive(l.quantity); if (!expected.some(e => e.lineId === l.lineId)) fail('FBA 箱商品不属于计划'); }); });
      exactLines(expected.map(l => ({ ...l, quantity: sum(p.containers.flatMap(c => c.contents), l.lineId) })), expected);
    }
    if (new Set(p.placements.map(v => v.id)).size !== p.placements.length) fail('FBA 分仓方案重复');
    p.placements.forEach(v => {
      if (!v.id || !Array.isArray(v.destinations) || !v.destinations.length || v.destinations.length > 2 || new Set(v.destinations.map(d => d.code)).size !== v.destinations.length) fail('FBA 分仓方案无效');
      nonnegative(v.feeMinor);
      const all = v.destinations.flatMap(d => { if (!d.code || !Array.isArray(d.lines) || !d.lines.length || new Set(d.lines.map(l => l.lineId)).size !== d.lines.length) fail('FBA 目的地明细无效'); d.lines.forEach(l => { positive(l.quantity); if (!expected.some(e => e.lineId === l.lineId)) fail('分仓商品不属于计划'); }); return d.lines; });
      exactLines(expected.map(l => ({ ...l, quantity: sum(all, l.lineId) })), expected);
    });
    if (p.placementId && !p.placements.some(v => v.id === p.placementId)) fail('选中分仓方案不存在');
    if ((['placement_selected', 'confirmed', 'cancelling', 'closed'].includes(p.status) || (p.status === 'cancelled' && !!p.sourceOrderId)) && !p.placementId) fail('缺少选中分仓方案');
    if ((['confirmed', 'cancelling', 'closed'].includes(p.status) || (p.status === 'cancelled' && !!p.sourceOrderId))) {
      const order = state.orders.find(o => o.id === p.sourceOrderId);
      const isSupplier = p.sourceType === 'supplier';
      const expectedTags = isSupplier ? ['fba_replenishment', 'supplier_direct'] : ['fba_replenishment'];
      if (!order || order.source !== 'internal_transfer' || order.sourceId !== p.id || !expectedTags.every(t => order.tags.includes(t)) || order.connectionId !== p.connectionId || order.site !== p.site) fail('FBA 来源内部需求缺失');
      exactLines(order.lines.map(l => ({ lineId: l.id, quantity: l.quantity })), expected);
      if (order.lines.some(l => { const source = p.lines.find(v => v.id === l.id)!; return l.sku !== source.sku || l.omsVariantId !== source.omsVariantId || l.channelSku !== source.sellerSku || l.mappingSnapshot?.channelSku !== source.sellerSku || l.mappingSnapshot?.omsVariantId !== source.omsVariantId; })) fail('FBA 内部需求商品快照不一致');
      if (!p.transport || p.feesMinor !== fbaFees(p, p.transport)) fail('FBA 已确认运输费用无效');
      const placement = p.placements.find(v => v.id === p.placementId)!;
      if (new Set(p.shipmentIds).size !== p.shipmentIds.length || p.shipmentIds.length !== placement.destinations.length) fail('FBA 子货件数量不一致');
      p.shipmentIds.forEach((id, index) => { const child = shipmentFor(state, id); if (child.planId !== p.id || child.destination !== placement.destinations[index].code) fail('FBA 子货件归属不一致'); exactLines(child.lines, placement.destinations[index].lines); });
      if (p.status === 'cancelled' && p.shipmentIds.some(id => shipmentFor(state, id).status !== 'cancelled' || state.fulfillments.find(f => f.id === shipmentFor(state, id).fulfillmentId)?.status !== 'cancelled')) fail('FBA 取消尚未完成');
      if (p.status === 'cancelling' && p.shipmentIds.some(id => !['withdraw_pending', 'cancelled'].includes(state.fulfillments.find(f => f.id === shipmentFor(state, id).fulfillmentId)?.status ?? ''))) fail('FBA 取消任务状态不一致');
      if (p.status === 'closed' && p.shipmentIds.some(id => shipmentFor(state, id).status !== 'closed')) fail('FBA 计划关闭状态不一致');
    } else if (p.shipmentIds.length || p.sourceOrderId) fail('未确认计划不可拥有来源执行');
  }
  for (const s of state.inboundShipments ?? []) {
    const p = planFor(state, s.planId);
    if (s.connectionId !== p.connectionId || s.site !== p.site || !p.shipmentIds.includes(s.id) || !['working', 'shipped', 'receiving', 'cancelled', 'closed'].includes(s.status) || !Array.isArray(s.lines) || !s.lines.length || !Array.isArray(s.receipts)) fail('FBA 货件格式或归属无效');
    if (p.sourceType === 'supplier') {
      // 供应商直发：使用哨兵值，不关联 OMS 仓库出库
      if (s.fulfillmentId !== 'supplier-direct' || s.outboundId !== 'supplier-direct') fail('供应商直发货件引用格式无效');
    } else {
      const task = state.fulfillments.find(f => f.id === s.fulfillmentId);
      const outbound = state.outbounds.find(o => o.id === s.outboundId);
      if (!task || task.executor !== 'warehouse' || task.orderId !== p.sourceOrderId || task.warehouseId !== p.warehouseId || task.outboundId !== s.outboundId || !outbound || outbound.fulfillmentId !== task.id || outbound.orderId !== p.sourceOrderId) fail('FBA 货件缺少准确来源执行引用');
      exactLines(task.lines, s.lines); exactLines(outbound.lines, s.lines);
      for (const l of task.lines) {
        const reservations = state.reservations.filter(r => r.fulfillmentId === task.id && r.lineId === l.lineId);
        if (reservations.reduce((n, r) => n + r.quantity, 0) !== l.quantity || reservations.some(r => !task.reservations.includes(r.id) || !state.stocks.some(stock => stock.id === r.stockId && stock.pool === 'warehouse' && stock.warehouseId === p.warehouseId && stock.sku === p.lines.find(v => v.id === l.lineId)?.sku))) fail('FBA 来源预占引用不一致');
      }
    }
    if (s.receipts.length !== s.lines.length || new Set(s.receipts.map(r => r.lineId)).size !== s.receipts.length) fail('FBA 收货明细缺失或重复');
    s.receipts.forEach(r => { [r.quantity, r.damaged, r.shortClosed, r.claimQuantity].forEach(nonnegative); if (!s.lines.some(l => l.lineId === r.lineId) || r.quantity + r.damaged + r.shortClosed > sum(s.lines, r.lineId) || r.claimQuantity > r.shortClosed + r.damaged) fail('FBA 收货或索赔超量'); });
    if (s.deliveryWindow) validWindow(s.deliveryWindow);
    if (s.appointment && !booked(s)) fail('FBA 预约信息无效');
    if (p.transport === 'SPD' && (s.deliveryWindow || s.appointment)) fail('小包货件不可拥有卡车预约');
    if (p.sourceType !== 'supplier') {
      const task = state.fulfillments.find(f => f.id === s.fulfillmentId);
      if (!task) fail('FBA 货件缺少来源履约');
      if (s.status === 'cancelled' && (task.status !== 'cancelled' || s.receipts.some(r => r.quantity + r.damaged + r.shortClosed > 0))) fail('FBA 取消货件状态不一致');
      if (['shipped', 'delivered'].includes(task.status) && p.transport !== 'SPD' && !booked(s)) fail('卡车货件尚未确认送达时间窗及承运商预约');
    }
    if (!['working', 'cancelled'].includes(s.status) || s.receipts.some(r => r.quantity + r.damaged + r.shortClosed > 0)) shipped(state, s);
    if (s.status === 'closed' && s.receipts.some(r => r.quantity + r.damaged + r.shortClosed !== sum(s.lines, r.lineId))) fail('FBA 关闭货件数量不守恒');
  }
  for (const o of state.fbaObservations ?? []) {
    const stock = state.stocks.find(s => s.id === o.stockId && s.pool === 'fba');
    if (!stock || stock.connectionId !== o.connectionId || stock.site !== o.site || stock.sku !== o.sku || !o.reference || !Number.isFinite(Date.parse(o.observedAt))) fail('FBA 观测引用无效');
    [o.onHand, o.reserved, o.unfulfillable].forEach(nonnegative); if (o.reserved + o.unfulfillable > o.onHand) fail('FBA 观测库存不守恒');
  }
  for (const t of state.removalTasks ?? []) {
    const stock = state.stocks.find(s => s.id === t.stockId && s.pool === 'fba');
    if (!stock || stock.connectionId !== t.connectionId || stock.site !== t.site || stock.sku !== t.sku || !['pending', 'completed'].includes(t.status) || !['sellable', 'unfulfillable'].includes(t.bucket) || !['return', 'dispose'].includes(t.action) || !t.reference || (t.action === 'return' && !t.warehouseId)) fail('FBA 移除任务格式无效');
    positive(t.quantity); nonnegative(t.returnedQuantity);
    if (t.returnedQuantity > t.quantity || (t.returnedQuantity > 0 && (t.action !== 'return' || t.status !== 'completed'))) fail('FBA 退回收货超量或状态错误');
  }
  for (const dp of state.deliveryPlans ?? []) {
    if (!['draft', 'pending', 'done', 'cancelled'].includes(dp.status)) fail('发货计划状态无效');
    if (![dp.number, dp.connectionId, dp.site, dp.createdAt].every(v => typeof v === 'string' && !!v)) fail('发货计划基本信息缺失');
    if (!Array.isArray(dp.lines) || !dp.lines.length) fail('发货计划商品行为空');
    dp.lines.forEach(l => { if (![l.id, l.sku, l.omsVariantId, l.sellerSku].every(v => typeof v === 'string' && !!v)) fail('发货计划商品格式无效'); positive(l.quantity); });
    if (new Set(dp.lines.map(l => l.id)).size !== dp.lines.length || new Set(dp.lines.map(l => l.sku)).size !== dp.lines.length) fail('发货计划商品行重复');
    if (dp.inboundPlanId && !state.inboundPlans?.some(p => p.id === dp.inboundPlanId)) fail('发货计划关联的 FBA 货件不存在');
  }
}
