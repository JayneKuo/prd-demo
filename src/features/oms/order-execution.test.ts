import { describe, expect, it } from 'vitest';
import { commandsForFulfillmentResult } from './order-execution-commands';
import type { CreateFulfillmentResult, FulfillmentGroup } from '@/components/orders/create-fulfillment-modal';

const group = (warehouseId: string, quantities: number[]): FulfillmentGroup => ({
  id: warehouseId, warehouseId, warehouseCode: warehouseId, carrierId: '', totalWeight: 0, note: '',
  lines: quantities.map((quantity, index) => ({ lineItemId: `line-${index}`, sku: `sku-${index}`, title: '', quantity, maxQty: 10, warehouseId, warehouseCode: warehouseId, available: 10, hasStock: true })),
});

describe('canonical fulfillment modal integration', () => {
  it('uses exact selected quantities per original group instead of whole order line quantities', () => {
    const result: CreateFulfillmentResult = { groups: [group('wh-a', [2, 0]), group('wh-b', [3, 1])], fulfillments: [] };
    expect(commandsForFulfillmentResult('order-1', result)).toEqual([
      { type: 'allocate', orderId: 'order-1', executor: 'warehouse', warehouseId: 'wh-a', lines: [{ lineId: 'line-0', quantity: 2 }] },
      { type: 'allocate', orderId: 'order-1', executor: 'warehouse', warehouseId: 'wh-b', lines: [{ lineId: 'line-0', quantity: 3 }, { lineId: 'line-1', quantity: 1 }] },
    ]);
  });
  it('does not create empty allocation commands', () => {
    expect(commandsForFulfillmentResult('order-1', { groups: [group('wh-a', [0, 0])], fulfillments: [] })).toEqual([]);
  });
});
