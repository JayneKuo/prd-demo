import { OverviewKpiGrid } from '@/components/dashboard/overview-kpi-grid';
import { OverviewPriorityList } from '@/components/dashboard/overview-priority-list';
import { OverviewSalesTrendCard } from '@/components/dashboard/overview-sales-trend-card';
import type { OverviewKpi, OverviewPriorityItem, OverviewTrendPoint } from '@/lib/mock-data/overview';

export function OverviewPostureHero({
  kpis,
  highlightedIds,
  trendPoints,
  focusItems
}: {
  kpis: OverviewKpi[];
  highlightedIds: string[];
  trendPoints: OverviewTrendPoint[];
  focusItems: OverviewPriorityItem[];
}) {
  const [primary, ...secondary] = kpis;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.34fr)_minmax(300px,0.66fr)]">
      <div className="rounded-3xl border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[color-mix(in_srgb,var(--primary-soft)_12%,white)] p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Business posture</div>
            <div className="mt-2 text-[34px] font-semibold tracking-tight text-[var(--foreground)]">{primary?.value}</div>
            <div className="mt-1 text-[14px] text-[var(--muted)]">{primary?.label} · {primary?.comparisonLabel}</div>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-right ring-1 ring-inset ring-[color-mix(in_srgb,var(--primary)_16%,var(--border-subtle))]">
            <div className="text-[12px] font-medium text-[var(--muted)]">变化</div>
            <div className="mt-1 text-[20px] font-semibold text-[var(--primary)]">{primary?.delta}</div>
          </div>
        </div>

        <OverviewSalesTrendCard points={trendPoints} />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 text-[13px] font-medium text-[var(--muted)]">核心辅助指标</div>
          <OverviewKpiGrid items={secondary} highlightedIds={highlightedIds} variant="compact" />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">此刻最该盯的</div>
          <OverviewPriorityList items={focusItems} maxItems={2} />
        </div>
      </div>
    </div>
  );
}
