import { companies, currentTenant, merchants } from '@/lib/tenant-context';
import { orders as originalOrders } from '@/lib/mock-data/orders';
import { getOrderDetail } from '@/lib/mock-data/order-details';
import { outboundOrders as originalOutbounds } from '@/lib/mock-data/outbound';
import { skuInventory, warehouses } from '@/lib/mock-data/warehouses';
import { mockProducts } from '@/lib/mock-data/products';
import { emptySnapshot, type OmsSnapshot, type SalesOrder, type Scope } from './types';

/** Unlike the shell's permissive selectors, persistence never falls back to another tenant. */
export function assertOmsScope(scope: Scope): void {
  if (!scope || scope.tenantId !== currentTenant.id ||
      !companies.some(c => c.id === scope.companyId && c.tenantId === scope.tenantId) ||
      !merchants.some(m => m.id === scope.merchantId && m.companyId === scope.companyId)) {
    throw new Error('OMS requires a concrete, valid tenant/company/merchant scope.');
  }
}

const variants = mockProducts.flatMap(p => p.variants);
function variantId(sku: string) {
  const matches = variants.filter(v => v.sku === sku);
  return matches.length === 1 ? matches[0].id : '';
}
function minor(value: string): number | null {
  const text = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return null;
  const result = Math.round(Number(text) * 100);
  return Number.isSafeInteger(result) ? result : null;
}
function issue(snapshot: OmsSnapshot, source: string, message: string, entityId?: string) {
  snapshot.migrationIssues.push({ id: `migration:${snapshot.migrationIssues.length + 1}`, source, entityId, message, resolved: false });
}
function browserStorage(): Storage | undefined {
  // Access may throw (disabled cookies/private mode). Do not silently discard a legacy workspace.
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

type LegacyMcf = {
  id: string; connectionId: string; reference: string; source: string; channel: 'AFN' | 'MFN';
  sku: string; qty: number; stage: string; route: string; site?: string; warehouseId?: string;
  fulfillmentId?: string; carrier?: string; tracking?: string; shipmentConfirmed?: boolean;
  itemMapping?: { externalSku: string; omsVariantId: string };
  shippingAddress?: SalesOrder['address']; addressAccess?: string;
  package?: { id: string; quantity: number; shippedAt: number; deliveryStatus: string };
};
function isMcf(value: unknown): value is LegacyMcf {
  if (!value || typeof value !== 'object') return false;
  const o = value as LegacyMcf;
  return ['id', 'connectionId', 'reference', 'source', 'sku', 'stage', 'route'].every(k => typeof o[k as keyof LegacyMcf] === 'string') &&
    ['Amazon', 'Shopify'].includes(o.source) && ['AFN', 'MFN'].includes(o.channel) &&
    Number.isSafeInteger(o.qty) && o.qty > 0 && (o.site === undefined || typeof o.site === 'string');
}

/** Pure migration: importing or running this never writes legacy storage or advances timers. */
export function migrateOmsSnapshot(scope: Scope, sources?: Storage): OmsSnapshot {
  assertOmsScope(scope);
  const snapshot = emptySnapshot(scope);
  const merchant = merchants.find(m => m.id === scope.merchantId)!;
  const rows = originalOrders.filter(o => o.merchant === merchant.name);
  for (const row of rows) {
    const detail = getOrderDetail(row.id);
    const order: SalesOrder = {
      ...scope, id: row.id, revision: 0, number: row.orderNo, sourceId: row.platformNo,
      source: row.channel, channelType: row.fulfillmentChannel, createdAt: detail?.createdAt ?? row.orderTime,
      currency: detail?.currency ?? merchant.currency, paidMinor: minor(detail?.totalPrice ?? row.amount),
      paymentStatus: detail?.financialStatus ?? row.payment, customer: row.customer,
      address: detail ? { ...detail.shippingAddress } : null,
      lines: (detail?.lineItems ?? []).map(line => ({ id: line.id,
        channelLineId: line.platformLineItemId ?? line.id, channelSku: line.channelSku ?? '',
        omsVariantId: variantId(line.sku), sku: line.sku, title: line.title, quantity: line.quantity,
        cancelled: row.status === '已取消' ? line.quantity : 0, unit: line.unit ?? '件', unitPriceMinor: minor(line.unitPrice),
        ...(variantId(line.sku) ? { mappingSnapshot: { channelSku: line.channelSku ?? line.sku, omsVariantId: variantId(line.sku) } } : {}) })),
      note: detail?.note ?? '', tags: [...(detail?.tags ?? [])], legacyDetail: detail ? structuredClone(detail) : { ...row },
    };
    const active = (detail?.fulfillments ?? []).length > 0 ||
      !['未开始', '已取消'].includes(row.fulfillment) ||
      originalOutbounds.some(o => o.sourceNo === row.orderNo && o.merchant === merchant.name);
    if (!detail || active || detail.fulfillmentType && detail.fulfillmentType !== 'physical') {
      order.migrationBlocked = !detail ? '原始订单缺少结构化商品行，禁止根据摘要推断数量。' :
        active ? '历史履约缺少逐行明确数量，需人工核对后解除锁定；未自动补建或重放库存扣减。' : '非实物履约保留原始档案，需专用流程处理。';
      issue(snapshot, 'original-orders', order.migrationBlocked, order.id);
    }
    snapshot.orders.push(order);
  }
  // These are opening balances, not receipt/ship events. Legacy reservations remain held;
  // their unknown ownership must never become new cancellable reservations.
  for (const stock of skuInventory) {
    snapshot.stocks.push({ ...scope, id: `stock:${stock.warehouseId}:${stock.sku}`, revision: 0,
      warehouseId: stock.warehouseId, sku: stock.sku, pool: 'warehouse',
      onHand: stock.available + stock.reserved, reserved: stock.reserved, unfulfillable: 0 });
  }
  snapshot.archives['original-orders'] = JSON.stringify(rows);
  snapshot.archives['original-order-details'] = JSON.stringify(Object.fromEntries(rows.map(r => [r.id, getOrderDetail(r.id) ?? null])));
  snapshot.archives['original-outbounds'] = JSON.stringify(originalOutbounds.filter(o => o.merchant === merchant.name));
  snapshot.archives['original-warehouses'] = JSON.stringify({ warehouses, skuInventory });
  snapshot.migratedSources.push('original-orders', 'original-order-details', 'original-outbounds', 'original-warehouses');

  const storage = sources ?? browserStorage();
  if (!storage) return snapshot;
  const mcfKey = `amazon-oms-v1:${scope.companyId}:${scope.merchantId}:sales-demo-v1`;
  const vendorKey = `amazon-oms-business-demo-v1:${scope.companyId}:${scope.merchantId}`;
  for (const key of [mcfKey, vendorKey]) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    snapshot.archives[key] = raw;
    snapshot.migratedSources.push(key);
    if (key === vendorKey) {
      issue(snapshot, key, 'Vendor/FBA 工作区已原样归档；未将 PO、ASN 或计时器状态臆造为销售订单/库存关联。');
      continue;
    }
    let parsed: { version?: unknown; orders?: unknown };
    try { parsed = JSON.parse(raw); } catch {
      issue(snapshot, key, '旧 MCF 快照无法解析，原始值已保留，禁止自动恢复或重置。');
      continue;
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.orders) || !parsed.orders.every(isMcf)) {
      issue(snapshot, key, '旧 MCF 快照结构损坏，原始值已保留，未迁移为可操作记录。');
      continue;
    }
    const identities = new Set<string>();
    for (const old of parsed.orders as LegacyMcf[]) {
      const identity = `${old.source}:${old.connectionId}:${old.site ?? ''}:${old.reference}`;
      if (identities.has(identity)) { issue(snapshot, key, `重复外部身份 ${identity}，未复制第二个聚合。`); continue; }
      identities.add(identity);
      // A matching original requires all external identity components. A similar SKU,
      // customer, reference suffix, or timestamp is deliberately not a match.
      const original = snapshot.orders.find(o => o.source === old.source && o.sourceId === old.reference &&
        o.connectionId === old.connectionId && o.site === old.site);
      if (original) { issue(snapshot, key, '相同外部身份已存在，旧履约仅归档，未覆盖原始订单。', original.id); continue; }
      const ambiguous = snapshot.orders.filter(o => o.source === old.source && o.sourceId === old.reference && (!o.connectionId || !o.site || !old.site));
      if (ambiguous.length) {
        for (const order of ambiguous) order.migrationBlocked = '旧 MCF 与原始订单外部单号相同，但缺少连接/站点证据，需人工确认身份。';
        issue(snapshot, key, `外部身份不完整，未新建可能重复订单 ${old.reference}。`, ambiguous[0].id);
        continue;
      }
      const id = `mcf:${scope.merchantId}:${old.id}`;
      if (snapshot.orders.some(o => o.id === id)) { issue(snapshot, key, `重复旧记录 ID ${old.id}，未复制聚合。`); continue; }
      const lineId = `${id}:line:1`;
      const order: SalesOrder = { ...scope, id, revision: 0, number: old.reference, sourceId: old.reference,
        source: old.source, connectionId: old.connectionId, site: old.site, channelType: old.channel,
        createdAt: '', currency: merchant.currency, paidMinor: null, paymentStatus: '已支付',
        customer: old.shippingAddress?.name ?? '', address: old.addressAccess === 'restricted' ? null : old.shippingAddress ?? null,
        lines: [{ id: lineId, channelLineId: lineId, channelSku: old.itemMapping?.externalSku ?? '',
          omsVariantId: old.itemMapping?.omsVariantId ?? variantId(old.sku), sku: old.sku, title: old.sku,
          quantity: old.qty, cancelled: 0, unit: '件', unitPriceMinor: null,
          ...(old.itemMapping ? { mappingSnapshot: { channelSku: old.itemMapping.externalSku, omsVariantId: old.itemMapping.omsVariantId } } : {}) }],
        note: '', tags: [], legacyDetail: structuredClone(old) };
      // Ready/preview/failed/cancelled have no live route. Any active legacy route
      // stays blocked: timer outcomes and package-only data are not quantity ledgers.
      if (!old.connectionId || !old.site || !old.reference || !['ready', 'preview', 'failed', 'cancelled'].includes(old.stage)) {
        order.migrationBlocked = !old.connectionId || !old.site || !old.reference ? '旧订单外部身份缺少连接、站点或来源单号，需人工核对。' : '旧履约执行状态待核对，禁止计时器补单或重放历史库存。';
        issue(snapshot, key, order.migrationBlocked, id);
      }
      snapshot.orders.push(order);
    }
  }
  return snapshot;
}
