import { ComparisonBar } from '@/components/dashboard/overview-mini-chart';
import type { OverviewChannelMetric } from '@/lib/mock-data/overview';
import { cn } from '@/lib/utils';

const channelTone: Record<OverviewChannelMetric['channel'], string> = {
  amazon: 'bg-orange-50 text-orange-700 ring-orange-200',
  shopify: 'bg-green-50 text-green-700 ring-green-200',
  tiktok: 'bg-pink-50 text-pink-700 ring-pink-200',
  walmart: 'bg-blue-50 text-blue-700 ring-blue-200'
};

export function OverviewChannelPerformance({ items }: { items: OverviewChannelMetric[] }) {
  const maxGmv = Math.max(...items.map((item) => item.gmvValue), 0);
  const maxOrders = Math.max(...items.map((item) => item.ordersValue), 0);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.channel} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset', channelTone[item.channel])}>
                  {item.label}
                </span>
                <span className="text-[13px] text-[var(--muted)]">{item.focus}</span>
              </div>
              <span className="text-[12px] font-medium text-[var(--muted)]">{item.riskLabel}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetricBar label="GMV" valueLabel={item.gmv} max={maxGmv} value={item.gmvValue} tone="primary" />
              <MetricBar label="Orders" valueLabel={item.orders} max={maxOrders} value={item.ordersValue} tone="success" />
            </div>

            <div className="grid gap-3 text-[13px] text-[var(--muted)] sm:grid-cols-3">
              <div>
                <span className="font-medium text-[var(--foreground)]">Refund</span> {item.refundRate}
              </div>
              <div>
                <span className="font-medium text-[var(--foreground)]">Stock cover</span> {item.stockCoverageDays}
              </div>
              <div>
                <span className="font-medium text-[var(--foreground)]">Channel note</span> {item.riskLabel}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricBar({ label, valueLabel, value, max, tone }: { label: string; valueLabel: string; value: number; max: number; tone: 'primary' | 'success' }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{label}</div>
        <div className="text-[13px] font-semibold text-[var(--foreground)]">{valueLabel}</div>
      </div>
      <ComparisonBar value={value} max={max} tone={tone} />
    </div>
  );
}
