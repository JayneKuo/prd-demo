import type { TableColumn } from '@/components/admin/data-table-shell';

export type InventoryRow = {
  id: string;
  merchant: string;
  sku: string;
  product: string;
  available: string;
  reserved: string;
  warehouse: string;
  status: string;
  updated: string;
};

export const inventoryColumns: TableColumn<InventoryRow>[] = [
  { key: 'merchant', label: 'Merchant' },
  { key: 'sku', label: 'SKU' },
  { key: 'product', label: 'Product' },
  { key: 'available', label: 'Available' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'status', label: 'Status', isStatus: true },
  { key: 'updated', label: 'Updated' }
];

export const inventoryRows: InventoryRow[] = [
  { id: 'sku_2048', merchant: 'US Store', sku: 'SKU-2048', product: 'Transit Pack / Black', available: '1,204', reserved: '86', warehouse: 'LAX-01', status: 'Available', updated: '6 min ago' },
  { id: 'sku_1031', merchant: 'US Amazon', sku: 'SKU-1031', product: 'Dock Case / Slate', available: '42', reserved: '31', warehouse: 'DAL-02', status: 'Low stock', updated: '18 min ago' },
  { id: 'sku_8820', merchant: 'UK TikTok Shop', sku: 'SKU-8820', product: 'Field Kit / Sand', available: '0', reserved: '12', warehouse: 'NYC-03', status: 'Out of stock', updated: '1 hr ago' },
  { id: 'sku_4472', merchant: 'SG Store', sku: 'SKU-4472', product: 'Control Module', available: '827', reserved: '104', warehouse: 'SFO-01', status: 'Reserved', updated: '2 hr ago' }
];
