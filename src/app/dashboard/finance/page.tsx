'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, Clock,
  TrendingUp, TrendingDown, ChevronRight, X, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  financeDashboardKpi,
  cashWaterfall,
  channelFinanceCards,
  arApSnapshot,
  financeAlerts,
  type FinanceAlert,
} from '@/lib/mock-data/finance-dashboard';

// ─── utils ────────────────────────────────────────────────────────────────────

function fmt(n: number, compact = false) {
  if (compact) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
    return `$${Math.round(n)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const W = 80, H = 28, pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last  = pts[pts.length - 1];
  const first = pts[0].split(',')[0];
  const lastX = last.split(',')[0];
  const areaPath = `${first},${H} ${pts.join(' ')} ${lastX},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 shrink-0" style={{ height: H }}>
      <polyline points={areaPath} fill={color} opacity={0.12} />
      <polyline
        points={pts.join(' ')}
        fill="none" stroke={color}
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Sparkline mock data ──────────────────────────────────────────────────────

const SPARK = {
  netRevenue:         [240, 258, 245, 271, 265, 279, 281],
  grossMargin:        [61.2, 60.8, 61.5, 59.8, 60.4, 60.9, 60.2],
  contributionMargin: [41.8, 42.1, 42.5, 42.0, 43.2, 42.8, 43.0],
  pendingSettlement:  [45,   52,   38,   61,   47,   55,   40  ],
  totalPayable:       [62,   58,   55,   59,   56,   52,   54  ],
};

// ─── AR / AP aging buckets (mock) ─────────────────────────────────────────────

const AR_AGING = [
  { label: '0–30 天',  amount: 45200, color: 'bg-emerald-400' },
  { label: '31–60 天', amount: 28000, color: 'bg-amber-400'   },
  { label: '61–90 天', amount: 17800, color: 'bg-orange-400'  },
  { label: '>90 天',   amount: 12840, color: 'bg-red-500'     },
];

const AP_AGING = [
  { label: '未到期',   amount: 30580, color: 'bg-emerald-400' },
  { label: '本周到期', amount: 18620, color: 'bg-amber-400'   },
  { label: '逾期',     amount: 2840,  color: 'bg-red-500'     },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = 'this-month' | 'last-month' | '7d' | '90d';

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'this-month', label: '本月'    },
  { key: 'last-month', label: '上月'    },
  { key: '7d',         label: '近 7 天' },
  { key: '90d',        label: '近 90 天'},
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const kpi        = financeDashboardKpi;
  const highAlerts = financeAlerts.filter(a => a.severity === 'high' && !dismissed.has(a.id));
  const otherAlerts = financeAlerts.filter(a => a.severity !== 'high');

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pt-5 lg:pt-6">

      {/* ── 页头 + 日期选择器 ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">
            财务概览
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            多渠道结算 · 应收应付 · 成本利润
          </p>
        </div>

        {/* 日期范围选择器 */}
        <div className="flex items-center gap-1 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 sm:self-auto">
          <Calendar className="ml-1.5 size-3.5 shrink-0 text-[var(--muted)]" />
          {DATE_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setDateRange(r.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] font-medium transition',
                dateRange === r.key
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 高优先级预警（最上方，始终可见）── */}
      {highAlerts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 border-b border-red-200 px-4 py-2.5">
            <AlertTriangle className="size-4 shrink-0 text-red-600" />
            <span className="text-[12px] font-bold text-red-700">
              {highAlerts.length} 项高优先级待处理
            </span>
          </div>
          {highAlerts.map(alert => (
            <div key={alert.id} className="flex items-center gap-3 border-b border-red-100 px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-red-900">{alert.title}</span>
                <span className="ml-2 text-[12px] text-red-700/70">{alert.description}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {alert.amount != null && (
                  <span className="text-[12px] font-bold tabular-nums text-red-700">
                    {fmt(alert.amount)}
                  </span>
                )}
                <Link
                  href={alert.href}
                  className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-100"
                >
                  {alert.actionLabel}
                </Link>
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                  className="flex size-6 items-center justify-center rounded text-red-400 transition hover:text-red-600"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Strip（含 Sparkline）── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="净收入"       labelEn="Net Revenue"
          value={fmt(kpi.netRevenue, true)}
          delta={`+${kpi.netRevenueDelta}%`} deltaDir="up"
          sub="vs 上周期"
          sparkData={SPARK.netRevenue} sparkColor="#3b82f6"
        />
        <KpiCard
          label="毛利率"       labelEn="Gross Margin"
          value={`${kpi.grossMargin}%`}
          delta={`${kpi.grossMarginDelta > 0 ? '+' : ''}${kpi.grossMarginDelta}pp`}
          deltaDir={kpi.grossMarginDelta >= 0 ? 'up' : 'down'}
          sub="扣 COGS 后"
          sparkData={SPARK.grossMargin}
          sparkColor={kpi.grossMarginDelta >= 0 ? '#10b981' : '#ef4444'}
        />
        <KpiCard
          label="贡献毛利率"   labelEn="Contribution Margin"
          value={`${kpi.contributionMargin}%`}
          delta="+0.8pp" deltaDir="up"
          sub="扣运营成本后"
          sparkData={SPARK.contributionMargin} sparkColor="#10b981"
        />
        <KpiCard
          label="渠道待回款"   labelEn="Pending Settlement"
          value={fmt(kpi.pendingSettlement, true)}
          delta={`${kpi.pendingChannels} 个渠道未到账`} deltaDir="neutral"
          sub="TikTok · Walmart"
          sparkData={SPARK.pendingSettlement} sparkColor="#f59e0b"
          warn
        />
        <KpiCard
          label="总应付"       labelEn="Total Payable"
          value={fmt(kpi.totalPayable, true)}
          delta={`逾期 ${fmt(kpi.overduePayable, true)}`}
          deltaDir={kpi.overduePayable > 0 ? 'down' : 'neutral'}
          sub="3PL · 承运商 · 平台"
          sparkData={SPARK.totalPayable} sparkColor="#6366f1"
        />
      </div>

      {/* ── P&L Waterfall + AR/AP ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <PLWaterfallCard />
        <ArApCard />
      </div>

      {/* ── 渠道对比表 ── */}
      <ChannelTable />

      {/* ── 中/低优先级待处理 ── */}
      {otherAlerts.length > 0 && <OtherAlertsSection alerts={otherAlerts} />}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, labelEn, value, delta, deltaDir, sub, warn, sparkData, sparkColor,
}: {
  label: string; labelEn: string; value: string;
  delta: string; deltaDir: 'up' | 'down' | 'neutral';
  sub: string; warn?: boolean;
  sparkData: number[]; sparkColor: string;
}) {
  const DeltaIcon = deltaDir === 'up' ? TrendingUp : deltaDir === 'down' ? TrendingDown : null;
  const deltaCls =
    deltaDir === 'up'   ? 'text-emerald-600' :
    deltaDir === 'down' ? 'text-red-500'      : 'text-[var(--muted)]';

  return (
    <div className={cn(
      'rounded-xl border p-4 shadow-[var(--shadow-soft)]',
      warn ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)] bg-[var(--surface)]',
    )}>
      {/* 标签 + 迷你折线 */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-[var(--muted)]">{label}</span>
        <Sparkline data={sparkData} color={sparkColor} />
      </div>

      {/* 主值 */}
      <div className={cn(
        'mt-1 text-[20px] font-bold tracking-tight leading-none',
        warn ? 'text-amber-700' : 'text-[var(--foreground)]',
      )}>
        {value}
      </div>

      {/* Delta + 说明 */}
      <div className="mt-2 flex items-center gap-1.5">
        {DeltaIcon && <DeltaIcon className={cn('size-3 shrink-0', deltaCls)} />}
        <span className={cn('text-[11px] font-medium', deltaCls)}>{delta}</span>
        <span className="text-[10px] text-[var(--muted)]">· {sub}</span>
      </div>
    </div>
  );
}

// ─── P&L Waterfall ────────────────────────────────────────────────────────────

function PLWaterfallCard() {
  const GROSS = cashWaterfall[0].amount;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
            P&L 收入成本结构
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            本月 · 全渠道 · Gross Sales → Contribution Margin
          </p>
        </div>
        <div className="hidden items-center gap-3 text-[10px] text-[var(--muted)] sm:flex">
          {[
            ['bg-blue-500',   '起点 / 里程碑'],
            ['bg-rose-400',   '成本扣减'],
            ['bg-emerald-500','贡献毛利'],
          ].map(([bg, lbl]) => (
            <span key={lbl} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-sm', bg)} />{lbl}
            </span>
          ))}
        </div>
      </div>

      {/* 表头 */}
      <div
        className="mb-1 grid items-center gap-3 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
        style={{ gridTemplateColumns: '1fr 52px 68px' }}
      >
        <span>科目</span>
        <span className="text-right">占比</span>
        <span className="text-right">金额</span>
      </div>

      <div className="space-y-[2px]">
        {cashWaterfall.map((bar) => {
          const isMilestone = bar.type === 'subtotal' || bar.type === 'total';
          const isStart     = bar.type === 'start';
          const isNeg       = bar.type === 'negative';

          const barPct    = (isMilestone || isStart)
            ? (bar.runningTotal / GROSS) * 100
            : (Math.abs(bar.amount) / GROSS) * 100;
          const offsetPct = isNeg ? (bar.runningTotal / GROSS) * 100 : 0;

          const barColor =
            isStart               ? 'bg-blue-500'      :
            isNeg                 ? 'bg-rose-400'       :
            bar.type === 'subtotal' ? 'bg-blue-400/50'  : 'bg-emerald-500';

          const rowBg =
            bar.type === 'subtotal' ? 'rounded-md bg-slate-50 ring-1 ring-inset ring-slate-200/80'   :
            bar.type === 'total'    ? 'rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-200/80' : '';

          return (
            <div
              key={bar.id}
              className={cn(
                'grid items-center gap-3 px-2 py-[5px]',
                rowBg,
                isMilestone ? 'mt-2' : '',
              )}
              style={{ gridTemplateColumns: '1fr 52px 68px' }}
            >
              {/* 进度条 + 标签 */}
              <div className="min-w-0">
                <div className="relative mb-1 h-[5px] overflow-hidden rounded-full bg-slate-100">
                  {(isMilestone || isStart) ? (
                    <div className={cn('absolute left-0 top-0 h-full rounded-full', barColor)}
                      style={{ width: `${barPct}%` }} />
                  ) : (
                    <div className={cn('absolute top-0 h-full rounded-full', barColor)}
                      style={{ width: `${barPct}%`, left: `${offsetPct}%` }} />
                  )}
                </div>
                <span className={cn(
                  'truncate text-[11px] leading-tight',
                  isMilestone
                    ? 'font-semibold text-[var(--foreground)]'
                    : 'text-[var(--muted)]',
                )}>
                  {bar.label}
                  {!isMilestone && !isStart && (
                    <span className="ml-1.5 text-[9px] opacity-50">{bar.labelEn}</span>
                  )}
                </span>
              </div>

              {/* 占比 */}
              <div className={cn(
                'text-right text-[11px] tabular-nums',
                bar.type === 'total'    ? 'font-bold text-emerald-700'              :
                bar.type === 'subtotal' ? 'font-semibold text-[var(--foreground)]'  :
                bar.pctOfGross < 0      ? 'text-rose-500'                           : 'text-[var(--muted)]',
              )}>
                {bar.pctOfGross > 0 && !isMilestone && !isStart ? '+' : ''}
                {bar.pctOfGross.toFixed(1)}%
              </div>

              {/* 金额 */}
              <div className={cn(
                'text-right text-[12px] tabular-nums',
                bar.type === 'total'    ? 'font-bold text-emerald-700'              :
                bar.type === 'subtotal' ? 'font-semibold text-[var(--foreground)]'  :
                isNeg                   ? 'text-rose-600 font-medium'               : 'font-medium text-[var(--foreground)]',
              )}>
                {isNeg
                  ? `−${fmt(Math.abs(bar.amount), true)}`
                  : fmt(bar.amount, true)
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Aging Bar ────────────────────────────────────────────────────────────────

function AgingBar({ items }: {
  items: { label: string; amount: number; color: string }[];
}) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <div className="space-y-2">
      {/* 堆叠进度条 */}
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn('h-full transition-all', item.color, i > 0 && 'ml-0.5')}
            style={{ width: `${(item.amount / total) * 100}%` }}
          />
        ))}
      </div>
      {/* 图例 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={cn('size-2 shrink-0 rounded-sm', item.color)} />
            <span className="text-[10px] text-[var(--muted)]">{item.label}</span>
            <span className="text-[10px] font-semibold tabular-nums text-[var(--foreground)]">
              {fmt(item.amount, true)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AR / AP Card ─────────────────────────────────────────────────────────────

function ArApCard() {
  const { ar, ap } = arApSnapshot;
  const arTotal = ar.channelPending + ar.customerInvoice;
  const apTotal = ap.warehouse3pl + ap.carrierFreight + ap.platformFees;

  return (
    <div className="flex flex-col gap-3">

      {/* 应收 AR */}
      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">应收账款</span>
            <span className="text-[10px] text-[var(--muted)]">Receivables</span>
          </div>
          <Link href="/dashboard/receivables"
            className="flex items-center gap-0.5 text-[11px] text-[var(--primary)] hover:underline">
            详情 <ChevronRight className="size-3" />
          </Link>
        </div>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">
            {fmt(arTotal, true)}
          </span>
          <span className="text-[11px] text-[var(--muted)]">总应收</span>
        </div>

        <AgingBar items={AR_AGING} />

        <div className="mt-3 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
          <SnapRow label="渠道待回款"   value={fmt(ar.channelPending, true)}
            cls="font-semibold text-amber-600" href="/dashboard/settlement" />
          <SnapRow label="B2B 客户应收" value={fmt(ar.customerInvoice, true)}
            href="/dashboard/receivables" />
          <SnapRow label="本周预计到账" value={fmt(ar.dueThisWeek, true)}
            cls="font-semibold text-emerald-600" />
          {ar.overdueAr > 0 && (
            <SnapRow label="逾期应收" value={fmt(ar.overdueAr, true)}
              cls="font-semibold text-red-600" href="/dashboard/receivables" />
          )}
        </div>
      </div>

      {/* 应付 AP */}
      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">应付账款</span>
            <span className="text-[10px] text-[var(--muted)]">Payables</span>
          </div>
          <Link href="/dashboard/payables"
            className="flex items-center gap-0.5 text-[11px] text-[var(--primary)] hover:underline">
            详情 <ChevronRight className="size-3" />
          </Link>
        </div>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">
            {fmt(apTotal, true)}
          </span>
          <span className="text-[11px] text-[var(--muted)]">总应付</span>
        </div>

        <AgingBar items={AP_AGING} />

        <div className="mt-3 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
          <SnapRow label="3PL 仓储费"   value={fmt(ap.warehouse3pl, true)}  href="/dashboard/payables" />
          <SnapRow label="承运商运费"   value={fmt(ap.carrierFreight, true)} href="/dashboard/payables" />
          <SnapRow label="平台服务费"   value={fmt(ap.platformFees, true)}   href="/dashboard/payables" />
          <SnapRow label="本周到期付款" value={fmt(ap.dueThisWeek, true)}
            cls="font-semibold text-amber-600" />
          {ap.overdueAp > 0 && (
            <SnapRow label="逾期应付" value={fmt(ap.overdueAp, true)}
              cls="font-semibold text-red-600" href="/dashboard/payables" />
          )}
        </div>
      </div>
    </div>
  );
}

function SnapRow({ label, value, cls, href }: {
  label: string; value: string; cls?: string; href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <span className={cn('text-[12px] tabular-nums', cls ?? 'font-medium text-[var(--foreground)]')}>
        {value}
      </span>
    </div>
  );
  return href
    ? <Link href={href} className="block transition-opacity hover:opacity-70">{inner}</Link>
    : inner;
}

// ─── Channel Comparison Table ─────────────────────────────────────────────────

function ChannelTable() {
  const totalGross      = channelFinanceCards.reduce((s, c) => s + c.grossSales, 0);
  const totalDeductions = channelFinanceCards.reduce((s, c) => s + c.totalDeduction, 0);
  const totalNet        = channelFinanceCards.reduce((s, c) => s + c.netSettlement, 0);
  const blendedFeeRate  = ((totalDeductions / totalGross) * 100).toFixed(1);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-3.5">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">渠道结算对比</h3>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
          本周期各渠道销售额、综合扣减率与实际净结算
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
              <th className="w-36 px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--muted)]">
                渠道
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[var(--muted)]">
                销售总额
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[var(--muted)]">
                综合扣减
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[var(--muted)]">
                扣减率
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[var(--muted)]">
                净结算
              </th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-[var(--muted)]">
                状态
              </th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-[var(--muted)]">
                ERP
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[var(--muted)]">
                到账 / 预计
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {channelFinanceCards.map((ch) => {
              const feeHigh = ch.feeRate > 20;
              const feeMed  = !feeHigh && ch.feeRate > 10;
              return (
                <tr key={ch.channel}
                  className="transition-colors hover:bg-[var(--surface-subtle)]">

                  {/* 渠道名 */}
                  <td className="px-5 py-3">
                    <span className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                      ch.colorCls,
                    )}>
                      {ch.channel}
                    </span>
                  </td>

                  {/* 销售总额 */}
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--foreground)]">
                    {fmt(ch.grossSales, true)}
                  </td>

                  {/* 综合扣减 */}
                  <td className="px-4 py-3 text-right tabular-nums text-rose-500">
                    −{fmt(ch.totalDeduction, true)}
                  </td>

                  {/* 扣减率 */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={cn(
                      'font-semibold',
                      feeHigh ? 'text-red-600' :
                      feeMed  ? 'text-amber-600' : 'text-[var(--muted)]',
                    )}>
                      {ch.feeRate}%
                    </span>
                    {feeHigh && (
                      <span className="ml-1 text-[9px] text-red-500">▲ 偏高</span>
                    )}
                  </td>

                  {/* 净结算 */}
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[var(--foreground)]">
                    {fmt(ch.netSettlement, true)}
                  </td>

                  {/* 结算状态 */}
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                      ch.statusCls,
                    )}>
                      <span className={cn('size-1.5 rounded-full', ch.dotCls)} />
                      {ch.status}
                    </span>
                  </td>

                  {/* ERP 同步 */}
                  <td className="px-4 py-3 text-center">
                    {ch.erpSynced ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                        <CheckCircle2 className="size-3.5" />已同步
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                        <Clock className="size-3.5" />待同步
                      </span>
                    )}
                  </td>

                  {/* 到账时间 */}
                  <td className="px-4 py-3 text-right text-[11px]">
                    {ch.settledAt
                      ? <span className="text-emerald-600">{ch.settledAt}</span>
                      : ch.nextCycleEnd
                        ? <span className="text-amber-600">预计 {ch.nextCycleEnd}</span>
                        : <span className="text-[var(--muted)]">—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* 汇总行 */}
          <tfoot>
            <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-subtle)]">
              <td className="px-5 py-3 text-[12px] font-bold text-[var(--foreground)]">
                全渠道汇总
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-[var(--foreground)]">
                {fmt(totalGross, true)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-rose-600">
                −{fmt(totalDeductions, true)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--muted)]">
                {blendedFeeRate}%
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700">
                {fmt(totalNet, true)}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Other Alerts ─────────────────────────────────────────────────────────────

function OtherAlertsSection({ alerts }: { alerts: FinanceAlert[] }) {
  const SEV_DOT: Record<FinanceAlert['severity'], string> = {
    high:   'bg-red-500',
    medium: 'bg-amber-400',
    low:    'bg-slate-300',
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">其他待处理项</h3>
        <span className="text-[12px] text-[var(--muted)]">{alerts.length} 项</span>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {alerts.map(alert => (
          <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', SEV_DOT[alert.severity])} />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[13px] font-medium text-[var(--foreground)]">
                  {alert.title}
                </span>
                {alert.amount != null && (
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-amber-600">
                    {fmt(alert.amount)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">{alert.description}</p>
            </div>

            <Link
              href={alert.href}
              className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)]"
            >
              {alert.actionLabel}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
