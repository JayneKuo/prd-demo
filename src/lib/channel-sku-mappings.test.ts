import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAmazonSampleConnections } from './amazon-sample-data';
import { channelSkuMappingsKey, readChannelSkuMappings, saveChannelSkuMappings } from './channel-sku-mappings';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) };
  vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() });
  return data;
}
describe('shared channel SKU mappings', () => {
  it('merges old business mappings once into one account/site store', () => {
    const data = setup();
    const seller = createAmazonSampleConnections()[0];
    expect(readChannelSkuMappings('company', 'merchant', seller, 'US')).toHaveLength(1);
    expect(data.has(channelSkuMappingsKey('company', 'merchant', seller.id, 'US'))).toBe(true);
    saveChannelSkuMappings('company', 'merchant', seller, 'US', []);
    expect(readChannelSkuMappings('company', 'merchant', seller, 'US')).toEqual([]);
    expect(seller.businesses.sales?.productMappings).toHaveLength(1);
  });
  it('isolates sites and refuses to replace corrupt data', () => {
    const data = setup();
    const seller = createAmazonSampleConnections()[0];
    data.set(channelSkuMappingsKey('company', 'merchant', seller.id, 'US'), '{bad');
    expect(() => readChannelSkuMappings('company', 'merchant', seller, 'US')).toThrow();
    expect(readChannelSkuMappings('company', 'merchant', seller, 'CA')).toEqual([]);
  });
});
