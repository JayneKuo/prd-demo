import { LogsPageClient } from '@/features/developer-logs/logs-page-client';
import { transferLogRows } from '@/features/developer-logs/mock-data';

export default function TransferLogsPage() {
  return <LogsPageClient title="调拨日志" description="查看调拨执行、出入库与完成事件日志。" rows={transferLogRows} />;
}
