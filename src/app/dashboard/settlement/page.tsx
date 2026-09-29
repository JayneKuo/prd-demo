'use client';

import { useState, useMemo } from 'react';
import { Download, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { settlementKpi, settlementRows, type SettlementRow, type SettlementStatus } from '@/lib/mock-data/settlement';

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const tabs = [
  { key: 'all',        label: '全部' },
  { key: '已结算',     label: '已结算' },
  { key: '处理中',     label: '处理中' },
  { key: '待确认',     label: '待确认' },
  { key: 'unmatched',  label: '对账差异' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const channelColors: Record<string, string> = {
  Amazon:       'bg-orange-50 text-orange-700 ring-orange-200',
  Shopify:      'bg-green-50 text-green-700 ring-green-200',
  'TikTok Shop':'bg-pink-50 text-pink-700 ring-pink-200',
  Walmart:      'bg-blue-50 text-blue-700 ring-blue-200',
  Stripe:       'bg-indigo-50 text-indigo-700 ring-indigo-200',
  PayPal:       'bg-sky-50 text-sky-700 ring-sky-200',
};

const statusConfig: Record<SettlementStatus, { cls: string; dot: string }> = {
  '已结算': { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  '处理中': { cls: 'bg-blue-50 text-blue-700 ring-blue-200',          dot: 'bg-blue-500' },
  '待确认': { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-400' },
  '异常':   { cls: 'bg-red-50 text-[var(--danger)] ring-red-200',     dot: 'bg-red-500' },
};

const reconcileConfig = {
  matched:   { label: '已匹配', cls: 'text-[var(--success)]' },
  unmatched: { label: '差异',   cls: 'text-[var(--danger)]' },
  pending:   { label: '待核',   cls: 'text-[var(--muted)]' },
};

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────

export default function SettlementPage() {
  const [activeTab, setActiveTab]   = useState<TabKey>('all');
  const [channelFilter, setChannelFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return settlementRows.filter((row) => {
      if (activeTab === '已结算')   return row.status === '已结算';
      if (activeTab === '处理中')   return row.status === '处理中';
      if (activeTab === '待确认')   return row.status === '待确认';
      if (activeTab === 'unmatched') return row.reconcileStatus === 'unmatched';
      return true;
    }).filter((row) => !channelFilter || row.channel === channelFilter);
  }, [activeTab, channelFilter]);

  const counts = {
    all: settlementRows.length,
    '已结算':    settlementRows.filter((r) => r.status === '已结算').length,
    '处理中':    settlementRows.filter((r) => r.status === '处理中').length,
    '待确认':    settlementRows.filter((r) => r.status === '待确认').length,
    unmatched:   settlementRows.filter((r) => r.reconcileStatus === 'unmatched').length,
  };

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* ── 页头 ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">结算管理</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            查看各渠道回款结算状态 · 核对到账金额与平台账单差异
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />同步
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
        </div>
      </div>

      {/* ── KPI 卡片 ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="待回款"
          value={fmt(settlementKpi.pendingAmount)}
          sub="含处理中 + 待确认"
          trend="neutral"
        />
        <KpiCard
          label="已确认回款"
          value={fmt(settlementKpi.confirmedAmount)}
          sub="本月累计已结算"
          trend="up"
        />
        <KpiCard
          label="费用扣减"
          value={fmt(settlementKpi.feeDeduction)}
          sub="平台手续费 + 广告"
          trend="down"
        />
        <KpiCard
          label="净回款"
          value={fmt(settlementKpi.netSettled)}
          sub="实际到账合计"
          trend="up"
        />
      </div>

      {/* ── 渠道概览条 ── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {settlementKpi.byChannel.map((ch) => {
          const sc = statusConfig[ch.status];
          return (
            <div key={ch.channel} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', channelColors[ch.channel] ?? 'bg-gray-50 text-gray-700 ring-gray-200')}>
                  {ch.channel}
                </span>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
                  <span className={cn('size-1.5 rounded-full', sc.dot)} />
                  {ch.status}
                </span>
              </div>
              <div className="mt-2 text-[17px] font-semibold text-[var(--foreground)]">
                {ch.netAmount > 0 ? fmt(ch.netAmount) : '—'}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--muted)]">费率 {ch.feeRate}%</div>
            </div>
          );
        })}
      </div>

      {/* ── 主表格卡片 ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs + 过滤器 */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5">
            <div className="flex items-center gap-5">
              {tabs.map((tab) => {
                const count = counts[tab.key];
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'relative pb-3 pt-2.5 text-[13px] font-medium transition-colors',
                      isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={cn('ml-1.5 text-[11px]', tab.key === 'unmatched' ? 'text-[var(--danger)]' : 'text-[var(--muted-foreground)]')}>
                        {count}
                      </span>
                    )}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className={cn(
                'h-7 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                channelFilter
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
              )}
            >
              <option value="">全部渠道</option>
              {['Amazon', 'Shopify', 'TikTok Shop', 'Walmart'].map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">结算单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">渠道 / 店铺</th>
                <th className="whitespace-nowrap px-3 py-2.5">结算周期</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">销售总额</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">手续费 + 扣减</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">净结算金额</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">对账</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">订单数</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((row) => (
                <SettlementTableRow
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[13px] text-[var(--muted)]">
                    暂无结算记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部汇总 */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条结算记录</span>
          <div className="flex items-center gap-6 text-[12px]">
            <span>
              净结算合计：
              <span className="ml-1 font-semibold text-[var(--foreground)]">
                {fmt(filtered.reduce((s, r) => s + r.netAmount, 0))}
              </span>
            </span>
            <span>
              销售总额：
              <span className="ml-1 font-semibold text-[var(--foreground)]">
                {fmt(filtered.reduce((s, r) => s + r.grossAmount, 0))}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 表格行（含展开明细） ─────────────────────────────────────────────────────

function SettlementTableRow({
  row,
  expanded,
  onToggle,
}: {
  row: SettlementRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sc = statusConfig[row.status];
  const rc = reconcileConfig[row.reconcileStatus];
  const totalDeduction = row.feeAmount + row.refundAmount + row.adAmount + row.otherDeduction;

  return (
    <>
      <tr
        className={cn('cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]', expanded && 'bg-[var(--surface-subtle)]')}
        onClick={onToggle}
      >
        {/* 结算单号 */}
        <td className="whitespace-nowrap px-4 py-3">
          <div className="font-mono text-[12px] font-medium text-[var(--foreground)]">{row.settlementNo}</div>
          {row.settledAt && <div className="text-[11px] text-[var(--muted)]">到账 {row.settledAt}</div>}
        </td>

        {/* 渠道 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', channelColors[row.channel] ?? 'bg-gray-50 text-gray-700 ring-gray-200')}>
            {row.channel}
          </span>
          <div className="mt-0.5 text-[11px] text-[var(--muted)]">{row.merchant}</div>
        </td>

        {/* 周期 */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
          {row.periodStart} – {row.periodEnd}
        </td>

        {/* 销售总额 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">
          {fmt(row.grossAmount)}
        </td>

        {/* 手续费扣减 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[12px] text-[var(--danger)]">
          -{fmt(totalDeduction)}
        </td>

        {/* 净结算 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[14px] font-semibold text-[var(--foreground)]">
          {fmt(row.netAmount)}
        </td>

        {/* 状态 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
            <span className={cn('size-1.5 rounded-full', sc.dot)} />
            {row.status}
          </span>
        </td>

        {/* 对账 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('text-[12px] font-medium', rc.cls)}>
            {rc.label}
            {row.reconcileDiff && (
              <span className="ml-1 text-[var(--danger)]">({fmt(row.reconcileDiff)})</span>
            )}
          </span>
        </td>

        {/* 订单数 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[12px] text-[var(--muted)]">
          {row.orderCount.toLocaleString()}
        </td>

        {/* 展开按钮 */}
        <td className="px-3 py-3">
          <span className="flex size-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-hover)]">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </td>
      </tr>

      {/* 展开行：明细 */}
      {expanded && (
        <tr>
          <td colSpan={10} className="px-0 py-0">
            <SettlementDetail row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── 展开明细 ─────────────────────────────────────────────────────────────────

function SettlementDetail({ row }: { row: SettlementRow }) {
  const totalDeduction = row.feeAmount + row.refundAmount + row.adAmount + row.otherDeduction;
  const effectiveFeeRate = row.grossAmount > 0 ? (totalDeduction / row.grossAmount) * 100 : 0;

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
      {/* 异常提示 */}
      {row.exceptionNote && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-[12px] text-amber-700">{row.exceptionNote}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 金额拆分 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">金额拆分</h4>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] text-[12px]">
            <DetailLine label="销售总额"      value={fmt(row.grossAmount)}       />
            <DetailLine label="退款扣减"      value={`-${fmt(row.refundAmount)}`}  cls="text-[var(--danger)]" />
            <DetailLine label="平台手续费"    value={`-${fmt(row.feeAmount)}`}     cls="text-[var(--danger)]" />
            {row.adAmount > 0 && (
              <DetailLine label="广告费扣减"  value={`-${fmt(row.adAmount)}`}      cls="text-[var(--danger)]" />
            )}
            {row.otherDeduction > 0 && (
              <DetailLine label="其他扣减"    value={`-${fmt(row.otherDeduction)}`} cls="text-[var(--danger)]" />
            )}
            <div className="flex items-center justify-between bg-[var(--surface-subtle)] px-3 py-2.5 font-semibold">
              <span className="text-[var(--foreground)]">净结算金额</span>
              <span className="text-[14px] text-[var(--foreground)]">{fmt(row.netAmount)}</span>
            </div>
          </div>
        </div>

        {/* 汇总指标 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">结算指标</h4>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] text-[12px]">
            <DetailLine label="币种"             value={row.currency} />
            <DetailLine label="关联订单数"       value={row.orderCount.toLocaleString()} />
            <DetailLine label="综合扣减率"       value={`${effectiveFeeRate.toFixed(1)}%`} />
            <DetailLine label="结算周期"         value={`${row.periodStart} — ${row.periodEnd}`} />
            <DetailLine label="预计/实际到账日"  value={row.settledAt ?? '待结算'} />
            <DetailLine label="对账状态"
              value={reconcileConfig[row.reconcileStatus].label}
              cls={reconcileConfig[row.reconcileStatus].cls}
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="flex h-7 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
          <ExternalLink className="size-3" />查看订单明细
        </button>
        {row.reconcileStatus === 'unmatched' && (
          <button className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
            发起对账核查
          </button>
        )}
        {row.status === '待确认' && (
          <button className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
            确认结算
          </button>
        )}
        <button className="flex h-7 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
          <Download className="size-3" />下载账单
        </button>
      </div>
    </div>
  );
}

// ─── 小组件 ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-[var(--success)]' : trend === 'down' ? 'text-[var(--danger)]' : 'text-[var(--muted)]';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[var(--muted)]">{label}</span>
        <TrendIcon className={cn('size-4', trendColor)} />
      </div>
      <div className="mt-1.5 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{value}</div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}

function DetailLine({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn('font-medium', cls ?? 'text-[var(--foreground)]')}>{value}</span>
    </div>
  );
}
