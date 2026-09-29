'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import {
  BookOpen, X, ArrowRight, TrendingUp, TrendingDown, ChevronRight,
  ChevronDown, AlertTriangle, ExternalLink, CheckCircle2, BookMarked,
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
  type ChannelFinanceCard,
  type FinanceAlert,
  type FlowLane,
  type FlowStep,
  type FeeItem,
  type FinancialLine,
  STEP_FINANCIALS,
  LANE_ARROW_CONFIG,
  type LaneArrowConfig,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceDashboardPage() {
  const [flowOpen, setFlowOpen] = useState(false);
  const kpi = financeDashboardKpi;

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* ── 页头 ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">财务概览</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            多渠道结算 · 应收应付 · 成本利润 — OMS 财务视角
          </p>
        </div>
        <button
          onClick={() => setFlowOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-3.5 py-2 text-[13px] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
        >
          <BookOpen className="size-4" />
          查看财务业务流程
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="净收入"         labelEn="Net Revenue"
          value={fmt(kpi.netRevenue, true)}
          delta={`+${kpi.netRevenueDelta}%`} deltaDir="up"
          sub="vs 上周期"
        />
        <KpiCard
          label="毛利率"         labelEn="Gross Margin"
          value={`${kpi.grossMargin}%`}
          delta={`${kpi.grossMarginDelta > 0 ? '+' : ''}${kpi.grossMarginDelta}pp`}
          deltaDir={kpi.grossMarginDelta >= 0 ? 'up' : 'down'}
          sub="扣除 COGS 后"
        />
        <KpiCard
          label="贡献毛利率"     labelEn="Contribution Margin"
          value={`${kpi.contributionMargin}%`}
          delta="+0.8pp"  deltaDir="up"
          sub="扣除运营成本后"
        />
        <KpiCard
          label="渠道待回款"     labelEn="Pending Settlement"
          value={fmt(kpi.pendingSettlement, true)}
          delta={`${kpi.pendingChannels} 个渠道未到账`} deltaDir="neutral"
          sub="TikTok · Walmart"
          warn
        />
        <KpiCard
          label="总应付"         labelEn="Total Payable"
          value={fmt(kpi.totalPayable, true)}
          delta={`逾期 ${fmt(kpi.overduePayable, true)}`}
          deltaDir={kpi.overduePayable > 0 ? 'down' : 'neutral'}
          sub="3PL · 承运商 · 平台"
        />
      </div>

      {/* ── P&L Bridge + AR/AP ── */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <PLFunnelCard />
        <ArApCard />
      </div>

      {/* ── 渠道卡片 ── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {channelFinanceCards.map((ch) => <ChannelCard key={ch.channel} ch={ch} />)}
      </div>

      {/* ── 待处理预警 ── */}
      <AlertsSection />

      {/* ── 业务流程面板 ── */}
      {flowOpen && <FinanceFlowPanel onClose={() => setFlowOpen(false)} />}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, labelEn, value, delta, deltaDir, sub, warn,
}: {
  label: string; labelEn: string; value: string;
  delta: string; deltaDir: 'up' | 'down' | 'neutral';
  sub: string; warn?: boolean;
}) {
  const DeltaIcon = deltaDir === 'up' ? TrendingUp : deltaDir === 'down' ? TrendingDown : null;
  const deltaCls =
    deltaDir === 'up'   ? 'text-[var(--success)]' :
    deltaDir === 'down' ? 'text-[var(--danger)]'  : 'text-[var(--muted)]';

  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      warn ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)] bg-[var(--surface)]',
    )}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] text-[var(--muted)]">{label}</span>
        {DeltaIcon && <DeltaIcon className={cn('size-3.5 shrink-0', deltaCls)} />}
      </div>
      <div className={cn('mt-1 text-[20px] font-bold tracking-tight',
        warn ? 'text-amber-700' : 'text-[var(--foreground)]')}>
        {value}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className={cn('text-[11px] font-medium', deltaCls)}>{delta}</span>
        <span className="text-[11px] text-[var(--muted)]">{sub}</span>
      </div>
    </div>
  );
}

// ─── P&L Funnel ───────────────────────────────────────────────────────────────
// 左侧 SVG 漏斗（4 个里程碑层级）+ 右侧逐行明细表

const FUNNEL_LEVELS = [
  { label: '渠道销售总额', labelEn: 'Gross Channel Sales',     pct: 100.0, amount: 289680, color: '#3b82f6' },
  { label: '净收入',       labelEn: 'Net Revenue',             pct: 97.1,  amount: 281220, color: '#6366f1' },
  { label: '毛利润',       labelEn: 'Gross Profit  58.4%',     pct: 58.4,  amount: 169220, color: '#8b5cf6' },
  { label: '贡献毛利',     labelEn: 'Contribution  41.8%',     pct: 41.8,  amount: 121022, color: '#10b981' },
] as const;

const FUNNEL_DROP_LABELS = [
  ['退款 / 折扣  −$8.5k  (−2.9%)'],
  ['商品成本 COGS  −$112k  (−38.7%)'],
  ['仓储 −$13k', '运输 −$19k', '平台费 −$14k', '支付费 −$2k'],
];

function PLFunnelCard() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
            收入成本结构 — P&L Funnel
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            本月 · 全渠道汇总 · Gross Sales → Contribution Margin
          </p>
        </div>
        <div className="hidden items-center gap-4 text-[10px] text-[var(--muted)] sm:flex">
          {[['#3b82f6','收入'], ['#ef4444','成本扣减'], ['#10b981','利润里程碑']].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* SVG 漏斗 */}
        <div className="flex items-start justify-center">
          <FunnelSVG />
        </div>
        {/* 逐行明细表 */}
        <WaterfallTable />
      </div>
    </div>
  );
}

// SVG 漏斗图组件
function FunnelSVG() {
  const W = 240, H = 272;
  const BAR_H = 34, ROW_H = 82;

  const bw = (pct: number) => (W * pct) / 100;
  const bx = (pct: number) => (W - bw(pct)) / 2;

  // 预计算梯形路径（在 bars 之前绘制，保持 bar 在顶层）
  const traps = FUNNEL_LEVELS.slice(0, -1).map((level, i) => {
    const next  = FUNNEL_LEVELS[i + 1];
    const x0 = bx(level.pct), w0 = bw(level.pct);
    const x1 = bx(next.pct),  w1 = bw(next.pct);
    const ty = i * ROW_H + BAR_H;
    const by = (i + 1) * ROW_H;
    return {
      path: `M${x0},${ty} L${x0+w0},${ty} L${x1+w1},${by} L${x1},${by} Z`,
      ty, by,
      drops: FUNNEL_DROP_LABELS[i],
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[240px]" style={{ height: H }}>
      {/* 梯形（背景层） */}
      {traps.map((trap, i) => (
        <g key={`trap-${i}`}>
          <path d={trap.path} fill="#e2e8f0" opacity={0.65} />
          {trap.drops.map((drop, di) => {
            const textY = trap.ty + (trap.by - trap.ty) * (di + 1) / (trap.drops.length + 1) + 3;
            return (
              <text key={di} x={W / 2} y={textY}
                textAnchor="middle" fontSize={8} fill="#dc2626" fontWeight="500">
                {drop}
              </text>
            );
          })}
        </g>
      ))}

      {/* 层级条（前景层） */}
      {FUNNEL_LEVELS.map((level, i) => {
        const w = bw(level.pct);
        const x = bx(level.pct);
        const y = i * ROW_H;
        return (
          <g key={level.label}>
            <rect x={x} y={y} width={w} height={BAR_H}
              fill={level.color} rx={4} opacity={0.9} />
            <text x={W / 2} y={y + BAR_H / 2 - 3}
              textAnchor="middle" fontSize={10} fontWeight="700" fill="white">
              {level.label}
            </text>
            <text x={W / 2} y={y + BAR_H / 2 + 10}
              textAnchor="middle" fontSize={8} fill="white" opacity={0.88}>
              {level.pct}%  ·  ${(level.amount / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 右侧逐行明细表
function WaterfallTable() {
  const GROSS = cashWaterfall[0].amount;
  return (
    <div className="space-y-[2px] pt-1">
      {cashWaterfall.map((bar) => {
        const isMilestone = bar.type === 'subtotal' || bar.type === 'total';
        const isNeg       = bar.type === 'negative';
        const barPct      = isMilestone
          ? (bar.runningTotal / GROSS) * 100
          : (Math.abs(bar.amount) / GROSS) * 100;
        const offsetPct   = isNeg ? (bar.runningTotal / GROSS) * 100 : 0;

        const barColor =
          bar.type === 'start'    ? 'bg-blue-500'   :
          bar.type === 'negative' ? 'bg-rose-400'   :
          bar.type === 'subtotal' ? 'bg-slate-300'  : 'bg-emerald-500';

        const rowBg =
          bar.type === 'subtotal' ? 'rounded bg-[var(--surface-subtle)]' :
          bar.type === 'total'    ? 'rounded bg-emerald-50'              : '';

        return (
          <div key={bar.id}
            className={cn('grid items-center gap-2 px-2 py-[5px]', rowBg, isMilestone ? 'mt-1' : '')}
            style={{ gridTemplateColumns: '1fr 56px 52px' }}>

            {/* 标签 + 细条 */}
            <div className="min-w-0">
              <div className="relative mb-1 h-[7px] overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                {isMilestone ? (
                  <div className={cn('absolute left-0 top-0 h-full rounded-full', barColor)}
                    style={{ width: `${barPct}%` }} />
                ) : (
                  <div className={cn('absolute top-0 h-full rounded-full', barColor)}
                    style={{ width: `${barPct}%`, left: `${offsetPct}%` }} />
                )}
              </div>
              <div className={cn('truncate text-[11px] leading-tight',
                isMilestone ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--muted)]')}>
                {bar.label}
              </div>
              <div className="truncate text-[9px] text-[var(--muted-foreground)]">{bar.labelEn}</div>
            </div>

            {/* 百分比 */}
            <div className={cn('text-right text-[10px] tabular-nums',
              bar.type === 'total'    ? 'font-bold text-emerald-700'              :
              bar.type === 'subtotal' ? 'font-semibold text-[var(--foreground)]'  :
              bar.pctOfGross < 0      ? 'text-rose-500'                           : 'text-[var(--muted)]')}>
              {bar.pctOfGross.toFixed(1)}%
            </div>

            {/* 金额 */}
            <div className={cn('text-right text-[11px] tabular-nums',
              bar.type === 'total'    ? 'font-bold text-emerald-700'              :
              bar.type === 'subtotal' ? 'font-semibold text-[var(--foreground)]'  :
              isNeg                   ? 'text-rose-600'                           : 'text-[var(--foreground)]')}>
              {isNeg ? `−${fmt(Math.abs(bar.amount), true)}` : fmt(bar.amount, true)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AR / AP Snapshot ─────────────────────────────────────────────────────────

function ArApCard() {
  const { ar, ap } = arApSnapshot;

  return (
    <div className="flex flex-col gap-4">
      {/* AR */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[var(--foreground)]">
            应收 · Receivables
          </span>
          <Link href="/dashboard/receivables"
            className="flex items-center gap-0.5 text-[11px] text-[var(--primary)] hover:underline">
            详情 <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="space-y-2 text-[12px]">
          <SnapLine label="渠道待回款"   value={fmt(ar.channelPending, true)}  cls="font-semibold text-amber-600"     href="/dashboard/settlement" />
          <SnapLine label="B2B 客户应收" value={fmt(ar.customerInvoice, true)} href="/dashboard/receivables" />
          <SnapLine label="逾期应收"     value={fmt(ar.overdueAr, true)}       cls="font-semibold text-[var(--danger)]" href="/dashboard/receivables" />
          <div className="border-t border-[var(--border-subtle)] pt-2">
            <SnapLine label="本周预计到账" value={fmt(ar.dueThisWeek, true)} cls="font-semibold text-emerald-600" />
          </div>
        </div>
      </div>

      {/* AP */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[var(--foreground)]">
            应付 · Payables
          </span>
          <Link href="/dashboard/payables"
            className="flex items-center gap-0.5 text-[11px] text-[var(--primary)] hover:underline">
            详情 <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="space-y-2 text-[12px]">
          <SnapLine label="3PL 仓储费"  value={fmt(ap.warehouse3pl, true)}   href="/dashboard/payables" />
          <SnapLine label="承运商运费"  value={fmt(ap.carrierFreight, true)}  href="/dashboard/payables" />
          <SnapLine label="平台服务费"  value={fmt(ap.platformFees, true)}    href="/dashboard/payables" />
          <SnapLine label="逾期应付"    value={fmt(ap.overdueAp, true)}       cls="font-semibold text-[var(--danger)]" href="/dashboard/payables" />
          <div className="border-t border-[var(--border-subtle)] pt-2">
            <SnapLine label="本周到期付款" value={fmt(ap.dueThisWeek, true)} cls="font-semibold text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapLine({ label, value, cls, href }: {
  label: string; value: string; cls?: string; href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn('tabular-nums', cls ?? 'font-medium text-[var(--foreground)]')}>{value}</span>
    </div>
  );
  return href
    ? <Link href={href} className="block transition-opacity hover:opacity-70">{inner}</Link>
    : inner;
}

// ─── Channel Card ─────────────────────────────────────────────────────────────

function ChannelCard({ ch }: { ch: ChannelFinanceCard }) {
  const feeColor = ch.feeRate > 20 ? 'text-rose-600' : ch.feeRate > 10 ? 'text-amber-600' : 'text-[var(--muted)]';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', ch.colorCls)}>
          {ch.channel}
        </span>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', ch.statusCls)}>
          <span className={cn('size-1.5 rounded-full', ch.dotCls)} />
          {ch.status}
        </span>
      </div>

      <div className="space-y-1.5 text-[12px]">
        <Row label="销售总额"   value={fmt(ch.grossSales, true)} />
        <Row label="综合扣减率" value={`${ch.feeRate}%`} valCls={feeColor} />
        <div className="border-t border-[var(--border-subtle)] pt-1.5">
          <Row label="净结算" value={fmt(ch.netSettlement, true)} valCls="text-[14px] font-bold text-[var(--foreground)]" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className={ch.erpSynced ? 'text-[var(--success)]' : 'text-amber-600'}>
          {ch.erpSynced ? '✓ NetSuite 已同步' : '⏳ 待 ERP 同步'}
        </span>
        <span className="text-[var(--muted)]">
          {ch.settledAt ? `到账 ${ch.settledAt}` : ch.nextCycleEnd ? `预计 ${ch.nextCycleEnd}` : '—'}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, valCls }: { label: string; value: string; valCls?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn('font-medium text-[var(--foreground)]', valCls)}>{value}</span>
    </div>
  );
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function AlertsSection() {
  const sevDot: Record<FinanceAlert['severity'], string> = {
    high:   'bg-red-500',
    medium: 'bg-amber-400',
    low:    'bg-[var(--muted)]',
  };
  const highCount = financeAlerts.filter((a) => a.severity === 'high').length;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">待处理项</h3>
          {highCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
              {highCount} 高优先
            </span>
          )}
        </div>
        <span className="text-[12px] text-[var(--muted)]">{financeAlerts.length} 项</span>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {financeAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn('flex items-start gap-3 px-5 py-3.5',
              alert.severity === 'high' ? 'bg-red-50/50' : '')}
          >
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', sevDot[alert.severity])} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[13px] font-medium text-[var(--foreground)]">{alert.title}</span>
                {alert.amount != null && (
                  <span className={cn('shrink-0 text-[12px] font-semibold tabular-nums',
                    alert.severity === 'high' ? 'text-red-600' : 'text-amber-600')}>
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

  // 按 rowSize 切分步骤为多行
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
                {/* 换行连接符 */}
                {rowIdx > 0 && (
                  <RowBreakConnector label={arrows[rowBreakIndex]} />
                )}

                {/* 步骤横排 + 箭头 */}
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

                {/* 展开详情（本行下方，全宽） */}
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
      {/* 序号 + 指示点 */}
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

      {/* 中文标题 */}
      <div className="flex-1 text-[11px] font-semibold leading-tight text-[var(--foreground)] line-clamp-2">
        {step.titleCn}
      </div>

      {/* Actor badge */}
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
// 点击步骤后展开的全宽面板，2 列布局：左侧说明+资金明细，右侧费用+会计+注意事项

function ExpandedStepDetail({ step, onClose }: { step: FlowStep; onClose: () => void }) {
  const am               = actorMeta[step.actorType];
  const [acctOpen, setAcctOpen] = useState(!!step.isKeyEvent);
  const hasFees   = (step.fees?.length ?? 0) > 0;
  const hasAcct   = !!(step.accountingNote || step.accountingNoteCn);
  const hasIssues = (step.commonIssues?.length ?? 0) > 0;
  const breakdown = STEP_FINANCIALS[step.id];

  return (
    <div className="mt-2 overflow-hidden rounded-xl border-2 border-[var(--primary)] bg-[var(--surface)] shadow-lg">

      {/* 面板标题 */}
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

      {/* 2 列内容 */}
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_400px]">

        {/* 左列：简单说 + 发生了什么 + 资金明细 */}
        <div className="space-y-4">
          {/* 简单说 */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">💡 简单说</p>
            <p className="text-[13px] font-medium leading-snug text-blue-900">{step.summary}</p>
          </div>

          {/* 发生了什么 */}
          <div>
            <SectionLabel>发生了什么</SectionLabel>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--foreground)]">
              {step.whatHappens}
            </p>
          </div>

          {/* 💵 资金明细 */}
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

        {/* 右列：费用 + 财务处理 + 注意事项 + 跳转 */}
        <div className="space-y-4">
          {/* 💰 费用 */}
          {hasFees && (
            <div>
              <SectionLabel icon="💰">本步骤可能产生的费用</SectionLabel>
              <div className="space-y-2">
                {step.fees!.map((fee) => <FeeCard key={fee.nameEn} fee={fee} />)}
              </div>
            </div>
          )}

          {/* 📊 财务处理（可折叠） */}
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

          {/* ⚠️ 注意事项 */}
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

          {/* OMS 模块跳转 */}
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
  // 分隔/节标题行
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
    line.type === 'inflow'   ? 'text-emerald-600 font-semibold'            :
    line.type === 'outflow'  ? 'text-rose-600 font-semibold'               :
    line.type === 'total'    ? 'text-[var(--foreground)] font-bold text-[13px]' :
    line.type === 'subtotal' ? 'text-[var(--foreground)] font-semibold'    :
    'text-[var(--muted)]';

  const rowBg =
    line.type === 'total'    ? 'bg-[var(--surface-subtle)]' :
    line.type === 'subtotal' ? 'bg-[var(--surface-subtle)]/50' : '';

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
          line.type === 'total'    ? 'font-bold text-[var(--foreground)]'       :
          line.type === 'subtotal' ? 'font-semibold text-[var(--foreground)]'   :
          line.type === 'note'     ? 'text-[11px] italic text-[var(--muted-foreground)]' :
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
    '商家':    { label: '商家承担',  cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
    '平台代扣':{ label: '平台代扣',  cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
    '客户':    { label: '客户承担',  cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    '—':      { label: '无',        cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]' },
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
