'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { buttonClass, primaryClass, inputClass, Field, Modal } from '@/components/amazon/amazon-ui';
import { useShellState } from '@/components/providers/shell-state-provider';
import { useOms } from '@/features/oms/provider';
import type { OmsSnapshot, WarehouseRecord } from '@/features/oms/types';
import { warehouseRecords, warehouseSuppliers, type WarehouseSupplier } from '@/features/oms/warehouse-config';
import { connectionStorageKey, parseConnections } from '@/lib/amazon-connections';
import { genericStorageKey, parseGenericConnections } from '@/lib/app-store';
import { warehouses as sharedWarehouses } from '@/lib/mock-data/warehouses';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { ALL_MERCHANTS_SCOPE, currentTenant, getMerchantsByCompany } from '@/lib/tenant-context';

const kindLabels = { local: '本地仓', virtual: '虚拟仓', platform: '第三方平台仓' };
type SupplierState = { suppliers: WarehouseSupplier[]; error: string };
type Row = { key: string; warehouse: Pick<WarehouseRecord, 'id' | 'code' | 'name' | 'country' | 'city' | 'address' | 'active' | 'binding'>; kind?: WarehouseRecord['kind']; snapshot?: OmsSnapshot; operator?: string };

function readSuppliers(snapshot: Pick<OmsSnapshot, 'companyId' | 'merchantId'>): SupplierState {
  try {
    return { suppliers: warehouseSuppliers(
      parseConnections(window.localStorage.getItem(connectionStorageKey(snapshot.companyId, snapshot.merchantId))),
      parseGenericConnections(window.localStorage.getItem(genericStorageKey(snapshot.companyId, snapshot.merchantId))),
    ), error: '' };
  } catch {
    return { suppliers: [], error: '无法读取该商家的 APP 连接数据。请检查 APP 配置或浏览器存储；本地仓和虚拟仓仍可保存，平台仓绑定暂不可保存。' };
  }
}

function matchesBinding(supplier: WarehouseSupplier, binding: NonNullable<WarehouseRecord['binding']>) {
  return supplier.appId === binding.appId && supplier.connectionId === binding.connectionId && supplier.capability === binding.capability && supplier.site === binding.site;
}

export function WarehouseCenter() {
  const { companyId, merchantScope } = useShellState();
  return <ScopedWarehouseCenter key={`${companyId}:${merchantScope}`} companyId={companyId} merchantScope={merchantScope} />;
}

function ScopedWarehouseCenter({ companyId, merchantScope }: { companyId: string; merchantScope: string }) {
  const { snapshots, ready, error: omsError, execute } = useOms();
  const [connections, setConnections] = useState<Record<string, SupplierState>>({});
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [editing, setEditing] = useState<{ snapshot: OmsSnapshot; warehouse?: WarehouseRecord } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const canWrite = hasCapability(currentSession.role, 'inventory:write');
  const aggregate = merchantScope === ALL_MERCHANTS_SCOPE;
  const merchants = getMerchantsByCompany(companyId);
  const visibleSnapshots = snapshots.filter(snapshot => snapshot.tenantId === currentTenant.id && snapshot.companyId === companyId && merchants.some(merchant => merchant.id === snapshot.merchantId) && (aggregate || snapshot.merchantId === merchantScope));
  const selectedSnapshot = aggregate ? undefined : visibleSnapshots.find(snapshot => snapshot.merchantId === merchantScope);
  const scopeKeys = JSON.stringify(visibleSnapshots.map(snapshot => ({ companyId: snapshot.companyId, merchantId: snapshot.merchantId })));

  useEffect(() => {
    const scopes = JSON.parse(scopeKeys) as Pick<OmsSnapshot, 'companyId' | 'merchantId'>[];
    function load() {
      const next = Object.fromEntries(scopes.map(scope => [scope.merchantId, readSuppliers(scope)]));
      setConnections(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    }
    load();
    const timer = window.setInterval(load, 1000);
    window.addEventListener('storage', load);
    window.addEventListener('amazon-connections-changed', load);
    window.addEventListener('app-connections-changed', load);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', load);
      window.removeEventListener('amazon-connections-changed', load);
      window.removeEventListener('app-connections-changed', load);
      window.removeEventListener('focus', load);
    };
  }, [scopeKeys]);

  const rows: Row[] = [
    ...sharedWarehouses.map(warehouse => ({ key: `sample:${warehouse.id}`, warehouse, operator: warehouse.operator })),
    ...visibleSnapshots.flatMap(snapshot => warehouseRecords(snapshot).map(warehouse => ({ key: `${snapshot.merchantId}:${warehouse.id}`, warehouse, kind: warehouse.kind, snapshot }))),
  ];
  const search = query.trim().toLowerCase();
  const filtered = rows.filter(row => {
    const binding = row.warehouse.binding;
    const supplier = binding && row.snapshot ? connections[row.snapshot.merchantId]?.suppliers.find(item => matchesBinding(item, binding)) : undefined;
    const merchant = merchants.find(item => item.id === row.snapshot?.merchantId)?.name ?? '';
    return (!kind || (kind === 'sample' ? !row.kind : row.kind === kind)) && `${row.warehouse.code} ${row.warehouse.name} ${row.warehouse.country} ${row.warehouse.city} ${row.warehouse.address} ${row.operator ?? ''} ${supplier?.name ?? ''} ${binding?.appId ?? ''} ${binding?.connectionId ?? ''} ${merchant}`.toLowerCase().includes(search);
  });

  return <section className="space-y-4">
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs leading-6 text-[var(--muted)]">
      <p>仓库资料供<Link href="/dashboard/inventory" className="text-[var(--primary)] hover:underline">库存</Link>与<Link href="/dashboard/orders" className="text-[var(--primary)] hover:underline">订单履约</Link>引用。共享仓库为只读样本，保留现有运营方，不代表已关联任何 APP。</p>
      <p>此处仅保存当前商家的本地业务配置，不调用真实仓储或 Amazon API，也不代表真实仓库或配送任务已创建。Amazon MCF 提供的是账号 / 站点级逻辑库存池，不是物理 FC。</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <input aria-label="搜索仓库" className={`${inputClass} sm:!w-72`} placeholder="搜索编码、名称、位置或供应商" value={query} onChange={event => setQuery(event.target.value)} />
        <select aria-label="仓库类型筛选" className={`${inputClass} !w-auto`} value={kind} onChange={event => setKind(event.target.value)}>
          <option value="">全部类型</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="sample">现有仓 / 共享样本</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Link className={buttonClass} href="/dashboard/apps?view=connections">管理 APP 供应商</Link>
        <button type="button" className={primaryClass} disabled={!canWrite || !ready || !selectedSnapshot || busy} onClick={() => { if (selectedSnapshot) { setEditing({ snapshot: selectedSnapshot }); setNotice(''); } }}>新增仓库</button>
      </div>
    </div>
    {aggregate && <p role="status" className="text-sm text-[var(--muted)]">当前展示各商家的仓库与共享样本；新增或编辑前，请先选择具体商家。</p>}
    {!canWrite && <p role="status" className="text-sm text-[var(--muted)]">当前角色没有 inventory:write 权限，仅可查看仓库。</p>}
    {!ready && <p role="status" className="text-sm text-[var(--muted)]">正在读取仓库配置…</p>}
    {ready && !aggregate && !selectedSnapshot && <p role="status" className="text-sm text-[var(--muted)]">当前商家数据不可用，暂不能新增仓库。</p>}
    {omsError && <p role="alert" className="text-sm text-[var(--danger)]">{omsError}</p>}
    {visibleSnapshots.map(snapshot => connections[snapshot.merchantId]?.error && <p key={snapshot.merchantId} role="alert" className="text-sm text-[var(--danger)]">{merchants.find(merchant => merchant.id === snapshot.merchantId)?.name ?? snapshot.merchantId}：{connections[snapshot.merchantId].error}</p>)}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr>{['仓库编码', '仓库名称', '类型', '位置', 'APP / 供应商', '绑定 / 状态', '操作'].map(title => <th key={title} className="whitespace-nowrap px-4 py-3 font-medium">{title}</th>)}</tr></thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">{filtered.map(row => {
          const warehouse = row.warehouse;
          const state = row.snapshot ? connections[row.snapshot.merchantId] : undefined;
          const binding = warehouse.binding;
          const supplier = binding ? state?.suppliers.find(item => matchesBinding(item, binding)) : undefined;
          const external = supplier?.externalWarehouses.find(item => item.id === binding?.externalWarehouseId);
          const bindingStatus = !binding ? row.snapshot ? '无 APP 绑定' : '共享样本 · 未关联 APP' : !state || state.error ? '连接状态未知' : !supplier ? '原连接 / 站点不可用，请检查 APP' : !supplier.canExecute || !external ? '未提供可关联仓库' : '已关联 · 本地配置';
          return <tr key={row.key}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{warehouse.code}</td>
            <td className="min-w-40 px-4 py-3"><p className="font-medium">{warehouse.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{row.snapshot ? merchants.find(merchant => merchant.id === row.snapshot?.merchantId)?.name ?? row.snapshot.merchantId : '共享只读样本'}</p></td>
            <td className="whitespace-nowrap px-4 py-3">{row.kind ? kindLabels[row.kind] : '现有仓 / 样本'}</td>
            <td className="min-w-40 px-4 py-3"><p>{[warehouse.country, warehouse.city].filter(Boolean).join(' / ') || binding?.site || '—'}</p>{warehouse.address && <p className="mt-1 text-xs text-[var(--muted)]">{warehouse.address}</p>}</td>
            <td className="min-w-40 px-4 py-3"><p>{supplier?.name ?? (binding ? `${binding.appId} · ${binding.connectionId}` : row.operator ? `样本运营方：${row.operator}` : '—')}</p>{binding && <p className="mt-1 text-xs text-[var(--muted)]">{external?.name ?? binding.externalWarehouseId} · {binding.site || '未指定站点'}</p>}</td>
            <td className="min-w-36 px-4 py-3"><p>{warehouse.active ? '启用' : '停用'}</p><p className="mt-1 text-xs text-[var(--muted)]">{bindingStatus}</p></td>
            <td className="whitespace-nowrap px-4 py-3">{row.snapshot ? <button type="button" className={buttonClass} disabled={aggregate || !canWrite || !ready || busy} onClick={() => { setEditing({ snapshot: row.snapshot!, warehouse: warehouse as WarehouseRecord }); setNotice(''); }}>编辑</button> : <span className="text-xs text-[var(--muted)]">只读</span>}</td>
          </tr>;
        })}{filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">没有符合条件的仓库。</td></tr>}</tbody>
      </table>
    </div>
    {editing && <WarehouseEditor snapshot={editing.snapshot} warehouse={editing.warehouse} supplierState={connections[editing.snapshot.merchantId]} canWrite={canWrite && !aggregate && ready} onClose={() => { if (!busy) setEditing(null); }} onSave={async warehouse => {
      setBusy(true);
      try {
        await execute(editing.snapshot.merchantId, { type: 'save_warehouse', warehouse });
        setEditing(null);
        setNotice('仓库配置已保存；未调用真实仓储或 Amazon API。');
      } finally { setBusy(false); }
    }} />}
  </section>;
}

type WarehouseForm = { id?: string; code: string; name: string; kind: WarehouseRecord['kind']; country: string; city: string; address: string; active: boolean; supplierId: string; externalWarehouseId: string };

function WarehouseEditor({ snapshot, warehouse, supplierState, canWrite, onClose, onSave }: { snapshot: OmsSnapshot; warehouse?: WarehouseRecord; supplierState?: SupplierState; canWrite: boolean; onClose: () => void; onSave: (warehouse: WarehouseRecord) => Promise<void> }) {
  const [form, setForm] = useState<WarehouseForm>(() => ({
    id: warehouse?.id, code: warehouse?.code ?? '', name: warehouse?.name ?? '', kind: warehouse?.kind ?? 'local', country: warehouse?.country ?? '', city: warehouse?.city ?? '', address: warehouse?.address ?? '', active: warehouse?.active ?? true,
    supplierId: warehouse?.binding ? supplierState?.suppliers.find(item => matchesBinding(item, warehouse.binding!))?.id ?? '' : '', externalWarehouseId: warehouse?.binding?.externalWarehouseId ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = supplierState?.suppliers.find(supplier => supplier.id === form.supplierId);
  const external = selected?.externalWarehouses.find(item => item.id === form.externalWarehouseId);
  const platformReady = !!supplierState && !supplierState.error;
  const invalid = !form.name.trim() || !form.code.trim() || (form.kind === 'local' && (!form.country.trim() || !form.city.trim() || !form.address.trim())) || (form.kind === 'platform' && (!platformReady || !selected?.canExecute || !external));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canWrite || invalid) return;
    setError('');
    setBusy(true);
    try {
      let binding: WarehouseRecord['binding'];
      if (form.kind === 'platform') {
        // Re-read the exact company/merchant scope immediately before saving.
        const fresh = readSuppliers(snapshot);
        if (fresh.error) throw new Error(fresh.error);
        const supplier = fresh.suppliers.find(item => item.id === form.supplierId);
        if (!supplier?.canExecute || !supplier.externalWarehouses.some(item => item.id === form.externalWarehouseId)) throw new Error('所选 APP 连接或仓库资源已不可用，请检查连接后重新选择。');
        binding = { appId: supplier.appId, connectionId: supplier.connectionId, capability: supplier.capability, externalWarehouseId: form.externalWarehouseId, site: supplier.site };
      }
      await onSave({ id: form.id ?? crypto.randomUUID(), code: form.code.trim(), name: form.name.trim(), kind: form.kind, country: form.country.trim(), city: form.city.trim(), address: form.address.trim(), active: form.active, ...(binding ? { binding } : {}) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重试。');
    } finally { setBusy(false); }
  }

  return <Modal title={warehouse ? '编辑仓库' : '新增仓库'} onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={save} className="space-y-4">
      <p className="text-xs leading-5 text-[var(--muted)]">配置仅属于当前商家。账号授权及凭证请在 APP 管理中维护；保存不调用真实接口。</p>
      <fieldset disabled={busy || !canWrite} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
        <Field label="仓库名称 *"><input autoFocus required maxLength={100} className={inputClass} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="仓库编码 *"><input required maxLength={64} className={inputClass} value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></Field>
        <Field label="仓库类型 *"><select aria-label="仓库类型 *" className={inputClass} value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value as WarehouseRecord['kind'], supplierId: '', externalWarehouseId: '' })}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value} disabled={value === 'platform' && !platformReady}>{label}</option>)}</select></Field>
        <Field label="仓库状态"><select aria-label="仓库状态" className={inputClass} value={form.active ? 'active' : 'inactive'} onChange={event => setForm({ ...form, active: event.target.value === 'active' })}><option value="active">启用</option><option value="inactive">停用</option></select></Field>
        <Field label={`国家${form.kind === 'local' ? ' *' : '（可选）'}`}><input required={form.kind === 'local'} maxLength={80} className={inputClass} value={form.country} onChange={event => setForm({ ...form, country: event.target.value })} /></Field>
        <Field label={`城市${form.kind === 'local' ? ' *' : '（可选）'}`}><input required={form.kind === 'local'} maxLength={100} className={inputClass} value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label={`详细地址${form.kind === 'local' ? ' *' : '（可选）'}`}><input required={form.kind === 'local'} maxLength={300} className={inputClass} value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /></Field></div>
        {form.kind === 'platform' && <>
          <div className="sm:col-span-2"><Field label="APP 仓库供应商 *"><select aria-label="APP 仓库供应商 *" required className={inputClass} value={form.supplierId} disabled={!platformReady} onChange={event => setForm({ ...form, supplierId: event.target.value, externalWarehouseId: '' })}><option value="">请选择当前商家已连接的仓库供应商</option>{supplierState?.suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.site ? ` · ${supplier.site}` : ''}{supplier.externalWarehouses.length === 0 ? ' · 未提供可关联仓库' : ''}</option>)}</select></Field></div>
          <div className="sm:col-span-2"><Field label="供应商外部仓库 *"><select aria-label="供应商外部仓库 *" required className={inputClass} value={form.externalWarehouseId} disabled={!platformReady || !selected?.canExecute || !selected.externalWarehouses.length} onChange={event => setForm({ ...form, externalWarehouseId: event.target.value })}><option value="">{selected && !selected.externalWarehouses.length ? '未提供可关联仓库' : '请选择供应商提供的仓库资源'}</option>{selected?.externalWarehouses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
        </>}
      </fieldset>
      {!platformReady && <p role="status" className="text-xs text-[var(--danger)]">{supplierState?.error || '正在读取 APP 连接，平台仓暂不可用；本地仓和虚拟仓可正常保存。'}</p>}
      {form.kind === 'platform' && platformReady && supplierState.suppliers.length === 0 && <p role="status" className="text-xs text-[var(--muted)]">暂无可用仓库供应商。请先在 <Link className="text-[var(--primary)] hover:underline" href="/dashboard/apps?view=connections">APP 连接管理</Link>中连接供应商并启用仓库能力。</p>}
      {form.kind === 'platform' && selected && (!selected.canExecute || !selected.externalWarehouses.length) && <p role="status" className="text-xs text-[var(--muted)]">未提供可关联仓库。该 APP 当前仅支持连接管理，不能保存为可执行的平台仓绑定。</p>}
      {form.kind === 'platform' && warehouse?.binding && !selected && <p role="status" className="text-xs text-[var(--muted)]">原绑定：{warehouse.binding.appId} · {warehouse.binding.connectionId} · {warehouse.binding.site}。请重新选择可用供应商；仓库 ID 将保持不变。</p>}
      {form.kind === 'platform' && selected?.capability === 'mcf' && <p className="text-xs leading-5 text-[var(--muted)]">Amazon MCF 关联的是该账号 / 站点的 FBA 逻辑库存池，不是物理 FC，也不会创建真实 Amazon 仓库。</p>}
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={onClose}>取消</button><button type="submit" className={primaryClass} disabled={busy || !canWrite || invalid}>{busy ? '保存中…' : '保存仓库'}</button></div>
    </form>
  </Modal>;
}
