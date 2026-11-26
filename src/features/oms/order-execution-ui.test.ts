import { describe, expect, it } from 'vitest';
import { defaultBusinessConfig, type Connection } from '@/lib/amazon-connections';
import { emptySnapshot, type Fulfillment, type SalesOrder } from './types';
import { queryMcfProposal } from './mcf-proposal';
import { fbaLogicalWarehouses, formatMcfFee, mcfInputLines, prefillMcfQuantities, prepareMcfAllocation } from './order-execution-ui';

const now = Date.parse('2026-11-05T08:00:00Z');
function fixture() {
  const scope = { tenantId: 'tenant', companyId: 'company', merchantId: 'merchant' };
  const state = emptySnapshot(scope);
  const order: SalesOrder = { ...scope, revision: 1, id: 'order', number: 'SO-1', sourceId: 'amazon-order', source: 'Amazon', connectionId: 'seller', site: 'US', channelType: 'MFN', createdAt: new Date(now).toISOString(), currency: 'USD', paidMinor: 1000, paymentStatus: 'paid', customer: 'Alex', address: { name: 'Alex', phone: '2065550123', address1: '1201 3rd Ave', city: 'Seattle', province: 'WA', zip: '98101', country: 'US' }, note: '', tags: [], lines: [{ id: 'line', channelLineId: 'amazon-line', channelSku: 'SELLER-SKU', omsVariantId: 'variant', sku: 'OMS-SKU', title: 'Product', quantity: 6, cancelled: 0, unit: '件', unitPriceMinor: 100, mappingSnapshot: { channelSku: 'SELLER-SKU', omsVariantId: 'variant' } }] };
  state.orders.push(order);
  state.fulfillmentWarehouses = [{ id: 'fba:seller:US', code: 'FBA-US', name: 'Seller · US FBA 仓', app: 'amazon', capability: 'mcf', connectionId: 'seller', site: 'US', active: true }];
  state.stocks.push({ ...scope, revision: 1, id: 'stock', warehouseId: '', pool: 'fba', connectionId: 'seller', site: 'US', sku: 'OMS-SKU', onHand: 20, reserved: 0, unfulfillable: 0 });
  const connection: Connection = { id: 'seller', name: 'Seller', accountId: 'account', region: 'NA', identity: 'seller', authorized: true, businesses: { mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } };
  const quantities = { line: 2 };
  const proposal = queryMcfProposal(state, order.id, connection, mcfInputLines(order, quantities), 'Standard', now);
  const task: Fulfillment = { ...scope, id: 'warehouse-task', revision: 1, orderId: order.id, number: 'FO-1', executor: 'warehouse', warehouseId: 'warehouse', lines: [{ lineId: 'line', quantity: 4 }], status: 'withdraw_pending', reservations: [], submittedAt: new Date(now).toISOString() };
  return { state, order, connection, quantities, proposal, task };
}

describe('order execution MCF UI boundary', () => {
  it('derives a logical FBA warehouse from original Seller configuration, not from a fictional FC', () => {
    const { state, order, connection } = fixture();
    state.stocks.push({ ...state.stocks[0], id: 'other-site', site: 'CA' }, { ...state.stocks[0], id: 'other-seller', connectionId: 'another' }, { ...state.stocks[0], id: 'other-scope', merchantId: 'another' }, { ...state.stocks[0], id: 'own', pool: 'warehouse' });
    const warehouses = fbaLogicalWarehouses(state, order, [connection, { ...connection, id: 'another' }]);
    expect(warehouses).toHaveLength(1);
    expect(warehouses[0]).toMatchObject({ id: 'fba:seller:US', connectionId: 'seller', site: 'US', name: 'Seller · US FBA 仓', enabled: true });
    expect(warehouses[0].stocks.map(stock => stock.id)).toEqual(['stock']);
    expect(state.fulfillments).toHaveLength(0);
    connection.authorized = false;
    expect(fbaLogicalWarehouses(state, order, [connection])[0].enabled).toBe(false);
    connection.authorized = true; connection.businesses.mcf!.status = 'paused';
    expect(fbaLogicalWarehouses(state, order, [connection])[0].enabled).toBe(false);
    connection.businesses.mcf!.site = 'CA';
    expect(fbaLogicalWarehouses(state, order, [connection])[0].enabled).toBe(false);
    state.fulfillmentWarehouses = [];
    expect(fbaLogicalWarehouses(state, order, [connection])).toEqual([]);
  });
  it('keeps a configured FBA warehouse visible without inventing missing inventory', () => {
    const { state, order, connection } = fixture(); state.stocks = [];
    expect(fbaLogicalWarehouses(state, order, [connection])[0].stocks).toEqual([]);
  });
  it('builds an Amazon allocation with the full proposal and exact line quantities, but no FC', () => {
    const { state, order, connection, quantities, proposal } = fixture();
    const before = structuredClone(state);
    const command = prepareMcfAllocation(state, order.id, connection, quantities, 'Standard', proposal, now + 1);
    expect(command).toEqual({ type: 'allocate', orderId: order.id, executor: 'amazon', warehouseId: '', connectionId: 'seller', site: 'US', proposal, lines: [{ lineId: 'line', quantity: 2 }] });
    expect(command.proposal).toBe(proposal);
    expect(state).toEqual(before);
    expect(JSON.stringify(command)).not.toMatch(/fulfillmentCenter/);
  });

  it.each(['quantity', 'service', 'account', 'site', 'authorization', 'business', 'missing account', 'address', 'stock', 'remaining'])('rejects stale or changed %s before submission', change => {
    const { state, order, connection, quantities, proposal, task } = fixture();
    if (change === 'quantity') quantities.line = 1;
    if (change === 'account') connection.id = 'other';
    if (change === 'site') connection.businesses.mcf!.site = 'CA';
    if (change === 'authorization') connection.authorized = false;
    if (change === 'business') connection.businesses.mcf!.status = 'paused';
    if (change === 'address') order.address!.address1 = 'Changed';
    if (change === 'stock') state.stocks[0].onHand--;
    if (change === 'remaining') state.fulfillments.push(task);
    expect(() => prepareMcfAllocation(state, order.id, change === 'missing account' ? undefined : connection, quantities,
      change === 'service' ? 'Expedited' : 'Standard', proposal, now + 1)).toThrow();
  });

  it('ignores zero rows but retains invalid nonzero values for domain validation', () => {
    const { order } = fixture();
    expect(mcfInputLines(order, { line: 0 })).toEqual([]);
    expect(mcfInputLines(order, { line: -1 })).toEqual([{ lineId: 'line', quantity: -1 }]);
    expect(mcfInputLines(order, { line: Number.NaN })[0].quantity).toBeNaN();
  });

  it.each(['allocated', 'picking', 'packed', 'withdraw_pending', 'unknown', 'shipped', 'delivered'] as const)('does not prefill or allocate from an unconfirmed %s source', status => {
    const { state, order, task } = fixture();
    task.status = status;
    expect(() => prefillMcfQuantities(state, order.id, task)).toThrow(/尚未确认撤回/);
    expect(state.fulfillments).toEqual([]);
  });

  it('prefills cancelled source quantities bounded by the latest remaining quantity', () => {
    const { state, order, task } = fixture();
    task.status = 'cancelled'; state.fulfillments.push(task);
    state.fulfillments.push({ ...task, id: 'other', executor: 'amazon', status: 'submitted', lines: [{ lineId: 'line', quantity: 5 }] });
    expect(prefillMcfQuantities(state, order.id, task)).toEqual({ line: 1 });
    state.fulfillments[1].lines[0].quantity = 6;
    expect(prefillMcfQuantities(state, order.id, task)).toEqual({ line: 0 });
  });

  it('rejects wrong source and closed orders even after withdrawal', () => {
    const { state, order, task } = fixture();
    task.status = 'cancelled';
    expect(() => prefillMcfQuantities(state, 'other', task)).toThrow();
    task.executor = 'amazon'; expect(() => prefillMcfQuantities(state, order.id, task)).toThrow();
    task.executor = 'warehouse'; order.archived = true;
    expect(() => prefillMcfQuantities(state, order.id, task)).toThrow(/关闭/);
  });

  it('displays the proposal currency and canonical minor-unit fee', () => {
    expect(formatMcfFee({ currency: 'USD', feeMinor: 1300 })).toBe('USD 13.00');
    expect(formatMcfFee({ currency: 'JPY', feeMinor: 1100 })).toBe('JPY 11.00');
  });
});
