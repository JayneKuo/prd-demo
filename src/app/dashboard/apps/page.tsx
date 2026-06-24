import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';

const apps = [
  { name: 'Shopify Connector', description: '同步订单、客户和库存可售状态。', status: 'Active' },
  { name: 'NetSuite Finance', description: '同步发票、付款和调整分录。', status: 'Review' },
  { name: 'Warehouse Webhooks', description: '接收 WMS 出库、入库和异常事件。', status: 'Active' }
];

export default function AppsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="应用" description="管理应用市场、系统集成、Webhooks 和 API 密钥。" actions={[{ label: '安装应用', variant: 'primary' }]} />
      <SectionCard title="已连接应用" description="这些集成影响订单、库存、财务和事件日志。">
        <div className="divide-y divide-[var(--border-subtle)]">
          {apps.map((app) => (
            <div key={app.name} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">{app.name}</div>
                <div className="text-sm text-[var(--muted)]">{app.description}</div>
              </div>
              <StatusBadge status={app.status} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
