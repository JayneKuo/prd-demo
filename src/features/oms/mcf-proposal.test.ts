import { describe, expect, it } from 'vitest';
import { defaultBusinessConfig, type Connection } from '@/lib/amazon-connections';
import { emptySnapshot, type SalesOrder } from './types';
import { buildMcfCreatePayload, getPreviewPayload, queryMcfProposal, validateMcfProposal } from './mcf-proposal';

const now = Date.parse('2026-11-05T08:00:00Z');
function fixture() {
  const scope = { tenantId: 'tenant', companyId: 'company', merchantId: 'merchant' };
  const state = emptySnapshot(scope);
  const order: SalesOrder = { ...scope, revision: 1, id: 'order', number: 'SO-123', sourceId: 'amazon-123', source: 'Amazon', connectionId: 'seller', site: 'US', channelType: 'MFN', createdAt: '2026-11-04T08:00:00Z', currency: 'USD', paidMinor: 1000, paymentStatus: '已支付', customer: 'Alex', address: { name: 'Alex', phone: '+1 2065550123', address1: '1201 3rd Ave', city: 'Seattle', province: 'WA', zip: '98101', country: 'US' }, note: '', tags: [], lines: [{ id: 'line-1', channelLineId: 'amazon-line-1', channelSku: 'SELLER-SKU', omsVariantId: 'variant', sku: 'OMS-SKU', title: 'Product', quantity: 6, cancelled: 0, unit: '件', unitPriceMinor: 100, mappingSnapshot: { channelSku: 'SELLER-SKU', omsVariantId: 'variant' } }] };
  state.orders.push(order);
  state.stocks.push({ ...scope, revision: 1, id: 'stock', warehouseId: '', pool: 'fba', connectionId: 'seller', site: 'US', sku: 'OMS-SKU', onHand: 20, reserved: 2, unfulfillable: 1 });
  const connection: Connection = { id: 'seller', name: 'Seller', accountId: 'account', region: 'NA', identity: 'seller', authorized: true, businesses: { mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } };
  const lines = [{ lineId: 'line-1', quantity: 2 }];
  return { state, order, connection, lines };
}

describe('canonical MCF proposals', () => {
  it.each(['Shopify', 'manual'])('supports %s using selected Amazon account mappings, never the original channel SKU', source => {
    const { state, order, connection, lines } = fixture();
    order.source = source; order.connectionId = 'shopify-connection'; order.site = undefined;
    connection.businesses.mcf!.productMappings = [{ externalSku: 'FBA-SELLER-SKU', omsVariantId: 'variant' }];
    const proposal = queryMcfProposal(state, order.id, connection, lines, 'Standard', now);
    expect(proposal.connectionId).toBe('seller'); expect(proposal.site).toBe('US');
    expect(proposal.lines[0].externalSku).toBe('FBA-SELLER-SKU');
    expect(() => validateMcfProposal(state, proposal, now)).not.toThrow();
    expect(buildMcfCreatePayload(state, proposal, 'ful').items[0].sellerSku).toBe('FBA-SELLER-SKU');
    connection.businesses.mcf!.productMappings = [];
    expect(() => queryMcfProposal(state, order.id, connection, lines, 'Standard', now)).toThrow(/对应关系/);
  });
  it('queries partial quantity without reserving stock or creating any records; JSON round trips', () => {
    const { state, connection, lines } = fixture();
    const before = structuredClone(state);
    const proposal = queryMcfProposal(state, 'order', connection, lines, 'Standard', now);
    expect(state).toEqual(before);
    expect(proposal.lines).toEqual([{ lineId: 'line-1', quantity: 2, externalSku: 'SELLER-SKU', channelSku: 'SELLER-SKU', mappingSnapshot: { channelSku: 'SELLER-SKU', omsVariantId: 'variant' } }]);
    expect(proposal).toMatchObject({ currency: 'USD', feeMinor: 1300, expiresAt: now + 600000 });
    expect(() => validateMcfProposal(state, JSON.parse(JSON.stringify(proposal)), now + 1)).not.toThrow();
    expect(proposal).toEqual(queryMcfProposal(state, 'order', connection, lines, 'Standard', now));
  });

  it('does not require a new mapping configuration; never substitutes an OMS SKU for missing Seller SKU', () => {
    const { state, order, connection, lines } = fixture();
    connection.businesses.mcf!.productMappings = [];
    connection.businesses.mcf!.mappingConfirmed = false;
    expect(queryMcfProposal(state, order.id, connection, lines, 'Standard', now).lines[0].externalSku).toBe('SELLER-SKU');
    order.lines[0].channelSku = '';
    expect(() => queryMcfProposal(state, order.id, connection, lines, 'Standard', now)).toThrow(/Seller SKU/);
  });

  it.each(['vendor_df', 'internal_transfer'])('rejects internal source %s even with product mappings', source => {
    const { state, order, connection, lines } = fixture();
    order.source = source;
    connection.businesses.mcf!.productMappings = [{ externalSku: 'OTHER', omsVariantId: 'variant' }];
    expect(() => queryMcfProposal(state, order.id, connection, lines, 'Standard', now)).toThrow(/该来源/);
  });

  it('checks MFN, complete address, authorization, source settings, original account and site', () => {
    const { state, order, connection, lines } = fixture();
    const query = () => queryMcfProposal(state, order.id, connection, lines, 'Standard', now);
    order.channelType = 'AFN'; expect(query).toThrow(/AFN/); order.channelType = 'MFN';
    order.address!.city = ''; expect(query).toThrow(/城市/); order.address!.city = 'Seattle';
    connection.authorized = false; expect(query).toThrow(/授权/); connection.authorized = true;
    connection.identity = 'vendor'; expect(query).toThrow(/Seller/); connection.identity = 'seller';
    connection.businesses.mcf!.status = 'paused'; expect(query).toThrow(/未启用/); connection.businesses.mcf!.status = 'enabled';
    connection.id = 'different'; expect(query).toThrow(/原始账号/); connection.id = 'seller';
    connection.businesses.mcf!.site = 'CA'; expect(query).toThrow(/相同站点/); connection.businesses.mcf!.site = 'US';
    connection.businesses.mcf!.syncSettings = { receiveOrders: true, includeOpenOrders: true, readInventory: true, publishInventory: false, shipmentWriteback: true, receiveChanges: true, receiveExistingPlans: false, orderSources: ['other'], notifyOnError: true };
    expect(query).toThrow(/订单来源/);
  });

  it('enforces remaining quantity and sums stock demand for different lines with the same SKU', () => {
    const { state, order, connection } = fixture();
    order.lines.push({ ...structuredClone(order.lines[0]), id: 'line-2' });
    const query = (quantity: number) => queryMcfProposal(state, order.id, connection, [{ lineId: 'line-1', quantity }, { lineId: 'line-2', quantity }], 'Standard', now);
    state.stocks[0].onHand = 6;
    expect(() => query(2)).toThrow(/库存不足/);
    state.stocks[0].onHand = 100;
    expect(() => query(7)).toThrow(/剩余/);
    order.lines[0].cancelled = 5;
    expect(() => query(2)).toThrow(/剩余/);
    expect(() => query(0)).toThrow(/正整数/);
    expect(() => query(1.5)).toThrow(/正整数/);
  });

  it.each(['address', 'source line', 'remaining', 'stock', 'mapping'])('invalidates a proposal when relevant %s changes', change => {
    const { state, order, connection, lines } = fixture();
    const proposal = queryMcfProposal(state, order.id, connection, lines, 'Standard', now);
    if (change === 'address') order.address!.address1 = '200 Main St';
    if (change === 'source line') order.lines[0].quantity++;
    if (change === 'remaining') state.fulfillments.push({ tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, id: 'task', revision: 1, orderId: order.id, number: 'FO-1', executor: 'amazon', warehouseId: '', lines: [{ lineId: 'line-1', quantity: 1 }], status: 'submitted', reservations: [], submittedAt: new Date(now).toISOString() });
    if (change === 'stock') state.stocks[0].reserved++;
    if (change === 'mapping') order.lines[0].mappingSnapshot!.channelSku = 'changed';
    expect(() => validateMcfProposal(state, proposal, now + 1)).toThrow(/变化|剩余|库存/);
  });

  it('excludes unrelated revisions, notes, jobs, and other stock pools from staleness', () => {
    const { state, order, connection, lines } = fixture();
    const proposal = queryMcfProposal(state, order.id, connection, lines, 'Standard', now);
    state.revision++; order.revision++; order.note = 'internal note'; state.stocks[0].revision++;
    state.stocks.push({ ...state.stocks[0], id: 'unrelated', sku: 'OTHER', onHand: 200 });
    state.jobs.push({ id: 'other', kind: 'writeback', targetId: 'other', dueAt: now, status: 'queued', attempts: 0, causationId: 'other' });
    expect(() => validateMcfProposal(state, proposal, now + 1)).not.toThrow();
  });

  it('does not expire local estimates with time, but rejects altered fee, service, identity, and Seller SKU', () => {
    const { state, connection, lines } = fixture();
    const proposal = queryMcfProposal(state, 'order', connection, lines, 'Standard', now);
    expect(() => validateMcfProposal(state, proposal, proposal.expiresAt + 7 * 86400000)).not.toThrow();
    for (const altered of [{ ...proposal, feeMinor: 1 }, { ...proposal, connectionId: 'other' }, { ...proposal, service: 'Expedited' as const }, { ...proposal, lines: [{ ...proposal.lines[0], externalSku: 'FORGED' }] }]) {
      expect(() => validateMcfProposal(state, altered, now)).toThrow(/变化/);
    }
  });

  it('uses per-site fee currency and delivery estimates', () => {
    const { state, order, connection, lines } = fixture();
    order.site = 'JP'; order.address!.country = 'JP'; connection.region = 'FE'; connection.businesses.mcf!.site = 'JP'; state.stocks[0].site = 'JP';
    const standard = queryMcfProposal(state, order.id, connection, lines, 'Standard', now);
    const expedited = queryMcfProposal(state, order.id, connection, lines, 'Expedited', now);
    expect(standard).toMatchObject({ currency: 'JPY', feeMinor: 1100 });
    expect(expedited).toMatchObject({ currency: 'JPY', feeMinor: 1700 });
    expect(Date.parse(expedited.arrivalTo)).toBeLessThan(Date.parse(standard.arrivalTo));
  });

  it('builds bounded deterministic API IDs with unique items for repeated SKU, and no FC/warehouse fields', () => {
    const { state, order, connection } = fixture();
    order.number = 'long-order-number:'.repeat(100);
    order.lines.push({ ...structuredClone(order.lines[0]), id: 'line-2' });
    const proposal = queryMcfProposal(state, order.id, connection, [{ lineId: 'line-2', quantity: 1 }, { lineId: 'line-1', quantity: 2 }], 'Standard', now);
    const fulfillmentId = 'canonical-fulfillment-id:'.repeat(100);
    const payload = buildMcfCreatePayload(state, proposal, fulfillmentId);
    expect(payload).toEqual(buildMcfCreatePayload(state, proposal, fulfillmentId));
    expect(payload.sellerFulfillmentOrderId.length).toBeLessThanOrEqual(40);
    expect(payload.displayableOrderId.length).toBeLessThanOrEqual(40);
    expect(payload.sellerFulfillmentOrderId).not.toBe(buildMcfCreatePayload(state, proposal, fulfillmentId + '-2').sellerFulfillmentOrderId);
    expect(new Set(payload.items.map(item => item.sellerFulfillmentOrderItemId)).size).toBe(2);
    expect(payload.items.every(item => item.sellerFulfillmentOrderItemId.length <= 50 && item.sellerSku === 'SELLER-SKU')).toBe(true);
    expect(payload.destinationAddress).toMatchObject({ name: 'Alex', countryCode: 'US', addressLine1: '1201 3rd Ave' });
    expect(payload.displayableOrderDateTime).toBe('2026-11-04T08:00:00.000Z');
    expect(payload.displayableOrderComment).toBeTruthy();
    expect(Object.keys(payload).sort()).toEqual(['destinationAddress', 'displayableOrderComment', 'displayableOrderDateTime', 'displayableOrderId', 'items', 'sellerFulfillmentOrderId', 'shippingSpeedCategory'].sort());
    expect(JSON.stringify(payload)).not.toMatch(/warehouse|fulfillmentCenter|\bFC\b/);
    expect(getPreviewPayload(state, proposal).items).toEqual(payload.items);
  });

  it('enforces official create item/unit and Seller SKU limits', () => {
    const { state, order, connection } = fixture();
    order.lines[0].quantity = 300; state.stocks[0].onHand = 1000;
    expect(() => queryMcfProposal(state, order.id, connection, [{ lineId: 'line-1', quantity: 251 }], 'Standard', now)).toThrow(/250/);
    order.lines = Array.from({ length: 101 }, (_, index) => ({ ...order.lines[0], id: `line-${index}` }));
    expect(() => queryMcfProposal(state, order.id, connection, order.lines.map(line => ({ lineId: line.id, quantity: 1 })), 'Standard', now)).toThrow(/100/);
    order.lines[0].channelSku = 's'.repeat(51);
    expect(() => queryMcfProposal(state, order.id, connection, [{ lineId: order.lines[0].id, quantity: 1 }], 'Standard', now)).toThrow(/Seller SKU/);
  });
});
