import { describe, expect, it } from 'vitest';
import { createAmazonSampleConnections } from './amazon-sample-data';
import { getMerchantsByCompany } from './tenant-context';
import { projectMcfOrder, mcfOrderRouteId, parseMcfOrderRouteId, type McfOrderRecord } from './mcf-orders';
import { projectMcfOrderDetail } from './mcf-order-detail';
import { mcfLog, resolveMcfPending, type McfOrder } from './mcf-workflow';
import { mockProducts } from './mock-data/products';
import { getOrderDetail } from './mock-data/order-details';

const merchant = getMerchantsByCompany('company_northwind').find(m => m.id === 'merchant_us_amazon')!;
const connection = createAmazonSampleConnections().find(c => c.identity === 'seller')!;
function record(patch: Partial<McfOrder> = {}): McfOrderRecord {
  return { merchant, connection, storageKey: 'test', order: {
    id: 'seller-mfn', connectionId: connection.id, reference: '114-2846197-6024102', source: 'Amazon', channel: 'MFN',
    sku: mockProducts[0].variants[0].sku, qty: 2, stage: 'ready', route: '', service: 'Standard', attempt: 0,
    fulfillmentId: '', carrier: '', tracking: '', shipmentConfirmed: false, site: 'US',
    history: [mcfLog('订单已接收', 1000)], ...patch,
  } };
}

describe('MCF orders projected into the existing sales detail schema', () => {
  it('uses the same route, status, customer, amount and quantity as the sales list', () => {
    const r = record(); const row = projectMcfOrder(r); const detail = projectMcfOrderDetail(r);
    expect(detail.id).toBe(row.id);
    expect(detail.orderNo).toBe(row.orderNo);
    expect(detail.platformOrderNo).toBe(row.platformNo);
    expect(detail.status).toBe(row.status);
    expect(detail.financialStatus).toBe(row.payment);
    expect(detail.fulfillmentStatus).toBe(row.fulfillment);
    expect(detail.customer.name).toBe(row.customer);
    expect(detail.totalPrice).toBe(row.amount);
    expect(detail.lineItems[0].quantity).toBe(2);
    expect(detail.lineItems[0].title).toBe(mockProducts[0].title);
    expect(detail.lineItems[0].sku).toBe(mockProducts[0].variants[0].sku);
    expect(detail.lineItems[0].unitPrice).toBe('—');
    expect(detail.shippingAddress.formatted).toBe('收货地址待同步');
    expect(detail.transactions).toEqual([]);
    expect(detail.fulfillments).toEqual([]);
  });
  it('reflects live receipts, actual package and history without retaining old detail state', () => {
    const r = record({ stage: 'processing', route: 'mcf', fulfillmentId: 'MCF-1', localCreatedAt: 1000, processingAt: 2000 });
    const before = projectMcfOrderDetail(r);
    const shipped = resolveMcfPending(r.order, 6000);
    const next = projectMcfOrderDetail({ ...r, order: shipped });
    expect(before.status).toBe('处理中');
    expect(next.status).toBe('已发货');
    expect(next.fulfillments[0].trackingNumber).toBe(shipped.tracking);
    expect(next.fulfillments[0].packageNo).toBe(shipped.package!.id);
    expect(next.fulfillments[0].packages![0].note).toBe('2 件');
    expect(next.events[0].title).toContain(shipped.tracking);
    expect(next.events[0].type).toBe('logistics');
    expect(next.events[0].time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    const delivered = resolveMcfPending(shipped, 22000);
    const final = projectMcfOrderDetail({ ...r, order: delivered });
    expect(final.status).toBe('已完成');
    expect(final.fulfillments[0].status).toBe('delivered');
    expect(final.lineItems[0].fulfillmentStatus).toBe('已签收');
    expect(final.events).toHaveLength(r.order.history.length + 2);
  });
  it('uses standard fulfillment status separately from the delivery party and preserves order after route cancellation', () => {
    const afn = projectMcfOrder(record({ channel: 'AFN', stage: 'shipped' }));
    expect(afn.fulfillment).toBe('已发货');
    expect(afn.deliveryParty).toBe('Amazon 配送（FBA）');
    const cancelled = projectMcfOrder(record({ stage: 'cancelled', route: '' }));
    expect(cancelled.status).toBe('待处理');
    expect(cancelled.fulfillment).toBe('未开始');
  });
  it('shows complete known addresses and explicit restricted-address states', () => {
    const address = { name: 'Alex', phone: '+1 206', address1: '1201 3rd Ave', city: 'Seattle', province: 'WA', country: 'US', zip: '98101' };
    expect(projectMcfOrderDetail(record({ shippingAddress: address })).shippingAddress.formatted).toContain('98101');
    expect(projectMcfOrderDetail(record({ shippingAddress: address, addressAccess: 'restricted' })).shippingAddress.formatted).toBe('收货地址权限受限');
  });
  it('projects native AFN tracking without inventing a package or payment transaction', () => {
    const r = record({ channel: 'AFN', stage: 'shipped', carrier: 'Amazon Logistics', tracking: 'TBA123', shipmentConfirmed: true });
    const detail = projectMcfOrderDetail(r);
    expect(detail.shippingMethod).toContain('原生 FBA');
    expect(detail.fulfillments[0].warehouse).toBe('Amazon FBA');
    expect(detail.fulfillments[0].trackingNumber).toBe('TBA123');
    expect(detail.fulfillments[0].packages).toBeUndefined();
    expect(detail.transactions).toEqual([]);
  });
  it('keeps unknown SKUs honest and does not intercept existing legacy Amazon routes', () => {
    expect(projectMcfOrderDetail(record({ sku: 'UNKNOWN' })).lineItems[0].title).toBe('UNKNOWN');
    expect(parseMcfOrderRouteId(mcfOrderRouteId(merchant.id, 'seller-mfn'))).toEqual({ merchantId: merchant.id, orderId: 'seller-mfn' });
    expect(parseMcfOrderRouteId('so_004')).toBeNull();
    expect(getOrderDetail('so_004')?.channel).toBe('Amazon');
    expect(getOrderDetail('so_001')?.channel).toBe('Shopify');
  });
});
