import { assertOmsInvariants } from './commands';
import type { CommandContext, Entity, OmsSnapshot, SalesOrder } from './types';

export type ReturnLine = { lineId: string; quantity: number; good: number; damaged: number; unknown: number };
export type ReturnCase = Entity & { orderId: string; packageId: string; reason: string; status: 'requested' | 'authorized' | 'rejected' | 'inspected'; lines: ReturnLine[]; createdAt: string; inspectedAt?: string };
export type RefundEntry = Entity & { returnId: string; orderId: string; currency: string; amountMinor: number; status: 'pending' | 'success'; dueAt: number; createdAt: string; receipt?: string; completedAt?: string };
export type AfterSalesSnapshot = OmsSnapshot & { returns?: ReturnCase[]; refunds?: RefundEntry[] };
export type AfterSalesCommand =
  | { type: 'request_return'; orderId: string; packageId: string; reason: string; lines: { lineId: string; quantity: number }[] }
  | { type: 'authorize_return'; returnId: string }
  | { type: 'reject_return'; returnId: string; reason: string }
  | { type: 'inspect_return'; returnId: string; lines: ReturnLine[] }
  | { type: 'request_refund'; returnId: string; amountMinor: number };

export function assertDomainScope(state: OmsSnapshot, entity?: Entity) {
  if (!state.tenantId || !state.companyId || !state.merchantId || state.merchantId === 'all') throw new Error('操作必须归属具体商家');
  if (entity && (entity.tenantId !== state.tenantId || entity.companyId !== state.companyId || entity.merchantId !== state.merchantId)) throw new Error('实体作用域不一致');
}
export const domainEntity = (state: OmsSnapshot, id: string): Entity => ({ tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, id, revision: 1 });
export function domainJournal(state: OmsSnapshot, context: CommandContext, entityId: string, type: string, payload: unknown) {
  state.events.push({ id: `${context.id}:event:${state.events.length}`, commandId: context.id, entityId, type, at: new Date(context.now).toISOString(), description: `${type} · ${context.actor}`, payload: structuredClone(payload) });
}
export function domainGuard(state: OmsSnapshot, context: CommandContext) {
  assertDomainScope(state);
  if (!context.id.trim() || !context.actor.trim() || !Number.isFinite(context.now)) throw new Error('无效命令上下文');
  if (state.commandIds.includes(context.id)) return false;
  if (!context.canWrite) throw new Error('当前角色没有操作权限');
  if (context.expectedRevision !== undefined && context.expectedRevision !== state.revision) throw new Error('业务记录已变化，请刷新后重试');
  return true;
}
export function minorAmount(value: number, allowZero = false) { if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new Error('金额必须为安全整数最小货币单位'); }
const qty = (value: number, zero = false) => { if (!Number.isSafeInteger(value) || value < (zero ? 0 : 1)) throw new Error('数量必须为整数且不能超量'); };
function sourceOrder(state: OmsSnapshot, id: string) { const order = state.orders.find(item => item.id === id); if (!order) throw new Error('原订单不存在'); assertDomainScope(state, order); if (['internal_transfer', 'vendor_retail', 'vendor_df'].includes(order.source)) throw new Error('内部调拨与 Vendor 需求不属于消费者售后'); return order; }
function returnCase(state: AfterSalesSnapshot, id: string) { const item = state.returns?.find(item => item.id === id); if (!item) throw new Error('售后单不存在'); assertDomainScope(state, item); return item; }

/** Largest-remainder proportional allocation in integer minor units; never floating point money. */
export function paidAllocation(order: SalesOrder): Map<string, number> {
  if (order.paidMinor === null) throw new Error('原订单实付金额未知，不可退款');
  minorAmount(order.paidMinor, true);
  if (order.lines.some(line => line.unitPriceMinor === null)) throw new Error('原订单商品金额未知，不可自动分摊');
  const weights = order.lines.map(line => { minorAmount(line.unitPriceMinor!, true); return BigInt(line.unitPriceMinor!) * BigInt(line.quantity); });
  const total = weights.reduce((a, b) => a + b, BigInt(0));
  if (total === BigInt(0)) { if (order.paidMinor) throw new Error('缺少实付金额分摊依据'); return new Map(order.lines.map(line => [line.id, 0])); }
  const paid = BigInt(order.paidMinor);
  const allocations = weights.map((weight, index) => ({ index, amount: paid * weight / total, remainder: paid * weight % total }));
  let remaining = paid - allocations.reduce((sum, item) => sum + item.amount, BigInt(0));
  for (const allocation of [...allocations].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) { if (remaining-- <= BigInt(0)) break; allocation.amount++; }
  return new Map(allocations.map(item => [order.lines[item.index].id, Number(item.amount)]));
}
export function eligibleReturnMinor(state: AfterSalesSnapshot, item: ReturnCase): number {
  const order = sourceOrder(state, item.orderId); const allocation = paidAllocation(order);
  return item.lines.reduce((total, line) => { const original = order.lines.find(source => source.id === line.lineId); if (!original) throw new Error('售后商品不属于原订单'); return total + Number(BigInt(allocation.get(line.lineId)!) * BigInt(line.quantity) / BigInt(original.quantity)); }, 0);
}
export function assertAfterSalesInvariants(state: AfterSalesSnapshot) {
  assertOmsInvariants(state);
  for (const collection of [state.returns ?? [], state.refunds ?? []]) {
    if (new Set(collection.map(item => item.id)).size !== collection.length) throw new Error('售后实体 ID 重复');
    for (const item of collection) assertDomainScope(state, item);
  }
  for (const item of state.returns ?? []) {
    sourceOrder(state, item.orderId);
    const pack = state.packages.find(pack => pack.id === item.packageId && pack.orderId === item.orderId);
    if (!pack || !item.lines.length || new Set(item.lines.map(line => line.lineId)).size !== item.lines.length) throw new Error('售后必须关联原包裹唯一商品行');
    assertDomainScope(state, pack);
    for (const line of item.lines) {
      qty(line.quantity); for (const amount of [line.good, line.damaged, line.unknown]) qty(amount, true);
      const shipped = pack.lines.filter(source => source.lineId === line.lineId).reduce((sum, source) => sum + source.quantity, 0);
      const returned = (state.returns ?? []).filter(other => other.packageId === pack.id && other.status !== 'rejected').flatMap(other => other.lines).filter(other => other.lineId === line.lineId).reduce((sum, other) => sum + other.quantity, 0);
      if (!shipped || returned > shipped) throw new Error('累计售后数量超过原包裹已发货数量');
      if (item.status === 'inspected' && line.good + line.damaged + line.unknown !== line.quantity) throw new Error('质检良品/损坏/未知数量不守恒');
    }
    const refunds = (state.refunds ?? []).filter(refund => refund.returnId === item.id);
    if (refunds.length && (item.status !== 'inspected' || refunds.reduce((n, refund) => n + refund.amountMinor, 0) > eligibleReturnMinor(state, item))) throw new Error('退款超过售后实付分摊额度');
  }
  for (const refund of state.refunds ?? []) {
    minorAmount(refund.amountMinor); const item = returnCase(state, refund.returnId); const order = sourceOrder(state, refund.orderId);
    if (item.orderId !== order.id || refund.currency !== order.currency) throw new Error('退款来源或币种不匹配');
    if ((state.refunds ?? []).filter(other => other.orderId === order.id).reduce((sum, other) => sum + other.amountMinor, 0) > (order.paidMinor ?? 0)) throw new Error('累计退款超过实付');
  }
}
export function executeAfterSales(current: AfterSalesSnapshot, command: AfterSalesCommand, context: CommandContext): AfterSalesSnapshot {
  if (!domainGuard(current, context)) return current;
  assertAfterSalesInvariants(current);
  const state: AfterSalesSnapshot = structuredClone(current); state.returns ??= []; state.refunds ??= [];
  let target: ReturnCase;
  if (command.type === 'request_return') {
    sourceOrder(state, command.orderId);
    if (!command.reason.trim()) throw new Error('请填写售后原因');
    target = { ...domainEntity(state, `return:${context.id}`), orderId: command.orderId, packageId: command.packageId, reason: command.reason.trim(), status: 'requested', lines: command.lines.map(line => ({ ...line, good: 0, damaged: 0, unknown: 0 })), createdAt: new Date(context.now).toISOString() };
    state.returns.push(target);
  } else {
    target = returnCase(state, command.returnId);
    if (command.type === 'authorize_return') { if (target.status !== 'requested') throw new Error('仅待审核售后可批准'); target.status = 'authorized'; }
    else if (command.type === 'reject_return') { if (target.status !== 'requested' || !command.reason.trim()) throw new Error('仅待审核售后可拒绝且需原因'); target.status = 'rejected'; }
    else if (command.type === 'inspect_return') {
      if (target.status !== 'authorized') throw new Error('仅已批准售后可质检入库一次');
      if (command.lines.length !== target.lines.length || new Set(command.lines.map(line => line.lineId)).size !== target.lines.length) throw new Error('质检行缺失或重复');
      for (const line of command.lines) {
        const requested = target.lines.find(item => item.lineId === line.lineId);
        for (const amount of [line.good, line.damaged, line.unknown]) qty(amount, true);
        if (!requested || line.quantity !== requested.quantity || line.good + line.damaged + line.unknown !== requested.quantity) throw new Error('质检数量与申请不守恒');
        const pack = state.packages.find(pack => pack.id === target.packageId)!;
        const reservation = state.reservations.find(item => item.fulfillmentId === pack.fulfillmentId && item.lineId === line.lineId && item.status === 'consumed');
        const stock = state.stocks.find(item => item.id === reservation?.stockId);
        if (!stock) throw new Error('无法确认原履约库存，不可自动回库');
        assertDomainScope(state, stock);
        stock.onHand += line.quantity; stock.unfulfillable += line.damaged + line.unknown; stock.revision++;
        for (const [kind, amount] of [['restock', line.good], ['damage', line.damaged + line.unknown]] as const) if (amount) state.movements.push({ ...domainEntity(state, `${target.id}:${line.lineId}:${kind}`), stockId: stock.id, referenceId: target.id, kind, quantity: amount, createdAt: new Date(context.now).toISOString() });
      }
      target.lines = structuredClone(command.lines); target.status = 'inspected'; target.inspectedAt = new Date(context.now).toISOString();
    } else {
      if (target.status !== 'inspected') throw new Error('质检完成后才可发起退款');
      minorAmount(command.amountMinor);
      const order = sourceOrder(state, target.orderId);
      state.refunds.push({ ...domainEntity(state, `refund:${context.id}`), returnId: target.id, orderId: order.id, currency: order.currency, amountMinor: command.amountMinor, status: 'pending', dueAt: context.now + 1500, createdAt: new Date(context.now).toISOString() });
    }
    target.revision++;
  }
  domainJournal(state, context, target.id, command.type, command); state.commandIds.push(context.id);
  assertAfterSalesInvariants(state); return state;
}
/** Local simulation receipt only: this does not move real money. */
export function advanceAfterSales(current: AfterSalesSnapshot, now: number): AfterSalesSnapshot {
  if (!(current.refunds ?? []).some(refund => refund.status === 'pending' && refund.dueAt <= now)) return current;
  assertAfterSalesInvariants(current); const state: AfterSalesSnapshot = structuredClone(current);
  for (const refund of state.refunds ?? []) if (refund.status === 'pending' && refund.dueAt <= now) {
    refund.status = 'success'; refund.receipt = `LOCAL-REFUND-${refund.id}`; refund.completedAt = new Date(refund.dueAt).toISOString(); refund.revision++;
    domainJournal(state, { id: `${refund.id}:receipt`, now: refund.dueAt, actor: 'local-simulator', canWrite: true }, refund.id, 'refund_success', { receipt: refund.receipt, amountMinor: refund.amountMinor, currency: refund.currency, simulated: true });
  }
  assertAfterSalesInvariants(state); return state;
}
