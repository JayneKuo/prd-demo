'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { getMerchantsByCompany } from '@/lib/tenant-context';
import { useShellState } from '@/components/providers/shell-state-provider';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { getWarehouseById } from '@/lib/mock-data/warehouses';
import type { OmsCommand } from './commands';
import { useOms } from './provider';
import { projectOutboundRow } from './outbound-projections';
import { scopeKey } from './types';
import { ShippingDeadlineNotice } from './shipping-deadline-notice';
import type { FbaSnapshot } from './fba';
import { canDispatchFbaSource } from './fba';

const buttonClass = 'rounded-lg border border-[var(--border)] px-3 py-2 text-[13px] font-medium hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50';
const inputClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px]';
const date = (value: string) => value.replace('T', ' ').replace('Z', ' UTC');

/** This component owns its hooks independently of the historical detail template. */
export function CanonicalOutboundDetail({ id }: { id: string }) {
  const { snapshots, ready, error: providerError, execute } = useOms();
  const { companyId, merchantScope } = useShellState();
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const snapshot = snapshots.find(state => state.companyId === companyId && (merchantScope === 'all' || state.merchantId === merchantScope) && state.outbounds.some(item => item.id === id && scopeKey(item) === scopeKey(state)));
  const outbound = snapshot?.outbounds.find(item => item.id === id && scopeKey(item) === scopeKey(snapshot));
  const order = snapshot?.orders.find(item => item.id === outbound?.orderId);
  const task = snapshot?.fulfillments.find(item => item.id === outbound?.fulfillmentId);
  const canWrite = hasCapability(currentSession.role, 'orders:write');
  const readonly = !canWrite || !task || !!order?.migrationBlocked || !order || order.channelType === 'AFN';

  const run = async (command: OmsCommand, success: string) => {
    if (!snapshot || !outbound || readonly || busy || snapshot.companyId !== companyId || (merchantScope !== 'all' && snapshot.merchantId !== merchantScope)) return;
    setBusy(true); setError(''); setMessage('');
    try { await execute(snapshot.merchantId, command); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败，业务数据未清除'); }
    finally { setBusy(false); }
  };

  if (!snapshot || !outbound) return <div className="mx-auto max-w-[1280px] py-16 text-center">
    <h1 className="text-xl font-semibold">{ready ? '当前范围内未找到出库单' : '正在读取出库单…'}</h1>
    <p className="mt-2 text-sm text-[var(--muted)]">{providerError || '请确认公司与商家范围；不会在其他商家中查找或修改记录。'}</p>
    <Link href="/dashboard/outbound" className="mt-4 inline-block text-sm text-[var(--primary)]">返回出库单列表</Link>
  </div>;

  const merchant = getMerchantsByCompany(companyId).find(item => item.id === snapshot.merchantId)?.name ?? snapshot.merchantId;
  const row = projectOutboundRow(snapshot, outbound, merchant);
  const warehouse = getWarehouseById(outbound.warehouseId);
  const packages = snapshot.packages.filter(pack => pack.fulfillmentId === outbound.fulfillmentId);
  const reservations = snapshot.reservations.filter(item => item.fulfillmentId === outbound.fulfillmentId);
  const canWithdraw = !!task && ['allocated', 'submitted', 'picking', 'packed'].includes(task.status);
  const mcfBinding = snapshot.fulfillmentWarehouses?.find(item => item.id === outbound.warehouseId);
  const canSubmitMcf = canWrite && task?.executor === 'amazon' && task.status === 'allocated' && outbound.status === 'waiting';
  const events = snapshot.events.filter(event => event.entityId === outbound.id || event.entityId === outbound.orderId || event.entityId === outbound.fulfillmentId).slice().reverse();

  // FBA 补货检测
  const isFba = order?.source === 'internal_transfer' && (order?.tags?.includes('fba_replenishment') ?? false);
  const isSupplierDirect = order?.tags?.includes('supplier_direct') ?? false;
  const fbaSnap = snapshot as FbaSnapshot;
  const fbaShipment = isFba ? fbaSnap.inboundShipments?.find(s => s.outboundId === outbound.id) : undefined;
  const fbaPlan = fbaShipment ? fbaSnap.inboundPlans?.find(p => p.id === fbaShipment.planId) : undefined;
  const fbaDeliveryPlan = fbaPlan ? fbaSnap.deliveryPlans?.find(dp => dp.inboundPlanId === fbaPlan.id) : undefined;
  const fbaShipmentLabels: Record<string, string> = { working: '待发货', shipped: '已发货', receiving: '收货中', cancelled: '已取消', closed: '已关闭' };

  // FBA 出库：需要额外检查货件预约状态（LTL/FTL 须在入仓货件页完成卡车预约后才能发货）
  const fbaCanDispatch = !isFba || (fbaSnap.inboundShipments !== undefined && canDispatchFbaSource(fbaSnap, outbound.fulfillmentId));
  const canDispatch = task?.executor === 'warehouse' && task.status === 'packed' && outbound.status === 'packed' && fbaCanDispatch;

  return <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
    <Link href="/dashboard/outbound" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)]"><ArrowLeft className="size-3.5" />返回出库单列表</Link>
    <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{outbound.number}</h1>
            <StatusBadge status={row.status} />
            <StatusBadge status={row.wmsStatus} />
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{isFba ? (isSupplierDirect ? 'FBA 供应商直发' : 'FBA 补货出库') : '销售出库'} · {merchant} · 创建于 {date(outbound.createdAt)}</p>
          <ShippingDeadlineNotice orderId={outbound.orderId} />
        </div>
        {canWithdraw && <button type="button" disabled={readonly || busy} onClick={() => void run({ type: 'withdraw', fulfillmentId: outbound.fulfillmentId }, '已申请撤回；仓库确认后关闭出库与履约任务并释放预占。')} className={buttonClass}>撤回出库</button>}
      </div>
      <dl className="mt-5 grid gap-4 border-t border-[var(--border)] pt-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-[var(--muted)]">来源销售订单</dt><dd className="mt-1"><Link className="text-[var(--primary)] hover:underline" href={`/dashboard/orders/${encodeURIComponent(outbound.orderId)}`}>{order?.number ?? outbound.orderId}</Link></dd></div>
        <div><dt className="text-[var(--muted)]">履约单号</dt><dd className="mt-1">{task?.number ?? outbound.fulfillmentId}</dd></div>
        <div><dt className="text-[var(--muted)]">执行仓库</dt><dd className="mt-1">{mcfBinding ? `${mcfBinding.code} · ${mcfBinding.name}` : warehouse ? `${warehouse.code} · ${warehouse.name}` : outbound.warehouseId}</dd></div>
        <div><dt className="text-[var(--muted)]">渠道单号</dt><dd className="mt-1">{order?.sourceId || '—'}</dd></div>
      </dl>
    </header>
    {(error || providerError) && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{error || providerError}</p>}
    {/* FBA 补货出库单专属信息 */}
    {isFba && (
      <div className="mb-5 overflow-hidden rounded-xl border border-sky-200 bg-sky-50/60 dark:bg-sky-950/20">
        <div className="flex flex-wrap items-center gap-2 border-b border-sky-200 px-5 py-3">
          <span className="text-sm font-semibold text-sky-900 dark:text-sky-100">FBA 补货出库</span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${isSupplierDirect ? 'bg-violet-100 text-violet-700 ring-violet-300' : 'bg-sky-100 text-sky-700 ring-sky-300'}`}>
            {isSupplierDirect ? '供应商直发' : '自有仓调拨'}
          </span>
          <span className="ml-auto text-xs text-[var(--muted)]">此出库单由 FBA 补货流程自动创建，发货后自动扣减仓库库存</span>
        </div>
        <dl className="grid gap-4 px-5 py-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-[var(--muted)]">FBA 货件（STA）</dt>
            <dd className="mt-1">
              {fbaPlan ? (
                <Link className="text-[var(--primary)] hover:underline" href={`/dashboard/fba/plans/${encodeURIComponent(fbaPlan.id)}`}>
                  {fbaPlan.number}
                </Link>
              ) : <span>{order?.sourceId ?? '—'}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">目标 FC</dt>
            <dd className="mt-1 font-medium">{fbaShipment?.destination ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">货件状态</dt>
            <dd className="mt-1">{fbaShipment ? fbaShipmentLabels[fbaShipment.status] : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">发货计划</dt>
            <dd className="mt-1">
              {fbaDeliveryPlan ? (
                <Link className="text-[var(--primary)] hover:underline" href={`/dashboard/fba/delivery-plans/${encodeURIComponent(fbaDeliveryPlan.id)}`}>
                  {fbaDeliveryPlan.number}
                </Link>
              ) : <Link className="text-xs text-[var(--muted)] hover:text-[var(--primary)]" href="/dashboard/fba/delivery-plans">未关联发货计划</Link>}
            </dd>
          </div>
        </dl>
      </div>
    )}
    {message && <p role="status" className="mb-4 text-sm text-[var(--primary)]">{message}</p>}
    {readonly && <p className="mb-4 text-sm text-[var(--muted)]">当前记录只读。{order?.migrationBlocked || (!canWrite ? '当前角色无订单执行权限。' : '关联订单或履约任务不可执行。')}</p>}
    <section className="mb-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <h2 className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold">商品清单 · {row.totalQty} 件</h2>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-[13px]">
        <thead className="bg-[var(--surface-subtle)] text-[var(--muted)]"><tr>{['SKU / 商品', '本单计划数量', '当前预占', '实际出库', '已释放'].map(label => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead>
        <tbody>{outbound.lines.map(line => {
          const source = order?.lines.find(item => item.id === line.lineId);
          const reserved = reservations.filter(item => item.lineId === line.lineId && item.status === 'active').reduce((sum, item) => sum + item.quantity, 0);
          const released = reservations.filter(item => item.lineId === line.lineId && item.status === 'released').reduce((sum, item) => sum + item.quantity, 0);
          const shipped = packages.flatMap(pack => pack.lines).filter(item => item.lineId === line.lineId).reduce((sum, item) => sum + item.quantity, 0);
          return <tr key={line.lineId} className="border-t border-[var(--border-subtle)]"><td className="px-5 py-3"><div className="font-medium">{source?.sku ?? line.lineId}</div><div className="text-xs text-[var(--muted)]">{source?.title ?? '商品信息待补充'}</div></td><td className="px-5 py-3">{line.quantity}</td><td className="px-5 py-3">{reserved}</td><td className="px-5 py-3">{shipped}</td><td className="px-5 py-3">{released}</td></tr>;
        })}</tbody>
      </table></div>
    </section>
    <section className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-sm font-semibold">仓库执行与发货信息</h2>
      {task?.executor === 'amazon' ? <div className="mt-3 space-y-3 text-sm">
        <p>执行路由：OMS 出库 → Amazon APP → MCF。绑定仓库：{mcfBinding?.name ?? '历史记录，无当前绑定'} · Seller：{task.connectionId} · 市场：{task.site}</p>
        <p className="text-xs text-[var(--muted)]">当前尚未接入真实 Amazon 服务。下方按钮仅显式执行本地适配器验证，不代表已向 Amazon 推送。真实接入后由插件使用绑定连接授权及 Seller SKU 创建 MCF；不能手动拣货或确认发货。</p>
        <p>配送请求编号：{task.providerReference ?? '待生成'} · 执行状态：{task.status === 'allocated' ? '待提交 APP' : task.status}</p>
        {canSubmitMcf && <button disabled={busy} onClick={() => void run({ type: 'submit_mcf_outbound', outboundId: outbound.id }, '出库单已提交本地 Amazon APP 适配器；非真实 Amazon 执行')} className={buttonClass}>提交 Amazon APP（本地验证）</button>}
      </div> : <>
        <p className="mt-2 text-[13px] text-[var(--muted)]">拣货与打包由全局仓库事件自动推进，离开页面后仍继续。已打包后填写承运商、运单号并确认出库；出库前不会扣减在库数量。</p>
        {isFba && !fbaCanDispatch && task?.status === 'packed' && fbaShipment && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            <strong>⚠️ LTL/FTL 卡车货件需要先确认送达预约</strong>，请先前往
            <Link className="mx-1 text-[var(--primary)] underline" href={`/dashboard/fba/shipments/${encodeURIComponent(fbaShipment.id)}`}>入仓货件详情</Link>
            完成送达时间窗和承运商预约，再回来发货。
          </div>
        )}
      </>}
      {outbound.status === 'withdraw_pending' && <p role="status" className="mt-3 text-sm">撤回确认中，预占暂不释放；确认后关联履约单与出库单一起关闭。</p>}
      {outbound.status === 'cancelled' && <p className="mt-3 text-sm">出库已撤回，关联履约任务已关闭，预占已释放。</p>}
      {canDispatch && <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void run({ type: 'dispatch', fulfillmentId: outbound.fulfillmentId, carrier: carrier.trim(), tracking: tracking.trim() }, '出库成功，原预占已消耗并生成包裹。'); }}>
        <label className="min-w-48 flex-1 text-xs">承运商<input required value={carrier} onChange={event => setCarrier(event.target.value)} disabled={readonly || busy} className={`${inputClass} mt-1`} /></label>
        <label className="min-w-56 flex-1 text-xs">运单号<input required value={tracking} onChange={event => setTracking(event.target.value)} disabled={readonly || busy} className={`${inputClass} mt-1`} /></label>
        <button type="submit" disabled={readonly || busy || !carrier.trim() || !tracking.trim()} className={buttonClass}>{busy ? '提交中…' : '确认出库'}</button>
      </form>}
      {packages.map(pack => <dl key={pack.id} className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-[var(--muted)]">包裹号</dt><dd className="mt-1">{pack.number}</dd></div><div><dt className="text-[var(--muted)]">承运商 / 运单号</dt><dd className="mt-1">{pack.carrier} / {pack.tracking}</dd></div><div><dt className="text-[var(--muted)]">出库时间</dt><dd className="mt-1">{date(pack.shippedAt)}</dd></div><div><dt className="text-[var(--muted)]">签收时间</dt><dd className="mt-1">{pack.deliveredAt ? date(pack.deliveredAt) : '待签收'}</dd></div>
      </dl>)}
    </section>
    <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="text-sm font-semibold">关联订单操作记录</h2><ul className="mt-3 space-y-3">{events.length ? events.map(event => <li key={event.id} className="text-[13px]"><span className="mr-3 text-xs text-[var(--muted)]">{date(event.at)}</span>{event.description}</li>) : <li className="text-[13px] text-[var(--muted)]">暂无操作记录</li>}</ul></section>
  </div>;
}
