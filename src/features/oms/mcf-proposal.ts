import type { Connection } from '@/lib/amazon-connections';
import { availableToAllocate } from './commands';
import type { ItemQuantity, OmsSnapshot, OrderLine, SalesOrder, Scope } from './types';

export type McfService = 'Standard' | 'Expedited';
export type McfProposalLine = ItemQuantity & {
  /** Seller SKU on the original Amazon order, never an OMS SKU substitution. */
  externalSku: string;
  channelSku: string;
  mappingSnapshot: NonNullable<OrderLine['mappingSnapshot']>;
};
export type McfProposal = {
  id: string; orderId: string; connectionId: string; site: string; service: McfService;
  currency: string; feeMinor: number; arrivalFrom: string; arrivalTo: string;
  expiresAt: number; fingerprint: string; lines: McfProposalLine[];
  targetMappings?: { omsVariantId: string; externalSku: string }[];
};

const lifetime = 10 * 60 * 1000;
const day = 24 * 60 * 60 * 1000;
/** Local planning estimates, not a carrier quote or a network response. Amounts are minor units. */
const feeFixtures: Record<string, { currency: string; Standard: number; Expedited: number }> = {
  US: { currency: 'USD', Standard: 650, Expedited: 950 },
  CA: { currency: 'CAD', Standard: 850, Expedited: 1250 },
  MX: { currency: 'MXN', Standard: 11000, Expedited: 17000 },
  UK: { currency: 'GBP', Standard: 450, Expedited: 650 },
  DE: { currency: 'EUR', Standard: 550, Expedited: 800 },
  FR: { currency: 'EUR', Standard: 550, Expedited: 800 },
  JP: { currency: 'JPY', Standard: 550, Expedited: 850 },
  AU: { currency: 'AUD', Standard: 900, Expedited: 1300 },
  SG: { currency: 'SGD', Standard: 650, Expedited: 950 },
};

// Two independent 32-bit passes keep API identifiers bounded even for long canonical IDs.
function hash(text: string): string {
  let a = 2166136261;
  let b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
function sameScope(a: Scope, b: Scope) {
  return a.tenantId === b.tenantId && a.companyId === b.companyId && a.merchantId === b.merchantId;
}
function text(value: string, label: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label}不能为空且不得超过 ${max} 个字符`);
}
function sourceOrder(state: OmsSnapshot, orderId: string): SalesOrder {
  if (!state.merchantId || state.merchantId === 'all') throw new Error('请选择具体商家后查询 MCF 配送方案');
  const order = state.orders.find(item => item.id === orderId && sameScope(item, state));
  if (!order) throw new Error('订单不存在或不属于当前商家');
  if (order.archived || order.migrationBlocked) throw new Error('订单已关闭或待补全，不能创建 MCF 配送');
  if (order.channelType === 'AFN' || ['vendor_df', 'vendor_retail', 'internal_transfer'].includes(order.source)) throw new Error('该来源不能创建客户 FBA 配送，AFN 订单由平台履约');
  if (order.source === 'Amazon' && (!order.connectionId || !order.site || order.channelType !== 'MFN')) throw new Error('Amazon 订单缺少原始账号、站点或 MFN 类型');
  const address = order.address;
  if (!address) throw new Error('请补全收件地址后查询配送方案');
  text(address.name, '收件人姓名', 50);
  text(address.address1, '收件地址', 180);
  text(address.city, '收件城市', 50);
  text(address.province, '收件省州', 150);
  text(address.zip, '收件邮编', 20);
  text(address.country, '收件国家代码', 2);
  if (!/^[A-Z]{2}$/.test(address.country)) throw new Error('收件国家须为两位大写国家代码');
  text(address.phone, '收件电话', 20);
  const country = order.site === 'UK' ? 'GB' : order.site;
  if (order.source === 'Amazon' && address.country !== country) throw new Error('收件国家与 FBA 配送站点不匹配');
  if (!Number.isFinite(Date.parse(order.createdAt))) throw new Error('订单日期无效');
  return order;
}
function checkConnection(order: SalesOrder, connection: Connection) {
  if (connection.identity !== 'seller' || !connection.authorized) throw new Error('请选择已授权的 Seller 账号');
  const mcf = connection.businesses.mcf;
  if (mcf?.status !== 'enabled') throw new Error('当前账号的 MCF 配送业务未启用');
  if (order.source === 'Amazon' && (connection.id !== order.connectionId || mcf.site !== order.site)) throw new Error('Amazon 订单须使用原始账号和相同站点的配送');
  if (order.address?.country !== (mcf.site === 'UK' ? 'GB' : mcf.site)) throw new Error('收件国家与 FBA 配送站点不匹配');
  if (mcf.syncSettings && !mcf.syncSettings.orderSources.includes(order.source === 'Amazon' ? 'amazon' : 'other')) throw new Error('FBA 配送未开放此订单来源');
  const sites: Record<string, string[]> = { NA: ['US', 'CA', 'MX'], EU: ['UK', 'DE', 'FR'], FE: ['JP', 'AU', 'SG'] };
  if (!sites[connection.region]?.includes(mcf.site)) throw new Error('MCF 配送站点与账号区域不匹配');
}
function quote(state: OmsSnapshot, order: SalesOrder, quantities: ItemQuantity[], service: McfService, now: number, target?: Pick<McfProposal, 'connectionId' | 'site' | 'targetMappings'>): McfProposal {
  const connectionId = target?.connectionId ?? order.connectionId!;
  const site = target?.site ?? order.site!;
  if (order.address?.country !== (site === 'UK' ? 'GB' : site)) throw new Error('收件国家与 FBA 配送站点不匹配');
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now + lifetime).getTime())) throw new Error('配送方案查询时间无效');
  if (service !== 'Standard' && service !== 'Expedited') throw new Error('请选择标准配送或加急配送');
  if (!quantities.length || quantities.length > 100 || new Set(quantities.map(line => line.lineId)).size !== quantities.length) throw new Error('请选择 1 至 100 个不重复的订单行');
  const units = quantities.reduce((sum, line) => sum + line.quantity, 0);
  if (units > 250) throw new Error('每次 MCF 配送最多支持 250 件商品');
  const lines: McfProposalLine[] = quantities.map(item => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error('配送数量必须为正整数');
    const line = order.lines.find(line => line.id === item.lineId);
    if (!line) throw new Error('配送商品不属于当前订单');
    if (!line.omsVariantId || !line.sku || !line.mappingSnapshot || line.mappingSnapshot.omsVariantId !== line.omsVariantId) throw new Error('订单商品尚未完成 OMS 商品识别');
    // Historical order mapping is authoritative. No new product-mapping setup is needed.
    const mappings = target?.targetMappings?.filter(mapping => mapping.omsVariantId === line.omsVariantId) ?? [];
    if (order.source !== 'Amazon' && mappings.length !== 1) throw new Error(`${line.sku} 缺少唯一的 Amazon Seller SKU 对应关系，请在 APP 商品映射中配置`);
    const externalSku = order.source === 'Amazon' ? line.channelSku : mappings[0].externalSku;
    text(externalSku, '发货 Seller SKU', 50);
    if (item.quantity > availableToAllocate(state, order.id, line.id)) throw new Error('配送数量超过订单当前剩余可分配数量');
    return { lineId: line.id, quantity: item.quantity, externalSku, channelSku: line.channelSku, mappingSnapshot: { ...line.mappingSnapshot } };
  }).sort((a, b) => a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0);
  const wanted = new Map<string, number>();
  for (const line of lines) {
    const sku = order.lines.find(item => item.id === line.lineId)!.sku;
    wanted.set(sku, (wanted.get(sku) ?? 0) + line.quantity);
  }
  const pools = [...wanted.keys()].sort().map(sku => {
    const stock = state.stocks.find(item => sameScope(item, state) && item.pool === 'fba' && item.connectionId === connectionId && item.site === site && item.sku === sku);
    if (!stock || ![stock.onHand, stock.reserved, stock.unfulfillable].every(n => Number.isSafeInteger(n) && n >= 0) || stock.onHand - stock.reserved - stock.unfulfillable < wanted.get(sku)!) throw new Error(`${sku} 的 FBA 可配送库存不足`);
    return { id: stock.id, sku, onHand: stock.onHand, reserved: stock.reserved, unfulfillable: stock.unfulfillable };
  });
  const fixture = feeFixtures[site];
  if (!fixture) throw new Error('当前站点暂无可用的 MCF 配送方案');
  const fromDays = service === 'Standard' ? 3 : 1;
  const arrivalFrom = new Date(now + fromDays * day).toISOString();
  const arrivalTo = new Date(now + (fromDays + 2) * day).toISOString();
  const expiresAt = now + lifetime;
  const feeMinor = fixture[service] * units;
  const fingerprint = hash(JSON.stringify({
    scope: [state.tenantId, state.companyId, state.merchantId], orderId: order.id,
    sourceId: order.sourceId, number: order.number, createdAt: order.createdAt,
    connectionId, site, address: order.address,
    sourceLines: order.lines.map(line => ({ id: line.id, channelLineId: line.channelLineId, channelSku: line.channelSku,
      omsVariantId: line.omsVariantId, sku: line.sku, quantity: line.quantity, cancelled: line.cancelled,
      mappingSnapshot: line.mappingSnapshot, remaining: availableToAllocate(state, order.id, line.id) })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    pools, lines, service, currency: fixture.currency, feeMinor, arrivalFrom, arrivalTo, expiresAt,
  }));
  return { id: `mcf-proposal-${fingerprint}`, orderId: order.id, connectionId, site, service,
    currency: fixture.currency, feeMinor, arrivalFrom, arrivalTo, expiresAt, fingerprint, lines, ...(target?.targetMappings ? { targetMappings: target.targetMappings } : {}) };
}

/** Read-only planning: does not reserve inventory, create tasks, or change the snapshot. */
export function queryMcfProposal(state: OmsSnapshot, orderId: string, connection: Connection, lines: ItemQuantity[], service: McfService, now: number): McfProposal {
  const order = sourceOrder(state, orderId);
  checkConnection(order, connection);
  return quote(state, order, lines, service, now, order.source === 'Amazon' ? undefined : { connectionId: connection.id, site: connection.businesses.mcf!.site, targetMappings: (connection.businesses.mcf!.productMappings ?? []).map(mapping => ({ omsVariantId: mapping.omsVariantId, externalSku: mapping.externalSku })) });
}

/** The command boundary must additionally recheck the current connection authorization/config. */
export function validateMcfProposal(state: OmsSnapshot, proposal: McfProposal, now: number): void {
  // Local estimates have no provider-issued expiry. Keep the timestamp for old snapshots/fingerprints only.
  if (!Number.isFinite(now) || !Number.isFinite(proposal.expiresAt)) throw new Error('MCF 配送方案时间无效');
  const expected = quote(state, sourceOrder(state, proposal.orderId), proposal.lines, proposal.service, proposal.expiresAt - lifetime, proposal.targetMappings ? proposal : undefined);
  if (proposal.id !== expected.id || proposal.fingerprint !== expected.fingerprint || proposal.connectionId !== expected.connectionId || proposal.site !== expected.site || proposal.currency !== expected.currency || proposal.feeMinor !== expected.feeMinor || proposal.arrivalFrom !== expected.arrivalFrom || proposal.arrivalTo !== expected.arrivalTo || JSON.stringify(proposal.lines) !== JSON.stringify(expected.lines)) throw new Error('订单、地址或 FBA 库存已变化，请重新查询 MCF 配送方案');
}

function destination(order: SalesOrder) {
  const address = order.address!;
  return { name: address.name, addressLine1: address.address1, city: address.city, stateOrRegion: address.province, postalCode: address.zip, countryCode: address.country, phone: address.phone };
}
/** Pure payload builder; callers must validate expiry using command time before committing. */
export function buildMcfCreatePayload(state: OmsSnapshot, proposal: McfProposal, fulfillmentId: string) {
  text(fulfillmentId, '履约任务标识', Number.MAX_SAFE_INTEGER);
  validateMcfProposal(state, proposal, proposal.expiresAt - lifetime);
  const order = sourceOrder(state, proposal.orderId);
  const displayableOrderId = order.number.trim() && order.number.length <= 40 ? order.number : `SO-${hash(order.id)}`;
  return {
    sellerFulfillmentOrderId: `MCF-${hash(JSON.stringify([state.tenantId, state.companyId, state.merchantId, fulfillmentId]))}`,
    displayableOrderId,
    displayableOrderDateTime: new Date(order.createdAt).toISOString(),
    displayableOrderComment: `Order ${displayableOrderId}`,
    shippingSpeedCategory: proposal.service,
    destinationAddress: destination(order),
    items: proposal.lines.map((line, index) => ({ sellerFulfillmentOrderItemId: `ITEM-${index + 1}-${hash(line.lineId)}`, sellerSku: line.externalSku, quantity: line.quantity })),
  };
}
export function getPreviewPayload(state: OmsSnapshot, proposal: McfProposal) {
  validateMcfProposal(state, proposal, proposal.expiresAt - lifetime);
  return { address: destination(sourceOrder(state, proposal.orderId)), shippingSpeedCategories: [proposal.service],
    items: proposal.lines.map((line, index) => ({ sellerFulfillmentOrderItemId: `ITEM-${index + 1}-${hash(line.lineId)}`, sellerSku: line.externalSku, quantity: line.quantity })) };
}
