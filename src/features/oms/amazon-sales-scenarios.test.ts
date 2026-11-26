import { describe, expect, it } from 'vitest';
import { emptySnapshot } from './types';
import { ensureCanonicalFixtures } from './fixtures';
import { ensureAmazonSalesScenarios, amazonSalesScenarios } from './amazon-sales-scenarios';
import { assertOmsInvariants } from './commands';
const scope = { tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' };
describe('additive Amazon sales scenarios', () => {
  it('adds independently identified scenarios without resetting the original graph', () => {
    const original = ensureCanonicalFixtures(emptySnapshot(scope));
    original.stocks.push({ ...scope, id: 'stock:wh_lax:WEP-BLK-001', revision: 1, warehouseId: 'wh_lax', sku: 'WEP-BLK-001', pool: 'warehouse', onHand: 450, reserved: 0, unfulfillable: 0 });
    const savedOrder = JSON.stringify(original.orders[0]);
    const next = ensureAmazonSalesScenarios(original);
    expect(next.orders).toHaveLength(original.orders.length + amazonSalesScenarios.length);
    expect(JSON.stringify(next.orders[0])).toBe(savedOrder);
    expect(original.orders).toHaveLength(2);
    expect(next.orders.find(order => order.id === 'amz-scene-mapping')?.lines[0].mappingSnapshot).toBeUndefined();
    expect(next.fulfillments.find(task => task.orderId === 'amz-scene-picking')?.status).toBe('packed');
    expect(next.packages.find(pack => pack.orderId === 'amz-scene-writeback')?.confirmation).toBe('failed');
    expect(ensureAmazonSalesScenarios(next)).toBe(next);
    expect(() => assertOmsInvariants(next)).not.toThrow();
  });
});
