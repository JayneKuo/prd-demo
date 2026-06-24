import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import type { TableColumn } from '@/components/admin/data-table-shell';

type LogRow = {
  id: string;
  event: string;
  status: string;
  resource: string;
  destination: string;
  timestamp: string;
};

const columns: TableColumn<LogRow>[] = [
  { key: 'event', label: '事件' },
  { key: 'status', label: '状态', isStatus: true },
  { key: 'resource', label: '资源' },
  { key: 'destination', label: '目标系统' },
  { key: 'timestamp', label: '时间' }
];

const rows: LogRow[] = [
  { id: 'evt_001', event: 'order.created', status: 'Completed', resource: 'Order #10024', destination: 'Shopify', timestamp: '2 min ago' },
  { id: 'evt_002', event: 'inventory.adjusted', status: 'Processing', resource: 'SKU-2048', destination: 'WMS', timestamp: '8 min ago' },
  { id: 'evt_003', event: 'invoice.sync_failed', status: 'Failed', resource: 'INV-8820', destination: 'NetSuite', timestamp: '21 min ago' }
];

export default function LogsPage() {
  return (
    <ListPageTemplate
      title="日志"
      description="检索事件、同步记录、API 调用和集成诊断信息。"
      actions={[{ label: '导出日志', variant: 'secondary' }]}
      tabs={['全部', '事件', 'API 调用', '同步', '失败']}
      activeTab="全部"
      searchPlaceholder="搜索事件 ID、资源或目标系统..."
      columns={columns}
      rows={rows}
    />
  );
}
