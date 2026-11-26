'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { useAmazonConnections } from '@/components/amazon/use-amazon-connections';
import { buttonClass, inputClass, primaryClass } from '@/components/amazon/amazon-ui';
import type { BusinessId, Connection, ProductMapping } from '@/lib/amazon-connections';
import { channelSkuMappingsChangedEvent, platformProducts, readChannelSkuMappings, saveChannelSkuMappings } from '@/lib/channel-sku-mappings';
import { mockProducts } from '@/lib/mock-data/products';
import { companies, currentUserRole, getMerchantsByCompany } from '@/lib/tenant-context';
import { hasCapability } from '@/lib/permissions';

const variants = mockProducts.flatMap(product => product.variants.map(variant => ({ ...variant, title: product.title })));
const sitesByRegion: Record<string, string[]> = { NA: ['US', 'CA', 'MX'], EU: ['UK', 'DE', 'FR'], FE: ['JP', 'AU', 'SG'] };

export function ChannelSkuMappingPage() {
  return <Suspense fallback={<p className="p-5 text-sm text-[var(--muted)]">正在读取商品映射…</p>}><MappingPage /></Suspense>;
}

function MappingPage() {
  const params = useSearchParams();
  const { companyId, merchantScope, setCompanyId, setMerchantScope } = useShellState();
  const { connections, ready, error } = useAmazonConnections();
  const requestedConnection = params.get('amazonConnection') ?? '';
  const requestedBusiness = params.get('amazonBusiness') ?? '';
  const requestedSite = params.get('site') ?? '';
  const [selection, setSelection] = useState<{ scope: string; connection: string; site: string } | null>(null);
  const scope = `${companyId}:${merchantScope}`;
  const selectedConnection = selection?.scope === scope ? selection.connection : requestedConnection || connections[0]?.id || '';
  const connection = connections.find(c => c.id === selectedConnection);
  const sites = connection ? sitesByRegion[connection.region] ?? [] : [];
  const selectedSite = selection?.scope === scope && selection.connection === selectedConnection ? selection.site : requestedSite || connection?.businesses[requestedBusiness as BusinessId]?.site || sites[0] || '';
  const validSite = sites.includes(selectedSite);
  const contextual = requestedConnection && requestedBusiness && connection?.id === requestedConnection;
  const requestedReturn = params.get('returnTo');
  const orderReturn = requestedReturn?.startsWith('/dashboard/orders?') || requestedReturn?.startsWith('/dashboard/orders/') || requestedReturn?.startsWith('/dashboard/vendor-orders?') || requestedReturn?.startsWith('/dashboard/vendor-orders/') ? requestedReturn : '';
  const returnHref = orderReturn || (contextual ? `/dashboard/apps/amazon?${new URLSearchParams({ connection: requestedConnection, business: requestedBusiness, configure: '1' })}` : '');
  const merchantOptions = getMerchantsByCompany(companyId);
  return <div className="mx-auto max-w-[1200px] space-y-5 pt-5 text-[var(--foreground)] lg:pt-6">
    <header><h1 className="text-[22px] font-semibold tracking-tight">商品映射</h1><p className="mt-1 text-[13px] text-[var(--muted)]">按公司、商户、渠道连接与站点维护渠道 SKU 对应关系，同一连接与站点的所有业务共用。</p></header>
    <section aria-label="映射范围" className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-[13px]">
      <label className="space-y-1"><span className="block text-xs text-[var(--muted)]">公司</span><select aria-label="映射公司" className={inputClass} value={companyId} onChange={e => { setSelection(null); setCompanyId(e.target.value); }}>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="space-y-1"><span className="block text-xs text-[var(--muted)]">商户</span><select aria-label="映射商户" className={inputClass} value={merchantScope} onChange={e => { setSelection(null); setMerchantScope(e.target.value); }}><option value="all">全部商户</option>{merchantOptions.map(m => <option key={m.id} value={m.id}>{m.name} · {m.channel}</option>)}</select></label>
      <label className="space-y-1"><span className="block text-xs text-[var(--muted)]">Amazon 连接</span><select aria-label="映射连接" className={inputClass} value={selectedConnection} onChange={e => { const next = connections.find(c => c.id === e.target.value); setSelection({ scope, connection: e.target.value, site: sitesByRegion[next?.region ?? '']?.[0] ?? '' }); }}><option value="">请选择连接</option>{connections.map(c => <option key={c.id} value={c.id}>{c.name} · {c.identity === 'seller' ? 'Seller' : 'Vendor'}</option>)}</select></label>
      <label className="space-y-1"><span className="block text-xs text-[var(--muted)]">站点</span><select aria-label="映射站点" className={inputClass} value={selectedSite} onChange={e => setSelection({ scope, connection: selectedConnection, site: e.target.value })}>{!validSite && <option value={selectedSite}>{selectedSite || '请选择站点'}</option>}{sites.map(site => <option key={site} value={site}>{site}</option>)}</select></label>
    </section>
    {returnHref && <Link href={returnHref} className="inline-block text-[13px] text-[var(--primary)] hover:underline">{orderReturn ? '返回原订单继续处理' : '返回 Amazon 业务配置'}</Link>}
    {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : !ready ? <p className="text-sm text-[var(--muted)]">正在读取连接…</p> : !connection || !validSite ? <p role={requestedConnection ? 'alert' : 'status'} className="text-sm text-[var(--muted)]">{requestedConnection ? '请求的连接或站点不在当前范围，请检查公司、商户与连接选择。' : '请选择有 Amazon 连接的商户，再选择连接与站点。'}</p> : <MappingEditor key={`${scope}:${connection.id}:${selectedSite}`} companyId={companyId} merchantId={merchantScope} connection={connection} site={selectedSite} />}
    <section><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Shopify / SHEIN 商品资料参考</h2><p className="mt-1 text-xs text-[var(--muted)]">以下为商品中心已有的只读渠道标识，不在此编辑。</p></div><Link href="/dashboard/products" className="text-[13px] text-[var(--primary)] hover:underline">前往商品中心</Link></div><div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]"><table className="w-full text-left text-[13px]"><thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr>{['商品', 'OMS SKU', '渠道', '渠道 SKU'].map(title => <th key={title} className="px-4 py-3 font-medium">{title}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{mockProducts.flatMap(product => product.variants.flatMap(variant => Object.entries(variant.channelSkus ?? {}).filter(([channel]) => channel === 'Shopify' || channel === 'SHEIN').map(([channel, sku]) => <tr key={`${variant.id}:${channel}`}><td className="px-4 py-3">{product.title}</td><td className="px-4 py-3 font-mono">{variant.sku}</td><td className="px-4 py-3">{channel}</td><td className="px-4 py-3 font-mono">{sku}</td></tr>)))}</tbody></table></div></section>
  </div>;
}

function MappingEditor({ companyId, merchantId, connection, site }: { companyId: string; merchantId: string; connection: Connection; site: string }) {
  const [mappings, setMappings] = useState<ProductMapping[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canManage = hasCapability(currentUserRole, 'apps:manage');
  useEffect(() => {
    const load = () => {
      try { setMappings(readChannelSkuMappings(companyId, merchantId, connection, site)); setError(''); setNotice(''); }
      catch (err) { setMappings(null); setError(err instanceof Error ? err.message : '无法读取商品映射，原数据已保留。'); }
    };
    load();
    window.addEventListener('storage', load);
    window.addEventListener(channelSkuMappingsChangedEvent, load);
    return () => { window.removeEventListener('storage', load); window.removeEventListener(channelSkuMappingsChangedEvent, load); };
  }, [companyId, merchantId, connection, site]);
  const rows = platformProducts.map(product => ({ ...product, externalSku: connection.identity === 'vendor' ? product.vendorSku : product.externalSku }));
  const extra = mappings?.filter(mapping => !rows.some(row => row.externalSku === mapping.externalSku)) ?? [];
  const allRows = [...rows, ...extra.map(mapping => ({ ...mapping, name: '已有渠道 SKU', omsSku: '' }))];
  const mapped = allRows.filter(row => variants.some(v => v.id === mappings?.find(m => m.externalSku === row.externalSku)?.omsVariantId)).length;
  function save() {
    if (!canManage || !mappings) return;
    try { saveChannelSkuMappings(companyId, merchantId, connection, site, mappings); setError(''); setNotice('商品映射已保存，同一连接与站点的业务将使用此对应关系。'); }
    catch (err) { setError(err instanceof Error ? err.message : '保存失败，请检查浏览器存储权限。'); setNotice(''); }
  }
  return <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-[13px]">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{connection.name} / {site} · {connection.identity === 'vendor' ? 'Vendor 商品标识' : 'Seller SKU'}</h2><p className="mt-1 text-xs text-[var(--muted)]">{mapped} / {allRows.length} 已匹配。修改后请保存；未匹配商品不会自动履约。</p></div><div className="flex gap-2"><button type="button" className={buttonClass} disabled={!canManage || !mappings} onClick={() => { if (!mappings) return; const next = [...mappings]; for (const row of rows) { const existing = next.findIndex(m => m.externalSku === row.externalSku); if (existing >= 0 && variants.some(v => v.id === next[existing].omsVariantId)) continue; const variant = variants.find(v => v.sku === row.omsSku); if (variant) { const mapping = { externalSku: row.externalSku, omsVariantId: variant.id, asin: row.asin, fnsku: row.fnsku }; if (existing >= 0) next[existing] = mapping; else next.push(mapping); } } setMappings(next); setNotice('已按商品资料匹配，请保存。'); }}>按商品资料匹配</button><button type="button" className={primaryClass} disabled={!canManage || !mappings || Boolean(error)} onClick={save}>保存映射</button></div></div>
    {!canManage && <p className="mb-3 text-xs text-[var(--muted)]">当前角色无应用配置权限，仅可查看。</p>}
    {error && <p role="alert" className="mb-3 text-[var(--danger)]">无法读取或保存商品映射：{error} 未清除任何已有数据。</p>}
    {notice && <p role="status" className="mb-3 text-[var(--muted)]">{notice}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="border-b border-[var(--border)] text-[var(--muted)]"><tr>{['渠道商品 / SKU', 'ASIN / FNSKU', 'OMS SKU', '状态'].map(title => <th key={title} className="px-3 py-3 font-medium">{title}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{allRows.map(row => { const mapping = mappings?.find(m => m.externalSku === row.externalSku); const valid = variants.some(v => v.id === mapping?.omsVariantId); return <tr key={row.externalSku}><td className="px-3 py-3"><p className="font-mono font-medium">{row.externalSku}</p><p className="mt-1 text-[var(--muted)]">{row.name}</p></td><td className="px-3 py-3 font-mono">{mapping?.asin ?? row.asin ?? '—'}<br />{mapping?.fnsku ?? row.fnsku ?? '—'}</td><td className="px-3 py-3"><select aria-label={`${row.externalSku} 对应 OMS SKU`} className={`${inputClass} min-w-52`} disabled={!canManage || !mappings || Boolean(error)} value={mapping?.omsVariantId ?? ''} onChange={e => { const remaining = (mappings ?? []).filter(m => m.externalSku !== row.externalSku); setMappings(e.target.value ? [...remaining, { ...mapping, externalSku: row.externalSku, omsVariantId: e.target.value, asin: mapping?.asin ?? row.asin, fnsku: mapping?.fnsku ?? row.fnsku }] : remaining); setNotice('对应关系已修改，请保存。'); }}>{mapping && !valid && <option value={mapping.omsVariantId}>无效商品 · {mapping.omsVariantId}</option>}<option value="">暂不匹配</option>{variants.map(v => <option key={v.id} value={v.id}>{v.sku} · {v.title}</option>)}</select></td><td className="px-3 py-3 text-[var(--muted)]">{valid ? '已匹配' : '待匹配'}</td></tr>; })}</tbody></table></div>
  </section>;
}
