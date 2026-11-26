import { describe, expect, it, vi, afterEach } from 'vitest';
import { appendAmazonConnection, filterAppConnections, parseGenericConnections, assertMerchant, type ConnectionRow } from './app-store';
import { connectionStorageKey, type Connection } from './amazon-connections';
const row: ConnectionRow = { id: 'one', appId: 'amazon', name: 'Northwind Seller US', merchantId: 'merchant_us_amazon', merchantName: 'US Amazon', identity: 'Seller', authorization: '已授权', business: '待配置业务', configured: false, active: true };
afterEach(() => vi.unstubAllGlobals());
describe('App Store connection tasks', () => {
  it('searches account and merchant names rather than only the application', () => {
    expect(filterAppConnections([row], 'northwind seller', '')).toEqual([row]);
    expect(filterAppConnections([row], 'US Amazon', '')).toEqual([row]);
    expect(filterAppConnections([row], '', '财务系统')).toEqual([]);
  });
  it('refuses aggregate or foreign merchant targets', () => {
    expect(() => assertMerchant('company_northwind', 'all')).toThrow();
    expect(() => assertMerchant('company_contoso', 'merchant_us_amazon')).toThrow();
  });
  it('preserves old connections and prevents duplicate submissions', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    const connection: Connection = { id: 'new-id', name: 'New Seller', identity: 'seller', region: 'NA', accountId: 'A123', authorized: true, businesses: {} };
    appendAmazonConnection('company_northwind', 'merchant_us_amazon', connection);
    appendAmazonConnection('company_northwind', 'merchant_us_amazon', connection);
    const saved = JSON.parse(data.get(connectionStorageKey('company_northwind', 'merchant_us_amazon'))!);
    expect(saved.connections).toHaveLength(1);
    expect(data.has(connectionStorageKey('company_northwind', 'all'))).toBe(false);
  });
  it('does not silently replace invalid generic connection data', () => {
    expect(parseGenericConnections(null)).toEqual([]);
    expect(() => parseGenericConnections('{bad')).toThrow();
    expect(() => parseGenericConnections('[{"appId":"unknown"}]')).toThrow();
  });
});
