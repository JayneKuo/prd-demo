import { describe, expect, it } from 'vitest';
import { advanceOmsJobs, executeOmsCommand } from './commands';
import { emptySnapshot, type CommandContext, type OmsSnapshot } from './types';
import { mergeOutboundRows, mergeStockRows, projectOutboundRow, projectStockRow } from './outbound-projections';
import { applyOutboundFilters } from '@/features/outbound/filtering';

const scope = { tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' };
const now = Date.parse('2026-11-04T10:00:00Z');
const context = (id: string, offset = 0): CommandContext => ({ id, now: now + offset, actor: 'ops', canWrite: true });
function initial(): OmsSnapshot {
  const state = emptySnapshot(scope);
  state.orders.push({ ...scope, id: 'so:source', revision: 1, number: 'SO-EXACT', sourceId: 'AMZ-EXACT', source: 'Amazon', channelType: 'MFN', createdAt: new Date(now).toISOString(), currency: 'USD', paidMinor: null, paymentStatus: '已支付', customer: 'Alex', address: null, note: '', tags: [], lines: [{ id: 'line1', channelLineId: 'ch1', channelSku: 'AMZ-A', omsVariantId: 'v1', sku: 'SKU-A', title: 'Product A', quantity: 10, cancelled: 0, unit: '件', unitPriceMinor: null, mappingSnapshot: { channelSku: 'AMZ-A', omsVariantId: 'v1' } }] });
  state.stocks.push({ ...scope, id: 'stock1', revision: 1, warehouseId: 'wh_lax', sku: 'SKU-A', pool: 'warehouse', onHand: 20, reserved: 0, unfulfillable: 2 });
  return state;
}
function allocate() {
  return executeOmsCommand(initial(), { type: 'allocate', orderId: 'so:source', executor: 'warehouse', warehouseId: 'wh_lax', lines: [{ lineId: 'line1', quantity: 4 }] }, context('split'));
}

describe('canonical outbound and inventory projections', () => {
  it('uses exact split quantities and the existing outbound search and date filters', () => {
    const state = allocate();
    const row = projectOutboundRow(state, state.outbounds[0], 'US Amazon');
    expect(row).toMatchObject({ id: 'ob:split', sourceNo: 'SO-EXACT', channelOrderNo: 'AMZ-EXACT', totalQty: 4, itemsDetail: ['SKU-A × 4'], status: '待出库', wmsStatus: '待拣货', warehouse: 'US-West-LAX' });
    expect(applyOutboundFilters([row], { searchType: 'sourceNo', batchValues: ['SO-EXACT'], warehouse: 'US-West-LAX', carrier: '', outboundStatus: '待出库', outboundType: '销售出库', startDate: '2026-11-04', endDate: '2026-11-04' })).toEqual([row]);
    expect(projectStockRow(state, state.stocks[0], 'US Amazon')).toMatchObject({ available: '14', reserved: '4' });
  });
  it('reflects global picking/packing and dispatch without changing or resetting stock in projections', () => {
    let state = allocate();
    state = advanceOmsJobs(state, now + 2000);
    expect(projectOutboundRow(state, state.outbounds[0], 'US Amazon').wmsStatus).toBe('拣货中');
    state = advanceOmsJobs(state, now + 4000);
    expect(projectOutboundRow(state, state.outbounds[0], 'US Amazon').wmsStatus).toBe('已打包');
    state = executeOmsCommand(state, { type: 'dispatch', fulfillmentId: state.fulfillments[0].id, carrier: 'UPS', tracking: '1Z-EXACT' }, context('dispatch', 5000));
    const before = structuredClone(state);
    expect(projectOutboundRow(state, state.outbounds[0], 'US Amazon')).toMatchObject({ totalQty: 4, status: '已出库', carrier: 'UPS', trackingNo: '1Z-EXACT' });
    expect(projectStockRow(state, state.stocks[0], 'US Amazon')).toMatchObject({ available: '14', reserved: '0' });
    expect(state.stocks[0].onHand).toBe(16);
    expect(state).toEqual(before);
  });
  it('reflects confirmed withdrawal across fulfillment, outbound and inventory', () => {
    let state = allocate();
    state = executeOmsCommand(state, { type: 'withdraw', fulfillmentId: state.fulfillments[0].id }, context('withdraw', 100));
    expect(projectOutboundRow(state, state.outbounds[0], 'US Amazon').wmsStatus).toBe('撤回中');
    expect(projectStockRow(state, state.stocks[0], 'US Amazon').reserved).toBe('4');
    state = advanceOmsJobs(state, now + 2000);
    expect(state.fulfillments[0].status).toBe('cancelled');
    expect(projectOutboundRow(state, state.outbounds[0], 'US Amazon').status).toBe('已取消');
    expect(projectStockRow(state, state.stocks[0], 'US Amazon')).toMatchObject({ available: '18', reserved: '0' });
  });
  it('keeps unrelated historical rows but replaces represented canonical records', () => {
    const state = allocate();
    const outbound = projectOutboundRow(state, state.outbounds[0], 'US Amazon');
    expect(mergeOutboundRows([{ ...outbound, id: 'ob_old' }, { ...outbound, id: 'ob_other', outboundNo: 'OB-OTHER' }], [outbound]).map(row => row.id)).toEqual(['ob:split', 'ob_other']);
    const stock = projectStockRow(state, state.stocks[0], 'US Amazon');
    expect(mergeStockRows([{ ...stock, id: 'legacy' }, { ...stock, id: 'other', merchant: 'US Store' }], [stock]).map(row => row.id)).toEqual([stock.id, 'other']);
  });
});
