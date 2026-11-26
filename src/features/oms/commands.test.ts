import { describe, expect, it } from 'vitest';
import { emptySnapshot, type CommandContext, type SalesOrder } from './types';
import { executeOmsCommand, availableToAllocate, advanceOmsJobs } from './commands';
const scope = { tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' };
const ctx = (id: string, now = 0): CommandContext => ({ id, now, actor: 'ops', canWrite: true });
function initial() {
  const state = emptySnapshot(scope);
  const source: SalesOrder = { ...scope, id: 'so_test', revision: 1, number: 'SO1', sourceId: 'AMZ1', source: 'Amazon', channelType: 'MFN', createdAt: new Date(0).toISOString(), currency: 'USD', paidMinor: 10000, paymentStatus: '已支付', customer: 'Alex', address: null, note: '', tags: [], lines: [{ id: 'l1', channelLineId: 'ch1', channelSku: 'AMZ-A', omsVariantId: 'v1', sku: 'A', title: 'A', quantity: 10, cancelled: 0, unit: 'Each', unitPriceMinor: 1000, mappingSnapshot: { channelSku: 'AMZ-A', omsVariantId: 'v1' } }] };
  state.orders.push(source);
  state.stocks.push({ ...scope, id: 'stock1', revision: 1, warehouseId: 'wh_lax', sku: 'A', pool: 'warehouse', onHand: 20, reserved: 0, unfulfillable: 0 });
  return state;
}
describe('canonical OMS transactions', () => {
  it('repairs an unresolved order line without losing channel identity or quantity', () => {
    const state = initial();
    state.orders[0].lines[0].mappingSnapshot = undefined;
    state.orders[0].lines[0].omsVariantId = '';
    const repaired = executeOmsCommand(state, { type: 'map_order_line', orderId: 'so_test', lineId: 'l1', variantId: 'var_001_1' }, ctx('map1'));
    expect(repaired.orders[0].lines[0].sku).toBe('WEP-BLK-001');
    expect(repaired.orders[0].lines[0].mappingSnapshot?.channelSku).toBe('AMZ-A');
    expect(repaired.orders[0].lines[0].quantity).toBe(10);
    expect(state.orders[0].lines[0].omsVariantId).toBe('');
  });
  it('creates exact split quantities, real outbounds and owned reservations atomically', () => {
    const state = executeOmsCommand(initial(), { type: 'allocate', orderId: 'so_test', executor: 'warehouse', warehouseId: 'wh_lax', lines: [{ lineId: 'l1', quantity: 4 }] }, ctx('c1'));
    expect(state.fulfillments[0].lines[0].quantity).toBe(4);
    expect(state.outbounds[0].fulfillmentId).toBe(state.fulfillments[0].id);
    expect(state.stocks[0].reserved).toBe(4);
    expect(availableToAllocate(state, 'so_test', 'l1')).toBe(6);
    expect(executeOmsCommand(state, { type: 'allocate', orderId: 'so_test', executor: 'warehouse', warehouseId: 'wh_lax', lines: [{ lineId: 'l1', quantity: 4 }] }, ctx('c1'))).toBe(state);
    expect(() => executeOmsCommand(state, { type: 'allocate', orderId: 'so_test', executor: 'warehouse', warehouseId: 'wh_lax', lines: [{ lineId: 'l1', quantity: 7 }] }, ctx('over'))).toThrow();
    expect(state.stocks[0].reserved).toBe(4);
  });
  it('withdraws the exact outbound and releases the same reservation before replacement', () => {
    let state = executeOmsCommand(initial(), { type: 'allocate', orderId: 'so_test', executor: 'warehouse', warehouseId: 'wh_lax', lines: [{ lineId: 'l1', quantity: 10 }] }, ctx('c1'));
    state = executeOmsCommand(state, { type: 'withdraw', fulfillmentId: state.fulfillments[0].id }, ctx('c2', 100));
    expect(state.stocks[0].reserved).toBe(10);
    state = advanceOmsJobs(state, 2000);
    expect(state.fulfillments[0].status).toBe('cancelled');
    expect(state.outbounds[0].status).toBe('cancelled');
    expect(state.stocks[0].reserved).toBe(0);
    expect(state.movements.filter(entry => entry.kind === 'release')).toHaveLength(1);
    expect(availableToAllocate(state, 'so_test', 'l1')).toBe(10);
    expect(advanceOmsJobs(state, 5000).stocks[0].reserved).toBe(0);
  });
  it('ships only packed allocations, consumes once and independently confirms and delivers', () => {
    let state = executeOmsCommand(initial(), { type: 'allocate', orderId: 'so_test', executor: 'warehouse', warehouseId: 'wh_lax', lines: [{ lineId: 'l1', quantity: 4 }] }, ctx('c1'));
    const id = state.fulfillments[0].id;
    expect(() => executeOmsCommand(state, { type: 'dispatch', fulfillmentId: id, carrier: 'UPS', tracking: '1Z1' }, ctx('early'))).toThrow();
    state = advanceOmsJobs(state, 2000);
    state = advanceOmsJobs(state, 4000);
    state = executeOmsCommand(state, { type: 'dispatch', fulfillmentId: id, carrier: 'UPS', tracking: '1Z1' }, ctx('ship', 5000));
    expect(state.stocks[0].onHand).toBe(16);
    expect(state.stocks[0].reserved).toBe(0);
    expect(state.packages[0].lines[0].quantity).toBe(4);
    expect(() => executeOmsCommand(state, { type: 'withdraw', fulfillmentId: id }, ctx('late'))).toThrow();
    state = advanceOmsJobs(state, 25000);
    expect(state.packages[0].confirmation).toBe('confirmed');
    expect(state.packages[0].deliveredAt).toBeTruthy();
    expect(state.fulfillments[0].status).toBe('delivered');
    expect(state.movements.filter(entry => entry.kind === 'ship')).toHaveLength(1);
  });
});
