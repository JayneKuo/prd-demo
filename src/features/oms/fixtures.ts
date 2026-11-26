import { mockProducts } from '@/lib/mock-data/products';
import type { OmsSnapshot, SalesOrder } from './types';

/** Add explicitly labelled deadline examples once; never extend deadlines on refresh. */
export function ensureShippingDeadlineExamples(snapshot: OmsSnapshot, now: number): OmsSnapshot {
  if (snapshot.merchantId !== 'merchant_us_amazon' || snapshot.migratedSources.includes('shipping-deadline-demo-v1')) return snapshot;
  const state = structuredClone(snapshot);
  const hours: Record<string, number> = { 'amazon-order-1': 48, 'amz-scene-ready': 8, 'amz-scene-picking': 2, 'amz-scene-partial': -2, 'amz-scene-mapping': 12, 'amz-scene-stock': -24 };
  for (const order of state.orders) if (!order.shipBy && hours[order.id] !== undefined) {
    order.shipBy = new Date(now + hours[order.id] * 3600000).toISOString(); order.shipDeadlineSource = 'demo'; order.revision++;
  }
  state.migratedSources.push('shipping-deadline-demo-v1');
  return state;
}

/** New, explicitly sourced fixtures; historical migration never fabricates missing documents. */
export function ensureCanonicalFixtures(snapshot: OmsSnapshot): OmsSnapshot {
  if (snapshot.merchantId !== 'merchant_us_amazon' || snapshot.migratedSources.includes('canonical-fixtures-v1')) return snapshot;
  const state = structuredClone(snapshot);
  const envelope = { tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, revision: 1 };
  const products = mockProducts.slice(0, 2).map(product => ({ product, variant: product.variants[0] }));
  for (const [index, channelType] of ['MFN', 'AFN'].entries()) {
    const id = `amazon-order-${index + 1}`;
    if (state.orders.some(order => order.id === id)) continue;
    const source: SalesOrder = { ...envelope, id, number: `SO-20261104-000${index + 1}`, sourceId: `114-6110400-900000${index + 1}`, source: 'Amazon', connectionId: 'amz-northwind-seller-na', site: 'US', channelType: channelType as 'MFN' | 'AFN', createdAt: '2026-11-04T08:00:00Z', currency: 'USD', paidMinor: index === 0 ? 51994 : 17998, paymentStatus: '已支付', customer: index === 0 ? 'Alex Morgan' : 'Taylor Lee', address: { name: index === 0 ? 'Alex Morgan' : 'Taylor Lee', phone: '+1 206 555 0142', address1: '1201 3rd Avenue, Apt 402', city: 'Seattle', province: 'WA', zip: '98101', country: 'US' }, note: '', tags: [], lines: products.slice(0, index === 0 ? 2 : 1).map(({ product, variant }, lineIndex) => ({ id: `${id}:line:${lineIndex + 1}`, channelLineId: `AMZ-LINE-${index}-${lineIndex}`, channelSku: lineIndex === 0 ? 'NW-WEP-BLK-US' : 'NW-TP-BLK-STD', omsVariantId: variant.id, sku: variant.sku, title: product.title, quantity: index === 0 ? lineIndex === 0 ? 4 : 2 : 2, cancelled: 0, unit: '件', unitPriceMinor: Math.round(variant.price * 100), mappingSnapshot: { channelSku: lineIndex === 0 ? 'NW-WEP-BLK-US' : 'NW-TP-BLK-STD', omsVariantId: variant.id } })) };
    state.orders.push(source);
  }
  for (const { variant } of products) {
    const id = `fba:amz-northwind-seller-na:US:${variant.sku}`;
    if (!state.stocks.some(stock => stock.id === id)) state.stocks.push({ ...envelope, id, warehouseId: '', sku: variant.sku, pool: 'fba', connectionId: 'amz-northwind-seller-na', site: 'US', onHand: 300, reserved: 0, unfulfillable: 5 });
  }
  const afn = state.orders.find(order => order.id === 'amazon-order-2')!;
  const taskId = 'afn:amazon-order-2:fulfillment';
  if (!state.fulfillments.some(task => task.id === taskId)) {
    const lines = afn.lines.map(line => ({ lineId: line.id, quantity: line.quantity }));
    state.fulfillments.push({ ...envelope, id: taskId, orderId: afn.id, number: 'AFN-61104002', executor: 'amazon', warehouseId: '', connectionId: afn.connectionId, site: 'US', lines, status: 'shipped', reservations: [], submittedAt: '2026-11-04T08:00:00Z', providerReference: 'AFN-61104002' });
    state.packages.push({ ...envelope, id: `${taskId}:package`, fulfillmentId: taskId, orderId: afn.id, number: 'PKG-AFN-61104002', carrier: 'Amazon Logistics', tracking: 'TBA611040000002', lines, shippedAt: '2026-11-04T08:00:00Z', confirmation: 'not_required' });
    state.jobs.push({ id: `${taskId}:delivery`, kind: 'deliver', targetId: `${taskId}:package`, dueAt: Date.now() + 30000, status: 'queued', attempts: 0, causationId: 'afn-opening-observation' });
  }
  state.migratedSources.push('canonical-fixtures-v1');
  return state;
}
