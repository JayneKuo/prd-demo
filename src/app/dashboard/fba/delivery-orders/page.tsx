'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Download, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShellState } from '@/components/providers/shell-state-provider';
import { useOms } from '@/features/oms/provider';
import type { FbaSnapshot } from '@/features/oms/fba';
import { getMerchantsByCompany } from '@/lib/tenant-context';

// ─── 常量 ──────────────────────────────────────────────────────────────────────

const outboundStatus: Record<string, { label: string; cls: string }> = {
  waiting:         { label: '待出库',  cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
  picking:         { label: '拣货中',  cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  packed:          { label: '已打包',  cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  shipped:         { label: '已出库',  cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  withdraw_pending:{ label: '取消中',  cls: 'bg-purple-50 text-purple-700 ring-purple-200' },
  cancelled:       { label: '已取消',  cls: 'bg-red-50 text-red-700 ring-red-200' },
};
const shipmentStatus: Record<string, { label: string; cls: string }> = {
  working:   { label: '待发货', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  shipped:   { label: '已发货', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  receiving: { label: '收货中', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  closed:    { label: '已关闭', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: '已取消', cls: 'bg-red-50 text-red-700 ring-red-200' },
};

const tabs = [
  { key: 'all',     label: '全部' },
  { key: 'fba',     label: 'FBA 补货',   filter: (r: Row) => !r.isSupplierDirect },
  { key: 'supplier',label: '供应商直发',  filter: (r: Row) => r.isSupplierDirect },
  { key: 'shipped', label: '已出库',      filter: (r: Row) => r.outbound.status === 'shipped' },
  { key: 'pending', label: '未出库',      filter: (r: Row) => r.outbound.status !== 'shipped' && r.outbound.status !== 'cancelled' },
];

type Row = {
  merchantName: string;
  isSupplierDirect: boolean;
  outbound: { id: string; number: string; status: string };
  shipment: { id: string; destination: string; status: string } | undefined;
  plan: { id: string; number: string; status: string } | undefined;
  deliveryPlan: { id: string; number: string } | undefined;
  tracking: string;
};

// ─── 页面 ──────────────────────────────────────────────────────────────────────

export default function FbaDeliveryOrdersPage() {
  const router = useRouter();
  const { companyId, merchantScope } = useShellState();
  const { snapshots, ready, reload } = useOms();
  const merchants = getMerchantsByCompany(companyId);

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const allRows: Row[] = useMemo(() => {
    return (snapshots as FbaSnapshot[]).flatMap(snapshot => {
      const merchantName = merchants.find(m => m.id === snapshot.merchantId)?.name ?? snapshot.merchantId;
      return snapshot.outbounds
        .filter(ob => {
          const order = snapshot.orders.find(o => o.id === ob.orderId);
          return order?.source === 'internal_transfer' && order.tags.includes('fba_replenishment');
        })
        .map(outbound => {
          const order = snapshot.orders.find(o => o.id === outbound.orderId)!;
          const pack = snapshot.packages.find(p => p.fulfillmentId === outbound.fulfillmentId);
          const isSupplierDirect = order.tags.includes('supplier_direct');
          const inboundShipment = snapshot.inboundShipments?.find(s => s.outboundId === outbound.id);
          const inboundPlan = inboundShipment ? snapshot.inboundPlans?.find(p => p.id === inboundShipment.planId) : undefined;
          const deliveryPlan = inboundPlan ? snapshot.deliveryPlans?.find(dp => dp.inboundPlanId === inboundPlan.id) : undefined;
          return {
            merchantName,
            isSupplierDirect,
            outbound: { id: outbound.id, number: outbound.number, status: outbound.status },
            shipment: inboundShipment ? { id: inboundShipment.id, destination: inboundShipment.destination, status: inboundShipment.status } : undefined,
            plan: inboundPlan ? { id: inboundPlan.id, number: inboundPlan.number, status: inboundPlan.status } : undefined,
            deliveryPlan: deliveryPlan ? { id: deliveryPlan.id, number: deliveryPlan.number } : undefined,
            tracking: pack?.tracking ?? '',
          } satisfies Row;
        });
    });
  }, [snapshots, merchants]);

  const tabFiltered = useMemo(() => {
    const tabFilter = tabs.find(t => t.key === activeTab)?.filter;
    return allRows
      .filter(r => !tabFilter || tabFilter(r))
      .filter(r => !search.trim() || r.outbound.number.toLowerCase().includes(search.toLowerCase()) || (r.plan?.number ?? '').toLowerCase().includes(search.toLowerCase()) || (r.deliveryPlan?.number ?? '').toLowerCase().includes(search.toLowerCase()) || r.shipment?.destination?.toLowerCase().includes(search.toLowerCase()));
  }, [allRows, activeTab, search]);

  const counts = useMemo(() => ({
    all: allRows.length,
    fba: allRows.filter(r => !r.isSupplierDirect).length,
    supplier: allRows.filter(r => r.isSupplierDirect).length,
    shipped: allRows.filter(r => r.outbound.status === 'shipped').length,
    pending: allRows.filter(r => r.outbound.status !== 'shipped' && r.outbound.status !== 'cancelled').length,
  }), [allRows]);

  const totalPages = Math.max(1, Math.ceil(tabFiltered.length / pageSize));
  const paginated = tabFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!ready) return <p className="p-6 text-sm text-[var(--muted)]">正在加载 FBA 发货单…</p>;

  return (
    <div className="mx-auto max-w-[1600px] pt-5 lg:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">发货单</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">FBA 补货的仓库执行记录，由货件确认后自动生成</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => void reload()} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />同步
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
          <Link href="/dashboard/fba/delivery-plans" className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
            查看发货计划
          </Link>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Sticky header */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)] pt-5 lg:pt-6">
          <div className="flex items-center border-b border-[var(--border)] px-5 pt-1">
            {tabs.map(tab => {
              const count = counts[tab.key as keyof typeof counts] ?? 0;
              const isActive = tab.key === activeTab;
              return (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }} className={cn('relative mr-6 pb-3 pt-2.5 text-[13px] font-medium transition-colors', isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                  {tab.label}
                  {count > 0 && <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{count}</span>}
                  {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
              <Search className="size-3.5 text-[var(--muted)]" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="搜索发货单号 / 货件号 / FC…" className="w-[200px] bg-transparent text-[12px] outline-none placeholder:text-[var(--muted)]" />
              {search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                {['发货单号', '类型', '商家', '发货计划', '货件（STA）', '目标 FC', '发货状态', '货件状态', '跟踪号'].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginated.map((row, i) => (
                <tr key={i} onClick={() => router.push(`/dashboard/outbound/${encodeURIComponent(row.outbound.id)}`)} className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]">
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))]">{row.outbound.number}</span>
                      <button onClick={e => { e.stopPropagation(); void navigator.clipboard.writeText(row.outbound.number); }} className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--surface-hover)]"><Copy className="size-3 text-[var(--muted)]" /></button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', row.isSupplierDirect ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-sky-50 text-sky-700 ring-sky-200')}>
                      {row.isSupplierDirect ? '供应商直发' : 'FBA 补货'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.merchantName}</td>
                  <td className="whitespace-nowrap px-3 py-3" onClick={e => e.stopPropagation()}>
                    {row.deliveryPlan
                      ? <Link href={`/dashboard/fba/delivery-plans/${encodeURIComponent(row.deliveryPlan.id)}`} className="text-[12px] text-[var(--primary)] hover:underline">{row.deliveryPlan.number}</Link>
                      : <span className="text-[12px] text-[var(--muted-foreground)]">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3" onClick={e => e.stopPropagation()}>
                    {row.plan
                      ? <Link href={`/dashboard/fba/plans/${encodeURIComponent(row.plan.id)}`} className="text-[12px] text-[var(--primary)] hover:underline">{row.plan.number}</Link>
                      : <span className="text-[12px] text-[var(--muted-foreground)]">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px]">{row.shipment?.destination ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {(() => { const s = outboundStatus[row.outbound.status]; return s ? <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', s.cls)}>{s.label}</span> : row.outbound.status; })()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {row.shipment ? (() => { const s = shipmentStatus[row.shipment.status]; return s ? <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', s.cls)}>{s.label}</span> : row.shipment.status; })() : <span className="text-[12px] text-[var(--muted-foreground)]">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.tracking || '—'}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={9} className="py-14 text-center text-sm text-[var(--muted)]">
                  {search ? '没有符合条件的发货单' : <>暂无 FBA 发货单。<Link href="/dashboard/fba/delivery-plans" className="text-[var(--primary)] hover:underline">去创建发货计划</Link>，审批后创建货件即可自动生成发货单。</>}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-[13px]">
            <span className="text-[var(--muted)]">共 {tabFiltered.length} 条</span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 rounded-md border border-[var(--border)] px-2.5 text-[12px] disabled:opacity-40 hover:bg-[var(--surface-subtle)]">上一页</button>
              <span className="px-2 text-[var(--muted)]">{currentPage} / {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 rounded-md border border-[var(--border)] px-2.5 text-[12px] disabled:opacity-40 hover:bg-[var(--surface-subtle)]">下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
