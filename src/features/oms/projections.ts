import type { OmsSnapshot, SalesOrder } from './types';
import type { OrderRow } from '@/lib/mock-data/orders';
import type { OrderDetail } from '@/lib/mock-data/order-details';
import { getWarehouseById } from '@/lib/mock-data/warehouses';
import { businessDateTime } from '@/lib/business-date';

function quantities(state: OmsSnapshot, source: SalesOrder) {
  const ordered = source.lines.reduce((sum, line) => sum + line.quantity, 0);
  const cancelled = source.lines.reduce((sum, line) => sum + line.cancelled, 0);
  const tasks = state.fulfillments.filter(task => task.orderId === source.id);
  const packs = state.packages.filter(pack => pack.orderId === source.id);
  const shipped = packs.reduce((sum, pack) => sum + pack.lines.reduce((n, line) => n + line.quantity, 0), 0);
  const delivered = packs.filter(pack => pack.deliveredAt).reduce((sum, pack) => sum + pack.lines.reduce((n, line) => n + line.quantity, 0), 0);
  const allocated = tasks.filter(task => task.status !== 'cancelled').reduce((sum, task) => sum + task.lines.reduce((n, line) => n + line.quantity, 0), 0);
  return { ordered, cancelled, tasks, packs, shipped, delivered, allocated };
}
export function projectOrderRow(state: OmsSnapshot, source: SalesOrder, merchantName: string): OrderRow {
  const q = quantities(state, source);
  if (source.migrationBlocked) {
    const old = source.legacyDetail as Partial<OrderDetail & OrderRow> | undefined;
    return { id: source.id, orderNo: source.number, platformNo: source.sourceId, refNo: old?.referenceNo ?? old?.refNo ?? '', channel: source.source, merchant: merchantName, customer: source.customer, region: source.address ? `${source.address.country} / ${source.address.city}` : old?.region ?? '—', itemsSummary: `${source.lines.reduce((sum, line) => sum + line.quantity, 0)} 件商品`, itemsDetail: source.lines.map(line => `${line.sku} × ${line.quantity}`), amount: old?.totalPrice ?? old?.amount ?? '—', status: old?.status ?? '挂起', payment: old?.financialStatus ?? old?.payment ?? source.paymentStatus, fulfillment: old?.fulfillmentStatus ?? old?.fulfillment ?? '—', exception: old?.exception ?? '', orderTime: businessDateTime(source.createdAt), fulfillmentChannel: source.channelType };
  }
  const remaining = q.ordered - q.cancelled;
  const status = source.archived ? '已取消' : q.delivered === remaining && remaining > 0 ? '已完成' : q.shipped === remaining && remaining > 0 ? '已发货' : source.migrationBlocked ? '挂起' : q.allocated > 0 ? '处理中' : '待处理';
  const fulfillment = q.delivered === remaining && remaining > 0 ? '已签收' : q.shipped === remaining && remaining > 0 ? '已发货' : q.shipped > 0 ? '部分履约' : q.allocated > 0 ? '处理中' : '未开始';
  const active = q.tasks.filter(task => task.status !== 'cancelled');
  const parties = new Set(active.map(task => task.executor));
  const deliveryParty = source.channelType === 'AFN' ? 'Amazon 配送（FBA）' : parties.size > 1 ? '混合配送' : parties.has('amazon') ? 'Amazon 配送（MCF）' : '商家配送';
  return { id: source.id, orderNo: source.number, platformNo: source.sourceId, refNo: active.map(task => task.providerReference ?? task.number).join('、'), channel: source.source === 'manual' ? '手工订单' : source.source, merchant: merchantName, customer: source.customer, region: source.address ? `${source.address.country} / ${source.address.city}` : '地址待补充', itemsSummary: `${q.ordered} 件商品`, itemsDetail: source.lines.map(line => `${line.sku} × ${line.quantity}`), amount: source.paidMinor === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: source.currency }).format(source.paidMinor / 100), status, payment: source.paymentStatus, fulfillment, deliveryParty, fulfillmentChannel: source.channelType, exception: source.migrationBlocked ?? (q.packs.some(pack => pack.confirmation === 'failed') ? '发货回传失败' : ''), orderTime: businessDateTime(source.createdAt) };
}
export function projectOrderDetail(state: OmsSnapshot, source: SalesOrder, merchantName: string): OrderDetail {
  const row = projectOrderRow(state, source, merchantName);
  const q = quantities(state, source);
  const legacy = source.legacyDetail;
  const old = legacy && typeof legacy === 'object' && !Array.isArray(legacy) ? legacy as Partial<OrderDetail> : undefined;
  const oldLines = Array.isArray(old?.lineItems) ? old.lineItems.filter(item => item && typeof item === 'object') : [];
  const oldCustomer = old?.customer && typeof old.customer === 'object' ? old.customer : undefined;
  const historicalComplete = old && Array.isArray(old.lineItems) && old.shippingAddress && old.billingAddress && oldCustomer && ['fulfillments', 'discountCodes', 'transactions', 'refunds', 'events', 'tags'].every(key => Array.isArray(old[key as keyof OrderDetail]));
  if (source.migrationBlocked && historicalComplete) return { ...old, id: source.id } as OrderDetail;
  const format = (minor: number | null) => minor === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: source.currency }).format(minor / 100);
  const address = source.address ? { ...source.address, formatted: [source.address.address1, source.address.city, source.address.province, source.address.zip, source.address.country].join(', ') } : { name: source.customer, phone: '', address1: '', city: '', province: '', country: '', zip: '', formatted: '收货地址待补充' };
  return { ...old, id: source.id, orderNo: source.number, platformOrderNo: source.sourceId, referenceNo: row.refNo, channel: row.channel, merchant: merchantName, deliveryParty: row.deliveryParty, sourceType: source.source === 'manual' ? 'manual' : 'api', status: row.status, financialStatus: source.paymentStatus, fulfillmentStatus: row.fulfillment, exception: row.exception, createdAt: source.createdAt.replace('T', ' ').slice(0, 19), updatedAt: state.events.filter(event => event.entityId === source.id).at(-1)?.at ?? source.createdAt, currency: source.currency, subtotal: format(source.lines.reduce((n, line) => n + (line.unitPriceMinor ?? 0) * line.quantity, 0)), totalDiscount: old?.totalDiscount ?? format(0), totalShipping: old?.totalShipping ?? format(0), totalTax: old?.totalTax ?? format(0), totalPrice: format(source.paidMinor), taxesIncluded: old?.taxesIncluded ?? false, paymentGateway: old?.paymentGateway ?? source.source, discountCodes: old?.discountCodes ?? [],
    lineItems: source.lines.map(line => {
      const shipped = q.packs.reduce((sum, pack) => sum + pack.lines.filter(item => item.lineId === line.id).reduce((n, item) => n + item.quantity, 0), 0);
      const allocated = q.tasks.filter(task => task.status !== 'cancelled').reduce((sum, task) => sum + task.lines.filter(item => item.lineId === line.id).reduce((n, item) => n + item.quantity, 0), 0);
      return { ...oldLines.find(item => item.id === line.id), id: line.id, sku: line.sku, channelSku: line.channelSku, title: line.title, variantTitle: oldLines.find(item => item.id === line.id)?.variantTitle ?? '', quantity: line.quantity, unit: line.unit, unitPrice: format(line.unitPriceMinor), discount: oldLines.find(item => item.id === line.id)?.discount ?? format(0), tax: oldLines.find(item => item.id === line.id)?.tax ?? format(0), subtotal: oldLines.find(item => item.id === line.id)?.subtotal ?? format(line.unitPriceMinor === null ? null : line.unitPriceMinor * line.quantity), fulfillmentStatus: shipped === line.quantity ? '已发货' : shipped > 0 ? '部分履约' : allocated > 0 ? '处理中' : '未开始', fulfillmentNote: `已分配 ${allocated} / 已发货 ${shipped} / 取消 ${line.cancelled}`, weight: oldLines.find(item => item.id === line.id)?.weight ?? 0, requiresShipping: oldLines.find(item => item.id === line.id)?.requiresShipping ?? true, platformLineItemId: line.channelLineId };
    }), customer: { ...(oldCustomer ?? { email: '', acceptsMarketing: false, tags: [] }), name: source.customer, ordersCount: oldCustomer?.ordersCount ?? 1, totalSpent: oldCustomer?.totalSpent ?? format(source.paidMinor) }, shippingAddress: address, billingAddress: old?.billingAddress ?? address, shippingMethod: old?.shippingMethod ?? '待安排配送',
    fulfillments: q.tasks.map(task => { const pack = q.packs.find(item => item.fulfillmentId === task.id); return { id: task.id, fulfillmentOrderNo: task.number, outboundOrderNo: state.outbounds.find(item => item.id === task.outboundId)?.number, outboundStatus: ({allocated:'待拣货',submitted:'待受理',unknown:'待核实',picking:'拣货中',packed:'已打包',withdraw_pending:'撤回中',cancelled:'已取消',shipped:'已出库',delivered:'已签收'})[task.status], status: task.status === 'cancelled' ? 'cancelled' : task.status === 'delivered' ? 'delivered' : task.status === 'shipped' ? 'in_transit' : 'in_progress', carrier: pack?.carrier ?? '待安排', trackingNumber: pack?.tracking ?? '', warehouse: task.executor === 'amazon' ? 'Amazon 配送' : getWarehouseById(task.warehouseId)?.name ?? task.warehouseId, lineItemIds: task.lines.map(line => line.lineId), lineQuantities: task.lines.map(line => ({ lineItemId: line.lineId, quantity: line.quantity })), shippedAt: pack?.shippedAt, deliveredAt: pack?.deliveredAt }; }), transactions: old?.transactions ?? [], refunds: old?.refunds ?? [], events: [...(old?.events ?? []), ...state.events.filter(event => event.entityId === source.id).map(event => ({ id: event.id, time: event.at.replace('T', ' ').slice(0, 19), title: event.description, type: event.type === 'delivery' || event.type === 'shipment' ? 'logistics' as const : 'fulfillment' as const, actor: 'OMS' }))].reverse(), note: source.note, tags: source.tags, platformMeta: { ...old?.platformMeta, fulfillment_channel: source.channelType ?? '', source_order_id: source.sourceId } };
}
