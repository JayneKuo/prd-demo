import type { Connection } from './amazon-connections';
import { connectionStorageKey } from './amazon-connections';
import { platformProducts } from './channel-sku-mappings';
import { defaultSyncSettings } from './amazon-sync';

export type FbaInventoryRow = {
  connectionId: string;
  site: string;
  sellerSku: string;
  asin: string;
  fnsku: string;
  name: string;
  condition: 'New' | 'UsedLikeNew';
  fulfillable: number;
  reserved: number;
  unfulfillable: number;
  inboundWorking: number;
  inboundShipped: number;
  inboundReceiving: number;
  total: number;
  updatedAt: string;
};
export type FbaInventorySnapshot = { version: 1; rows: FbaInventoryRow[] };
export const fbaInventoryStorageKey = (companyId: string, merchantId: string) => `${connectionStorageKey(companyId, merchantId)}:fba-inventory-v1`;
export const inventoryQuantityFields = ['fulfillable', 'reserved', 'unfulfillable', 'inboundWorking', 'inboundShipped', 'inboundReceiving'] as const;

export function fbaInventoryGate(connection: Connection): string {
  if (connection.identity !== 'seller') return '仅 Seller 账号可读取 FBA 库存';
  if (!connection.authorized) return '账号授权已失效';
  const config = connection.businesses.fba;
  if (!config) return '尚未配置 FBA 业务';
  if (config.status !== 'enabled') return config.status === 'paused' ? 'FBA 业务已暂停' : 'FBA 业务尚未启用';
  if (!config.site) return '尚未选择站点';
  if (!(config.syncSettings?.readInventory ?? defaultSyncSettings('fba').readInventory)) return '未开启读取 FBA 库存';
  return '';
}

// Marketplace-level stock snapshots are independent of inbound plan receipts.
// None of these quantities are calculated from replenishment workflow state.
export function createFbaInventoryRows(connection: Connection, updatedAt = '2026-11-03T08:00:00Z'): FbaInventoryRow[] {
  if (fbaInventoryGate(connection)) return [];
  const quantities = [
    [268, 24, 3, 120, 60, 18],
    [146, 12, 2, 80, 40, 8],
    [58, 6, 1, 30, 20, 5],
  ];
  return platformProducts.map((product, index) => {
    const [fulfillable, reserved, unfulfillable, inboundWorking, inboundShipped, inboundReceiving] = quantities[index];
    return {
      connectionId: connection.id, site: connection.businesses.fba!.site,
      sellerSku: product.externalSku, asin: product.asin, fnsku: product.fnsku, name: product.name, condition: 'New',
      fulfillable, reserved, unfulfillable, inboundWorking, inboundShipped, inboundReceiving,
      total: quantities[index].reduce((sum, quantity) => sum + quantity, 0), updatedAt,
    };
  });
}

export function parseFbaInventory(raw: string | null): FbaInventorySnapshot {
  if (raw === null) return { version: 1, rows: [] };
  const data = JSON.parse(raw) as FbaInventorySnapshot;
  if (!data || data.version !== 1 || !Array.isArray(data.rows)) throw new Error('库存快照格式无效');
  const seen = new Set<string>();
  for (const row of data.rows) {
    if (!row || ['connectionId', 'site', 'sellerSku', 'asin', 'fnsku', 'name', 'updatedAt'].some(field => typeof row[field as keyof FbaInventoryRow] !== 'string' || !String(row[field as keyof FbaInventoryRow]).trim()) ||
      !['New', 'UsedLikeNew'].includes(row.condition) || !Number.isFinite(Date.parse(row.updatedAt)) ||
      [...inventoryQuantityFields, 'total' as const].some(field => !Number.isSafeInteger(row[field]) || row[field] < 0) ||
      row.total !== inventoryQuantityFields.reduce((sum, field) => sum + row[field], 0)) throw new Error('库存快照记录无效');
    const id = JSON.stringify([row.connectionId, row.site, row.sellerSku, row.condition]);
    if (seen.has(id)) throw new Error('库存快照包含重复记录');
    seen.add(id);
  }
  return data;
}

export function syncFbaInventory(snapshot: FbaInventorySnapshot, connections: Connection[], updatedAt: string): FbaInventorySnapshot {
  const targets = connections.filter(connection => !fbaInventoryGate(connection));
  return {
    version: 1,
    rows: [
      ...snapshot.rows.filter(row => !targets.some(connection => connection.id === row.connectionId && connection.businesses.fba?.site === row.site)),
      ...targets.flatMap(connection => createFbaInventoryRows(connection, updatedAt)),
    ],
  };
}
