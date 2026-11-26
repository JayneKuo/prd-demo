'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VendorOrderDetail } from './vendor-order-detail';
import { advanceVendorPO, vendorMutationErrors, type VendorPO, type VendorBatch } from '@/lib/vendor-workflow';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { currentTenant, currentUserRole, getCompanyById, getMerchantByScope } from '@/lib/tenant-context';
import { useAmazonConnections } from '@/components/amazon/use-amazon-connections';
import type { Connection } from '@/lib/amazon-connections';
import { channelSkuMappingsChangedEvent, getMappingSummary } from '@/lib/channel-sku-mappings';
import { hasCapability } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { mockProducts } from '@/lib/mock-data/products';
import { systemCarriers } from '@/lib/mock-data/carriers';
import { getWarehouseById, getWarehouseByCode, warehouses, skuInventory } from '@/lib/mock-data/warehouses';

export type AmazonWorkspaceKind = 'wholesale' | 'df' | 'fba' | 'appointments';
type Business = 'wholesale' | 'df' | 'fba';
type Line = { sku: string; ordered: number; accepted: number; backorder: number; rejected: number };
type PO = VendorPO;
type DF = { id: string; reference: string; connectionId: string; status: 'pending' | 'accepted' | 'rejected' | 'shipped'; sku: string; qty: number; reason: string; carrier: string; tracking: string; history: string[] };
type FBA = { sourceWarehouseId?: string; id: string; reference: string; connectionId: string; status: 'draft' | 'ready' | 'in_transit' | 'received' | 'available'; sku: string; qty: number; received: number; available: number; delivery: 'parcel' | 'ltl'; carrier: string; tracking: string; history: string[] };
type Task = { id: string; reference: string; connectionId: string; business: 'wholesale' | 'fba'; sourceId: string; sourceRef: string; status: 'pending' | 'requested' | 'booked' | 'completed' | 'cancelled'; site: string; slot: string; confirmation: string; note: string; history: string[] };
type DemoState = { version: 1; pos: PO[]; dfs: DF[]; fbas: FBA[]; tasks: Task[]; storageBlocked?: boolean };
type RecordRow = PO | DF | FBA | Task;

const product = mockProducts[0];
const sharedSku = product.variants[0].sku;
const sharedCarrier = systemCarriers.find(c => c.status === '启用')?.id ?? '';

const titles: Record<AmazonWorkspaceKind, string> = { wholesale: '供货订单', df: '直发订单', fba: 'FBA 补货', appointments: '预约任务' };
const descriptions: Record<AmazonWorkspaceKind, string> = {
  wholesale: 'PO 确认 → Collect / You-Ship 路由 → ASN → 发运。',
  df: '面向消费者的 Vendor DF 订单：接受或拒绝，再确认包裹发运；不创建 ASN。',
  fba: '创建入库计划、安排送仓与预约；接收数量与可售数量分别确认。',
  appointments: '集中处理 Vendor You-Ship 承运商送仓与 FBA 卡车送仓预约；Collect 等待 Amazon 提货，不由商户预约。',
};
const labels: Record<string, string> = { pending: '待处理', acknowledged: '已确认', routed: '已路由', asn: '已提交 ASN', shipped: '已发运', rejected: '已拒绝', accepted: '已接受', draft: '草稿', ready: '计划已创建', in_transit: '运输中', received: '已接收', available: '已可售', requested: '已申请', booked: '已预约', completed: '已完成', cancelled: '已取消' };
const button = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40';
const primary = cn(button, 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)] hover:opacity-90');
const input = 'h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[13px] text-[var(--foreground)] focus:outline-2 focus:outline-[var(--primary)] disabled:opacity-60';
const td = 'whitespace-nowrap px-4 py-3 text-[13px]';

function Badge({ status }: { status: string }) {
  const good = ['shipped', 'available', 'completed'].includes(status);
  const danger = ['rejected', 'cancelled'].includes(status);
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[12px] font-medium ${good ? 'bg-[var(--success-subtle,var(--surface-subtle))] text-[var(--success)]' : danger ? 'bg-[var(--danger-subtle,var(--surface-subtle))] text-[var(--danger)]' : 'bg-[var(--surface-subtle)] text-[var(--muted)]'}`}>{labels[status] ?? status}</span>;
}
function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <section id={id} className="scroll-mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)]"><h2 className="border-b border-[var(--border-subtle)] px-4 py-3 text-[14px] font-semibold">{title}</h2><div className="space-y-3 p-4">{children}</div></section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1 text-[12px] text-[var(--muted)]"><span>{label}</span>{children}</label>;
}
function CarrierSelect({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  return <select className={input} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}><option value="">选择共享承运商</option>{systemCarriers.filter(c => c.status === '启用' || c.id === value).map(c => <option key={c.id} value={c.id}>{c.name} · {c.code}</option>)}</select>;
}
function warehouseName(value: string | undefined) {
  if (!value) return '待在单据中选择';
  return getWarehouseById(value)?.name ?? getWarehouseByCode(value)?.name ?? '仓库无效，请重新选择';
}
function WarehouseSelect({ value, onChange, disabled = false, sku }: { value: string; onChange: (value: string) => void; disabled?: boolean; sku?: string }) {
  const warehouse = getWarehouseById(value);
  return <div className="space-y-1"><select className={input} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}><option value="">请选择共享仓库</option>{warehouses.filter(w => w.active || w.id === value).map(w => { const stock = skuInventory.find(i => i.warehouseId === w.id && i.sku === sku); return <option key={w.id} value={w.id} disabled={!w.active}>{w.name} · {w.code}{sku ? stock ? ' · 可用 ' + stock.available + ' 件' : ' · 暂无该 SKU 库存记录' : ''}{!w.active ? ' · 已停用' : ''}</option>; })}</select>{warehouse && <p className="text-[12px] text-[var(--muted)]">发货地址：{warehouse.address} · {warehouse.city} · {warehouse.country}</p>}</div>;
}
function History({ entries }: { entries: string[] }) {
  return <Section title="操作记录"><ol className="space-y-2 text-[12px] text-[var(--muted)]">{entries.map((entry, i) => <li key={i}>{entry}</li>)}</ol></Section>;
}
function log(text: string) { return `${new Date().toLocaleString('zh-CN')} · ${text}`; }
function validQty(value: number) { return Number.isSafeInteger(value) && value >= 0; }
function uid(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function readStorage(key: string) { return localStorage.getItem(key) ?? ''; }
function seed(connections: Connection[]): DemoState {
  const state: DemoState = { version: 1, pos: [], dfs: [], fbas: [], tasks: [] };
  for (const c of connections) {
    if (c.authorized && c.businesses.wholesale?.status === 'enabled' && c.businesses.wholesale.syncSettings?.receiveOrders !== false) {
      for (let i = 1; i <= 3; i++) {
        const reference = `PO-8624100${i}`;
        const processed = i === 2;
        const po: PO = { id: `${c.id}-po-${i}`, reference, shipToParty: { partyId: 'LGB8', address: { name: 'Amazon LGB8', addressLine1: '1568 N Linden Ave', city: 'Rialto', stateOrRegion: 'CA', postalCode: '92376', countryCode: 'US' } }, sellingParty: { partyId: c.businesses.wholesale?.reference || 'NW001' }, connectionId: c.id, status: processed ? 'shipped' : i === 3 ? 'acknowledged' : 'pending', lines: [{ sku: sharedSku, itemSequenceNumber: '1', vendorProductIdentifier: 'NW-WEP-BLK', amazonProductIdentifier: 'B0C8NW4P21', unitOfMeasure: 'Eaches', netCost: { amount: '32.00', currencyCode: 'USD' }, ordered: 120, accepted: 120, backorder: 0, rejected: 0 }], reason: '', route: processed ? 'You-Ship' : '', routingRef: processed ? 'RT-86241002' : '', carrier: processed ? sharedCarrier : '', tracking: processed ? 'PRO-86241002' : '', asn: processed ? 'ASN-86241002' : '', cartons: 10, shipDate: processed ? '2026-10-28' : '', history: processed ? ['PO 已确认：接受 120 件。', 'You-Ship 路由与送仓预约已确认。', 'ASN 已提交：120 件 / 10 箱。', '2026-10-28 · 已确认发运。'] : [i === 3 ? 'PO 已确认：接受 120 件，等待安排运输。' : 'PO 已接收，等待供货数量确认。'] };
        state.pos.push(po);
        if (processed) state.tasks.push({ id: `${c.id}-appt-po-2`, reference: 'APPT-86241002', connectionId: c.id, business: 'wholesale', sourceId: po.id, sourceRef: reference, status: 'completed', site: 'LGB8', slot: '2026-10-29T09:00', confirmation: 'ISA-86241002', note: '承运商已完成送仓交接', history: ['送仓预约已确认。', '送仓交接完成。'] });
      }
    }
    if (c.authorized && c.businesses.wholesale?.status === 'enabled' && c.businesses.wholesale.syncSettings?.receiveOrders !== false) {
      for (const failure of ['routing', 'asn'] as const) {
        const id = `${c.id}-po-${failure}-failure`;
        const reference = failure === 'routing' ? 'PO-86241004' : 'PO-86241005';
        const batch: VendorBatch = { id: failure === 'routing' ? 'BATCH-86241004' : 'BATCH-86241005', status: failure === 'routing' ? 'routing_failed' : 'asn_failed', lines: [{ sku: sharedSku, qty: 120 }], warehouseId: warehouses.find(w => w.active)?.id ?? '', route: 'Collect', readyDate: '2026-11-10', cartons: 1, pallets: 0, volumeM3: 1, packingType: 'carton', weightKg: 120, routingRef: failure === 'asn' ? 'RT-86241005' : '', destination: failure === 'asn' ? 'LGB8' : '', carrier: '', tracking: 'PRO-86241005', asn: '', submittedAt: '2026-11-02T00:00:00Z', transactionId: `${failure.toUpperCase()}-INITIAL-${reference}`, shipFromAddress: failure === 'routing' ? '' : '123 Warehouse Ave, Los Angeles, CA 90001', bol: '', sscc: '000123456789012345', failure: failure === 'routing' ? '发货地址不完整：缺少街道、城市及邮编。' : 'BOL 运输提单号不能为空' };
        state.pos.push({ id, reference, shipToParty: { partyId: 'LGB8' }, sellingParty: { partyId: c.businesses.wholesale?.reference || 'NW001' }, connectionId: c.id, status: 'acknowledged', lines: [{ sku: sharedSku, itemSequenceNumber: '1', vendorProductIdentifier: 'NW-WEP-BLK', amazonProductIdentifier: 'B0C8NW4P21', unitOfMeasure: 'Eaches', netCost: { amount: '32.00', currencyCode: 'USD' }, ordered: 120, accepted: 120, backorder: 0, rejected: 0 }], reason: '', route: '', routingRef: '', carrier: '', tracking: '', asn: '', cartons: 10, shipDate: '', batches: [batch], history: ['PO 已确认：接受 120 件。', `${failure === 'routing' ? 'Routing' : 'ASN'} 处理失败，原批次 120 件仍占用，等待修正资料并重提。`] });
      }
    }
    if (c.authorized && c.businesses.df?.status === 'enabled' && c.businesses.df.syncSettings?.receiveOrders !== false) {
      for (let i = 1; i <= 3; i++) state.dfs.push({ id: `${c.id}-df-${i}`, reference: `DF-8624200${i}`, connectionId: c.id, status: i === 2 ? 'shipped' : i === 3 ? 'accepted' : 'pending', sku: sharedSku, qty: i, reason: '', carrier: i === 2 ? sharedCarrier : '', tracking: i === 2 ? '1Z84A9300392415806' : '', history: i === 2 ? ['DF 订单已接受。', '包裹已发运，运单已登记。'] : [i === 3 ? 'DF 订单已接受，等待仓库出库。' : 'DF 订单已接收，等待接单。'] });
    }
    if (c.authorized && c.businesses.fba?.status === 'enabled' && c.businesses.fba.syncSettings?.receiveExistingPlans !== false) {
      const base: FBA = { id: `${c.id}-fba-1`, reference: 'FBA-86243001', connectionId: c.id, status: 'draft', sku: sharedSku, qty: 240, received: 0, available: 0, delivery: 'parcel', carrier: '', tracking: '', history: ['入库草稿已保存，等待确认计划。'] };
      state.fbas.push(base, { ...base, id: `${c.id}-fba-2`, reference: 'FBA-86243002', status: 'received', received: 200, available: 160, delivery: 'ltl', carrier: sharedCarrier, tracking: 'BOL-86243002', history: ['入库计划已确认：240 件。', '卡车送仓预约已确认。', '累计接收 200 件，其中可售 160 件；剩余数量待接收。'] }, { ...base, id: `${c.id}-fba-3`, reference: 'FBA-86243003', status: 'available', received: 240, available: 240, carrier: sharedCarrier, tracking: '1Z84A9300392415807', history: ['计划已完成送仓，240 件已接收并全部可售。'] });
      state.tasks.push({ id: `${c.id}-appt-fba-2`, reference: 'APPT-86243002', connectionId: c.id, business: 'fba', sourceId: `${c.id}-fba-2`, sourceRef: 'FBA-86243002', status: 'booked', site: 'ONT8', slot: '2026-10-30T10:00', confirmation: 'ISA-86243002', note: '分批卸货，接收数量持续更新', history: ['送仓预约已确认，等待完成交接。'] });
    }
  }
  return state;
}
function migrateDisplay(value: string) {
  return value.replace(/DEMO-/g, '').replace(/DESK-LAMP-01/g, sharedSku).replace(/USB-C-HUB-07/g, product.variants[1].sku)
    .replace(/Demo Customer/g, 'Alex Morgan').replace(/（模拟）|模拟|演示|虚构/g, '').replace(/本地/g, '')
    .replace(/未调用 Amazon。/g, '等待确认入库计划。');
}
function migrateState(state: DemoState, connections: Connection[]): DemoState {
  // Update display data without changing durable IDs, quantities or workflow states.
  const display = <T extends RecordRow>(row: T): T => ({ ...row, reference: migrateDisplay(row.reference), history: row.history.map(migrateDisplay) });
  const legacyDestination = { partyId: 'LGB8', address: { name: 'Amazon LGB8', addressLine1: '1568 N Linden Ave', city: 'Rialto', stateOrRegion: 'CA', postalCode: '92376', countryCode: 'US' } };
  return { ...state,
    pos: state.pos.map(row => ({ ...display(row), shipToParty: row.shipToParty ?? (row.id.includes('-po-') ? legacyDestination : undefined), sellingParty: row.sellingParty ?? { partyId: connections.find(connection => connection.id === row.connectionId)?.businesses.wholesale?.reference || '' }, lines: row.lines.map((line, index) => ({ ...line, sku: migrateDisplay(line.sku), ...(row.id.includes('-po-') ? { itemSequenceNumber: line.itemSequenceNumber ?? String(index + 1), vendorProductIdentifier: line.vendorProductIdentifier ?? 'NW-WEP-BLK', amazonProductIdentifier: line.amazonProductIdentifier ?? 'B0C8NW4P21', unitOfMeasure: line.unitOfMeasure ?? 'Eaches' as const, netCost: line.netCost ?? { amount: '32.00', currencyCode: 'USD' } } : {}) })), asn: migrateDisplay(row.asn), routingRef: migrateDisplay(row.routingRef), tracking: migrateDisplay(row.tracking) })),
    dfs: state.dfs.map(row => ({ ...display(row), sku: migrateDisplay(row.sku), tracking: migrateDisplay(row.tracking) })),
    fbas: state.fbas.map(row => ({ ...display(row), sourceWarehouseId: row.sourceWarehouseId ?? (() => { const legacy = connections.find(c => c.id === row.connectionId)?.businesses.fba?.warehouse; return legacy ? (getWarehouseById(legacy) ?? getWarehouseByCode(legacy))?.id : undefined; })(), sku: migrateDisplay(row.sku), tracking: migrateDisplay(row.tracking) })),
    tasks: state.tasks.map(row => ({ ...display(row), sourceRef: migrateDisplay(row.sourceRef), site: migrateDisplay(row.site), confirmation: migrateDisplay(row.confirmation) })),
  };
}
function loadDemo(key: string, connections: Connection[]) {
  const defaults = seed(connections);
  try {
    const raw = readStorage(key);
    if (!raw) return defaults;
    let stored = JSON.parse(raw) as DemoState;
    if (stored.version !== 1 || !['pos', 'dfs', 'fbas', 'tasks'].every(k => Array.isArray(stored[k as keyof DemoState]))) throw new Error('invalid');
    stored = migrateState(stored, connections);
    // Preserve progressed records while adding samples for newly enabled connections.
    for (const key of ['pos', 'dfs', 'fbas'] as const) {
      const existing = new Set(stored[key].map(row => row.id));
      const added = defaults[key].filter(row => !existing.has(row.id));
      (stored[key] as RecordRow[]).push(...added);
      stored.tasks.push(...defaults.tasks.filter(task => added.some(row => row.id === task.sourceId) && !stored.tasks.some(t => t.id === task.id)));
    }
    return stored;
  } catch { return { version: 1, pos: [], dfs: [], fbas: [], tasks: [], storageBlocked: true } as DemoState; }
}

export function AmazonBusinessWorkspace({ kind, detailId, routeBase, listMode }: { kind: AmazonWorkspaceKind; detailId?: string; routeBase?: string; listMode?: 'plans' | 'shipments' }) {
  const { companyId, merchantScope } = useShellState();
  const configKey = `amazon-oms-v1:${companyId}:${merchantScope}`;
  const { connections: configuredConnections, ready, error } = useAmazonConnections();
  const connections = configuredConnections.map(c => ({ ...c, businesses: Object.fromEntries(Object.entries(c.businesses).filter(([id, b]) => (b?.status === 'enabled' || b?.status === 'paused') && ((id === 'fba') === (c.identity === 'seller')))) }));
  const applicable = connections.filter(c => kind === 'appointments' ? c.businesses.wholesale || c.businesses.fba : kind === 'wholesale' ? c.businesses.wholesale || c.businesses.df : c.businesses[kind]);
  const company = getCompanyById(companyId);
  const merchant = getMerchantByScope(merchantScope);
  const canRead = hasCapability(currentUserRole, kind === 'fba' ? 'inventory:read' : 'orders:read');
  if (!canRead) return <div className="p-6 text-[13px] text-[var(--muted)]">当前角色没有查看此业务的权限。</div>;
  return <div className="mx-auto max-w-7xl pt-5 text-[var(--foreground)] lg:pt-6">
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
      <div><h1 className="text-[24px] font-semibold tracking-tight">{kind === 'wholesale' ? 'Vendor 订单' : kind === 'fba' ? listMode === 'shipments' ? '入仓货件' : '补货计划' : titles[kind]}</h1><p className="mt-1 text-[13px] text-[var(--muted)]">{descriptions[kind]}</p><p className="mt-2 text-[12px] text-[var(--muted)]">{currentTenant.name} / {company.name} / {merchant?.name ?? '全部商户'}</p></div>
      <Link href="/dashboard/apps/amazon" className={button}>业务配置</Link>
    </header>
    {error ? <p role="alert" className="text-[13px] text-[var(--danger)]">{error}</p> : !ready ? <p className="text-[13px] text-[var(--muted)]">正在读取当前范围业务配置…</p> : applicable.length === 0 ? <section className="rounded-lg border border-[var(--border)] p-6"><h2 className="text-[14px] font-semibold">当前范围未启用适用业务</h2><p className="my-2 text-[13px] text-[var(--muted)]">请先授权 Amazon 连接并启用{kind === 'appointments' ? ' Vendor 批发或 FBA 入库' : kind === 'wholesale' ? ' Vendor 批发' : kind === 'df' ? ' Vendor Direct Fulfillment' : ' Seller FBA 入库'}。草稿业务不可操作；已暂停业务保留已有处理，失效授权仅可查看历史。</p><Link href="/dashboard/apps/amazon" className={button}>前往应用配置</Link></section> : <ScopedWorkspace key={`${configKey}:${applicable.map(c => `${c.id}:${c.authorized}:${JSON.stringify(c.businesses)}`).join('|')}`} kind={kind} detailId={detailId} routeBase={routeBase} listMode={listMode} connections={connections} mappingConnections={configuredConnections} storageKey={`amazon-oms-business-demo-v1:${companyId}:${merchantScope}`} />}
  </div>;
}

const workspaceRoutes: Record<AmazonWorkspaceKind, string> = { wholesale: 'vendor-orders', df: 'vendor-orders', fba: 'fba/plans', appointments: 'appointments' };
function workspaceHref(kind: AmazonWorkspaceKind, connectionId: string, recordId: string, search = '') {
  const params = new URLSearchParams(search);
  params.set('connection', connectionId);
  params.delete('record');
  return `/dashboard/${workspaceRoutes[kind]}/${encodeURIComponent(recordId)}?${params.toString()}`;
}
function journey(kind: AmazonWorkspaceKind, row: RecordRow, task?: Task) {
  if (kind === 'wholesale') {
    const po = row as PO;
    const accepted = po.lines.reduce((sum, line) => sum + line.accepted, 0);
    if (po.status === 'rejected') return { stage: '流程已结束 · PO 已拒绝', next: '无需安排运输；可返回列表处理其他订单。', summary: `接受 0 件；拒绝原因：${po.reason}`, done: true };
    if (po.status === 'shipped' && !po.lines.some(line => line.backorder > 0)) return { stage: '阶段 4 / 4 · 已发运', next: task && task.status !== 'completed' ? '发运已完成；送仓后请继续完成关联预约交接。' : '本次供货发运处理完成，可返回列表。', summary: po.batches?.length ? `${accepted} 件已发运 · ${po.batches.length} 个批次 · ${po.batches.map(batch => batch.asn).filter(Boolean).join('、')}` : `${accepted} 件 / ${po.cartons} 箱已发运 · ${po.asn} · ${po.route} · ${po.shipDate}`, done: true };
    if (po.acknowledgement?.status === 'processing') return { stage: '数量确认处理中', next: '已提交确认，等待处理结果，暂不能重复提交或 Routing。', anchor: 'po-quantity' };
    if (po.batches?.length) return { stage: po.batches.some(batch => ['routing_failed', 'asn_failed'].includes(batch.status)) ? '发运批次待修正重提' : '发运批次与延期处理中', next: '按批次跟踪 Routing、ASN 与发运；失败批次修正原资料后重提，延期可继续接受或拒绝，已分配数量不重复占用。', anchor: 'po-routing' };
    if (po.status === 'pending') return { stage: '阶段 1 / 4 · PO 数量确认', next: '核对接受、延期、拒绝数量，填写差异原因后提交 PO 确认。', anchor: 'po-quantity' };
    if (po.status === 'acknowledged') return { stage: '阶段 2 / 4 · 运输路由', next: accepted === 0 ? '本单全部延期，暂无可发运数量；返回列表处理其他 PO，等待后续供货安排。' : '选择 Collect 或 You-Ship，填写运输参考资料后保存路由。', anchor: accepted > 0 ? 'po-routing' : undefined };
    if (po.status === 'routed') return { stage: '阶段 3 / 4 · 提交 ASN', next: `为已接受的 ${accepted} 件填写箱数及发运日期，提交 ASN。`, anchor: 'po-shipping' };
    return { stage: '阶段 4 / 4 · 确认发运', next: po.route === 'You-Ship' && (!task || !['booked', 'completed'].includes(task.status)) ? '先确认关联送仓预约，再返回此 PO 确认发运。' : '核对 ASN 后确认实际发运；Collect 等待 Amazon 提货。', anchor: 'po-shipping' };
  }
  if (kind === 'df') {
    const order = row as DF;
    if (order.status === 'shipped' || order.status === 'rejected') return { stage: order.status === 'shipped' ? '阶段 2 / 2 · 包裹已发运' : '流程已结束 · 订单已拒绝', next: '本单处理完成，可返回列表继续处理订单。', summary: order.status === 'shipped' ? `${order.sku} × ${order.qty} 已发运 · 运单 ${order.tracking} · 无 ASN` : `未发运；拒绝原因：${order.reason}`, done: true };
    return { stage: order.status === 'pending' ? '阶段 1 / 2 · 接单确认' : '阶段 2 / 2 · 包裹发运', next: order.status === 'pending' ? '确认库存后接受订单；无法履约时填写原因并拒绝。' : '选择承运商并填写运单号，再确认消费者包裹发运，无需 ASN。', anchor: order.status === 'pending' ? 'df-order' : 'df-shipping' };
  }
  if (kind === 'fba') {
    const plan = row as FBA;
    if (plan.status === 'available') return { stage: '阶段 4 / 4 · 全部可售', next: task && task.status !== 'completed' ? '入库数量已全部可售；请核对并完成关联送仓预约交接。' : '本次补货已全部接收并可售，可返回列表。', summary: `计划 ${plan.qty} 件 · 已接收 ${plan.received} 件 · 已可售 ${plan.available} 件`, done: true };
    if (plan.status === 'draft') return { stage: '阶段 1 / 4 · 确认入库计划', next: '核对 SKU 与计划数量后创建 Amazon 入库计划；业务暂停时不可创建。', anchor: 'fba-plan' };
    if (plan.status === 'ready') return { stage: '阶段 2 / 4 · 安排送仓', next: '选择小包或卡车、承运商及运输参考号；卡车送仓将生成预约任务。', anchor: 'fba-delivery' };
    return { stage: plan.status === 'in_transit' ? '阶段 3 / 4 · 仓库接收' : '阶段 4 / 4 · 接收与可售核对', next: plan.delivery === 'ltl' && (!task || !['booked', 'completed'].includes(task.status)) ? '先确认卡车送仓预约，再返回计划登记仓库接收。' : `分批更新接收与可售，仍待接收 ${plan.qty - plan.received} 件、已接收待可售 ${plan.received - plan.available} 件；接收不等于可售。`, anchor: 'fba-receiving' };
  }
  const appointment = row as Task;
  if (appointment.status === 'completed') return { stage: '阶段 4 / 4 · 交接完成', next: '预约交接已完成，请返回来源记录继续核对发运或接收与可售。', summary: `${appointment.sourceRef} · ${appointment.site} · ${appointment.slot.replace('T', ' ')} · ${appointment.confirmation}`, done: true };
  if (appointment.status === 'cancelled') return { stage: '预约已取消 · 来源业务未自动完成', next: '需要重新安排时，重新打开此任务并申请新时段；也可返回来源记录查看进度。', summary: `取消原因：${appointment.note}`, anchor: 'appointment-processing' };
  return { stage: `阶段 ${appointment.status === 'pending' ? 1 : appointment.status === 'requested' ? 2 : 3} / 4 · ${labels[appointment.status]}`, next: appointment.status === 'pending' ? '填写预约时段并申请预约。' : appointment.status === 'requested' ? '收到确认后，填写预约确认号并确认预约。' : '预约已确认，可返回来源记录继续处理；实际交接后再完成任务。', anchor: 'appointment-processing' };
}

function ScopedWorkspace({ kind: requestedKind, connections, mappingConnections, storageKey, detailId, routeBase, listMode }: { kind: AmazonWorkspaceKind; connections: Connection[]; mappingConnections: Connection[]; storageKey: string; detailId?: string; routeBase?: string; listMode?: 'plans' | 'shipments' }) {
  const router = useRouter();
  const base = routeBase ?? `/dashboard/${workspaceRoutes[requestedKind]}`;
  const { companyId, merchantScope } = useShellState();
  const [mappingSummaries, setMappingSummaries] = useState<Record<string, string>>({});
  useEffect(() => {
    const reload = () => {
      const summaries: Record<string, string> = {};
      for (const c of mappingConnections) for (const config of Object.values(c.businesses)) {
        if (!config?.site) continue;
        try { const summary = getMappingSummary(companyId, merchantScope, c, config.site); summaries[`${c.id}:${config.site}`] = `${summary.mapped} / ${summary.total} 已匹配`; }
        catch { summaries[`${c.id}:${config.site}`] = '商品映射存储异常，原数据已保留'; }
      }
      setMappingSummaries(summaries);
    };
    reload();
    window.addEventListener('storage', reload);
    window.addEventListener(channelSkuMappingsChangedEvent, reload);
    return () => { window.removeEventListener('storage', reload); window.removeEventListener(channelSkuMappingsChangedEvent, reload); };
  }, [companyId, merchantScope, mappingConnections]);
  const [state, setState] = useState<DemoState>(() => loadDemo(storageKey, connections));
  const [storageError, setStorageError] = useState(Boolean(state.storageBlocked));
  const [urlSearch, setUrlSearch] = useState(() => typeof window === 'undefined' ? '' : window.location.search);
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('create') === '1');
  const params = new URLSearchParams(urlSearch);
  const query = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';
  const connectionId = params.get('connection') ?? 'all';
  const selectedId = detailId ?? params.get('record');
  const kind: AmazonWorkspaceKind = requestedKind === 'wholesale' && selectedId && state.dfs.some(order => order.id === selectedId) ? 'df' : requestedKind;
  const vendorType = params.get('type') ?? 'all';
  const onboarding = params.get('onboarding') === '1';
  useEffect(() => {
    const sync = () => { setUrlSearch(window.location.search); setCreating(new URLSearchParams(window.location.search).get('create') === '1'); setNotice(''); };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [kind]);
  function navigate(changes: Record<string, string | null>, replace = false) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    if (url.href !== window.location.href) {
      if (replace) window.history.replaceState(null, '', url);
      else window.history.pushState(null, '', url);
    }
    setUrlSearch(url.search);
    setCreating(false);
    setNotice('');
  }
  const setQuery = (value: string) => navigate({ q: value || null }, true);
  const setStatus = (value: string) => navigate({ status: value === 'all' ? null : value });
  const setConnectionId = (value: string) => navigate({ connection: value === 'all' ? null : value, record: null });
  const setSelectedId = (id: string | null) => {
    const row = rows.find(row => row.id === id);
    const next = new URLSearchParams(urlSearch); next.delete('record');
    if (row) next.set('connection', row.connectionId);
    router.push(id ? `${base}/${encodeURIComponent(id)}?${next}` : `${base}?${next}`);
  };
  useEffect(() => { if (state.storageBlocked) return; try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { setStorageError(true); } }, [state, storageKey]);
  useEffect(() => {
    const timer = window.setInterval(() => setState(current => {
      if (current.storageBlocked) return current;
      let changed = false;
      const pos = current.pos.map(po => {
        if (!connections.find(connection => connection.id === po.connectionId)?.authorized) return po;
        const next = advanceVendorPO(po);
        if (next !== po) changed = true;
        return next;
      });
      return changed ? { ...current, pos } : current;
    }), 500);
    return () => window.clearInterval(timer);
  }, [connections]);
  const enabled = (id: string, business: Business) => connections.some(c => c.id === id && c.businesses[business]);
  const rows: RecordRow[] = kind === 'wholesale' ? [...state.pos.filter(p => enabled(p.connectionId, 'wholesale')), ...state.dfs.filter(d => enabled(d.connectionId, 'df'))] : kind === 'df' ? state.dfs.filter(d => enabled(d.connectionId, 'df')) : kind === 'fba' ? state.fbas.filter(f => enabled(f.connectionId, 'fba')) : state.tasks.filter(t => enabled(t.connectionId, t.business) && (t.business === 'fba' || state.pos.some(p => (p.id === t.sourceId && p.route === 'You-Ship') || p.batches?.some(b => t.sourceId === `${p.id}:${b.id}` && b.route === 'You-Ship'))));
  const applicable = connections.filter(c => kind === 'appointments' ? c.businesses.wholesale || c.businesses.fba : kind === 'wholesale' ? c.businesses.wholesale || c.businesses.df : c.businesses[kind]);
  const connection = (id: string) => connections.find(c => c.id === id);
  const selected = rows.find(row => row.id === selectedId && (connectionId === 'all' || row.connectionId === connectionId));
  const relatedTask = selected && kind !== 'appointments' ? state.tasks.find(t => t.sourceId === selected.id && t.connectionId === selected.connectionId && t.status !== 'cancelled') ?? state.tasks.find(t => t.sourceId === selected.id && t.connectionId === selected.connectionId) : undefined;
  const progress = selected ? journey(kind, selected, relatedTask) : undefined;
  const sourceRecord = kind === 'appointments' && selected ? (selected as Task).business === 'fba' ? state.fbas.find(f => f.id === (selected as Task).sourceId) : state.pos.find(p => p.id === (selected as Task).sourceId) : selected;
  const selectedWarehouse = kind === 'df' && selected ? connection(selected.connectionId)?.businesses.df?.warehouse : sourceRecord && 'sourceWarehouseId' in sourceRecord ? sourceRecord.sourceWarehouseId : sourceRecord && 'lines' in sourceRecord ? sourceRecord.warehouseId : undefined;
  const sourceTask = kind === 'appointments' && selected ? selected as Task : undefined;
  const sourceHref = sourceTask ? workspaceHref(sourceTask.business, sourceTask.connectionId, sourceTask.business === 'wholesale' ? sourceTask.sourceId.split(':')[0] : sourceTask.sourceId, urlSearch) : undefined;
  const selectedBusiness = kind === 'appointments' ? (selected as Task | undefined)?.business : kind;
  const canWrite = !storageError && Boolean(selected && connection(selected.connectionId)?.authorized) && (kind === 'appointments' ? hasCapability(currentUserRole, 'orders:write') : selectedBusiness === 'df' ? hasCapability(currentUserRole, 'orders:write') : selectedBusiness === 'fba' ? hasCapability(currentUserRole, 'inventory:write') : selectedBusiness === 'wholesale' ? hasCapability(currentUserRole, 'orders:write') : false);
  const creatable = applicable.filter(c => !storageError && c.authorized && c.businesses.fba?.status === 'enabled');
  const filtered = rows.filter(row => (requestedKind !== 'wholesale' || vendorType === 'all' || (vendorType === 'df' ? !('lines' in row) : 'lines' in row)) && (listMode !== 'shipments' || row.status !== 'draft') && (status === 'all' || row.status === status) && (connectionId === 'all' || row.connectionId === connectionId) && `${row.reference} ${connection(row.connectionId)?.name} ${'sku' in row ? row.sku : 'sourceRef' in row ? row.sourceRef : 'lines' in row ? row.lines.map(l => l.sku).join(' ') : ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const firstActionable = filtered.find(row => {
    if (storageError || !connection(row.connectionId)?.authorized || (['shipped', 'rejected', 'available', 'completed'].includes(row.status) && !(kind === 'wholesale' && 'lines' in row && row.status === 'shipped' && row.lines.some(line => line.backorder > 0)))) return false;
    if (!hasCapability(currentUserRole, kind === 'fba' ? 'inventory:write' : 'orders:write')) return false;
    if (kind === 'fba' && row.status === 'draft' && connection(row.connectionId)?.businesses.fba?.status !== 'enabled') return false;
    if (kind === 'wholesale' && 'lines' in row && row.status === 'acknowledged' && row.lines.every(line => line.accepted === 0 && line.backorder === 0)) return false;
    return true;
  });
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pagedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filteredCreatable = creatable.filter(c => connectionId === 'all' || c.id === connectionId);
  const statuses = kind === 'wholesale' ? ['pending', 'acknowledged', 'accepted', 'routed', 'asn', 'shipped', 'rejected'] : kind === 'df' ? ['pending', 'accepted', 'rejected', 'shipped'] : kind === 'fba' ? ['draft', 'ready', 'in_transit', 'received', 'available'] : ['pending', 'requested', 'booked', 'completed', 'cancelled'];
  function updatePO(next: PO, expected: PO) {
    const config = connection(next.connectionId)?.businesses.wholesale;
    if (storageError || !hasCapability(currentUserRole, 'orders:write') || !connection(next.connectionId)?.authorized || config?.status !== 'enabled' || config.syncSettings?.shipmentWriteback === false) { setNotice('当前不可提交批发供货操作，请检查授权、业务配置及存储。'); return; }
    setState(current => {
      const latest = current.pos.find(po => po.id === next.id);
      if (!latest || JSON.stringify(latest) !== JSON.stringify(expected) || vendorMutationErrors(latest, next).length) return current;
      return { ...current, pos: current.pos.map(po => po.id === next.id ? next : po) };
    });
  }
  function updateDF(next: DF) { if (next.status === 'shipped' && connection(next.connectionId)?.businesses.df?.syncSettings?.shipmentWriteback === false) { setNotice('DF 业务未启用发货确认回传，操作未生效；不会重复创建配送。'); return; } if (storageError || !hasCapability(currentUserRole, 'orders:write') || !connection(next.connectionId)?.authorized) return; setState(s => ({ ...s, dfs: s.dfs.map(d => d.id === next.id ? next : d) })); setNotice(next.history.at(-1) ?? '订单进度已更新。'); }
  function updateFBA(next: FBA, task?: Task) { if (storageError || !hasCapability(currentUserRole, 'inventory:write') || !connection(next.connectionId)?.authorized || (state.fbas.find(f => f.id === next.id)?.status === 'draft' && connection(next.connectionId)?.businesses.fba?.status !== 'enabled')) return; setState(s => ({ ...s, fbas: s.fbas.map(f => f.id === next.id ? next : f), tasks: task ? [...s.tasks, task] : s.tasks })); setNotice(next.history.at(-1) ?? '入库计划进度已更新。'); }
  function updateTask(next: Task) { if (storageError || !hasCapability(currentUserRole, 'orders:write') || !connection(next.connectionId)?.authorized) return; setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === next.id ? next : t) })); setNotice(next.history.at(-1) ?? '预约进度已更新。'); }
  function taskFor(source: PO | FBA, business: 'wholesale' | 'fba'): Task { return { id: uid('appt'), reference: `APPT-${source.reference}`, connectionId: source.connectionId, business, sourceId: source.id, sourceRef: source.reference, status: 'pending', site: business === 'fba' ? 'ONT8' : 'LGB8', slot: '', confirmation: '', note: '', history: [log('已创建送仓预约任务')] }; }
  return <>
    <details className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold">业务配置与履约资料</summary>
      <div className="grid gap-3 border-t border-[var(--border-subtle)] p-4 md:grid-cols-2">{applicable.map(c => {
        const businesses = kind === 'appointments' ? (['wholesale', 'fba'] as const).filter(id => c.businesses[id]) : [kind];
        return businesses.map(id => {
          const config = c.businesses[id]!;
          return <section key={`${c.id}:${id}`} className="rounded-md border border-[var(--border-subtle)] p-3">
            <h3 className="font-semibold text-[13px]">{c.name} · {c.identity === 'seller' ? 'Seller' : 'Vendor'} · {titles[id]}</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div><dt className="text-[var(--muted)]">账号 / 站点</dt><dd>{c.accountId || '未填写'} / {config.site || '未配置'}</dd></div>
              <div><dt className="text-[var(--muted)]">业务状态 / 授权</dt><dd>{config.status === 'enabled' ? '已启用' : '已暂停'} · {c.authorized ? '有效' : '已失效'}</dd></div>
              <div><dt className="text-[var(--muted)]">{id === 'df' ? '固定履约仓库 / 外部节点' : '仓库分配'}</dt><dd>{id === 'df' ? warehouseName(config.warehouse) + ' / ' + (config.reference || '未配置') : id === 'fba' ? '按入库计划选择发货仓库与地址' : '按 PO 手动选择发货仓库'}</dd></div>
              <div><dt className="text-[var(--muted)]">处理方式 / 同步起始日</dt><dd>{config.rule || '未配置'} / {config.syncFrom || '未配置'}</dd></div>
              <div><dt className="text-[var(--muted)]">商品 / 供应商</dt><dd>{sharedSku} · {product.vendor}</dd></div>
              <div><dt className="text-[var(--muted)]">商品映射</dt><dd>{mappingSummaries[`${c.id}:${config.site}`] ?? '正在读取…'}</dd></div>
            </dl><Link className="mt-2 inline-block text-[12px] text-[var(--primary)] hover:underline" href={`/dashboard/product-mapping?${new URLSearchParams({ amazonConnection: c.id, amazonBusiness: id, site: config.site })}`}>查看商品映射</Link>
          </section>;
        });
      })}</div>
    </details>
    <p className="mb-3 text-[12px] text-[var(--muted)]">暂停业务不再创建新计划或接收新订单，已有记录可继续处理；授权失效时已有记录只读。</p>
    {storageError && <p role="alert" className="mb-3 text-[13px] text-[var(--danger)]">无法读取或保存业务记录。已有数据不会被重置；请检查浏览器存储后刷新。</p>}
    {notice && <div role="status" className="mb-3 flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-[13px]">{notice}<button aria-label="关闭操作提示" onClick={() => setNotice('')}><X className="size-4" /></button></div>}
    {selectedId && !selected && <div role="alert" className="mb-3 rounded-md border border-[var(--border)] p-3 text-[13px]">此记录不属于当前连接或业务范围，或已不可用。<button className={`${button} ml-3`} onClick={() => setSelectedId(null)}>返回当前列表</button></div>}
    {onboarding && !selected && !creating && <section className="mb-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="text-[14px] font-semibold">配置已就绪 · 开始处理{titles[kind]}</h2><p className="text-[13px] text-[var(--muted)]">{connectionId === 'all' ? '当前适用连接' : connection(connectionId)?.name ?? '指定连接'} · 当前筛选共 {filtered.length} 条记录。{firstActionable ? '从第一条可处理记录开始，详情会提示下一步。' : '当前没有可直接处理的记录；可查看历史或调整筛选。'}</p>{firstActionable && <button className={primary} onClick={() => setSelectedId(firstActionable.id)}>开始处理 {firstActionable.reference}</button>}{!firstActionable && kind === 'fba' && listMode !== 'shipments' && filteredCreatable.length > 0 && hasCapability(currentUserRole, 'inventory:write') && <button className={primary} onClick={() => setCreating(true)}>新建首个入库计划</button>}</section>}
    {creating ? <CreatePlan connections={filteredCreatable} onCancel={() => setCreating(false)} onCreate={fba => { if (!hasCapability(currentUserRole, 'inventory:write') || !creatable.some(c => c.id === fba.connectionId)) return; setState(s => ({ ...s, fbas: [...s.fbas, fba] })); setCreating(false); const nextParams = new URLSearchParams(urlSearch); nextParams.delete('create'); nextParams.delete('record'); nextParams.set('connection', fba.connectionId); localStorage.setItem(storageKey, JSON.stringify({ ...state, fbas: [...state.fbas, fba] })); router.push(`${base}/${encodeURIComponent(fba.id)}?${nextParams}`); setNotice('入库草稿已保存，请在详情中确认计划。'); }} /> : selected ? <>
      <div className="mb-4 flex flex-wrap items-center gap-3"><button className={button} onClick={() => setSelectedId(null)}><ArrowLeft className="size-3.5" />返回列表</button><h2 className="text-[18px] font-semibold">{listMode === 'shipments' ? `SHP-${selected.reference.replace(/^FBA-/, '')}` : selected.reference}</h2><Badge status={selected.status} /><span className="text-[12px] text-[var(--muted)]">{connection(selected.connectionId)?.name}</span></div>
      <div className="mb-4 text-[12px] text-[var(--muted)]">站点：{connection(selected.connectionId)?.businesses[kind === 'appointments' ? (selected as Task).business : kind]?.site || '未配置'} · 仓库：{warehouseName(selectedWarehouse)} · {connection(selected.connectionId)?.region}</div>
      {kind === 'fba' && selected && <div className="mb-4 flex gap-4 text-xs"><Link className="text-[var(--primary)]" href={`/dashboard/fba/plans/${encodeURIComponent(selected.id)}?connection=${encodeURIComponent(selected.connectionId)}`}>查看补货计划</Link>{selected.status !== 'draft' && <Link className="text-[var(--primary)]" href={`/dashboard/fba/shipments/${encodeURIComponent(selected.id)}?connection=${encodeURIComponent(selected.connectionId)}`}>查看关联入仓货件</Link>}<Link className="text-[var(--primary)]" href="/dashboard/fba/inventory">查看 FBA 库存快照</Link></div>}
      {progress && <section aria-label="当前阶段与下一步" className="mb-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4"><h3 className="text-[14px] font-semibold">{progress.stage}</h3>{progress.summary && <p className="text-[13px]">处理结果：{progress.summary}</p>}<p className="text-[13px] text-[var(--muted)]">下一步：{progress.next}</p><div className="flex flex-wrap gap-2">{progress.anchor && <a className={button} href={`#${progress.anchor}`}>前往当前步骤</a>}{relatedTask && <Link className={button} href={workspaceHref('appointments', relatedTask.connectionId, relatedTask.id, urlSearch)}>查看预约 · {labels[relatedTask.status]}</Link>}{sourceHref && <Link className={primary} href={sourceHref}>返回来源{sourceTask?.business === 'fba' ? '入库计划' : ' PO'} · {sourceTask?.sourceRef}</Link>}<button className={button} onClick={() => setSelectedId(null)}>{progress.done ? '完成并返回列表' : '返回当前列表'}</button></div></section>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>{!canWrite && <p className="mb-3 text-[12px] text-[var(--muted)]">当前角色权限不足、连接授权已失效或存储不可用，仅可查看已有业务。</p>}<fieldset disabled={!canWrite} className="min-w-0">{kind === 'wholesale' ? <VendorOrderDetail key={selected.id} po={selected as PO} connection={connection(selected.connectionId)!} tasks={state.tasks} onSave={updatePO} onAppointment={(po, batch) => { const sourceId = `${po.id}:${batch.id}`; const existing = state.tasks.find(task => task.sourceId === sourceId && task.status !== 'cancelled'); const task = existing ?? { ...taskFor(po, 'wholesale'), sourceId, sourceRef: `${po.reference} / ${batch.id}`, site: batch.destination }; const latest = state.pos.find(item => item.id === po.id); if (!latest || JSON.stringify(latest) !== JSON.stringify(po)) return; const updated = { ...latest, batches: latest.batches?.map(item => item.id === batch.id ? batch : item) }; if (vendorMutationErrors(latest, updated).length) return; const next = { ...state, pos: state.pos.map(item => item.id === po.id ? updated : item), tasks: existing ? state.tasks : [...state.tasks, task] }; try { localStorage.setItem(storageKey, JSON.stringify(next)); setState(next); } catch { setNotice('预约任务保存失败，请重试。'); return; } window.location.href = workspaceHref('appointments', po.connectionId, task.id); }} /> : kind === 'df' ? <DFDetail config={connection(selected.connectionId)?.businesses.df} key={selected.id + selected.status} order={selected as DF} onSave={updateDF} /> : kind === 'fba' ? <FBADetail canCreate={connection(selected.connectionId)?.businesses.fba?.status === 'enabled'} key={`${selected.id}:${selected.status}:${(selected as FBA).received}:${(selected as FBA).available}`} plan={selected as FBA} search={urlSearch} task={relatedTask} onSave={updateFBA} makeTask={f => taskFor(f, 'fba')} /> : <TaskDetail key={selected.id + selected.status} task={selected as Task} onSave={updateTask} />}</fieldset></div>
        <History entries={selected.history} />
      </div>
    </> : <>
      {requestedKind === 'wholesale' && <nav aria-label="Vendor 订单类型" className="mb-4 flex gap-6 border-b border-[var(--border)]">{[{id:'all',name:'全部'},{id:'wholesale',name:'批发供货'},{id:'df',name:'DF 直发'}].map(item => <button key={item.id} className={`border-b-2 pb-3 text-sm ${vendorType === item.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)]'}`} onClick={() => navigate({type:item.id === 'all' ? null : item.id,status:null})}>{item.name}</button>)}</nav>}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div className="flex flex-wrap items-end gap-2">
        <label className="relative block"><span className="sr-only">搜索单号、SKU、连接或来源单号</span><Search className="absolute left-2.5 top-2 size-4 text-[var(--muted)]" /><input className={`${input} w-72 pl-8 pr-8`} placeholder="搜索单号、SKU、连接或来源" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="清除搜索" className="absolute right-2 top-2" onClick={() => setQuery('')}><X className="size-4" /></button>}</label>
        <Field label="状态"><select className={input} value={status} onChange={e => setStatus(e.target.value)}><option value="all">全部状态</option>{statuses.map(s => <option key={s} value={s}>{labels[s]}</option>)}</select></Field>
        <Field label="连接"><select className={input} value={connectionId} onChange={e => setConnectionId(e.target.value)}><option value="all">全部已启用 / 暂停连接</option>{applicable.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        {(query || status !== 'all' || connectionId !== 'all') && <button className={button} onClick={() => { navigate({ q: null, status: null, connection: null, record: null }); }}>清除筛选</button>}
      </div>{kind === 'fba' && listMode !== 'shipments' && filteredCreatable.length > 0 && hasCapability(currentUserRole, 'inventory:write') && <button className={primary} onClick={() => setCreating(true)}>新建计划</button>}</div>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[12px] text-[var(--muted)]"><tr>{['单号 / 任务', '连接', '状态', kind === 'appointments' ? '来源 / 送仓站点' : '商品 / 数量', kind === 'fba' ? '接收 / 可售' : kind === 'appointments' ? '预约时间' : '履约信息', '操作'].map(h => <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{pagedRows.map(row => <tr key={row.id} className="cursor-pointer hover:bg-[var(--surface-subtle)]" onClick={() => { setSelectedId(row.id); setNotice(''); }}><td className={td}><button className="font-semibold text-[var(--primary)] hover:underline" onClick={e => { e.stopPropagation(); setSelectedId(row.id); setNotice(''); }}>{listMode === 'shipments' ? `SHP-${row.reference.replace(/^FBA-/, '')}` : row.reference}</button>{listMode === 'shipments' && <p className="mt-1 text-xs text-[var(--muted)]">计划 {row.reference}</p>}{requestedKind === 'wholesale' && <p className="mt-1 text-xs text-[var(--muted)]">{'lines' in row ? '批发供货 · Retail Procurement' : 'DF 直发 · Direct Fulfillment'}</p>}</td><td className={`${td} text-[var(--muted)]`}>{connection(row.connectionId)?.name}</td><td className={td}><Badge status={row.status} /></td><td className={td}>{'sourceRef' in row ? `${row.sourceRef} / ${row.site}` : 'lines' in row ? `${row.lines.length} SKU / ${row.lines.reduce((sum, l) => sum + l.ordered, 0)} 件` : `${row.sku} / ${row.qty} 件`}</td><td className={`${td} text-[var(--muted)]`}>{'received' in row ? `${row.received} / ${row.available}` : 'slot' in row ? row.slot.replace('T', ' ') || '待安排' : 'route' in row ? row.route || '待确认路由' : row.tracking || '消费者包裹 · 无 ASN'}</td><td className={td}><button className="text-[var(--primary)] hover:underline" onClick={e => { e.stopPropagation(); setSelectedId(row.id); }}>查看详情</button></td></tr>)}</tbody></table></div>
        {filtered.length === 0 && <div className="p-8 text-center text-[13px] text-[var(--muted)]">{kind === 'appointments' && rows.length === 0 ? '暂无预约任务。在 Vendor You-Ship 路由或 FBA 卡车送仓后生成。' : '没有符合条件的记录。请调整搜索或筛选。'}</div>}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3 text-[12px] text-[var(--muted)]"><span>共 {filtered.length} 条 · 每页 {pageSize} 条</span><div className="flex items-center gap-3"><button className={button} disabled={currentPage <= 1} onClick={() => navigate({page:String(currentPage - 1)})}>上一页</button><span>{currentPage} / {pages}</span><button className={button} disabled={currentPage >= pages} onClick={() => navigate({page:String(currentPage + 1)})}>下一页</button></div></div>
      </div>
    </>}
  </>;
}

function DFDetail({ order, onSave, config }: { config?: Connection['businesses']['df']; order: DF; onSave: (order: DF) => void }) {
  const [reason, setReason] = useState('');
  const warehouse = config?.warehouse ? getWarehouseById(config.warehouse) ?? getWarehouseByCode(config.warehouse) : undefined;
  const fixedMappingValid = Boolean(warehouse?.active && config?.reference.trim());
  const [carrier, setCarrier] = useState(order.carrier);
  const [tracking, setTracking] = useState(order.tracking);
  return <div className="space-y-4"><Section id="df-order" title="订单处理"><p className="text-[13px]">{order.sku} × {order.qty} · Alex Morgan · Seattle, WA</p><p className="text-[12px] text-[var(--muted)]">DF 固定外部节点：{config?.reference || '未配置'} → {warehouse?.name || '未配置有效仓库'}。{!fixedMappingValid && '固定仓库 / 外部节点映射缺失或无效，禁止接单与发运。'}DF 是消费者直送订单。接受后填写承运商与运单号；无 Vendor 批发 Routing / ASN 流程。</p>{order.status === 'pending' && <><button className={primary} disabled={!fixedMappingValid} onClick={() => onSave({ ...order, status: 'accepted', history: [...order.history, log('接受 DF 订单')] })}>接受订单</button><div className="space-y-2 border-t border-[var(--border)] pt-3"><Field label="拒绝原因（拒绝时必填）"><input className={input} value={reason} onChange={e => setReason(e.target.value)} placeholder="例如：库存不足" /></Field><button className={`${button} text-[var(--danger)]`} disabled={!reason.trim()} onClick={() => onSave({ ...order, status: 'rejected', reason: reason.trim(), history: [...order.history, log(`拒绝订单：${reason.trim()}`)] })}>拒绝订单</button></div></>}{order.status === 'rejected' && <p className="text-[13px]">拒绝原因：{order.reason}</p>}</Section>{['accepted', 'shipped'].includes(order.status) && <Section id="df-shipping" title="包裹发运（无 ASN）"><div className="grid gap-3 sm:grid-cols-2"><Field label="承运商"><CarrierSelect disabled={order.status === 'shipped'} value={carrier} onChange={setCarrier} /></Field><Field label="运单号"><input className={input} disabled={order.status === 'shipped'} value={tracking} onChange={e => setTracking(e.target.value)} placeholder="1Z84A9300392415806" /></Field></div>{order.status === 'accepted' && <button className={primary} disabled={config?.syncSettings?.shipmentWriteback === false || !fixedMappingValid || !carrier.trim() || !tracking.trim()} onClick={() => onSave({ ...order, status: 'shipped', carrier: carrier.trim(), tracking: tracking.trim(), history: [...order.history, log(`确认包裹发运：${carrier} / ${tracking}，${order.qty} 件，无 ASN`)] })}>确认包裹发运</button>}</Section>}</div>;
}

function CreatePlan({ connections, onCancel, onCreate }: { connections: Connection[]; onCancel: () => void; onCreate: (plan: FBA) => void }) {
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? '');
  const [sku, setSku] = useState(() => typeof window === 'undefined' ? sharedSku : new URLSearchParams(window.location.search).get('sku') || sharedSku);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [qty, setQty] = useState(240);
  return <Section title="新建 FBA 草稿"><div className="flex justify-end gap-2"><button className={button} onClick={onCancel}>取消</button><button className={primary} disabled={!getWarehouseById(sourceWarehouseId)?.active || !connectionId || !sku.trim() || !validQty(qty) || qty < 1} onClick={() => { const id = uid('fba'); onCreate({ id, reference: `FBA-${id.slice(4).toUpperCase()}`, connectionId, sourceWarehouseId, status: 'draft', sku: sku.trim(), qty, received: 0, available: 0, delivery: 'parcel', carrier: '', tracking: '', history: [log('保存入库草稿')] }); }}>保存草稿</button></div><div className="grid gap-3 sm:grid-cols-3"><Field label="已启用 FBA 的 Seller 连接"><select className={input} value={connectionId} onChange={e => setConnectionId(e.target.value)}>{connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="本计划发货仓库 / 发货地址"><WarehouseSelect value={sourceWarehouseId} onChange={setSourceWarehouseId} sku={sku} /></Field><Field label="SKU"><input className={input} value={sku} onChange={e => setSku(e.target.value)} /></Field><Field label="计划数量"><input className={input} type="number" min={1} step={1} value={Number.isNaN(qty) ? '' : qty} onChange={e => setQty(e.target.valueAsNumber)} /></Field></div><p className="text-[12px] text-[var(--muted)]">保存后可继续确认计划、选择承运商并安排送仓。</p></Section>;
}

function FBADetail({ plan, task, onSave, makeTask, canCreate, search }: { search: string; canCreate: boolean; plan: FBA; task?: Task; onSave: (plan: FBA, task?: Task) => void; makeTask: (plan: FBA) => Task }) {
  const [delivery, setDelivery] = useState(plan.delivery);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(plan.sourceWarehouseId ?? '');
  const sourceWarehouse = getWarehouseById(sourceWarehouseId);
  const [carrier, setCarrier] = useState(plan.carrier);
  const [tracking, setTracking] = useState(plan.tracking);
  const [received, setReceived] = useState(plan.received || plan.qty);
  const [available, setAvailable] = useState(plan.available || plan.received);
  return <div className="space-y-4"><Section id="fba-plan" title="1. 入库计划"><p className="text-[13px]">{plan.sku} × {plan.qty} · 目的 FC：ONT8 · 发货仓：{warehouseName(plan.sourceWarehouseId)}</p><p className="text-[12px] text-[var(--muted)]">确认计划后安排送仓；卡车送仓需关联预约任务。</p>{plan.status === 'draft' && <Field label="本计划发货仓库 / 发货地址（确认前必选）"><WarehouseSelect value={sourceWarehouseId} onChange={setSourceWarehouseId} sku={plan.sku} /></Field>}{plan.status !== 'draft' && sourceWarehouse && <p className="text-[12px] text-[var(--muted)]">发货地址：{sourceWarehouse.address} · {sourceWarehouse.city} · {sourceWarehouse.country}</p>}{plan.status === 'draft' ? <button disabled={!canCreate || !sourceWarehouse?.active} title={!canCreate ? '业务暂停，禁止创建新计划' : undefined} className={primary} onClick={() => onSave({ ...plan, sourceWarehouseId, status: 'ready', history: [...plan.history, log(`创建入库计划成功：${plan.reference}；发货仓 ${sourceWarehouse?.name}；地址 ${sourceWarehouse?.address}`)] })}>创建 Amazon 入库计划</button> : <p className="text-[13px]">计划回执：{plan.reference}</p>}</Section>
    {plan.status !== 'draft' && <Section id="fba-delivery" title="2. 送仓安排"><div className="grid gap-3 sm:grid-cols-2"><Field label="送仓方式"><select className={input} disabled={plan.status !== 'ready'} value={delivery} onChange={e => setDelivery(e.target.value as FBA['delivery'])}><option value="parcel">小包快递（SPD）</option><option value="ltl">卡车送仓（LTL / FTL，需预约）</option></select></Field><Field label="承运商"><CarrierSelect disabled={plan.status !== 'ready'} value={carrier} onChange={setCarrier} /></Field><Field label={delivery === 'parcel' ? '运单号' : 'BOL / PRO 运输参考号'}><input className={input} disabled={plan.status !== 'ready'} value={tracking} onChange={e => setTracking(e.target.value)} /></Field></div>{plan.status === 'ready' && <button className={primary} disabled={!carrier.trim() || !tracking.trim()} onClick={() => { const next: FBA = { ...plan, status: 'in_transit', delivery, carrier: carrier.trim(), tracking: tracking.trim(), history: [...plan.history, log(`安排${delivery === 'ltl' ? '卡车送仓并创建预约任务' : '快递送仓'}：${carrier} / ${tracking}`)] }; onSave(next, delivery === 'ltl' ? makeTask(next) : undefined); }}>安排送仓</button>}{task && <p className="text-[12px]">预约任务：<Badge status={task.status} /> <Link className="text-[var(--primary)] hover:underline" href={workspaceHref('appointments', task.connectionId, task.id, search)}>查看此预约任务</Link></p>}</Section>}
    {['in_transit', 'received', 'available'].includes(plan.status) && <Section id="fba-receiving" title="3. 接收与可售（独立状态）"><p className="text-[13px]">计划 {plan.qty} 件 · 仓库已接收 {plan.received} 件 · 已可售 {plan.available} 件</p><p className="text-[12px] text-[var(--muted)]">已接收不等于已可售。数量校验：0 ≤ 可售 ≤ 接收 ≤ 计划。支持分批接收与分批更新可售。</p>{plan.status !== 'available' && <><Field label="累计接收数量"><input className={input} type="number" min={plan.received} max={plan.qty} step={1} value={Number.isNaN(received) ? '' : received} onChange={e => setReceived(e.target.valueAsNumber)} /></Field><button className={button} disabled={!validQty(received) || received <= plan.received || received > plan.qty || (plan.delivery === 'ltl' && (!task || !['booked', 'completed'].includes(task.status)))} onClick={() => onSave({ ...plan, received, status: 'received', history: [...plan.history, log(`仓库累计接收 ${received} 件；可售仍为 ${plan.available} 件`)] })}>仓库接收</button>{plan.delivery === 'ltl' && (!task || !['booked', 'completed'].includes(task.status)) && <p className="text-[12px] text-[var(--muted)]">卡车送仓须先确认预约，才能仓库接收。</p>}{plan.received > 0 && <div className="space-y-2 border-t border-[var(--border)] pt-3"><Field label="累计可售数量"><input className={input} type="number" min={plan.available} max={plan.received} step={1} value={Number.isNaN(available) ? '' : available} onChange={e => setAvailable(e.target.valueAsNumber)} /></Field><button className={primary} disabled={!validQty(available) || available <= plan.available || available > plan.received} onClick={() => onSave({ ...plan, available, status: available === plan.qty ? 'available' : 'received', history: [...plan.history, log(`独立确认累计可售 ${available} 件；已接收 ${plan.received} 件`)] })}>更新可售</button></div>}</>}</Section>}
  </div>;
}

function TaskDetail({ task, onSave }: { task: Task; onSave: (task: Task) => void }) {
  const [slot, setSlot] = useState(task.slot);
  const [confirmation, setConfirmation] = useState(task.confirmation);
  const [note, setNote] = useState(task.note);
  const active = !['completed', 'cancelled'].includes(task.status);
  const canBook = slot && confirmation.trim() && Number.isFinite(new Date(slot).getTime());
  return <Section id="appointment-processing" title="预约处理"><dl className="grid grid-cols-2 gap-3 text-[13px]"><div><dt className="text-[12px] text-[var(--muted)]">来源</dt><dd>{task.business === 'fba' ? 'FBA 卡车送仓' : 'Vendor You-Ship 承运商送仓'} · {task.sourceRef}</dd></div><div><dt className="text-[12px] text-[var(--muted)]">送仓站点</dt><dd>{task.site}</dd></div></dl><p className="text-[12px] text-[var(--muted)]">按待处理 → 已申请 → 已预约 → 已完成推进；取消时记录原因，可重新申请。时间使用当前浏览器时区。</p><div className="grid gap-3 sm:grid-cols-2"><Field label="预约时间（当前时区）"><input className={input} type="datetime-local" disabled={!active || task.status === 'booked'} value={slot} onChange={e => setSlot(e.target.value)} /></Field><Field label="预约确认号（确认预约时必填）"><input className={input} disabled={!active || task.status === 'booked'} value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="ISA-86241035" /></Field></div><Field label="处理备注（取消时必填）"><input className={input} disabled={!active} value={note} onChange={e => setNote(e.target.value)} placeholder="记录时段、异常或取消原因" /></Field><div className="flex flex-wrap gap-2">{task.status === 'pending' && <button className={primary} disabled={!slot} onClick={() => onSave({ ...task, status: 'requested', slot, note: note.trim(), history: [...task.history, log(`申请预约 ${slot.replace('T', ' ')}；${note}`)] })}>申请预约</button>}{task.status === 'requested' && <button className={primary} disabled={!canBook} onClick={() => onSave({ ...task, status: 'booked', slot, confirmation: confirmation.trim(), note: note.trim(), history: [...task.history, log(`确认预约 ${confirmation} / ${slot.replace('T', ' ')}`)] })}>确认预约</button>}{task.status === 'booked' && <button className={primary} onClick={() => onSave({ ...task, status: 'completed', note: note.trim(), history: [...task.history, log(`预约已履约；${note}`)] })}>完成任务</button>}{active && <button className={`${button} ml-2 text-[var(--danger)]`} disabled={!note.trim()} onClick={() => onSave({ ...task, status: 'cancelled', note: note.trim(), history: [...task.history, log(`取消预约：${note.trim()}`)] })}>取消任务</button>}{task.status === 'cancelled' && <button className={button} onClick={() => onSave({ ...task, status: 'pending', slot: '', confirmation: '', note: '', history: [...task.history, log('重新打开任务，清空旧时段与确认号')] })}>重新打开任务</button>}</div>{task.status === 'cancelled' && <p className="text-[13px]">取消原因：{task.note}</p>}</Section>;
}
