import { describe, expect, it } from 'vitest';
import { createAmazonSampleConnections } from './amazon-sample-data';
import { defaultBusinessConfig, validateBusinessConfig, parseConnections, connectionStorageKey, type Connection } from './amazon-connections';

const seller: Connection = { id: 'seller-1', name: 'Test Seller', identity: 'seller', region: 'NA', accountId: 'demo', authorized: true, businesses: {} };
const valid = { ...defaultBusinessConfig(), site: 'US', warehouse: 'wh_lax', rule: 'manual', syncFrom: '2026-10-01', mappingConfirmed: true };
describe('Amazon connection configuration', () => {
  it('seeds valid Seller and Vendor accounts covering all five business capabilities', () => {
    const samples = createAmazonSampleConnections();
    expect(parseConnections(JSON.stringify({ connections: samples }))).toHaveLength(2);
    for (const connection of samples) for (const [id, config] of Object.entries(connection.businesses)) {
      expect(validateBusinessConfig(config!, connection, id as import('./amazon-connections').BusinessId)).toEqual([]);
    }
    expect(samples.flatMap((connection) => Object.keys(connection.businesses)).sort()).toEqual(['df', 'fba', 'mcf', 'sales', 'wholesale']);
  });
  it('isolates storage by company and merchant', () => {
    expect(connectionStorageKey('a', 'one')).not.toBe(connectionStorageKey('a', 'two'));
    expect(connectionStorageKey('a', 'one')).not.toBe(connectionStorageKey('b', 'one'));
  });
  it('allows complete seller configuration', () => {
    expect(validateBusinessConfig(valid, seller, 'sales')).toEqual([]);
  });
  it('blocks unauthorized and wrong-identity activation', () => {
    expect(validateBusinessConfig(valid, { ...seller, authorized: false }, 'sales')).toContain('请先完成账号授权');
    expect(validateBusinessConfig(valid, seller, 'df')).toContain('业务与账号身份不匹配');
  });
  it('does not pin a warehouse for sales, MCF, replenishment or wholesale', () => {
    for (const id of ['sales', 'mcf', 'fba'] as const) expect(validateBusinessConfig({ ...valid, warehouse: '', mappingConfirmed: false }, seller, id)).toEqual([]);
    expect(validateBusinessConfig({ ...valid, warehouse: '', mappingConfirmed: false, reference: 'NW001' }, { ...seller, identity: 'vendor' }, 'wholesale')).toEqual([]);
  });
  it('requires a DF external node mapping but permits incomplete product mappings', () => {
    const vendor = { ...seller, identity: 'vendor' as const };
    expect(validateBusinessConfig({ ...valid, reference: 'DF-LAX', warehouse: '', mappingConfirmed: false }, vendor, 'df')).toContain('请关联 DF 外部仓库对应的 OMS 履约节点');
    expect(validateBusinessConfig({ ...valid, reference: 'DF-LAX', productMappings: [] }, vendor, 'df')).toEqual([]);
  });
  it('validates region, manual readiness, vendor reference and sync date', () => {
    expect(validateBusinessConfig({ ...valid, site: 'DE' }, seller, 'sales')).toContain('站点不属于当前连接区域');
    expect(validateBusinessConfig({ ...valid, mappingConfirmed: false }, seller, 'sales')).toEqual([]);
    expect(validateBusinessConfig(valid, { ...seller, identity: 'vendor' }, 'df')).toContain('请填写 Vendor Code / DF 仓库标识');
    expect(validateBusinessConfig({ ...valid, syncFrom: 'bad' }, seller, 'sales')).not.toEqual([]);
  });
  it('loads valid records and refuses corrupt data without silently replacing it', () => {
    expect(parseConnections(null)).toEqual([]);
    expect(parseConnections(JSON.stringify({ connections: [{ ...seller, businesses: { sales: valid } }] }))).toHaveLength(1);
    expect(() => parseConnections('{bad')).toThrow();
    expect(() => parseConnections(JSON.stringify({ connections: [{ ...seller, businesses: { df: valid } }] }))).toThrow();
    expect(() => parseConnections(JSON.stringify({ connections: [{}] }))).toThrow();
  });
});
