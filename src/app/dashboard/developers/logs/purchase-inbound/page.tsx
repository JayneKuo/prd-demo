import { LogsPageClient } from '@/features/developer-logs/logs-page-client';
import { purchaseInboundLogRows } from '@/features/developer-logs/mock-data';

export default function PurchaseInboundLogsPage() {
  return <LogsPageClient title="PO / 入库日志" description="查看采购与入库事件日志。" rows={purchaseInboundLogRows} />;
}
