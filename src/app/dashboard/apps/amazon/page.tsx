'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Plus, Plug, Search, ShieldCheck } from 'lucide-react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { useAmazonConnections } from '@/components/amazon/use-amazon-connections';
import { ConnectAmazonAccount } from '@/components/amazon/connect-account';
import { ConfigureBusiness } from '@/components/amazon/configure-business';
import { buttonClass, primaryClass, inputClass, Panel, Modal } from '@/components/amazon/amazon-ui';
import { businessDefinitions, type Connection, type BusinessId } from '@/lib/amazon-connections';
import { appendAmazonConnection } from '@/lib/app-store';
import { defaultSyncSettings, syncTaskLabels } from '@/lib/amazon-sync';
import { ALL_MERCHANTS_SCOPE, currentUserRole, getMerchantByScope } from '@/lib/tenant-context';
import { hasCapability } from '@/lib/permissions';

const statusText = { draft: '配置中', enabled: '已启用', paused: '已停止接收新业务' };
const tabs = [
  { id: 'overview', label: '概况' },
  { id: 'authorization', label: '授权与权限' },
  { id: 'business', label: '业务能力' },
  { id: 'sync', label: '同步与运行' }
] as const;

export default function AppsPage() {
  const { companyId, merchantScope } = useShellState();
  return <Suspense fallback={<p className="p-5 text-sm text-[var(--muted)]">正在读取连接…</p>}><AppsContent key={`${companyId}:${merchantScope}`} /></Suspense>;
}

function AppsContent() {
  const { companyId, merchantScope, setMerchantScope } = useShellState();
  const router = useRouter();
  const query = useSearchParams();
  const { connections, ready, saveConnections, error } = useAmazonConnections();
  const [search, setSearch] = useState('');
  const [add, setAdd] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{ connectionId: string; query: string; action: 'authorize' | 'revoke' | BusinessId } | null>(null);
  const selected = query.get('connection');
  const connection = connections.find((c) => c.id === selected);
  const tab = tabs.find((item) => item.id === query.get('tab'))?.id ?? 'overview';
  const configId = query.get('configure') === '1' ? businessDefinitions.find((business) => business.id === query.get('business') && business.identity === connection?.identity)?.id : undefined;
  const step = query.get('step') === '2' ? '2' : '1';
  const confirm = confirmation?.connectionId === connection?.id && confirmation?.query === query.toString() ? confirmation?.action : null;
  const setConfirm = (action: 'authorize' | 'revoke' | BusinessId | null) => setConfirmation(action && connection ? { connectionId: connection.id, query: query.toString(), action } : null);
  const canManage = hasCapability(currentUserRole, 'apps:manage');
  const scoped = merchantScope !== ALL_MERCHANTS_SCOPE;
  const merchant = getMerchantByScope(merchantScope);
  const update = (next: Connection) => saveConnections(connections.map((c) => c.id === next.id ? next : c));
  const connectionUrl = (id: string, nextTab = 'overview') => `/dashboard/apps/amazon?${new URLSearchParams({ connection: id, tab: nextTab })}`;
  const navigate = (href: string) => { setNotice(''); setConfirm(null); router.push(href); };
  const setTab = (nextTab: string) => { if (connection) navigate(connectionUrl(connection.id, nextTab)); };
  const openConfig = (id: BusinessId) => { if (connection) navigate(`${connectionUrl(connection.id, 'business')}&business=${id}&configure=1`); };
  const integrationLinks = [
    { name: '商品映射', href: '/dashboard/product-mapping', description: '商品模块统一维护 SKU 与平台商品标识。' },
    { name: '仓库资料', href: '/dashboard/warehouses', description: '引用已有仓库，不在连接里新建仓库。' },
    { name: '承运商映射', href: '/dashboard/carriers/mapping', description: '运输模块统一维护平台承运商代码。' },
    { name: '履约与库存规则', href: '/dashboard/rules/fulfillment', description: '策略中心维护共用规则，业务单据按规则执行。' }
  ];
  if (connection && configId) return <div className="mx-auto max-w-[1100px] space-y-5 pt-5 pb-12 text-[var(--foreground)] lg:pt-6"><ConfigureBusiness key={`${connection.id}:${configId}:${step}`} connection={connection} businessId={configId} onClose={() => navigate(connectionUrl(connection.id, 'business'))} onPersist={(config) => update({ ...connection, businesses: { ...connection.businesses, [configId]: config } })} onSave={(config) => { if (!update({ ...connection, businesses: { ...connection.businesses, [configId]: config } })) return false; setNotice('配置已保存并启用，首次同步将在后台执行。'); const returnTo = query.get('returnTo'); const allowed = returnTo?.startsWith('/dashboard/vendor-orders?') || returnTo?.startsWith('/dashboard/vendor-orders/') || returnTo?.startsWith('/dashboard/orders?') || returnTo?.startsWith('/dashboard/orders/'); router.push(allowed ? returnTo! : connectionUrl(connection.id, 'business')); return true; }} /></div>;
  return <div className="mx-auto max-w-[1200px] space-y-5 pt-5 pb-12 text-[var(--foreground)] lg:pt-6">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-5">
      <div>{connection && <button className="mb-3 flex items-center gap-1 text-xs text-[var(--muted)]" onClick={() => navigate('/dashboard/apps/amazon')}><ArrowLeft size={14} /> App Store / Amazon</button>}{!connection && <Link href="/dashboard/apps" className="mb-3 flex items-center gap-1 text-xs text-[var(--muted)]"><ArrowLeft size={14} /> 返回 App Store</Link>}<h1 className="text-2xl font-semibold tracking-tight">{connection?.name ?? 'Amazon'}</h1><p className="mt-1 text-sm text-[var(--muted)]">{connection ? `${connection.identity === 'seller' ? 'Seller' : 'Vendor'} · ${connection.region} · ${merchant?.name ?? '请选择商家'}` : '连接外部平台，启用业务能力；基础资料与日常操作仍在对应模块管理。'}</p></div>
      {!connection && <button className={primaryClass} disabled={!canManage || !ready} onClick={() => setAdd(true)}><Plus size={15} /> 连接 Amazon 账号</button>}
    </div>
    {!scoped && <p role="status" className="text-sm">连接归属具体商家。查看已有账号请先在左侧选择商家；新增连接时也可在表单中选择所属商家。</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {notice && <p role="alert" className="rounded-md border border-[var(--border)] px-4 py-3 text-sm">{notice}</p>}
    {ready && selected !== null && !connection && <div role="alert" className="rounded-md border border-[var(--border)] p-4 text-sm"><p>找不到此 Amazon 账号。连接可能已移除，或不属于当前公司与商家范围。</p><p className="mt-1 text-xs text-[var(--muted)]">请切换到连接所属商家，或返回当前商家的账号列表重新选择。</p><button className={`${buttonClass} mt-3`} onClick={() => navigate('/dashboard/apps/amazon')}>返回账号列表</button></div>}
    {connection && query.get('configure') === '1' && !configId && <div role="alert" className="rounded-md border border-[var(--border)] p-4 text-sm"><p>此业务配置不存在或不适用于当前账号身份。</p><button className={`${buttonClass} mt-3`} onClick={() => setTab('business')}>返回业务能力</button></div>}
    {connection && query.get('connected') === '1' && <section role="status" className="rounded-md border border-[var(--primary)] bg-[var(--primary-soft)] p-4"><h2 className="text-sm font-semibold">Amazon 账号连接成功</h2><p className="mt-2 text-sm">{connection.authorized ? '下一步：选择需要启用的业务，完成业务范围与共用资料配置后，即可在对应业务模块处理单据。' : '下一步：先完成账号授权，再选择需要启用的业务。'}</p><p className="mt-1 text-xs text-[var(--muted)]">连接成功不代表业务已启用，现有业务状态保持不变。</p><div className="mt-3 flex flex-wrap gap-2"><button className={primaryClass} onClick={() => setTab(connection.authorized ? 'business' : 'authorization')}>{connection.authorized ? '选择业务能力' : '前往授权'}</button><button className={buttonClass} onClick={() => setTab(tab)}>知道了</button></div></section>}
    {!ready && !error && <p className="text-sm text-[var(--muted)]">正在读取连接…</p>}
    {!connection ? <>
      <Panel title="Amazon · Seller 与 Vendor"><div className="flex items-start gap-3"><Plug size={22} className="mt-1 text-[var(--muted)]" /><div><p className="text-sm">同一商家可同时连接 Seller 和 Vendor，按账号分别启用业务。</p><p className="mt-1 text-xs text-[var(--muted)]">销售订单 / MCF / FBA 补货 / 批发供货 / Direct Fulfillment</p></div></div></Panel>
      <section className="overflow-hidden rounded-lg border border-[var(--border)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4"><h2 className="text-sm font-semibold">已连接的 Amazon 账号</h2><label className="flex items-center gap-2"><Search size={15} /><input aria-label="搜索账号" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索名称或账号标识" className={inputClass} /></label></div><div className="overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="bg-[var(--surface-subtle)] text-[var(--muted)]"><tr>{['账号', '身份 / 区域', '授权', '已启用业务', '操作'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{connections.filter((c) => `${c.name} ${c.accountId}`.toLowerCase().includes(search.toLowerCase())).map((c) => <tr key={c.id} className="cursor-pointer border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]" onClick={(event) => { if (!(event.target as HTMLElement).closest('button')) navigate(connectionUrl(c.id)); }}><td className="px-4 py-4"><button className="text-[var(--primary)] font-medium" onClick={() => navigate(connectionUrl(c.id))}>{c.name}</button><p className="mt-1 text-xs text-[var(--muted)]">{c.accountId}</p></td><td className="px-4 py-4">{c.identity === 'seller' ? 'Seller' : 'Vendor'} · {c.region}</td><td className="px-4 py-4">{c.authorized ? '已授权' : '待授权'}</td><td className="px-4 py-4">{businessDefinitions.filter((b) => c.businesses[b.id]?.status === 'enabled').map((b) => b.name).join('、') || '尚未启用'}</td><td className="px-4 py-4"><button className={buttonClass} onClick={() => navigate(connectionUrl(c.id))}>管理</button></td></tr>)}</tbody></table></div>{connections.length === 0 && <p className="p-8 text-center text-sm text-[var(--muted)]">暂无连接。选择具体商家后添加 Seller 或 Vendor 账号。</p>}</section>
      <p className="text-xs text-[var(--muted)]">需要连接其他平台或服务？<Link href="/dashboard/apps" className="text-[var(--primary)]">返回 App Store</Link> 查看全部应用。</p>
    </> : <>
      <nav aria-label="连接详情" className="flex gap-6 overflow-x-auto border-b border-[var(--border)]">{tabs.map((item) => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)} className={`whitespace-nowrap border-b-2 pb-3 text-sm ${tab === item.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)]'}`}>{item.label}</button>)}</nav>
      {tab === 'overview' && <div className="grid gap-5 lg:grid-cols-[1fr_300px]"><div className="space-y-5"><Panel title="下一步"><p className="mb-4 text-sm">{!connection.authorized ? '账号已创建，请先授权，再启用业务。' : '连接已就绪。按需启用业务，完成后在业务模块处理单据。'}</p><button className={primaryClass} onClick={() => setTab(connection.authorized ? 'business' : 'authorization')}>{connection.authorized ? '选择业务能力' : '前往授权'}</button></Panel><Panel title="共用配置入口"><div className="divide-y divide-[var(--border-subtle)]">{integrationLinks.map((l) => <Link key={l.href} href={l.href} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">{l.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{l.description}</p></div><ArrowUpRight size={15} /></Link>)}</div></Panel></div><Panel title="连接信息"><dl className="space-y-4 text-sm">{[['所属商家', merchant?.name], ['账号标识', connection.accountId], ['身份', connection.identity], ['区域', connection.region], ['授权', connection.authorized ? '已授权' : '待授权']].map(([k, v]) => <div key={k}><dt className="text-xs text-[var(--muted)]">{k}</dt><dd className="mt-1 break-all">{v}</dd></div>)}</dl></Panel></div>}
      {tab === 'authorization' && <Panel title="账号授权"><div className="flex gap-3"><ShieldCheck size={22} /><div className="space-y-3"><p className="text-sm">{connection.authorized ? '账号授权正常。' : '尚未授权，业务暂不可启用。'}</p><p className="text-xs text-[var(--muted)]">重新授权保留原有业务配置。解除授权会阻断所有关联业务的同步与回传。</p><button disabled={!canManage} className={buttonClass} onClick={() => setConfirm('authorize')}>{connection.authorized ? '重新授权' : '授权'}</button>{connection.authorized && <button disabled={!canManage} className={`${buttonClass} ml-3 text-red-600`} onClick={() => setConfirm('revoke')}>解除授权</button>}</div></div></Panel>}
      {tab === 'business' && <Panel title="按需启用业务"><p className="mb-4 text-xs leading-5 text-[var(--muted)]">这里只选择作用域、引用现有资料并检查就绪情况；不创建仓库、承运商或商品。映射由对应模块保存，返回后自动检查就绪状态。</p><div className="divide-y divide-[var(--border-subtle)]">{businessDefinitions.filter((b) => b.identity === connection.identity).map((b) => { const config = connection.businesses[b.id]; return <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="text-sm font-semibold">{b.name}</h3><p className="mt-1 text-xs text-[var(--muted)]">{b.description}</p><p className="mt-2 text-xs">{config ? statusText[config.status] : '未启用'}{config?.site ? ` · ${config.site}` : ''}{!connection.authorized && ' · 授权未就绪'}{config?.syncTask && ` · ${syncTaskLabels[config.syncTask.status]}`}</p></div><div className="flex flex-wrap gap-2"><button disabled={!canManage} className={buttonClass} onClick={() => openConfig(b.id)}>{config ? '管理配置' : '开始配置'}</button>{config?.status === 'enabled' && <><Link className={buttonClass} href={`${b.href}${b.href.includes('?') ? '&' : '?'}connection=${encodeURIComponent(connection.id)}`}>进入业务 <ArrowUpRight size={13} /></Link><button disabled={!canManage} className={buttonClass} onClick={() => setConfirm(b.id)}>停止新业务</button></>}{config?.status === 'paused' && <button disabled={!canManage || !connection.authorized} className={buttonClass} onClick={() => openConfig(b.id)}>检查并恢复</button>}</div></div>; })}</div></Panel>}
      {tab === 'sync' && <Panel title="初始化与运行记录"><p className="mb-4 text-xs text-[var(--muted)]">按业务查看初始化和同步状态。停止接收新业务不会取消在途单据。</p><div className="divide-y divide-[var(--border-subtle)]">{businessDefinitions.filter((b) => connection.businesses[b.id]).map((b) => { const config = connection.businesses[b.id]!; return <div key={b.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><div><p>{b.name} · {statusText[config.status]}</p><p className="mt-1 text-xs text-[var(--muted)]">同步起点：{config.syncFrom || '未设置'} · 最近初始化：{config.initializedAt ? new Date(config.initializedAt).toLocaleString('zh-CN') : '未执行'}</p></div><span className="text-xs text-[var(--muted)]">{!connection.authorized ? '授权未就绪' : config.syncTask ? syncTaskLabels[config.syncTask.status] : '等待下一次同步'}</span><p className="w-full text-xs text-[var(--muted)]">{(config.syncSettings ?? defaultSyncSettings(b.id)).receiveOrders ? '接收新订单 · ' : ''}{(config.syncSettings ?? defaultSyncSettings(b.id)).readInventory ? '读取 FBA 库存 · ' : ''}{(config.syncSettings ?? defaultSyncSettings(b.id)).publishInventory ? '库存发布已开放（人工确认） · ' : '不发布库存 · '}{(config.syncSettings ?? defaultSyncSettings(b.id)).shipmentWriteback ? '业务回传已开放' : '业务回传关闭'}</p></div>; })}</div><Link href="/dashboard/developers/logs" className="mt-4 inline-flex text-sm text-[var(--primary)]">查看开发者日志 →</Link></Panel>}
    </>}
    {add && <ConnectAmazonAccount onClose={() => setAdd(false)} onSave={(connection, merchantId) => { if (!canManage) return false; try { appendAmazonConnection(companyId, merchantId, connection); } catch (cause) { setNotice(cause instanceof Error ? cause.message : '连接保存失败，请检查浏览器存储后重试。'); return false; } setAdd(false); setNotice(''); if (merchantId !== merchantScope) setMerchantScope(merchantId); router.push(`${connectionUrl(connection.id, 'business')}&connected=1`); return true; }} />}
    {connection && confirm && <Modal title={confirm === 'revoke' ? '解除授权的影响' : confirm === 'authorize' ? '账号授权' : '停止接收新业务'} onClose={() => setConfirm(null)}><p className="mb-5 text-sm leading-6">{confirm === 'revoke' ? '这会阻断该账号下所有业务的同步与回传，包括在途单据。配置仍保留；请确认已知晓影响。' : confirm === 'authorize' ? '确认更新此账号的授权，保留现有业务配置。' : '停止接收新业务，保留配置和既有单据；在途跟踪与回传继续执行。'}</p><div className="flex justify-end gap-2"><button className={buttonClass} onClick={() => setConfirm(null)}>取消</button><button className={primaryClass} onClick={() => { if (!canManage) return; const next = confirm === 'revoke' || confirm === 'authorize' ? { ...connection, authorized: confirm === 'authorize' } : { ...connection, businesses: { ...connection.businesses, [confirm]: { ...connection.businesses[confirm]!, status: 'paused' as const } } }; if (update(next)) setConfirm(null); }}>确认{confirm === 'authorize' ? '授权' : ''}</button></div></Modal>}
  </div>;
}
