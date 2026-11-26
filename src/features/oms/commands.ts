import { saveWarehouseRecord, warehouseRecords } from './warehouse-config';
import { mockProducts } from '@/lib/mock-data/products';
import { buildMcfCreatePayload, validateMcfProposal } from './mcf-proposal';
import type { CommandContext, Fulfillment, ItemQuantity, OmsSnapshot, SalesOrder, Shipment, Stock } from './types';

export type OmsCommand =
  | { type: 'save_warehouse'; warehouse: import('./types').WarehouseRecord }
  | { type: 'bind_mcf_warehouse'; warehouse: import('./types').FulfillmentWarehouse }
  | { type: 'submit_mcf_outbound'; outboundId: string }
  | { type: 'map_order_line'; orderId: string; lineId: string; variantId: string }
  | { type: 'create_order'; order: Omit<SalesOrder, 'revision'> }
  | { type: 'allocate'; orderId: string; executor: Fulfillment['executor']; warehouseId: string; connectionId?: string; site?: string; lines: ItemQuantity[]; proposal?: import('./mcf-proposal').McfProposal }
  | { type: 'withdraw'; fulfillmentId: string }
  | { type: 'dispatch'; fulfillmentId: string; carrier: string; tracking: string }
  | { type: 'shipment_upsert'; outboundId: string; fulfillmentId: string; orderId: string; provider: Shipment['provider']; providerShipmentId?: string; providerPackageId?: string; status: Shipment['status']; carrier: string; trackingNumber: string; trackingUrl?: string; lines: ItemQuantity[]; shippedAt?: string; deliveredAt?: string; confirmation?: Shipment['confirmation']; sourceEventId?: string; sourceEventVersion?: number; confirmationError?: string }
  | { type: 'writeback'; packageId: string }
  | { type: 'cancel_order'; orderId: string; reason: string }
  | { type: 'note'; orderId: string; note: string };

const clone = (state: OmsSnapshot): OmsSnapshot => structuredClone(state);
const sum = (lines: ItemQuantity[], id: string) => lines.filter(line => line.lineId === id).reduce((n, line) => n + line.quantity, 0);
const concrete = (state: OmsSnapshot) => { if (!state.merchantId || state.merchantId === 'all') throw new Error('业务操作必须归属具体商家'); };
const quantity = (value: number) => { if (!Number.isSafeInteger(value) || value <= 0) throw new Error('数量必须为正整数'); };
const displaySequence = (id: string) => { let hash = 2166136261; for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0'); };
const envelope = (state: OmsSnapshot, id: string) => ({ tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, id, revision: 1 });
function journal(state: OmsSnapshot, context: CommandContext, entityId: string, type: string, description: string, payload?: unknown) {
  state.events.push({ id: `${context.id}:event:${state.events.length}`, commandId: context.id, entityId, type, at: new Date(context.now).toISOString(), description, payload });
}
function schedule(state: OmsSnapshot, context: CommandContext, kind: OmsSnapshot['jobs'][number]['kind'], targetId: string, delay: number) {
  const id = `${context.id}:${kind}:${targetId}`;
  if (!state.jobs.some(job => job.id === id)) state.jobs.push({ id, kind, targetId, dueAt: context.now + delay, status: 'queued', attempts: 0, causationId: context.id });
}
function order(state: OmsSnapshot, id: string) { const found = state.orders.find(item => item.id === id); if (!found) throw new Error('订单不存在或不属于当前商家'); return found; }
function fulfillment(state: OmsSnapshot, id: string) { const found = state.fulfillments.find(item => item.id === id); if (!found) throw new Error('履约任务不存在'); return found; }
const shipmentRank: Record<Shipment['status'], number> = { unknown: 0, created: 1, label_ready: 2, in_transit: 3, delivered: 4, cancelled: 0, failed: 0 };
function shipmentIdentity(command: Extract<OmsCommand, { type: 'shipment_upsert' }>) {
  return command.providerShipmentId && command.providerPackageId ? `${command.providerShipmentId}:${command.providerPackageId}` : undefined;
}
function shipmentEventIdentity(command: Extract<OmsCommand, { type: 'shipment_upsert' }>) {
  return command.sourceEventId !== undefined && command.sourceEventVersion !== undefined ? `${command.sourceEventId}:${command.sourceEventVersion}` : undefined;
}
function upsertShipment(state: OmsSnapshot, command: Extract<OmsCommand, { type: 'shipment_upsert' }>, context: CommandContext) {
  if (!command.outboundId || !command.fulfillmentId || !command.orderId || !command.carrier.trim() || !command.trackingNumber.trim()) throw new Error('Shipment 必须包含完整关联和承运信息');
  const outbound = state.outbounds.find(item => item.id === command.outboundId);
  const task = state.fulfillments.find(item => item.id === command.fulfillmentId);
  const source = state.orders.find(item => item.id === command.orderId);
  if (!outbound || !task || !source || outbound.fulfillmentId !== task.id || task.orderId !== source.id) throw new Error('Shipment 目标对象不存在或关联不一致');
  if (command.lines.length === 0) throw new Error('Shipment 必须包含商品数量');
  for (const line of command.lines) { quantity(line.quantity); if (line.quantity > sum(task.lines, line.lineId)) throw new Error('Shipment 数量超过履约计划'); }
  const identity = shipmentIdentity(command);
  const eventIdentity = shipmentEventIdentity(command);
  const found = state.shipments.find(item => (identity && item.providerShipmentId && item.providerPackageId && `${item.providerShipmentId}:${item.providerPackageId}` === identity) || (eventIdentity && item.sourceEventId !== undefined && item.sourceEventVersion !== undefined && `${item.sourceEventId}:${item.sourceEventVersion}` === eventIdentity));
  if (found) return found;
  const existing = state.shipments.find(item => item.outboundId === command.outboundId && item.provider === command.provider && ((command.providerPackageId && item.providerPackageId === command.providerPackageId) || (command.providerShipmentId && item.providerShipmentId === command.providerShipmentId)));
  const target = existing ?? ({ ...envelope(state, `shipment:${context.id}`), outboundId: command.outboundId, fulfillmentId: command.fulfillmentId, orderId: command.orderId, provider: command.provider, providerShipmentId: command.providerShipmentId, providerPackageId: command.providerPackageId, status: command.status, carrier: command.carrier, trackingNumber: command.trackingNumber, trackingUrl: command.trackingUrl, lines: structuredClone(command.lines), shippedAt: command.shippedAt, deliveredAt: command.deliveredAt, confirmation: command.confirmation ?? 'not_required', sourceEventId: command.sourceEventId, sourceEventVersion: command.sourceEventVersion, confirmationError: command.confirmationError } satisfies Shipment);
  if (existing) {
    if (shipmentRank[command.status] < shipmentRank[existing.status] && !(existing.status === 'delivered' && command.status === 'delivered')) throw new Error('Shipment 状态不得倒退');
    Object.assign(existing, { carrier: command.carrier, trackingNumber: command.trackingNumber, trackingUrl: command.trackingUrl, lines: structuredClone(command.lines), shippedAt: command.shippedAt ?? existing.shippedAt, deliveredAt: command.deliveredAt ?? existing.deliveredAt, confirmation: command.confirmation ?? existing.confirmation, sourceEventId: command.sourceEventId ?? existing.sourceEventId, sourceEventVersion: command.sourceEventVersion ?? existing.sourceEventVersion, confirmationError: command.confirmationError, status: command.status });
    existing.revision++;
  } else state.shipments.push(target);
  const total = state.shipments.filter(item => item.outboundId === outbound.id).reduce((all, item) => { for (const line of item.lines) all.set(line.lineId, (all.get(line.lineId) ?? 0) + line.quantity); return all; }, new Map<string, number>());
  for (const [lineId, amount] of total) if (amount > sum(outbound.lines, lineId)) throw new Error('Shipment 累计数量超过出库计划');
  if (command.status === 'in_transit' || command.status === 'delivered') { task.status = command.status === 'delivered' ? 'delivered' : 'shipped'; task.revision++; outbound.status = 'shipped'; outbound.revision++; }
  journal(state, context, source.id, 'shipment', existing ? 'Shipment 已更新' : 'Shipment 已创建', { shipmentId: target.id });
  return target;
}
export function availableToAllocate(state: OmsSnapshot, orderId: string, lineId: string) {
  const source = order(state, orderId).lines.find(line => line.id === lineId);
  if (!source) throw new Error('订单行不存在');
  return source.quantity - source.cancelled - state.fulfillments.filter(item => item.orderId === orderId && item.status !== 'cancelled').reduce((n, item) => n + sum(item.lines, lineId), 0);
}
function stockFor(state: OmsSnapshot, task: Pick<Fulfillment, 'executor' | 'warehouseId' | 'connectionId' | 'site'>, sku: string): Stock | undefined {
  return state.stocks.find(stock => stock.sku === sku && (task.executor === 'warehouse' ? stock.pool === 'warehouse' && stock.warehouseId === task.warehouseId : stock.pool === 'fba' && stock.connectionId === task.connectionId && stock.site === task.site));
}
export function assertOmsInvariants(state: OmsSnapshot) {
  concrete(state);
  for (const collection of [state.orders, state.fulfillments, state.outbounds, state.stocks, state.reservations, state.packages, state.shipments, state.movements]) {
    const ids = new Set<string>();
    for (const entity of collection) {
      if (ids.has(entity.id)) throw new Error('实体 ID 重复');
      ids.add(entity.id);
      if (entity.tenantId !== state.tenantId || entity.companyId !== state.companyId || entity.merchantId !== state.merchantId) throw new Error('实体作用域不一致');
    }
  }
  for (const stock of state.stocks) {
    if (![stock.onHand, stock.reserved, stock.unfulfillable].every(n => Number.isSafeInteger(n) && n >= 0) || stock.reserved + stock.unfulfillable > stock.onHand) throw new Error('库存分区或预占不守恒');
    const reserved = state.reservations.filter(item => item.stockId === stock.id && item.status === 'active').reduce((n, item) => n + item.quantity, 0);
    if (reserved > stock.reserved) throw new Error('活跃预占超过库存预留');
  }
  for (const task of state.fulfillments) {
    const source = order(state, task.orderId);
    for (const line of task.lines) { quantity(line.quantity); if (!source.lines.some(item => item.id === line.lineId)) throw new Error('履约包含其他订单商品'); }
    if (task.executor === 'warehouse' && !state.outbounds.some(outbound => outbound.id === task.outboundId && outbound.fulfillmentId === task.id)) throw new Error('自有仓履约缺少关联出库单');
  }
  for (const source of state.orders) for (const line of source.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0 || !Number.isSafeInteger(line.cancelled) || line.cancelled < 0 || line.cancelled > line.quantity || availableToAllocate(state, source.id, line.id) < 0) throw new Error('订单行分配或取消超量');
  }
  for (const pack of state.packages) {
    const task = fulfillment(state, pack.fulfillmentId);
    if (task.orderId !== pack.orderId) throw new Error('包裹归属错误');
    for (const line of pack.lines) if (state.packages.filter(item => item.fulfillmentId === task.id).reduce((n, item) => n + sum(item.lines, line.lineId), 0) > sum(task.lines, line.lineId)) throw new Error('包裹发货超量');
  }
  const shipmentStatuses: Shipment['status'][] = ['created', 'label_ready', 'in_transit', 'delivered', 'cancelled', 'failed', 'unknown'];
  for (const shipment of state.shipments) {
    const task = fulfillment(state, shipment.fulfillmentId);
    const outbound = state.outbounds.find(item => item.id === shipment.outboundId);
    if (!outbound || outbound.fulfillmentId !== task.id || shipment.orderId !== task.orderId) throw new Error('Shipment 关联错误');
    if (!shipmentStatuses.includes(shipment.status)) throw new Error('Shipment 状态无效');
    for (const line of shipment.lines) {
      quantity(line.quantity);
      if (!task.lines.some(item => item.lineId === line.lineId)) throw new Error('Shipment 包含其他履约商品');
      const total = state.shipments.filter(item => item.fulfillmentId === task.id).reduce((n, item) => n + sum(item.lines, line.lineId), 0);
      if (total > sum(task.lines, line.lineId)) throw new Error('Shipment 发货超量');
    }
  }
}
export function executeOmsCommand(current: OmsSnapshot, command: OmsCommand, context: CommandContext): OmsSnapshot {
  concrete(current);
  if (current.commandIds.includes(context.id)) return current;
  if (!context.canWrite) throw new Error('当前角色没有操作权限');
  if (context.expectedRevision !== undefined && context.expectedRevision !== current.revision) throw new Error('业务记录已变化，请刷新后重试');
  const state = clone(current);
  if (command.type === 'shipment_upsert') {
    const identity = shipmentIdentity(command);
    const eventIdentity = shipmentEventIdentity(command);
    if (current.shipments.some(item => (identity && item.providerShipmentId && item.providerPackageId && `${item.providerShipmentId}:${item.providerPackageId}` === identity) || (eventIdentity && item.sourceEventId !== undefined && item.sourceEventVersion !== undefined && `${item.sourceEventId}:${item.sourceEventVersion}` === eventIdentity))) return current;
  }
  if (command.type === 'save_warehouse') {
    const warehouse = saveWarehouseRecord(state, command.warehouse);
    journal(state, context, warehouse.id, command.type, '保存仓库主数据及所选 APP 供应商仓库关联', warehouse);
  } else if (command.type === 'bind_mcf_warehouse') {
    const warehouse = structuredClone(command.warehouse);
    if (!warehouse.id.trim() || !warehouse.code.trim() || !warehouse.name.trim() || !warehouse.connectionId || !warehouse.site || warehouse.app !== 'amazon' || warehouse.capability !== 'mcf' || typeof warehouse.active !== 'boolean') throw new Error('请填写仓库名称、编码并选择 Amazon MCF 履约连接');
    const warehouses = state.fulfillmentWarehouses ??= [];
    if (warehouses.some(item => item.id !== warehouse.id && (item.code === warehouse.code || (item.connectionId === warehouse.connectionId && item.site === warehouse.site)))) throw new Error('仓库编码或该账号市场的履约绑定已存在');
    const previous = warehouses.find(item => item.id === warehouse.id);
    if (previous && (previous.connectionId !== warehouse.connectionId || previous.site !== warehouse.site) && state.fulfillments.some(task => task.warehouseId === warehouse.id)) throw new Error('仓库已用于履约，不可更换账号或市场，请新建仓库');
    if (previous) Object.assign(previous, warehouse); else warehouses.push(warehouse);
    saveWarehouseRecord(state, { id: warehouse.id, code: warehouse.code, name: warehouse.name, kind: 'platform', country: '', city: '', address: '', active: warehouse.active, binding: { appId: 'amazon', capability: 'mcf', connectionId: warehouse.connectionId, site: warehouse.site, externalWarehouseId: `fba:${warehouse.connectionId}:${warehouse.site}` } });
    journal(state, context, warehouse.id, command.type, '保存仓库与 Amazon APP / MCF / 授权连接 / 市场绑定', warehouse);
  } else if (command.type === 'submit_mcf_outbound') {
    const outbound = state.outbounds.find(item => item.id === command.outboundId);
    const task = outbound && fulfillment(state, outbound.fulfillmentId);
    if (!outbound || !task || task.executor !== 'amazon' || !task.mcf || task.status !== 'allocated' || outbound.status !== 'waiting') throw new Error('出库单不存在或不是待提交的 MCF 出库');
    const binding = state.fulfillmentWarehouses?.find(item => item.id === outbound.warehouseId && item.active);
    if (!binding || binding.connectionId !== task.connectionId || binding.site !== task.site) throw new Error('仓库履约绑定不可用');
    task.status = 'submitted'; task.revision++;
    schedule(state, context, 'amazon_create', task.id, 1500);
    journal(state, context, outbound.id, command.type, '出库任务已交给 Amazon APP 的本地适配器；未调用真实 Amazon', { outboundId: outbound.id, requestId: task.providerReference, binding });
  } else if (command.type === 'map_order_line') {
    const source = order(state, command.orderId);
    const line = source.lines.find(item => item.id === command.lineId);
    const product = mockProducts.find(item => item.variants.some(variant => variant.id === command.variantId));
    const variant = product?.variants.find(item => item.id === command.variantId);
    if (!line || !variant || !product) throw new Error('请选择有效的 OMS 商品');
    if (state.fulfillments.some(task => task.orderId === source.id && task.status !== 'cancelled' && task.lines.some(item => item.lineId === line.id))) throw new Error('该商品已有有效履约，不能更换商品对应关系');
    const previousSku = line.sku;
    line.omsVariantId = variant.id; line.sku = variant.sku; line.title = product.title;
    line.mappingSnapshot = { channelSku: line.channelSku || previousSku, omsVariantId: variant.id };
    source.revision++;
    journal(state, context, source.id, command.type, '订单商品已关联 OMS SKU，保留原始渠道商品标识', { lineId: line.id, variantId: variant.id });
  } else if (command.type === 'create_order') {
    if (command.order.tenantId !== state.tenantId || command.order.companyId !== state.companyId || command.order.merchantId !== state.merchantId) throw new Error('订单所属商家不匹配');
    if (state.orders.some(item => item.id === command.order.id || (item.source === command.order.source && item.connectionId === command.order.connectionId && item.site === command.order.site && item.sourceId === command.order.sourceId))) throw new Error('来源订单已存在');
    if (!command.order.lines.length || new Set(command.order.lines.map(line => line.id)).size !== command.order.lines.length) throw new Error('订单商品行缺失或重复');
    state.orders.push({ ...command.order, revision: 1 });
    journal(state, context, command.order.id, command.type, '订单已建立', command.order);
  } else if (command.type === 'allocate') {
    const source = order(state, command.orderId);
    if (['vendor_retail', 'vendor_df'].includes(source.source) && context.domain !== 'vendor') throw new Error('Vendor 发运须从来源 Vendor 单据操作');
    if (source.source === 'internal_transfer' && context.domain !== 'fba') throw new Error('补货分配须从来源计划操作');
    if (source.archived || source.migrationBlocked) throw new Error(source.migrationBlocked || '订单已关闭');
    if (source.channelType === 'AFN') throw new Error('FBA 订单由 Amazon 平台履约，不创建自有仓或 MCF 任务');
    if (!command.lines.length || new Set(command.lines.map(line => line.lineId)).size !== command.lines.length) throw new Error('请选择不重复的订单行分配');
    const id = `ful:${context.id}`;
    const task: Fulfillment = { ...envelope(state, id), orderId: source.id, number: `FO-${displaySequence(context.id)}`, executor: command.executor, warehouseId: command.warehouseId, connectionId: command.connectionId, site: command.site, lines: command.lines, status: command.executor === 'amazon' ? 'submitted' : 'allocated', reservations: [], submittedAt: new Date(context.now).toISOString() };
    if (command.executor === 'amazon') {
      if (!command.proposal) throw new Error('请先查询并确认 Amazon 配送方案');
      const proposal = command.proposal;
      if (proposal.orderId !== source.id || proposal.connectionId !== command.connectionId || proposal.site !== command.site || JSON.stringify(proposal.lines.map(line => ({ lineId: line.lineId, quantity: line.quantity }))) !== JSON.stringify(command.lines)) throw new Error('配送方案与本次履约不一致，请重新查询');
      if (command.warehouseId) {
        const binding = state.fulfillmentWarehouses?.find(item => item.id === command.warehouseId && item.active);
        if (!binding || binding.connectionId !== command.connectionId || binding.site !== command.site) throw new Error('FBA 仓库的 APP 履约绑定与配送账号或市场不匹配');
        task.status = 'allocated';
      }
      validateMcfProposal(state, proposal, context.now);
      task.mcf = { proposal: structuredClone(proposal), request: buildMcfCreatePayload(state, proposal, id) };
      task.providerReference = task.mcf.request.sellerFulfillmentOrderId;
    } else {
      if (!command.warehouseId) throw new Error('请选择自有仓库');
      const warehouse = warehouseRecords(state).find(item => item.id === command.warehouseId);
      if (warehouse && (!warehouse.active || warehouse.kind !== 'local')) throw new Error('停用仓、虚拟仓或平台仓不能作为本地仓执行拣货发货');
    }
    for (const line of command.lines) {
      quantity(line.quantity);
      if (line.quantity > availableToAllocate(state, source.id, line.lineId)) throw new Error('分配超过订单行剩余数量');
      const sourceLine = source.lines.find(item => item.id === line.lineId)!;
      if (!sourceLine.mappingSnapshot || !sourceLine.omsVariantId) throw new Error('建单商品尚未识别，不能分配');
      const stock = stockFor(state, task, sourceLine.sku);
      if (!stock || stock.onHand - stock.reserved - stock.unfulfillable < line.quantity) throw new Error(`${sourceLine.sku} 可用库存不足`);
      stock.reserved += line.quantity; stock.revision++;
      const reservationId = `${id}:reservation:${line.lineId}`;
      state.reservations.push({ ...envelope(state, reservationId), fulfillmentId: id, stockId: stock.id, lineId: line.lineId, quantity: line.quantity, status: 'active' });
      task.reservations.push(reservationId);
      state.movements.push({ ...envelope(state, `${reservationId}:reserve`), stockId: stock.id, referenceId: id, kind: 'reserve', quantity: line.quantity, createdAt: task.submittedAt });
    }
    task.outboundId = `ob:${context.id}`;
    state.outbounds.push({ ...envelope(state, task.outboundId), number: `OB-${displaySequence(context.id)}`, orderId: source.id, fulfillmentId: id, warehouseId: command.warehouseId, lines: command.lines, status: 'waiting', createdAt: task.submittedAt });
    if (command.executor === 'warehouse') schedule(state, context, 'warehouse_pick', id, 1500);
    else if (!command.warehouseId) schedule(state, context, 'amazon_create', id, 1500);
    state.fulfillments.push(task); source.revision++;
    journal(state, context, source.id, command.type, '生成履约分配、库存预占及关联执行任务', task);
  } else if (command.type === 'withdraw') {
    const task = fulfillment(state, command.fulfillmentId);
    const source = order(state, task.orderId);
    if (['vendor_retail', 'vendor_df'].includes(source.source) && context.domain !== 'vendor') throw new Error('Vendor 任务须回来源单据处理，不可绕过批次约束');
    if (source.source === 'internal_transfer' && context.domain !== 'fba') throw new Error('补货撤回须回来源计划处理');
    if (['shipped', 'delivered', 'cancelled', 'withdraw_pending', 'unknown'].includes(task.status)) throw new Error('当前任务不可撤回');
    task.status = 'withdraw_pending'; task.revision++;
    const outbound = state.outbounds.find(item => item.id === task.outboundId);
    if (outbound) { outbound.status = 'withdraw_pending'; outbound.revision++; }
    schedule(state, context, 'withdraw', task.id, 1500);
    journal(state, context, task.orderId, command.type, '已申请撤回，确认前不释放预占', { fulfillmentId: task.id });
  } else if (command.type === 'dispatch') {
    const task = fulfillment(state, command.fulfillmentId);
    const source = order(state, task.orderId);
    if (['vendor_retail', 'vendor_df'].includes(source.source) && context.domain !== 'vendor') throw new Error('Vendor 发货须先完成来源业务的 ASN 或面单要求');
    if (task.executor !== 'warehouse') throw new Error('MCF 发货只能由 Amazon 提供方回执更新，不能手动发货');
    if (task.status !== 'packed') throw new Error('必须完成打包，且任务不可处于撤回或已发货状态');
    if (!command.carrier.trim() || !command.tracking.trim()) throw new Error('请填写承运商和运单号');
    dispatchTask(state, task, context, command.carrier, command.tracking);
  } else if (command.type === 'shipment_upsert') {
    upsertShipment(state, command, context);
  } else if (command.type === 'writeback') {
    const pack = state.packages.find(item => item.id === command.packageId);
    if (!pack || pack.confirmation === 'confirmed' || pack.confirmation === 'not_required') throw new Error('包裹不存在或无需重复回传');
    if (pack.confirmation === 'pending' && state.jobs.some(job => job.kind === 'writeback' && job.targetId === pack.id && job.status === 'queued')) throw new Error('回传处理中，请勿重复提交');
    pack.confirmation = 'pending'; pack.revision++;
    schedule(state, context, 'writeback', pack.id, 1500);
    journal(state, context, pack.orderId, command.type, '仅回传原包裹发货信息，不创建配送', { packageId: pack.id });
  } else if (command.type === 'cancel_order') {
    const source = order(state, command.orderId);
    if (['vendor_retail', 'vendor_df', 'internal_transfer'].includes(source.source)) throw new Error('内部执行需求只能通过来源业务处理取消或调整');
    if (!command.reason.trim()) throw new Error('请填写取消原因');
    if (state.fulfillments.some(task => task.orderId === source.id && task.status !== 'cancelled')) throw new Error('请先处理有效履约任务；已发货数量须走售后');
    source.lines.forEach(line => { line.cancelled = line.quantity; }); source.archived = true; source.revision++;
    journal(state, context, source.id, command.type, command.reason);
  } else {
    const source = order(state, command.orderId); source.note = command.note; source.revision++;
    journal(state, context, source.id, command.type, '更新内部备注');
  }
  state.commandIds.push(context.id);
  assertOmsInvariants(state);
  return state;
}
function dispatchTask(state: OmsSnapshot, task: Fulfillment, context: CommandContext, carrier: string, tracking: string) {
  for (const id of task.reservations) {
    const reservation = state.reservations.find(item => item.id === id)!;
    if (reservation.status !== 'active') throw new Error('预占已释放或消耗，不能再次发货');
    const stock = state.stocks.find(item => item.id === reservation.stockId)!;
    stock.reserved -= reservation.quantity; stock.onHand -= reservation.quantity; stock.revision++;
    reservation.status = 'consumed'; reservation.revision++;
    state.movements.push({ ...envelope(state, `${id}:consume`), stockId: stock.id, referenceId: task.id, kind: 'ship', quantity: reservation.quantity, createdAt: new Date(context.now).toISOString() });
  }
  task.status = 'shipped'; task.revision++;
  const outbound = state.outbounds.find(item => item.id === task.outboundId);
  if (outbound) { outbound.status = 'shipped'; outbound.revision++; }
  const source = order(state, task.orderId);
  const packId = `${task.id}:package:1`;
  const shippedAt = new Date(context.now).toISOString();
  const confirmation = ['manual', 'internal_transfer', 'vendor_retail'].includes(source.source) ? 'not_required' as const : 'pending' as const;
  state.packages.push({ ...envelope(state, packId), fulfillmentId: task.id, orderId: source.id, number: `PKG-${task.number}`, carrier, tracking, lines: task.lines, shippedAt, confirmation });
  upsertShipment(state, { type: 'shipment_upsert', outboundId: task.outboundId!, fulfillmentId: task.id, orderId: source.id, provider: task.executor === 'amazon' ? 'amazon_mcf' : 'warehouse', providerShipmentId: task.executor === 'amazon' ? task.providerReference ?? packId : packId, providerPackageId: packId, status: 'in_transit', carrier, trackingNumber: tracking, lines: task.lines, shippedAt, confirmation }, context);
  if (!['manual', 'internal_transfer', 'vendor_retail'].includes(source.source)) schedule(state, context, 'writeback', packId, 1500);
  schedule(state, context, 'deliver', packId, 15000);
  journal(state, context, source.id, 'shipment', '包裹发货，库存预占已消耗', { packageId: packId });
}
export function advanceOmsJobs(current: OmsSnapshot, now: number): OmsSnapshot {
  const due = current.jobs.filter(job => job.status === 'queued' && job.dueAt <= now);
  if (!due.length) return current;
  const state = clone(current);
  for (const dueJob of due) {
    const job = state.jobs.find(item => item.id === dueJob.id)!;
    const context: CommandContext = { id: job.id, now: job.dueAt, actor: 'provider', canWrite: true };
    const task = state.fulfillments.find(item => item.id === job.targetId);
    if (job.kind === 'withdraw' && task?.status === 'withdraw_pending') {
      for (const id of task.reservations) {
        const reservation = state.reservations.find(item => item.id === id)!;
        if (reservation.status !== 'active') continue;
        const stock = state.stocks.find(item => item.id === reservation.stockId)!;
        stock.reserved -= reservation.quantity; stock.revision++; reservation.status = 'released'; reservation.revision++;
        state.movements.push({ ...envelope(state, `${id}:release`), stockId: stock.id, referenceId: task.id, kind: 'release', quantity: reservation.quantity, createdAt: new Date(job.dueAt).toISOString() });
      }
      task.status = 'cancelled'; task.revision++;
      const outbound = state.outbounds.find(item => item.id === task.outboundId); if (outbound) { outbound.status = 'cancelled'; outbound.revision++; }
      journal(state, context, task.orderId, 'withdrawal', '撤回已确认，原执行任务关闭并释放预占', { fulfillmentId: task.id });
    } else if (job.kind === 'warehouse_pick' && task?.status === 'allocated') {
      task.status = 'picking'; task.revision++;
      const outbound = state.outbounds.find(item => item.id === task.outboundId); if (outbound) { outbound.status = 'picking'; outbound.revision++; }
      schedule(state, context, 'warehouse_pack', task.id, 1500);
    } else if (job.kind === 'warehouse_pack' && task?.status === 'picking') {
      task.status = 'packed'; task.revision++;
      const outbound = state.outbounds.find(item => item.id === task.outboundId); if (outbound) { outbound.status = 'packed'; outbound.revision++; }
    } else if (job.kind === 'amazon_create' && task?.status === 'submitted') {
      task.status = 'picking'; task.providerReference = task.mcf?.request.sellerFulfillmentOrderId ?? task.providerReference ?? `MCF-${task.id}`; task.revision++;
      journal(state, context, task.orderId, 'mcf_created', '本地模拟提供方已接受原 MCF 配送请求', { fulfillmentId: task.id, providerReference: task.providerReference });
      const outbound = state.outbounds.find(item => item.id === task.outboundId);
      if (outbound) { outbound.status = 'picking'; outbound.revision++; }
      schedule(state, context, 'ship', task.id, 3500);
    } else if (job.kind === 'ship' && task?.status === 'picking' && task.executor === 'amazon') {
      task.status = 'packed'; dispatchTask(state, task, context, 'Amazon Logistics', `TBA${Math.abs(job.dueAt).toString().slice(-12)}`);
    } else if (job.kind === 'writeback') {
      const pack = state.packages.find(item => item.id === job.targetId);
      if (pack?.confirmation === 'pending') { pack.confirmation = 'confirmed'; pack.revision++; const shipment = state.shipments.find(item => item.providerPackageId === pack.id); if (shipment) { shipment.confirmation = 'confirmed'; shipment.revision++; } journal(state, context, pack.orderId, 'writeback', '原包裹发货确认成功', { packageId: pack.id }); }
    } else if (job.kind === 'deliver') {
      const pack = state.packages.find(item => item.id === job.targetId);
      if (pack && !pack.deliveredAt) { pack.deliveredAt = new Date(job.dueAt).toISOString(); pack.revision++; const original = fulfillment(state, pack.fulfillmentId); original.status = 'delivered'; original.revision++; const shipment = state.shipments.find(item => item.providerPackageId === pack.id); if (shipment) { shipment.status = 'delivered'; shipment.deliveredAt = pack.deliveredAt; shipment.revision++; } journal(state, context, pack.orderId, 'delivery', '包裹已签收', { packageId: pack.id }); }
    }
    job.status = 'completed'; job.attempts++;
  }
  assertOmsInvariants(state);
  // Catch up chained receipts using persisted deadlines, not the time a page was opened.
  return state.jobs.some(job => job.status === 'queued' && job.dueAt <= now) ? advanceOmsJobs(state, now) : state;
}
