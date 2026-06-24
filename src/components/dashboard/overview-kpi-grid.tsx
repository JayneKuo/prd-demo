import { Sparkline } from '@/components/dashboard/overview-mini-chart';
import { cn } from '@/lib/utils';
import type { OverviewKpi } from '@/lib/mock-data/overview';

type OverviewKpiGridProps = {
  items: OverviewKpi[];
  highlightedIds: string[];
  variant?: 'default' | 'compact';
};

const trendTone: Record<OverviewKpi['trend'], string> = {
  up: 'text-[var(--success)]',
  down: 'text-[var(--danger)]',
  neutral: 'text-[var(--muted)]'
};

export function OverviewKpiGrid({ items, highlightedIds, variant = 'default' }: OverviewKpiGridProps) {
  if (variant === 'compact') {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-medium text-[var(--muted)]">{item.label}</div>
              <span className={cn('text-[12px] font-semibold', trendTone[item.trend])}>{item.delta}</span>
            </div>
            <div className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{item.value}</div>
            <div className={cn('mt-3', trendTone[item.trend])}>
              <Sparkline data={item.sparkline} className="h-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const isHighlighted = highlightedIds.includes(item.id);

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-2xl border bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]',
              isHighlighted
                ? 'border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary-soft)_36%,white)]'
                : 'border-[var(--border)]'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{item.label}</div>
              <span className={cn('text-[12px] font-semibold', trendTone[item.trend])}>{item.delta}</span>
            </div>
            <div className="mt-2 text-[30px] font-semibold tracking-tight text-[var(--foreground)]">{item.value}</div>
            <div className="mt-1 text-[13px] text-[var(--muted)]">{item.comparisonLabel}</div>
            <div className={cn('mt-4', trendTone[item.trend])}>
              <Sparkline data={item.sparkline} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
