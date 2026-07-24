import { LogsPageClient } from '@/features/developer-logs/logs-page-client';
import { inventoryLogRows } from '@/features/developer-logs/mock-data';

export default function InventoryLogsPage() {
  return <LogsPageClient title="库存日志" description="查看库存接收、校验、更新与同步事件日志。" rows={inventoryLogRows} />;
}
