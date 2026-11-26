import type { OmsSnapshot, SalesOrder } from './types';

export type ShippingDeadline = { status: 'missing' | 'pending' | 'due_soon' | 'overdue' | 'shipped_on_time' | 'shipped_late' | 'cancelled'; label: string; detail: string; deadline?: string; remainingMs?: number };
const warningWindow = 24 * 60 * 60 * 1000;

/** Uses the channel ship-by timestamp, never a carrier ETA or MCF submission time. */
export function shippingDeadline(snapshot: OmsSnapshot, order: SalesOrder, now = Date.now()): ShippingDeadline {
  const active = order.lines.filter(line => line.quantity > line.cancelled);
  if (!active.length) return { status: 'cancelled', label: '已取消', detail: '无待履约数量，不再计算发货倒计时' };
  const deadline = order.shipBy;
  const end = deadline ? Date.parse(deadline) : NaN;
  if (!Number.isFinite(end)) return { status: 'missing', label: '发货截止未同步', detail: '请同步渠道最晚发货时间；不按下单时间推算' };
  // A Shipment and its legacy Package are two projections of the same fact, not additive quantities.
  const shipments = (snapshot.shipments ?? []).filter(item => item.orderId === order.id && ['in_transit', 'delivered'].includes(item.status) && item.shippedAt && Number.isFinite(Date.parse(item.shippedAt)));
  const facts = [...shipments.map(item => ({ lines: item.lines, at: Date.parse(item.shippedAt!) })), ...snapshot.packages.filter(pack => pack.orderId === order.id && !shipments.some(item => item.providerPackageId === pack.id) && Number.isFinite(Date.parse(pack.shippedAt))).map(pack => ({ lines: pack.lines, at: Date.parse(pack.shippedAt) }))];
  const shipped = (lineId: string, until = Infinity) => facts.filter(fact => fact.at <= until).flatMap(fact => fact.lines).filter(line => line.lineId === lineId).reduce((sum, line) => sum + line.quantity, 0);
  const complete = active.every(line => shipped(line.id) >= line.quantity - line.cancelled);
  if (complete) {
    const onTime = active.every(line => shipped(line.id, end) >= line.quantity - line.cancelled);
    return { status: onTime ? 'shipped_on_time' : 'shipped_late', label: onTime ? '已按时发货' : '已逾期发货', detail: '按全部未取消商品的实际发运时间判断；渠道回传状态另行查看', deadline };
  }
  const remainingMs = end - now;
  const remainingQty = active.reduce((sum, line) => sum + Math.max(0, line.quantity - line.cancelled - shipped(line.id)), 0);
  return { status: remainingMs <= 0 ? 'overdue' : remainingMs <= warningWindow ? 'due_soon' : 'pending', label: remainingMs <= 0 ? '发货已逾期' : remainingMs <= warningWindow ? '临近发货截止' : '待按时发货', detail: `尚有 ${remainingQty} 件未发运；提前 24 小时预警（OMS 提醒阈值，非 Amazon 宽限期）`, deadline, remainingMs };
}
