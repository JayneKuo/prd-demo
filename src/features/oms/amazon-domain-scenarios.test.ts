import { describe, expect, it, vi } from 'vitest';
import { assertOmsInvariants, availableToAllocate } from './commands';
import { ensureAmazonDomainScenarios, scenarioCatalog } from './amazon-domain-scenarios';
import { assertFbaAddons } from './fba';
import { emptySnapshot } from './types';
import { assertVendorInvariants, ensureVendorFixtures } from './vendor';

const scope = { tenantId: 'tenant_demo', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' };
const id = (name: string) => `amz-scenario-v1:${name}`;

describe('append-only Amazon domain scenarios', () => {
  it('constructs independent actionable states through canonical linked records', () => {
    const state = ensureAmazonDomainScenarios(emptySnapshot(scope));
    expect(scenarioCatalog).toHaveLength(9);
    expect(state.vendorOrders).toHaveLength(6);
    expect(state.inboundPlans).toHaveLength(3);
    const partial = state.vendorOrders!.find(row => row.id === id('vendor-partial'))!;
    expect(partial.status).toBe('pending');
    expect(partial.lines).toHaveLength(2);
    expect(availableToAllocate(state, partial.salesOrderId, partial.lines[0].id)).toBe(0);
    const deferred = state.vendorOrders!.find(row => row.id === id('vendor-deferred'))!;
    expect(deferred.acknowledgement?.status).toBe('completed');
    expect(deferred.lines.every(line => line.accepted === 2 && line.backorder === line.ordered - 2)).toBe(true);
    for (const line of deferred.lines) expect(availableToAllocate(state, deferred.salesOrderId, line.id)).toBe(2);
    const collect = state.vendorBatches!.find(row => row.purchaseOrderId === id('vendor-collect'))!;
    expect(collect.status).toBe('routed'); expect(collect.routingRef).not.toBe(''); expect(collect.asn).toBe('');
    const df = state.vendorBatches!.find(row => row.purchaseOrderId === id('df-label'))!;
    expect(df.artifacts).toBeUndefined(); expect(df.warehouseId).toBe('wh_lax');
    for (const batch of [collect, df]) {
      const task = state.fulfillments.find(row => row.id === batch.fulfillmentId)!;
      expect(task.status).toBe('packed'); expect(task.reservations).toHaveLength(2);
      expect(state.outbounds.find(row => row.id === task.outboundId)?.status).toBe('packed');
    }
    const [draft, packed, split] = state.inboundPlans!;
    expect(draft).toMatchObject({ status: 'draft', containers: [], shipmentIds: [] });
    expect(packed.status).toBe('packed'); expect(packed.placements).toHaveLength(2); expect(packed.placementId).toBeUndefined();
    expect(split).toMatchObject({ status: 'confirmed', transport: 'SPD' }); expect(split.shipmentIds).toHaveLength(2);
    for (const shipment of state.inboundShipments!) {
      expect(shipment.status).toBe('working');
      expect(state.fulfillments.find(row => row.id === shipment.fulfillmentId)?.status).toBe('packed');
      expect(state.outbounds.find(row => row.id === shipment.outboundId)?.status).toBe('packed');
    }
    expect(state.orders.find(row => row.id === split.sourceOrderId)?.tags).toContain(id('fba-split'));
    expect(state.packages).toHaveLength(0);
    expect(state.jobs.every(job => job.status === 'completed')).toBe(true);
    expect(state.vendorJobs!.every(job => job.status === 'completed')).toBe(true);
    for (const stock of state.stocks) {
      expect(stock.onHand).toBe(100);
      expect(stock.reserved).toBe(state.reservations.filter(row => row.stockId === stock.id && row.status === 'active').reduce((sum, row) => sum + row.quantity, 0));
    }
    expect(state.movements.every(movement => movement.kind === 'reserve')).toBe(true);
    assertOmsInvariants(state); assertVendorInvariants(state); assertFbaAddons(state);
  });

  it('preserves original fixtures, archives, unknown addons and pending jobs without mutating input', () => {
    const current = ensureVendorFixtures(emptySnapshot(scope));
    current.vendorOrders![0].history.push('operator edit');
    current.orders[0].note = 'keep this edit';
    current.archives.historical = '{"so_123":"unaltered"}';
    current.jobs.push({ id: 'old-pending', kind: 'warehouse_pick', targetId: 'old-task', dueAt: 0, status: 'queued', attempts: 0, causationId: 'historical' });
    const first = current.vendorOrders![0].lines[0];
    current.stocks.push({ ...scope, id: 'actual-stock', revision: 7, pool: 'warehouse', warehouseId: 'wh_lax', sku: first.sku, onHand: 100, reserved: 0, unfulfillable: 1 });
    const before = structuredClone(current);
    const result = ensureAmazonDomainScenarios(current);
    expect(current).toEqual(before);
    expect(result.orders.slice(0, before.orders.length)).toEqual(before.orders);
    expect(result.vendorOrders!.slice(0, before.vendorOrders!.length)).toEqual(before.vendorOrders);
    expect(result.jobs[0]).toEqual(before.jobs[0]); expect(result.archives).toEqual(before.archives);
    const stock = result.stocks.find(row => row.id === 'actual-stock')!;
    expect(stock.onHand).toBe(100); expect(stock.unfulfillable).toBe(1); expect(stock.reserved).toBeGreaterThan(0);
    expect(result.reservations.some(row => row.stockId === stock.id)).toBe(true);
    const snapshot = structuredClone(result);
    expect(ensureAmazonDomainScenarios(result)).toBe(result);
    expect(ensureAmazonDomainScenarios(result)).toEqual(snapshot);
  });

  it('records the marker when existing scenario IDs are skipped, never overwrites or double reserves', () => {
    const imported = ensureAmazonDomainScenarios(emptySnapshot(scope));
    const current = structuredClone(imported);
    current.migratedSources = current.migratedSources.filter(marker => marker !== 'amz-scenario-v1');
    current.vendorOrders![0].history.push('custom history'); current.orders[0].note = 'operator change';
    const before = structuredClone(current);
    const result = ensureAmazonDomainScenarios(current);
    expect(result.migratedSources).toContain('amz-scenario-v1');
    expect(result.orders).toEqual(before.orders); expect(result.vendorOrders).toEqual(before.vendorOrders);
    expect(result.stocks).toEqual(before.stocks); expect(result.reservations).toEqual(before.reservations);
    expect(result.commandIds).toEqual(before.commandIds);
    expect(ensureAmazonDomainScenarios(result)).toBe(result);
  });

  it('skips colliding derived records instead of overwriting or reserving partial graphs', () => {
    const imported = ensureAmazonDomainScenarios(emptySnapshot(scope));
    const current = emptySnapshot(scope);
    const collision = structuredClone(imported.outbounds.find(row => row.orderId === `${id('vendor-collect')}:demand`)!);
    current.outbounds.push(collision);
    const result = ensureAmazonDomainScenarios(current);
    expect(result.outbounds.find(row => row.id === collision.id)).toEqual(collision);
    expect(result.vendorOrders!.some(row => row.id === id('vendor-collect'))).toBe(false);
    expect(result.reservations.some(row => row.fulfillmentId === collision.fulfillmentId)).toBe(false);
    expect(result.migratedSources).toContain('amz-scenario-v1');
  });

  it('preserves an occupied opening-stock ID without rewriting the old stock', () => {
    const current = emptySnapshot(scope);
    const template = ensureVendorFixtures(emptySnapshot(scope)).vendorOrders![0].lines[0];
    current.stocks.push({ ...scope, id: `amz-scenario-v1:opening-stock:${template.sku}`, revision: 8, warehouseId: 'wh_ewr', sku: 'OTHER-SKU', pool: 'warehouse', onHand: 33, reserved: 0, unfulfillable: 0 });
    const result = ensureAmazonDomainScenarios(current);
    expect(result.stocks).toEqual(current.stocks);
    expect(result.migratedSources).toContain('amz-scenario-v1');
    expect(result.orders).toHaveLength(0);
  });

  it('never replenishes or deducts edited warehouse stock to force execution scenarios', () => {
    const current = emptySnapshot(scope);
    for (const line of ensureVendorFixtures(emptySnapshot(scope)).vendorOrders![0].lines) current.stocks.push({ ...scope, id: `actual:${line.sku}`, revision: 9, warehouseId: 'wh_lax', sku: line.sku, pool: 'warehouse', onHand: 1, reserved: 0, unfulfillable: 0 });
    const result = ensureAmazonDomainScenarios(current);
    expect(result.stocks).toEqual(current.stocks);
    expect(result.reservations).toHaveLength(0);
    expect(result.vendorBatches ?? []).toHaveLength(0);
    expect(result.inboundPlans!.map(plan => plan.status)).toEqual(['draft', 'packed']);
    expect(result.migratedSources).toContain('amz-scenario-v1');
  });

  it('does not bootstrap other companies, merchants or aggregate merchant scope', () => {
    for (const overrides of [{ companyId: 'other' }, { merchantId: 'other' }, { merchantId: 'all' }]) {
      const state = emptySnapshot({ ...scope, ...overrides });
      expect(ensureAmazonDomainScenarios(state)).toBe(state);
    }
  });

  it('uses the bootstrap clock, not historical fixture deadlines, and leaves no automatic shipping', () => {
    const now = Date.parse('2028-03-07T09:00:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const state = ensureAmazonDomainScenarios(emptySnapshot(scope));
      expect(state.vendorOrders!.every(order => order.createdAt === new Date(now).toISOString())).toBe(true);
      expect(state.jobs.filter(job => job.status === 'queued').every(job => job.dueAt > now)).toBe(true);
      expect(state.vendorJobs!.filter(job => job.status === 'queued').every(job => job.dueAt > now)).toBe(true);
      expect(state.packages).toHaveLength(0);
    } finally { vi.restoreAllMocks(); }
  });
});
