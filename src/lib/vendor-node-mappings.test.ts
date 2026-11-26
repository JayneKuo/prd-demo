import { describe, it, expect } from 'vitest';
import { vendorNodeStorageKey, seedVendorNodeMappings, readVendorNodeMappings, writeVendorNodeMapping, findVendorNodeMapping, vendorNodeMappingErrors, type VendorNodeScope } from './vendor-node-mappings';
const scope: VendorNodeScope = { companyId: 'company', merchantScope: 'merchant', connectionId: 'vendor' };
function storage() { const rows = new Map<string, string>(); return { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => { rows.set(key, value); } }; }
describe('Vendor per-connection source nodes', () => {
  it('seeds canonical LAX/EWR source addresses without saving or claiming Amazon IDs', () => {
    const store = storage(); const rows = readVendorNodeMappings(store, scope);
    expect(rows.map(row => row.warehouseId)).toEqual(['wh_lax', 'wh_ewr']);
    expect(rows[0].shipFromParty).toMatchObject({ partyId: 'DEMO-LAX-01', address: { city: 'Vernon', postalCode: '90058' } });
    expect(store.getItem(vendorNodeStorageKey(scope))).toBeNull();
  });
  it('round trips edits and isolates company, merchant, connection and warehouse', () => {
    const store = storage(); const row = seedVendorNodeMappings(scope)[0];
    writeVendorNodeMapping(store, { ...row, shipFromParty: { ...row.shipFromParty, partyId: 'REGISTERED-LAX' } });
    expect(findVendorNodeMapping(readVendorNodeMappings(store, scope), scope, 'wh_lax')?.shipFromParty.partyId).toBe('REGISTERED-LAX');
    for (const change of [{ companyId: 'other' }, { merchantScope: 'other' }, { connectionId: 'other' }]) {
      const other = { ...scope, ...change };
      expect(vendorNodeStorageKey(other)).not.toBe(vendorNodeStorageKey(scope));
      expect(findVendorNodeMapping(readVendorNodeMappings(store, scope), other, 'wh_lax')).toBeUndefined();
    }
    expect(findVendorNodeMapping(readVendorNodeMappings(store, scope), scope, 'wh_ewr')?.shipFromParty.partyId).toBe('DEMO-EWR-01');
  });
  it('does not silently overwrite corrupt storage and validates required external IDs and addresses', () => {
    const store = storage(); const row = seedVendorNodeMappings(scope)[0];
    expect(vendorNodeMappingErrors({ ...row, shipFromParty: { partyId: '' } }).length).toBeGreaterThan(0);
    expect(() => writeVendorNodeMapping(store, { ...row, shipFromParty: { partyId: 'X' } })).toThrow();
    store.setItem(vendorNodeStorageKey(scope), '{broken');
    expect(() => readVendorNodeMappings(store, scope)).toThrow();
    expect(() => writeVendorNodeMapping(store, row)).toThrow();
    expect(store.getItem(vendorNodeStorageKey(scope))).toBe('{broken');
    store.setItem(vendorNodeStorageKey(scope), JSON.stringify([{ ...row, connectionId: 'other' }]));
    expect(() => readVendorNodeMappings(store, scope)).toThrow('作用域');
    store.setItem(vendorNodeStorageKey(scope), JSON.stringify([row, row]));
    expect(() => readVendorNodeMappings(store, scope)).toThrow();
  });
});
