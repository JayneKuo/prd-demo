import { Sparkline } from '@/components/dashboard/overview-mini-chart';
import type { OverviewTrendPoint } from '@/lib/mock-data/overview';

export function OverviewSalesTrendCard({ points }: { points: OverviewTrendPoint[] }) {
  const gmvSeries = points.map((point) => point.gmv);
  const orderSeries = points.map((point) => point.orders);
  const totalGmv = gmvSeries.reduce((sum, value) => sum + value, 0);
  const totalOrders = orderSeries.reduce((sum, value) => sum + value, 0);
  const aov = totalOrders === 0 ? 0 : totalGmv / totalOrders;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_220px]">
        <div>
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Sales trend</div>
          <div className="mt-2 text-[var(--primary)]">
            <Sparkline data={gmvSeries} className="h-44" />
          </div>
          <div className="mt-3 flex justify-between text-[12px] text-[var(--muted)]">
            {points.map((point) => (
              <span key={point.label}>{point.label}</span>
            ))}
          </div>
        </div>

        <div className="space-y-4 border-l border-[var(--border-subtle)] pl-5">
          <SummaryLine label="GMV" value={`$${totalGmv.toFixed(1)}k`} />
          <SummaryLine label="Orders" value={totalOrders.toLocaleString()} />
          <SummaryLine label="AOV" value={`$${aov.toFixed(2)}`} />
          <div>
            <div className="text-[12px] font-medium text-[var(--muted)]">Order pace</div>
            <div className="mt-2 text-[var(--success)]">
              <Sparkline data={orderSeries} className="h-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{value}</div>
    </div>
  );
}
