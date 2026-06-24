import { OverviewFinanceSettlementCard } from '@/components/dashboard/overview-finance-settlement-card';
import { OverviewFulfillmentEfficiencyCard } from '@/components/dashboard/overview-fulfillment-efficiency-card';
import { OverviewInventoryHealthCard } from '@/components/dashboard/overview-inventory-health-card';
import { OverviewRefundAfterSalesCard } from '@/components/dashboard/overview-refund-after-sales-card';
import type {
  OverviewFinanceMetric,
  OverviewFulfillmentMetric,
  OverviewInventoryHealth,
  OverviewRefundMetric
} from '@/lib/mock-data/overview';

export function OverviewAnomalyRadar({
  inventory,
  fulfillment,
  refunds,
  finance
}: {
  inventory: OverviewInventoryHealth;
  fulfillment: OverviewFulfillmentMetric[];
  refunds: OverviewRefundMetric[];
  finance: OverviewFinanceMetric[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <CompactTile title="库存压力" description="看断货、补货和滞销是否正在放大。">
        <OverviewInventoryHealthCard data={inventory} />
      </CompactTile>

      <CompactTile title="履约异常" description="看 SLA、延迟和积压是否拖慢交付。">
        <OverviewFulfillmentEfficiencyCard items={fulfillment} />
      </CompactTile>

      <CompactTile title="退款 / 售后异常" description="看退款趋势、原因结构和工单压力。">
        <OverviewRefundAfterSalesCard items={refunds} />
      </CompactTile>

      <CompactTile title="回款风险" description="看待确认回款、费用扣减和渠道回款健康。">
        <OverviewFinanceSettlementCard items={finance} />
      </CompactTile>
    </div>
  );
}

function CompactTile({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <div className="text-[14px] font-semibold text-[var(--foreground)]">{title}</div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
