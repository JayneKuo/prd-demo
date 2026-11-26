import { describe, expect, it } from 'vitest';
import { defaultBusinessConfig, type Connection } from '@/lib/amazon-connections';
import { advanceOmsJobs, availableToAllocate, executeOmsCommand, type OmsCommand } from './commands';
import { queryMcfProposal } from './mcf-proposal';
import { emptySnapshot, type OmsSnapshot, type SalesOrder } from './types';

const scope = { tenantId: 't', companyId: 'c', merchantId: 'm' };
const connection: Connection = { id: 'seller', name: 'Seller', accountId: 'seller', region: 'NA', identity: 'seller', authorized: true, businesses: { mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } };
const context = (id: string, now = 0) => ({ id, now, actor: 'ops', canWrite: true });
function initial() {
  const state = emptySnapshot(scope);
  const order: SalesOrder = { ...scope, id: 'order', revision: 1, number: 'SO-1', sourceId: 'AMZ-1', source: 'Amazon', channelType: 'MFN', connectionId: 'seller', site: 'US', createdAt: new Date(0).toISOString(), currency: 'USD', paidMinor: 10000, paymentStatus: '已支付', customer: 'Customer', address: { name: 'Customer', phone: '+1 2065550123', address1: '1201 3rd Ave', city: 'Seattle', province: 'WA', zip: '98101', country: 'US' }, note: '', tags: [], lines: [{ id: 'line', channelLineId: 'amazon-line', channelSku: 'SELLER-A', omsVariantId: 'variant', sku: 'OMS-A', title: 'Product', quantity: 6, cancelled: 0, unit: '件', unitPriceMinor: 1000, mappingSnapshot: { channelSku: 'SELLER-A', omsVariantId: 'variant' } }] };
  state.orders.push(order);
  state.stocks.push({ ...scope, id: 'warehouse', revision: 1, warehouseId: 'wh', pool: 'warehouse', sku: 'OMS-A', onHand: 20, reserved: 0, unfulfillable: 0 }, { ...scope, id: 'fba', revision: 1, warehouseId: '', pool: 'fba', connectionId: 'seller', site: 'US', sku: 'OMS-A', onHand: 30, reserved: 0, unfulfillable: 2 });
  return state;
}
const warehouse = (quantity: number): OmsCommand => ({ type: 'allocate', orderId: 'order', executor: 'warehouse', warehouseId: 'wh', lines: [{ lineId: 'line', quantity }] });
function mcf(state: OmsSnapshot, quantity: number, now: number): Extract<OmsCommand, { type: 'allocate' }> {
  const proposal = queryMcfProposal(state, 'order', connection, [{ lineId: 'line', quantity }], 'Expedited', now);
  return { type: 'allocate', orderId: 'order', executor: 'amazon', warehouseId: '', connectionId: 'seller', site: 'US', lines: proposal.lines.map(({ lineId, quantity }) => ({ lineId, quantity })), proposal };
}

describe('FBM warehouse and MCF execution', () => {
  it('creates an OMS outbound first and only hands it to the APP after explicit submission using the bound warehouse', () => {
    let state = initial();
    const binding = { id: 'bound-fba', code: 'FBA-US', name: 'US Amazon warehouse', app: 'amazon' as const, capability: 'mcf' as const, connectionId: 'seller', site: 'US', active: true };
    state = executeOmsCommand(state, { type: 'bind_mcf_warehouse', warehouse: binding }, context('bind'));
    const command = { ...mcf(state, 2, 10), warehouseId: binding.id };
    state = executeOmsCommand(state, command, context('create', 10));
    expect(state.fulfillments[0].status).toBe('allocated');
    expect(state.outbounds[0]).toMatchObject({ warehouseId: binding.id, fulfillmentId: 'ful:create', status: 'waiting' });
    expect(state.jobs.filter(job => job.kind === 'amazon_create')).toHaveLength(0);
    expect(advanceOmsJobs(state, 1000)).toBe(state);
    state = executeOmsCommand(JSON.parse(JSON.stringify(state)), { type: 'submit_mcf_outbound', outboundId: state.outbounds[0].id }, context('submit', 86400000));
    expect(state.fulfillments[0].status).toBe('submitted');
    expect(() => executeOmsCommand(state, { type: 'submit_mcf_outbound', outboundId: state.outbounds[0].id }, context('duplicate', 1100))).toThrow();
    state = advanceOmsJobs(state, 86430000);
    expect(state.outbounds[0].status).toBe('shipped');
    expect(state.packages[0].fulfillmentId).toBe('ful:create');
    expect(state.stocks[1].onHand).toBe(28);
    expect(() => executeOmsCommand(state, { type: 'bind_mcf_warehouse', warehouse: { ...binding, connectionId: 'other' } }, context('rebind', 30001))).toThrow(/不可更换/);
  });
  it('fulfills part from own warehouse and the remainder from MCF with isolated stock and original package writeback', () => {
    let state = executeOmsCommand(initial(), warehouse(2), context('own'));
    state = executeOmsCommand(state, mcf(state, 4, 100), context('mcf', 100));
    expect(availableToAllocate(state, 'order', 'line')).toBe(0);
    expect(state.stocks.map(stock => stock.reserved)).toEqual([2, 4]);
    expect(state.outbounds).toHaveLength(2);
    const task = state.fulfillments[1];
    expect(task.mcf?.request).toMatchObject({ shippingSpeedCategory: 'Expedited', items: [{ sellerSku: 'SELLER-A', quantity: 4 }] });
    expect(task.mcf?.proposal.feeMinor).toBe(3800);
    expect(task.providerReference).toBe(task.mcf?.request.sellerFulfillmentOrderId);
    state = advanceOmsJobs(state, 3100);
    state = executeOmsCommand(state, { type: 'dispatch', fulfillmentId: 'ful:own', carrier: 'UPS', tracking: '1Z-own' }, context('dispatch', 3200));
    state = advanceOmsJobs(JSON.parse(JSON.stringify(state)), 25000);
    expect(state.packages).toHaveLength(2);
    expect(state.packages.every(pack => pack.confirmation === 'confirmed' && !!pack.deliveredAt)).toBe(true);
    expect(state.packages.reduce((sum, pack) => sum + pack.lines[0].quantity, 0)).toBe(6);
    expect(state.stocks.map(stock => [stock.onHand, stock.reserved])).toEqual([[18, 0], [26, 0]]);
    expect(state.fulfillments[1].providerReference).toBe(task.providerReference);
    expect(advanceOmsJobs(state, 50000)).toBe(state);
  });

  it('requires confirmed withdrawal before converting a full warehouse task to MCF and survives reload', () => {
    let state = executeOmsCommand(initial(), warehouse(6), context('own'));
    state = executeOmsCommand(state, { type: 'withdraw', fulfillmentId: 'ful:own' }, context('withdraw', 100));
    expect(state.stocks[0].reserved).toBe(6);
    expect(() => mcf(state, 6, 200)).toThrow(/剩余/);
    expect(() => executeOmsCommand(state, { type: 'dispatch', fulfillmentId: 'ful:own', carrier: 'UPS', tracking: '1Z' }, context('race', 200))).toThrow();
    state = advanceOmsJobs(JSON.parse(JSON.stringify(state)), 2000);
    expect(state.outbounds[0].status).toBe('cancelled');
    expect(state.stocks[0]).toMatchObject({ onHand: 20, reserved: 0 });
    const command = mcf(state, 6, 2100);
    state = executeOmsCommand(state, command, context('replacement', 2100));
    expect(executeOmsCommand(state, command, context('replacement', 2100))).toBe(state);
    state = advanceOmsJobs(state, 30000);
    expect(state.packages).toHaveLength(1);
    expect(state.stocks.map(stock => stock.onHand)).toEqual([20, 24]);
    expect(state.movements.filter(movement => movement.kind === 'release')).toHaveLength(1);
    expect(state.movements.filter(movement => movement.kind === 'ship')).toHaveLength(1);
    expect(() => executeOmsCommand(state, { type: 'withdraw', fulfillmentId: 'ful:replacement' }, context('late', 30001))).toThrow();
  });

  it('rejects missing, mismatched, expired and stale proposals atomically', () => {
    const state = initial();
    const command = mcf(state, 2, 0);
    const before = structuredClone(state);
    expect(() => executeOmsCommand(state, { ...command, proposal: undefined }, context('missing'))).toThrow(/方案/);
    expect(() => executeOmsCommand(state, { ...command, lines: [{ lineId: 'line', quantity: 3 }] }, context('changed'))).toThrow(/不一致/);
    expect(() => executeOmsCommand(state, { ...command, warehouseId: 'fc' }, context('fc'))).toThrow(/绑定/);
    expect(() => executeOmsCommand(state, command, context('delayed', 86400000))).not.toThrow();
    expect(state).toEqual(before);
    const changed = structuredClone(state); changed.orders[0].address!.zip = '98102';
    expect(() => executeOmsCommand(changed, command, context('address'))).toThrow(/变化/);
    expect(changed.stocks.every(stock => stock.reserved === 0)).toBe(true);
  });

  it('does not allow manual dispatch of a platform MCF task', () => {
    let state = initial(); state = executeOmsCommand(state, mcf(state, 1, 0), context('mcf'));
    state.fulfillments[0].status = 'packed';
    expect(() => executeOmsCommand(state, { type: 'dispatch', fulfillmentId: 'ful:mcf', carrier: 'UPS', tracking: '1Z' }, context('manual'))).toThrow(/不能手动发货/);
    expect(state.stocks[1].reserved).toBe(1);
    expect(state.packages).toHaveLength(0);
  });
});
