import { MiniBars, Sparkline, StackedBar } from '@/components/dashboard/overview-mini-chart';
import type { OverviewRefundMetric } from '@/lib/mock-data/overview';

export function OverviewRefundAfterSalesCard({ items }: { items: OverviewRefundMetric[] }) {
  const totalAmount = items.reduce((sum, item) => sum + item.refundAmountValue, 0);
  const totalTickets = items.reduce((sum, item) => sum + item.ticketCount, 0);
  const avgRate = (items.reduce((sum, item) => sum + item.refundRate, 0) / items.length).toFixed(1);
  const primary = items[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="退款率" value={`${avgRate}%`} hint="跨渠道均值" />
        <MetricCard label="退款金额" value={`$${totalAmount.toFixed(1)}k`} hint="当前筛选范围" />
        <MetricCard label="售后工单" value={totalTickets.toLocaleString()} hint="需要客服跟进" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
          <div className="text-[12px] font-medium text-[var(--muted)]">Refund trend</div>
          <div className="mt-3 text-[var(--danger)]">
            <Sparkline data={primary?.trend ?? []} className="h-24" />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
          <div className="text-[12px] font-medium text-[var(--muted)]">Ticket pressure</div>
          <div className="mt-3">
            <MiniBars values={items.map((item) => item.ticketCount)} tone="danger" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
        <div className="text-[12px] font-medium text-[var(--muted)]">退款原因结构</div>
        <div className="mt-4 space-y-3">
          {(primary?.reasons ?? []).map((reason) => (
            <div key={reason.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                <span className="font-medium text-[var(--foreground)]">{reason.label}</span>
                <span className="text-[var(--muted)]">{reason.value}%</span>
              </div>
              <StackedBar segments={[{ value: reason.value, tone: reason.tone }, { value: 100 - reason.value, tone: 'primary' }]} />
            </div>
          ))}
        </div>
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
