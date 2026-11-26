import { describe, expect, it } from 'vitest';
import { defaultBusinessConfig, type Connection, type ProductMapping } from './amazon-connections';
import { mockProducts } from './mock-data/products';
import { buildMcfPreview, mcfFingerprint, mcfRequirements, resolveMcfMapping, resolveMcfPending, type McfOrder } from './mcf-workflow';

const variant = mockProducts[0].variants[0];
const mapping: ProductMapping = { externalSku: 'CHANNEL-1', omsVariantId: variant.id };
const connection: Connection = { id: 'seller-1', name: 'Seller', identity: 'seller', region: 'NA', accountId: 'A1', authorized: true, businesses: { sales: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' }, mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } };
const order: McfOrder = { id: 'order-1', connectionId: 'seller-1', reference: '114-1', source: 'Amazon', channel: 'MFN', sku: variant.sku, qty: 2, stage: 'ready', route: '', service: 'Standard', attempt: 0, fulfillmentId: '', carrier: '', tracking: '', shipmentConfirmed: false, site: 'US', shippingAddress: { name: 'Alex', phone: '', address1: '1201 3rd Ave', city: 'Seattle', province: 'WA', country: 'US', zip: '98101' }, history: ['received'] };
const check = (o = order, c = connection) => mcfRequirements(o, c, { sales: mapping, mcf: mapping }, true);

describe('MCF prerequisite checks', () => {
  it('accepts a mapped MFN order on the original seller/site', () => expect(check().every(r => r.ok)).toBe(true));
  it('explains every missing requirement with contextual repair links', () => {
    const c = { ...connection, authorized: false, businesses: { ...connection.businesses, mcf: { ...connection.businesses.mcf!, status: 'paused' as const, site: 'CA' } } };
    const missing = check(order, c).filter(r => !r.ok);
    expect(missing.map(r => r.id)).toEqual(expect.arrayContaining(['authorization', 'business', 'site']));
    for (const requirement of missing) { expect(requirement.href).toContain('order=order-1'); expect(requirement.href).toContain('seller-1'); }
  });
  it('blocks disabled writeback and excluded sources', () => {
    const settings = { receiveOrders: true, includeOpenOrders: true, readInventory: true, publishInventory: false, shipmentWriteback: false, receiveChanges: true, receiveExistingPlans: false, orderSources: [] as ('amazon' | 'other')[], notifyOnError: true };
    const c = { ...connection, businesses: { sales: { ...connection.businesses.sales!, syncSettings: settings }, mcf: { ...connection.businesses.mcf!, syncSettings: settings } } };
    expect(check(order, c).filter(r => !r.ok).map(r => r.id)).toEqual(['writeback', 'source']);
  });
  it.each(['own', 'own_withdraw_pending', 'submitting', 'created', 'processing', 'unknown', 'cancel_pending', 'shipped'] as const)('locks an existing %s task', stage => expect(check({ ...order, stage }).find(r => r.id === 'route')?.ok).toBe(false));
  it('reuses the confirmed order-line mapping even if the live mapping store is unavailable', () => {
    const confirmed = { ...order, itemMapping: mapping };
    expect(mcfRequirements(confirmed, connection, { error: 'mapping unavailable' }, true).find(requirement => requirement.id === 'mapping')?.ok).toBe(true);
    expect(mcfRequirements({ ...confirmed, source: 'Shopify' }, connection, {}, true).find(requirement => requirement.id === 'mapping')?.ok).toBe(false);
  });
  it('requires an accessible complete delivery address and refuses handed-over task withdrawal', () => {
    expect(check({ ...order, shippingAddress: undefined }).find(r => r.id === 'address')?.ok).toBe(false);
    expect(check({ ...order, addressAccess: 'restricted' }).find(r => r.id === 'address')?.ok).toBe(false);
    const handedOver: McfOrder = { ...order, stage: 'own_withdraw_pending', route: 'own', warehouseProgress: 'handed_over', pending: { kind: 'withdraw', requestedAt: 1, resolveAt: 2 } };
    expect(resolveMcfPending(handedOver, 10)).toBe(handedOver);
  });
  it('does not allow terminal or AFN records to reopen', () => {
    expect(check({ ...order, channel: 'AFN' }).find(r => r.id === 'eligibility')?.ok).toBe(false);
    expect(check({ ...order, tracking: 'existing' }).find(r => r.id === 'route')?.ok).toBe(false);
    expect(check({ ...order, shipmentConfirmed: true }).find(r => r.id === 'route')?.ok).toBe(false);
  });
  it('rejects a lingering own route even when a record says ready, and a site outside the seller region', () => {
    expect(check({ ...order, route: 'own' }).find(r => r.id === 'route')?.ok).toBe(false);
    const c = { ...connection, businesses: { sales: { ...connection.businesses.sales!, site: 'JP' }, mcf: { ...connection.businesses.mcf!, site: 'JP' } } };
    expect(check({ ...order, site: 'JP' }, c).find(r => r.id === 'site')?.ok).toBe(false);
  });
  it('requires a unique valid shared mapping and respects an invalid exact match', () => {
    expect(resolveMcfMapping(variant.sku, [mapping])).toEqual(mapping);
    expect(resolveMcfMapping(variant.sku, [mapping, { ...mapping, externalSku: 'CHANNEL-2' }])).toBeUndefined();
    expect(resolveMcfMapping(variant.sku, [mapping, { externalSku: variant.sku, omsVariantId: 'removed' }])).toBeUndefined();
  });
});
describe('MCF preview and persisted lifecycle', () => {
  it('calculates whole-order fees, currency and distinct delivery options', () => {
    const now = Date.parse('2026-11-02T12:00:00Z');
    const standard = buildMcfPreview(order, connection, mapping, 'Standard', now);
    const expedited = buildMcfPreview(order, connection, mapping, 'Expedited', now);
    expect(standard.fee).toBe(13); expect(standard.currency).toBe('USD'); expect(expedited.fee).toBe(19.6);
    expect(standard.deliveryTo > expedited.deliveryTo).toBe(true); expect(standard.expiresAt - now).toBe(600000);
    expect(standard.fingerprint).not.toBe(mcfFingerprint({ ...order, qty: 3 }, connection, mapping));
  });
  it('keeps submission processing separate from creation success, including after reload', () => {
    const pending: McfOrder = { ...order, stage: 'submitting', route: 'mcf', fulfillmentId: 'MCF-order-1-1', attempt: 1, pending: { kind: 'create', requestedAt: 1000, resolveAt: 3200 } };
    expect(resolveMcfPending(pending, 3000)).toBe(pending);
    const restored = JSON.parse(JSON.stringify(pending)) as McfOrder;
    const done = resolveMcfPending(restored, 4000);
    expect(done.stage).toBe('created'); expect(done.fulfillmentId).toBe(pending.fulfillmentId); expect(done.pending).toBeUndefined(); expect(done.tracking).toBe('');
    expect(resolveMcfPending(done, 5000)).toBe(done); expect(done.history).toHaveLength(2);
  });
  it('closes creation, processing, shipment, writeback retry and delivery without a second fulfillment', () => {
    let current: McfOrder = { ...order, stage: 'created', route: 'mcf', localCreatedAt: 1000, fulfillmentId: 'F1', fixtureWritebackFailure: true };
    current = resolveMcfPending(current, 4000);
    expect(current.stage).toBe('processing');
    current = resolveMcfPending(current, 8000);
    expect(current.stage).toBe('shipped');
    expect(current.package?.quantity).toBe(order.qty);
    const tracking = current.tracking;
    current = { ...current, writeback: { status: 'pending', attempts: 1, submittedAt: 8000 } };
    current = resolveMcfPending(current, 10000);
    expect(current.writeback?.status).toBe('failed');
    expect(current.fulfillmentId).toBe('F1');
    current = { ...current, writeback: { status: 'pending', attempts: 2, submittedAt: 10000 } };
    current = resolveMcfPending(current, 12000);
    expect(current.shipmentConfirmed).toBe(true);
    expect(current.tracking).toBe(tracking);
    current = resolveMcfPending(current, 25000);
    expect(current.package?.deliveryStatus).toBe('delivered');
    expect(current.fulfillmentId).toBe('F1');
  });
  it('retains the own route until withdrawal confirmation and preserves history', () => {
    const pending: McfOrder = { ...order, stage: 'own_withdraw_pending', route: 'own', warehouseId: 'warehouse-1', pending: { kind: 'withdraw', requestedAt: 1000, resolveAt: 3200 } };
    expect(resolveMcfPending(pending, 2000).route).toBe('own');
    const done = resolveMcfPending(pending, 4000);
    expect(done.stage).toBe('ready'); expect(done.route).toBe(''); expect(done.warehouseId).toBeUndefined(); expect(done.withdrawalConfirmedAt).toBe(4000); expect(done.history[0]).toBe('received');
  });
  it('does not fabricate success for unknown or legacy cancellation records', () => {
    for (const stage of ['unknown', 'cancel_pending'] as const) { const legacy = { ...order, stage, route: 'mcf' as const }; expect(resolveMcfPending(legacy, 99999999)).toBe(legacy); }
    const mismatched: McfOrder = { ...order, stage: 'unknown', pending: { kind: 'create', requestedAt: 0, resolveAt: 1 } };
    expect(resolveMcfPending(mismatched, 2)).toBe(mismatched);
  });
});
