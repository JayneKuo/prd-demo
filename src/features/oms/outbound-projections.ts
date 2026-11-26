import type { InventoryRow } from '@/lib/mock-data/inventory';
import type { OutboundRow } from '@/lib/mock-data/outbound';
import { getWarehouseById } from '@/lib/mock-data/warehouses';
import type { OmsSnapshot, Outbound, Stock } from './types';

export const outboundWorkStatus: Record<Outbound['status'], string> = {
  waiting: '待拣货', picking: '拣货中', packed: '已打包', withdraw_pending: '撤回中', cancelled: '已取消', shipped: '已出库',
};

// Keep the legacy table's MM-DD date shape: its existing date filter adds the year.
const tableDate = (value: string) => value.replace('T', ' ').slice(5, 16);
export function projectOutboundRow(snapshot: OmsSnapshot, outbound: Outbound, merchant: string): OutboundRow {
  const order = snapshot.orders.find(item => item.id === outbound.orderId);
  const task = snapshot.fulfillments.find(item => item.id === outbound.fulfillmentId);
  const pack = snapshot.packages.find(item => item.fulfillmentId === outbound.fulfillmentId);
  const totalQty = outbound.lines.reduce((sum, line) => sum + line.quantity, 0);
  const isFba = order?.source === 'internal_transfer' && (order?.tags?.includes('fba_replenishment') ?? false);
  const isSupplierDirect = order?.tags?.includes('supplier_direct') ?? false;
  return {
    id: outbound.id, outboundNo: outbound.number, wmsOutboundNo: task?.providerReference ?? '',
    wmsStatus: task?.executor === 'amazon' ? (task.status === 'allocated' ? '待提交 APP' : task.status === 'submitted' ? 'APP 处理中' : task.status === 'picking' ? 'Amazon 执行中' : outboundWorkStatus[outbound.status]) : outboundWorkStatus[outbound.status],
    source: isFba ? 'FBA 补货计划' : '销售订单',
    sourceNo: order?.number ?? outbound.orderId,
    channelOrderNo: order?.sourceId ?? '', referenceNo: '', fulfillmentNo: task?.number ?? outbound.fulfillmentId,
    warehouse: snapshot.warehouseRecords?.find(item => item.id === outbound.warehouseId)?.code ?? snapshot.fulfillmentWarehouses?.find(item => item.id === outbound.warehouseId)?.code ?? getWarehouseById(outbound.warehouseId)?.code ?? outbound.warehouseId,
    carrier: pack?.carrier ?? '待安排', trackingNo: pack?.tracking ?? '',
    itemsSummary: `${outbound.lines.length} 种商品`,
    itemsDetail: outbound.lines.map(line => `${order?.lines.find(item => item.id === line.lineId)?.sku ?? line.lineId} × ${line.quantity}`),
    totalQty, totalWeight: '—',
    outboundType: isFba ? (isSupplierDirect ? 'FBA 供应商直发' : 'FBA 补货') : '销售出库',
    status: outbound.status === 'waiting' ? '待出库' : outbound.status === 'shipped' ? '已出库' : outbound.status === 'cancelled' ? '已取消' : outbound.status === 'withdraw_pending' ? '取消中' : '出库中',
    waveNo: '', picker: '', checker: '', exception: task?.error ?? '', exceptionType: task?.error ? 'system' : '', exceptionDetail: task?.error ?? '',
    pushStatus: 'success', pushRetryCount: 0, lastPushAt: tableDate(outbound.createdAt),
    cancelStatus: outbound.status === 'withdraw_pending' ? 'requesting' : outbound.status === 'cancelled' ? 'success' : 'none', cancelRejectReason: '',
    createdAt: tableDate(outbound.createdAt), shippedAt: pack ? tableDate(pack.shippedAt) : '', merchant,
    shipByDate: order?.shipBy,
  };
}

export function mergeOutboundRows(legacy: OutboundRow[], canonical: OutboundRow[]): OutboundRow[] {
  const ids = new Set(canonical.map(row => row.id));
  const numbers = new Set(canonical.map(row => `${row.merchant}:${row.outboundNo}`));
  return [...canonical, ...legacy.filter(row => !ids.has(row.id) && !numbers.has(`${row.merchant}:${row.outboundNo}`))];
}

export function projectStockRow(snapshot: OmsSnapshot, stock: Stock, merchant: string): InventoryRow {
  const available = stock.onHand - stock.unfulfillable - stock.reserved;
  const title = snapshot.orders.flatMap(order => order.lines).find(line => line.sku === stock.sku)?.title ?? stock.sku;
  const lastMovement = snapshot.movements.filter(movement => movement.stockId === stock.id).at(-1);
  return {
    id: `${snapshot.merchantId}:${stock.id}`, merchant, sku: stock.sku, product: title,
    available: available.toLocaleString('en-US'), reserved: stock.reserved.toLocaleString('en-US'),
    warehouse: stock.pool === 'fba' ? `Amazon FBA · ${stock.connectionId ?? '—'} / ${stock.site ?? '—'}` : getWarehouseById(stock.warehouseId)?.code ?? stock.warehouseId,
    status: available <= 0 ? 'Out of stock' : available < 50 ? 'Low stock' : stock.reserved > 0 ? 'Reserved' : 'Available',
    updated: lastMovement?.createdAt.replace('T', ' ').slice(0, 19) ?? 'OMS 期初库存',
  };
}

export function mergeStockRows(legacy: InventoryRow[], canonical: InventoryRow[]): InventoryRow[] {
  // Historical warehouse labels are not canonical IDs. Replace their merchant/SKU projection
  // once real stock exists, while retaining unrelated historical rows.
  const represented = new Set(canonical.map(row => `${row.merchant}:${row.sku}`));
  return [...canonical, ...legacy.filter(row => !represented.has(`${row.merchant}:${row.sku}`))];
}
