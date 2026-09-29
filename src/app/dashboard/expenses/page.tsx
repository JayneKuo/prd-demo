'use client';

import { useState, useMemo } from 'react';
import { Plus, Download, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Clock3, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  expenseKpi,
  expenseRows,
  expenseTypeConfig,
  expenseStatusConfig,
  allocationMethodLabel,
  type ExpenseRow,
  type ExpenseType,
  type ExpenseStatus,
} from '@/lib/mock-data/expenses';

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const tabs = [
  { key: 'all',    label: '全部' },
  { key: '待审批', label: '待审批' },
  { key: '待付款', label: '待付款' },
  { key: '有争议', label: '有争议' },
  { key: '已付款', label: '已付款' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const typeOptions: { value: '' | ExpenseType; label: string }[] = [
  { value: '',           label: '全部类型' },
  { value: 'warehouse',  label: '仓储费' },
  { value: 'freight',    label: '运输费' },
  { value: 'platform',   label: '平台费' },
  { value: 'payment',    label: '支付手续费' },
  { value: 'return',     label: '退货处理' },
  { value: 'other',      label: '其他' },
];

// ─── 主页面 ──────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [activeTab, setActiveTab]   = useState<TabKey>('all');
  const [typeFilter, setTypeFilter] = useState<'' | ExpenseType>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return expenseRows.filter((row) => {
      if (activeTab !== 'all' && row.status !== activeTab) return false;
      if (typeFilter && row.type !== typeFilter) return false;
      return true;
    });
  }, [activeTab, typeFilter]);

  const counts: Record<TabKey, number> = useMemo(() => ({
    all:    expenseRows.length,
    '待审批': expenseRows.filter((r) => r.status === '待审批').length,
    '待付款': expenseRows.filter((r) => r.status === '待付款').length,
    '有争议': expenseRows.filter((r) => r.status === '有争议').length,
    '已付款': expenseRows.filter((r) => r.status === '已付款').length,
  }), []);

  // 按类型汇总
  const typeSummary = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      map[r.type] = (map[r.type] ?? 0) + r.amount;
    });
    return map;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* ── 页头 ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">费用管理</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            管理仓储、运输、平台等运营费用 · 关联订单成本分摊
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />同步账单
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
            <Plus className="size-3.5" />录入费用
          </button>
        </div>
      </div>

      {/* ── KPI 卡片 ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="本月总费用"   value={fmt(expenseKpi.totalThisMonth)}  highlight />
        <KpiCard label="仓储费"       value={fmt(expenseKpi.warehouseTotal)}  />
        <KpiCard label="运输费"       value={fmt(expenseKpi.freightTotal)}    />
        <KpiCard label="平台费"       value={fmt(expenseKpi.platformTotal)}   />
        <KpiCard label="待审批"       value={`${expenseKpi.pendingApproval} 笔`} warn={expenseKpi.pendingApproval > 0} />
        <KpiCard label="待付款"       value={`${expenseKpi.pendingPayment} 笔`}  warn={expenseKpi.pendingPayment > 0} />
      </div>

      {/* ── 费用类型分布条 ── */}
      <ExpenseTypeBreakdown rows={filtered} />

      {/* ── 主表格 ── */}
      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
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
                      <span className={cn(
                        'ml-1.5 text-[11px]',
                        tab.key === '有争议' ? 'text-[var(--danger)]' :
                        tab.key === '待审批' ? 'text-amber-600' : 'text-[var(--muted-foreground)]'
                      )}>
                        {count}
                      </span>
                    )}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as '' | ExpenseType)}
              className={cn(
                'h-7 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                typeFilter
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
              )}
            >
              {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">费用单号 / 描述</th>
                <th className="whitespace-nowrap px-3 py-2.5">类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">供应商</th>
                <th className="whitespace-nowrap px-3 py-2.5">账单日期</th>
                <th className="whitespace-nowrap px-3 py-2.5">到期日</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">金额</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">成本分摊</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((row) => (
                <ExpenseTableRow
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-[var(--muted)]">
                    暂无费用记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部汇总 */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条费用记录</span>
          <div className="flex items-center gap-6">
            {Object.entries(typeSummary).map(([type, total]) => {
              const tc = expenseTypeConfig[type as ExpenseType];
              return (
                <span key={type} className="flex items-center gap-1.5">
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] ring-1 ring-inset', tc.cls)}>{tc.label}</span>
                  <span className="font-medium text-[var(--foreground)]">{fmt(total)}</span>
                </span>
              );
            })}
            <span className="border-l border-[var(--border-subtle)] pl-4 font-semibold text-[var(--foreground)]">
              合计 {fmt(filtered.reduce((s, r) => s + r.amount, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 费用类型分布条 ───────────────────────────────────────────────────────────

function ExpenseTypeBreakdown({ rows }: { rows: ExpenseRow[] }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (total === 0) return null;

  const byType: { type: ExpenseType; amount: number }[] = [];
  const map: Partial<Record<ExpenseType, number>> = {};
  rows.forEach((r) => { map[r.type] = (map[r.type] ?? 0) + r.amount; });
  (Object.keys(map) as ExpenseType[]).forEach((t) => byType.push({ type: t, amount: map[t]! }));
  byType.sort((a, b) => b.amount - a.amount);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted-foreground)]">
        <Info className="size-3.5" />费用类型分布
      </div>
      {/* 堆叠进度条 */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {byType.map(({ type, amount }) => {
          const pct = (amount / total) * 100;
          const colorMap: Record<ExpenseType, string> = {
            warehouse: 'bg-blue-400',
            freight:   'bg-purple-400',
            platform:  'bg-orange-400',
            payment:   'bg-indigo-400',
            return:    'bg-pink-400',
            other:     'bg-gray-400',
          };
          return (
            <div
              key={type}
              className={cn('h-full', colorMap[type])}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      {/* 图例 */}
      <div className="mt-3 flex flex-wrap gap-4">
        {byType.map(({ type, amount }) => {
          const tc = expenseTypeConfig[type];
          return (
            <div key={type} className="flex items-center gap-2 text-[12px]">
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] ring-1 ring-inset', tc.cls)}>{tc.label}</span>
              <span className="font-medium text-[var(--foreground)]">{fmt(amount)}</span>
              <span className="text-[var(--muted)]">{((amount / total) * 100).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 表格行 ───────────────────────────────────────────────────────────────────

function ExpenseTableRow({
  row,
  expanded,
  onToggle,
}: {
  row: ExpenseRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tc = expenseTypeConfig[row.type];
  const sc = expenseStatusConfig[row.status];

  const isOverdue = !row.paidAt && new Date(row.dueDate) < new Date('2026-09-21');

  return (
    <>
      <tr
        className={cn('cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]', expanded && 'bg-[var(--surface-subtle)]')}
        onClick={onToggle}
      >
        {/* 费用单号 + 描述 */}
        <td className="px-4 py-3">
          <div className="font-mono text-[11px] font-medium text-[var(--foreground)]">{row.expenseNo}</div>
          <div className="mt-0.5 max-w-[320px] truncate text-[12px] text-[var(--muted)]">{row.description}</div>
          {row.note && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-600">
              <AlertTriangle className="size-2.5" />{row.note.slice(0, 60)}{row.note.length > 60 ? '…' : ''}
            </div>
          )}
        </td>

        {/* 类型 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', tc.cls)}>
            {tc.label}
          </span>
          {row.warehouse && (
            <div className="mt-0.5 text-[10px] text-[var(--muted)]">{row.warehouse}</div>
          )}
          {row.channel && (
            <div className="mt-0.5 text-[10px] text-[var(--muted)]">{row.channel}</div>
          )}
        </td>

        {/* 供应商 */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--foreground)]">
          {row.vendor}
          {row.vendorBillNo && (
            <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{row.vendorBillNo}</div>
          )}
        </td>

        {/* 账单日期 */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.billDate}</td>

        {/* 到期日 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('text-[12px]', isOverdue ? 'font-semibold text-[var(--danger)]' : 'text-[var(--muted)]')}>
            {row.dueDate}
          </span>
          {isOverdue && <div className="text-[10px] text-[var(--danger)]">已逾期</div>}
        </td>

        {/* 金额 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[14px] font-semibold text-[var(--foreground)]">
          {fmt(row.amount)}
        </td>

        {/* 状态 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
            <span className={cn('size-1.5 rounded-full', sc.dot)} />
            {row.status}
          </span>
        </td>

        {/* 成本分摊 */}
        <td className="whitespace-nowrap px-3 py-3">
          {row.allocated ? (
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--success)]">
                <CheckCircle2 className="size-3" />已分摊
              </span>
              <div className="text-[10px] text-[var(--muted)]">
                {allocationMethodLabel[row.allocationMethod]} · {row.allocatedOrderCount} 单
              </div>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
              <Clock3 className="size-3" />待分摊
            </span>
          )}
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
          <td colSpan={9} className="px-0 py-0">
            <ExpenseDetail row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── 展开详情 ─────────────────────────────────────────────────────────────────

function ExpenseDetail({ row }: { row: ExpenseRow }) {
  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
      {/* 争议 / 备注提示 */}
      {(row.status === '有争议' || row.note) && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-[12px] text-amber-700">{row.note ?? '该费用存在争议，请核查后处理。'}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 费用明细 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">费用信息</h4>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] text-[12px]">
            <InfoLine label="费用单号"  value={row.expenseNo} mono />
            <InfoLine label="供应商账单" value={row.vendorBillNo ?? '—'} mono />
            <InfoLine label="费用类型"  value={expenseTypeConfig[row.type].label} />
            <InfoLine label="供应商"    value={row.vendor} />
            {row.warehouse && <InfoLine label="仓库" value={row.warehouse} />}
            {row.channel && <InfoLine label="渠道" value={row.channel} />}
            <InfoLine label="账单日期"  value={row.billDate} />
            <InfoLine label="到期付款"  value={row.dueDate} />
            {row.paidAt && <InfoLine label="实付日期" value={row.paidAt} cls="text-[var(--success)]" />}
            <InfoLine label="金额"      value={`${fmt(row.amount)} ${row.currency}`} bold />
          </div>
        </div>

        {/* 成本分摊信息 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">成本分摊</h4>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] text-[12px]">
            <InfoLine label="分摊方式"
              value={allocationMethodLabel[row.allocationMethod]}
            />
            <InfoLine label="分摊状态"
              value={row.allocated ? '已分摊到订单成本' : '待分摊'}
              cls={row.allocated ? 'text-[var(--success)]' : 'text-amber-600'}
            />
            {row.allocated && row.allocatedOrderCount && (
              <InfoLine label="关联订单数" value={`${row.allocatedOrderCount} 单`} />
            )}
            {row.allocated && row.allocatedOrderCount && (
              <InfoLine
                label="平均每单成本"
                value={fmt(row.amount / row.allocatedOrderCount)}
                bold
              />
            )}
            {!row.allocated && (
              <div className="px-3 py-3 text-[11px] text-amber-600">
                费用尚未分摊。分摊后将更新关联订单的仓储/运输成本，影响利润计算。
              </div>
            )}
          </div>

          {/* 操作 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {row.status === '待审批' && (
              <button className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                审批通过
              </button>
            )}
            {(row.status === '已审批' || row.status === '待付款') && (
              <button className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                确认付款
              </button>
            )}
            {!row.allocated && row.status !== '有争议' && (
              <button className="flex h-7 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                立即分摊到订单
              </button>
            )}
            {row.status === '有争议' && (
              <button className="flex h-7 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[12px] font-medium text-[var(--danger)] hover:bg-red-100">
                处理争议
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 小组件 ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      highlight
        ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
        : warn
        ? 'border-amber-200 bg-amber-50'
        : 'border-[var(--border)] bg-[var(--surface)]'
    )}>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className={cn(
        'mt-1 text-[18px] font-bold',
        highlight ? 'text-[var(--primary)]' : warn ? 'text-amber-700' : 'text-[var(--foreground)]'
      )}>
        {value}
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  mono,
  bold,
  cls,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  cls?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn(
        bold ? 'font-semibold' : 'font-medium',
        mono && 'font-mono text-[11px]',
        cls ?? 'text-[var(--foreground)]'
      )}>
        {value}
      </span>
    </div>
  );
}
