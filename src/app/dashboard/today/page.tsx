import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';

const workItems = [
  { title: '12 个订单等待分配仓库', owner: '运营', status: 'Review' },
  { title: '3 个采购单今天到货', owner: '采购', status: 'Scheduled' },
  { title: '8 个库存异常超过 SLA', owner: '仓储', status: 'Delayed' }
];

export default function TodayPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="今日" description="汇总今天需要处理的订单、审批、到货、异常和 SLA 风险。" actions={[{ label: '查看全部任务', variant: 'secondary' }]} />
      <SectionCard title="今日工作队列" description="按优先级聚合跨模块待处理事项。">
        <div className="divide-y divide-[var(--border-subtle)]">
          {workItems.map((item) => (
            <div key={item.title} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">{item.title}</div>
                <div className="text-sm text-[var(--muted)]">负责人：{item.owner}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
