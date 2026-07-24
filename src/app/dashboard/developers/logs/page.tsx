import { LogsPageClient } from '@/features/developer-logs/logs-page-client';
import { salesOrderLogRows } from '@/features/developer-logs/mock-data';

export default function SalesOrderLogsPage() {
  return <LogsPageClient title="销售订单 / 出库日志" description="查看订单、履约、Shipment 与同步事件日志。" rows={salesOrderLogRows} />;
}
