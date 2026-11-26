import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAmazonSampleConnections } from './amazon-sample-data';
import { connectionStorageKey } from './amazon-connections';
import { commitMcfOrder, loadMcfSnapshot, mcfOrderHref, mcfOrderRouteId, mcfOrdersStorageKey, parseMcfOrderRouteId, projectMcfOrder } from './mcf-orders';
import { getMerchantsByCompany } from './tenant-context';
import { mcfRequirements, resolveMcfPending } from './mcf-workflow';

const merchant = getMerchantsByCompany('company_northwind').find(m => m.id === 'merchant_us_amazon')!;
const connections = createAmazonSampleConnections();
const seller = connections.find(c => c.identity === 'seller')!;
const key = mcfOrdersStorageKey(merchant.companyId, merchant.id);
function storage() {
  const data = new Map<string, string>();
  const local = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  vi.stubGlobal('localStorage', local);
  local.setItem(connectionStorageKey(merchant.companyId, merchant.id), JSON.stringify({ connections }));
  return local;
}
afterEach(() => vi.unstubAllGlobals());

describe('Seller sales repository integration', () => {
  it('projects real source records without intercepting legacy Amazon sales ids', () => {
    storage();
    const loaded = loadMcfSnapshot(key, connections);
    expect(loaded.error).toBe('');
    expect(loaded.state.orders).toHaveLength(5);
    const order = loaded.state.orders.find(o => o.channel === 'MFN' && o.stage === 'ready')!;
    const row = projectMcfOrder({ merchant, order, connection: seller, storageKey: key });
    expect(row.platformNo).toBe(order.reference);
    expect(row.channel).toBe('Amazon');
    expect(row.fulfillmentChannel).toBe('MFN');
    const mcf = projectMcfOrder({ merchant, order: { ...order, route: 'mcf', stage: 'processing' }, connection: seller, storageKey: key });
    expect(mcf.fulfillmentChannel).toBe('MFN');
    expect(mcf.fulfillment).toBe('处理中');
    expect(mcf.deliveryParty).toBe('Amazon 配送（MCF）');
    expect(row.merchant).toBe(merchant.name);
    expect(parseMcfOrderRouteId(row.id)).toEqual({ merchantId: merchant.id, orderId: order.id });
    expect(parseMcfOrderRouteId('so_004')).toBeNull();
    expect(decodeURIComponent(mcfOrderHref(merchant.id, order.id).split('/').at(-1)!.split('?')[0])).toBe(mcfOrderRouteId(merchant.id, order.id));
  });
  it('preserves persisted state, enforces storage and connection compare-and-swap', () => {
    const local = storage();
    const loaded = loadMcfSnapshot(key, connections);
    const order = loaded.state.orders[1];
    const next = { ...order, stage: 'unknown' as const, route: 'mcf' as const };
    const saved = commitMcfOrder(key, loaded.raw, loaded.state, next, order, seller);
    expect(loadMcfSnapshot(key, connections).state.orders.find(o => o.id === order.id)?.stage).toBe('unknown');
    expect(() => commitMcfOrder(key, loaded.raw, loaded.state, next, order, seller)).toThrow('其他页面');
    local.setItem(connectionStorageKey(merchant.companyId, merchant.id), JSON.stringify({ connections: [{ ...seller, authorized: false }] }));
    expect(() => commitMcfOrder(key, saved.raw, saved.state, order, next, seller)).toThrow('授权');
  });
  it('protects corrupt storage and resumes receipts from saved records', () => {
    const local = storage();
    local.setItem(key, '{broken');
    expect(loadMcfSnapshot(key, connections).error).not.toBe('');
    expect(local.getItem(key)).toBe('{broken');
    local.setItem(key, JSON.stringify({ version: 1, orders: [] }));
    const loaded = loadMcfSnapshot(key, connections);
    const order = loaded.state.orders[1];
    const pending = { ...order, stage: 'submitting' as const, route: 'mcf' as const, pending: { kind: 'create' as const, requestedAt: 1000, resolveAt: 3200 } };
    commitMcfOrder(key, loaded.raw, loaded.state, pending, order, seller);
    const restored = loadMcfSnapshot(key, connections).state.orders.find(o => o.id === order.id)!;
    expect(resolveMcfPending(restored, 4000).stage).toBe('created');
  });
  it('keeps contextual repair returns on the routed detail', () => {
    storage();
    const order = loadMcfSnapshot(key, connections).state.orders[1];
    const href = mcfOrderHref(merchant.id, order.id);
    const links = mcfRequirements(order, seller, {}, true, href).filter(r => r.href);
    for (const requirement of links) expect(new URL(requirement.href!, 'http://localhost').searchParams.get('returnTo')).toBe(href);
  });
});
