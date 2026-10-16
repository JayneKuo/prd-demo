'use client';

import { useState, useMemo, useCallback } from 'react';
import React from 'react';
import { Columns3, Download, Plus, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X, Upload, Clock, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  apKpi, apRows, apStatusConfig,
  type ApRow, type ApStatus, type ApCategory,
} from '@/lib/mock-data/ar-ap';
import { StatusBadge } from '@/components/admin/status-badge';

// ─── utils ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n);
}

// ─── 配置 ─────────────────────────────────────────────────────────────────────

const categoryConfig: Record<ApCategory, { label: string; desc: string; cls: string; barCls: string }> = {
  '仓储费':   { label: '仓储费（3PL）',       desc: 'ShipBob / XPO 等 3PL 月度账单',           cls: 'bg-blue-50 text-blue-700 ring-blue-200',       barCls: 'bg-blue-400' },
  '运输费':   { label: '承运商运费',           desc: 'FedEx / UPS / Royal Mail 运费账单',         cls: 'bg-purple-50 text-purple-700 ring-purple-200', barCls: 'bg-purple-400' },
  '平台费':   { label: '平台订阅费',           desc: '订阅费/月租（非结算扣减）— Amazon Pro $39.99、Shopify 月费等', cls: 'bg-orange-50 text-orange-700 ring-orange-200', barCls: 'bg-orange-400' },
  '支付手续费': { label: '支付手续费',         desc: 'Stripe / PayPal 账单；结算已扣的不在此处',  cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200', barCls: 'bg-indigo-400' },
  '清关费':   { label: '清关 / 关税',          desc: '报关代理及关税费用',                        cls: 'bg-slate-50 text-slate-600 ring-slate-200',   barCls: 'bg-slate-400' },
  '其他':     { label: '其他',                 desc: '广告费账单、SaaS 订阅、杂项支出',           cls: 'bg-gray-50 text-gray-600 ring-gray-200',       barCls: 'bg-gray-400' },
};

const tabs = [
  { key: 'all',    label: '全部' },
  { key: '仓储费', label: '仓储费' },
  { key: '运输费', label: '运输费' },
  { key: '平台费', label: '平台费' },
  { key: '支付手续费', label: '支付手续费' },
  { key: '有差异', label: '有差异' },
  { key: '有争议', label: '有争议' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function PayablesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rows, setRows] = useState<ApRow[]>(apRows);
  const [showBillEntry, setShowBillEntry] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; balance: number; vendor: string } | null>(null);
  const [allocationTarget, setAllocationTarget] = useState<ApRow | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  // 筛选 & 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');   // '' | 'overdue' | 'this-week' | 'this-month'
  const [allocationFilter, setAllocationFilter] = useState(''); // '' | 'allocated' | 'unallocated'
  const [billTypeFilter, setBillTypeFilter] = useState(''); // '' | 'invoice' | 'credit_note' | 'advance'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const PAGE_SIZE = pageSize;

  // Toast 辅助
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2600);
  }, []);

  // DPO 计算：未付余额 / (本月已付 + 未付) × 30
  const dpo = apKpi.paidThisMonth > 0
    ? Math.round((apKpi.totalPayable / (apKpi.paidThisMonth + apKpi.totalPayable)) * 30)
    : 0;

  // ── 行内操作处理 ──────────────────────────────────────────────────────────
  function handleRowAction(id: string, action: 'approve' | 'schedule' | 'pay' | 'dispute' | 'resolve') {
    if (action === 'approve') {
      // 审批通过 → 已审批（等待安排付款，不直接变待付款）
      setRows(prev => prev.map(r =>
        r.id === id ? { ...r, status: '已审批' as ApStatus } : r,
      ));
      showToast('✓ 审批通过');
    } else if (action === 'schedule') {
      // 安排付款 → 待付款
      setRows(prev => prev.map(r =>
        r.id === id ? { ...r, status: '待付款' as ApStatus } : r,
      ));
      showToast('已安排付款，等待执行');
    } else if (action === 'pay') {
      const row = rows.find(r => r.id === id);
      if (row) setPaymentTarget({ id, balance: row.balanceDue, vendor: row.vendor });
    } else if (action === 'dispute') {
      setRows(prev => prev.map(r =>
        r.id === id ? { ...r, status: '有争议' as ApStatus } : r,
      ));
      showToast('已标记为争议，等待处理');
    } else if (action === 'resolve') {
      setRows(prev => prev.map(r =>
        r.id === id ? { ...r, status: '待付款' as ApStatus, note: (r.note ?? '') + '（争议已解决 · ' + new Date().toLocaleDateString('zh-CN') + '）' } : r,
      ));
      showToast('争议已解决，恢复待付款');
    }
  }

  function handleConfirmPayment(id: string, amount: number) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const paid = r.paidAmount + amount;
      const balance = Math.max(0, r.billAmount - paid);
      return { ...r, paidAmount: paid, balanceDue: balance, status: balance <= 0.005 ? '已付款' as ApStatus : r.status };
    }));
    setPaymentTarget(null);
    showToast('✓ 付款已确认');
  }

  function handleAddBill(bill: ApRow) {
    setRows(prev => [bill, ...prev]);
    setShowBillEntry(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (activeTab === 'all')     return true;
    if (activeTab === '有差异') return (r.variance ?? 0) !== 0;
    if (activeTab === '有争议') return r.status === '有争议';
    return r.category === activeTab;
  }), [activeTab, rows]);

  const counts: Record<TabKey, number> = useMemo(() => ({
    all:      rows.length,
    '仓储费': rows.filter(r => r.category === '仓储费').length,
    '运输费': rows.filter(r => r.category === '运输费').length,
    '平台费': rows.filter(r => r.category === '平台费').length,
    '支付手续费': rows.filter(r => r.category === '支付手续费').length,
    '有差异': rows.filter(r => (r.variance ?? 0) !== 0).length,
    '有争议': rows.filter(r => r.status === '有争议').length,
  }), [rows]);

  // 搜索 + 日期过滤（叠加到 Tab 过滤之上）
  // 供应商列表（用于下拉）
  const vendorOptions = useMemo(() => Array.from(new Set(rows.map(r => r.vendor))).sort(), [rows]);

  // 到期日参考（基于模拟当前日期）
  const AP_TODAY = '2026-10-15';
  const AP_NEXT_WEEK  = '2026-10-22';
  const AP_NEXT_MONTH = '2026-11-15';

  const filteredWithSearch = useMemo(() => filtered.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.billNo.toLowerCase().includes(q) && !r.vendor.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && r.status !== statusFilter) return false;
    if (vendorFilter && r.vendor !== vendorFilter) return false;
    if (billTypeFilter && r.billType !== billTypeFilter) return false;
    if (allocationFilter === 'allocated'   && !r.allocated) return false;
    if (allocationFilter === 'unallocated' &&  r.allocated) return false;
    if (dueFilter === 'overdue')     { if (!(r.dueDate < AP_TODAY && r.status !== '已付款')) return false; }
    if (dueFilter === 'this-week')   { if (!(r.dueDate >= AP_TODAY && r.dueDate <= AP_NEXT_WEEK && r.status !== '已付款')) return false; }
    if (dueFilter === 'this-month')  { if (!(r.dueDate >= AP_TODAY && r.dueDate <= AP_NEXT_MONTH && r.status !== '已付款')) return false; }
    if (startDate && r.billDate < startDate) return false;
    if (endDate   && r.billDate > endDate)   return false;
    return true;
  }), [filtered, searchQuery, statusFilter, vendorFilter, billTypeFilter, allocationFilter, dueFilter, startDate, endDate]);

  // AP 状态选项 — 从实际数据中提取
  const apStatusOptions = useMemo(() => Array.from(new Set(rows.map(r => r.status))).sort(), [rows]);
  // AP 账单类型选项
  const apBillTypeOptions = useMemo(() => Array.from(new Set(rows.map(r => r.billType).filter(Boolean))).sort(), [rows]);

  const totalPages = Math.max(1, Math.ceil(filteredWithSearch.length / pageSize));

  // 分页切片（切换 tab / 筛选时重置页码用 effect）
  const pagedFiltered = useMemo(() => {
    return filteredWithSearch.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredWithSearch, page, pageSize]);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* ── 页头 ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">应付账款</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            仓储 · 运费 · 平台费 · 广告费 · OMS预估 vs 实际账单
            <span className="mx-2 opacity-30">·</span>
            总应付 {fmt(apKpi.totalPayable)}
            {apKpi.overdueAmount > 0 && <span className="ml-2 font-medium text-red-500">逾期 {fmt(apKpi.overdueAmount)}</span>}
            <span className="mx-2 opacity-30">·</span>
            <span className={dpo > 45 ? 'text-amber-600' : ''}>DPO {dpo} 天</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            onClick={() => showToast('导出功能开发中，敬请期待')}
          >
            <Download className="size-3.5" />导出
          </button>
          <button
            onClick={() => setShowBillEntry(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
            <Plus className="size-3.5" />录入账单
          </button>
        </div>
      </div>

      {/* ── 主表格 ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs + 筛选 — sticky */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">
          {/* Tab 行 */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pt-1">
            <div className="flex items-center overflow-x-auto">
              {tabs.map(tab => {
                const count = counts[tab.key];
                const isActive = tab.key === activeTab;
                return (
                  <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); setJumpPage('1'); }}
                    className={cn(
                      'relative mr-5 shrink-0 pb-3 pt-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                      isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
                    )}>
                    {tab.label}
                    {count > 0 && (
                      <span className={cn('ml-1.5 text-[11px]',
                        tab.key === '有差异' || tab.key === '有争议' ? 'text-[var(--danger)]' : 'text-[var(--muted-foreground)]',
                      )}>
                        {count}
                      </span>
                    )}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            <button className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">
              <Columns3 className="size-3.5" />
              列设置
            </button>
          </div>

          {/* 筛选 pill 行 */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* 复合搜索框 */}
              <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
                <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
                <input
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1); setJumpPage('1'); }}
                  placeholder="账单号 / 供应商..."
                  className="w-[160px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                    <X className="size-3 text-[var(--muted)]" />
                  </button>
                )}
              </div>
              {/* 供应商 */}
              <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setPage(1); }}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                  vendorFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                <option value="">供应商</option>
                {vendorOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {/* 到期状态 */}
              <select value={dueFilter} onChange={e => { setDueFilter(e.target.value); setPage(1); }}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                  dueFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                <option value="">到期状态</option>
                <option value="overdue">已逾期</option>
                <option value="this-week">本周到期</option>
                <option value="this-month">本月内到期</option>
              </select>
              {/* 审批/付款状态 */}
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); setJumpPage('1'); }}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                  statusFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                <option value="">全部状态</option>
                {apStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {/* 账单类型 */}
              <select value={billTypeFilter} onChange={e => { setBillTypeFilter(e.target.value); setPage(1); }}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                  billTypeFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                <option value="">账单类型</option>
                {apBillTypeOptions.map(t => {
                  const BILL_LABELS: Record<string, string> = { invoice: '发票（Invoice）', credit_note: '贷项通知单（Credit Note）', advance: '预付款（Advance）' };
                  return <option key={t} value={t}>{BILL_LABELS[t] ?? t}</option>;
                })}
              </select>
              {/* 费用分摊 */}
              <select value={allocationFilter} onChange={e => { setAllocationFilter(e.target.value); setPage(1); }}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                  allocationFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                <option value="">费用分摊</option>
                <option value="allocated">已分摊到订单</option>
                <option value="unallocated">未分摊</option>
              </select>
              {/* 账单日期范围 */}
              <div className={cn('flex h-8 items-center gap-1 rounded-full border px-2.5 text-[12px]',
                (startDate || endDate) ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')}>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="w-[100px] bg-transparent text-[12px] outline-none" />
                <span className="text-[var(--muted)]">—</span>
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="w-[100px] bg-transparent text-[12px] outline-none" />
              </div>
              {(searchQuery || statusFilter || vendorFilter || dueFilter || allocationFilter || billTypeFilter || startDate || endDate) && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); setVendorFilter(''); setDueFilter(''); setAllocationFilter(''); setBillTypeFilter(''); setStartDate(''); setEndDate(''); setPage(1); setJumpPage('1'); }}
                  className="h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                  清除筛选
                </button>
              )}
            </div>
            <span className="shrink-0 text-[12px] text-[var(--muted)]">{filteredWithSearch.length} 条</span>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">账单号 / 供应商</th>
                <th className="whitespace-nowrap px-3 py-2.5">费用类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">账单日期</th>
                <th className="whitespace-nowrap px-3 py-2.5">到期日</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">OMS预估</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">实际账单</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">差异 Δ</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">已付</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">未付余额</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {pagedFiltered.map(row => (
                <ApTableRow
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  onAction={handleRowAction}
                  onAllocate={() => setAllocationTarget(row)}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-[13px] text-[var(--muted)]">
                    暂无记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部汇总 + 分页 */}
        <div className="grid grid-cols-3 gap-px border-t border-[var(--border)] bg-[var(--border-subtle)] text-[12px]">
          {[
            { label: 'OMS预估合计', value: fmt(filteredWithSearch.reduce((s, r) => s + (r.omsEstimate ?? r.billAmount), 0)), cls: 'text-[var(--foreground)]' },
            { label: '实际账单合计', value: fmt(filteredWithSearch.reduce((s, r) => s + r.billAmount, 0)), cls: 'font-semibold text-[var(--foreground)]' },
            {
              label: '差异合计',
              value: (() => {
                const v = filteredWithSearch.reduce((s, r) => s + (r.variance ?? 0), 0);
                return v === 0 ? '— 无差异' : fmt(v);
              })(),
              cls: filteredWithSearch.reduce((s, r) => s + (r.variance ?? 0), 0) > 0 ? 'font-semibold text-[var(--danger)]' : 'text-[var(--muted)]',
            },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-[var(--surface-subtle)] px-5 py-3">
              <span className="text-[var(--muted)]">{label}</span>
              <span className={cn('ml-3', cls)}>{value}</span>
            </div>
          ))}
        </div>

        {/* 分页 — sticky footer */}
        <div className="sticky -bottom-5 lg:-bottom-6 z-20 flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pb-[calc(0.625rem+20px)] lg:pb-[calc(0.625rem+24px)] text-[13px] text-[var(--muted)]">
          <span>共 {filteredWithSearch.length} 条</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px]">每页</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); setJumpPage('1'); }} className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[12px] text-[var(--foreground)]">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[12px]">条</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
              <span className="px-1 text-[12px] text-[var(--foreground)]">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed">›</button>
              <div className="ml-2 flex items-center gap-1">
                <span className="text-[12px]">跳至</span>
                <input type="number" min={1} max={totalPages} value={jumpPage} onChange={e => setJumpPage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const p = Math.max(1, Math.min(totalPages, Number(jumpPage))); setPage(p); setJumpPage(String(p)); } }} className="w-12 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-center text-[12px] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]" />
                <span className="text-[12px]">页</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 录入账单抽屉 */}
      <BillEntryDrawer open={showBillEntry} onClose={() => setShowBillEntry(false)} onAdd={handleAddBill} />

      {/* 确认付款弹窗 */}
      {paymentTarget && (
        <PaymentConfirmModal
          target={paymentTarget}
          onConfirm={handleConfirmPayment}
          onClose={() => setPaymentTarget(null)}
        />
      )}

      {/* 费用分摊抽屉 */}
      {allocationTarget && (
        <CostAllocationDrawer
          bill={allocationTarget}
          onClose={() => setAllocationTarget(null)}
          onConfirm={(method, count) => {
            setRows(prev => prev.map(r =>
              r.id === allocationTarget.id
                ? { ...r, allocationMethod: method, allocated: true, allocatedOrderCount: count }
                : r,
            ));
            setAllocationTarget(null);
            showToast(`✓ 费用已按「${method}」分摊至 ${count} 笔订单`);
          }}
        />
      )}

      {/* Toast 提示 */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-[13px] font-medium text-[var(--background)] shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function ApTableRow({ row, expanded, onToggle, onAction, onAllocate }: {
  row: ApRow; expanded: boolean; onToggle: () => void;
  onAction: (id: string, action: 'approve' | 'schedule' | 'pay' | 'dispute' | 'resolve') => void;
  onAllocate: () => void;
}) {
  const sc    = apStatusConfig[row.status];
  const catCfg = categoryConfig[row.category] ?? categoryConfig['其他'];
  const hasVariance = (row.variance ?? 0) !== 0;
  const variancePositive = (row.variance ?? 0) > 0; // 超出预估（差异为正=贵了）
  const isOverdue = row.overdueDays > 0;

  const actionMap: Record<ApStatus, { label: string; cls: string } | null> = {
    '待审批': { label: '审批通过', cls: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    '已审批': { label: '安排付款', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
    '待付款': { label: '确认付款', cls: 'bg-[var(--primary)] text-white hover:opacity-90' },
    '有争议': { label: '解决争议', cls: 'bg-red-50 text-[var(--danger)] hover:bg-red-100' },
    '逾期':   { label: '立即付款', cls: 'bg-red-50 text-[var(--danger)] hover:bg-red-100' },
    '已付款': null,
  };
  const action = actionMap[row.status];

  return (
    <>
      <tr
        className={cn(
          'group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]',
          expanded && 'bg-[var(--surface-subtle)]',
          row.status === '有争议' && 'bg-red-50/30',
        )}
        onClick={onToggle}
      >
        {/* 账单号 / 供应商 */}
        <td className="px-4 py-3">
          <div className="font-mono text-[12px] font-medium text-[var(--foreground)]">{row.billNo}</div>
          <div className="mt-0.5 text-[12px] text-[var(--muted)]">{row.vendor}</div>
          {row.paymentTerms && (
            <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{row.paymentTerms}</div>
          )}
        </td>
        {/* 费用类型 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', catCfg.cls)}>
            {row.category}
          </span>
        </td>
        {/* 账单日期 */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.billDate}</td>
        {/* 到期日 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('text-[12px]', isOverdue ? 'font-semibold text-[var(--danger)]' : 'text-[var(--muted)]')}>
            {row.dueDate}
          </span>
          {isOverdue && <div className="text-[10px] text-[var(--danger)]">逾期 {row.overdueDays} 天</div>}
        </td>
        {/* OMS预估 */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          {row.omsEstimate !== undefined ? (
            <span className="text-[12px] text-[var(--muted)]">{fmt(row.omsEstimate)}</span>
          ) : (
            <span className="text-[11px] text-[var(--muted-foreground)]">未配置</span>
          )}
        </td>
        {/* 实际账单 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold text-[var(--foreground)]">
          {fmt(row.billAmount)}
        </td>
        {/* 差异 */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          {row.omsEstimate !== undefined && hasVariance ? (
            <div>
              <span className={cn('text-[13px] font-bold', variancePositive ? 'text-[var(--danger)]' : 'text-emerald-600')}>
                {variancePositive ? '+' : ''}{fmt(row.variance!)}
              </span>
              <div className={cn('text-[10px]', variancePositive ? 'text-[var(--danger)]' : 'text-emerald-600')}>
                {variancePositive ? '▲ 超预估' : '▼ 低预估'}
              </div>
            </div>
          ) : row.omsEstimate !== undefined ? (
            <span className="text-[12px] text-[var(--success)]">✓ 匹配</span>
          ) : (
            <span className="text-[11px] text-[var(--muted)]">—</span>
          )}
        </td>
        {/* 已付 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[12px] text-[var(--success)]">
          {row.paidAmount > 0 ? fmt(row.paidAmount) : '—'}
        </td>
        {/* 未付余额 */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          {row.balanceDue > 0 ? (
            <span className={cn('text-[13px] font-semibold', isOverdue ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>
              {fmt(row.balanceDue)}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--success)]">已结清</span>
          )}
        </td>
        {/* 状态 */}
        <td className="whitespace-nowrap px-3 py-3">
          <StatusBadge status={row.status} />
          {action && (
            <div className="mt-1.5">
              <button className={cn('h-6 rounded-md px-2 text-[11px] font-medium transition', action.cls)}
                onClick={e => {
                  e.stopPropagation();
                  if (row.status === '待审批') onAction(row.id, 'approve');
                  else if (row.status === '已审批') onAction(row.id, 'schedule');
                  else if (row.status === '有争议') onAction(row.id, 'resolve');
                  else onAction(row.id, 'pay');
                }}>
                {action.label}
              </button>
            </div>
          )}
        </td>
        {/* 展开 */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button className="inline-flex size-7 items-center justify-center rounded-md opacity-0 transition hover:bg-[var(--surface-hover)] group-hover:opacity-100">
              <MoreHorizontal className="size-4 text-[var(--muted)]" />
            </button>
            <span className="flex size-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-hover)]">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </span>
          </div>
        </td>
      </tr>

      {expanded && (
          <tr>
            <td colSpan={11} className="px-0 py-0">
              <ApRowDetail row={row} onAction={onAction} onAllocate={onAllocate} />
            </td>
          </tr>
        )}
    </>
  );
}

// ─── 展开详情 ─────────────────────────────────────────────────────────────────

function ApRowDetail({ row, onAction, onAllocate }: {
  row: ApRow;
  onAction: (id: string, action: 'approve' | 'schedule' | 'pay' | 'dispute' | 'resolve') => void;
  onAllocate: () => void;
}) {
  const hasVariance = (row.variance ?? 0) !== 0;
  const variancePositive = (row.variance ?? 0) > 0;

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
      {/* 差异提示 */}
      {hasVariance && (
        <div className={cn(
          'mb-4 flex items-start gap-2 rounded-xl px-3.5 py-3 ring-1 ring-inset',
          variancePositive ? 'bg-red-50 ring-red-200' : 'bg-emerald-50 ring-emerald-200',
        )}>
          <AlertTriangle className={cn('mt-0.5 size-4 shrink-0', variancePositive ? 'text-red-500' : 'text-emerald-600')} />
          <p className={cn('text-[12px]', variancePositive ? 'text-red-700' : 'text-emerald-700')}>
            {row.note ?? (variancePositive
              ? `账单金额比 OMS 预估高 ${fmt(row.variance!)}，差异率 ${row.omsEstimate ? ((row.variance! / row.omsEstimate) * 100).toFixed(1) : '—'}%`
              : `账单金额比 OMS 预估低 ${fmt(Math.abs(row.variance!))}`)
            }
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 金额拆分 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">金额核对</h4>
          <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[12px]">
            {row.omsEstimate !== undefined && (
              <InfoLine label="OMS 预估" value={fmt(row.omsEstimate)} />
            )}
            <InfoLine label="实际账单" value={fmt(row.billAmount)} cls="font-semibold" />
            {row.omsEstimate !== undefined && (
              <InfoLine
                label="差异"
                value={hasVariance ? (variancePositive ? `+${fmt(row.variance!)}` : fmt(row.variance!)) : '✓ 无差异'}
                cls={hasVariance ? (variancePositive ? 'font-bold text-[var(--danger)]' : 'font-bold text-emerald-600') : 'text-[var(--success)]'}
              />
            )}
            <InfoLine label="已付款" value={row.paidAmount > 0 ? fmt(row.paidAmount) : '—'} cls="text-[var(--success)]" />
            <div className="flex items-center justify-between bg-[var(--surface-subtle)] px-3 py-2.5 font-semibold">
              <span className="text-[var(--foreground)]">未付余额</span>
              <span className={cn('text-[14px]', row.balanceDue > 0 ? 'text-[var(--foreground)]' : 'text-[var(--success)]')}>
                {row.balanceDue > 0 ? fmt(row.balanceDue) : '已结清'}
              </span>
            </div>
          </div>
        </div>

        {/* 账单信息 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">账单信息</h4>
          <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[12px]">
            <InfoLine label="账单号"   value={row.billNo} mono />
            <InfoLine label="供应商"   value={row.vendor} />
            <InfoLine label="账单类型" value={row.billType === 'credit_note' ? '贷项通知单（Credit Note）' : row.billType === 'advance' ? '预付款（Advance）' : '发票（Invoice）'} />
            <InfoLine label="费用类型" value={row.category} />
            {row.originalCurrency && row.originalCurrency !== row.currency && (
              <InfoLine label="原币金额" value={`${row.originalCurrency} ${row.originalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
            )}
            {row.exchangeRate && (
              <InfoLine label="汇率" value={`1 ${row.originalCurrency} = ${row.exchangeRate} ${row.currency}`} />
            )}
            <InfoLine label="账单日期" value={row.billDate} />
            <InfoLine label="到期日期" value={row.dueDate} />
            {row.paymentTerms && <InfoLine label="付款条款" value={row.paymentTerms} />}
            <InfoLine label="币种"     value={row.currency} />
            {(row.allocationMethod || row.allocated !== undefined) && (
              <InfoLine
                label="费用分摊"
                value={row.allocated ? `已分摊（${row.allocationMethod}）→ ${row.allocatedOrderCount} 单` : '待分摊'}
                cls={row.allocated ? 'text-emerald-600' : 'text-amber-600'}
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {row.status === '待审批' && (
              <button onClick={() => onAction(row.id, 'approve')} className="flex h-7 items-center gap-1 rounded-lg bg-amber-500 px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                ✓ 审批通过
              </button>
            )}
            {row.status === '已审批' && (
              <button onClick={() => onAction(row.id, 'schedule')} className="flex h-7 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                安排付款
              </button>
            )}
            {(row.status === '已审批' || row.status === '待付款' || row.status === '逾期') && (
              <button onClick={() => onAction(row.id, 'pay')} className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                确认付款
              </button>
            )}
            {row.status === '有争议' && (
              <button onClick={() => onAction(row.id, 'resolve')} className="flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[12px] font-medium text-[var(--danger)] hover:bg-red-100">
                解决争议
              </button>
            )}
            {row.status !== '有争议' && row.status !== '已付款' && (
              <button onClick={() => onAction(row.id, 'dispute')} className="flex h-7 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[12px] font-medium text-amber-700 hover:bg-amber-100">
                标记争议
              </button>
            )}
            {/* 费用分摊按钮：仓储费/运输费 且 已审批/待付款/已付款 */}
            {(row.category === '仓储费' || row.category === '运输费') &&
             (row.status === '已审批' || row.status === '待付款' || row.status === '已付款') &&
             row.billType !== 'credit_note' && (
              <button
                onClick={onAllocate}
                className={cn(
                  'flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[12px] font-medium transition',
                  row.allocated
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
                )}>
                {row.allocated ? `✓ 已分摊 ${row.allocatedOrderCount} 单` : '配置费用分摊'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 供应商库（预注册，选择时自动带入默认值）────────────────────────────────

type VendorRecord = {
  id: string;
  name: string;
  alias?: string;              // 简称
  defaultCategory: ApCategory;
  defaultPaymentTerms: string;
  region: string;
  notes?: string;
};

const VENDOR_LIST: VendorRecord[] = [
  // 3PL 仓储
  { id: 'shipbob-lax', name: 'ShipBob US (LAX)',       alias: 'ShipBob',    defaultCategory: '仓储费',   defaultPaymentTerms: 'Net 30', region: 'US' },
  { id: 'shipbob-uk',  name: 'ShipBob UK (London)',    alias: 'ShipBob UK', defaultCategory: '仓储费',   defaultPaymentTerms: 'Net 30', region: 'UK' },
  { id: 'xpo-ewr',     name: 'XPO Logistics (EWR)',    alias: 'XPO',        defaultCategory: '仓储费',   defaultPaymentTerms: 'Net 30', region: 'US' },
  // 承运商
  { id: 'fedex',       name: 'FedEx',                                       defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'US' },
  { id: 'ups',         name: 'UPS',                                         defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'US' },
  { id: 'dhl',         name: 'DHL Express',             alias: 'DHL',       defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'Global' },
  { id: 'royal-mail',  name: 'Royal Mail',                                  defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'UK' },
  // 平台订阅
  { id: 'amazon-sub',  name: 'Amazon（订阅费）',        alias: 'Amazon',    defaultCategory: '平台费',   defaultPaymentTerms: 'Net 15', region: 'US', notes: '仅 Professional Seller 月费，佣金已从结算扣除' },
  { id: 'shopify-sub', name: 'Shopify（月费）',         alias: 'Shopify',   defaultCategory: '平台费',   defaultPaymentTerms: 'Net 15', region: 'US', notes: '月度订阅费，交易手续费从打款扣除' },
  { id: 'tiktok-sub',  name: 'TikTok Shop（订阅）',    alias: 'TikTok',    defaultCategory: '平台费',   defaultPaymentTerms: 'Net 15', region: 'US' },
  // 支付
  { id: 'stripe',      name: 'Stripe',                                      defaultCategory: '支付手续费', defaultPaymentTerms: 'Net 15', region: 'US' },
  { id: 'paypal',      name: 'PayPal',                                      defaultCategory: '支付手续费', defaultPaymentTerms: 'Net 15', region: 'US' },
  // 清关
  { id: 'customs',     name: '海关（关税）',                                 defaultCategory: '清关费',   defaultPaymentTerms: '即期',   region: 'CN' },
  { id: 'broker',      name: '清关代理（通用）',                              defaultCategory: '清关费',   defaultPaymentTerms: 'Net 14', region: 'US' },
  // 广告 / SaaS
  { id: 'google-ads',  name: 'Google Ads',                                  defaultCategory: '其他',     defaultPaymentTerms: 'Net 30', region: 'US' },
  { id: 'meta-ads',    name: 'Meta Ads（Facebook）',   alias: 'Meta',       defaultCategory: '其他',     defaultPaymentTerms: 'Net 30', region: 'US' },
  { id: 'klaviyo',     name: 'Klaviyo（Email Marketing）',                  defaultCategory: '其他',     defaultPaymentTerms: 'Net 30', region: 'US' },
];
// 供应商账单由财务录入，必须关联系统内的业务单据（运单/采购单/服务期间）
// 录入后状态"待审批"，Finance Manager 审批后才能安排付款

type BillFormData = {
  vendorId: string;            // 从供应商库选择
  vendorBillNo: string;        // 供应商发给我们的账单编号（外部参考号）
  category: ApCategory | '';
  // 关联业务单据（根据费用类型变化）
  linkedDocType: string;
  linkedDocNo: string;
  linkedPeriod: string;
  billDate: string;
  dueDate: string;
  paymentTerms: string;
  omsEstimate: string;
  billAmount: string;
  currency: string;
  note: string;
};

const EMPTY_FORM: BillFormData = {
  vendorId: '', vendorBillNo: '', category: '',
  linkedDocType: '', linkedDocNo: '', linkedPeriod: '',
  billDate: '', dueDate: '', paymentTerms: 'Net 30',
  omsEstimate: '', billAmount: '', currency: 'USD', note: '',
};

// 每种费用类型对应的业务单据说明
const LINKED_DOC_CONFIG: Record<ApCategory, {
  docLabel: string;       // 关联单据名称
  docPlaceholder: string; // 单据号输入框 placeholder
  periodLabel?: string;   // 如果需要时间段
  hint: string;           // 说明
}> = {
  '仓储费': {
    docLabel: '服务仓库',
    docPlaceholder: '如 ShipBob-LAX / XPO-EWR',
    periodLabel: '服务月份',
    hint: '关联到具体仓库的月度服务期间，可从入库单/出库单追溯',
  },
  '运输费': {
    docLabel: '运单号（系统内）',
    docPlaceholder: '如 SHP-2026-08821、TRK-0029',
    hint: '关联到具体运单，可在出库 / TMS 模块查找对应单号',
  },
  '平台费': {
    docLabel: '平台账户',
    docPlaceholder: '如 Amazon Professional / Shopify Basic',
    periodLabel: '账期月份',
    hint: '仅含独立订阅账单；佣金/FBA 费已从结算扣除，不应录入',
  },
  '支付手续费': {
    docLabel: '支付服务商',
    docPlaceholder: '如 Stripe / PayPal',
    periodLabel: '账期月份',
    hint: '月度手续费账单；每笔交易的手续费已在结算扣除，此处为月度账单',
  },
  '清关费': {
    docLabel: '入库单号',
    docPlaceholder: '如 INB-2026-0421',
    hint: '关联到对应的入库单，追溯具体批次的关税和清关代理费',
  },
  '其他': {
    docLabel: '关联单号（可选）',
    docPlaceholder: '输入关联的业务单据编号',
    periodLabel: '费用期间',
    hint: '广告费可填广告账户；SaaS 订阅费填软件名称和账期',
  },
};

function BillEntryDrawer({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (bill: ApRow) => void;
}) {
  const [form, setForm] = useState<BillFormData>(EMPTY_FORM);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDrop, setShowVendorDrop] = useState(false);

  if (!open) return null;

  const selectedVendor = VENDOR_LIST.find(v => v.id === form.vendorId);

  // 供应商搜索过滤
  const filteredVendors = vendorSearch.trim()
    ? VENDOR_LIST.filter(v =>
        v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        (v.alias ?? '').toLowerCase().includes(vendorSearch.toLowerCase()))
    : VENDOR_LIST;

  // 按费用类型分组
  const vendorGroups = [
    { label: '仓储 / 3PL',      vendors: filteredVendors.filter(v => v.defaultCategory === '仓储费') },
    { label: '承运商',           vendors: filteredVendors.filter(v => v.defaultCategory === '运输费') },
    { label: '平台订阅',         vendors: filteredVendors.filter(v => v.defaultCategory === '平台费') },
    { label: '支付 & 清关',      vendors: filteredVendors.filter(v => ['支付手续费','清关费'].includes(v.defaultCategory)) },
    { label: '广告 / SaaS',      vendors: filteredVendors.filter(v => v.defaultCategory === '其他') },
  ].filter(g => g.vendors.length > 0);

  function selectVendor(vendor: VendorRecord) {
    setForm(prev => ({
      ...prev,
      vendorId: vendor.id,
      category: vendor.defaultCategory,
      paymentTerms: vendor.defaultPaymentTerms,
      linkedDocNo: '',
      linkedPeriod: '',
    }));
    setVendorSearch('');
    setShowVendorDrop(false);
  }

  function set(field: keyof BillFormData, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'category') {
        next.linkedDocNo = '';
        next.linkedPeriod = '';
      }
      return next;
    });
  }

  const isValid = form.vendorId && form.vendorBillNo && form.category && form.billDate && form.dueDate && form.billAmount;
  const docCfg  = form.category ? LINKED_DOC_CONFIG[form.category as ApCategory] : null;
  const variance = form.omsEstimate && form.billAmount
    ? (parseFloat(form.billAmount) - parseFloat(form.omsEstimate)).toFixed(2)
    : null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[540px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">

        {/* 标题栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--foreground)]">录入供应商账单</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              收到供应商账单后，录入并关联系统内业务单据 → 提交审批 → 付款
            </p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
            <X className="size-4" />
          </button>
        </div>

        {/* 表单 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ① 供应商信息 */}
          <section>
            <SectionLabel>① 供应商 & 账单</SectionLabel>
            <div className="space-y-3">

              {/* 供应商选择器（可搜索下拉）*/}
              <FieldRow label="供应商 *">
                <div className="relative">
                  {/* 已选中：展示已选供应商 + 清除按钮 */}
                  {selectedVendor ? (
                    <div className="flex items-center justify-between rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-2.5 py-1.5">
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold text-[var(--primary)]">{selectedVendor.name}</span>
                        <span className="ml-2 text-[11px] text-[var(--muted)]">{selectedVendor.region}</span>
                        {selectedVendor.notes && (
                          <p className="mt-0.5 text-[10px] text-amber-600">{selectedVendor.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { setForm(prev => ({ ...prev, vendorId: '', category: '', paymentTerms: 'Net 30' })); }}
                        className="ml-2 shrink-0 text-[var(--muted)] hover:text-[var(--danger)]">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* 未选中：搜索输入框 */
                    <div
                      onClick={() => setShowVendorDrop(true)}
                      className={cn(inputCls, 'cursor-pointer flex items-center gap-2')}>
                      <input
                        value={vendorSearch}
                        onChange={e => { setVendorSearch(e.target.value); setShowVendorDrop(true); }}
                        placeholder="搜索或选择供应商…"
                        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-foreground)]"
                        onFocus={() => setShowVendorDrop(true)}
                      />
                      <ChevronDown className="size-3.5 shrink-0 text-[var(--muted)]" />
                    </div>
                  )}

                  {/* 下拉列表 */}
                  {showVendorDrop && !selectedVendor && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowVendorDrop(false)} />
                      <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                        <div className="max-h-[280px] overflow-y-auto">
                          {vendorGroups.length === 0 ? (
                            <p className="py-6 text-center text-[12px] text-[var(--muted)]">无匹配供应商</p>
                          ) : (
                            vendorGroups.map(group => (
                              <div key={group.label}>
                                <div className="sticky top-0 bg-[var(--surface-subtle)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                                  {group.label}
                                </div>
                                {group.vendors.map(v => (
                                  <button
                                    key={v.id}
                                    onClick={() => selectVendor(v)}
                                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-subtle)]">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[13px] font-medium text-[var(--foreground)]">{v.name}</div>
                                      <div className="text-[11px] text-[var(--muted)]">
                                        {v.region} · {v.defaultPaymentTerms} · {categoryConfig[v.defaultCategory]?.label ?? v.defaultCategory}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                        {/* 新增供应商入口 */}
                        <div className="border-t border-[var(--border)] px-3 py-2">
                          <button className="flex w-full items-center gap-2 text-[12px] text-[var(--primary)] hover:underline underline-offset-2">
                            <Plus className="size-3.5" />
                            新增供应商到供应商库
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </FieldRow>

              <FieldRow label="供应商账单号 *">
                <input value={form.vendorBillNo} onChange={e => set('vendorBillNo', e.target.value)}
                  placeholder="对方账单上的编号，如 SB-INV-2026090001"
                  className={cn(inputCls, 'font-mono')} />
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  供应商发给我们的账单编号，用于与对方沟通对账，不是我们系统的单号
                </p>
              </FieldRow>

              {/* 费用类型：供应商已选时自动填充，也可手动修改 */}
              <FieldRow label="费用类型 *">
                <select value={form.category} onChange={e => set('category', e.target.value as ApCategory | '')}
                  className={inputCls}>
                  <option value="">选择费用类型…</option>
                  {(Object.keys(LINKED_DOC_CONFIG) as ApCategory[]).map(k => (
                    <option key={k} value={k}>{categoryConfig[k]?.label ?? k}</option>
                  ))}
                </select>
                {form.category === '平台费' && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    ⚠️ 仅含独立订阅账单（Amazon Pro、Shopify 月费等），佣金/FBA 费已从结算扣除，勿重复录入
                  </p>
                )}
                {selectedVendor && form.category && form.category !== selectedVendor.defaultCategory && (
                  <p className="mt-1 text-[11px] text-blue-600">
                    已修改为与供应商默认类型不同，请确认
                  </p>
                )}
              </FieldRow>
            </div>
          </section>

          {/* ② 关联业务单据（核心：每笔费用必须能追溯到业务操作）*/}
          {docCfg && (
            <section>
              <SectionLabel>② 关联业务单据</SectionLabel>
              <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2.5 text-[11px] text-blue-700">
                {docCfg.hint}
              </div>
              <div className="space-y-3">
                <FieldRow label={`${docCfg.docLabel} *`}>
                  <input value={form.linkedDocNo} onChange={e => set('linkedDocNo', e.target.value)}
                    placeholder={docCfg.docPlaceholder}
                    className={cn(inputCls, form.category === '运输费' ? 'font-mono' : '')} />
                  {form.category === '运输费' && (
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      可在&quot;出库单&quot;或&quot;运输&quot;模块中查找运单号
                    </p>
                  )}
                  {form.category === '仓储费' && (
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      可在&quot;仓库/库位&quot;模块查看对应仓库的服务合同
                    </p>
                  )}
                </FieldRow>
                {docCfg.periodLabel && (
                  <FieldRow label={docCfg.periodLabel}>
                    <input value={form.linkedPeriod} onChange={e => set('linkedPeriod', e.target.value)}
                      placeholder="如 2026-09（YYYY-MM）"
                      className={inputCls} />
                  </FieldRow>
                )}
              </div>
            </section>
          )}

          {/* ③ 日期与付款条款 */}
          <section>
            <SectionLabel>③ 日期 & 付款条款</SectionLabel>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="账单日期 *">
                  <input type="date" value={form.billDate} onChange={e => set('billDate', e.target.value)} className={inputCls} />
                </FieldRow>
                <FieldRow label="到期日 *">
                  <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inputCls} />
                </FieldRow>
              </div>
              <FieldRow label="付款条款">
                <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} className={inputCls}>
                  <option value="即期">即期（到期即付）</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </FieldRow>
            </div>
          </section>

          {/* ④ 金额核对 */}
          <section>
            <SectionLabel>④ 金额核对</SectionLabel>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="OMS 预估金额">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                    <input type="number" value={form.omsEstimate} onChange={e => set('omsEstimate', e.target.value)}
                      placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">OMS 基于业务操作估算的成本</p>
                </FieldRow>
                <FieldRow label="账单实际金额 *">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                    <input type="number" value={form.billAmount} onChange={e => set('billAmount', e.target.value)}
                      placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">供应商账单上的实际金额</p>
                </FieldRow>
              </div>
              {variance !== null && parseFloat(variance) !== 0 && (
                <div className={cn('rounded-lg px-3 py-2 text-[12px]',
                  parseFloat(variance) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                  {parseFloat(variance) > 0
                    ? `账单比 OMS 预估高 $${variance}，需在审批备注中说明原因`
                    : `账单比 OMS 预估低 $${Math.abs(parseFloat(variance)).toFixed(2)}`}
                </div>
              )}
              <FieldRow label="币种">
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="CNY">CNY</option>
                </select>
              </FieldRow>
            </div>
          </section>

          {/* ⑤ 附件 & 备注 */}
          <section>
            <SectionLabel>⑤ 账单原件 & 备注</SectionLabel>
            <div className="space-y-3">
              <div className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-3 text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                <Upload className="size-4 shrink-0" />
                <div>
                  <div className="text-[12px] font-medium">上传账单原件</div>
                  <div className="text-[11px]">PDF / JPG / PNG，最大 10MB</div>
                </div>
              </div>
              <FieldRow label="备注（差异说明等）">
                <textarea value={form.note} onChange={e => set('note', e.target.value)}
                  placeholder="如有差异，请说明原因；附加费、汇率差等…"
                  rows={3} className={cn(inputCls, 'resize-none')} />
              </FieldRow>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] px-6 py-4">
          <button onClick={onClose}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">
            取消
          </button>
          <div className="flex items-center gap-2">
            <button
              disabled={!isValid}
              className={cn('flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]',
                !isValid && 'opacity-40 cursor-not-allowed')}>
              保存草稿
            </button>
            <button
              disabled={!isValid}
              onClick={() => {
                if (!isValid) return;
                const vendorObj = VENDOR_LIST.find(v => v.id === form.vendorId);
                const billAmt = parseFloat(form.billAmount) || 0;
                const omsEst = form.omsEstimate ? parseFloat(form.omsEstimate) : undefined;
                const newBill: ApRow = {
                  id: `ap_${Date.now()}`,
                  billNo: form.vendorBillNo,
                  vendor: vendorObj?.name ?? form.vendorId,
                  category: form.category as ApCategory,
                  billDate: form.billDate,
                  dueDate: form.dueDate,
                  billAmount: billAmt,
                  omsEstimate: omsEst,
                  variance: omsEst !== undefined ? +(billAmt - omsEst).toFixed(2) : undefined,
                  paidAmount: 0,
                  balanceDue: billAmt,
                  currency: form.currency,
                  status: '待审批',
                  overdueDays: 0,
                  paymentTerms: form.paymentTerms,
                  note: [
                    form.linkedDocNo ? `关联单据：${form.linkedDocNo}` : '',
                    form.linkedPeriod ? `服务期间：${form.linkedPeriod}` : '',
                    form.note,
                  ].filter(Boolean).join('；') || undefined,
                };
                onAdd(newBill);
              }}
              className={cn('flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90',
                !isValid && 'opacity-40 cursor-not-allowed')}>
              提交审批
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// 表单辅助组件
const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)] transition-colors placeholder:text-[var(--muted-foreground)]';

function SectionLabel({ children }: { children: string }) {
  return <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{children}</h3>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">{label}</label>
      {children}
    </div>
  );
}

// ─── 小组件 ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, warn, caution, success, danger }: {
  label: string; value: string; sub: string;
  warn?: boolean; caution?: boolean; success?: boolean; danger?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      danger  ? 'border-red-200 bg-red-50' :
      warn    ? 'border-amber-200 bg-amber-50' :
      caution ? 'border-yellow-200 bg-yellow-50' :
      success ? 'border-emerald-200 bg-emerald-50' :
      'border-[var(--border)] bg-[var(--surface)]',
    )}>
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className={cn('mt-1 text-[20px] font-bold tracking-tight',
        danger  ? 'text-red-700' :
        warn    ? 'text-amber-700' :
        caution ? 'text-yellow-700' :
        success ? 'text-emerald-700' :
        'text-[var(--foreground)]',
      )}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}

function InfoLine({ label, value, cls, mono }: {
  label: string; value: string; cls?: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn(mono && 'font-mono text-[11px]', cls ?? 'font-medium text-[var(--foreground)]')}>
        {value}
      </span>
    </div>
  );
}

// ─── 付款确认弹窗 ─────────────────────────────────────────────────────────────

function PaymentConfirmModal({
  target,
  onConfirm,
  onClose,
}: {
  target: { id: string; balance: number; vendor: string };
  onConfirm: (id: string, amount: number) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(target.balance.toFixed(2));
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('银行转账');
  const [payAccount, setPayAccount] = useState('公司主账户 · Chase ****4821');
  const [ref, setRef] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const parsed = parseFloat(amount);
  const attachmentRequired = parsed > 5000;
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= target.balance + 0.01
    && !!ref && (!attachmentRequired || attachmentName !== null);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl">
        {/* 标题 */}
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-[15px] font-bold text-[var(--foreground)]">确认付款</h2>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">供应商：{target.vendor}</p>
        </div>

        {/* 表单 */}
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">付款金额 *</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] py-1.5 pl-6 pr-2.5 text-[13px] font-semibold outline-none focus:border-[var(--primary)]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">未付余额：{fmt(target.balance)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">付款日期 *</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)]" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">付款方式</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)]">
                <option>银行转账</option>
                <option>支票</option>
                <option>信用卡</option>
                <option>PayPal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">付款账户 *</label>
            <select value={payAccount} onChange={e => setPayAccount(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--primary)]">
              <option>公司主账户 · Chase ****4821</option>
              <option>USD 结算账户 · Citibank ****9034</option>
              <option>EUR 账户 · HSBC ****7156</option>
              <option>支票账户 · Wells Fargo ****2290</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">银行流水号 / 参考号 *</label>
            <input value={ref} onChange={e => setRef(e.target.value)}
              placeholder="如：TXN-20261001-8823"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-[var(--primary)]" />
            {!ref && parsed > 0 && <p className="mt-1 text-[11px] text-red-500">流水号为必填项</p>}
          </div>

          {/* 付款凭证上传 */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-[var(--foreground)]">
              付款凭证
              {attachmentRequired
                ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">必填（金额 &gt;$5,000）</span>
                : <span className="rounded-full bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">建议上传</span>
              }
            </label>
            {attachmentName ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-2 text-[12px] text-emerald-700">
                  <Upload className="size-3.5" />
                  <span className="font-medium">{attachmentName}</span>
                </div>
                <button onClick={() => setAttachmentName(null)} className="text-[var(--muted)] hover:text-[var(--danger)]">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <label className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg border-2 border-dashed px-3 py-2.5 transition-colors',
                attachmentRequired
                  ? 'border-red-300 bg-red-50 hover:border-red-400'
                  : 'border-[var(--border)] hover:border-[var(--primary)]',
              )}>
                <Upload className={cn('size-4 shrink-0', attachmentRequired ? 'text-red-400' : 'text-[var(--muted)]')} />
                <div>
                  <div className={cn('text-[12px] font-medium', attachmentRequired ? 'text-red-600' : 'text-[var(--foreground)]')}>
                    {attachmentRequired ? '请上传银行付款凭证（必填）' : '上传付款凭证（推荐）'}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">支持 PDF、PNG、JPG，最大 10MB</div>
                </div>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setAttachmentName(e.target.files[0].name); }} />
              </label>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button onClick={onClose}
            className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">
            取消
          </button>
          <button
            disabled={!isValid}
            onClick={() => isValid && onConfirm(target.id, parsed)}
            className={cn('flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90',
              !isValid && 'opacity-40 cursor-not-allowed')}>
            确认付款 {isValid ? fmt(parsed) : ''}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── 通用分页组件 ──────────────────────────────────────────────────────────────

function TablePagination({ total, page, pageSize, onChange }: {
  total: number;
  page: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnCls = 'flex h-7 min-w-[28px] items-center justify-center rounded-md border text-[12px] transition-colors';

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-[12px]">
      <span className="text-[var(--muted)]">
        共 {total} 条 · 第 {page}/{totalPages} 页 · 每页 {pageSize} 条
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className={cn(btnCls, 'border-[var(--border)] px-2.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40')}>
          ‹ 上一页
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="px-1 text-[var(--muted)]">…</span>
            : <button
                key={p}
                onClick={() => onChange(p as number)}
                className={cn(btnCls, p === page
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                {p}
              </button>
        )}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className={cn(btnCls, 'border-[var(--border)] px-2.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40')}>
          下一页 ›
        </button>
      </div>
    </div>
  );
}

// ─── 费用分摊抽屉 ─────────────────────────────────────────────────────────────

type AllocationMethod = 'quantity' | 'weight' | 'volume' | 'equal' | 'order' | 'manual';

const ALLOCATION_METHODS: { key: AllocationMethod; label: string; desc: string; icon: string }[] = [
  { key: 'quantity', label: '按数量分摊',  desc: '每件商品承担等额费用，适合同质化产品',       icon: '📦' },
  { key: 'weight',   label: '按重量分摊',  desc: '重量占比越大，承担费用越多，适合运费分摊',   icon: '⚖️' },
  { key: 'volume',   label: '按体积分摊',  desc: '体积占比越大，承担费用越多，适合仓储分摊',   icon: '📐' },
  { key: 'equal',    label: '平均分摊',    desc: '所有订单承担相同金额，适合平台费等固定费用', icon: '➗' },
  { key: 'order',    label: '直接归属',    desc: '整笔费用归属特定订单，适合专项费用',         icon: '🎯' },
  { key: 'manual',   label: '手动分配',    desc: '财务手动设置每个成本中心的比例',             icon: '✏️' },
];

// 按分摊方式生成模拟预览数据
function generateAllocationPreview(amount: number, method: AllocationMethod) {
  const orders = [
    { id: 'SO-2026-0842', sku: 'SKU-A001', qty: 12, weight: 3.6, volume: 2.4 },
    { id: 'SO-2026-0901', sku: 'SKU-B002', qty: 8,  weight: 6.4, volume: 4.0 },
    { id: 'SO-2026-0812', sku: 'SKU-A001', qty: 24, weight: 7.2, volume: 4.8 },
    { id: 'SO-2026-0761', sku: 'SKU-C003', qty: 6,  weight: 9.0, volume: 6.0 },
    { id: 'SO-2026-0698', sku: 'SKU-B002', qty: 16, weight: 12.8,volume: 8.0 },
  ];
  const totalQty    = orders.reduce((s, o) => s + o.qty, 0);
  const totalWeight = orders.reduce((s, o) => s + o.weight, 0);
  const totalVolume = orders.reduce((s, o) => s + o.volume, 0);

  return orders.map(o => {
    let ratio = 0;
    if (method === 'quantity') ratio = o.qty / totalQty;
    else if (method === 'weight') ratio = o.weight / totalWeight;
    else if (method === 'volume') ratio = o.volume / totalVolume;
    else if (method === 'equal') ratio = 1 / orders.length;
    else if (method === 'order') ratio = o.id === orders[0].id ? 1 : 0;
    else ratio = o.qty / totalQty; // manual default to qty
    return { ...o, ratio, allocated: +(amount * ratio).toFixed(2) };
  });
}

function CostAllocationDrawer({ bill, onClose, onConfirm }: {
  bill: ApRow;
  onClose: () => void;
  onConfirm: (method: AllocationMethod, orderCount: number) => void;
}) {
  const [method, setMethod] = useState<AllocationMethod>(
    (bill.allocationMethod as AllocationMethod | undefined) ?? 'quantity',
  );
  const preview = generateAllocationPreview(bill.billAmount, method);
  const totalAllocated = preview.reduce((s, r) => s + r.allocated, 0);

  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[600px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">

        {/* 标题 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--foreground)]">费用分摊配置</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {bill.vendor} · {bill.billNo} · {fmtUSD(bill.billAmount)}
            </p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* 概念说明 */}
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-[12px] text-blue-700 ring-1 ring-inset ring-blue-100">
            <p className="font-semibold mb-1">💡 什么是费用分摊？</p>
            <p>将仓储费、运费等共用成本按规则分配到各订单，使每笔订单的利润核算更准确。分摊结果会写入订单的"已分摊成本"字段，影响 SKU 级别的毛利率计算。</p>
          </div>

          {/* 分摊方式选择 */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">选择分摊方式</h3>
            <div className="grid grid-cols-2 gap-2">
              {ALLOCATION_METHODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all',
                    method === m.key
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] ring-2 ring-[var(--primary)] ring-offset-1'
                      : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-subtle)]',
                  )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[16px]">{m.icon}</span>
                    <span className={cn('text-[13px] font-semibold', method === m.key ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
                      {m.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">{m.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 分摊预览 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                分摊预览（示例：5 笔订单）
              </h3>
              <span className="text-[11px] text-[var(--muted)]">
                实际将对当期 {bill.category === '仓储费' ? '1,204' : '842'} 笔相关订单分摊
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left">订单号</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-right">
                      {method === 'quantity' ? '数量' : method === 'weight' ? '重量(kg)' : method === 'volume' ? '体积(m³)' : '占比'}
                    </th>
                    <th className="px-3 py-2 text-right">分摊比例</th>
                    <th className="px-3 py-2 text-right">分摊成本</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {preview.map(row => (
                    <tr key={row.id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-3 py-2 font-mono text-[11px] text-[var(--primary)]">{row.id}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{row.sku}</td>
                      <td className="px-3 py-2 text-right text-[var(--foreground)]">
                        {method === 'quantity' ? row.qty
                          : method === 'weight' ? row.weight
                          : method === 'volume' ? row.volume
                          : `${(row.ratio * 100).toFixed(1)}%`}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--muted)]">{(row.ratio * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-semibold text-[var(--foreground)]">{fmtUSD(row.allocated)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[var(--surface-subtle)] font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-[var(--muted)]">…其余订单（示例仅展示5笔）</td>
                    <td className="px-3 py-2 text-right">100%</td>
                    <td className="px-3 py-2 text-right text-[var(--primary)]">{fmtUSD(bill.billAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 说明 */}
            {method === 'order' && (
              <p className="mt-2 text-[11px] text-amber-600">⚠️ 直接归属模式：费用将 100% 归属到第一笔关联订单。如需分摊到多个订单，请选择其他方式。</p>
            )}
            {method === 'manual' && (
              <p className="mt-2 text-[11px] text-blue-600">ℹ️ 手动分配模式：确认后进入费用分摊工作台，可逐行设置每个订单的分摊金额。</p>
            )}
          </section>

          {/* 说明 */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 text-[11px] text-[var(--muted)] space-y-1">
            <p>• 分摊结果写入各订单的「已分摊成本」字段，不影响此账单的付款流程</p>
            <p>• 分摊完成后，可在「订单详情 → 成本」标签查看单笔订单的分摊成本明细</p>
            <p>• 如账单金额调整或发生争议，需重新触发分摊</p>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] px-6 py-4">
          <div className="text-[12px] text-[var(--muted)]">
            分摊总额：<span className="font-semibold text-[var(--foreground)]">{fmtUSD(totalAllocated)}</span>
            {Math.abs(totalAllocated - bill.billAmount) > 0.01 && (
              <span className="ml-2 text-amber-600">（差异 {fmtUSD(totalAllocated - bill.billAmount)}）</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">
              取消
            </button>
            <button
              onClick={() => onConfirm(method, bill.category === '仓储费' ? 1204 : 842)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
              确认分摊
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
