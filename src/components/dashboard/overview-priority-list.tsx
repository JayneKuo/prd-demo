import { StatusBadge } from '@/components/admin/status-badge';
import type { OverviewPriorityItem } from '@/lib/mock-data/overview';

export function OverviewPriorityList({ items, maxItems = items.length }: { items: OverviewPriorityItem[]; maxItems?: number }) {
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {items.slice(0, maxItems).map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium text-[var(--foreground)]">{item.title}</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">{item.meta}</div>
          </div>
          <div className="shrink-0">
            <StatusBadge status={item.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
