import { describe, expect, it } from 'vitest';
import { migrateOmsSnapshot } from './migrations';
import { assertOmsSnapshot } from './repository';
import { assertOmsInvariants } from './commands';
import { merchants } from '@/lib/tenant-context';
import { orders } from '@/lib/mock-data/orders';
import { getOrderDetail } from '@/lib/mock-data/order-details';
import { skuInventory } from '@/lib/mock-data/warehouses';
import type { Scope } from './types';

const scope: Scope = { tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_shopify' };
const key = (merchant = scope.merchantId) => `amazon-oms-v1:${scope.companyId}:${merchant}:sales-demo-v1`;
function storage(entries: Record<string, string>): Storage {
  const values = new Map(Object.entries(entries));
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: k => { values.delete(k); }, clear: () => values.clear(), key: i => [...values.keys()][i] ?? null, get length() { return values.size; } };
}
const legacyOrder = { id: 'connection-mfn-01', connectionId: 'connection', reference: '114-2846197-6024102', source: 'Amazon', channel: 'MFN', site: 'US', sku: 'WEP-BLK-001', qty: 2, stage: 'ready', route: '', fulfillmentId: '', carrier: '', tracking: '', shipmentConfirmed: false };

describe('OMS legacy migration', () => {
  it('preserves original sales and detail identifiers without inventing lines', () => {
    const migrated = migrateOmsSnapshot(scope, storage({}));
    expect(migrated.orders.map(o => o.id)).toEqual(orders.filter(o => o.merchant === 'US Store').map(o => o.id));
    const order = migrated.orders.find(o => o.id === 'so_001')!;
    const detail = getOrderDetail('so_001')!;
    expect(order.number).toBe(detail.orderNo);
    expect(order.lines.map(l => [l.id, l.sku, l.quantity])).toEqual(detail.lineItems.map(l => [l.id, l.sku, l.quantity]));
    expect(order.legacyDetail).toEqual(detail);
    expect(order.address).toMatchObject(detail.shippingAddress);
    expect(order.migrationBlocked).toBeUndefined();
    expect(() => assertOmsSnapshot(migrated, scope)).not.toThrow();
  });
  it('uses current warehouse opening balances and never deducts historical shipments', () => {
    const migrated = migrateOmsSnapshot(scope, storage({}));
    expect(migrated.stocks).toHaveLength(skuInventory.length);
    for (const source of skuInventory) {
      expect(migrated.stocks.find(s => s.sku === source.sku && s.warehouseId === source.warehouseId)).toMatchObject({ onHand: source.available + source.reserved, reserved: source.reserved, unfulfillable: 0 });
    }
    expect(migrated.movements).toEqual([]);
    expect(migrated.reservations).toEqual([]);
    expect(migrated.orders.find(o => o.id === 'so_008')?.migrationBlocked).toBeTruthy();
  });
  it('blocks active original fulfillment with unknown per-line quantities, rather than allocating every line', () => {
    const migrated = migrateOmsSnapshot(scope, storage({}));
    for (const id of ['so_002', 'so_007', 'so_013', 'so_015']) {
      expect(migrated.orders.find(o => o.id === id)?.migrationBlocked).toBeTruthy();
      expect(migrated.migrationIssues.some(i => i.entityId === id)).toBe(true);
    }
    expect(migrated.fulfillments).toEqual([]);
    expect(migrated.outbounds).toEqual([]);
    expect(migrated.packages).toEqual([]);
    expect(migrated.jobs).toEqual([]);
  });
  it('archives scoped raw sources byte-for-byte without touching them or reading other merchants', () => {
    const vendorKey = `amazon-oms-business-demo-v1:${scope.companyId}:${scope.merchantId}`;
    const raw = ' { "version":1, "orders":[' + JSON.stringify(legacyOrder) + '] } ';
    const vendorRaw = '{ "po": [ { "id": "unlinked" } ] }';
    const source = storage({ [key()]: raw, [vendorKey]: vendorRaw, [key('merchant_us_amazon')]: 'broken foreign' });
    const migrated = migrateOmsSnapshot(scope, source);
    expect(migrated.archives[key()]).toBe(raw);
    expect(migrated.archives[vendorKey]).toBe(vendorRaw);
    expect(source.getItem(key())).toBe(raw);
    expect(source.getItem(vendorKey)).toBe(vendorRaw);
    expect(migrated.archives[key('merchant_us_amazon')]).toBeUndefined();
    expect(migrated.orders.filter(o => o.id.startsWith('mcf:'))).toHaveLength(1);
    expect(migrated.orders.some(o => o.id === 'unlinked')).toBe(false);
  });
  it('deduplicates exact external identities and does not merge different connection identities', () => {
    const source = storage({ [key()]: JSON.stringify({ version: 1, orders: [legacyOrder, { ...legacyOrder, id: 'duplicate' }, { ...legacyOrder, id: 'other', connectionId: 'other-connection' }] }) });
    const migrated = migrateOmsSnapshot(scope, source);
    expect(migrated.orders.filter(o => o.id.startsWith('mcf:'))).toHaveLength(2);
    expect(migrated.migrationIssues.some(i => i.message.includes('重复外部身份'))).toBe(true);
  });
  it('records uncertain original identity rather than making a duplicate sales order', () => {
    const original = orders.find(o => o.id === 'so_001')!;
    const source = storage({ [key()]: JSON.stringify({ version: 1, orders: [{ ...legacyOrder, source: original.channel, reference: original.platformNo }] }) });
    const migrated = migrateOmsSnapshot(scope, source);
    expect(migrated.orders.filter(o => o.sourceId === original.platformNo)).toHaveLength(1);
    expect(migrated.orders.find(o => o.id === original.id)?.migrationBlocked).toContain('身份');
  });
  it('never advances old pending timers into new own order aggregates', () => {
    const source = storage({ [key()]: JSON.stringify({ version: 1, orders: [{ ...legacyOrder, stage: 'own_withdraw_pending', route: 'own', pending: { kind: 'withdraw', resolveAt: 1, requestedAt: 0 } }] }) });
    const migrated = migrateOmsSnapshot(scope, source);
    expect(migrated.orders.find(o => o.id.startsWith('mcf:'))?.migrationBlocked).toBeTruthy();
    expect(migrated.fulfillments).toEqual([]);
    expect(migrated.jobs).toEqual([]);
  });
  it('archives corrupt MCF records and reports them without repairing source values', () => {
    for (const raw of ['broken-json', '{"version":1,"orders":[{}]}']) {
      const source = storage({ [key()]: raw });
      const migrated = migrateOmsSnapshot(scope, source);
      expect(migrated.archives[key()]).toBe(raw);
      expect(migrated.migrationIssues.some(i => i.source === key())).toBe(true);
      expect(migrated.orders.some(o => o.id.startsWith('mcf:'))).toBe(false);
      expect(source.getItem(key())).toBe(raw);
    }
  });
  it('satisfies runtime shape and command invariants for every concrete merchant', () => {
    for (const merchant of merchants) {
      const target = { ...scope, companyId: merchant.companyId, merchantId: merchant.id };
      const migrated = migrateOmsSnapshot(target, storage({}));
      expect(() => assertOmsSnapshot(migrated, target)).not.toThrow();
      expect(() => assertOmsInvariants(migrated)).not.toThrow();
    }
  });
  it('is deterministic without legacy sources and rejects invalid scopes', () => {
    expect(migrateOmsSnapshot(scope, storage({}))).toEqual(migrateOmsSnapshot(scope, storage({})));
    expect(() => migrateOmsSnapshot({ ...scope, merchantId: 'all' }, storage({}))).toThrow('concrete');
  });
});
