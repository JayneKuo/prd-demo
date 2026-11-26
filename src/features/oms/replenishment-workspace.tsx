'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useOms } from './provider';
import type { ReplenishmentPlan, InboundPlan, InboundOrder } from './replenishment';
import { inboundReasonLabels, itemTotal, destinationNeedsPlatform, pluginStatusLabels, type PluginStatus } from './replenishment';
import { buttonClass } from '@/components/amazon/amazon-ui';
import { cn } from '@/lib/utils';
import { warehouses } from '@/lib/mock-data/warehouses';
import { CancelDialog, Toaster, useToast } from './inbound-modals';

const sourceLabels: Record<ReplenishmentPlan['sourceType'], string> = { transfer: '调拨来源', purchase: '采购来源', third_party_fulfillment: '第三方仓代发', own_warehouse: '自有仓发货', third_party_warehouse: '三方仓代发', supplier: '供应商直发', retailer: 'Retailer 直发' };
const destinationLabels: Record<ReplenishmentPlan['destinationType'], string> = { oms_warehouse: 'OMS 仓库', third_party_warehouse: '第三方仓', amazon_fba: 'Amazon FBA', tiktok_fulfillment: 'TikTok 仓', walmart_fc: 'Walmart FC' };
const replenishmentLabels: Record<ReplenishmentPlan['status'], string> = { draft: '草稿', pending_approval: '待审批', approved: '已审批', inbound_planning: '入库计划中', executing: '执行中', partially_completed: '部分完成', completed: '已完成', cancelled: '已取消', exception: '异常' };
const inboundLabels: Record<InboundPlan['status'], string> = {
  draft: '草稿', pending_approval: '待审批', approved: '已审批',
  preparing: '准备中',
  awaiting_platform: '待申请平台入仓',
  packing_options: '待确认包装方案',
  packing: '待提交装箱信息',
  placement_options: '待确认分仓方案',
  platform_confirmed: '平台已确认',
  transport_preparing: '待确认运输',
  ready_for_execution: '待发货',
  executing: '收货中',
  receiving: '收货中',
  partially_received: '部分收货',
  completed: '已完成',
  cancelled: '已取消',
  exception: '异常',
};
const executionLabels: Record<InboundOrder['status'], string> = { draft: '草稿', planned: '已计划', released: '已下发', in_progress: '执行中', shipped: '已发运', receiving: '收货中', completed: '已完成', cancelled: '已取消', exception: '异常' };

const pluginStatusBadgeCls: Partial<Record<PluginStatus, string>> = {
  not_submitted: 'bg-gray-50 text-gray-500 ring-gray-200',
  queued:        'bg-amber-50 text-amber-700 ring-amber-200',
  submitting:    'bg-blue-50 text-blue-600 ring-blue-200',
  success:       'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed:        'bg-red-50 text-red-700 ring-red-200',
  pending_check: 'bg-orange-50 text-orange-700 ring-orange-200',
  unknown:       'bg-slate-50 text-slate-500 ring-slate-200',
};
type InboundTab = 'all' | 'draft' | 'pending' | 'processing' | 'ready' | 'receiving' | 'completed' | 'cancelled' | 'exception';
const inboundTabs: { key: InboundTab; label: string; filter?: (plan: InboundPlan) => boolean }[] = [
  { key: 'all',        label: '全部' },
  { key: 'draft',      label: '草稿',  filter: p => p.status === 'draft' },
  { key: 'pending',    label: '待审批', filter: p => p.status === 'pending_approval' },
  { key: 'processing', label: '办理中', filter: p => [
    'approved', 'preparing', 'awaiting_platform',
    'packing_options', 'packing', 'placement_options',
    'platform_confirmed', 'transport_preparing',
  ].includes(p.status) },
  { key: 'ready',      label: '待发货', filter: p => p.status === 'ready_for_execution' },
  { key: 'receiving',  label: '收货中', filter: p => ['executing', 'receiving', 'partially_received'].includes(p.status) },
  { key: 'completed',  label: '已完成', filter: p => p.status === 'completed' },
  { key: 'cancelled',  label: '已取消', filter: p => p.status === 'cancelled' },
  { key: 'exception',  label: '异常',   filter: p => p.status === 'exception' },
];

const statusClass: Record<ReplenishmentPlan['status'], string> = {
  draft: 'bg-gray-50 text-gray-600 ring-gray-200', pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200', approved: 'bg-blue-50 text-blue-700 ring-blue-200', inbound_planning: 'bg-indigo-50 text-indigo-700 ring-indigo-200', executing: 'bg-sky-50 text-sky-700 ring-sky-200', partially_completed: 'bg-orange-50 text-orange-700 ring-orange-200', completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200', exception: 'bg-red-50 text-red-700 ring-red-200', cancelled: 'bg-slate-50 text-slate-500 ring-slate-200'
};

type Mode = 'plans' | 'inbound' | 'inbound-orders' | 'outbound';
type PlanRow = { snapshot: import('./types').OmsSnapshot; plan: ReplenishmentPlan };

export function ReplenishmentWorkspace({ mode = 'plans' }: { mode?: Mode }) {
  const { snapshots, ready, error, executeReplenishment, reload } = useOms();
  const plans = snapshots.flatMap(snapshot => (snapshot.replenishmentPlans ?? []).map(plan => ({ snapshot, plan })));
  const inbound = snapshots.flatMap(snapshot => (snapshot.inboundPlansV2 ?? []).map(plan => ({ snapshot, plan })));
  const inboundOrders = snapshots.flatMap(snapshot => (snapshot.inboundOrders ?? []).map(order => ({ snapshot, order })));
  const outboundOrders = snapshots.flatMap(snapshot => (snapshot.outboundOrdersV2 ?? []).map(order => ({ snapshot, order })));

  if (error && !ready) return <p role="alert" className="p-6 text-sm text-[var(--danger)]">{error}</p>;
  if (!ready) return <p className="p-6 text-sm text-[var(--muted)]">正在加载 OMS 补货数据…</p>;
  if (error) return <p role="alert" className="p-6 text-sm text-[var(--danger)]">{error}</p>;
  if (mode === 'plans') return <ReplenishmentPlanList rows={plans} reload={reload} />;

  const exportCsv = (rows: { snapshot: import('./types').OmsSnapshot; plan: InboundPlan }[]) => {
    const header = ['入库计划号', '状态', '入库原因', '发货节点', '收货目标', '商品件数', '行数', '创建时间'];
    const lines = rows.map(({ plan }) => [
      plan.number,
      inboundLabels[plan.status],
      plan.inboundReason ? inboundReasonLabels[plan.inboundReason] : '',
      plan.sourceLabel || sourceLabels[plan.sourceType],
      `${destinationLabels[plan.destinationType]}${plan.site ? ' ' + plan.site : ''}`,
      itemTotal(plan.lines),
      plan.lines.length,
      plan.createdAt.slice(0, 16).replace('T', ' '),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `入库计划_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return <main className="mx-auto max-w-[1600px] space-y-5 pt-5 lg:pt-6">
    <WorkspaceHeader title={mode === 'inbound' ? '入库计划' : mode === 'inbound-orders' ? '入库单' : '出库单'} description={mode === 'inbound' ? '从发货节点到收货目标的计划、办理、发运与收货。' : '入库与出库执行单据。'} reload={reload} onExport={mode === 'inbound' ? () => exportCsv(inbound) : undefined} createHref={mode === 'inbound' ? '/dashboard/inbound-plans/new' : undefined} createLabel={mode === 'inbound' ? '新建入库计划' : undefined} />
    {mode === 'inbound' && <InboundTable rows={inbound} onAction={executeReplenishment} />}    {mode === 'inbound-orders' && <ExecutionTable title="入库单" detailBase="/dashboard/inbound-orders" rows={inboundOrders.map(({ order }) => ({ id: order.id, number: order.number, status: executionLabels[order.status], destination: order.destinationCode ?? '目标仓待确认', quantity: order.expectedQuantity, received: String(order.receivedQuantity) }))} />}
    {mode === 'outbound' && <ExecutionTable title="出库单" detailBase="/dashboard/outbound" rows={outboundOrders.map(({ order }) => ({ id: order.id, number: order.number, status: executionLabels[order.status], destination: order.destinationCode ?? '目标地址待确认', quantity: order.lines.reduce((sum, line) => sum + line.quantity, 0), received: order.trackingNumber ?? '未发运' }))} />}
  </main>;
}

const tabs: { key: string; label: string; filter?: (plan: ReplenishmentPlan) => boolean }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理', filter: (p: ReplenishmentPlan) => p.status === 'pending_approval' },
  { key: 'approved', label: '已审批', filter: (p: ReplenishmentPlan) => p.status === 'approved' },
  { key: 'inbound', label: '入库中', filter: (p: ReplenishmentPlan) => p.status === 'inbound_planning' },
  { key: 'executing', label: '执行中', filter: (p: ReplenishmentPlan) => p.status === 'executing' },
  { key: 'completed', label: '已完成', filter: (p: ReplenishmentPlan) => ['completed', 'partially_completed'].includes(p.status) },
  { key: 'cancelled', label: '已取消', filter: (p: ReplenishmentPlan) => p.status === 'cancelled' },
];

function ReplenishmentPlanList({ rows, reload }: { rows: PlanRow[]; reload: () => Promise<void> }) {
  const router = useRouter();
  const { executeReplenishment } = useOms();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const counts = useMemo(() => Object.fromEntries(tabs.map(tab => [tab.key, tab.key === 'all' ? rows.length : rows.filter(({ plan }) => tab.filter?.(plan)).length])), [rows]);
  const filtered = useMemo(() => {
    const tab = tabs.find(item => item.key === activeTab);
    const query = search.trim().toLowerCase();
    return rows.filter(({ plan }) => !tab?.filter || tab.filter(plan)).filter(({ plan }) => !sourceFilter || plan.sourceType === sourceFilter).filter(({ plan }) => !destinationFilter || plan.destinationType === destinationFilter).filter(({ plan }) => !query || `${plan.number} ${plan.note ?? ''} ${plan.lines.map(line => line.sku).join(' ')}`.toLowerCase().includes(query));
  }, [activeTab, destinationFilter, rows, search, sourceFilter]);
  useEffect(() => setPage(1), [activeTab, destinationFilter, search, sourceFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every(row => selected.has(row.plan.id));

  const toggle = (id: string) => setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const clearFilters = () => { setSearch(''); setSourceFilter(''); setDestinationFilter(''); setSelected(new Set()); };

  // ── 批量操作数据
  const selectedRows = rows.filter(r => selected.has(r.plan.id));
  const draftRows = selectedRows.filter(r => r.plan.status === 'draft');
  const pendingRows = selectedRows.filter(r => r.plan.status === 'pending_approval');
  const cancellableRows = selectedRows.filter(r => ['draft', 'pending_approval', 'approved', 'inbound_planning'].includes(r.plan.status));

  const batchSubmit = async () => {
    for (const { snapshot, plan } of draftRows) {
      await executeReplenishment(snapshot.merchantId, { type: 'replenishment_submit', planId: plan.id });
    }
    setSelected(new Set());
  };
  const batchApprove = async () => {
    for (const { snapshot, plan } of pendingRows) {
      await executeReplenishment(snapshot.merchantId, { type: 'replenishment_approve', planId: plan.id });
    }
    setSelected(new Set());
  };
  const batchCancel = async () => {
    const reason = window.prompt(`批量取消 ${cancellableRows.length} 个补货计划，请填写取消原因`);
    if (!reason?.trim()) return;
    for (const { snapshot, plan } of cancellableRows) {
      await executeReplenishment(snapshot.merchantId, { type: 'replenishment_cancel', planId: plan.id, reason });
    }
    setSelected(new Set());
  };

  return <main className="mx-auto max-w-[1600px] pt-5 lg:pt-6">
    <WorkspaceHeader title="补货计划" description="统一管理调拨、采购和第三方仓补货；审批后生成入库计划，平台确认分仓后再生成正式执行单。" reload={reload} createHref="/dashboard/replenishment/new" createLabel="新建补货计划" />
    {selected.size > 0 && (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--primary)] bg-blue-50/60 px-4 py-2.5">
        <span className="text-[13px] font-semibold text-[var(--primary)]">已选 {selected.size} 项</span>
        {draftRows.length > 0 && (
          <button className="rounded-lg border border-[var(--primary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors" onClick={() => void batchSubmit()}>
            提交审批（{draftRows.length}）
          </button>
        )}
        {pendingRows.length > 0 && (
          <button className="rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-[12px] font-medium text-white hover:opacity-90" onClick={() => void batchApprove()}>
            批量审批（{pendingRows.length}）
          </button>
        )}
        {cancellableRows.length > 0 && (
          <button className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors" onClick={() => void batchCancel()}>
            批量取消（{cancellableRows.length}）
          </button>
        )}
        <button className="ml-auto text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setSelected(new Set())}>清除选择</button>
      </div>
    )}
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="sticky -top-5 z-20 rounded-t-xl bg-[var(--surface)] pt-1">
        <div className="flex items-center gap-6 overflow-x-auto border-b border-[var(--border)] px-5 pt-1">{tabs.map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('relative whitespace-nowrap pb-3 pt-2.5 text-[13px] font-medium', activeTab === tab.key ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>{tab.label}<span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{counts[tab.key] ?? 0}</span>{activeTab === tab.key && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}</button>)}</div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5"><div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1"><Search className="size-3.5 text-[var(--muted)]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索计划号 / SKU / 备注" className="w-[220px] bg-transparent text-[12px] outline-none placeholder:text-[var(--muted)]" />{search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}</div><select aria-label="补货方式" value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px]"><option value="">全部补货方式</option><option value="transfer">调拨补货</option><option value="purchase">采购补货</option><option value="third_party_fulfillment">第三方仓代发</option></select><select aria-label="目标渠道" value={destinationFilter} onChange={event => setDestinationFilter(event.target.value)} className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px]"><option value="">全部目标</option>{Object.entries(destinationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{(search || sourceFilter || destinationFilter) && <button onClick={clearFilters} className="h-8 rounded-full px-3 text-[12px] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">清除筛选</button>}</div>
      </div>
      <div className="overflow-x-auto"><table className="min-w-full border-collapse text-left text-[13px]"><thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]"><tr><th className="w-10 px-3 py-2.5"><input aria-label="全选当前页" type="checkbox" checked={allVisibleSelected} onChange={() => setSelected(previous => { const next = new Set(previous); visible.forEach(({ plan }) => allVisibleSelected ? next.delete(plan.id) : next.add(plan.id)); return next; })} /></th>{['补货计划号', '补货方式', '目标渠道/仓', '商品数量', '计划发货', '状态', '关联单据'].map(label => <th key={label} className="whitespace-nowrap px-3 py-2.5">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{visible.map(({ plan }) => (
        <tr
          key={plan.id}
          className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]"
          onClick={() => router.push(`/dashboard/replenishment/${encodeURIComponent(plan.id)}`)}
        >
          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
            <input aria-label={`选择 ${plan.number}`} type="checkbox" checked={selected.has(plan.id)} onChange={() => toggle(plan.id)} />
          </td>
          <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--primary)]">{plan.number}</td>
          <td className="whitespace-nowrap px-3 py-3">{sourceLabels[plan.sourceType]}</td>
          <td className="whitespace-nowrap px-3 py-3">{destinationLabels[plan.destinationType]}</td>
          <td className="px-3 py-3 tabular-nums">{itemTotal(plan.lines)}</td>
          <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{plan.plannedShipDate ?? '—'}</td>
          <td className="whitespace-nowrap px-3 py-3"><span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', statusClass[plan.status])}>{replenishmentLabels[plan.status]}</span></td>
          <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
            {plan.transferOrderId ? `调拨 ${plan.transferOrderId.replace('to:demo:', 'TO-')}` : plan.purchaseOrderId ? `采购 ${plan.purchaseOrderId.replace('po:demo:', 'PO-')}` : '—'}
            {plan.inboundPlanId && <span className="ml-2 text-[var(--primary)]">· 入库计划</span>}
          </td>
        </tr>
      ))}</tbody></table></div>
      {visible.length === 0 && <p className="py-14 text-center text-sm text-[var(--muted)]">没有符合条件的补货计划</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3 text-[13px]"><span className="text-[var(--muted)]">共 {filtered.length} 条</span><div className="flex items-center gap-2"><select aria-label="每页条数" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px]"><option value={20}>20 条/页</option><option value={50}>50 条/页</option></select><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="h-7 rounded-md border border-[var(--border)] px-2.5 text-[12px] disabled:opacity-40">上一页</button><span className="px-1 text-[var(--muted)]">{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} className="h-7 rounded-md border border-[var(--border)] px-2.5 text-[12px] disabled:opacity-40">下一页</button></div></div>
    </section>
  </main>;
}

function WorkspaceHeader({ title, description, reload, onExport, createHref, createLabel }: { title: string; description: string; reload?: () => Promise<void>; onExport?: () => void; createHref?: string; createLabel?: string }) { return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">{title}</h1><p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p></div><div className="flex shrink-0 items-center gap-2"><button onClick={() => void reload?.()} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"><RefreshCw className="size-3.5" />同步</button><button onClick={() => onExport?.()} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"><Download className="size-3.5" />导出</button>{createHref && <Link href={createHref} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90"><Plus className="size-3.5" />{createLabel}</Link>}</div></div>; }

// ─── Dest warehouse label helper ─────────────────────────────────────────────
function destWhLabel(plan: InboundPlan): string {
  const destMap: Record<string, string> = { oms_warehouse: 'OMS 仓库', third_party_warehouse: '三方仓', amazon_fba: 'Amazon FBA', tiktok_fulfillment: 'TikTok FBT', walmart_fc: 'Walmart WFS' };
  if (plan.destinationWarehouseId && !plan.destinationWarehouseId.startsWith('platform-')) {
    const wh = warehouses.find(w => w.id === plan.destinationWarehouseId);
    if (wh) return `${wh.code} · ${wh.name}`;
  }
  const base = destMap[plan.destinationType] ?? plan.destinationType;
  return plan.site ? `${base} · ${plan.site}` : base;
}

const inboundStatusBadgeCls: Partial<Record<InboundPlan['status'], string>> = {
  draft: 'bg-gray-50 text-gray-600 ring-gray-200',
  pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-blue-50 text-blue-700 ring-blue-200',
  preparing: 'bg-sky-50 text-sky-700 ring-sky-200',
  awaiting_platform: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  packing_options: 'bg-violet-50 text-violet-700 ring-violet-200',
  packing: 'bg-violet-50 text-violet-700 ring-violet-200',
  placement_options: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  platform_confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
  transport_preparing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  ready_for_execution: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  executing: 'bg-sky-50 text-sky-700 ring-sky-200',
  receiving: 'bg-orange-50 text-orange-700 ring-orange-200',
  partially_received: 'bg-orange-50 text-orange-700 ring-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-slate-50 text-slate-500 ring-slate-200',
  exception: 'bg-red-50 text-red-700 ring-red-200',
};

function InboundTable({ rows, onAction }: {
  rows: { snapshot: import('./types').OmsSnapshot; plan: InboundPlan }[];
  onAction: ReturnType<typeof useOms>['executeReplenishment'];
}) {
  const [activeTab, setActiveTab] = useState<InboundTab>('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchCancelOpen, setBatchCancelOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const tab = inboundTabs.find(item => item.key === activeTab);

  const filtered = rows
    .filter(({ plan }) => !tab?.filter || tab.filter(plan))
    .filter(({ plan }) => !sourceFilter || plan.sourceType === sourceFilter)
    .filter(({ plan }) => !destinationFilter || plan.destinationType === destinationFilter)
    .filter(({ plan }) => !statusFilter || plan.status === statusFilter)
    .filter(({ plan }) => !startDate || plan.createdAt.slice(0, 10) >= startDate)
    .filter(({ plan }) => !endDate || plan.createdAt.slice(0, 10) <= endDate)
    .filter(({ plan }) => !search || `${plan.number} ${plan.sourceLabel ?? ''} ${destWhLabel(plan)} ${plan.lines.map(l => `${l.sku} ${l.destinationSku ?? l.channelSku ?? ''}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()));

  const counts = Object.fromEntries(inboundTabs.map(item => [
    item.key,
    item.key === 'all' ? rows.length : rows.filter(({ plan }) => item.filter?.(plan)).length,
  ]));

  const visibleIds = filtered.map(({ plan }) => plan.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
  const selectedRows = rows.filter(({ plan }) => selected.has(plan.id));

  const canApprove = selectedRows.filter(({ plan }) => plan.status === 'pending_approval');
  const canStart = selectedRows.filter(({ plan }) => plan.status === 'approved');
  const canRequest = selectedRows.filter(({ plan }) => plan.status === 'awaiting_platform' && plan.platformStage !== 'request_submitted' && plan.platformStage !== 'request_confirmed');
  const canQuery = selectedRows.filter(({ plan }) => plan.status === 'awaiting_platform' && plan.platformStage === 'request_submitted');
  const canConfirmTarget = selectedRows.filter(({ plan }) => plan.status === 'preparing');
  const canPackingSubmit = selectedRows.filter(({ plan }) => plan.status === 'packing');
  const canCancel = selectedRows.filter(({ plan }) => ['draft', 'pending_approval', 'approved', 'preparing', 'awaiting_platform', 'packing_options', 'packing', 'placement_options', 'transport_preparing', 'platform_confirmed', 'ready_for_execution'].includes(plan.status));

  const toggleAll = () => setSelected(prev =>
    allSelected ? new Set([...prev].filter(id => !visibleIds.includes(id))) : new Set([...prev, ...visibleIds])
  );

  const runBatch = async (
    items: { snapshot: import('./types').OmsSnapshot; plan: InboundPlan }[],
    label: string,
    command: (plan: InboundPlan) => import('./replenishment-commands').ReplenishmentCommand,
  ) => {
    if (!items.length) return;
    for (const item of items) {
      try { await onAction(item.snapshot.merchantId, command(item.plan)); } catch { /* per-item error */ }
    }
    setSelected(new Set());
    toast(`${label}完成，已处理 ${items.length} 条`, 'success');
  };

  const hasFilter = !!(search || sourceFilter || destinationFilter || statusFilter || startDate || endDate);
  const clearAll = () => { setSearch(''); setSourceFilter(''); setDestinationFilter(''); setStatusFilter(''); setStartDate(''); setEndDate(''); };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* ── Tabs ── */}
        <div className="border-b border-[var(--border)] px-5 pt-1">
          <div className="flex items-center gap-6 overflow-x-auto">
            {inboundTabs.map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={cn('relative whitespace-nowrap pb-3 pt-2.5 text-[13px] font-medium transition-colors',
                  activeTab === item.key ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                {item.label}
                <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{counts[item.key] ?? 0}</span>
                {activeTab === item.key && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--primary)]" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 space-y-2">
          {/* 默认一行：搜索 + 发货仓库 + 收货仓库 + 展开按钮（改点3）*/}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-2 min-w-[220px]">
              <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="计划号 / 仓库 / SKU" className="w-full bg-transparent text-[12px] outline-none placeholder:text-[var(--muted)]" />
              {search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}
            </div>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
              className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)]">
              <option value="">发货仓库类型</option>
              {Object.entries(sourceLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={destinationFilter} onChange={e => setDestinationFilter(e.target.value)}
              className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)]">
              <option value="">收货仓库类型</option>
              {Object.entries(destinationLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {hasFilter && (
              <button onClick={clearAll} className="h-8 rounded-full px-3 text-[12px] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] transition-colors">
                清除筛选
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-[var(--muted)]">共 {filtered.length} 条</span>
              <button
                onClick={() => setFiltersExpanded(v => !v)}
                className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] transition-colors"
              >
                {filtersExpanded ? '收起 ↑' : '展开 ↓'}
              </button>
            </div>
          </div>
          {/* 展开后第二行：状态 + 日期范围 */}
          {filtersExpanded && (
            <div className="flex flex-wrap items-center gap-2">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)]">
                <option value="">全部状态</option>
                {Object.entries(inboundLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
                <span>创建日期</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)]" />
                <span>—</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)]" />
              </div>
            </div>
          )}
        </div>

        {/* ── Batch action bar ── */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
            <span className="text-[13px] font-semibold text-[var(--primary)]">已选 {selected.size} 项</span>
            {canApprove.length > 0 && <button className={buttonClass} onClick={() => void runBatch(canApprove, '批量审批', p => ({ type: 'inbound_approve', inboundPlanId: p.id }))}>批量审批（{canApprove.length}）</button>}
            {canStart.length > 0 && <button className={buttonClass} onClick={() => void runBatch(canStart, '批量开始办理', p => ({ type: 'inbound_start_processing', inboundPlanId: p.id }))}>批量开始办理（{canStart.length}）</button>}
            {canRequest.length > 0 && <button className={buttonClass} onClick={() => void runBatch(canRequest, '批量申请入仓', p => ({ type: 'inbound_advance_platform', inboundPlanId: p.id, stage: 'request' }))}>批量申请入仓（{canRequest.length}）</button>}
            {canQuery.length > 0 && <button className={buttonClass} onClick={() => void runBatch(canQuery, '批量查询结果', p => ({ type: 'inbound_advance_platform', inboundPlanId: p.id, stage: 'request_result' }))}>批量查询结果（{canQuery.length}）</button>}
            {canConfirmTarget.length > 0 && <button className={buttonClass} onClick={() => void runBatch(canConfirmTarget, '批量确认收货目标', p => ({ type: 'inbound_confirm_destination', inboundPlanId: p.id }))}>批量确认目标（{canConfirmTarget.length}）</button>}
            {canPackingSubmit.length > 0 && <button className={buttonClass} onClick={() => void runBatch(canPackingSubmit, '批量提交装箱', p => ({ type: 'inbound_advance_platform', inboundPlanId: p.id, stage: 'packing_submit' }))}>批量提交装箱（{canPackingSubmit.length}）</button>}
            {canCancel.length > 0 && <button className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors" onClick={() => setBatchCancelOpen(true)}>批量取消（{canCancel.length}）</button>}
            <button className="ml-auto text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setSelected(new Set())}>清除选择</button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input aria-label="全选" type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3">入库计划号</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">插件状态</th>
                <th className="px-4 py-3">入库类型</th>
                <th className="px-4 py-3">收货仓库</th>
                <th className="px-4 py-3">发货仓库</th>
                <th className="px-4 py-3 text-right">商品</th>
                <th className="px-4 py-3">预计到仓</th>
                <th className="px-4 py-3">来源单号</th>
                <th className="px-4 py-3">关联货件</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ snapshot, plan }) => {
                const badgeCls = inboundStatusBadgeCls[plan.status] ?? 'bg-gray-50 text-gray-500 ring-gray-200';
                const relatedNum = plan.allocationIds.length
                  ? `${plan.allocationIds.length} 个货件`
                  : plan.inboundOrderIds.length
                  ? `${plan.inboundOrderIds.length} 张入库单`
                  : '—';
                return (
                  <tr key={plan.id}
                    className="group cursor-pointer border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-subtle)]"
                    onClick={() => { window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`; }}>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input aria-label={`选择 ${plan.number}`} type="checkbox"
                        checked={selected.has(plan.id)}
                        onChange={() => setSelected(prev => { const next = new Set(prev); next.has(plan.id) ? next.delete(plan.id) : next.add(plan.id); return next; })} />
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <Link className="font-semibold text-[var(--primary)] hover:underline"
                        href={`/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}
                        onClick={e => e.stopPropagation()}>
                        {plan.number}
                      </Link>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{plan.createdAt.slice(0, 10)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', badgeCls)}>
                        {inboundLabels[plan.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {plan.pluginStatus && plan.pluginStatus !== 'not_submitted' && (
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', pluginStatusBadgeCls[plan.pluginStatus] ?? 'bg-gray-50 text-gray-500 ring-gray-200')}>
                          {pluginStatusLabels[plan.pluginStatus]}
                        </span>
                      )}
                      {(!plan.pluginStatus || plan.pluginStatus === 'not_submitted') && (
                        <span className="text-[11px] text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-[var(--muted)]">
                      {plan.inboundReason ? inboundReasonLabels[plan.inboundReason] : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[13px]">{destWhLabel(plan)}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{plan.site ? `站点 ${plan.site}` : ''}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[13px]">{plan.sourceLabel || sourceLabels[plan.sourceType]}</div>
                      <div className="mt-0.5 max-w-[160px] truncate text-[11px] text-[var(--muted)]">{plan.sourceAddress?.address1 || '—'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <span className="font-medium">{itemTotal(plan.lines)}</span>
                      <span className="ml-1 text-[11px] text-[var(--muted)]">件</span>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{plan.lines.length} SKU</div>
                    </td>
                    <td className="px-4 py-3.5 text-[12px]">
                      {plan.plannedArrivalDate
                        ? <span className="font-medium">{plan.plannedArrivalDate}</span>
                        : <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-[var(--muted)]">
                      {plan.sourceDoc?.number
                        ? <><div className="font-medium text-[var(--foreground)]">{plan.sourceDoc.number}</div><div className="text-[10px]">{plan.sourceDoc.type}</div></>
                        : relatedNum}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-[var(--muted)]">{relatedNum}</td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1.5">
                        {/* 草稿 */}
                        {plan.status === 'draft' && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>编辑/提交</button>}
                        {/* 待审批 */}
                        {plan.status === 'pending_approval' && <button className={buttonClass} onClick={() => void onAction(snapshot.merchantId, { type: 'inbound_approve', inboundPlanId: plan.id })}>审批通过</button>}
                        {/* 已审批 */}
                        {plan.status === 'approved' && <button className={buttonClass} onClick={() => void onAction(snapshot.merchantId, { type: 'inbound_start_processing', inboundPlanId: plan.id })}>开始办理</button>}
                        {/* 自有仓/3PL - 准备中 → 确认收货目标 */}
                        {plan.status === 'preparing' && <button className={buttonClass} onClick={() => void onAction(snapshot.merchantId, { type: 'inbound_confirm_destination', inboundPlanId: plan.id })}>确认收货目标</button>}
                        {/* FBA/TikTok/WFS - 平台申请流程 */}
                        {/* awaiting_platform 只通过 inbound_start_processing 进入，platformStage 一定是 request_submitted；保底显示查看详情 */}
                        {plan.status === 'awaiting_platform' && plan.platformStage !== 'request_submitted' && plan.platformStage !== 'request_confirmed' && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>查看详情</button>}
                        {plan.status === 'awaiting_platform' && plan.platformStage === 'request_submitted' && <button className={buttonClass} onClick={() => void onAction(snapshot.merchantId, { type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'request_result' })}>查询申请结果</button>}
                        {/* request_confirmed：box_first 点一下直接进 packing，然后跳详情填箱；placement_first 跳详情 */}
                        {plan.status === 'awaiting_platform' && plan.platformStage === 'request_confirmed' && (
                          plan.shipmentMode === 'placement_first'
                            ? <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>获取分仓方案 →</button>
                            : <button className={buttonClass} onClick={() => { void onAction(snapshot.merchantId, { type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'packing_options' }); window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`; }}>开始装箱 →</button>
                        )}
                        {/* packing_options：兼容旧数据，跳详情 */}
                        {plan.status === 'packing_options' && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>填写装箱信息 →</button>}
                        {/* packing：填装箱信息 */}
                        {plan.status === 'packing' && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>填写装箱信息</button>}
                        {/* placement_options：platformStage 在 packing_submit 后已是 placement_options_ready，直接确认 */}
                        {plan.status === 'placement_options' && plan.platformStage === 'placement_options_ready' && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>确认分仓方案</button>}
                        {/* FBA 待选择配送 → 进入工作台 */}
                        {plan.status === 'transport_preparing' && plan.platformStage !== 'transport_options_ready' && <button className={buttonClass} onClick={() => void onAction(snapshot.merchantId, { type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'transport_options' })}>获取配送方案</button>}
                        {plan.status === 'transport_preparing' && plan.platformStage === 'transport_options_ready' && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>选择配送方式</button>}
                        {/* 待发运：获取标签 / 生成执行单 */}
                        {plan.status === 'ready_for_execution' && destinationNeedsPlatform(plan.destinationType) && !plan.labelsReady && <button className={buttonClass} onClick={() => void onAction(snapshot.merchantId, { type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'labels' })}>获取标签</button>}
                        {plan.status === 'ready_for_execution' && destinationNeedsPlatform(plan.destinationType) && plan.labelsReady && !plan.inboundOrderIds?.length && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>下载箱标 / 生成执行单</button>}
                        {plan.status === 'ready_for_execution' && !destinationNeedsPlatform(plan.destinationType) && !plan.inboundOrderIds?.length && <button className={buttonClass} onClick={() => void onAction(snapshot.merchantId, { type: 'inbound_generate_execution', inboundPlanId: plan.id })}>生成执行单</button>}
                        {/* 执行中 / 收货中：多票时查看货件，单票时录入收货 */}
                        {['executing', 'receiving', 'partially_received'].includes(plan.status) && plan.allocationIds.length > 1 && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>查看货件</button>}
                        {['receiving', 'partially_received'].includes(plan.status) && plan.allocationIds.length <= 1 && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>录入收货</button>}
                        {plan.status === 'executing' && plan.allocationIds.length <= 1 && <button className={buttonClass} onClick={() => window.location.href = `/dashboard/inbound-plans/${encodeURIComponent(plan.id)}`}>查看发货状态</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Empty count={rows.length} />
      </section>

      <CancelDialog
        open={batchCancelOpen}
        onClose={() => setBatchCancelOpen(false)}
        planNumber={'已选 ' + canCancel.length + ' 个入库计划'}
        onConfirm={async (reason) => {
          for (const item of canCancel) {
            try { await onAction(item.snapshot.merchantId, { type: 'inbound_cancel', inboundPlanId: item.plan.id, reason }); } catch { /* continue */ }
          }
          setSelected(new Set());
          toast('已批量取消 ' + canCancel.length + ' 个入库计划', 'info');
        }}
      />
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
function TableHeader({ labels }: { labels: string[] }) { return <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--muted-foreground)]"><tr>{labels.map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>; }
function ExecutionTable({ title, detailBase, rows }: { title: string; detailBase: string; rows: { id: string; number: string; status: string; destination: string; quantity: number; received: string }[] }) { return <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"><table className="min-w-full text-left text-[13px]"><TableHeader labels={[`${title}号`, '目标', '计划数量', '实收/运输', '状态']} /><tbody>{rows.map(row => <tr key={row.id} className="border-t border-[var(--border-subtle)]"><td className="px-4 py-3 font-medium"><Link className="text-[var(--primary)] hover:underline" href={`${detailBase}/${encodeURIComponent(row.id)}`}>{row.number}</Link></td><td className="px-4 py-3">{row.destination}</td><td className="px-4 py-3">{row.quantity}</td><td className="px-4 py-3">{row.received}</td><td className="px-4 py-3">{row.status}</td></tr>)}</tbody></table><Empty count={rows.length} /></section>; }
function Empty({ count }: { count: number }) { return count ? null : <p className="p-10 text-center text-sm text-[var(--muted)]">当前范围暂无入库计划，请先新建入库计划。</p>; }
