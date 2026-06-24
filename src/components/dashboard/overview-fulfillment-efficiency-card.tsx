import { DonutMeter, MiniBars, ProgressBar } from '@/components/dashboard/overview-mini-chart';
import type { OverviewFulfillmentMetric } from '@/lib/mock-data/overview';

export function OverviewFulfillmentEfficiencyCard({ items }: { items: OverviewFulfillmentMetric[] }) {
  const totalDelayed = items.reduce((sum, item) => sum + item.delayedOrders, 0);
  const avgSla = Math.round(items.reduce((sum, item) => sum + item.slaRate, 0) / items.length);
  const avgShipHours = (items.reduce((sum, item) => sum + item.avgShipHours, 0) / items.length).toFixed(1);
  const backlog = items[0]?.backlog ?? [];
  const stage = items[0]?.stageBreakdown ?? { picking: 0, packing: 0, shipping: 0 };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)]">
        <div className="flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
          <DonutMeter value={avgSla} tone={avgSla >= 93 ? 'success' : avgSla >= 88 ? 'warning' : 'danger'} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="SLA 达成率" value={`${avgSla}%`} hint="最近履约表现" />
          <MetricCard label="延迟订单" value={totalDelayed.toLocaleString()} hint="需要立即跟进" />
          <MetricCard label="平均发货时长" value={`${avgShipHours}h`} hint="跨渠道平均值" />
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
            <div className="text-[12px] font-medium text-[var(--muted)]">Backlog pace</div>
            <div className="mt-3">
              <MiniBars values={backlog} tone="warning" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <StageRow label="Picking" value={stage.picking} />
        <StageRow label="Packing" value={stage.packing} />
        <StageRow label="Shipping" value={stage.shipping} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{value}</div>
      <div className="mt-1 text-[12px] text-[var(--muted)]">{hint}</div>
    </div>
  );
}

function StageRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="text-[13px] font-medium text-[var(--foreground)]">{label}</div>
        <div className="text-[13px] text-[var(--muted)]">{value}%</div>
      </div>
      <ProgressBar value={value} tone={value >= 75 ? 'success' : value >= 60 ? 'warning' : 'danger'} />
    </div>
  );
}
