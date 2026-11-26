'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAmazonConnections } from '@/components/amazon/use-amazon-connections';
import { useShellState } from '@/components/providers/shell-state-provider';
import { businessDefinitions, type BusinessId } from '@/lib/amazon-connections';
import { hasCapability } from '@/lib/permissions';
import { currentUserRole } from '@/lib/tenant-context';
import { mockProducts } from '@/lib/mock-data/products';
import { warehouses } from '@/lib/mock-data/warehouses';
import { systemCarriers } from '@/lib/mock-data/carriers';

export type AmazonMappingKind = 'product' | 'warehouse' | 'carrier';
export type AmazonMappingReadiness = {
  product: boolean;
  warehouse: boolean;
  carrier: boolean;
  productId?: string;
  warehouseId?: string;
  carrierId?: string;
  externalIdentifier?: string;
  asin?: string;
  fnsku?: string;
  externalWarehouse?: string;
  externalCarrier?: string;
};
export const amazonMappingReadinessKey = (companyId: string, merchantScope: string, connectionId: string, businessId: string) =>
  `amazon-oms-readiness-v1:${companyId}:${merchantScope}:${connectionId}:${businessId}`;

export function parseAmazonMappingReadiness(raw: string | null): AmazonMappingReadiness {
  if (!raw) return { product: false, warehouse: false, carrier: false };
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('映射确认数据格式无效');
  const record = data as Record<string, unknown>;
  if (['product', 'warehouse', 'carrier'].some(key => typeof record[key] !== 'boolean') ||
      ['productId', 'warehouseId', 'carrierId'].some(key => record[key] !== undefined && typeof record[key] !== 'string')) {
    throw new Error('映射确认数据格式无效');
  }
  return data as AmazonMappingReadiness;
}

const modules: { kind: AmazonMappingKind; title: string; href: string }[] = [
  { kind: 'product', title: '商品映射', href: '/dashboard/product-mapping' },
  { kind: 'warehouse', title: '仓库映射', href: '/dashboard/warehouses' },
  { kind: 'carrier', title: '承运商映射', href: '/dashboard/carriers/mapping' },
];
const selectedFields = { product: 'productId', warehouse: 'warehouseId', carrier: 'carrierId' } as const;
const options = {
  product: mockProducts.flatMap(product => product.variants.map(variant => ({ id: variant.id, label: `${variant.sku} · ${product.title}` }))),
  warehouse: warehouses.filter(warehouse => warehouse.active).map(warehouse => ({ id: warehouse.id, label: `${warehouse.code} · ${warehouse.name}` })),
  carrier: systemCarriers.filter(carrier => carrier.status === '启用').map(carrier => ({ id: carrier.id, label: `${carrier.code} · ${carrier.name}` })),
};

/** Contextual confirmation only: references shared entities, never creates master data. */
export function AmazonMappingContext({ kind }: { kind: AmazonMappingKind }) {
  return <Suspense fallback={null}><MappingQuery kind={kind} /></Suspense>;
}

function MappingQuery({ kind }: { kind: AmazonMappingKind }) {
  const params = useSearchParams();
  const { companyId, merchantScope } = useShellState();
  const connectionId = params.get('amazonConnection');
  const businessId = params.get('amazonBusiness');
  if (!connectionId || !businessId) return null;
  return <MappingPanel key={`${companyId}:${merchantScope}:${connectionId}:${businessId}:${kind}`} kind={kind} companyId={companyId} merchantScope={merchantScope} connectionId={connectionId} businessId={businessId} />;
}

function MappingPanel({ kind, companyId, merchantScope, connectionId, businessId }: {
  kind: AmazonMappingKind; companyId: string; merchantScope: string; connectionId: string; businessId: string;
}) {
  const { connections, ready, error: connectionError } = useAmazonConnections();
  const connection = connections.find(item => item.id === connectionId);
  const business = businessDefinitions.find(item => item.id === businessId && item.identity === connection?.identity);
  const key = amazonMappingReadinessKey(companyId, merchantScope, connectionId, businessId);
  const [readiness, setReadiness] = useState<AmazonMappingReadiness | null>(null);
  const [selected, setSelected] = useState('');
  const [external, setExternal] = useState('');
  const [asin, setAsin] = useState('');
  const [fnsku, setFnsku] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const field = selectedFields[kind];
  const module = modules.find(item => item.kind === kind)!;
  const returnHref = `/dashboard/apps/amazon?${new URLSearchParams({ connection: connectionId, business: businessId, configure: '1', step: '2' })}`;
  const query = new URLSearchParams({ amazonConnection: connectionId, amazonBusiness: businessId, returnTo: 'amazon' });
  const canManage = hasCapability(currentUserRole, 'apps:manage');
  const validContext = Boolean(ready && connection?.authorized && business && connection.businesses[businessId as BusinessId]);
  const validSelection = options[kind].some(option => option.id === selected);

  useEffect(() => {
    try {
      const stored = parseAmazonMappingReadiness(window.localStorage.getItem(key));
      setReadiness(stored);
      setSelected(stored[field] ?? '');
      setExternal((kind === 'product' ? stored.externalIdentifier : kind === 'warehouse' ? stored.externalWarehouse : stored.externalCarrier) ?? '');
      setAsin(stored.asin ?? '');
      setFnsku(stored.fnsku ?? '');
    } catch {
      setError('无法读取本地映射确认。请检查浏览器存储；为保护原数据，当前不允许保存。');
    }
  }, [key, field]);

  function save() {
    if (!validContext || !canManage || !validSelection || !readiness || !external.trim()) return;
    try {
      // Re-read before merging so confirming one module never clears another module's confirmation.
      const current = parseAmazonMappingReadiness(window.localStorage.getItem(key));
      const next = { ...current, [kind]: true, [field]: selected, ...(kind === 'product' ? { externalIdentifier: external.trim(), asin: asin.trim(), fnsku: fnsku.trim() } : kind === 'warehouse' ? { externalWarehouse: external.trim() } : { externalCarrier: external.trim() }) };
      window.localStorage.setItem(key, JSON.stringify(next));
      setReadiness(next);
      setError('');
      setNotice('映射已保存，可返回继续配置。');
      window.dispatchEvent(new Event('amazon-mapping-readiness-changed'));
    } catch {
      setError('保存失败，请检查浏览器存储权限或映射确认数据。尚未更新确认状态。');
      setNotice('');
    }
  }

  return <section aria-label="Amazon 业务映射" className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-[13px] text-[var(--foreground)]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold">Amazon 配置 · {module.title}</h2><p className="mt-1 text-[12px] text-[var(--muted)]">{connection?.name ?? connectionId} / {business?.name ?? businessId} · {connection?.businesses[businessId as BusinessId]?.site || '站点待配置'}</p></div>
      <Link href={returnHref} className="text-[var(--primary)] hover:underline">返回 Amazon 业务配置</Link>
    </div>
    <p className="my-3 text-[12px] text-[var(--muted)]">关联 OMS 内部资料与 Amazon 外部标识。映射仅作用于当前商家、账号和业务。</p>
    {connectionError ? <p role="alert" className="mb-3 text-[var(--danger)]">{connectionError}</p> : !ready ? <p className="mb-3 text-[var(--muted)]">正在读取当前公司 / 商户的连接…</p> : !validContext ? <p role="alert" className="mb-3 text-[var(--danger)]">当前范围没有可配置的授权连接或业务草稿，请返回 Amazon 配置检查。</p> : null}
    {!canManage && <p className="mb-3 text-[var(--muted)]">当前角色没有应用配置权限，仅可查看。</p>}
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1 space-y-1 sm:max-w-xl"><span className="block text-[12px] text-[var(--muted)]">选择已有{kind === 'product' ? '商品 SKU' : kind === 'warehouse' ? '启用仓库' : '启用承运商'}</span>
        <select value={selected} onChange={event => { setSelected(event.target.value); setNotice(''); }} disabled={!validContext || !canManage || !readiness} className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 disabled:opacity-50">
          <option value="">请选择已有资料</option>{options[kind].map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="min-w-0 flex-1 space-y-1 sm:max-w-xs"><span className="block text-[12px] text-[var(--muted)]">{kind === 'product' ? connection?.identity === 'vendor' ? 'Vendor 商品标识' : 'Seller SKU' : kind === 'warehouse' ? businessId === 'df' ? 'DF Warehouse ID' : '外部发货节点代码' : 'Amazon 承运商代码'}</span><input aria-label="外部标识" value={external} onChange={(event) => setExternal(event.target.value)} disabled={!validContext || !canManage} className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2" /></label>
      {kind === 'product' && <><label className="space-y-1"><span className="block text-xs text-[var(--muted)]">ASIN</span><input value={asin} onChange={(event) => setAsin(event.target.value)} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2" /></label><label className="space-y-1"><span className="block text-xs text-[var(--muted)]">FNSKU（FBA 商品）</span><input value={fnsku} onChange={(event) => setFnsku(event.target.value)} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2" /></label></>}
      <button type="button" onClick={save} disabled={!validContext || !canManage || !validSelection || !readiness || !external.trim()} className="h-9 rounded-md bg-[var(--primary)] px-3 font-medium text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-40">保存映射</button>
    </div>
    {readiness?.[kind] && readiness[field] === selected && validSelection && <p className="mt-2 text-[12px] text-[var(--muted)]">当前映射已生效。</p>}
    {error && <p role="alert" className="mt-2 text-[var(--danger)]">{error}</p>}
    {notice && <p role="status" className="mt-2 text-[var(--muted)]">{notice}</p>}
    <nav aria-label="继续配置其他映射" className="mt-3 flex flex-wrap gap-4 text-[12px] text-[var(--primary)]">{modules.filter(item => item.kind !== kind).map(item => <Link key={item.kind} href={`${item.href}?${query}`} className="hover:underline">前往{item.title}</Link>)}</nav>
  </section>;
}
