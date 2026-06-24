import { ProgressBar } from '@/components/dashboard/overview-mini-chart';
import type { OverviewInventoryHealth } from '@/lib/mock-data/overview';

export function OverviewInventoryHealthCard({ data }: { data: OverviewInventoryHealth }) {
  return (
    <div className="space-y-5">
      <MetricRow
        label="库存覆盖天数"
        value={data.coverageDays}
        hint={data.coverageTargetLabel}
        progress={data.coverageProgress}
        tone="primary"
      />
      <MetricRow
        label="补货压力"
        value={data.replenishmentLabel}
        hint="高优先级 SKU 需要优先补货"
        progress={data.replenishmentPressure}
        tone="warning"
      />
      <MetricRow
        label="滞销压力"
        value={data.slowMovingLabel}
        hint="需要促销或降优先级处理"
        progress={data.slowMovingPressure}
        tone="danger"
      />
      <MetricRow
        label="健康 SKU 占比"
        value={data.healthySkuLabel}
        hint="大部分库存仍处于健康区间"
        progress={data.healthySkuRatio}
        tone="success"
      />
    </div>
  );
}

function MetricRow({
  label,
  value,
  hint,
  progress,
  tone
}: {
  label: string;
  value: string;
  hint: string;
  progress: number;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-[var(--foreground)]">{label}</div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">{hint}</div>
        </div>
        <div className="text-[13px] font-semibold text-[var(--foreground)]">{value}</div>
      </div>
      <div className="mt-3">
        <ProgressBar value={progress} tone={tone} />
      </div>
    </div>
  );
}
