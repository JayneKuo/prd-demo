import { describe, expect, it } from 'vitest';
import { emptySnapshot, type CommandContext, type SalesOrder } from './types';
import { advanceOmsJobs, executeOmsCommand } from './commands';
import { advanceAfterSales, executeAfterSales, eligibleReturnMinor, paidAllocation, assertAfterSalesInvariants, type AfterSalesSnapshot } from './aftersales';
import { financeSources } from './finance';

const scope = { tenantId: 't', companyId: 'c', merchantId: 'm' };
const ctx = (id: string): CommandContext => ({ id, now: 5000, actor: 'ops', canWrite: true });
export function shippedState(): AfterSalesSnapshot {
  let state = emptySnapshot(scope);
  const order: SalesOrder = { ...scope, id: 'order', revision: 1, number: 'SO1', sourceId: 'channel1', source: 'Amazon', createdAt: new Date(0).toISOString(), currency: 'USD', paidMinor: 1001, paymentStatus: 'paid', customer: 'A', address: null, note: '', tags: [], lines: [{ id: 'line', channelLineId: 'ch', channelSku: 'sku', omsVariantId: 'v', sku: 'sku', title: 'Product', quantity: 3, cancelled: 0, unit: 'Each', unitPriceMinor: 400, mappingSnapshot: { channelSku: 'sku', omsVariantId: 'v' } }] };
  state.orders.push(order); state.stocks.push({ ...scope, id: 'stock', revision: 1, warehouseId: 'wh', pool: 'warehouse', sku: 'sku', onHand: 10, reserved: 0, unfulfillable: 0 });
  state = executeOmsCommand(state, { type: 'allocate', orderId: 'order', executor: 'warehouse', warehouseId: 'wh', lines: [{ lineId: 'line', quantity: 3 }] }, { ...ctx('allocate'), now: 0 });
  state = advanceOmsJobs(state, 2000); state = advanceOmsJobs(state, 4000);
  return executeOmsCommand(state, { type: 'dispatch', fulfillmentId: state.fulfillments[0].id, carrier: 'UPS', tracking: 'tracking' }, ctx('ship'));
}
export function inspectedState(quantity = 3): AfterSalesSnapshot {
  let state = shippedState();
  state = executeAfterSales(state, { type: 'request_return', orderId: 'order', packageId: state.packages[0].id, reason: 'wrong item', lines: [{ lineId: 'line', quantity }] }, ctx('request'));
  state = executeAfterSales(state, { type: 'authorize_return', returnId: 'return:request' }, ctx('authorize'));
  return executeAfterSales(state, { type: 'inspect_return', returnId: 'return:request', lines: [{ lineId: 'line', quantity, good: quantity - 1, damaged: 0, unknown: 1 }] }, ctx('inspect'));
}
describe('canonical aftersales', () => {
  it('ties cumulative return quantities to shipped package lines, not ordered quantities', () => {
    let state = shippedState(); const command = { type: 'request_return' as const, orderId: 'order', packageId: state.packages[0].id, reason: 'reason', lines: [{ lineId: 'line', quantity: 2 }] };
    state = executeAfterSales(state, command, ctx('r1'));
    expect(executeAfterSales(state, command, ctx('r1'))).toBe(state);
    expect(() => executeAfterSales(state, command, ctx('r2'))).toThrow(/累计/);
    expect(() => executeAfterSales(state, { ...command, lines: [{ lineId: 'foreign', quantity: 1 }] }, ctx('r3'))).toThrow();
    expect(() => executeAfterSales(state, { ...command, lines: [{ lineId: 'line', quantity: 0.5 }] }, ctx('r4'))).toThrow();
    state = executeAfterSales(state, { type: 'reject_return', returnId: 'return:r1', reason: 'wrong request' }, ctx('reject'));
    expect(executeAfterSales(state, command, ctx('r2')).returns).toHaveLength(2);
  });
  it('inspects exact quantities, restores only original consumed stock once, quarantines unknown', () => {
    const state = inspectedState();
    expect(state.stocks[0]).toMatchObject({ onHand: 10, reserved: 0, unfulfillable: 1 });
    expect(state.movements.filter(item => item.referenceId === 'return:request').map(item => [item.kind, item.quantity])).toEqual([['restock', 2], ['damage', 1]]);
    expect(shippedState().stocks[0].onHand).toBe(7);
    const command = { type: 'inspect_return' as const, returnId: 'return:request', lines: [{ lineId: 'line', quantity: 3, good: 2, damaged: 0, unknown: 1 }] };
    expect(executeAfterSales(state, command, ctx('inspect'))).toBe(state);
    expect(() => executeAfterSales(state, command, ctx('again'))).toThrow(/一次/);
    expect(state.events.find(event => event.type === 'inspect_return')?.payload).toEqual(command);
    expect(() => assertAfterSalesInvariants({ ...state, returns: state.returns?.map(item => ({ ...item, merchantId: 'other' })) })).toThrow(/作用域/);
  });
  it('rejects inspection imbalance and targets original reservation stock rather than same-SKU other warehouse', () => {
    let state = shippedState(); state.stocks.unshift({ ...state.stocks[0], id: 'other-stock', warehouseId: 'other', onHand: 50 });
    state = executeAfterSales(state, { type: 'request_return', orderId: 'order', packageId: state.packages[0].id, reason: 'return', lines: [{ lineId: 'line', quantity: 2 }] }, ctx('request'));
    state = executeAfterSales(state, { type: 'authorize_return', returnId: 'return:request' }, ctx('authorize'));
    expect(() => executeAfterSales(state, { type: 'inspect_return', returnId: 'return:request', lines: [{ lineId: 'line', quantity: 2, good: 2, damaged: 1, unknown: 0 }] }, ctx('bad-inspection'))).toThrow(/守恒/);
    expect(state.stocks.find(stock => stock.id === 'stock')!.onHand).toBe(7);
    state = executeAfterSales(state, { type: 'inspect_return', returnId: 'return:request', lines: [{ lineId: 'line', quantity: 2, good: 1, damaged: 1, unknown: 0 }] }, ctx('inspection'));
    expect(state.stocks.find(stock => stock.id === 'stock')).toMatchObject({ onHand: 9, unfulfillable: 1 });
    expect(state.stocks.find(stock => stock.id === 'other-stock')!.onHand).toBe(50);
  });
  it('bounds pending and successful refunds by proportional paid minor and completes once asynchronously', () => {
    let state = inspectedState(2); expect(eligibleReturnMinor(state, state.returns![0])).toBe(667);
    state = executeAfterSales(state, { type: 'request_refund', returnId: 'return:request', amountMinor: 600 }, ctx('refund1'));
    expect(state.refunds![0].status).toBe('pending');
    expect(financeSources(state).filter(source => source.kind === 'refund')).toHaveLength(0);
    expect(() => executeAfterSales(state, { type: 'request_refund', returnId: 'return:request', amountMinor: 68 }, ctx('refund2'))).toThrow(/额度/);
    expect(advanceAfterSales(state, 6000)).toBe(state);
    const done = advanceAfterSales(state, 7000); expect(done.refunds![0]).toMatchObject({ status: 'success', receipt: 'LOCAL-REFUND-refund:refund1' });
    expect(advanceAfterSales(done, 9000)).toBe(done); expect(state.refunds![0].status).toBe('pending');
    expect(financeSources(done).find(source => source.kind === 'refund')).toMatchObject({ id: 'refund:refund:refund1', amountMinor: -600, currency: 'USD' });
  });
  it('uses largest remainder for line allocation and requires known paid prices', () => {
    const order = shippedState().orders[0]; const line = order.lines[0];
    expect([...paidAllocation({ ...order, paidMinor: 1, lines: [{ ...line, id: 'a', quantity: 1, unitPriceMinor: 1 }, { ...line, id: 'b', quantity: 1, unitPriceMinor: 1 }] }).values()]).toEqual([1, 0]);
    expect(() => paidAllocation({ ...order, paidMinor: null })).toThrow();
    expect(() => paidAllocation({ ...order, lines: [{ ...line, unitPriceMinor: null }] })).toThrow();
  });
  it('rejects unauthorized, stale and foreign entities without mutating original state', () => {
    const state = shippedState(); const command = { type: 'request_return' as const, orderId: 'order', packageId: state.packages[0].id, reason: 'reason', lines: [{ lineId: 'line', quantity: 1 }] };
    expect(() => executeAfterSales(state, command, { ...ctx('no'), canWrite: false })).toThrow(/权限/);
    expect(() => executeAfterSales(state, command, { ...ctx('stale'), expectedRevision: 99 })).toThrow(/刷新/);
    state.orders[0].merchantId = 'foreign'; expect(() => executeAfterSales(state, command, ctx('foreign'))).toThrow(/作用域/);
    expect(state.returns).toBeUndefined();
  });
});
