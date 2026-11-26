import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultBusinessConfig, type Connection } from '@/lib/amazon-connections';
import { queryMcfProposal } from './mcf-proposal';
import { checkConnectionCommand } from './connection-gates';
import { emptySnapshot } from './types';
import { ensureCanonicalFixtures } from './fixtures';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('execution domain gates', () => {
  it('rechecks live Seller authorization, source settings and site before committing a previewed MCF request', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-05T08:00:00Z'));
    const state = ensureCanonicalFixtures(emptySnapshot({ tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' }));
    const order = state.orders.find(order => order.id === 'amazon-order-1')!;
    const connection: Connection = { id: order.connectionId!, name: 'Seller', accountId: 'seller', identity: 'seller', region: 'NA', authorized: true, businesses: { mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } };
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ connections: [connection] }) });
    const proposal = queryMcfProposal(state, order.id, connection, [{ lineId: order.lines[0].id, quantity: 2 }], 'Standard', Date.now());
    const command = { type: 'allocate' as const, orderId: order.id, executor: 'amazon' as const, warehouseId: '', connectionId: connection.id, site: 'US', lines: proposal.lines.map(({ lineId, quantity }) => ({ lineId, quantity })), proposal };
    expect(() => checkConnectionCommand(state, command)).not.toThrow();
    connection.authorized = false; expect(() => checkConnectionCommand(state, command)).toThrow(/授权/); connection.authorized = true;
    connection.businesses.mcf!.status = 'paused'; expect(() => checkConnectionCommand(state, command)).toThrow(/暂停/); connection.businesses.mcf!.status = 'enabled';
    connection.identity = 'vendor'; expect(() => checkConnectionCommand(state, command)).toThrow(/Seller|业务配置数据无效/); connection.identity = 'seller';
    connection.businesses.mcf!.site = 'CA'; expect(() => checkConnectionCommand(state, command)).toThrow(/站点/); connection.businesses.mcf!.site = 'US';
    vi.setSystemTime(proposal.expiresAt + 86400000); expect(() => checkConnectionCommand(state, command)).not.toThrow();
  });
  it('does not apply FBA appointment checks to an ordinary customer shipment', () => {
    const state = ensureCanonicalFixtures(emptySnapshot({ tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' }));
    state.fulfillments.push({ tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, revision: 1, id: 'warehouse-task', number: 'F1', orderId: 'amazon-order-1', executor: 'warehouse', warehouseId: 'wh_lax', lines: [{ lineId: 'amazon-order-1:line:1', quantity: 1 }], status: 'packed', reservations: [], submittedAt: new Date(0).toISOString() });
    expect(() => checkConnectionCommand(state, { type: 'dispatch', fulfillmentId: 'warehouse-task', carrier: 'UPS', tracking: '1Z1' })).not.toThrow();
  });
});
