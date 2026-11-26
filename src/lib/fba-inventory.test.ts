import { describe, expect, it } from 'vitest';
import { createAmazonSampleConnections } from './amazon-sample-data';
import { defaultSyncSettings } from './amazon-sync';
import { createFbaInventoryRows, fbaInventoryGate, fbaInventoryStorageKey, inventoryQuantityFields, parseFbaInventory, syncFbaInventory } from './fba-inventory';

const seller = () => createAmazonSampleConnections()[0];

describe('FBA marketplace inventory', () => {
  it('uses legacy readInventory defaults while respecting explicit opt-out', () => {
    const connection = seller();
    expect(fbaInventoryGate(connection)).toBe('');
    connection.businesses.fba!.syncSettings = { ...defaultSyncSettings('fba'), readInventory: false };
    expect(fbaInventoryGate(connection)).toContain('未开启');
    expect(createFbaInventoryRows(connection)).toEqual([]);
  });

  it('gates unauthorized, paused, missing-config and Vendor accounts', () => {
    const unauthorized = seller(); unauthorized.authorized = false;
    const paused = seller(); paused.businesses.fba!.status = 'paused';
    const missing = seller(); delete missing.businesses.fba;
    for (const connection of [unauthorized, paused, missing, createAmazonSampleConnections()[1]]) {
      expect(fbaInventoryGate(connection)).not.toBe('');
      expect(createFbaInventoryRows(connection)).toEqual([]);
    }
  });

  it('provides market-level identifiers and independent stock quantities', () => {
    const rows = createFbaInventoryRows(seller());
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.site).toBe('US');
      expect(row.sellerSku).toBeTruthy(); expect(row.asin).toBeTruthy(); expect(row.fnsku).toBeTruthy();
      expect(row.total).toBe(inventoryQuantityFields.reduce((sum, field) => sum + row[field], 0));
      expect(row.fulfillable).not.toBe(row.inboundReceiving);
    }
    expect(parseFbaInventory(JSON.stringify({ version: 1, rows })).rows).toEqual(rows);
  });

  it('rejects malformed persisted snapshots rather than replacing them', () => {
    const row = createFbaInventoryRows(seller())[0];
    for (const rows of [[{ ...row, fulfillable: -1 }], [{ ...row, total: row.total + 1 }], [row, row], [{ ...row, updatedAt: 'invalid' }]]) {
      expect(() => parseFbaInventory(JSON.stringify({ version: 1, rows }))).toThrow();
    }
    expect(() => parseFbaInventory('null')).toThrow();
    expect(parseFbaInventory(null)).toEqual({ version: 1, rows: [] });
  });

  it('updates only eligible account/site snapshots and persists timestamps', () => {
    const connection = seller();
    const rows = createFbaInventoryRows(connection);
    const other = { ...rows[0], connectionId: 'other-seller' };
    const snapshot = { version: 1 as const, rows: [...rows, other] };
    const timestamp = '2026-11-03T10:00:00Z';
    const next = syncFbaInventory(snapshot, [connection], timestamp);
    expect(next.rows.filter(row => row.connectionId === connection.id).every(row => row.updatedAt === timestamp)).toBe(true);
    expect(next.rows.find(row => row.connectionId === 'other-seller')).toEqual(other);
    expect(next.rows.find(row => row.connectionId === connection.id)?.fulfillable).toBe(rows[0].fulfillable);
    connection.authorized = false;
    expect(syncFbaInventory(snapshot, [connection], timestamp)).toEqual(snapshot);
  });

  it('scopes local persistence by company and merchant', () => {
    expect(fbaInventoryStorageKey('a', 'x')).not.toBe(fbaInventoryStorageKey('b', 'x'));
    expect(fbaInventoryStorageKey('a', 'x')).not.toBe(fbaInventoryStorageKey('a', 'y'));
  });
});
