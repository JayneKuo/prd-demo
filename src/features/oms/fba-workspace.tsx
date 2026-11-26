'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useOms } from './provider';
import { transactOms } from './repository';
import { executeFba, fbaFees, canReceiveFbaShipment, type FbaCommand, type FbaContainer, type FbaSnapshot, type FbaTransport, type InboundPlan, type InboundShipment } from './fba';
import { connectionStorageKey, parseConnections, validateBusinessConfig, type Connection, type ProductMapping } from '@/lib/amazon-connections';
import { readChannelSkuMappings } from '@/lib/channel-sku-mappings';
import { currentSession } from '@/lib/session-context';
import { hasCapability } from '@/lib/permissions';
import { warehouses } from '@/lib/mock-data/warehouses';
import { merchants } from '@/lib/tenant-context';
import { mockProducts } from '@/lib/mock-data/products';
import { buttonClass, primaryClass } from '@/components/amazon/amazon-ui';

export const fbaInput = 'rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm';
const panel = 'space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4';
const planLabels = { draft: '草稿', packed: '已装箱', placement_selected: '已获取平台方案', approved: '已确认方案', confirmed: '已生成执行单', cancelling: '取消中', cancelled: '已取消', closed: '已完成' };
const inboundPlanLabels = { draft: '草稿', packed: '已装箱', placement_selected: '已获取平台方案', approved: '已确认方案', confirmed: '已生成执行单', cancelling: '取消中', cancelled: '已取消', closed: '已完成' };
const sourceTypeLabel = (p: InboundPlan) => p.sourceType === 'supplier'
  ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">供应商直发</span>
  : <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">自有仓调拨</span>;
const shipmentLabels = { working: '待发货', shipped: '已发货', receiving: '收货中', cancelled: '已取消', closed: '已关闭' };
const warehouseName = (id: string) => warehouses.find(w => w.id === id)?.name ?? '来源仓库';
const merchantName = (id: string) => merchants.find(m => m.id === id)?.name ?? '当前商家';
const sellerName = (domain: FbaDomain, merchantId: string, id: string) => domain.configs[merchantId]?.find(c => c.id === id)?.name ?? 'Seller 账户';
const variants = mockProducts.flatMap(p => p.variants.map(v => ({ ...v, title: p.title })));
export function fbaConnectionIssue(connection: Connection | undefined, site?: string) {
  if (!connection || connection.identity !== 'seller' || !connection.authorized || connection.businesses.fba?.status !== 'enabled') return '需要已授权并启用 FBA 的 Seller 连接';
  if (site && connection.businesses.fba.site !== site) return '站点与当前连接配置不一致';
  return validateBusinessConfig(connection.businesses.fba, connection, 'fba').join('；');
}
/** Config is read-only here. All business writes use the canonical repository transaction. */
export function useFbaDomain() {
  const oms = useOms();
  const [configs, setConfigs] = useState<Record<string, Connection[]>>({});
  const [configError, setConfigError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const keys = oms.snapshots.map(s => `${s.companyId}:${s.merchantId}`).join('|');
  useEffect(() => {
    const load = () => { try {
      const next: Record<string, Connection[]> = {};
      for (const key of keys.split('|').filter(Boolean)) { const [company, merchant] = key.split(':'); next[merchant] = parseConnections(localStorage.getItem(connectionStorageKey(company, merchant))); }
      setConfigs(next); setConfigError('');
    } catch { setConfigError('连接配置无法读取，原始数据未修改。'); } };
    load(); window.addEventListener('storage', load); window.addEventListener('amazon-connections-changed', load);
    return () => { window.removeEventListener('storage', load); window.removeEventListener('amazon-connections-changed', load); };
  }, [keys]);
  const execute = async (snapshot: FbaSnapshot, command: FbaCommand, connectionId: string) => {
    setBusy(true); setError('');
    try {
      const id = crypto.randomUUID(); const expectedRevision = snapshot.revision;
      await transactOms(snapshot, state => {
        const connection = parseConnections(localStorage.getItem(connectionStorageKey(state.companyId, state.merchantId))).find(c => c.id === connectionId);
        return executeFba(state, command, { id, now: Date.now(), expectedRevision, actor: currentSession.role, canWrite: hasCapability(currentSession.role, 'inventory:write') && hasCapability(currentSession.role, 'orders:write'), connection });
      });
      await oms.reload(); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败，未提交变更'); return false; }
    finally { setBusy(false); }
  };
  return { snapshots: oms.snapshots as FbaSnapshot[], ready: oms.ready, configs, error: error || configError || oms.error, busy, execute, writable: hasCapability(currentSession.role, 'orders:write') && hasCapability(currentSession.role, 'inventory:write') };
}
export type FbaDomain = ReturnType<typeof useFbaDomain>;
export function FbaWorkspace({ mode, detailId: encodedId }: { mode: 'plans' | 'inbound-plans' | 'shipments'; detailId?: string }) {
  let detailId = encodedId;
  try { if (detailId) detailId = decodeURIComponent(detailId); } catch { /* Show unavailable record rather than guessing an ID. */ }
  const domain = useFbaDomain();
  const [creating, setCreating] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('create') === '1') setCreating(true); }, []);
  if (!hasCapability(currentSession.role, 'inventory:read')) return <p role="alert" className="p-6">当前角色没有 FBA 库存读取权限。</p>;
  if (!domain.ready) return <p role="status" className="p-6">正在加载补货数据…</p>;
  const planRows = domain.snapshots.flatMap(s => (s.inboundPlans ?? []).map(plan => ({ snapshot: s, plan })));
  const shipmentRows = domain.snapshots.flatMap(s => (s.inboundShipments ?? []).map(shipment => ({ snapshot: s, shipment })));
  const selectedPlan = detailId ? planRows.find(r => r.plan.id === detailId) : undefined;
  const selectedShipment = detailId ? shipmentRows.find(r => r.shipment.id === detailId) : undefined;
  const isInboundPlans = mode === 'inbound-plans';
  const visibleRows = isInboundPlans ? planRows : mode === 'plans' ? planRows : shipmentRows;
  return <main className="space-y-4 p-4 text-[var(--foreground)] lg:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">{mode === 'plans' ? '补货计划' : isInboundPlans ? '入库计划' : '平台收货回传'}</h1><nav className="flex gap-2"><Link className={buttonClass} href="/dashboard/fba/inventory">FBA 库存</Link><Link className={buttonClass} href="/dashboard/fba/delivery-plans">发货计划</Link><Link className={buttonClass} href="/dashboard/fba/inbound-plans">入库计划</Link><Link className={buttonClass} href="/dashboard/fba/plans">货件（STA）</Link><Link className={buttonClass} href="/dashboard/fba/delivery-orders">发货单/出库单</Link>{mode === 'plans' && !detailId && domain.writable && <><button className={primaryClass} onClick={() => { setCreating(!creating); setCreatingSupplier(false); }}>自有仓补货</button><button className={primaryClass} onClick={() => { setCreatingSupplier(!creatingSupplier); setCreating(false); }}>供应商直发补货</button></>}</nav></header>
    <p className="text-sm text-[var(--muted)]">入库计划管理目标仓入仓安排；平台分仓确认后生成正式入库单和来源出库单，再进入装箱、发运与收货对账。</p>
    {domain.error && <p role="alert" className="text-sm text-[var(--danger)]">{domain.error}</p>}
    {!domain.writable && <p className="text-sm text-[var(--muted)]">只读模式：当前角色不能变更库存或补货执行。</p>}
    {detailId ? (mode === 'plans' || isInboundPlans) ? selectedPlan ? <PlanDetail key={selectedPlan.plan.id} {...selectedPlan} domain={domain} /> : <p>当前商家范围内未找到入库计划。</p> : selectedShipment ? <ShipmentDetail key={selectedShipment.shipment.id} {...selectedShipment} domain={domain} /> : <p>当前商家范围内未找到入库回传。</p> : <>
      {creating && mode === 'plans' && <CreatePlan domain={domain} onCreated={() => setCreating(false)} />}
      {creatingSupplier && mode === 'plans' && <CreateSupplierPlan domain={domain} onCreated={() => setCreatingSupplier(false)} />}
      <section className={panel}><h2 className="font-medium">{mode === 'plans' ? '补货计划列表' : isInboundPlans ? '入库计划列表' : '入库回传列表'}</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{(mode === 'plans' || isInboundPlans ? ['入库计划号', '商家 / Seller / 站点', '来源', '商品数量', '状态', '来源出库'] : ['平台回传 / 入库计划', '目标仓', '来源出库单', '计划 / 收货 / 损坏 / 短收', '状态']).map(t => <th key={t} className="px-3 py-2 font-medium">{t}</th>)}</tr></thead><tbody>
        {(mode === 'plans' || isInboundPlans) ? planRows.map(({ snapshot, plan }) => <tr key={plan.id} className="border-t border-[var(--border)]"><td className="px-3 py-3"><Link className="text-[var(--primary)]" href={`/dashboard/fba/inbound-plans/${encodeURIComponent(plan.id)}`}>{plan.number}</Link></td><td className="px-3">{merchantName(snapshot.merchantId)} / {sellerName(domain, snapshot.merchantId, plan.connectionId)} / {plan.site}</td><td className="px-3 flex items-center gap-2">{plan.sourceType === 'supplier' ? <>{plan.supplierName ?? '—'}{sourceTypeLabel(plan)}</> : <>{warehouseName(plan.warehouseId)}{sourceTypeLabel(plan)}</>}</td><td className="px-3">{plan.lines.reduce((n, l) => n + l.quantity, 0)}</td><td className="px-3">{inboundPlanLabels[plan.status]}</td><td className="px-3">{plan.shipmentIds.length ? `${plan.shipmentIds.length} 个平台分仓结果` : '待平台返回'}</td></tr>) : shipmentRows.map(({ snapshot, shipment }) => <tr key={shipment.id} className="border-t border-[var(--border)]"><td className="px-3 py-3"><Link className="text-[var(--primary)]" href={`/dashboard/fba/shipments/${encodeURIComponent(shipment.id)}`}>{snapshot.inboundPlans?.find(p => p.id === shipment.planId)?.number} · 平台入仓结果</Link><br /><Link className="text-xs text-[var(--primary)]" href={`/dashboard/fba/inbound-plans/${encodeURIComponent(shipment.planId)}`}>来源入库计划</Link></td><td>{shipment.destination}</td><td>{shipment.outboundId !== 'supplier-direct' ? <Link className="text-[var(--primary)]" href={`/dashboard/outbound/${encodeURIComponent(shipment.outboundId)}`}>{snapshot.outbounds.find(o => o.id === shipment.outboundId)?.number ?? '查看出库单'}</Link> : '供应商发货'}</td><td>{shipment.lines.reduce((n, l) => n + l.quantity, 0)} / {shipment.receipts.reduce((n, l) => n + l.quantity, 0)} / {shipment.receipts.reduce((n, l) => n + l.damaged, 0)} / {shipment.receipts.reduce((n, l) => n + l.shortClosed, 0)}</td><td>{shipmentLabels[shipment.status]}</td></tr>)}
      </tbody></table></div>{visibleRows.length === 0 && <p className="py-8 text-center text-sm text-[var(--muted)]">当前范围没有记录。请先创建入库计划。</p>}</section>
    </>}
  </main>;
}
function CreateSupplierPlan({ domain, onCreated }: { domain: FbaDomain; onCreated: () => void }) {
  const [merchantId, setMerchant] = useState(domain.snapshots.length === 1 ? domain.snapshots[0].merchantId : '');
  const [connectionId, setConnection] = useState(''); const [supplierName, setSupplierName] = useState(''); const [purchaseOrderRef, setPurchaseOrderRef] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({}); const [mappings, setMappings] = useState<ProductMapping[]>([]); const [mappingError, setMappingError] = useState('');
  const snapshot = domain.snapshots.find(s => s.merchantId === merchantId);
  const connections = domain.configs[merchantId] ?? []; const connection = connections.find(c => c.id === connectionId);
  const site = connection?.businesses.fba?.site ?? '';
  useEffect(() => {
    try { setMappings(snapshot && connection ? readChannelSkuMappings(snapshot.companyId, snapshot.merchantId, connection, site) : []); setMappingError(''); }
    catch { setMappings([]); setMappingError('商品映射无法读取，请检查商品映射。'); }
  }, [snapshot?.companyId, snapshot?.merchantId, connection, site]);
  const issue = fbaConnectionIssue(connection);
  // 供应商直发不需要自有仓库存，只需要商品映射
  const allVariants = mockProducts.flatMap(p => p.variants.map(v => ({ ...v, title: p.title })));
  const mappedVariants = allVariants.filter(v => mappings.find(m => m.omsVariantId === v.id));
  const chosen = mappedVariants.filter(v => (quantities[v.sku] ?? 0) > 0);
  const submit = async () => {
    if (!snapshot || !connection) return;
    const lines = chosen.map(v => { const mapping = mappings.find(m => m.omsVariantId === v.id)!; return { id: `line:${v.sku}`, sku: v.sku, omsVariantId: v.id, sellerSku: mapping.externalSku, quantity: quantities[v.sku] }; });
    if (await domain.execute(snapshot, { type: 'fba_create_supplier_plan', connectionId, site, supplierName, purchaseOrderRef, lines }, connectionId)) onCreated();
  };
  return <section className={panel}><h2 className="font-medium">供应商直发 FBA 补货计划</h2><p className="text-xs text-[var(--muted)]">供应商直接将货物发往 Amazon FC，OMS 生成发货指令替代仓库出库单，无需自有仓库存。</p>
    <div className="flex flex-wrap gap-2">
      <select aria-label="补货商家" className={fbaInput} value={merchantId} onChange={e => { setMerchant(e.target.value); setConnection(''); setQuantities({}); }}><option value="">选择具体商家</option>{domain.snapshots.map(s => <option key={s.merchantId} value={s.merchantId}>{merchantName(s.merchantId)}</option>)}</select>
      <select aria-label="补货 Seller 连接" className={fbaInput} value={connectionId} onChange={e => setConnection(e.target.value)}><option value="">选择 Seller / 站点</option>{connections.filter(c => c.identity === 'seller').map(c => <option key={c.id} value={c.id}>{c.name} / {c.businesses.fba?.site || '未设置'}</option>)}</select>
      <input aria-label="供应商名称" className={fbaInput} placeholder="供应商名称（必填）" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
      <input aria-label="关联采购单号" className={fbaInput} placeholder="关联采购单号（选填）" value={purchaseOrderRef} onChange={e => setPurchaseOrderRef(e.target.value)} />
    </div>
    {(issue || mappingError) && <p role="alert" className="text-sm text-[var(--muted)]">{issue || mappingError}</p>}
    <table className="w-full text-left text-sm"><thead><tr><th>OMS SKU</th><th>Seller SKU</th><th>补货数量</th></tr></thead><tbody>{mappedVariants.map(v => { const mapping = mappings.find(m => m.omsVariantId === v.id)!; return <tr key={v.id}><td className="py-2">{v.sku}</td><td>{mapping.externalSku}</td><td><input aria-label={`${v.sku} 补货数量`} className={`${fbaInput} w-24`} type="number" min="0" value={quantities[v.sku] ?? 0} onChange={e => setQuantities({ ...quantities, [v.sku]: Number(e.target.value) })} /></td></tr>; })}</tbody></table>
    <button className={primaryClass} disabled={domain.busy || !domain.writable || !!issue || !!mappingError || !chosen.length || !supplierName.trim()} onClick={submit}>保存草稿</button>
    <p className="text-xs text-[var(--muted)]">供应商直发计划不预占自有仓库存；确认方案后生成发货指令发送给供应商。</p>
  </section>;
}
function CreatePlan({ domain, onCreated }: { domain: FbaDomain; onCreated: () => void }) {
  const [merchantId, setMerchant] = useState(domain.snapshots.length === 1 ? domain.snapshots[0].merchantId : '');
  const [connectionId, setConnection] = useState(''); const [warehouseId, setWarehouse] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({}); const [mappings, setMappings] = useState<ProductMapping[]>([]); const [mappingError, setMappingError] = useState('');
  const snapshot = domain.snapshots.find(s => s.merchantId === merchantId);
  const connections = domain.configs[merchantId] ?? []; const connection = connections.find(c => c.id === connectionId);
  const site = connection?.businesses.fba?.site ?? '';
  useEffect(() => {
    try { setMappings(snapshot && connection ? readChannelSkuMappings(snapshot.companyId, snapshot.merchantId, connection, site) : []); setMappingError(''); }
    catch { setMappings([]); setMappingError('商品映射无法读取，请检查商品映射。'); }
  }, [snapshot?.companyId, snapshot?.merchantId, connection, site]);
  const stocks = snapshot?.stocks.filter(s => s.pool === 'warehouse' && s.warehouseId === warehouseId) ?? [];
  const chosen = stocks.filter(s => (quantities[s.sku] ?? 0) > 0);
  const issue = fbaConnectionIssue(connection);
  const submit = async () => {
    if (!snapshot || !connection) return;
    const lines = chosen.map(stock => { const variant = variants.find(v => v.sku === stock.sku); const mapping = mappings.find(m => m.omsVariantId === variant?.id); return { id: `line:${stock.sku}`, sku: stock.sku, omsVariantId: variant?.id ?? '', sellerSku: mapping?.externalSku ?? '', quantity: quantities[stock.sku] }; });
    if (await domain.execute(snapshot, { type: 'fba_create_plan', warehouseId, connectionId, site, lines }, connectionId)) onCreated();
  };
  return <section className={panel}><h2 className="font-medium">创建多商品补货计划</h2><div className="flex flex-wrap gap-2"><select aria-label="补货商家" className={fbaInput} value={merchantId} onChange={e => { setMerchant(e.target.value); setConnection(''); setWarehouse(''); setQuantities({}); }}><option value="">选择具体商家</option>{domain.snapshots.map(s => <option key={s.merchantId} value={s.merchantId}>{merchantName(s.merchantId)}</option>)}</select><select aria-label="补货 Seller 连接" className={fbaInput} value={connectionId} onChange={e => setConnection(e.target.value)}><option value="">选择 Seller / 站点</option>{connections.filter(c => c.identity === 'seller').map(c => <option key={c.id} value={c.id}>{c.name} / {c.businesses.fba?.site || '未设置'}</option>)}</select><select aria-label="来源仓库" className={fbaInput} value={warehouseId} onChange={e => { setWarehouse(e.target.value); setQuantities({}); }}><option value="">选择来源仓库</option>{Array.from(new Set(snapshot?.stocks.filter(s => s.pool === 'warehouse').map(s => s.warehouseId))).map(id => <option key={id} value={id}>{warehouseName(id)}</option>)}</select></div>
    {(issue || mappingError) && <p role="alert" className="text-sm text-[var(--muted)]">{issue || mappingError} <Link className="text-[var(--primary)]" href="/dashboard/apps/amazon">连接配置</Link> / <Link className="text-[var(--primary)]" href="/dashboard/product-mapping">商品映射</Link></p>}
    <table className="w-full text-left text-sm"><thead><tr><th>OMS SKU</th><th>Seller SKU</th><th>来源可用</th><th>补货数量</th></tr></thead><tbody>{stocks.map(stock => { const variant = variants.find(v => v.sku === stock.sku); const mapping = mappings.find(m => m.omsVariantId === variant?.id); return <tr key={stock.id}><td className="py-2">{stock.sku}</td><td>{mapping?.externalSku || '待匹配'}</td><td>{stock.onHand - stock.reserved - stock.unfulfillable}</td><td><input aria-label={`${stock.sku} 补货数量`} className={`${fbaInput} w-24`} type="number" min="0" value={quantities[stock.sku] ?? 0} disabled={!mapping} onChange={e => setQuantities({ ...quantities, [stock.sku]: Number(e.target.value) })} /></td></tr>; })}</tbody></table>
    <button className={primaryClass} disabled={domain.busy || !domain.writable || !!issue || !!mappingError || !chosen.length || !warehouseId} onClick={submit}>保存草稿</button><p className="text-xs text-[var(--muted)]">草稿不占用库存；确认补货方案后预占来源仓库库存。</p>
  </section>;
}
function PlanDetail({ snapshot, plan, domain }: { snapshot: FbaSnapshot; plan: InboundPlan; domain: FbaDomain }) {
  const [boxes, setBoxes] = useState<FbaContainer[]>(plan.containers.length ? structuredClone(plan.containers) : [{ id: 'BOX-1', weightKg: 1, contents: plan.lines.map(l => ({ lineId: l.id, quantity: l.quantity })) }]);
  const [transport, setTransport] = useState<FbaTransport>('SPD'); const [agreed, setAgreed] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const hasShipped = plan.shipmentIds.some(id => snapshot.fulfillments.some(t => t.id === snapshot.inboundShipments?.find(s => s.id === id)?.fulfillmentId && ['shipped', 'delivered'].includes(t.status)));
  const locked = ['approved', 'confirmed', 'cancelling', 'cancelled', 'closed'].includes(plan.status); const issue = fbaConnectionIssue(domain.configs[snapshot.merchantId]?.find(c => c.id === plan.connectionId), plan.site);
  const disabled = domain.busy || !domain.writable || !!issue;
  const send = (command: FbaCommand) => domain.execute(snapshot, command, plan.connectionId);
  const fee = plan.placementId ? fbaFees(plan, transport) : 0;
  // 来源发货计划（如存在）
  const linkedDeliveryPlan = (snapshot as FbaSnapshot).deliveryPlans?.find(dp => dp.inboundPlanId === plan.id);
  const dpStatusLabel: Record<string, string> = { draft: '草稿', pending: '待审批', done: '已完成', cancelled: '已取消' };
  const dpStatusCls: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 ring-amber-200', done: 'bg-emerald-50 text-emerald-700 ring-emerald-200', draft: 'bg-gray-50 text-gray-600 ring-gray-200', cancelled: 'bg-red-50 text-red-700 ring-red-200' };
  return <div className="space-y-4"><section className={panel}><h2 className="flex flex-wrap items-center gap-2 font-semibold">{plan.number} · {planLabels[plan.status]} {sourceTypeLabel(plan)}</h2><p className="text-sm">{sellerName(domain, snapshot.merchantId, plan.connectionId)} / {plan.site}{plan.sourceType === 'supplier' ? <> · 供应商 <strong>{plan.supplierName}</strong>{plan.purchaseOrderRef ? ` · 采购单 ${plan.purchaseOrderRef}` : ''}</> : <> · 来源 {warehouseName(plan.warehouseId)}</>}</p>{issue && <p role="alert">{issue}</p>}<table className="w-full text-left text-sm"><thead><tr><th>OMS SKU</th><th>Seller SKU（MSKU）</th><th>FNSKU</th><th>计划数量</th></tr></thead><tbody>{plan.lines.map(l => <tr key={l.id}><td className="py-2">{l.sku}</td><td>{l.sellerSku}</td><td className="font-mono text-xs">{l.fnsku ? <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 ring-1 ring-inset ring-[var(--border-subtle)]">{l.fnsku}</span> : <span className="text-[var(--muted)]">—</span>}</td><td>{l.quantity}</td></tr>)}</tbody></table></section>
    {!locked && <><section className={panel}><h2 className="font-medium">装箱明细</h2><p className="text-xs text-[var(--muted)]">每行在所有箱内的合计必须严格等于计划数量。0 表示该箱不装此商品。</p>{boxes.map((box, index) => <fieldset key={index} className="space-y-2 rounded border border-[var(--border)] p-3" disabled={disabled}><legend className="px-1 text-sm">箱 {index + 1}</legend><label className="mr-3 text-sm">箱号 <input aria-label={`箱 ${index + 1} 箱号`} className={fbaInput} value={box.id} onChange={e => setBoxes(boxes.map((b, i) => i === index ? { ...b, id: e.target.value } : b))} /></label><label className="text-sm">重量 kg <input aria-label={`箱 ${index + 1} 重量`} className={`${fbaInput} w-24`} type="number" min="0.01" step="0.01" value={box.weightKg} onChange={e => setBoxes(boxes.map((b, i) => i === index ? { ...b, weightKg: Number(e.target.value) } : b))} /></label><div className="flex flex-wrap gap-3">{plan.lines.map(l => <label key={l.id} className="text-sm">{l.sku} <input aria-label={`箱 ${index + 1} ${l.sku} 数量`} className={`${fbaInput} w-20`} type="number" min="0" value={box.contents.find(c => c.lineId === l.id)?.quantity ?? 0} onChange={e => setBoxes(boxes.map((b, i) => i === index ? { ...b, contents: [...b.contents.filter(c => c.lineId !== l.id), { lineId: l.id, quantity: Number(e.target.value) }] } : b))} /></label>)}</div><button className={buttonClass} disabled={boxes.length === 1} onClick={() => setBoxes(boxes.filter((_, i) => i !== index))}>删除此箱</button></fieldset>)}<div className="flex gap-2"><button className={buttonClass} disabled={disabled} onClick={() => setBoxes([...boxes, { id: `BOX-${boxes.length + 1}`, weightKg: 1, contents: [] }])}>添加包装箱</button><button className={primaryClass} disabled={disabled} onClick={() => send({ type: 'fba_pack', planId: plan.id, containers: boxes.map(b => ({ ...b, contents: b.contents.filter(l => l.quantity !== 0) })) })}>保存装箱</button></div></section>
    <section className={panel}><h2 className="font-medium">平台方案与执行准备</h2><button className={buttonClass} disabled={disabled || !plan.containers.length} onClick={() => { setAgreed(false); void send({ type: 'fba_generate_placements', planId: plan.id }); }}>生成分仓方案</button>{plan.placements.map(p => <label key={p.id} className="block rounded border border-[var(--border)] p-3 text-sm"><input type="radio" name="placement" disabled={disabled} checked={plan.placementId === p.id} onChange={() => { setAgreed(false); void send({ type: 'fba_select_placement', planId: plan.id, placementId: p.id }); }} /> {p.destinations.length === 1 ? '单目的地' : '双目的地分仓'} · 分仓费 {(p.feeMinor / 100).toFixed(2)}<ul className="ml-5 mt-2">{p.destinations.map(d => <li key={d.code}>{d.code}: {d.lines.map(l => `${plan.lines.find(p => p.id === l.lineId)?.sku} × ${l.quantity}`).join('，')}</li>)}</ul></label>)}<label className="block text-sm">运输方式 <select className={fbaInput} value={transport} disabled={disabled} onChange={e => { setTransport(e.target.value as FbaTransport); setAgreed(false); }}>{['SPD', 'LTL', 'FTL'].map(t => <option key={t}>{t}</option>)}</select></label>{plan.placementId && <><p className="text-sm">预估费用（运输 + 分仓）：{(fee / 100).toFixed(2)} · 以最终平台报价为准</p><label className="block text-sm"><input type="checkbox" disabled={disabled} checked={agreed} onChange={e => setAgreed(e.target.checked)} /> 已确认当前方案与预估费用；确认后锁定计划并预占来源仓库库存</label><button className={primaryClass} disabled={disabled || !agreed} onClick={() => send({ type: 'fba_confirm', planId: plan.id, transport, expectedFeesMinor: fee })}>确认平台方案</button>{plan.status === 'approved' && <button className={primaryClass} disabled={disabled} onClick={() => send({ type: 'fba_create_execution', planId: plan.id, transport: plan.transport ?? transport, expectedFeesMinor: plan.feesMinor ?? fee })}>生成正式入库单和出库单</button>}</>}</section></>}
    {linkedDeliveryPlan && <section className={panel}><h2 className="font-medium">来源补货计划</h2><div className="flex flex-wrap items-center gap-3 text-sm"><Link className="text-[var(--primary)] hover:underline" href={`/dashboard/fba/delivery-plans/${encodeURIComponent(linkedDeliveryPlan.id)}`}>{linkedDeliveryPlan.number}</Link><span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${dpStatusCls[linkedDeliveryPlan.status] ?? ''}`}>{dpStatusLabel[linkedDeliveryPlan.status]}</span>{linkedDeliveryPlan.plannedShipDate && <span className="text-[var(--muted)]">预计发货 {linkedDeliveryPlan.plannedShipDate}</span>}</div></section>}
    {
    locked && plan.sourceOrderId && <section className={panel}><h2 className="font-medium">{plan.sourceType === 'supplier' ? '供应商发货执行与平台分仓' : '正式入库单与来源出库单'}</h2><p className="text-sm">{plan.transport} · 已确认费用 {((plan.feesMinor ?? 0) / 100).toFixed(2)}{plan.sourceType === 'supplier' && plan.purchaseOrderRef && <> · 采购单 <strong>{plan.purchaseOrderRef}</strong></>}</p>{plan.shipmentIds.map((id) => { const shipment = snapshot.inboundShipments?.find(s => s.id === id); const instr = shipment?.shippingInstruction; return <div key={id} className="space-y-2 rounded border border-[var(--border)] p-3 text-sm"><div className="flex flex-wrap gap-4"><Link className="text-[var(--primary)]" href={`/dashboard/fba/shipments/${encodeURIComponent(id)}`}>{shipment?.destination} · {shipment ? shipmentLabels[shipment.status] : ''}</Link>{plan.sourceType !== 'supplier' && <Link className="text-[var(--primary)]" href={`/dashboard/outbound/${encodeURIComponent(shipment?.outboundId ?? '')}`}>来源仓库出库单</Link>}</div>{plan.sourceType === 'supplier' && instr && <div className="mt-2 space-y-1 text-xs"><p><span className="font-medium">FC 收货地址：</span>{instr.fcAddress}</p><p><span className="font-medium">入仓要求：</span>{instr.requirements}</p>{instr.instructedAt ? <p><span className="font-medium">指令已发送：</span>{instr.instructedAt.slice(0,16).replace('T',' ')}</p> : <button className={buttonClass} disabled={disabled} onClick={() => send({ type: 'fba_send_instruction', shipmentId: id })}>标记已发送指令给供应商</button>}{instr.supplierTracking ? <p><span className="font-medium">供应商运单：</span>{instr.supplierCarrier} / {instr.supplierTracking}</p> : instr.instructedAt && <SupplierTrackingInput shipmentId={id} disabled={disabled} send={send} />}</div>}</div>; })}</section>}
    {!['closed', 'cancelled', 'cancelling'].includes(plan.status) && <section className={panel}><h2 className="font-medium">取消补货计划</h2>{hasShipped ? <p className="text-sm text-[var(--muted)]">已有货件发货，无法取消整个计划。请继续跟踪收货与差异。</p> : <><p className="text-sm text-[var(--muted)]">未确认计划直接取消；已确认计划将撤回全部来源出库，仓库确认撤回后释放预占库存。</p><input aria-label="计划取消原因" className={fbaInput} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="填写取消原因" disabled={disabled} /><button className={buttonClass} disabled={disabled || !cancelReason.trim()} onClick={() => send({ type: 'fba_cancel_plan', planId: plan.id, reason: cancelReason })}>取消计划</button></>}</section>}
    {plan.status === 'cancelling' && <p role="status" className="text-sm">正在等待来源仓库确认撤回，库存预占暂时保留。</p>}
    <Journal snapshot={snapshot} ids={[plan.id, plan.sourceOrderId ?? '', ...plan.shipmentIds]} />
  </div>;
}
function ShipmentDetail({ snapshot, shipment, domain }: { snapshot: FbaSnapshot; shipment: InboundShipment; domain: FbaDomain }) {
  const [received, setReceived] = useState<Record<string, number>>({}); const [damaged, setDamaged] = useState<Record<string, number>>({});
  const [reference, setReference] = useState(''); const [reason, setReason] = useState(''); const [claimLine, setClaimLine] = useState(shipment.lines[0]?.lineId ?? ''); const [claimQty, setClaimQty] = useState(1);
  const plan = snapshot.inboundPlans?.find(p => p.id === shipment.planId);
  const [windowStart, setWindowStart] = useState(shipment.deliveryWindow?.start.slice(0, 16) ?? '');
  const [windowEnd, setWindowEnd] = useState(shipment.deliveryWindow?.end.slice(0, 16) ?? '');
  const [appointmentId, setAppointmentId] = useState(shipment.appointment?.id ?? '');
  const [appointmentTime, setAppointmentTime] = useState(shipment.appointment?.time.slice(0, 16) ?? '');
  const [carrierConfirmation, setCarrierConfirmation] = useState(shipment.appointment?.carrierConfirmation ?? '');
  const task = snapshot.fulfillments.find(t => t.id === shipment.fulfillmentId);
  const packages = snapshot.packages.filter(p => p.fulfillmentId === shipment.fulfillmentId);
  const issue = fbaConnectionIssue(domain.configs[snapshot.merchantId]?.find(c => c.id === shipment.connectionId), shipment.site);
  const disabled = domain.busy || !domain.writable || !!issue;
  if (!plan) return <p role="alert">找不到此货件关联的入库计划。</p>
  const canReceive = !disabled && canReceiveFbaShipment(snapshot, shipment.id);
  const send = (command: FbaCommand) => domain.execute(snapshot, command, shipment.connectionId);
  return <div className="space-y-4"><section className={panel}><h2 className="font-semibold">{shipment.destination} · {shipmentLabels[shipment.status]}</h2><p className="text-sm">Seller {sellerName(domain, snapshot.merchantId, shipment.connectionId)} / {shipment.site} · <Link className="text-[var(--primary)]" href={`/dashboard/fba/plans/${encodeURIComponent(plan.id)}`}>{plan.number}</Link></p><p className="text-sm">来源履约：{task ? ({ allocated: '待拣货', submitted: '待处理', unknown: '待核实', picking: '拣货中', packed: '已打包', withdraw_pending: '撤回中', cancelled: '已取消', shipped: '已发货', delivered: '已送达' })[task.status] : plan.sourceType === 'supplier' ? '供应商直发（无仓库出库单）' : '待处理'} {task && <> · <Link className="text-[var(--primary)]" href={`/dashboard/outbound/${encodeURIComponent(shipment.outboundId)}`}>打开关联出库单，使用仓库发货操作</Link></>}</p>{packages.map(p => <p key={p.id} className="text-sm">发货包裹 {p.number} · {p.carrier} / {p.tracking} · {p.shippedAt}</p>)}{issue && <p role="alert">{issue}</p>}</section>
    {plan.transport !== 'SPD' && <section className={panel}><h2 className="font-medium">卡车送达预约 · {plan.transport}</h2><p className="text-sm text-[var(--muted)]">每个货件均须确认送达时间窗及承运商预约后才能发货和收货。改约后须重新确认预约。以下时间均为 UTC。</p>{shipment.appointment && <p className="text-sm">已预约：{shipment.appointment.id} · {shipment.appointment.time} · 承运商确认 {shipment.appointment.carrierConfirmation}</p>}<fieldset className="flex flex-wrap gap-3" disabled={disabled || plan.status !== 'confirmed' || shipment.status !== 'working' || !task || ['shipped', 'delivered', 'cancelled', 'withdraw_pending'].includes(task.status)}><label className="text-sm">时间窗开始 <input aria-label="送达时间窗开始" className={fbaInput} type="datetime-local" value={windowStart} onChange={e => setWindowStart(e.target.value)} /></label><label className="text-sm">时间窗结束 <input aria-label="送达时间窗结束" className={fbaInput} type="datetime-local" value={windowEnd} onChange={e => setWindowEnd(e.target.value)} /></label><button className={buttonClass} disabled={!windowStart || !windowEnd} onClick={() => send({ type: shipment.appointment ? 'fba_reschedule' : 'fba_set_window', shipmentId: shipment.id, deliveryWindow: { start: `${windowStart}Z`, end: `${windowEnd}Z` } })}>{shipment.appointment ? '改约并清除原预约' : '保存送达时间窗'}</button><label className="text-sm">预约编号 <input aria-label="送达预约编号" className={fbaInput} value={appointmentId} onChange={e => setAppointmentId(e.target.value)} /></label><label className="text-sm">预约时间 <input aria-label="送达预约时间" className={fbaInput} type="datetime-local" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} /></label><label className="text-sm">承运商确认凭证 <input aria-label="承运商确认凭证" className={fbaInput} value={carrierConfirmation} onChange={e => setCarrierConfirmation(e.target.value)} /></label><button className={primaryClass} disabled={!shipment.deliveryWindow || !!shipment.appointment || !appointmentId.trim() || !appointmentTime || !carrierConfirmation.trim()} onClick={() => send({ type: 'fba_confirm_appointment', shipmentId: shipment.id, appointment: { id: appointmentId, time: `${appointmentTime}Z`, carrierConfirmation } })}>确认送达预约</button></fieldset></section>}
    <section className={panel}><h2 className="font-medium">实际入库收货</h2><p className="text-xs text-[var(--muted)]">本次登记增量；正常接收不代表已经可售。损坏与短收分别追踪。</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['SKU / FNSKU', '计划', '已接收', '损坏', '短收关闭', '本次正常', '本次损坏'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{shipment.lines.map(l => { const r = shipment.receipts.find(r => r.lineId === l.lineId)!; const planLine = plan.lines.find(v => v.id === l.lineId); return <tr key={l.lineId}><td className="py-2"><div>{planLine?.sku}</div>{planLine?.fnsku && <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{planLine.fnsku}</div>}</td><td>{l.quantity}</td><td>{r.quantity}</td><td>{r.damaged}</td><td>{r.shortClosed}</td><td><input aria-label={`${plan.lines.find(v => v.id === l.lineId)?.sku} 本次正常收货`} className={`${fbaInput} w-20`} type="number" min="0" value={received[l.lineId] ?? 0} disabled={!canReceive} onChange={e => setReceived({ ...received, [l.lineId]: Number(e.target.value) })} /></td><td><input aria-label={`${plan.lines.find(v => v.id === l.lineId)?.sku} 本次损坏收货`} className={`${fbaInput} w-20`} type="number" min="0" value={damaged[l.lineId] ?? 0} disabled={!canReceive} onChange={e => setDamaged({ ...damaged, [l.lineId]: Number(e.target.value) })} /></td></tr>; })}</tbody></table></div><input aria-label="收货凭证" className={fbaInput} placeholder="平台收货凭证 / 报告编号" value={reference} onChange={e => setReference(e.target.value)} disabled={!canReceive} /><button className={primaryClass} disabled={!canReceive || !reference.trim()} onClick={async () => { const lines = shipment.lines.map(l => ({ lineId: l.lineId, received: received[l.lineId] ?? 0, damaged: damaged[l.lineId] ?? 0 })).filter(l => l.received + l.damaged > 0); if (await send({ type: 'fba_receive', shipmentId: shipment.id, lines, reference })) { setReceived({}); setDamaged({}); setReference(''); } }}>登记本次实际收货</button></section>
    <section className={panel}><h2 className="font-medium">短收关闭与差异索赔</h2><input aria-label="差异原因" className={`${fbaInput} w-full`} placeholder="短收 / 索赔原因及凭证" value={reason} onChange={e => setReason(e.target.value)} disabled={disabled} /><button className={buttonClass} disabled={!canReceive || !reason.trim()} onClick={() => send({ type: 'fba_short_close', shipmentId: shipment.id, reason })}>以差异关闭剩余未收数量</button><div className="flex flex-wrap gap-2"><select aria-label="索赔商品" className={fbaInput} value={claimLine} onChange={e => setClaimLine(e.target.value)}>{shipment.receipts.map(r => <option key={r.lineId} value={r.lineId}>{plan.lines.find(v => v.id === r.lineId)?.sku} · 可索赔 {r.shortClosed + r.damaged - r.claimQuantity}</option>)}</select><input aria-label="索赔数量" className={`${fbaInput} w-24`} type="number" min="1" value={claimQty} onChange={e => setClaimQty(Number(e.target.value))} /><button className={buttonClass} disabled={disabled || !reason.trim()} onClick={() => send({ type: 'fba_claim', shipmentId: shipment.id, lineId: claimLine, quantity: claimQty, reason })}>登记索赔任务</button></div><p className="text-xs text-[var(--muted)]">索赔结果及赔付金额以平台处理结果为准。</p></section><Journal snapshot={snapshot} ids={[shipment.id, shipment.fulfillmentId, plan.sourceOrderId ?? '']} />
  </div>;
}
function Journal({ snapshot, ids }: { snapshot: FbaSnapshot; ids: string[] }) { return <section className={panel}><h2 className="font-medium">业务记录</h2>{snapshot.events.filter(e => ids.includes(e.entityId)).map(e => <p key={e.id} className="text-xs text-[var(--muted)]">{e.at} · {e.description}</p>)}</section>; }

function SupplierTrackingInput({ shipmentId, disabled, send }: { shipmentId: string; disabled: boolean; send: (cmd: FbaCommand) => void }) {
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  return <div className="flex flex-wrap items-end gap-2 pt-1">
    <label className="text-xs">供应商承运商 <input aria-label="供应商承运商" className={`${fbaInput} mt-0.5 w-32`} value={carrier} onChange={e => setCarrier(e.target.value)} disabled={disabled} /></label>
    <label className="text-xs">运单号 <input aria-label="供应商运单号" className={`${fbaInput} mt-0.5 w-40`} value={tracking} onChange={e => setTracking(e.target.value)} disabled={disabled} /></label>
    <button className={primaryClass} disabled={disabled || !carrier.trim() || !tracking.trim()} onClick={() => send({ type: 'fba_receive_supplier_tracking', shipmentId, supplierCarrier: carrier, supplierTracking: tracking })}>登记运单号</button>
  </div>;
}
