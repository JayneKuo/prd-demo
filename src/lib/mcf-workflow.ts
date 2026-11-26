import type { Connection, ProductMapping } from '@/lib/amazon-connections';
import { mockProducts } from '@/lib/mock-data/products';

export type McfStage = 'ready' | 'preview' | 'submitting' | 'created' | 'unknown' | 'failed' | 'processing' | 'cancel_pending' | 'cancelled' | 'own' | 'own_withdraw_pending' | 'shipped';
export type McfOrder = {
  id: string; connectionId: string; reference: string; source: 'Amazon' | 'Shopify';
  channel: 'AFN' | 'MFN'; sku: string; qty: number; stage: McfStage;
  route: '' | 'own' | 'mcf'; service: 'Standard' | 'Expedited'; attempt: number;
  fulfillmentId: string; carrier: string; tracking: string; shipmentConfirmed: boolean;
  warehouseId?: string; site?: string; history: string[];
  /** 建单时已确认的商品对应关系，配送切换沿用此快照 */
  itemMapping?: ProductMapping;
  shippingAddress?: { name: string; phone: string; address1: string; city: string; province: string; country: string; zip: string };
  addressAccess?: 'available' | 'restricted';
  preview?: McfPreview;
  pending?: { kind: 'create' | 'cancel' | 'withdraw'; requestedAt: number; resolveAt: number };
  warehouseProgress?: 'allocated' | 'picking' | 'packed' | 'handed_over';
  previousFulfillments?: { id: string; warehouseId?: string; status: 'cancelled'; cancelledAt: number }[];
  withdrawalConfirmedAt?: number;
  localCreatedAt?: number;
  processingAt?: number;
  deliveredAt?: number;
  writeback?: { status: 'pending' | 'failed' | 'completed'; submittedAt: number; attempts: number; error?: string };
  package?: { id: string; quantity: number; shippedAt: number; deliveryStatus: 'in_transit' | 'delivered' };
  fixtureWritebackFailure?: boolean;
};
export type McfPreview = {
  service: McfOrder['service']; generatedAt: number; expiresAt: number;
  fingerprint: string; currency: string; fee: number; deliveryFrom: string; deliveryTo: string;
};
export type McfRequirement = { id: string; ok: boolean; text: string; href?: string; repair?: string };
export const mcfLog = (text: string, now = Date.now()) => `${new Date(now).toLocaleString('zh-CN')} · ${text}`;
const variants = mockProducts.flatMap(p => p.variants);

// Exact channel SKU wins. Legacy orders contain an OMS SKU; only an unambiguous
// reverse match is safe, otherwise the operator must repair the shared mapping.
export function resolveMcfMapping(sku: string, mappings: ProductMapping[]) {
  const exact = mappings.find(m => m.externalSku === sku);
  if (exact) return variants.some(v => v.id === exact.omsVariantId) ? exact : undefined;
  const matches = mappings.filter(m => variants.some(v => v.id === m.omsVariantId && v.sku === sku));
  return matches.length === 1 ? matches[0] : undefined;
}

export function mcfRequirements(o: McfOrder, c: Connection, mappings: { sales?: ProductMapping; mcf?: ProductMapping; error?: string }, writable: boolean, returnTo = `/dashboard/orders?${new URLSearchParams({ fulfillmentOrder: o.id })}`): McfRequirement[] {
  const context = { order: o.id, orderReference: o.reference, returnTo };
  const config = (business: 'sales' | 'mcf') => `/dashboard/apps/amazon?${new URLSearchParams({ connection: c.id, tab: 'business', business, configure: '1', ...context })}`;
  const site = o.site || c.businesses.sales?.site || c.businesses.mcf?.site;
  const sitesByRegion: Record<string, string[]> = { NA: ['US', 'CA', 'MX'], EU: ['UK', 'DE', 'FR'], FE: ['JP', 'AU', 'SG'] };
  const validSite = Boolean(site && sitesByRegion[c.region]?.includes(site));
  const sourceAllowed = c.businesses.mcf?.syncSettings?.orderSources?.includes(o.source === 'Amazon' ? 'amazon' : 'other') ?? true;
  const routeFree = ['ready', 'failed', 'cancelled', 'preview'].includes(o.stage) && !o.tracking && !o.shipmentConfirmed && o.route !== 'own' && !o.pending && (o.route !== 'mcf' || o.stage === 'cancelled' || o.stage === 'failed');
  const orderMapping = o.source === 'Amazon' && o.itemMapping && variants.some(variant => variant.id === o.itemMapping?.omsVariantId) ? o.itemMapping : undefined;
  const mappingValid = Boolean(orderMapping || (mappings.mcf && !mappings.error && (o.source !== 'Amazon' || mappings.sales?.omsVariantId === mappings.mcf.omsVariantId)));
  return [
    { id: 'permission', ok: writable, text: writable ? '当前角色和存储允许操作' : '当前角色无订单写权限，或履约存储已锁定；请联系管理员或按存储提示刷新' },
    { id: 'authorization', ok: c.identity === 'seller' && c.authorized, text: c.authorized && c.identity === 'seller' ? 'Seller 授权有效' : '必须恢复本 Seller 连接授权', href: `/dashboard/apps/amazon?${new URLSearchParams({ connection: c.id, tab: 'authorization', ...context })}`, repair: '恢复账号授权' },
    { id: 'sales', ok: o.source !== 'Amazon' || c.businesses.sales?.status === 'enabled', text: o.source !== 'Amazon' ? '外部渠道订单，无需销售业务' : c.businesses.sales?.status === 'enabled' ? '销售订单业务已启用' : '销售订单业务未启用或已暂停', href: config('sales'), repair: '启用销售订单业务' },
    { id: 'business', ok: c.businesses.mcf?.status === 'enabled', text: c.businesses.mcf?.status === 'enabled' ? 'MCF 配送业务已启用' : 'MCF 配送业务未启用或已暂停', href: config('mcf'), repair: '启用 MCF 配送' },
    { id: 'writeback', ok: o.source !== 'Amazon' || c.businesses.sales?.syncSettings?.shipmentWriteback !== false, text: o.source !== 'Amazon' ? '外部渠道仅保存配送跟踪，不调用销售发货确认' : c.businesses.sales?.syncSettings?.shipmentWriteback === false ? '销售发货确认回传已关闭，切换 MCF 前必须开放回传' : '销售发货确认回传已开放', href: config('sales'), repair: '开启发货确认回传' },
    { id: 'source', ok: sourceAllowed, text: sourceAllowed ? `MCF 允许 ${o.source} 订单来源` : `MCF 未允许 ${o.source} 订单来源`, href: config('mcf'), repair: '修改 MCF 允许来源' },
    { id: 'site', ok: Boolean(validSite && c.businesses.mcf?.site === site && (o.source !== 'Amazon' || c.businesses.sales?.site === site)), text: `订单站点 ${site || '未记录'} / MCF ${c.businesses.mcf?.site || '未配置'}；必须使用原 Seller 同站点`, href: config('mcf'), repair: '核对 MCF 适用站点' },
    { id: 'mapping', ok: mappingValid, text: orderMapping ? '沿用订单建单时已确认的商品对应关系' : mappings.error || (mappingValid ? `商品已对应：${mappings.mcf?.externalSku} → ${variants.find(v => v.id === mappings.mcf?.omsVariantId)?.sku}` : `SKU ${o.sku} 缺失有效或唯一映射，或销售与 MCF 商品不一致`), href: `/dashboard/product-mapping?${new URLSearchParams({ amazonConnection: c.id, amazonBusiness: 'mcf', site: c.businesses.mcf?.site ?? site ?? '', sku: o.sku, ...context })}`, repair: '修复此连接 / 站点商品映射' },
    { id: 'address', ok: o.addressAccess !== 'restricted' && Boolean(o.shippingAddress && ['name', 'address1', 'city', 'country', 'zip'].every(key => o.shippingAddress![key as keyof NonNullable<McfOrder['shippingAddress']>]?.trim())), text: o.addressAccess === 'restricted' ? '收货地址权限受限，请检查订单地址访问权限' : o.shippingAddress ? '已取得用于配送的收件地址' : '缺少完整收件地址，不能创建配送' },
    { id: 'eligibility', ok: o.channel === 'MFN', text: o.channel === 'MFN' ? 'MFN 订单可评估 MCF' : 'AFN 原生 FBA 仅可跟踪，不可切换 MCF' },
    { id: 'route', ok: routeFree, text: routeFree ? '无生效中的履约任务或已发货包裹' : o.stage === 'own' ? '自有仓任务已下发；须请求撤回并获得确认后才能切换 MCF' : o.stage === 'own_withdraw_pending' ? '自有仓撤回等待确认；原路线仍锁定，禁止创建 MCF' : o.stage === 'unknown' ? '创建结果未知，须按原参考号核实；不可重建或转仓' : o.stage === 'cancel_pending' ? 'MCF 取消待回执；确认取消前不可切换路线' : '订单已提交履约或已发货，禁止重复建单；请跟踪原任务' },
  ];
}

export function mcfFingerprint(o: McfOrder, c: Connection, mapping: ProductMapping): string {
  return JSON.stringify([o.connectionId, o.site, o.sku, o.qty, o.source, o.shippingAddress, o.addressAccess, c.businesses.sales?.site, c.businesses.mcf?.site, mapping]);
}
export function buildMcfPreview(o: McfOrder, c: Connection, mapping: ProductMapping, service: McfOrder['service'], now = Date.now()): McfPreview {
  const site = c.businesses.mcf?.site ?? 'US';
  const rates: Record<string, [string, number, number]> = { US: ['USD', 6.5, 9.8], CA: ['CAD', 8.9, 13.4], MX: ['MXN', 130, 196], UK: ['GBP', 5.2, 7.8], DE: ['EUR', 6.1, 9.2], FR: ['EUR', 6.1, 9.2], JP: ['JPY', 820, 1230], AU: ['AUD', 10, 15], SG: ['SGD', 8.7, 13.1] };
  const [currency, standard, expedited] = rates[site] ?? rates.US;
  const day = (days: number) => { const date = new Date(now); let remaining = days; while (remaining > 0) { date.setDate(date.getDate() + 1); if (date.getDay() !== 0 && date.getDay() !== 6) remaining--; } return date.toISOString().slice(0, 10); };
  return { service, generatedAt: now, expiresAt: now + 10 * 60_000, fingerprint: mcfFingerprint(o, c, mapping), currency, fee: Math.round((service === 'Standard' ? standard : expedited) * o.qty * 100) / 100, deliveryFrom: day(service === 'Standard' ? 3 : 2), deliveryTo: day(service === 'Standard' ? 5 : 2) };
}

/** Local receipt adapter. Persisted timestamps make delivery and writeback resumable. */
export function resolveMcfPending(o: McfOrder, now = Date.now()): McfOrder {
  if (o.stage === 'created' && o.localCreatedAt && now - o.localCreatedAt >= 2000) return { ...o, stage: 'processing', processingAt: now, history: [...o.history, mcfLog('配送任务已受理，正在拣配', now)] };
  if (o.stage === 'processing' && o.localCreatedAt && !o.processingAt) return { ...o, processingAt: now };
  if (o.stage === 'processing' && o.processingAt && now - o.processingAt >= 3500) {
    const tracking = `TBA${String(o.localCreatedAt ?? o.processingAt).slice(-12)}`;
    return { ...o, stage: 'shipped', carrier: 'Amazon Logistics', tracking, package: { id: `PKG-${o.fulfillmentId}`, quantity: o.qty, shippedAt: now, deliveryStatus: 'in_transit' }, history: [...o.history, mcfLog(`包裹已发运：${tracking}，等待回传原订单`, now)] };
  }
  if (o.stage === 'shipped' && o.writeback?.status === 'pending' && now - o.writeback.submittedAt >= 1400) {
    if (o.fixtureWritebackFailure && o.writeback.attempts === 1) return { ...o, writeback: { ...o.writeback, status: 'failed', error: '发货确认服务暂时不可用，请重试回传；包裹已发货，不得重新配送。' }, history: [...o.history, mcfLog('发货确认回传失败，原包裹保持不变', now)] };
    return { ...o, shipmentConfirmed: true, writeback: { ...o.writeback, status: 'completed', error: undefined }, history: [...o.history, mcfLog(`原订单发货确认成功：${o.tracking}`, now)] };
  }
  if (o.stage === 'shipped' && o.package?.deliveryStatus === 'in_transit' && now - o.package.shippedAt >= 15000) return { ...o, deliveredAt: now, package: { ...o.package, deliveryStatus: 'delivered' }, history: [...o.history, mcfLog('包裹已妥投', now)] };
  if (!o.pending || now < o.pending.resolveAt) return o;
  const finish = (patch: Partial<McfOrder>, text: string): McfOrder => ({ ...o, ...patch, pending: undefined, history: [...o.history, mcfLog(text, now)] });
  if (o.pending.kind === 'create' && o.stage === 'submitting') return finish({ stage: 'created', localCreatedAt: now }, `配送创建成功：${o.fulfillmentId}；等待拣配发运`);
  if (o.pending.kind === 'cancel' && o.stage === 'cancel_pending' && o.localCreatedAt && !o.tracking && !o.shipmentConfirmed) return finish({ stage: 'cancelled', route: '', carrier: '', tracking: '', preview: undefined }, 'MCF 取消已确认，释放原履约路线，可重新分配');
  if (o.pending.kind === 'withdraw' && o.stage === 'own_withdraw_pending' && !o.tracking && !o.shipmentConfirmed && o.warehouseProgress !== 'handed_over') return finish({ stage: 'ready', route: '', warehouseId: undefined, carrier: '', tracking: '', warehouseProgress: undefined, previousFulfillments: [...(o.previousFulfillments ?? []), { id: `OWN-${o.id}-${o.previousFulfillments?.length ?? 0}`, warehouseId: o.warehouseId, status: 'cancelled', cancelledAt: now }], withdrawalConfirmedAt: now, preview: undefined }, '自有仓任务撤回已确认，原任务关闭；允许重新选择履约路线');
  return o;
}
