import { describe, expect, it } from 'vitest';
import { allocatedTotal, allocationTotals, allocationValue, isValidRatio, otherAllocation, parseSkuCodes, matchSkuSearch, matchSkuStatus, introducedConflicts, updateWarehouses } from './allocation-utils';

const sku = (ratio: string, excluded = false) => ({ skuCode: 'SKU-1', ratio, excluded });
const retailer = (id: string, ratio: string, enabled = true, excluded = false) => ({
  retailer: { id }, ownerId: 'OWN-001', warehouseIds: ['wh-lax'], enabled, skus: [sku(ratio, excluded)],
});

describe('bulk SKU search', () => {
  it('splits pasted codes and deduplicates ignoring case', () => {
    expect(parseSkuCodes('sku-a001\nSKU-B001，SKU-A001; SKU-C001\tSKU-D001；SKU-E001')).toEqual([
      'SKU-A001', 'SKU-B001', 'SKU-C001', 'SKU-D001', 'SKU-E001',
    ]);
    expect(parseSkuCodes(' , \n；')).toEqual([]);
  });

  it('matches exact codes in bulk mode instead of partial codes', () => {
    const product = { skuCode: 'SKU-A001', skuName: '红色T恤' };
    expect(matchSkuSearch(product, '', ['SKU-A001'])).toBe(true);
    expect(matchSkuSearch(product, '', ['SKU-A00'])).toBe(false);
    expect(matchSkuSearch(product, '红色', [])).toBe(true);
    expect(matchSkuSearch(product, 'sku-a', [])).toBe(true);
    expect(matchSkuSearch(product, '', ['MISSING'])).toBe(false);
  });
});

describe('bulk warehouse updates', () => {
  it('replaces, adds without duplicating, and removes only selected warehouses', () => {
    expect(updateWarehouses(['wh-lax', 'wh-ewr'], ['wh-ewr', 'wh-dfw'], 'replace')).toEqual(['wh-ewr', 'wh-dfw']);
    expect(updateWarehouses(['wh-lax', 'wh-ewr'], ['wh-ewr', 'wh-dfw'], 'add')).toEqual(['wh-lax', 'wh-ewr', 'wh-dfw']);
    expect(updateWarehouses(['wh-lax', 'wh-ewr'], ['wh-ewr', 'wh-dfw'], 'remove')).toEqual(['wh-lax']);
    expect(updateWarehouses(['wh-ewr'], ['wh-ewr'], 'remove')).toEqual([]);
  });
});

describe('source change warnings', () => {
  it('reports only newly introduced or increased conflicts', () => {
    expect(introducedConflicts({ a: 110, b: 90 }, { a: 110, b: 120, c: 130 })).toEqual([['b', 120], ['c', 130]]);
    expect(introducedConflicts({ a: 110 }, { a: 105 })).toEqual([]);
  });
});

describe('SKU status filters', () => {
  it('distinguishes unconfigured, zero allocation and excluded entries', () => {
    expect(matchSkuStatus(sku(''), 'pending', true, 0)).toBe(true);
    expect(matchSkuStatus(sku('0'), 'pending', true, 0)).toBe(false);
    expect(matchSkuStatus(sku('', true), 'pending', true, 0)).toBe(false);
    expect(matchSkuStatus(sku('40', true), 'excluded', true, 120)).toBe(true);
    expect(matchSkuStatus(sku('bad'), 'pending', true, 0)).toBe(false);
  });

  it('only flags positive allocations participating in an overallocated SKU', () => {
    expect(matchSkuStatus(sku('40'), 'over', true, 120)).toBe(true);
    expect(matchSkuStatus(sku('40'), 'over', true, 100)).toBe(false);
    expect(matchSkuStatus(sku('40'), 'over', false, 120)).toBe(false);
    expect(matchSkuStatus(sku('40', true), 'over', true, 120)).toBe(false);
    expect(matchSkuStatus(sku('0'), 'over', true, 120)).toBe(false);
    expect(matchSkuStatus(sku(''), 'all', false, 0)).toBe(true);
  });
});

describe('inventory allocation', () => {
  it('accepts zero and decimal percentages but rejects empty or invalid values', () => {
    for (const value of ['0', '100', '33.33']) expect(isValidRatio(value)).toBe(true);
    for (const value of ['', ' ', '-1', '101', 'NaN', 'Infinity', '10x', '33.333', '1e2']) expect(isValidRatio(value)).toBe(false);
  });

  it('only counts enabled retailers and non-excluded SKU allocations', () => {
    expect(allocationTotals([
      retailer('a', '40'), retailer('b', '30'), retailer('c', '90', false), retailer('d', '100', true, true),
    ])).toEqual({ '["OWN-001","wh-lax","SKU-1"]': 70 });
  });

  it('recomputes totals after updates and exposes over-allocation', () => {
    expect(allocationTotals([retailer('a', '60'), retailer('b', '50')])['["OWN-001","wh-lax","SKU-1"]']).toBe(110);
    expect(allocationTotals([retailer('a', '40'), retailer('b', '50')])['["OWN-001","wh-lax","SKU-1"]']).toBe(90);
  });

  it('avoids floating point false positives at exactly 100 percent', () => {
    expect(allocationTotals([retailer('a', '33.33'), retailer('b', '33.33'), retailer('c', '33.34')])['["OWN-001","wh-lax","SKU-1"]']).toBe(100);
  });

  it('separates owners and warehouses but catches partially overlapping warehouse sets', () => {
    const data = [
      { ...retailer('a', '60'), warehouseIds: ['wh-lax', 'wh-ewr'] },
      { ...retailer('b', '50'), warehouseIds: ['wh-ewr', 'wh-dfw'] },
      { ...retailer('c', '75'), warehouseIds: ['wh-lax'], ownerId: 'OWN-002' },
    ];
    const totals = allocationTotals(data);
    expect(allocatedTotal(totals, data[0], 'SKU-1')).toBe(110);
    expect(allocatedTotal(totals, data[1], 'SKU-1')).toBe(110);
    expect(allocatedTotal(totals, data[2], 'SKU-1')).toBe(75);
    expect(Object.values(totals).sort((a, b) => a - b)).toEqual([50, 60, 75, 110]);
  });

  it('calculates other retailer usage without subtracting disabled or excluded entries', () => {
    expect(otherAllocation(100, true, sku('40'))).toBe(60);
    expect(otherAllocation(100, false, sku('40'))).toBe(100);
    expect(otherAllocation(100, true, sku('40', true))).toBe(100);
    expect(allocationValue(sku('invalid'))).toBe(0);
  });
});
