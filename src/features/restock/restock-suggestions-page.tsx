'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Download, Package, RefreshCw, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeRestockSuggestions, computeRestockSummary, type RestockSuggestion, type UrgencyLevel } from '@/lib/restock-suggestions';

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const URGENCY_CFG: Record<UrgencyLevel, { label: string; badgeCls: string; dotCls: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical:    { label: '危急',  badgeCls: 'bg-red-50 text-red-700 ring-red-200',     dotCls: 'bg-red-500',    icon: AlertCircle },
  warning:     { label: '预警',  badgeCls: 'bg-amber-50 text-amber-700 ring-amber-200', dotCls: 'bg-amber-400', icon: AlertTriangle },
  normal:      { label: '正常',  badgeCls: 'bg-blue-50 text-blue-700 ring-blue-200',   dotCls: 'bg-blue-500',  icon: Package },
  overstocked: { label: '充足',  badgeCls: 'bg-gray-100 text-gray-500 ring-gray-200',  dotCls: 'bg-gray-300',  icon: CheckCircle2 },
};

const SNOOZE_OPTIONS = [
  { label: '7 天后', days: 7 },
  { label: '14 天后', days: 14 },
  { label: '30 天后', days: 30 },
];

// ─── 子组件 ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, cls }: { label: string; value: number | string; sub?: string; cls: string }) {
  return (
    <div className={cn('rounded-xl border px-5 py-4', cls)}>
      <p className="text-[12px] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', cls)}>{children}</span>;
}

/** 覆盖天数可视化条 */
function DocBar({ doc, leadTime }: { doc: number; leadTime: number }) {
  const max = 90;
  const pct = Math.min(100, (doc / max) * 100);
  const color = doc === 0 ? 'bg-red-500'
    : doc < leadTime ? 'bg-red-400'
    : doc < leadTime + 14 ? 'bg-amber-400'
    : doc < 60 ? 'bg-blue-500'
    : 'bg-gray-300';
  const label = doc >= 999 ? '∞' : doc.toFixed(0);
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--border)]" title={`覆盖 ${label} 天`}>
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[12px] font-medium tabular-nums w-8 text-right">{label}d</span>
    </div>
  );
}

/** 趋势箭头 */
function Trend({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.03) return <span className="text-[var(--muted)] text-[11px]">—</span>;
  return pct > 0
    ? <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600"><TrendingUp className="size-3" />{(pct * 100).toFixed(0)}%</span>
    : <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-500"><TrendingDown className="size-3" />{(Math.abs(pct) * 100).toFixed(0)}%</span>;
}

/** 单行推迟 Dropdown */
function SnoozeMenu({ onSnooze }: { onSnooze: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="flex h-7 items-center gap-0.5 rounded-lg border border-[var(--border)] px-2 text-[12px] hover:bg-[var(--surface-hover)]"
        onClick={() => setOpen(v => !v)}
      >
        推迟<ChevronDown className="size-3 text-[var(--muted)]" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          {SNOOZE_OPTIONS.map(opt => (
            <button key={opt.days} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-[var(--surface-subtle)]"
              onClick={() => { onSnooze(opt.days); setOpen(false); }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 展开行：分仓库存 + 销量分解 */
function ExpandedRow({ s, colSpan }: { s: RestockSuggestion; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-[var(--surface-subtle)] px-5 pb-4 pt-2">
        <div className="grid gap-5 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
          {/* 库存分解 */}
          <div>
            <p className="mb-2 font-semibold text-[var(--muted)]">库存分解</p>
            <table className="w-full">
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[
                  { label: '自有仓可用', value: s.warehouseAvail },
                  { label: 'FBA 可发货', value: s.fbaFulfillable },
                  { label: '自有仓在途', value: s.inboundWarehouse },
                  { label: 'FBA 入库中', value: s.inboundFba },
                ].map(({ label, value }) => (
                  <tr key={label}>
                    <td className="py-1 text-[var(--muted)]">{label}</td>
                    <td className="py-1 text-right font-medium tabular-nums">{value.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)]">
                  <td className="py-1 font-semibold">合计</td>
                  <td className="py-1 text-right font-semibold tabular-nums">{(s.totalAvail + s.totalInbound).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 销量分解 */}
          <div>
            <p className="mb-2 font-semibold text-[var(--muted)]">销量趋势（Demo 模拟数据）</p>
            {[
              { period: '近 7 天', qty: s.sales7d, rate: (s.sales7d / 7).toFixed(1) },
              { period: '近 30 天', qty: s.sales30d, rate: s.dailyRate.toFixed(1) },
              { period: '近 90 天', qty: s.sales90d, rate: (s.sales90d / 90).toFixed(1) },
            ].map(({ period, qty, rate }) => (
              <div key={period} className="mb-2">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">{period}</span>
                  <span className="font-medium tabular-nums">{qty} 件（{rate}/日）</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-[var(--border)]">
                  <div className="h-full rounded-full bg-[var(--primary)] opacity-50"
                    style={{ width: `${Math.min(100, (qty / s.sales30d) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* 建议来源 */}
          <div>
            <p className="mb-2 font-semibold text-[var(--muted)]">建议来源</p>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
              <p className="font-medium">{s.bestSourceWarehouseCode}</p>
              <p className="mt-1 text-[var(--muted)]">可用 {s.bestSourceAvail.toLocaleString()} 件</p>
              {s.suggestedQty > 0 && (
                <p className="mt-2 text-[var(--muted)]">
                  建议补货 <strong className="text-[var(--foreground)]">{s.suggestedQty.toLocaleString()}</strong> 件
                  · 价值 <strong className="text-[var(--foreground)]">${s.reorderValue.toLocaleString()}</strong>
                </p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              目标覆盖 {s.targetDays} 天 · 前置期 {s.leadTimeDays} 天
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export function RestockSuggestionsPage() {
  const router = useRouter();
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [onlyWithSuggestion, setOnlyWithSuggestion] = useState(false);
  const [dismissedSkus, setDismissedSkus] = useState<Set<string>>(new Set());
  const [snoozedSkus, setSnoozedSkus] = useState<Map<string, Date>>(new Map());
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());

  // 计算所有建议（含已忽略/推迟的，过滤在展示层处理）
  const allSuggestions = useMemo(() => computeRestockSuggestions(), []);
  const summary = useMemo(() => computeRestockSummary(allSuggestions), [allSuggestions]);

  const now = new Date();
  const activeSuggestions = useMemo(() => {
    return allSuggestions.filter(s => {
      if (dismissedSkus.has(s.sku)) return false;
      const snoozedUntil = snoozedSkus.get(s.sku);
      if (snoozedUntil && snoozedUntil > now) return false;
      return true;
    });
  }, [allSuggestions, dismissedSkus, snoozedSkus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeSuggestions.filter(s => {
      if (urgencyFilter !== 'all' && s.urgency !== urgencyFilter) return false;
      if (onlyWithSuggestion && s.suggestedQty === 0) return false;
      if (q && !`${s.sku} ${s.productTitle} ${s.variantLabel}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeSuggestions, urgencyFilter, onlyWithSuggestion, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedSkus.has(s.sku));

  const toggleSelect = (sku: string) => setSelectedSkus(prev => {
    const next = new Set(prev);
    next.has(sku) ? next.delete(sku) : next.add(sku);
    return next;
  });

  const handleSnooze = (sku: string, days: number) => {
    const until = new Date(); until.setDate(until.getDate() + days);
    setSnoozedSkus(prev => new Map(prev).set(sku, until));
    setSelectedSkus(prev => { const next = new Set(prev); next.delete(sku); return next; });
  };

  const handleDismiss = (sku: string) => {
    setDismissedSkus(prev => new Set(prev).add(sku));
    setSelectedSkus(prev => { const next = new Set(prev); next.delete(sku); return next; });
  };

  const handleCreatePlan = (sku: string, qty: number) => {
    router.push(`/dashboard/inbound-plans/new?skus=${encodeURIComponent(`${sku}:${qty}`)}`);
  };

  const handleBatchCreatePlan = () => {
    const skusWithQty = filtered
      .filter(s => selectedSkus.has(s.sku) && s.suggestedQty > 0)
      .map(s => `${s.sku}:${s.suggestedQty}`)
      .join(',');
    if (!skusWithQty) return;
    router.push(`/dashboard/inbound-plans/new?skus=${encodeURIComponent(skusWithQty)}`);
  };

  const totalBatchValue = filtered
    .filter(s => selectedSkus.has(s.sku) && s.suggestedQty > 0)
    .reduce((sum, s) => sum + s.reorderValue, 0);

  const urgencyOrder: UrgencyLevel[] = ['critical', 'warning', 'normal', 'overstocked'];
  const sortedFiltered = [...filtered].sort((a, b) => urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency));

  return (
    <main className="mx-auto max-w-[1600px] pt-5 pb-10 lg:pt-6">

      {/* ══ 页头 ══ */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">备货建议</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            基于近期动销数据自动分析 · 更新时间 2026-11-17 08:00 · 数据来源：OMS 订单、仓库库存、FBA 同步（Demo 模拟数据）
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />刷新
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
        </div>
      </div>

      {/* ══ 统计卡片 ══ */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="危急" value={summary.critical} sub="可用库存不足前置期" cls="border-red-200 bg-red-50/60" />
        <StatCard label="预警" value={summary.warning} sub="低于安全库存线" cls="border-amber-200 bg-amber-50/60" />
        <StatCard label="建议补货 SKU" value={summary.totalSuggestedSkus} sub={`共 ${allSuggestions.length} 个在监控`} cls="border-[var(--border)] bg-[var(--surface)]" />
        <StatCard
          label="建议总补货价值"
          value={`$${summary.totalReorderValue.toLocaleString()}`}
          sub="按单位成本估算"
          cls="border-[var(--border)] bg-[var(--surface)]"
        />
      </div>

      {/* ══ 批量操作条（有选中时显示） ══ */}
      {selectedSkus.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--primary)] bg-blue-50/60 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-[var(--primary)]">已选 {selectedSkus.size} 个 SKU</span>
          {totalBatchValue > 0 && (
            <span className="text-[12px] text-[var(--muted)]">· 合计价值 ${totalBatchValue.toLocaleString()}</span>
          )}
          <button
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
            onClick={handleBatchCreatePlan}
          >
            批量创建入库计划
          </button>
          <button
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--surface-hover)]"
            onClick={() => { [...selectedSkus].forEach(sku => handleSnooze(sku, 7)); }}
          >
            批量推迟 7 天
          </button>
          <button
            className="ml-auto text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => setSelectedSkus(new Set())}
          >
            清除选择
          </button>
        </div>
      )}

      {/* ══ 筛选栏 ══ */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
          <Search className="size-3.5 text-[var(--muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索 SKU / 商品名称"
            className="w-[180px] bg-transparent text-[12px] outline-none placeholder:text-[var(--muted)]"
          />
          {search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}
        </div>

        {/* 紧急程度筛选 */}
        {(['all', 'critical', 'warning', 'normal', 'overstocked'] as const).map(key => {
          const isAll = key === 'all';
          const cfg = isAll ? null : URGENCY_CFG[key];
          const count = isAll ? filtered.length : filtered.filter(s => s.urgency === key).length;
          const active = urgencyFilter === key;
          return (
            <button
              key={key}
              onClick={() => setUrgencyFilter(key)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition',
                active
                  ? isAll ? 'bg-[var(--foreground)] text-[var(--background)]' : cfg!.badgeCls + ' ring-1 ring-inset'
                  : 'border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]'
              )}
            >
              {!isAll && cfg && <span className={cn('size-2 rounded-full', cfg.dotCls)} />}
              {isAll ? '全部' : cfg!.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active && !isAll ? 'bg-white/30' : 'bg-[var(--border)] text-[var(--muted)]')}>
                {count}
              </span>
            </button>
          );
        })}

        <label className="ml-auto flex h-8 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] px-3 text-[12px] hover:bg-[var(--surface-subtle)]">
          <input type="checkbox" checked={onlyWithSuggestion} onChange={e => setOnlyWithSuggestion(e.target.checked)} className="size-3" />
          仅显示有建议的
        </label>
      </div>

      {/* ══ 主表格 ══ */}
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="全选"
                    checked={allFilteredSelected}
                    onChange={() => setSelectedSkus(allFilteredSelected ? new Set() : new Set(filtered.map(s => s.sku)))}
                  />
                </th>
                <th className="px-3 py-3">SKU / 商品</th>
                <th className="px-3 py-3">可用库存</th>
                <th className="px-3 py-3">在途</th>
                <th className="px-3 py-3">日均（趋势）</th>
                <th className="px-3 py-3">覆盖天数</th>
                <th className="px-3 py-3 text-right">建议补货量</th>
                <th className="px-3 py-3 text-right">预计补货价值</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {sortedFiltered.map(s => {
                const cfg = URGENCY_CFG[s.urgency];
                const Icon = cfg.icon;
                const isExpanded = expandedSku === s.sku;
                const isSelected = selectedSkus.has(s.sku);

                return (
                  <>
                    <tr
                      key={s.sku}
                      className={cn(
                        'transition-colors hover:bg-[var(--surface-subtle)]',
                        isSelected && 'bg-blue-50/40',
                        isExpanded && 'bg-[var(--surface-subtle)]',
                      )}
                    >
                      {/* 复选框 */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(s.sku)} />
                      </td>

                      {/* SKU + 商品名 */}
                      <td
                        className="cursor-pointer px-3 py-3"
                        onClick={() => setExpandedSku(isExpanded ? null : s.sku)}
                      >
                        <div className="flex items-start gap-2">
                          <span className={cn('mt-0.5 size-2 shrink-0 rounded-full', cfg.dotCls)} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{s.sku}</span>
                              <Badge cls={cfg.badgeCls}>{cfg.label}</Badge>
                            </div>
                            <div className="mt-0.5 text-[12px] text-[var(--muted)]">
                              {s.productTitle}{s.variantLabel ? ` · ${s.variantLabel}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 可用库存 */}
                      <td className="px-3 py-3">
                        <span className="font-medium tabular-nums">{s.totalAvail.toLocaleString()}</span>
                        {s.fbaFulfillable > 0 && (
                          <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                            仓 {s.warehouseAvail.toLocaleString()} + FBA {s.fbaFulfillable.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* 在途 */}
                      <td className="px-3 py-3 tabular-nums text-[var(--muted)]">
                        {s.totalInbound > 0 ? s.totalInbound.toLocaleString() : '—'}
                      </td>

                      {/* 日均 + 趋势 */}
                      <td className="px-3 py-3">
                        <span className="font-medium tabular-nums">{s.dailyRate.toFixed(1)}</span>
                        <span className="ml-1.5"><Trend pct={s.trendPct} /></span>
                      </td>

                      {/* 覆盖天数条 */}
                      <td className="px-3 py-3">
                        <DocBar doc={s.docAvail} leadTime={s.leadTimeDays} />
                      </td>

                      {/* 建议量 */}
                      <td className="px-3 py-3 text-right">
                        {s.suggestedQty > 0 ? (
                          <span className="font-semibold tabular-nums text-[var(--foreground)]">
                            {s.suggestedQty.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* 价值 */}
                      <td className="px-3 py-3 text-right tabular-nums">
                        {s.reorderValue > 0 ? (
                          <span className="font-medium">${s.reorderValue.toLocaleString()}</span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* 操作 */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {s.suggestedQty > 0 && (
                            <button
                              className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-semibold text-white hover:opacity-90"
                              onClick={() => handleCreatePlan(s.sku, s.suggestedQty)}
                            >
                              创建计划<ArrowRight className="size-3" />
                            </button>
                          )}
                          <SnoozeMenu onSnooze={days => handleSnooze(s.sku, days)} />
                          <button
                            className="flex h-7 items-center rounded-lg border border-[var(--border)] px-2 text-[12px] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                            onClick={() => handleDismiss(s.sku)}
                            title="忽略此次建议"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 展开行 */}
                    {isExpanded && <ExpandedRow key={`${s.sku}-expanded`} s={s} colSpan={9} />}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedFiltered.length === 0 && (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
            <p className="mt-3 text-[14px] font-medium">暂无符合条件的备货建议</p>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              {onlyWithSuggestion || urgencyFilter !== 'all' ? '调整筛选条件可查看更多 SKU' : '所有 SKU 库存充足，无需补货'}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {sortedFiltered.length} 个 SKU · {dismissedSkus.size > 0 && `${dismissedSkus.size} 个已忽略`}</span>
          {dismissedSkus.size > 0 && (
            <button className="hover:text-[var(--foreground)]" onClick={() => setDismissedSkus(new Set())}>
              恢复所有已忽略
            </button>
          )}
        </div>
      </section>

      {/* ══ 说明 ══ */}
      <p className="mt-4 text-[11px] text-[var(--muted)]">
        📊 覆盖天数 = 可用库存 ÷ 日均销量 · 建议量 = 目标 60 天覆盖 − 现有（含在途） · 价值 = 建议量 × 入库成本 · 本页数据仅供参考，创建入库计划后进入正式审批与执行流程。
      </p>
    </main>
  );
}
