import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAmazonConnections } from './amazon-sample-data';
import { connectionStorageKey } from './amazon-connections';
afterEach(() => vi.unstubAllGlobals());
function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  return values;
}
describe('Amazon fixture discovery', () => {
  it('loads both identities when queried from the company connection directory', () => {
    storage();
    const connections = loadAmazonConnections('company_northwind', 'merchant_us_amazon');
    expect(connections.map((connection) => connection.identity)).toEqual(['seller', 'vendor']);
    expect(connections[1].businesses.wholesale?.reference).toBe('NW001');
    expect(connections[1].businesses.df?.reference).toBe('NW-DF-LAX');
  });
  it('adds missing Vendor samples once and preserves edited Seller configuration', () => {
    const values = storage();
    const key = connectionStorageKey('company_northwind', 'merchant_us_amazon');
    const seller = { id: 'amz-northwind-seller-na', name: 'Edited Seller', identity: 'seller', region: 'NA', accountId: 'A1', authorized: false, businesses: {} };
    values.set(key, JSON.stringify({ connections: [seller] }));
    values.set(`${key}:fixtures-v2`, '1');
    expect(loadAmazonConnections('company_northwind', 'merchant_us_amazon')[0]).toEqual(seller);
    expect(loadAmazonConnections('company_northwind', 'merchant_us_amazon')).toHaveLength(2);
  });
  it('does not copy samples to other merchants or aggregate buckets', () => {
    storage();
    expect(loadAmazonConnections('company_northwind', 'all')).toEqual([]);
    expect(loadAmazonConnections('company_northwind', 'merchant_us_shopify')).toEqual([]);
  });
});
