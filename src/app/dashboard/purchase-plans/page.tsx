'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Columns3, Copy, Download, Plus, RefreshCw, Search, X, MoreHorizontal,
  CheckCircle2, Clock, AlertTriangle, Ban, FileText, Loader2,
  Eye, Send, ShoppingCart, Edit3, ClipboardCopy
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type PlanStatus = '草稿' | '待审核' | '已审核' | '已转订单' | '已取消';
type PlanPriority = '紧急' | '高' | '普通' | '低';

type PurchasePlanRow = {
  id: string;
  planNo: string;
  title: string;
  supplier: string;
  warehouse: string;
  priority: PlanPriority;
  status: PlanStatus;
  planDate: string;
  expectedArrival: string;
  itemCount: number;
  totalQty: number;
  estimatedAmount: string;
  currency: string;
  createdBy: string;
  createdAt: string;
  remark: string;
};

// ─── Mock 数据 ────────────────────────────────────────────────────────────────

const mockPlans: PurchasePlanRow[] = [
  {
    id: 'pp_001', planNo: 'PP-2026-0001', title: 'Q3 电子配件补货计划',
    supplier: '深圳华强电子', warehouse: 'US-West-LAX', priority: '紧急',
    status: '待审核', planDate: '2026-09-01', expectedArrival: '2026-09-20',
    itemCount: 8, totalQty: 1200, estimatedAmount: '$18,400.00', currency: 'USD',
    createdBy: '张伟', createdAt: '2026-09-01 09:12', remark: '季末备货，需优先审批'
  },
  {
    id: 'pp_002', planNo: 'PP-2026-0002', title: '智能手表配件常规采购',
    supplier: 'Shenzhen TechParts Co.', warehouse: 'SG-Central', priority: '普通',
    status: '已审核', planDate: '2026-09-05', expectedArrival: '2026-09-28',
    itemCount: 4, totalQty: 500, estimatedAmount: '$6,200.00', currency: 'USD',
    createdBy: 'Admin', createdAt: '2026-09-05 14:33', remark: ''
  },
  {
    id: 'pp_003', planNo: 'PP-2026-0003', title: '音频设备补货（英国仓）',
    supplier: 'Audio Supplies Ltd.', warehouse: 'UK-London', priority: '高',
    status: '已转订单', planDate: '2026-08-20', expectedArrival: '2026-09-15',
    itemCount: 6, totalQty: 320, estimatedAmount: '£9,800.00', currency: 'GBP',
    createdBy: 'Emily Johnson', createdAt: '2026-08-20 10:05', remark: '已转 PO-2026-0088'
  },
  {
    id: 'pp_004', planNo: 'PP-2026-0004', title: '无线充电器年度补货',
    supplier: '广州科技有限公司', warehouse: 'US-East-EWR', priority: '低',
    status: '草稿', planDate: '2026-09-10', expectedArrival: '2026-10-10',
    itemCount: 3, totalQty: 800, estimatedAmount: '$15,920.00', currency: 'USD',
    createdBy: 'James Wilson', createdAt: '2026-09-10 16:44', remark: ''
  },
  {
    id: 'pp_005', planNo: 'PP-2026-0005', title: '数据线专项采购',
    supplier: 'Global Cable Inc.', warehouse: 'US-West-LAX', priority: '普通',
    status: '已取消', planDate: '2026-08-15', expectedArrival: '2026-09-05',
    itemCount: 2, totalQty: 2000, estimatedAmount: '$19,980.00', currency: 'USD',
    createdBy: '张伟', createdAt: '2026-08-15 11:20', remark: '供应商无法交付，已取消'
  },
  {
    id: 'pp_006', planNo: 'PP-2026-0006', title: '蓝牙耳机节前备货',
    supplier: 'Shenzhen TechParts Co.', warehouse: 'US-West-SEA', priority: '高',
    status: '待审核', planDate: '2026-09-18', expectedArrival: '2026-10-05',
    itemCount: 5, totalQty: 600, estimatedAmount: '$47,994.00', currency: 'USD',
    createdBy: 'Sarah Kim', createdAt: '2026-09-18 08:55', remark: '黑五提前备货'
  },
  {
    id: 'pp_007', planNo: 'PP-2026-0007', title: '键盘/鼠标外设补货',
    supplier: '深圳华强电子', warehouse: 'US-Central-DFW', priority: '普通',
    status: '草稿', planDate: '2026-09-20', expectedArrival: '2026-10-15',
    itemCount: 4, totalQty: 450, estimatedAmount: '$40,495.50', currency: 'USD',
    createdBy: 'David Lee', createdAt: '2026-09-20 15:30', remark: ''
  },
];

// ─── 状态样式映射 ─────────────────────────────────────────────────────────────

const statusConfig: Record<PlanStatus, { label: string; cls: string; icon: React.ElementType }> = {
  '草稿':   { label: '草稿',   cls: 'bg-gray-50 text-gray-600 ring-gray-200',               icon: FileText },
  '待审核': { label: '待审核', cls: 'bg-amber-50 text-amber-700 ring-amber-200',             icon: Clock },
  '已审核': { label: '已审核', cls: 'bg-blue-50 text-blue-700 ring-blue-200',                icon: CheckCircle2 },
  '已转订单': { label: '已转订单', cls: 'bg-green-50 text-[var(--success)] ring-green-200',  icon: CheckCircle2 },
  '已取消': { label: '已取消', cls: 'bg-red-50 text-[var(--danger)] ring-red-200',           icon: Ban },
};

const priorityConfig: Record<PlanPriority, { cls: string }> = {
  '紧急': { cls: 'bg-red-50 text-[var(--danger)] ring-red-200' },
  '高':   { cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  '普通': { cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
  '低':   { cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
};

const warehouseColors: Record<string, string> = {
  'US-West-LAX':    'bg-blue-50 text-blue-700 ring-blue-200',
  'US-West-SEA':    'bg-cyan-50 text-cyan-700 ring-cyan-200',
  'US-East-EWR':    'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'US-Central-DFW': 'bg-violet-50 text-violet-700 ring-violet-200',
  'SG-Central':     'bg-green-50 text-green-700 ring-green-200',
  'UK-London':      'bg-orange-50 text-orange-700 ring-orange-200',
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { key: 'all',          label: '全部' },
  { key: 'draft',        label: '草稿',     filter: (r: PurchasePlanRow) => r.status === '草稿' },
  { key: 'pending',      label: '待审核',   filter: (r: PurchasePlanRow) => r.status === '待审核' },
  { key: 'approved',     label: '已审核',   filter: (r: PurchasePlanRow) => r.status === '已审核' },
  { key: 'converted',   label: '已转订单', filter: (r: PurchasePlanRow) => r.status === '已转订单' },
  { key: 'cancelled',    label: '已取消',   filter: (r: PurchasePlanRow) => r.status === '已取消' },
];

// ─── 状态徽章 ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PlanStatus }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', cfg.cls)}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

// ─── 行菜单 ───────────────────────────────────────────────────────────────────

type RowMenuProps = {
  row: PurchasePlanRow;
  onAction: (id: string, action: 'submit' | 'convert' | 'cancel' | 'copy') => void;
};

function RowMenu({ row, onAction }: RowMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 172 });
    }
    setOpen(true);
  };

  // 点外关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const canSubmit  = row.status === '草稿';
  const canConvert = row.status === '已审核';
  const canCancel  = row.status === '草稿' || row.status === '待审核' || row.status === '已审核';
  const canEdit    = row.status === '草稿';

  const item = (icon: React.ElementType, label: string, cb: () => void, danger?: boolean) => {
    const Icon = icon;
    return (
      <button
        onMouseDown={e => { e.stopPropagation(); cb(); setOpen(false); }}
        className={cn(
          'flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-[var(--surface-subtle)]',
          danger ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'
        )}
      >
        <Icon className="size-3.5 shrink-0 text-[var(--muted)]" />
        {label}
      </button>
    );
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="inline-flex size-7 items-center justify-center rounded-md opacity-0 transition hover:bg-[var(--surface-hover)] group-hover:opacity-100"
        aria-label="更多操作"
      >
        <MoreHorizontal className="size-4 text-[var(--muted)]" />
      </button>

      {open && pos && typeof window !== 'undefined' && (
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 172, zIndex: 9999 }}
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-panel)]"
        >
          {item(Eye,          '查看详情',   () => router.push(`/dashboard/purchase-plans/${row.id}`))}
          {canEdit   && item(Edit3,        '编辑',        () => router.push(`/dashboard/purchase-plans/${row.id}/edit`))}
          {canSubmit && item(Send,         '提交审核',    () => onAction(row.id, 'submit'))}
          {canConvert && item(ShoppingCart,'转采购订单',  () => onAction(row.id, 'convert'))}
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          {item(ClipboardCopy, '复制计划号', () => onAction(row.id, 'copy'))}
          {canCancel && item(Ban,          '作废',         () => onAction(row.id, 'cancel'), true)}
        </div>
      )}
    </>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ListToast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <div className={cn(
      'fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2.5 rounded-xl border border-green-200 bg-white px-4 py-3 shadow-[var(--shadow-panel)] transition-all duration-300',
      visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
    )}>
      <CheckCircle2 className="size-4 text-[var(--success)]" />
      <span className="text-[13px] font-medium text-[var(--foreground)]">{message}</span>
    </div>
  );
}

// ─── 页面主体 ─────────────────────────────────────────────────────────────────

export default function PurchasePlansPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize]       = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  // 行操作状态
  const [rowStatuses, setRowStatuses] = useState<Record<string, PlanStatus>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg]         = useState('');
  const [refreshing, setRefreshing]     = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 700));
    setRefreshing(false);
    showToast('数据已刷新');
  };

  const handleExport = () => {
    showToast('导出任务已创建，稍后下载');
  };

  const handleRowAction = (id: string, action: 'submit' | 'convert' | 'cancel' | 'copy') => {
    const row = mockPlans.find(r => r.id === id);
    if (!row) return;
    if (action === 'copy') {
      navigator.clipboard.writeText(row.planNo);
      showToast(`已复制 ${row.planNo}`);
      return;
    }
    const next: PlanStatus = action === 'submit' ? '待审核' : action === 'convert' ? '已转订单' : '已取消';
    const msgs = { submit: '已提交审核', convert: '已转为采购订单', cancel: '已作废该计划' };
    setRowStatuses(prev => ({ ...prev, [id]: next }));
    showToast(msgs[action]);
  };

  const activeFilter = tabs.find((t) => t.key === activeTab);
  const tabFiltered = activeFilter?.filter ? mockPlans.filter(activeFilter.filter) : mockPlans;

  const filtered = useMemo(() => {
    let rows = tabFiltered;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.planNo.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q)
      );
    }
    if (statusFilter)   rows = rows.filter(r => r.status === statusFilter);
    if (priorityFilter) rows = rows.filter(r => r.priority === priorityFilter);
    if (startDate)      rows = rows.filter(r => r.planDate >= startDate);
    if (endDate)        rows = rows.filter(r => r.planDate <= endDate);
    return rows;
  }, [tabFiltered, search, statusFilter, priorityFilter, startDate, endDate]);

  useEffect(() => { setCurrentPage(1); }, [filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const counts = {
    all:       mockPlans.length,
    draft:     mockPlans.filter(r => r.status === '草稿').length,
    pending:   mockPlans.filter(r => r.status === '待审核').length,
    approved:  mockPlans.filter(r => r.status === '已审核').length,
    converted: mockPlans.filter(r => r.status === '已转订单').length,
    cancelled: mockPlans.filter(r => r.status === '已取消').length,
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelectedRows(selectedRows.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setPriorityFilter(''); setStartDate(''); setEndDate('');
  };
  const hasFilter = !!(search || statusFilter || priorityFilter || startDate || endDate);

  return (
    <>
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* 页头 */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">采购计划</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">管理采购需求计划，审核后转采购订单</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            刷新
          </button>
          <button
            onClick={handleExport}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <Download className="size-3.5" />
            导出
          </button>
          <Link
            href="/dashboard/purchase-plans/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            新建采购计划
          </Link>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedRows.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[var(--primary)]">已选 {selectedRows.size} 项</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const ids = Array.from(selectedRows);
                const eligible = ids.filter(id => (rowStatuses[id] ?? mockPlans.find(r => r.id === id)?.status) === '已审核');
                if (eligible.length === 0) { showToast('所选计划中无"已审核"状态，无法转订单'); return; }
                setRowStatuses(prev => { const n = { ...prev }; eligible.forEach(id => { n[id] = '已转订单'; }); return n; });
                setSelectedRows(new Set());
                showToast(`已将 ${eligible.length} 份计划转为采购订单`);
              }}
              className="flex h-7 items-center rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white"
            >
              批量转订单
            </button>
            <button
              onClick={() => {
                const ids = Array.from(selectedRows);
                const eligible = ids.filter(id => (rowStatuses[id] ?? mockPlans.find(r => r.id === id)?.status) === '草稿');
                if (eligible.length === 0) { showToast('所选计划中无"草稿"状态，无法提交'); return; }
                setRowStatuses(prev => { const n = { ...prev }; eligible.forEach(id => { n[id] = '待审核'; }); return n; });
                setSelectedRows(new Set());
                showToast(`已提交 ${eligible.length} 份计划至审核`);
              }}
              className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)]"
            >
              提交审核
            </button>
            <button
              onClick={() => {
                const ids = Array.from(selectedRows);
                const eligible = ids.filter(id => {
                  const s = rowStatuses[id] ?? mockPlans.find(r => r.id === id)?.status;
                  return s === '草稿' || s === '待审核' || s === '已审核';
                });
                if (eligible.length === 0) { showToast('所选计划均无法作废'); return; }
                setRowStatuses(prev => { const n = { ...prev }; eligible.forEach(id => { n[id] = '已取消'; }); return n; });
                setSelectedRows(new Set());
                showToast(`已作废 ${eligible.length} 份计划`);
              }}
              className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--danger)]"
            >
              作废
            </button>
          </div>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 表格卡片 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs + 筛选 — 固定顶部 */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl pt-5 lg:pt-6 bg-[var(--surface)]">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pt-1">
            <div className="flex items-center gap-6">
              {tabs.map((tab) => {
                const count = counts[tab.key as keyof typeof counts] ?? 0;
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
                      <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{count}</span>
                    )}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            <button className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">
              <Columns3 className="size-3.5" />
              列设置
            </button>
          </div>

          {/* 筛选行 */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            {/* 搜索 */}
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
              <Search className="size-3.5 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索计划号 / 标题 / 供应商"
                className="w-[200px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                  <X className="size-3 text-[var(--muted)]" />
                </button>
              )}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', priorityFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
            >
              <option value="">优先级</option>
              {(['紧急', '高', '普通', '低'] as PlanPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <div className="flex h-8 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] text-[var(--foreground)]">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[100px] bg-transparent text-[12px] outline-none" />
              <span className="text-[var(--muted)]">—</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[100px] bg-transparent text-[12px] outline-none" />
            </div>

            {hasFilter && (
              <button onClick={clearFilters} className="h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                清除筛选
              </button>
            )}
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-[var(--border)] accent-[var(--primary)]"
                    checked={selectedRows.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="whitespace-nowrap px-3 py-2.5">计划单号 / 标题</th>
                <th className="whitespace-nowrap px-3 py-2.5">供应商</th>
                <th className="whitespace-nowrap px-3 py-2.5">目标仓库</th>
                <th className="whitespace-nowrap px-3 py-2.5">优先级</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">计划日期</th>
                <th className="whitespace-nowrap px-3 py-2.5">预计到货</th>
                <th className="whitespace-nowrap px-3 py-2.5">品目 / 数量</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">预估金额</th>
                <th className="whitespace-nowrap px-3 py-2.5">创建人</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-20 text-center text-[13px] text-[var(--muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="size-8 text-[var(--border)]" />
                      <span>暂无采购计划</span>
                      <Link href="/dashboard/purchase-plans/new" className="mt-1 text-[var(--primary)] underline underline-offset-2">
                        新建第一份计划
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : paginated.map((row) => {
                  // 行级状态可被快捷操作覆盖
                  const effectiveStatus: PlanStatus = rowStatuses[row.id] ?? row.status;
                  const effectiveRow = { ...row, status: effectiveStatus };
                  return (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/dashboard/purchase-plans/${row.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-[var(--border)] accent-[var(--primary)]"
                      checked={selectedRows.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>

                  {/* 计划号 + 标题 */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-semibold text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))]">
                        {row.planNo}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.planNo); showToast(`已复制 ${row.planNo}`); }}
                        className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] group-hover:opacity-100"
                        title="复制计划号"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 max-w-[220px] truncate text-[12px] text-[var(--muted)]">{row.title}</div>
                  </td>

                  {/* 供应商 */}
                  <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--foreground)]">
                    {row.supplier}
                  </td>

                  {/* 目标仓库 */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', warehouseColors[row.warehouse] ?? 'bg-gray-50 text-gray-600 ring-gray-200')}>
                      {row.warehouse}
                    </span>
                  </td>

                  {/* 优先级 */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', priorityConfig[row.priority].cls)}>
                      {row.priority}
                    </span>
                  </td>

                  {/* 状态（使用有效状态） */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={effectiveStatus} />
                  </td>

                  {/* 计划日期 */}
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                    {row.planDate}
                  </td>

                  {/* 预计到货 */}
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                    {row.expectedArrival}
                  </td>

                  {/* 品目 / 数量 */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="text-[13px] text-[var(--foreground)]">{row.itemCount} 品</span>
                    <span className="ml-1.5 text-[11px] text-[var(--muted)]">/ {row.totalQty.toLocaleString()} 件</span>
                  </td>

                  {/* 预估金额 */}
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">
                    {row.estimatedAmount}
                  </td>

                  {/* 创建人 */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="text-[12px] text-[var(--foreground)]">{row.createdBy}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">{row.createdAt}</div>
                  </td>

                  {/* 行菜单 */}
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowMenu row={effectiveRow} onAction={handleRowAction} />
                  </td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="sticky -bottom-5 lg:-bottom-6 z-20 flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pb-[calc(0.625rem+20px)] lg:pb-[calc(0.625rem+24px)] text-[13px] text-[var(--muted)]">
          <span>共 {filtered.length} 条</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px]">每页</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[12px] text-[var(--foreground)]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[12px]">条</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >‹</button>
              <span className="px-1 text-[12px] text-[var(--foreground)]">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ListToast visible={toastVisible} message={toastMsg} />
    </>
  );
}
