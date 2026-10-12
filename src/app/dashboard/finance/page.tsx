'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, Clock,
  TrendingUp, TrendingDown, ChevronRight, X, Calendar,
  BookOpen, ArrowRight, ChevronDown, ExternalLink, BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  financeDashboardKpi,
  cashWaterfall,
  channelFinanceCards,
  arApSnapshot,
  financeAlerts,
  financeFlowLanes,
  actorMeta,
  type FinanceAlert,
  type FlowLane,
  type FlowStep,
  type FeeItem,
  type FinancialLine,
  STEP_FINANCIALS,
  LANE_ARROW_CONFIG,
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
  const [flowOpen, setFlowOpen] = useState(false);

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
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setFlowOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-3.5 py-2 text-[13px] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
          >
            <BookOpen className="size-4" />
            查看财务业务流程
            <ArrowRight className="size-3.5" />
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
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

      {/* ── 业务流程面板 ── */}
      {flowOpen && <FinanceFlowPanel onClose={() => setFlowOpen(false)} />}
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

// ─── Finance Flow Panel ───────────────────────────────────────────────────────
// Tab 切换（O2C / P2P / R2R）+ 步骤网格 + 无滚动条 · US GAAP

type LaneId = 'o2c' | 'p2p' | 'r2r';

const LANE_TABS: { id: LaneId; label: string; labelEn: string; steps: number }[] = [
  { id: 'o2c', label: '订单→收款',  labelEn: 'Order-to-Cash',    steps: 10 },
  { id: 'p2p', label: '采购→付款',  labelEn: 'Procure-to-Pay',   steps: 6  },
  { id: 'r2r', label: '记账→报告',  labelEn: 'Record-to-Report', steps: 6  },
];

const LANE_COLORS: Record<FlowLane['colorScheme'], {
  tab: string; tabActive: string; border: string; hdrBg: string; hdrText: string;
  seqBg: string; keyBorder: string; keyBg: string; tag: string;
}> = {
  blue: {
    tab:       'text-blue-700 hover:bg-blue-50',
    tabActive: 'bg-blue-600 text-white',
    border:    'border-blue-400', hdrBg: 'bg-blue-50', hdrText: 'text-blue-800',
    seqBg:     'bg-blue-500',    keyBorder: 'border-blue-300', keyBg: 'bg-blue-50/60',
    tag:       'bg-blue-100 text-blue-700',
  },
  violet: {
    tab:       'text-violet-700 hover:bg-violet-50',
    tabActive: 'bg-violet-600 text-white',
    border:    'border-violet-400', hdrBg: 'bg-violet-50', hdrText: 'text-violet-800',
    seqBg:     'bg-violet-500',    keyBorder: 'border-violet-300', keyBg: 'bg-violet-50/60',
    tag:       'bg-violet-100 text-violet-700',
  },
  emerald: {
    tab:       'text-emerald-700 hover:bg-emerald-50',
    tabActive: 'bg-emerald-600 text-white',
    border:    'border-emerald-400', hdrBg: 'bg-emerald-50', hdrText: 'text-emerald-800',
    seqBg:     'bg-emerald-500',    keyBorder: 'border-emerald-300', keyBg: 'bg-emerald-50/60',
    tag:       'bg-emerald-100 text-emerald-700',
  },
};

// ─── Finance Flow Panel ───────────────────────────────────────────────────────
// 横向流程带箭头 · 点击步骤在行下方展开 · 2 列详情布局

function FinanceFlowPanel({ onClose }: { onClose: () => void }) {
  const [activeLaneId, setActiveLaneId] = useState<LaneId>('o2c');
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const lane     = financeFlowLanes.find(l => l.id === activeLaneId)!;
  const c        = LANE_COLORS[lane.colorScheme];
  const arrowCfg = LANE_ARROW_CONFIG[activeLaneId];

  function switchLane(id: LaneId) {
    setActiveLaneId(id);
    setExpandedStepId(null);
  }

  function toggleStep(id: string) {
    setExpandedStepId(prev => prev === id ? null : id);
  }

  const { rowSize, rowBreakIndex, arrows } = arrowCfg;

  const rows: FlowStep[][] = [];
  for (let i = 0; i < lane.steps.length; i += rowSize) {
    rows.push(lane.steps.slice(i, i + rowSize));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white">

      {/* ── 顶部固定栏 ── */}
      <div className="shrink-0 border-b border-[var(--border)] bg-white px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookMarked className="size-5 shrink-0 text-[var(--primary)]" />
            <div>
              <div className="text-[16px] font-bold text-[var(--foreground)]">
                Finance Business Process Flow
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                OMS 财务业务流程 · US GAAP · ASC 606 · 点击步骤查看详情与资金明细
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="mt-3 flex items-center gap-1">
          {LANE_TABS.map((tab) => {
            const isActive = tab.id === activeLaneId;
            const tabLane  = financeFlowLanes.find(l => l.id === tab.id)!;
            const tc       = LANE_COLORS[tabLane.colorScheme];
            return (
              <button
                key={tab.id}
                onClick={() => switchLane(tab.id as LaneId)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all',
                  isActive ? tc.tabActive : tc.tab,
                )}
              >
                <span className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                  isActive ? 'bg-white/30 text-white' : 'bg-white text-[var(--muted)]',
                )}>
                  {tab.steps}
                </span>
                <span className="hidden sm:block">{tab.labelEn}</span>
                <span className="text-[11px] opacity-80">{tab.label}</span>
              </button>
            );
          })}
          <div className="ml-auto hidden items-center gap-4 text-[10px] text-[var(--muted)] lg:flex">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-400" />关键会计事件
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />含资金明细
            </span>
          </div>
        </div>
      </div>

      {/* ── 主体（隐藏滚动条）── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <div className="mx-auto max-w-[1440px] space-y-3 p-5">

          {/* 泳道标题 */}
          <div className={cn('rounded-xl border-l-[4px] px-4 py-3', c.border, c.hdrBg)}>
            <div className="flex items-baseline gap-2">
              <h3 className={cn('text-[14px] font-bold', c.hdrText)}>{lane.title}</h3>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', c.tag)}>
                {lane.steps.length} 个步骤
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">{lane.subtitle}</p>
          </div>

          {/* 步骤行 + 展开区 */}
          {rows.map((row, rowIdx) => {
            const rowStart      = rowIdx * rowSize;
            const expandedInRow = row.find(s => s.id === expandedStepId);

            return (
              <div key={rowIdx}>
                {rowIdx > 0 && (
                  <RowBreakConnector label={arrows[rowBreakIndex]} />
                )}
                <div className="flex items-stretch gap-0">
                  {row.map((step, stepInRow) => {
                    const globalIdx   = rowStart + stepInRow;
                    const isLastInRow = stepInRow === row.length - 1;

                    return (
                      <Fragment key={step.id}>
                        <StepFlowCard
                          step={step}
                          colors={c}
                          isExpanded={step.id === expandedStepId}
                          onClick={() => toggleStep(step.id)}
                        />
                        {!isLastInRow && (
                          <ArrowConnector label={arrows[globalIdx]} />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
                {expandedInRow && (
                  <ExpandedStepDetail
                    step={expandedInRow}
                    onClose={() => toggleStep(expandedInRow.id)}
                  />
                )}
              </div>
            );
          })}

          {/* 参考资料 */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5 text-[10px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">References · </span>
            ASC 606 / IFRS 15 Revenue Recognition · ASC 330 Inventory (FIFO / WA) · US GAAP Accrual Basis · SOX Internal Controls · US Sales Tax Nexus
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Flow Card ───────────────────────────────────────────────────────────

function StepFlowCard({
  step, colors, isExpanded, onClick,
}: {
  step: FlowStep;
  colors: (typeof LANE_COLORS)['blue'];
  isExpanded: boolean;
  onClick: () => void;
}) {
  const am           = actorMeta[step.actorType];
  const hasFinancial = !!STEP_FINANCIALS[step.id];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col rounded-xl border p-3 text-left transition-all min-h-[88px]',
        step.isKeyEvent
          ? cn('border-t-4', colors.border, 'bg-white')
          : 'border border-[var(--border)] bg-white',
        isExpanded
          ? cn('shadow-md ring-2 ring-[var(--primary)] ring-offset-1', colors.hdrBg)
          : 'hover:border-[var(--primary)] hover:shadow-sm',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className={cn(
          'flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white',
          colors.seqBg,
        )}>
          {step.seq}
        </span>
        <div className="flex items-center gap-1">
          {step.isKeyEvent  && <span className="size-1.5 rounded-full bg-amber-400" title="关键会计事件" />}
          {hasFinancial     && <span className="size-1.5 rounded-full bg-emerald-400" title="含资金明细" />}
        </div>
      </div>
      <div className="flex-1 text-[11px] font-semibold leading-tight text-[var(--foreground)] line-clamp-2">
        {step.titleCn}
      </div>
      <span className={cn('mt-1.5 block truncate rounded px-1 py-0.5 text-[9px] font-medium', am.bg, am.text)}>
        {am.label}
      </span>
    </button>
  );
}

// ─── Arrow Connector ──────────────────────────────────────────────────────────

function ArrowConnector({ label }: { label: string }) {
  return (
    <div
      className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5"
      style={{ paddingTop: '18px' }}
    >
      <span
        className="max-w-[44px] truncate text-center text-[8px] font-medium leading-tight text-[var(--muted)]"
        title={label}
      >
        {label}
      </span>
      <div className="flex items-center">
        <div className="h-px w-4 border-t border-dashed border-[var(--border)]" />
        <ArrowRight className="size-3 shrink-0 text-[var(--muted)]" />
      </div>
    </div>
  );
}

// ─── Row Break Connector ──────────────────────────────────────────────────────

function RowBreakConnector({ label }: { label: string }) {
  return (
    <div className="my-1 flex justify-end pr-2">
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[9px] font-medium text-[var(--muted)]">{label}</span>
        <div className="flex items-center gap-0.5">
          <div className="h-3 w-px border-l border-dashed border-[var(--border)]" />
          <ChevronDown className="size-2.5 text-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}

// ─── Expanded Step Detail ─────────────────────────────────────────────────────

function ExpandedStepDetail({ step, onClose }: { step: FlowStep; onClose: () => void }) {
  const am               = actorMeta[step.actorType];
  const [acctOpen, setAcctOpen] = useState(!!step.isKeyEvent);
  const hasFees   = (step.fees?.length ?? 0) > 0;
  const hasAcct   = !!(step.accountingNote || step.accountingNoteCn);
  const hasIssues = (step.commonIssues?.length ?? 0) > 0;
  const breakdown = STEP_FINANCIALS[step.id];

  return (
    <div className="mt-2 overflow-hidden rounded-xl border-2 border-[var(--primary)] bg-[var(--surface)] shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <span className="text-[11px] text-[var(--muted)]">Step {step.seq}</span>
          {step.isKeyEvent && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-400" />关键财务事件
            </span>
          )}
          <h4 className="text-[15px] font-bold text-[var(--foreground)]">{step.titleCn}</h4>
          <span className="text-[11px] text-[var(--muted)]">{step.title}</span>
          <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', am.bg, am.text)}>
            {step.actor}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-hover)]"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_400px]">
        {/* 左列 */}
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">💡 简单说</p>
            <p className="text-[13px] font-medium leading-snug text-blue-900">{step.summary}</p>
          </div>
          <div>
            <SectionLabel>发生了什么</SectionLabel>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--foreground)]">
              {step.whatHappens}
            </p>
          </div>
          {breakdown && breakdown.length > 0 && (
            <div>
              <SectionLabel icon="💵">资金明细</SectionLabel>
              <p className="mb-2 text-[10px] italic text-[var(--muted)]">
                示例订单：商品 $80 − 优惠券 $5 + 运费 $10 + 税 $8 = 客户实付 $93 · 利润 $29（34.1%）
              </p>
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {breakdown.map((line, i) => (
                  <FinancialLineRow key={i} line={line} isLast={i === breakdown.length - 1} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右列 */}
        <div className="space-y-4">
          {hasFees && (
            <div>
              <SectionLabel icon="💰">本步骤可能产生的费用</SectionLabel>
              <div className="space-y-2">
                {step.fees!.map((fee) => <FeeCard key={fee.nameEn} fee={fee} />)}
              </div>
            </div>
          )}
          {hasAcct && (
            <div>
              <button
                onClick={() => setAcctOpen(v => !v)}
                className="flex w-full items-center justify-between py-0.5"
              >
                <SectionLabel icon="📊" className="mb-0">财务处理 / Accounting</SectionLabel>
                <ChevronDown className={cn('size-4 text-[var(--muted)] transition-transform', acctOpen && 'rotate-180')} />
              </button>
              {acctOpen && (
                <div className="mt-2 space-y-2.5">
                  {step.accountingNoteCn && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                        会计分录说明（中文）
                      </p>
                      <p className="whitespace-pre-line text-[12px] leading-relaxed text-[var(--foreground)]">
                        {step.accountingNoteCn}
                      </p>
                    </div>
                  )}
                  {step.accountingNote && (
                    <div className="rounded-xl border border-[var(--border)] bg-[#0f172a] px-4 py-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Journal Entry (Professional)
                      </p>
                      <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-200">
                        {step.accountingNote}
                      </pre>
                    </div>
                  )}
                  {step.standardCn && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                        📖 会计准则参考
                      </p>
                      <p className="text-[12px] leading-relaxed text-amber-900">{step.standardCn}</p>
                      {step.standard && (
                        <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-amber-700 opacity-80">
                          {step.standard}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {hasIssues && (
            <div>
              <SectionLabel icon="⚠️">注意事项 / 常见问题</SectionLabel>
              <ul className="space-y-2">
                {step.commonIssues!.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-[var(--foreground)]">
                    <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {step.moduleLink && (
            <Link
              href={step.moduleLink}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-3.5 py-2 text-[12px] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
            >
              <ExternalLink className="size-3.5" />
              在 OMS 中查看此模块
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Financial Line Row ───────────────────────────────────────────────────────

function FinancialLineRow({ line, isLast }: { line: FinancialLine; isLast: boolean }) {
  if (line.type === 'note' && line.amount === '') {
    return (
      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          {line.label}
        </span>
      </div>
    );
  }

  const amtCls =
    line.type === 'inflow'   ? 'text-emerald-600 font-semibold'                  :
    line.type === 'outflow'  ? 'text-rose-600 font-semibold'                     :
    line.type === 'total'    ? 'text-[var(--foreground)] font-bold text-[13px]'  :
    line.type === 'subtotal' ? 'text-[var(--foreground)] font-semibold'          :
    'text-[var(--muted)]';

  const rowBg =
    line.type === 'total'    ? 'bg-[var(--surface-subtle)]'      :
    line.type === 'subtotal' ? 'bg-[var(--surface-subtle)]/50'   : '';

  return (
    <div className={cn(
      'flex items-start justify-between gap-3 px-3 py-2 text-[12px]',
      !isLast && 'border-b border-[var(--border-subtle)]',
      rowBg,
      line.type === 'total' && 'border-t-2 border-[var(--border)]',
    )}>
      <div className="min-w-0 flex-1">
        <span className={cn(
          'leading-snug',
          line.type === 'total'    ? 'font-bold text-[var(--foreground)]'                    :
          line.type === 'subtotal' ? 'font-semibold text-[var(--foreground)]'                :
          line.type === 'note'     ? 'text-[11px] italic text-[var(--muted-foreground)]'     :
          'text-[var(--foreground)]',
        )}>
          {line.label}
        </span>
        {line.labelEn && line.type !== 'note' && (
          <span className="ml-1.5 text-[10px] text-[var(--muted)]">{line.labelEn}</span>
        )}
        {line.note && (
          <p className="mt-0.5 text-[10px] italic text-[var(--muted)]">{line.note}</p>
        )}
      </div>
      <span className={cn('shrink-0 tabular-nums', amtCls)}>{line.amount}</span>
    </div>
  );
}

// ─── 费用卡片 ─────────────────────────────────────────────────────────────────

function FeeCard({ fee }: { fee: FeeItem }) {
  const payerConfig: Record<FeeItem['payer'], { label: string; cls: string }> = {
    '商家':     { label: '商家承担', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
    '平台代扣': { label: '平台代扣', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
    '客户':     { label: '客户承担', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    '—':        { label: '无',       cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]' },
  };
  const pc = payerConfig[fee.payer];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[var(--foreground)]">{fee.name}</div>
          <div className="text-[10px] text-[var(--muted)]">{fee.nameEn}</div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', pc.cls)}>
          {pc.label}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">{fee.description}</p>
      <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5">
        <span className="text-[10px] text-[var(--muted)]">费率：</span>
        <span className="font-mono text-[10px] font-semibold text-[var(--foreground)]">{fee.typical}</span>
      </div>
    </div>
  );
}

// ─── 小工具 ───────────────────────────────────────────────────────────────────

function SectionLabel({ icon, children, className }: {
  icon?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <p className={cn('mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]', className)}>
      {icon && <span>{icon}</span>}
      {children}
    </p>
  );
}
