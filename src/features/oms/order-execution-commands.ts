import type { CreateFulfillmentResult } from '@/components/orders/create-fulfillment-modal';
import type { OmsCommand } from './commands';

/** The modal's groups, not fulfillment line IDs, own the exact split quantities. */
export function commandsForFulfillmentResult(orderId: string, result: CreateFulfillmentResult): OmsCommand[] {
  return result.groups.filter(group => group.lines.some(line => line.quantity > 0)).map(group => ({
    type: 'allocate', orderId, executor: 'warehouse', warehouseId: group.warehouseId,
    lines: group.lines.filter(line => line.quantity > 0).map(line => ({ lineId: line.lineItemId, quantity: line.quantity })),
  }));
}
