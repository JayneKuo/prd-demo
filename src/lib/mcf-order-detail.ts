import type { OrderDetail, OrderEvent } from '@/lib/mock-data/order-details';
import { mockProducts } from '@/lib/mock-data/products';
import { getWarehouseById } from '@/lib/mock-data/warehouses';
import { projectMcfOrder, type McfOrderRecord } from '@/lib/mcf-orders';

// mcfLog persists zh-CN locale dates; OrderTimeline consumes ISO-like dates.
function historyTime(value: string) {
  const match = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')} ${match[4].padStart(2, '0')}:${match[5]}:${match[6] ?? '00'}` : value;
}

/** View-only adapter. The repository, never the legacy detail reducer, owns these fields. */
export function projectMcfOrderDetail(record: McfOrderRecord): OrderDetail {
  const { order: o, connection } = record;
  const row = projectMcfOrder(record);
  const product = mockProducts.find(p => p.variants.some(v => v.sku === o.sku));
  const variant = product?.variants.find(v => v.sku === o.sku);
  const lineId = `${row.id}:item`;
  const events: OrderEvent[] = o.history.map((entry, i): OrderEvent => {
    const separator = entry.indexOf(' · ');
    const title = separator < 0 ? entry : entry.slice(separator + 3);
    return {
      id: `${row.id}:history:${i}`, time: separator < 0 ? row.orderTime : historyTime(entry.slice(0, separator)),
      title, actor: '履约记录',
      type: /包裹|运单|妥投|发运/.test(title) ? 'logistics' : /履约|MCF|配送|仓|拣|发货/.test(title) ? 'fulfillment' : 'system',
    };
  }).reverse();
  // McfOrder has no monetary or street-address snapshot. Do not invent sales
  // amounts from catalog prices, or reuse an unrelated legacy customer's address.
  const shipping = o.addressAccess !== 'restricted' ? o.shippingAddress : undefined;
  const address = shipping ? { ...shipping, formatted: [shipping.address1, shipping.city, shipping.province, shipping.zip, shipping.country].filter(Boolean).join(', ') } : { name: row.customer, phone: '未提供', address1: '', city: '', province: '', country: '', zip: '', formatted: o.addressAccess === 'restricted' ? '收货地址权限受限' : '收货地址待同步' };
  const hasFulfillment = !['ready', 'preview', 'cancelled', 'failed'].includes(o.stage) && Boolean(o.fulfillmentId || o.route === 'own' || o.tracking || o.package);
  const shipped = o.stage === 'shipped';
  const fulfillmentStatus = row.fulfillment;
  return {
    id: row.id, orderNo: row.orderNo, platformOrderNo: row.platformNo, referenceNo: row.refNo,
    channel: row.channel, merchant: row.merchant, sourceType: 'api', status: row.status,
    financialStatus: row.payment, fulfillmentStatus: row.fulfillment, deliveryParty: row.deliveryParty, exception: row.exception,
    createdAt: row.orderTime, updatedAt: events[0]?.time ?? row.orderTime,
    closedAt: o.deliveredAt ? new Date(o.deliveredAt).toISOString().replace('T', ' ').slice(0, 19) : undefined,
    currency: '', subtotal: row.amount, totalPrice: row.amount, totalShipping: '—', totalTax: '—', totalDiscount: '—',
    taxesIncluded: false, paymentGateway: o.source === 'Amazon' ? 'Amazon' : '未同步', discountCodes: [],
    lineItems: [{ id: lineId, sku: variant?.sku ?? o.sku, channelSku: o.sku, title: product?.title ?? o.sku,
      variantTitle: variant?.options.map(option => option.value).join(' / ') ?? '未映射商品', image: product?.images[variant?.imageIndex ?? 0]?.url,
      quantity: o.qty, unit: '件', unitPrice: '—', discount: '—', tax: '—', subtotal: '—',
      fulfillmentStatus, weight: variant?.weight ?? 0, requiresShipping: true, itemType: 'physical',
    }],
    customer: { name: row.customer, email: '未同步邮箱', ordersCount: 1, totalSpent: '—', tags: [], acceptsMarketing: false },
    shippingAddress: address, billingAddress: { ...address, address1: '未同步账单地址', city: '', province: '', country: '', formatted: '账单地址未同步' },
    shippingMethod: o.channel === 'AFN' ? 'Amazon 原生 FBA / AFN' : o.route === 'mcf' ? `Amazon MCF · ${o.service}` : o.route === 'own' ? '自有仓配送' : '待选择履约路线',
    fulfillments: [...(o.previousFulfillments ?? []).map(previous => ({ id: previous.id, status: 'cancelled', carrier: '', trackingNumber: '', warehouse: getWarehouseById(previous.warehouseId ?? '')?.name ?? '原自有仓', lineItemIds: [lineId], cancelledAt: new Date(previous.cancelledAt).toISOString() })), ...(hasFulfillment ? [{
      id: o.package?.id || o.fulfillmentId || o.id,
      fulfillmentOrderNo: o.fulfillmentId || undefined, packageNo: o.package?.id,
      status: o.package?.deliveryStatus === 'delivered' ? 'delivered' : shipped ? 'in_transit' : o.stage === 'cancelled' ? 'cancelled' : 'in_progress',
      carrier: o.carrier || '待分配', trackingNumber: o.tracking,
      warehouse: o.channel === 'AFN' ? 'Amazon FBA' : o.route === 'mcf' ? 'Amazon MCF' : getWarehouseById(o.warehouseId ?? '')?.name ?? '待分配',
      serviceLevel: o.service, lineItemIds: [lineId],
      shippedAt: o.package ? new Date(o.package.shippedAt).toISOString().replace('T', ' ').slice(0, 19) : undefined,
      deliveredAt: o.deliveredAt ? new Date(o.deliveredAt).toISOString().replace('T', ' ').slice(0, 19) : undefined,
      packages: o.package ? [{ id: o.package.id, no: o.package.id, type: 'carton' as const, lineItemIds: [lineId], note: `${o.package.quantity} 件` }] : undefined,
    }] : [])],
    transactions: [], refunds: [], events, tags: [], fulfillmentType: 'physical',
    platformMeta: { connection: connection.name, fulfillmentChannel: o.channel, site: o.site ?? '未同步', shipmentConfirmation: o.shipmentConfirmed ? '已确认' : o.writeback?.status ?? '未回传' },
  };
}
