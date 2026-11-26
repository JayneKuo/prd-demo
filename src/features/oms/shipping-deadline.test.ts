import { describe, expect, it } from 'vitest';
import { emptySnapshot } from './types';
import { ensureCanonicalFixtures, ensureShippingDeadlineExamples } from './fixtures';
import { shippingDeadline } from './shipping-deadline';
const now = Date.parse('2026-11-06T00:00:00Z');
function fixture() { const state = ensureCanonicalFixtures(emptySnapshot({ tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' })); const order = state.orders[0]; order.shipBy = new Date(now + 3600000).toISOString(); return { state, order }; }
describe('Amazon shipping deadlines', () => {
  it('distinguishes upcoming, due soon, overdue and missing deadlines', () => {
    const { state, order } = fixture();
    expect(shippingDeadline(state, order, now).status).toBe('due_soon');
    expect(shippingDeadline(state, order, now - 86400000).status).toBe('pending');
    expect(shippingDeadline(state, order, now + 3600000).status).toBe('overdue');
    order.shipBy = undefined; expect(shippingDeadline(state, order, now).status).toBe('missing');
  });
  it('keeps partially shipped orders overdue and assesses full shipment by actual times', () => {
    const { state, order } = fixture();
    const pack = { ...order, id: 'pack', fulfillmentId: 'ful', orderId: order.id, number: 'PKG', carrier: 'UPS', tracking: 'T', lines: [{ lineId: order.lines[0].id, quantity: 2 }], shippedAt: new Date(now).toISOString(), confirmation: 'pending' as const };
    state.packages.push(pack);
    expect(shippingDeadline(state, order, now + 7200000).status).toBe('overdue');
    pack.lines = order.lines.map(line => ({ lineId: line.id, quantity: line.quantity }));
    expect(shippingDeadline(state, order, now + 7200000).status).toBe('shipped_on_time');
    pack.shippedAt = new Date(now + 7200000).toISOString();
    expect(shippingDeadline(state, order, now + 7200000).status).toBe('shipped_late');
  });
  it('does not double count a Shipment and its compatible Package', () => {
    const { state, order } = fixture(); const lines = [{ lineId: order.lines[0].id, quantity: 2 }];
    order.lines = [order.lines[0]];
    state.packages.push({ ...order, id: 'pack', fulfillmentId: 'ful', orderId: order.id, number: 'PKG', carrier: 'UPS', tracking: 'T', lines, shippedAt: new Date(now).toISOString(), confirmation: 'pending' });
    state.shipments.push({ ...order, id: 'shipment', outboundId: 'ob', fulfillmentId: 'ful', orderId: order.id, provider: 'warehouse', providerPackageId: 'pack', status: 'in_transit', carrier: 'UPS', trackingNumber: 'T', lines, shippedAt: new Date(now).toISOString(), confirmation: 'pending' });
    expect(shippingDeadline(state, order, now + 7200000).status).toBe('overdue');
  });
  it('does not extend demo deadlines on refresh', () => {
    const { state } = fixture(); state.orders[0].shipBy = undefined;
    const seeded = ensureShippingDeadlineExamples(state, now);
    expect(seeded.orders[0].shipDeadlineSource).toBe('demo');
    expect(ensureShippingDeadlineExamples(seeded, now + 86400000)).toBe(seeded);
  });
});
