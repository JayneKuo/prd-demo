import { describe, expect, it } from 'vitest';
import { emptySnapshot } from './types';
import { ensureCanonicalFixtures } from './fixtures';
import { projectOrderRow, projectOrderDetail } from './projections';
import { executeOmsCommand } from './commands';
import { queryMcfProposal } from './mcf-proposal';
import { defaultBusinessConfig, type Connection } from '@/lib/amazon-connections';
const scope = { tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' };
describe('canonical order projections', () => {
  it('preserves the original historical status rather than turning migration locks into new business states', () => {
    const state = emptySnapshot(scope);
    const order = { ...scope, id: 'old', revision: 0, number: 'OLD', sourceId: 'A1', source: 'Amazon', createdAt: '2026-06-01', currency: 'USD', paidMinor: 100, paymentStatus: '已支付', customer: 'Alex', address: null, lines: [], note: '', tags: [], migrationBlocked: 'missing allocations', legacyDetail: { status: '已发货', fulfillmentStatus: '已发货', totalPrice: '$1.00' } };
    const row = projectOrderRow(state, order, 'US Amazon');
    expect(row.status).toBe('已发货');
    expect(row.fulfillment).toBe('已发货');
  });
  it.each([
    { reference: '114-legacy', sku: 'WEP-BLK-001', qty: 4 },
    { status: '待处理', lineItems: undefined },
    { lineItems: {}, customer: null },
    { lineItems: [], shippingAddress: { name: 'Alex' } }
  ])('renders incomplete legacy archives without assuming a complete detail: %j', legacyDetail => {
    const state = ensureCanonicalFixtures(emptySnapshot(scope));
    const source = { ...state.orders[0], legacyDetail };
    const detail = projectOrderDetail(state, source, 'US Amazon');
    expect(detail.lineItems).toHaveLength(source.lines.length);
    expect(detail.lineItems[0].sku).toBe(source.lines[0].sku);
    expect(detail.customer.name).toBe(source.customer);
    expect(detail.fulfillments).toEqual([]);
    expect(detail.events).toEqual([]);
  });
  it('keeps incomplete blocked archives readable without bypassing canonical defaults', () => {
    const state = ensureCanonicalFixtures(emptySnapshot(scope));
    const source = { ...state.orders[0], migrationBlocked: '历史数据待核对', legacyDetail: { lineItems: [], shippingAddress: { name: 'Alex' } } };
    const detail = projectOrderDetail(state, source, 'US Amazon');
    expect(Array.isArray(detail.fulfillments)).toBe(true);
    expect(detail.customer.name).toBe(source.customer);
  });
  it('projects exact partial allocation and leaves unallocated quantities pending', () => {
    let state = ensureCanonicalFixtures(emptySnapshot(scope));
    const order = state.orders.find(order => order.id === 'amazon-order-1')!;
    const connection: Connection = { id: order.connectionId!, name: 'Seller', accountId: 'seller', identity: 'seller', region: 'NA', authorized: true, businesses: { mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } };
    const proposal = queryMcfProposal(state, order.id, connection, [{ lineId: order.lines[0].id, quantity: 2 }], 'Standard', 0);
    state = executeOmsCommand(state, { type: 'allocate', orderId: order.id, executor: 'amazon', warehouseId: '', connectionId: order.connectionId, site: 'US', lines: proposal.lines.map(({ lineId, quantity }) => ({ lineId, quantity })), proposal }, { id: 'part', now: 0, actor: 'ops', canWrite: true });
    const detail = projectOrderDetail(state, order, 'US Amazon');
    expect(detail.lineItems[0].fulfillmentNote).toContain('已分配 2');
    expect(detail.lineItems[1].fulfillmentStatus).toBe('未开始');
    expect(detail.fulfillmentStatus).toBe('处理中');
  });
});
