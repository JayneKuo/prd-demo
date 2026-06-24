import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';

const schedule = [
  { time: '09:30', title: 'LAX-01 入库预约', detail: 'PO-2048 · 86 件' },
  { time: '13:00', title: '批次发货截止', detail: '西海岸订单波次' },
  { time: '16:30', title: '库存盘点窗口', detail: 'SKU-1031 / SKU-8820' }
];

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="日程" description="跟踪到货、出库、盘点、账期和审批 SLA 等时间驱动的运营事项。" actions={[{ label: '新建日程', variant: 'primary' }]} />
      <SectionCard title="今天" description="时间线视图会在后续接入真实日历组件。">
        <div className="divide-y divide-[var(--border-subtle)]">
          {schedule.map((item) => (
            <div key={item.title} className="grid gap-3 py-3 sm:grid-cols-[72px_minmax(0,1fr)]">
              <div className="text-sm font-medium text-[var(--muted)]">{item.time}</div>
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">{item.title}</div>
                <div className="text-sm text-[var(--muted)]">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
