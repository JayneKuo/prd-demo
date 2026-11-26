'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import type { OrderDetail as SalesOrderDetail } from '@/lib/mock-data/order-details';
import { projectMcfOrderDetail } from '@/lib/mcf-order-detail';
import { channelSkuMappingsChangedEvent, readChannelSkuMappings } from '@/lib/channel-sku-mappings';
import { useShellState } from '@/components/providers/shell-state-provider';
import { buttonClass, primaryClass, inputClass, Field, Modal } from '@/components/amazon/amazon-ui';
import { type Connection, type ProductMapping } from '@/lib/amazon-connections';
import { getWarehouseById, warehouses, skuInventory } from '@/lib/mock-data/warehouses';
import { mockProducts } from '@/lib/mock-data/products';
const variants = mockProducts.flatMap(product => product.variants);
const active = (connection: Connection, business: 'sales' | 'mcf') => connection.authorized && connection.businesses[business]?.status === 'enabled';
import { systemCarriers } from '@/lib/mock-data/carriers';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { buildMcfPreview, mcfFingerprint, mcfLog, mcfRequirements, resolveMcfMapping, type McfOrder } from '@/lib/mcf-workflow';

import { useMcfOrders } from '@/components/amazon/use-mcf-orders';
import { stageLabels, mcfOrderHref, parseMcfOrderRouteId } from '@/lib/mcf-orders';
import { useRouter } from 'next/navigation';

type DemoOrder = McfOrder;

/** Routed Seller detail, backed by the same persisted repository as the sales list. */
export function AmazonSalesOrderDetail({ id, renderDetail }: { id: string; renderDetail: (detail: SalesOrderDetail, deliveryActions: ReactNode) => ReactNode }) {
  const router = useRouter();
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const { setMerchantScope } = useShellState();
  const { records, ready, error, save } = useMcfOrders(true);
  const route = parseMcfOrderRouteId(id);
  const record = records.find(r => r.order.id === (route?.orderId ?? id) && (!route || r.merchant.id === route.merchantId));
  useEffect(() => { if (record) setMerchantScope(record.merchant.id); }, [record?.merchant.id, setMerchantScope]);
  if (!hasCapability(currentSession.role, 'orders:read')) return <p role="alert">当前角色无订单读取权限。</p>;
  if (!ready) return <p role="status">正在读取销售订单…</p>;
  if (!record) return <div className="space-y-4 py-6"><button className={buttonClass} onClick={() => router.push('/dashboard/orders')}>返回销售订单</button><p role="alert">{error || '未找到此公司的销售订单。请返回列表检查 Merchant 和订单号。'}</p></div>;
  const canChangeDelivery = ['ready', 'preview', 'failed', 'cancelled', 'own'].includes(record.order.stage) && !record.order.tracking && !record.order.shipmentConfirmed && record.order.warehouseProgress !== 'handed_over';
  const deliveryTitle = canChangeDelivery ? '改由 Amazon 配送 (MCF)' : '查看配送任务';
  return <>
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {renderDetail(projectMcfOrderDetail(record), record.order.channel === 'AFN' ? null : <button type="button" className={buttonClass} onClick={() => setDeliveryOpen(true)}>{canChangeDelivery ? record.order.stage === 'own' ? '改由 Amazon 配送' : '生成履约单' : '查看配送任务'}</button>)}
    {deliveryOpen && record.order.channel === 'MFN' && <Modal title={deliveryTitle} onClose={() => setDeliveryOpen(false)}>
      <OrderDetail order={record.order} connection={record.connection} merchantId={record.merchant.id} blocked={Boolean(error)} onSave={next => save(record, next)} />
      <div className="mt-5 flex justify-end border-t border-[var(--border)] pt-4"><button type="button" className={buttonClass} onClick={() => setDeliveryOpen(false)}>返回订单</button></div>
    </Modal>}
  </>;
}

/** Old fulfillmentOrder bookmarks now open the normal sales-detail route. */
export function LegacyMcfOrderRedirect() {
  const [requested, setRequested] = useState(false);
  useEffect(() => { setRequested(Boolean(new URLSearchParams(window.location.search).get('fulfillmentOrder'))); }, []);
  return requested ? <LegacyMcfOrderRedirectTarget /> : null;
}

function LegacyMcfOrderRedirectTarget() {
  const router = useRouter();
  const { records, ready } = useMcfOrders(true);
  useEffect(() => {
    if (!ready) return;
    const query = new URLSearchParams(window.location.search);
    const id = query.get('fulfillmentOrder');
    if (!id) return;
    const merchant = query.get('merchant');
    const record = records.find(r => r.order.id === id && (!merchant || r.merchant.id === merchant));
    if (record) router.replace(mcfOrderHref(record.merchant.id, record.order.id));
  }, [records, ready, router]);
  return null;
}

function OrderDetail({ order: o, connection: c, merchantId, blocked, onSave }: { order: DemoOrder; connection: Connection; merchantId: string; blocked: boolean; onSave: (next: DemoOrder) => void }) {
  const { companyId } = useShellState();
  const [service, setService] = useState(o.service);
  const [deliveryChoice, setDeliveryChoice] = useState<'own' | 'amazon'>('amazon');
  const [warehouseId, setWarehouseId] = useState('');
  const [mappingState, setMappingState] = useState<{ sales?: ProductMapping; mcf?: ProductMapping; error?: string }>({});
  const [actionError, setActionError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const canWrite = !blocked && c.authorized && hasCapability(currentSession.role, 'orders:write');
  const shipmentWriteback = c.businesses.sales?.syncSettings?.shipmentWriteback !== false;
  const mapped = (business: 'sales' | 'mcf') => {
    if (o.source === 'Amazon' && o.itemMapping && variants.some(variant => variant.id === o.itemMapping?.omsVariantId)) return o.itemMapping;
    const site = c.businesses[business]?.site;
    return site ? resolveMcfMapping(o.sku, readChannelSkuMappings(companyId, merchantId, c, site)) : undefined;
  };
  useEffect(() => {
    const reload = () => { try { setMappingState({ sales: mapped('sales'), mcf: mapped('mcf') }); setActionError(''); } catch { setMappingState({ error: '无法读取商品映射。原数据已保留，请修复浏览器存储后重试。' }); } };
    reload();
    window.addEventListener('storage', reload); window.addEventListener(channelSkuMappingsChangedEvent, reload);
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', reload); window.removeEventListener(channelSkuMappingsChangedEvent, reload); };
  }, [companyId, merchantId, c, o.sku]);
  const requirements = mcfRequirements(o, c, mappingState, !blocked && hasCapability(currentSession.role, 'orders:write'), mcfOrderHref(merchantId, o.id));
  const mcfEnabled = requirements.every(r => r.ok);
  const previewValid = Boolean(o.preview && o.preview.expiresAt > clock && mappingState.mcf && o.preview.fingerprint === mcfFingerprint(o, c, mappingState.mcf));
  const assignedWarehouse = getWarehouseById(o.warehouseId ?? '');
  const selectable = ['ready', 'failed', 'cancelled', 'preview'].includes(o.stage) && !o.tracking && !o.shipmentConfirmed;
  const request = (kind: 'create' | 'cancel' | 'withdraw') => ({ kind, requestedAt: Date.now(), resolveAt: Date.now() + 2200 });
  function change(patch: Partial<DemoOrder>, message: string) {
    try {
      if (!canWrite || o.channel !== 'MFN') { setActionError('当前订单只读，操作未生效。'); return; }
      const startsMcf = patch.stage === 'preview' || patch.stage === 'submitting';
      if (startsMcf) {
        const latest = { sales: mapped('sales'), mcf: mapped('mcf') };
        const missing = mcfRequirements(o, c, latest, !blocked && hasCapability(currentSession.role, 'orders:write'), mcfOrderHref(merchantId, o.id)).filter(r => !r.ok);
        if (missing.length) { setActionError(missing.map(r => r.text).join('；')); return; }
        if (patch.stage === 'submitting' && (!o.preview || o.preview.expiresAt <= Date.now() || !latest.mcf || o.preview.fingerprint !== mcfFingerprint(o, c, latest.mcf))) { setActionError('预览已过期或商品 / 站点已变更，请重新预览后提交。'); return; }
      }
      if (patch.stage === 'own_withdraw_pending' && (o.stage !== 'own' || o.tracking || o.shipmentConfirmed || o.warehouseProgress === 'handed_over')) { setActionError('原任务已出库或不可撤回，请跟踪原配送任务。'); return; }
      if (patch.shipmentConfirmed && !shipmentWriteback) { setActionError('销售业务未启用发货确认回传；物理发运状态不变。'); return; }
      setActionError(''); onSave({ ...o, ...patch, history: [...o.history, mcfLog(message)] });
    } catch { setActionError('无法读取商品映射，操作未生效。请检查浏览器存储，已有数据未清除。'); }
  }
  return <div className="space-y-4 text-[13px]">
    {(mappingState.error || actionError) && <p role="alert" className="text-[var(--danger)]">{mappingState.error || actionError}</p>}
    <p>{o.reference} · {o.sku} × {o.qty}</p>
    <p className="rounded-md bg-[var(--surface-subtle)] p-3">当前进度：{stageLabels[o.stage]}。同一订单仅允许一种有效履约路线。</p>
    {['own', 'own_withdraw_pending'].includes(o.stage) && <p className="text-[12px] text-[var(--muted)]">原仓库任务撤回成功后，才能选择 Amazon 配送方案。原订单的 MFN 类型保持不变。</p>}
    {o.withdrawalConfirmedAt && <p role="status" className="text-[12px] text-[var(--muted)]">自有仓原任务已于 {new Date(o.withdrawalConfirmedAt).toLocaleString('zh-CN')} 确认撤回并关闭；撤回记录保留在订单操作记录中。</p>}
    {o.channel === 'MFN' && deliveryChoice === 'amazon' && ['ready', 'preview', 'failed', 'cancelled'].includes(o.stage) && requirements.some(requirement => !requirement.ok) && <section role="alert" aria-label="暂时无法使用 Amazon 配送" className="space-y-2 rounded-md border border-[var(--border)] p-3"><h3 className="font-semibold">请先处理以下问题</h3><ul className="space-y-2 text-[12px]">{requirements.filter(requirement => !requirement.ok).map(requirement => <li key={requirement.id}><span className="text-[var(--danger)]">{requirement.text}</span>{requirement.href && <Link href={requirement.href} className="ml-2 underline">{requirement.repair}</Link>}</li>)}</ul></section>}
    {o.channel === 'AFN' ? <p>配送信息：{o.carrier} / {o.tracking}；Amazon 已发货。</p> : <>
      {!canWrite && <p className="text-[var(--danger)]">{blocked ? '履约存储异常，当前只读；请按页面提示修复后刷新。' : !c.authorized ? 'Seller 授权已失效，请使用上方授权入口恢复。' : '当前角色无订单写权限，请联系管理员。'}</p>}
      <fieldset disabled={!canWrite} className="space-y-4">
        {selectable && <div className="space-y-3">
          {o.stage !== 'preview' && <><Field label="配送方式"><select className={inputClass} value={deliveryChoice} onChange={event => setDeliveryChoice(event.target.value as 'own' | 'amazon')}><option value="own">商家配送 · 按库存分配仓库</option><option value="amazon">Amazon 配送 · MCF</option></select></Field>{deliveryChoice === 'own' && <><Field label="本次履约仓库"><select className={inputClass} value={warehouseId} onChange={event => setWarehouseId(event.target.value)}><option value="">请选择仓库</option>{warehouses.filter(warehouse => warehouse.active).map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></Field><button className={primaryClass} disabled={!warehouseId} onClick={() => { const mapping = mapped('sales'); const sku = variants.find(variant => variant.id === mapping?.omsVariantId)?.sku; const warehouse = getWarehouseById(warehouseId); const stock = skuInventory.find(item => item.warehouseId === warehouseId && item.sku === sku); if (!sku || !warehouse?.active || !stock || stock.available < o.qty || !active(c, 'sales')) { setActionError('请确认销售业务、商品映射及仓库可用库存，无法生成当前履约单。'); return; } change({ stage: 'own', route: 'own', warehouseId, warehouseProgress: 'allocated', preview: undefined }, '生成商家配送履约单，等待仓库作业'); }}>生成商家履约单</button></>}</>}
          {(deliveryChoice === 'amazon' || o.stage === 'preview') && <><Field label="配送服务"><select className={inputClass} value={service} disabled={!mcfEnabled || o.stage === 'preview'} onChange={e => setService(e.target.value as DemoOrder['service'])}><option value="Standard">Standard · 3–5 个工作日</option><option value="Expedited">Expedited · 2 个工作日</option></select></Field>
          {o.stage !== 'preview' ? <button className={primaryClass} disabled={!mcfEnabled} onClick={() => { try { const m = mapped('mcf'); if (m) change({ stage: 'preview', route: '', service, preview: buildMcfPreview(o, c, m, service) }, `查询 ${service} 配送方案；尚未创建配送`); } catch { setActionError('无法读取商品映射，未取得配送方案。'); } }}>查询配送方案</button> : <div className="space-y-3 rounded-md border border-[var(--border)] p-3">
            {o.preview ? <><p>配送方案：{o.preview.service === 'Standard' ? '标准配送' : '加急配送'} · 需求 {o.qty} 件</p><p>估算费用：{o.preview.currency} {o.preview.fee.toFixed(2)}（整单）<br />预计送达：{o.preview.deliveryFrom} — {o.preview.deliveryTo}</p><p className="text-[12px] text-[var(--muted)]">费用和日期以当前配送方案为准。有效至 {new Date(o.preview.expiresAt).toLocaleTimeString('zh-CN')}，不承诺库存或时效。</p></> : <p>配送方案需要更新，请重新查询。</p>}
            {!previewValid && <p role="alert">配送方案已过期或订单信息已变化，请重新查询。</p>}
            <div className="flex flex-wrap gap-2"><button className={primaryClass} disabled={!mcfEnabled || !previewValid} onClick={() => change({ stage: 'submitting', route: 'mcf', attempt: o.attempt + 1, fulfillmentId: `MCF-${o.id}-${o.attempt + 1}`, pending: request('create'), carrier: '', tracking: '', shipmentConfirmed: false }, `提交 MCF 创建登记；幂等参考 MCF-${o.id}-${o.attempt + 1}；提交处理中，禁止重复提交`)}>确认并创建配送</button><button className={buttonClass} onClick={() => change({ stage: 'ready', route: '', preview: undefined }, '返回选择配送服务，未创建配送')}>重新选择配送服务</button></div>
          </div>}</>}
        </div>}
        {o.fulfillmentId && <p className="break-all text-[12px] text-[var(--muted)]">配送任务编号：{o.fulfillmentId} · 第 {o.attempt} 次尝试</p>}
        {o.stage === 'submitting' && <p role="status">正在创建配送，请勿重复提交。返回订单后仍可查看处理进度。</p>}
        {o.stage === 'created' && <div className="space-y-2"><p role="status">MCF 创建成功，正在等待拣配。包裹发运后会自动更新运单，无需重复创建。</p><button className={buttonClass} onClick={() => change({ stage: 'cancel_pending', pending: request('cancel') }, '申请取消配送，等待确认；原路线保持锁定')}>申请取消配送</button></div>}
        {o.stage === 'unknown' && <div className="space-y-2"><p>创建超时不等于失败，必须按原参考号核实。未接入远端查询，不会将未知结果自动视为成功或失败；禁止重建或转仓。</p><button className={buttonClass} onClick={() => change({}, `核验请求已登记：${o.fulfillmentId}；未取得远端回执，保留未知状态与路线锁定`)}>登记原参考号核验</button></div>}
        {o.stage === 'processing' && <div className="space-y-2"><p role="status">配送拣配中，发货后将自动更新包裹与运单。原路线保持锁定。</p><button className={buttonClass} onClick={() => change({ stage: 'cancel_pending', pending: o.localCreatedAt ? request('cancel') : undefined }, '已申请取消配送，等待明确回执')}>申请取消配送</button></div>}
        {o.stage === 'cancel_pending' && <div className="space-y-2"><p>{o.pending?.kind === 'cancel' ? '撤销工作区登记，正在等待确认；确认前禁止重建或转仓。' : '取消请求不等于取消成功。未接入远端回执，继续锁定原任务；不能将刷新视为已取消。'}</p>{!o.pending && <button className={buttonClass} onClick={() => change({}, '核对取消记录：未取得已取消回执，保持锁定')}>刷新取消记录</button>}</div>}
        {o.stage === 'own_withdraw_pending' && <p role="status">自有仓未出库任务已申请撤回，等待仓库确认；原路线仍锁定，不能出库或创建 MCF。确认后关闭原任务，保留记录。</p>}
        {o.stage === 'own' && <div className="space-y-3">
          <p>当前配送方：自有仓 · {assignedWarehouse?.name ?? '未记录仓库'}。仓库进度：{{ allocated: '已分配', picking: '拣货中', packed: '已打包', handed_over: '已交承运商' }[o.warehouseProgress ?? 'allocated']}。</p>
          <p>{o.warehouseProgress === 'handed_over' ? '包裹已交承运商，即使运单尚未同步，也不能撤回或改由 Amazon 配送。请跟踪原任务。' : o.warehouseProgress === 'picking' || o.warehouseProgress === 'packed' ? '仓库已开始作业，申请撤回不代表成功；须等待仓库确认终止拣货 / 打包并关闭原任务后，才能查询配送方案。' : '先申请撤回未出库任务；收到仓库确认前保持原路线锁定，不能创建 MCF。'}</p>
          <button className={primaryClass} disabled={Boolean(o.tracking || o.shipmentConfirmed || o.warehouseProgress === 'handed_over')} onClick={() => change({ stage: 'own_withdraw_pending', pending: request('withdraw') }, '请求撤回未出库自有仓任务；等待确认，未释放原路线')}>申请撤回未出库任务</button>
        </div>}
        {o.stage === 'shipped' && <div className="space-y-3"><h3 className="font-semibold">包裹与发货确认</h3><p>履约方式：{o.route === 'mcf' ? 'MCF' : '自有仓'} · {systemCarriers.find(carrier => carrier.id === o.carrier)?.name ?? o.carrier}<br />运单：{o.tracking}</p>{o.package && <p className="text-xs text-[var(--muted)]">包裹 {o.package.id} · {o.package.quantity} 件 · {o.package.deliveryStatus === 'delivered' ? '已妥投' : '运输中'}</p>}<p className="text-xs text-[var(--muted)]">已发货订单仅可查看原包裹物流，不能撤回、更改配送方式或重新创建配送。</p>{o.source === 'Amazon' && <p className="text-xs text-[var(--muted)]">原订单发货确认：{o.shipmentConfirmed ? '已确认' : o.writeback?.status === 'pending' ? '回传中' : o.writeback?.status === 'failed' ? '回传失败' : '尚未回传'}</p>}{o.writeback?.status === 'failed' && <p role="alert" className="text-[var(--danger)]">{o.writeback.error}</p>}{o.source === 'Amazon' && !o.shipmentConfirmed && <button className={primaryClass} disabled={!shipmentWriteback || o.writeback?.status === 'pending'} onClick={() => change({ writeback: { status: 'pending', submittedAt: Date.now(), attempts: (o.writeback?.attempts ?? 0) + 1 } }, '仅重传原包裹发货确认，不创建配送')}>{o.writeback?.status === 'pending' ? '发货确认回传中…' : o.writeback?.status === 'failed' ? '重试发货确认' : '回传原订单发货确认'}</button>}</div>}
      </fieldset>
    </>}
  </div>;
}
