'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Plus, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/admin/status-badge';
import { warehouses } from '@/lib/mock-data/warehouses';
import { merchants } from '@/lib/tenant-context';
import { mockProducts } from '@/lib/mock-data/products';
import { currentSession } from '@/lib/session-context';
import { hasCapability } from '@/lib/permissions';
import { transactOms } from './repository';
import { connectionStorageKey, parseConnections, type ProductMapping } from '@/lib/amazon-connections';
import { readChannelSkuMappings } from '@/lib/channel-sku-mappings';
import { executeFba, type FbaCommand, type FbaDeliveryPlan, type FbaPlanLine, type FbaSnapshot } from './fba';
import { fbaConnectionIssue, fbaInput, useFbaDomain, type FbaDomain } from './fba-workspace';
import { useOms } from './provider';

// ─── 常量 ──────────────────────────────────────────────────────────────────────

const warehouseName = (id: string) => warehouses.find(w => w.id === id)?.name ?? id;
const merchantName = (id: string) => merchants.find(m => m.id === id)?.name ?? id;
const sellerName = (domain: FbaDomain, merchantId: string, id: string) =>
  domain.configs[merchantId]?.find(c => c.id === id)?.name ?? id;
const variants = mockProducts.flatMap(p => p.variants.map(v => ({ ...v, title: p.title })));
const inboundPlanLabels: Record<string, string> = { draft: '草稿', packed: '已装箱', placement_selected: '已选方案', confirmed: '已确认', cancelling: '取消中', cancelled: '已取消', closed: '已完成' };

const statusConfig: Record<FbaDeliveryPlan['status'], { label: string; tabClass: string; badgeClass: string }> = {
  draft:     { label: '草稿',   tabClass: 'text-gray-600',   badgeClass: 'bg-gray-50 text-gray-600 ring-gray-200' },
  pending:   { label: '待审批', tabClass: 'text-amber-700',  badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200' },
  done:      { label: '已完成', tabClass: 'text-emerald-700',badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: '已取消', tabClass: 'text-red-600',    badgeClass: 'bg-red-50 text-red-700 ring-red-200' },
  exception: { label: '异常',   tabClass: 'text-red-700',    badgeClass: 'bg-red-50 text-red-700 ring-red-200' },
};

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'draft',     label: '草稿',   filter: (dp: FbaDeliveryPlan) => dp.status === 'draft' },
  { key: 'pending',   label: '待审批', filter: (dp: FbaDeliveryPlan) => dp.status === 'pending' },
  { key: 'done',      label: '已完成', filter: (dp: FbaDeliveryPlan) => dp.status === 'done' },
  { key: 'cancelled', label: '已取消', filter: (dp: FbaDeliveryPlan) => dp.status === 'cancelled' },
];

// ─── 工具 ──────────────────────────────────────────────────────────────────────

function StatusBadgeDP({ status }: { status: FbaDeliveryPlan['status'] }) {
  const { label, badgeClass } = statusConfig[status];
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', badgeClass)}>{label}</span>;
}

// ─── 入口组件 ──────────────────────────────────────────────────────────────────

export function FbaDeliveryPlansWorkspace({ detailId: encodedId }: { detailId?: string }) {
  let detailId = encodedId;
  try { if (detailId) detailId = decodeURIComponent(detailId); } catch { /* ignore */ }
  const domain = useFbaDomain();
  if (!hasCapability(currentSession.role, 'inventory:read'))
    return <p role="alert" className="p-6">当前角色没有 FBA 库存读取权限。</p>;
  if (!domain.ready) return <p role="status" className="p-6">正在加载…</p>;
  const rows = domain.snapshots.flatMap(s => (s.deliveryPlans ?? []).map(dp => ({ snapshot: s, dp })));
  const selected = detailId ? rows.find(r => r.dp.id === detailId) : undefined;
  return detailId
    ? (selected ? <DeliveryPlanDetail {...selected} domain={domain} /> : <p className="p-6 text-sm text-[var(--muted)]">未找到补货计划 {detailId}</p>)
    : <DeliveryPlanList rows={rows} domain={domain} />;
}

// ─── 列表页 ────────────────────────────────────────────────────────────────────

function DeliveryPlanList({ rows, domain }: { rows: { snapshot: FbaSnapshot; dp: FbaDeliveryPlan }[]; domain: FbaDomain }) {
  const { reload } = useOms();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const counts = useMemo(() => {
    const all = rows.length;
    return { all, ...Object.fromEntries(['draft','pending','done','cancelled'].map(s => [s, rows.filter(r => r.dp.status === s).length])) };
  }, [rows]);

  const filtered = useMemo(() => {
    const tabFilter = tabs.find(t => t.key === activeTab)?.filter;
    return rows
      .filter(r => !tabFilter || tabFilter(r.dp))
      .filter(r => !sourceFilter || (sourceFilter === 'supplier' ? !!r.dp.supplierName : !r.dp.supplierName))
      .filter(r => !search.trim() || r.dp.number.toLowerCase().includes(search.toLowerCase()) || (r.dp.supplierName ?? '').toLowerCase().includes(search.toLowerCase()));
  }, [rows, activeTab, sourceFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(1); }, [filtered.length]);

  return (
    <div className="mx-auto max-w-[1600px] pt-5 lg:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">补货计划</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">OMS 通用补货需求，确认来源和目标后生成入库计划；平台分仓结果由插件回传。</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => void reload()} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />同步
          </button>
          {domain.writable && (
            <Link href="/dashboard/fba/delivery-plans/new" className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90">
              <Plus className="size-3.5" />新建补货计划
            </Link>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Sticky: tabs + filters */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)] pt-5 lg:pt-6">
          <div className="flex items-center border-b border-[var(--border)] px-5 pt-1">
            <div className="flex items-center gap-6">
              {tabs.map(tab => {
                const count = counts[tab.key as keyof typeof counts] ?? 0;
                const isActive = tab.key === activeTab;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('relative pb-3 pt-2.5 text-[13px] font-medium transition-colors', isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                    {tab.label}
                    {count > 0 && <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{count}</span>}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            {/* Search */}
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
              <Search className="size-3.5 text-[var(--muted)]" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索计划号 / 供应商…" className="w-[180px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
              {search && <button onClick={() => setSearch('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]"><X className="size-3 text-[var(--muted)]" /></button>}
            </div>
            {/* Source filter */}
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', sourceFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
              <option value="">全部来源</option>
              <option value="warehouse">自有仓调拨</option>
              <option value="supplier">供应商直发</option>
            </select>
            {(search || sourceFilter) && (
              <button onClick={() => { setSearch(''); setSourceFilter(''); }} className="h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--surface-subtle)]">清除筛选</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                {['计划号', '来源', '商家 / Seller / 站点', '预计发货', '件数', '关联货件', '状态', '创建时间'].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginated.map(({ snapshot, dp }) => (
                <tr key={dp.id} className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]">
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/fba/delivery-plans/${encodeURIComponent(dp.id)}`} className="font-semibold text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))] hover:underline">{dp.number}</Link>
                      <button onClick={e => { e.stopPropagation(); void navigator.clipboard.writeText(dp.number); }} className="rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--surface-hover)] group-hover:opacity-100"><Copy className="size-3 text-[var(--muted)]" /></button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {dp.supplierName
                      ? <span className="inline-flex rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">供应商 · {dp.supplierName}</span>
                      : <span className="inline-flex rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">自有仓 · {warehouseName(dp.warehouseId ?? '')}</span>
                    }
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                    {merchantName(snapshot.merchantId)} / {sellerName(domain, snapshot.merchantId, dp.connectionId)} / {dp.site}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{dp.plannedShipDate ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{dp.lines.reduce((n, l) => n + l.quantity, 0)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {dp.inboundPlanId ? (
                      <Link href={`/dashboard/fba/plans/${encodeURIComponent(dp.inboundPlanId)}`} onClick={e => e.stopPropagation()} className="text-[12px] text-[var(--primary)] hover:underline">
                        {snapshot.inboundPlans?.find(p => p.id === dp.inboundPlanId)?.number ?? '查看货件'}
                      </Link>
                    ) : <span className="text-[12px] text-[var(--muted-foreground)]">未关联</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3"><StatusBadgeDP status={dp.status} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{dp.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="py-14 text-center text-sm text-[var(--muted)]">
                  {search || sourceFilter ? '没有符合筛选条件的补货计划' : '暂无补货计划，点击右上角"新建"开始。'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-[13px]">
            <span className="text-[var(--muted)]">共 {filtered.length} 条</span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 rounded-md px-2.5 text-[12px] border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-subtle)]">上一页</button>
              <span className="px-2 text-[var(--muted)]">{currentPage} / {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 rounded-md px-2.5 text-[12px] border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-subtle)]">下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 新建表单 ──────────────────────────────────────────────────────────────────

function CreateDeliveryPlan({ domain, onCreated }: { domain: FbaDomain; onCreated: (id?: string) => void }) {
  const [merchantId, setMerchant] = useState(domain.snapshots.length === 1 ? domain.snapshots[0].merchantId : '');
  const [connectionId, setConnection] = useState('');
  const [sourceType, setSourceType] = useState<'warehouse' | 'supplier'>('warehouse');
  const [warehouseId, setWarehouse] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [plannedShipDate, setPlannedShipDate] = useState('');
  const [note, setNote] = useState('');
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [mappingError, setMappingError] = useState('');

  const snapshot = domain.snapshots.find(s => s.merchantId === merchantId);
  const connections = domain.configs[merchantId] ?? [];
  const connection = connections.find(c => c.id === connectionId);
  const site = connection?.businesses.fba?.site ?? '';
  const issue = fbaConnectionIssue(connection);

  useEffect(() => {
    try { setMappings(snapshot && connection ? readChannelSkuMappings(snapshot.companyId, snapshot.merchantId, connection, site) : []); setMappingError(''); }
    catch { setMappings([]); setMappingError('商品映射无法读取，请检查商品映射配置。'); }
  }, [snapshot?.companyId, snapshot?.merchantId, connection, site]);

  const stocks = snapshot?.stocks.filter(s => s.pool === 'warehouse' && s.warehouseId === warehouseId) ?? [];
  const allVariants = mockProducts.flatMap(p => p.variants.map(v => ({ ...v, title: p.title })));
  const mappedVariants = allVariants.filter(v => mappings.find(m => m.omsVariantId === v.id));
  const items = sourceType === 'warehouse' ? stocks : mappedVariants;
  const chosen = items.filter(item => (quantities[item.sku] ?? 0) > 0);
  const canSubmit = !domain.busy && domain.writable && !issue && chosen.length > 0 && (sourceType === 'warehouse' ? !!warehouseId : !!supplierName.trim());

  const submit = async () => {
    if (!snapshot || !connection) return;
    const lines: FbaPlanLine[] = chosen.map(item => {
      const variant = variants.find(v => v.sku === item.sku);
      const mapping = mappings.find(m => m.omsVariantId === variant?.id);
      return { id: `line:${item.sku}`, sku: item.sku, omsVariantId: variant?.id ?? '', sellerSku: mapping?.externalSku ?? '', quantity: quantities[item.sku] };
    });
    const command: FbaCommand = sourceType === 'supplier'
      ? { type: 'fba_create_delivery_plan', connectionId, site, supplierName, lines, plannedShipDate: plannedShipDate || undefined, note: note || undefined }
      : { type: 'fba_create_delivery_plan', connectionId, site, warehouseId, lines, plannedShipDate: plannedShipDate || undefined, note: note || undefined };
    const ok = await domain.execute(snapshot, command, connectionId);
    if (ok) {
      // Find the newly created plan (last added) and navigate to it
      const fbaSnap = domain.snapshots.find(s => s.merchantId === merchantId) as FbaSnapshot;
      const newPlan = fbaSnap?.deliveryPlans?.at(-1);
      onCreated(newPlan?.id);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">新建补货计划</h2>
        <button onClick={() => onCreated()} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X className="size-4" /></button>
      </div>

      {/* Basic settings row */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select aria-label="商家" className={fbaInput} value={merchantId} onChange={e => { setMerchant(e.target.value); setConnection(''); setWarehouse(''); setQuantities({}); }}>
          <option value="">选择商家</option>
          {domain.snapshots.map(s => <option key={s.merchantId} value={s.merchantId}>{merchantName(s.merchantId)}</option>)}
        </select>
        <select aria-label="Seller 账号" className={fbaInput} value={connectionId} onChange={e => setConnection(e.target.value)}>
          <option value="">选择 Seller / 站点</option>
          {connections.filter(c => c.identity === 'seller').map(c => <option key={c.id} value={c.id}>{c.name} / {c.businesses.fba?.site || '—'}</option>)}
        </select>
        <select aria-label="发货来源" className={fbaInput} value={sourceType} onChange={e => { setSourceType(e.target.value as 'warehouse' | 'supplier'); setWarehouse(''); setSupplierName(''); setQuantities({}); }}>
          <option value="warehouse">自有仓发货</option>
          <option value="supplier">供应商直发</option>
        </select>
        {sourceType === 'warehouse' && (
          <select aria-label="来源仓库" className={fbaInput} value={warehouseId} onChange={e => { setWarehouse(e.target.value); setQuantities({}); }}>
            <option value="">选择来源仓库</option>
            {Array.from(new Set(snapshot?.stocks.filter(s => s.pool === 'warehouse').map(s => s.warehouseId))).map(id => <option key={id} value={id}>{warehouseName(id)}</option>)}
          </select>
        )}
        {sourceType === 'supplier' && (
          <input aria-label="供应商名称" className={fbaInput} placeholder="供应商名称（必填）" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
        )}
        <input aria-label="预计发货时间" className={fbaInput} type="date" value={plannedShipDate} onChange={e => setPlannedShipDate(e.target.value)} title="预计发货时间" />
        <input aria-label="备注" className={fbaInput} placeholder="备注（选填）" value={note} onChange={e => setNote(e.target.value)} />
      </div>

      {(issue || mappingError) && <p role="alert" className="mb-3 text-[13px] text-[var(--muted)]">{issue || mappingError}</p>}

      {/* SKU table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="min-w-full border-collapse text-left text-[13px]">
          <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">OMS SKU</th>
              <th className="px-3 py-2">Seller SKU</th>
              {sourceType === 'warehouse' && <th className="px-3 py-2 text-right">可用</th>}
              <th className="px-3 py-2">计划数量</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {(sourceType === 'warehouse' ? stocks : mappedVariants).map(item => {
              const variant = variants.find(v => v.sku === item.sku);
              const mapping = mappings.find(m => m.omsVariantId === variant?.id);
              const stockItem = item as { onHand?: number; reserved?: number; unfulfillable?: number };
              const available = stockItem.onHand != null ? stockItem.onHand - (stockItem.reserved ?? 0) - (stockItem.unfulfillable ?? 0) : null;
              return (
                <tr key={item.sku} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-3 py-2">{item.sku}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{mapping?.externalSku || '—'}</td>
                  {sourceType === 'warehouse' && <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">{available}</td>}
                  <td className="px-3 py-2">
                    <input aria-label={`${item.sku} 计划数量`} className={`${fbaInput} w-24`} type="number" min="0" value={quantities[item.sku] ?? 0} disabled={!mapping} onChange={e => setQuantities({ ...quantities, [item.sku]: Number(e.target.value) })} />
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-[13px] text-[var(--muted)]">
                {!connectionId ? '请先选择 Seller 账号' : sourceType === 'warehouse' && !warehouseId ? '请选择来源仓库' : '暂无可用商品'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button disabled={!canSubmit} onClick={submit} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {domain.busy ? '保存中…' : '保存草稿'}
        </button>
        <p className="text-[12px] text-[var(--muted)]">草稿不占用库存，提交审批后由管理员确认。</p>
      </div>

      {domain.error && <p role="alert" className="mt-3 text-[13px] text-[var(--danger)]">{domain.error}</p>}
    </div>
  );
}

// ─── 详情页 ────────────────────────────────────────────────────────────────────

function DeliveryPlanDetail({ snapshot, dp, domain }: { snapshot: FbaSnapshot; dp: FbaDeliveryPlan; domain: FbaDomain }) {
  const [cancelReason, setCancelReason] = useState('');
  const [linkPlanId, setLinkPlanId] = useState('');
  const disabled = domain.busy || !domain.writable;
  const issue = fbaConnectionIssue(domain.configs[snapshot.merchantId]?.find(c => c.id === dp.connectionId), dp.site);
  const send = (command: FbaCommand) => domain.execute(snapshot, command, dp.connectionId);

  const linkedPlan = dp.inboundPlanId ? snapshot.inboundPlans?.find(p => p.id === dp.inboundPlanId) : undefined;
  const availablePlans = (snapshot.inboundPlans ?? []).filter(p =>
    p.connectionId === dp.connectionId && p.site === dp.site && p.status !== 'cancelled'
  );

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      <Link href="/dashboard/fba/delivery-plans" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />返回补货计划列表
      </Link>

      {/* Header card */}
      <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">{dp.number}</h1>
              <StatusBadgeDP status={dp.status} />
              {dp.supplierName
                ? <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">供应商直发</span>
                : <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">自有仓调拨</span>
              }
            </div>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">
              {sellerName(domain, snapshot.merchantId, dp.connectionId)} / {dp.site}
              {dp.supplierName ? ` · 供应商：${dp.supplierName}` : ` · 来源仓库：${warehouseName(dp.warehouseId ?? '')}`}
              {dp.plannedShipDate && ` · 预计发货：${dp.plannedShipDate}`}
            </p>
            {dp.note && <p className="mt-1 text-[12px] text-[var(--muted)]">备注：{dp.note}</p>}
          </div>
          <div className="text-right text-[12px] text-[var(--muted)]">
            <p>创建于 {dp.createdAt.slice(0, 16).replace('T', ' ')}</p>
            {dp.approvedAt && <p>审批于 {dp.approvedAt.slice(0, 16).replace('T', ' ')}</p>}
          </div>
        </div>

        <dl className="mt-5 grid gap-4 border-t border-[var(--border)] pt-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-[var(--muted)]">商家</dt><dd className="mt-1">{merchantName(snapshot.merchantId)}</dd></div>
          <div><dt className="text-[var(--muted)]">总件数</dt><dd className="mt-1 tabular-nums">{dp.lines.reduce((n, l) => n + l.quantity, 0)} 件</dd></div>
          <div><dt className="text-[var(--muted)]">关联货件</dt><dd className="mt-1">
            {linkedPlan
              ? <Link className="text-[var(--primary)] hover:underline" href={`/dashboard/fba/plans/${encodeURIComponent(linkedPlan.id)}`}>{linkedPlan.number}</Link>
              : <span className="text-[var(--muted)]">未关联</span>}
          </dd></div>
          <div><dt className="text-[var(--muted)]">发货单</dt><dd className="mt-1">
            {linkedPlan ? <Link className="text-[var(--primary)] hover:underline" href="/dashboard/fba/delivery-orders">查看发货单 →</Link> : <span className="text-[var(--muted)]">—</span>}
          </dd></div>
        </dl>

        {issue && <p role="alert" className="mt-3 text-[13px] text-[var(--danger)]">{issue}</p>}
        {domain.error && <p role="alert" className="mt-3 text-[13px] text-[var(--danger)]">{domain.error}</p>}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left */}
        <div className="space-y-5">
          {/* Lines */}
          <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[14px] font-semibold">发货商品 · {dp.lines.length} 种 / {dp.lines.reduce((n, l) => n + l.quantity, 0)} 件</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-2.5">OMS SKU</th>
                    <th className="px-5 py-2.5">Seller SKU</th>
                    <th className="px-5 py-2.5 text-right">计划数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {dp.lines.map(l => (
                    <tr key={l.id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-5 py-3 font-medium">{l.sku}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">{l.sellerSku}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{l.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 入库计划与平台结果 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-[14px] font-semibold">关联入库计划</h2>
            {linkedPlan ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">{linkedPlan.number}</p>
                  <p className="text-[11px] text-[var(--muted)]">{inboundPlanLabels[linkedPlan.status]} · {linkedPlan.site} · {linkedPlan.shipmentIds.length ? `${linkedPlan.shipmentIds.length} 条平台分仓结果` : '待平台返回分仓结果'}</p>
                </div>
                <Link href={`/dashboard/fba/plans/${encodeURIComponent(linkedPlan.id)}`} className="ml-auto inline-flex h-7 items-center rounded-lg border border-[var(--border)] px-2.5 text-[12px] font-medium hover:bg-[var(--surface-hover)]">
                  查看入库计划 →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-[var(--muted)]">审批通过后，可关联已有货件或直接创建新货件。</p>
                <div className="flex gap-2">
                  <select aria-label="选择货件" className={`${fbaInput} flex-1`} value={linkPlanId} onChange={e => setLinkPlanId(e.target.value)}>
                    <option value="">— 选择已有平台入仓结果—</option>
                    {availablePlans.map(p => (
                      <option key={p.id} value={p.id}>{p.number} · {inboundPlanLabels[p.status]}</option>
                    ))}
                  </select>
                  <button disabled={disabled || !linkPlanId} onClick={() => { void send({ type: 'fba_link_delivery_plan', deliveryPlanId: dp.id, inboundPlanId: linkPlanId }); setLinkPlanId(''); }} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40">
                    关联
                  </button>
                </div>
                <Link href="/dashboard/fba/plans?create=1" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90">
                  <Plus className="size-3.5" />新建平台入仓结果
                </Link>
              </div>
            )}
          </section>

          {/* 业务记录 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-[14px] font-semibold">操作记录</h2>
            {snapshot.events.filter(e => e.entityId === dp.id).length === 0
              ? <p className="text-[13px] text-[var(--muted)]">暂无操作记录</p>
              : <ul className="space-y-2">
                  {snapshot.events.filter(e => e.entityId === dp.id).slice().reverse().map(e => (
                    <li key={e.id} className="text-[13px]">
                      <span className="mr-3 text-[12px] text-[var(--muted)]">{e.at.slice(0, 16).replace('T', ' ')}</span>
                      {e.description}
                    </li>
                  ))}
                </ul>
            }
          </section>
        </div>

        {/* Right sidebar: 审批操作 */}
        <div className="space-y-5">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-[14px] font-semibold">审批操作</h2>
            {dp.status === 'draft' && (
              <div className="space-y-3">
                <p className="text-[13px] text-[var(--muted)]">确认发货商品和数量后，提交给管理员审批。审批通过后可创建 平台入仓结果。</p>
                <button disabled={disabled || !!issue} onClick={() => void send({ type: 'fba_submit_delivery_plan', deliveryPlanId: dp.id })} className="w-full rounded-lg bg-[var(--primary)] py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                  提交审批
                </button>
              </div>
            )}
            {dp.status === 'pending' && (
              <div className="space-y-3">
                <p className="text-[13px] text-[var(--muted)]">请确认发货数量和物流方式，审批通过后再创建 平台入仓结果。</p>
                <button disabled={disabled || !!issue} onClick={() => void send({ type: 'fba_approve_delivery_plan', deliveryPlanId: dp.id })} className="w-full rounded-lg bg-[var(--primary)] py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                  审批通过
                </button>
              </div>
            )}
            {dp.status === 'done' && (
              <p className="text-[13px] text-[var(--muted)]">计划已完成，可在左侧关联货件或直接创建新货件。</p>
            )}
            {dp.status === 'cancelled' && (
              <p className="text-[13px] text-[var(--muted)]">计划已取消。</p>
            )}
            {!['done', 'cancelled'].includes(dp.status) && (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <p className="mb-2 text-[12px] font-medium text-[var(--muted)]">取消计划</p>
                <input className={`${fbaInput} mb-2 w-full`} placeholder="填写取消原因" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                <button disabled={disabled || !cancelReason.trim()} onClick={() => void send({ type: 'fba_cancel_delivery_plan', deliveryPlanId: dp.id, reason: cancelReason })} className="w-full rounded-lg border border-[var(--danger)] py-2 text-[13px] font-medium text-[var(--danger)] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
                  取消计划
                </button>
              </div>
            )}
          </section>

          {/* 流程说明 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">FBA 补货流程</h3>
            <ol className="space-y-1.5 text-[12px] text-[var(--muted)]">
              <li className={cn('flex items-center gap-2', dp.status !== 'cancelled' ? '' : 'opacity-40')}>
                <span className={cn('size-4 flex items-center justify-center rounded-full text-[10px] font-bold', dp.status === 'draft' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--muted)]')}>1</span>
                <Link href="/dashboard/fba/delivery-plans" className="hover:text-[var(--foreground)]">补货计划</Link>（规划）
              </li>
              <li className={cn('flex items-center gap-2', dp.inboundPlanId ? '' : 'opacity-40')}>
                <span className={cn('size-4 flex items-center justify-center rounded-full text-[10px] font-bold', dp.inboundPlanId && dp.status !== 'draft' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--muted)]')}>2</span>
                <Link href="/dashboard/fba/plans" className="hover:text-[var(--foreground)]">平台入仓结果</Link>（对接亚马逊）
              </li>
              <li className="flex items-center gap-2 opacity-40">
                <span className="flex size-4 items-center justify-center rounded-full bg-[var(--border)] text-[10px] font-bold text-[var(--muted)]">3</span>
                <Link href="/dashboard/fba/delivery-orders" className="hover:text-[var(--foreground)]">发货单</Link>（仓库执行）
              </li>
              <li className="flex items-center gap-2 opacity-40">
                <span className="flex size-4 items-center justify-center rounded-full bg-[var(--border)] text-[10px] font-bold text-[var(--muted)]">4</span>
                <Link href="/dashboard/fba/shipments" className="hover:text-[var(--foreground)]">平台收货回传</Link>（Amazon FC收货）
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

// re-export type for route pages
export type { FbaDeliveryPlan };
