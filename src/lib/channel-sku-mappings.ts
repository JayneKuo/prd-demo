import { businessDefinitions, type Connection, type ProductMapping } from '@/lib/amazon-connections';
import { mockProducts } from '@/lib/mock-data/products';

export const channelSkuMappingsChangedEvent = 'channel-sku-mappings-changed';
export const platformProducts = [
  { externalSku: 'NW-WEP-BLK-US', vendorSku: 'NW-WEP-BLK', asin: 'B0C8NW4P21', fnsku: 'X004NWEP01', name: 'Wireless Earbuds Pro · 午夜黑', omsSku: 'WEP-BLK-001' },
  { externalSku: 'NW-WEP-WHT-US', vendorSku: 'NW-WEP-WHT', asin: 'B0C8NW4P22', fnsku: 'X004NWEP02', name: 'Wireless Earbuds Pro · 云白', omsSku: 'WEP-WHT-001' },
  { externalSku: 'NW-TP-BLK-STD', vendorSku: 'NW-TP-BLK', asin: 'B0C8NW4P23', fnsku: 'X004NWTP01', name: 'Transit Pack · 黑色标准款', omsSku: 'TP-BLK-STD' },
];
export const channelSkuMappingsKey = (companyId: string, merchantId: string, connectionId: string, site: string) =>
  `channel-sku-mappings-v1:${[companyId, merchantId, connectionId, site].map(encodeURIComponent).join(':')}`;

function storage() {
  if (typeof window === 'undefined') throw new Error('商品映射仅可在浏览器中读取或保存。');
  return window.localStorage;
}
function parseMappings(value: unknown): ProductMapping[] {
  if (!Array.isArray(value)) throw new Error('商品映射数据格式无效；原数据已保留。');
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('商品映射记录格式无效；原数据已保留。');
    const mapping = item as ProductMapping;
    if (typeof mapping.externalSku !== 'string' || !mapping.externalSku.trim() || typeof mapping.omsVariantId !== 'string' || !mapping.omsVariantId.trim() ||
        ['asin', 'fnsku'].some(key => mapping[key as 'asin' | 'fnsku'] !== undefined && typeof mapping[key as 'asin' | 'fnsku'] !== 'string')) throw new Error('商品映射记录不完整；原数据已保留。');
    if (seen.has(mapping.externalSku)) throw new Error('商品映射包含重复渠道 SKU；原数据已保留。');
    seen.add(mapping.externalSku);
    return { ...mapping };
  });
}

export function readChannelSkuMappings(companyId: string, merchantId: string, connection: Connection, site: string): ProductMapping[] {
  const store = storage();
  const key = channelSkuMappingsKey(companyId, merchantId, connection.id, site);
  const raw = store.getItem(key);
  // An explicitly saved empty array is authoritative, never a reason to re-migrate.
  if (raw !== null) return parseMappings(JSON.parse(raw));
  const merged = new Map<string, ProductMapping>();
  const businesses = businessDefinitions.filter(b => connection.businesses[b.id]?.site === site);
  const add = (mapping: ProductMapping) => { if (!merged.has(mapping.externalSku)) merged.set(mapping.externalSku, mapping); };
  // Stable precedence: business definition order, explicit lists before readiness records.
  // Conflicting alternatives remain untouched in their legacy keys/configurations.
  for (const business of businesses) {
    const legacy = connection.businesses[business.id] as { productMappings?: unknown };
    if (legacy.productMappings !== undefined) {
      if (!Array.isArray(legacy.productMappings)) throw new Error('旧版商品映射数据格式无效；原数据已保留。');
      // Legacy duplicates are resolved by first occurrence, including within a business.
      for (const item of legacy.productMappings) parseMappings([item]).forEach(add);
    }
  }
  for (const business of businesses) {
    const legacyRaw = store.getItem(`amazon-oms-readiness-v1:${companyId}:${merchantId}:${connection.id}:${business.id}`);
    if (legacyRaw === null) continue;
    const legacy: unknown = JSON.parse(legacyRaw);
    if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) throw new Error('旧版映射确认数据格式无效；原数据已保留。');
    const record = legacy as Record<string, unknown>;
    if (['product', 'warehouse', 'carrier'].some(field => typeof record[field] !== 'boolean') ||
        ['productId', 'externalIdentifier', 'asin', 'fnsku'].some(field => record[field] !== undefined && typeof record[field] !== 'string')) throw new Error('旧版映射确认数据格式无效；原数据已保留。');
    if (record.product && record.productId && record.externalIdentifier) {
      parseMappings([{ externalSku: record.externalIdentifier, omsVariantId: record.productId, ...(record.asin ? { asin: record.asin } : {}), ...(record.fnsku ? { fnsku: record.fnsku } : {}) }]).forEach(add);
    }
  }
  const mappings = [...merged.values()];
  store.setItem(key, JSON.stringify(mappings));
  return mappings;
}

export function saveChannelSkuMappings(companyId: string, merchantId: string, connection: Connection, site: string, mappings: ProductMapping[]): void {
  const store = storage();
  const key = channelSkuMappingsKey(companyId, merchantId, connection.id, site);
  const existing = store.getItem(key);
  if (existing !== null) parseMappings(JSON.parse(existing));
  const next = parseMappings(mappings);
  store.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event(channelSkuMappingsChangedEvent));
}

export function getMappingSummary(companyId: string, merchantId: string, connection: Connection, site: string): { mapped: number; total: number } {
  const mappings = readChannelSkuMappings(companyId, merchantId, connection, site);
  const externalSkus = new Set([...platformProducts.map(p => connection.identity === 'vendor' ? p.vendorSku : p.externalSku), ...mappings.map(m => m.externalSku)]);
  const variantIds = new Set(mockProducts.flatMap(p => p.variants.map(v => v.id)));
  return { mapped: mappings.filter(m => variantIds.has(m.omsVariantId)).length, total: externalSkus.size };
}
