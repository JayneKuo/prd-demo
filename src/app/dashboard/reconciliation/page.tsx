'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, Download, CheckCircle2, AlertTriangle, Clock3, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  reconcileKpi,
  reconcileItems,
  type ReconcileItem,
  type ReconcileType,
  type ReconcileStatus,
} from '@/lib/mock-data/reconciliation';

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(Math.abs(n));
}

// ─── 配置 ─────────────────────────────────────────────────────────────────────

const typeConfig: Record<ReconcileType, { label: string; cls: string }> = {
  payment:    { label: '支付对账',   cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  inventory:  { label: '库存对账',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  accounting: { label: '财务对账',   cls: 'bg-purple-50 text-purple-700 ring-purple-200' },
  fee:        { label: '费用对账',   cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

const statusConfig: Record<ReconcileStatus, { cls: string; icon: React.ElementType; dotCls: string }> = {
  '已匹配': { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2, dotCls: 'bg-emerald-500' },
  '差异':   { cls: 'bg-red-50 text-[var(--danger)] ring-red-200',     icon: AlertTriangle, dotCls: 'bg-red-500' },
  '仅OMS':  { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       icon: Clock3, dotCls: 'bg-amber-400' },
  '仅对方': { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       icon: Clock3, dotCls: 'bg-amber-400' },
  '已核销': { cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', icon: CheckCircle2, dotCls: 'bg-[var(--muted)]' },
};

const tabs = [
  { key: 'all',       label: '全部' },
  { key: 'payment',   label: '支付对账' },
  { key: 'inventory', label: '库存对账' },
  { key: 'accounting',label: '财务对账' },
  { key: 'diff',      label: '有差异' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

// ─── 主页面 ──────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return reconcileItems.filter((r) => {
      if (activeTab === 'payment')    return r.type === 'payment';
      if (activeTab === 'inventory')  return r.type === 'inventory';
      if (activeTab === 'accounting') return r.type === 'accounting';
      if (activeTab === 'diff')       return r.status === '差异' || r.status === '仅OMS' || r.status === '仅对方';
      return true;
    });
  }, [activeTab]);

  const counts: Record<TabKey, number> = useMemo(() => ({
    all:        reconcileItems.length,
    payment:    reconcileItems.filter((r) => r.type === 'payment').length,
    inventory:  reconcileItems.filter((r) => r.type === 'inventory').length,
    accounting: reconcileItems.filter((r) => r.type === 'accounting').length,
    diff:       reconcileItems.filter((r) => ['差异','仅OMS','仅对方'].includes(r.status)).length,
  }), []);

  const matchRate = reconcileKpi.totalItems > 0
    ? Math.round((reconcileKpi.matched / reconcileKpi.totalItems) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* ── 页头 ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">对账管理</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            支付对账 · 库存对账 · 财务对账 — OMS 与外部系统三方比对
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />发起对账
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
        </div>
      </div>

      {/* ── KPI + 匹配率 ── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 匹配率（大卡片） */}
        <div className="col-span-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] sm:col-span-2 lg:col-span-1">
          <div className="text-[12px] text-[var(--muted)]">对账匹配率</div>
          <div className={cn('mt-1 text-[32px] font-bold', matchRate >= 90 ? 'text-[var(--success)]' : matchRate >= 70 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
            {matchRate}%
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
            <div
              className={cn('h-full rounded-full', matchRate >= 90 ? 'bg-[var(--success)]' : matchRate >= 70 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]')}
              style={{ width: `${matchRate}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-[var(--muted)]">
            {reconcileKpi.matched} / {reconcileKpi.totalItems} 条已匹配
          </div>
        </div>

        <StatCard label="差异项" value={`${reconcileKpi.diffCount} 条`}
          sub={`差异金额 ${fmt(reconcileKpi.diffAmount)}`} warn />
        <StatCard label="待处理" value={`${reconcileKpi.pendingCount} 条`}
          sub="仅OMS 或 仅对方" warn={reconcileKpi.pendingCount > 0} />
        <StatCard label="已核销" value={`${reconcileItems.filter((r) => r.status === '已核销').length} 条`}
          sub="历史差异已确认" />
      </div>

      {/* ── 主表格 ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">
          <div className="flex items-center border-b border-[var(--border)] px-5">
            {tabs.map((tab) => {
              const count = counts[tab.key];
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative mr-5 pb-3 pt-2.5 text-[13px] font-medium transition-colors',
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={cn('ml-1.5 text-[11px]',
                      tab.key === 'diff' ? 'text-[var(--danger)]' : 'text-[var(--muted-foreground)]'
                    )}>
                      {count}
                    </span>
                  )}
                  {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">周期</th>
                <th className="whitespace-nowrap px-3 py-2.5">OMS 单号</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">OMS 值</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center">→</th>
                <th className="whitespace-nowrap px-3 py-2.5">对方系统</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">对方值</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">差异</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((row) => (
                <ReconcileTableRow
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[13px] text-[var(--muted)]">
                    暂无对账记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部汇总 */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条对账记录</span>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              已匹配 {filtered.filter((r) => r.status === '已匹配').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" />
              差异 {filtered.filter((r) => r.status === '差异').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              待处理 {filtered.filter((r) => ['仅OMS','仅对方'].includes(r.status)).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 表格行 ───────────────────────────────────────────────────────────────────

function ReconcileTableRow({
  row,
  expanded,
  onToggle,
}: {
  row: ReconcileItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tc = typeConfig[row.type];
  const sc = statusConfig[row.status];
  const StatusIcon = sc.icon;
  const hasDiff = row.diffValue !== 0;

  return (
    <>
      <tr
        className={cn('cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]', expanded && 'bg-[var(--surface-subtle)]')}
        onClick={onToggle}
      >
        {/* 类型 */}
        <td className="whitespace-nowrap px-4 py-3">
          <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', tc.cls)}>
            {tc.label}
          </span>
        </td>

        {/* 周期 */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.period}</td>

        {/* OMS 单号 */}
        <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-[var(--foreground)]">
          {row.omsRef}
        </td>

        {/* OMS 值 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">
          {row.unit === 'USD' ? `$${row.omsValue.toLocaleString()}` : `${row.omsValue.toLocaleString()} ${row.unit}`}
        </td>

        {/* 箭头 */}
        <td className="px-3 py-3 text-center">
          <ArrowRight className="mx-auto size-3.5 text-[var(--muted)]" />
        </td>

        {/* 对方系统 */}
        <td className="whitespace-nowrap px-3 py-3">
          <div className="text-[12px] font-medium text-[var(--foreground)]">{row.counterSystem}</div>
          <div className="font-mono text-[10px] text-[var(--muted)]">{row.counterRef}</div>
        </td>

        {/* 对方值 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[12px] text-[var(--muted)]">
          {row.counterValue === 0 && row.status === '仅OMS' ? (
            <span className="text-[var(--muted-foreground)]">—</span>
          ) : (
            row.unit === 'USD'
              ? `$${row.counterValue.toLocaleString()}`
              : `${row.counterValue.toLocaleString()} ${row.unit}`
          )}
        </td>

        {/* 差异 */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          {hasDiff ? (
            <span className="text-[13px] font-semibold text-[var(--danger)]">
              {row.unit === 'USD' ? `+${fmt(row.diffValue)}` : `+${row.diffValue} ${row.unit}`}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--success)]">0</span>
          )}
        </td>

        {/* 状态 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
            <span className={cn('size-1.5 rounded-full', sc.dotCls)} />
            {row.status}
          </span>
        </td>

        {/* 展开 */}
        <td className="px-3 py-3">
          <span className="flex size-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-hover)]">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={10} className="px-0 py-0">
            <ReconcileDetail row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── 展开详情 ─────────────────────────────────────────────────────────────────

function ReconcileDetail({ row }: { row: ReconcileItem }) {
  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
      {/* 差异说明 */}
      {row.diffNote && (
        <div className={cn(
          'mb-4 flex items-start gap-2 rounded-xl px-3.5 py-3 ring-1 ring-inset',
          row.status === '差异'  ? 'bg-red-50 ring-red-200'    :
          row.status === '已核销' ? 'bg-[var(--surface-subtle)] ring-[var(--border)]' :
          'bg-amber-50 ring-amber-200'
        )}>
          <AlertTriangle className={cn('mt-0.5 size-4 shrink-0',
            row.status === '差异' ? 'text-[var(--danger)]' :
            row.status === '已核销' ? 'text-[var(--muted)]' : 'text-amber-600'
          )} />
          <p className={cn('text-[12px]',
            row.status === '差异' ? 'text-[var(--danger)]' :
            row.status === '已核销' ? 'text-[var(--muted)]' : 'text-amber-700'
          )}>
            {row.diffNote}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 对比详情 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">对比详情</h4>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] text-[12px]">
            <InfoLine label="对账类型"    value={typeConfig[row.type].label} />
            <InfoLine label="对账周期"    value={row.period} />
            <InfoLine label="OMS 单号"    value={row.omsRef} mono />
            <InfoLine label="对方系统"    value={row.counterSystem} />
            <InfoLine label="对方单号"    value={row.counterRef} mono />
            <InfoLine label="OMS 值"
              value={row.unit === 'USD' ? `$${row.omsValue.toLocaleString()}` : `${row.omsValue.toLocaleString()} ${row.unit}`}
            />
            <InfoLine label="对方值"
              value={row.counterValue === 0 && row.status === '仅OMS' ? '—' :
                row.unit === 'USD' ? `$${row.counterValue.toLocaleString()}` : `${row.counterValue.toLocaleString()} ${row.unit}`}
            />
            {row.diffValue !== 0 && (
              <InfoLine label="差异"
                value={row.unit === 'USD' ? fmt(row.diffValue) : `${Math.abs(row.diffValue)} ${row.unit}`}
                cls="font-semibold text-[var(--danger)]"
              />
            )}
          </div>
        </div>

        {/* 处理信息 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">处理信息</h4>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] text-[12px]">
            <InfoLine label="状态"        value={row.status} />
            <InfoLine label="创建时间"    value={row.createdAt} />
            {row.resolvedBy && <InfoLine label="核销人"   value={row.resolvedBy} />}
            {row.resolvedAt && <InfoLine label="核销时间" value={row.resolvedAt} />}
          </div>

          {/* 操作按钮 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {row.status === '差异' && (
              <>
                <button className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                  确认核销
                </button>
                <button className="flex h-7 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                  发起调查
                </button>
              </>
            )}
            {(row.status === '仅OMS' || row.status === '仅对方') && (
              <button className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                手动推送同步
              </button>
            )}
            {row.status === '已核销' && (
              <span className="flex items-center gap-1 text-[12px] text-[var(--success)]">
                <CheckCircle2 className="size-3.5" />已核销，无需操作
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 小组件 ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      warn ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)] bg-[var(--surface)]'
    )}>
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className={cn('mt-1 text-[20px] font-bold', warn ? 'text-amber-700' : 'text-[var(--foreground)]')}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}

function InfoLine({ label, value, mono, cls }: { label: string; value: string; mono?: boolean; cls?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn('font-medium', mono && 'font-mono text-[11px]', cls ?? 'text-[var(--foreground)]')}>
        {value}
      </span>
    </div>
  );
}
