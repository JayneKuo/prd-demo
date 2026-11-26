import { connectionStorageKey, parseConnections, type Connection } from '@/lib/amazon-connections';
import { mockProducts } from '@/lib/mock-data/products';
import type { OrderRow } from '@/lib/mock-data/orders';
import type { Merchant } from '@/lib/tenant-context';
import { mcfLog, type McfOrder, type McfStage } from '@/lib/mcf-workflow';
type DemoOrder = McfOrder;
type Stage = McfStage;
export type Snapshot = { version: 1; orders: DemoOrder[] };
export const stageLabels: Record<Stage, string> = {
  ready: '待选择履约', preview: '配送方案待确认', submitting: 'MCF 提交处理中', created: 'MCF 创建成功',
  unknown: '创建结果未知 · 已锁定', failed: '创建明确失败', processing: 'MCF 处理中',
  cancel_pending: '取消待回执 · 已锁定', cancelled: 'MCF 已确认取消', own: '自有仓待出库', own_withdraw_pending: '自有仓撤回待确认', shipped: '已发货',
};
const sharedProduct = mockProducts[0];
const sharedSku = sharedProduct.variants[0].sku;
const stages = Object.keys(stageLabels);
const sampleShippingAddress = { name: 'Alex Morgan', phone: '+1 206 555 0142', address1: '1201 3rd Avenue, Apt 402', city: 'Seattle', province: 'WA', country: 'US', zip: '98101' };
export const active = (c: Connection, business: 'sales' | 'mcf') => c.identity === 'seller' && c.authorized && c.businesses[business]?.status === 'enabled';
const sourceAllowed = (c: Connection, source: DemoOrder['source']) => c.businesses.mcf?.syncSettings?.orderSources === undefined || c.businesses.mcf.syncSettings.orderSources.includes(source === 'Amazon' ? 'amazon' : 'other');

function seed(connections: Connection[]): DemoOrder[] {
  return connections.flatMap(c => {
    if (!active(c, 'sales') && !active(c, 'mcf')) return [];
    const make = (suffix: string, source: DemoOrder['source'], channel: DemoOrder['channel']): DemoOrder => ({
      id: `${c.id}-${suffix}`, connectionId: c.id, site: c.businesses[source === 'Amazon' ? 'sales' : 'mcf']?.site,
      reference: source === 'Shopify' ? '#US-10428' : `114-2846197-${suffix === 'afn-01' ? '6024101' : suffix === 'mfn-01' ? '6024102' : '6024103'}`,
      shippingAddress: { ...sampleShippingAddress }, addressAccess: 'available',
      itemMapping: source === 'Amazon' ? { externalSku: 'NW-WEP-BLK-US', omsVariantId: sharedProduct.variants[0].id, asin: 'B0C8NW4P21', fnsku: 'X004NWEP01' } : undefined,
      source, channel, sku: sharedSku, qty: 1, stage: channel === 'AFN' ? 'shipped' : 'ready', route: '', service: 'Standard', attempt: 0,
      fulfillmentId: '', carrier: channel === 'AFN' ? 'Amazon Logistics' : '', tracking: channel === 'AFN' ? 'TBA862410350001' : '', shipmentConfirmed: channel === 'AFN',
      history: [mcfLog(channel === 'AFN' ? '同步原生 FBA 订单及只读配送信息' : '订单已接收，等待分配履约路线')],
    });
    const own = make('mfn-02', 'Amazon', 'MFN');
    own.stage = 'own'; own.route = 'own'; own.warehouseProgress = 'picking'; own.warehouseId = 'wh_lax'; own.qty = 2; own.history = [mcfLog('订单已分配自有仓，等待拣货出库')];
    const failedWriteback = { ...make('writeback-01', 'Amazon', 'MFN'), reference: '114-2846197-6024104', stage: 'shipped' as const, route: 'mcf' as const, fulfillmentId: 'MCF-WB-6024104', carrier: 'Amazon Logistics', tracking: 'TBA862410350004', fixtureWritebackFailure: true, package: { id: 'PKG-6024104', quantity: 1, shippedAt: Date.now(), deliveryStatus: 'in_transit' as const }, history: [mcfLog('MCF 包裹已发货，等待原订单发货确认')] };
    return [...(active(c, 'sales') && c.businesses.sales?.syncSettings?.receiveOrders !== false ? [make('afn-01', 'Amazon', 'AFN'), make('mfn-01', 'Amazon', 'MFN'), own, failedWriteback] : []), ...(active(c, 'mcf') && sourceAllowed(c, 'Shopify') ? [make('external-01', 'Shopify', 'MFN')] : [])];
  });
}
function migrateOrder(order: DemoOrder, connections: Connection[]): DemoOrder {
  const display = (value: string) => value.replace(/DEMO-/g, '').replace(/DESK-LAMP-01/g, sharedSku).replace(/USB-C-HUB-07/g, sharedProduct.variants[1].sku).replace(/Demo Customer/g, 'Alex Morgan').replace(/（模拟）|模拟|演示|虚构/g, '');
  const suffix = order.id.endsWith('afn-01') ? '6024101' : order.id.endsWith('mfn-01') ? '6024102' : '6024103';
  const c = connections.find(c => c.id === order.connectionId);
  const isKnownFixture = order.id.startsWith(`${order.connectionId}-`) && ['afn-01', 'mfn-01', 'mfn-02', 'writeback-01', 'external-01'].some(suffix => order.id.endsWith(suffix));
  return { ...order, ...(isKnownFixture && order.source === 'Amazon' && !order.itemMapping && display(order.sku) === sharedSku ? { itemMapping: { externalSku: 'NW-WEP-BLK-US', omsVariantId: sharedProduct.variants[0].id, asin: 'B0C8NW4P21', fnsku: 'X004NWEP01' } } : {}), ...(isKnownFixture && !order.shippingAddress && order.addressAccess !== 'restricted' ? { shippingAddress: { ...sampleShippingAddress }, addressAccess: 'available' as const } : {}), site: order.site ?? c?.businesses[order.source === 'Amazon' ? 'sales' : 'mcf']?.site,
    reference: order.reference.startsWith('DEMO-') ? order.source === 'Shopify' ? '#US-10428' : `114-2846197-${suffix}` : order.reference,
    sku: display(order.sku), carrier: display(order.carrier), tracking: display(order.tracking), history: order.history.map(display) };
}
export function loadMcfSnapshot(key: string, connections: Connection[]): { state: Snapshot; raw: string | null; error: string } {
  try {
    const raw = localStorage.getItem(key);
    const state: Snapshot = raw ? JSON.parse(raw) : { version: 1, orders: [] };
    if (state.version !== 1 || !Array.isArray(state.orders) || !state.orders.every(o =>
      o && typeof o.id === 'string' && typeof o.connectionId === 'string' && typeof o.reference === 'string' &&
      ['Amazon', 'Shopify'].includes(o.source) && ['AFN', 'MFN'].includes(o.channel) && stages.includes(o.stage) &&
      ['', 'own', 'mcf'].includes(o.route) && ['Standard', 'Expedited'].includes(o.service) &&
      Number.isSafeInteger(o.attempt) && o.attempt >= 0 && Number.isSafeInteger(o.qty) && o.qty > 0 &&
      ['sku', 'fulfillmentId', 'carrier', 'tracking'].every(k => typeof o[k as keyof DemoOrder] === 'string') &&
      (o.warehouseId === undefined || typeof o.warehouseId === 'string') && (o.site === undefined || typeof o.site === 'string') &&
      (o.pending === undefined || (['create', 'cancel', 'withdraw'].includes(o.pending.kind) && Number.isFinite(o.pending.requestedAt) && Number.isFinite(o.pending.resolveAt))) &&
      (o.preview === undefined || (['Standard', 'Expedited'].includes(o.preview.service) && Number.isFinite(o.preview.generatedAt) && Number.isFinite(o.preview.expiresAt) && Number.isFinite(o.preview.fee) && ['fingerprint', 'currency', 'deliveryFrom', 'deliveryTo'].every(k => typeof o.preview![k as 'currency'] === 'string'))) &&
      typeof o.shipmentConfirmed === 'boolean' && Array.isArray(o.history) && o.history.every(h => typeof h === 'string')
    ) || new Set(state.orders.map(o => o.id)).size !== state.orders.length) throw new Error('invalid');
    const ids = new Set(state.orders.map(o => o.id));
    return { state: { version: 1, orders: [...state.orders.map(o => migrateOrder(o, connections)), ...seed(connections).filter(o => !ids.has(o.id))] }, raw, error: '' };
  } catch { return { state: { version: 1, orders: [] }, raw: null, error: '无法读取履约记录。为保护已有记录，已禁止操作；请检查浏览器存储后刷新。' }; }
}

export const mcfOrdersChangedEvent = 'mcf-orders-changed';
export const mcfOrdersStorageKey = (companyId: string, merchantId: string) => `${connectionStorageKey(companyId, merchantId)}:sales-demo-v1`;
export const mcfOrderRouteId = (merchantId: string, orderId: string) => `mcf:${merchantId}:${orderId}`;
export function parseMcfOrderRouteId(id: string) {
  let value = id;
  try { value = decodeURIComponent(id); } catch { return null; }
  const match = /^mcf:([^:]+):(.+)$/.exec(value);
  return match ? { merchantId: match[1], orderId: match[2] } : null;
}
export const mcfOrderHref = (merchantId: string, orderId: string) => `/dashboard/orders/${encodeURIComponent(mcfOrderRouteId(merchantId, orderId))}?${new URLSearchParams({ merchant: merchantId })}`;
export type McfOrderRecord = { merchant: Merchant; order: McfOrder; connection: Connection; storageKey: string };
export function projectMcfOrder({ merchant, order: o }: McfOrderRecord): OrderRow {
  const delivered = o.package?.deliveryStatus === 'delivered';
  const status = delivered ? '已完成' : o.stage === 'shipped' ? '已发货' : ['unknown', 'failed'].includes(o.stage) ? '挂起' : ['ready', 'preview', 'cancelled'].includes(o.stage) ? '待处理' : '处理中';
  const fulfillment = delivered ? '已签收' : o.stage === 'shipped' ? '已发货' : ['ready', 'preview', 'failed', 'cancelled'].includes(o.stage) ? '未开始' : '处理中';
  const deliveryParty = o.channel === 'AFN' ? 'Amazon 配送（FBA）' : o.route === 'mcf' && !['cancelled', 'failed'].includes(o.stage) ? 'Amazon 配送（MCF）' : '商家配送';
  return {
    id: mcfOrderRouteId(merchant.id, o.id), orderNo: o.reference, platformNo: o.reference,
    refNo: o.fulfillmentId, channel: o.source, merchant: merchant.name, customer: 'Alex Morgan', region: `${o.site ?? merchant.region} / Seattle`,
    itemsSummary: `${o.qty} 件商品`, itemsDetail: [`${o.sku} × ${o.qty}`], amount: '—', status, payment: '已支付',
    fulfillment, deliveryParty, fulfillmentChannel: o.source === 'Amazon' ? o.channel : undefined,
    exception: o.writeback?.status === 'failed' ? '发货确认回传失败' : o.stage === 'unknown' ? '创建结果未知' : o.stage === 'failed' ? 'MCF 创建失败' : '',
    orderTime: '2026-11-01 08:00',
  };
}
export function commitMcfOrder(storageKey: string, raw: string | null, state: Snapshot, next: McfOrder, expected: McfOrder, connection: Connection) {
  if (state.orders.find(o => o.id === next.id) !== expected || next.id !== expected.id || next.connectionId !== expected.connectionId) throw new Error('订单已变化，请重新检查当前状态。');
  const live = parseConnections(localStorage.getItem(storageKey.replace(/:sales-demo-v1$/, ''))).find(c => c.id === next.connectionId);
  const eligibility = (c: Connection | undefined) => JSON.stringify(c && [c.authorized, c.identity, c.businesses.sales?.status, c.businesses.sales?.site, c.businesses.sales?.syncSettings, c.businesses.mcf?.status, c.businesses.mcf?.site, c.businesses.mcf?.syncSettings]);
  if (!live?.authorized || eligibility(live) !== eligibility(connection)) throw new Error('连接授权或业务配置已变化，操作未生效。请刷新后重新检查前置条件。');
  if (localStorage.getItem(storageKey) !== raw) throw new Error('其他页面已更改履约记录。为避免重复履约，请刷新读取最新状态。');
  const updated: Snapshot = { version: 1, orders: state.orders.map(o => o.id === next.id ? next : o) };
  const serialized = JSON.stringify(updated);
  localStorage.setItem(storageKey, serialized);
  return { state: updated, raw: serialized };
}
