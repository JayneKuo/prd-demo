import { ComparisonBar, Sparkline, StackedBar } from '@/components/dashboard/overview-mini-chart';
import type { OverviewFinanceMetric } from '@/lib/mock-data/overview';

export function OverviewFinanceSettlementCard({ items }: { items: OverviewFinanceMetric[] }) {
  const totalPending = items.reduce((sum, item) => sum + item.pendingSettlementValue, 0);
  const totalConfirmed = items.reduce((sum, item) => sum + item.confirmedSettlementValue, 0);
  const totalFee = items.reduce((sum, item) => sum + item.feeDeductionValue, 0);
  const primary = items[0];
  const maxRisk = Math.max(...items.map((item) => item.payoutRisk), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricLine label="待确认回款" value={`$${totalPending.toFixed(1)}k`} />
        <MetricLine label="已确认回款" value={`$${totalConfirmed.toFixed(1)}k`} />
        <MetricLine label="费用扣减" value={`$${totalFee.toFixed(1)}k`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div>
          <div className="text-[12px] font-medium text-[var(--muted)]">Settlement mix</div>
          <div className="mt-3">
            <StackedBar
              segments={[
                { value: primary?.settlementStatus.confirmed ?? 0, tone: 'success' },
                { value: primary?.settlementStatus.pending ?? 0, tone: 'warning' },
                { value: primary?.settlementStatus.exception ?? 0, tone: 'danger' }
              ]}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[var(--muted)]">
            <span>Confirmed {primary?.settlementStatus.confirmed ?? 0}%</span>
            <span>Pending {primary?.settlementStatus.pending ?? 0}%</span>
            <span>Exception {primary?.settlementStatus.exception ?? 0}%</span>
          </div>
          <div className="mt-4 text-[var(--success)]">
            <Sparkline data={primary?.cashInTrend ?? []} className="h-16" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[12px] font-medium text-[var(--muted)]">Payout risk by channel</div>
          {items.map((item) => (
            <div key={item.channel}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                <span className="font-medium capitalize text-[var(--foreground)]">{item.channel}</span>
                <span className="text-[var(--muted)]">{item.payoutRisk}%</span>
              </div>
              <ComparisonBar value={item.payoutRisk} max={maxRisk} tone={item.payoutRisk >= 40 ? 'danger' : item.payoutRisk >= 28 ? 'warning' : 'success'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{value}</div>
    </div>
  );
}
