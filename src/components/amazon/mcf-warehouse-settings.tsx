'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { buttonClass, primaryClass, inputClass, Field, Panel } from '@/components/amazon/amazon-ui';
import { useOms } from '@/features/oms/provider';
import type { OmsSnapshot } from '@/features/oms/types';
import { connectionStorageKey, parseConnections, type Connection } from '@/lib/amazon-connections';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { ALL_MERCHANTS_SCOPE, currentTenant } from '@/lib/tenant-context';

const isEligible = (connection: Connection) => connection.identity === 'seller' && connection.authorized && connection.businesses.mcf?.status === 'enabled' && Boolean(connection.businesses.mcf.site.trim());

export function McfWarehouseSettings() {
  const { companyId, merchantScope } = useShellState();
  const { snapshots, ready, error } = useOms();
  const snapshot = merchantScope === ALL_MERCHANTS_SCOPE ? undefined : snapshots.find(item => item.tenantId === currentTenant.id && item.companyId === companyId && item.merchantId === merchantScope);

  return <div className="mb-5"><Panel title="Amazon MCF · 外部履约仓">
    <p className="mb-4 text-xs leading-5 text-[var(--muted)]">将当前商家的外部履约仓关联到已授权的 Amazon Seller 账号。类型固定为外部履约仓，服务固定为 Amazon MCF；授权和凭证只在 APP 配置中管理。本页仅保存本地业务配置，不调用真实 Amazon 接口，也不代表真实仓库或配送任务已创建。</p>
    {merchantScope === ALL_MERCHANTS_SCOPE ? <p role="status" className="text-sm">请先在左侧选择具体商家，再查看或创建 MCF 外部履约仓。</p> : !ready || !snapshot ? <p role="status" className="text-sm">{error || '正在读取当前商家的 OMS 数据…'}</p> : <ScopedMcfSettings key={`${snapshot.tenantId}:${snapshot.companyId}:${snapshot.merchantId}`} snapshot={snapshot} />}
  </Panel></div>;
}

function ScopedMcfSettings({ snapshot }: { snapshot: OmsSnapshot }) {
  const { execute } = useOms();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [ready, setReady] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [form, setForm] = useState<{ id?: string; name: string; code: string; connectionId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const key = connectionStorageKey(snapshot.companyId, snapshot.merchantId);
  const canWrite = hasCapability(currentSession.role, 'inventory:write');
  const eligible = connections.filter(isEligible);
  const selected = eligible.find(connection => connection.id === form?.connectionId);
  const warehouses = (snapshot.fulfillmentWarehouses ?? []).filter(warehouse => warehouse.app === 'amazon' && warehouse.capability === 'mcf');

  useEffect(() => {
    function load() {
      try {
        const next = parseConnections(window.localStorage.getItem(key));
        setConnections(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
        setConnectionError('');
        setReady(true);
      } catch {
        setReady(false);
        setConnections([]);
        setConnectionError('无法读取当前商家的 Amazon 连接数据。请检查 APP 配置或浏览器存储；当前不允许保存。');
      }
    }
    load();
    const timer = window.setInterval(load, 800);
    window.addEventListener('storage', load);
    window.addEventListener('amazon-connections-changed', load);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', load);
      window.removeEventListener('amazon-connections-changed', load);
      window.removeEventListener('focus', load);
    };
  }, [key]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || busy || !canWrite || !ready) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      // Recheck this snapshot's exact scope, not the shell's possibly changed selection.
      const connection = parseConnections(window.localStorage.getItem(key)).find(item => item.id === form.connectionId && isEligible(item));
      if (!connection) throw new Error('所选连接授权已失效或 MCF 未启用，请前往 APP 配置检查。');
      const name = form.name.trim();
      const code = form.code.trim();
      if (!name || !code) throw new Error('请填写仓库名称和编码。');
      if (warehouses.some(warehouse => warehouse.id !== form.id && warehouse.code.toLowerCase() === code.toLowerCase())) throw new Error('当前商家已有相同编码的 MCF 外部履约仓。');
      await execute(snapshot.merchantId, { type: 'bind_mcf_warehouse', warehouse: { id: form.id ?? crypto.randomUUID(), code, name, app: 'amazon', capability: 'mcf', connectionId: connection.id, site: connection.businesses.mcf!.site, active: true } });
      setForm(null);
      setNotice('MCF 外部履约仓配置已保存；未调用真实 Amazon 接口。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，未确认配置生效，请重试。');
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[var(--muted)]">仅展示当前商家的配置，不会默认创建仓库绑定。</p>
      <div className="flex flex-wrap gap-2"><Link className={buttonClass} href="/dashboard/apps/amazon">前往 Amazon APP 配置</Link><button type="button" className={primaryClass} disabled={!canWrite || !ready || eligible.length === 0 || busy} onClick={() => { setForm({ name: '', code: '', connectionId: '' }); setNotice(''); setError(''); }}>创建 MCF 外部履约仓</button></div>
    </div>
    {!canWrite && <p role="status" className="text-sm text-[var(--muted)]">当前角色没有 inventory:write 权限，仅可查看配置。</p>}
    {connectionError ? <p role="alert" className="text-sm text-[var(--danger)]">{connectionError}</p> : !ready ? <p role="status" className="text-sm text-[var(--muted)]">正在读取当前商家的 Amazon 连接…</p> : eligible.length === 0 && <p role="status" className="rounded-md border border-[var(--border)] p-3 text-sm">没有可用的 MCF 连接。请前往 <Link href="/dashboard/apps/amazon" className="text-[var(--primary)] hover:underline">Amazon APP 配置</Link>，连接并授权 Seller 账号、启用 MCF 和选择站点后返回。这里不能手工填写店铺 ID 或授权凭证。</p>}
    {form && <form onSubmit={save} className="space-y-4 rounded-md border border-[var(--border)] p-4">
      <h3 className="text-sm font-semibold">{form.id ? '编辑' : '创建'} MCF 外部履约仓</h3>
      <p className="text-xs text-[var(--muted)]">仓库类型：外部履约仓 · 履约服务：Amazon MCF</p>
      <fieldset disabled={!canWrite || !ready || busy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
        <Field label="仓库名称"><input required maxLength={100} className={inputClass} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="仓库编码"><input required maxLength={64} className={inputClass} value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></Field>
        <Field label="Amazon Seller 连接"><select aria-label="Amazon Seller 连接" required className={inputClass} value={form.connectionId} onChange={event => setForm({ ...form, connectionId: event.target.value })}><option value="">请选择已授权且 MCF 已启用的连接</option>{form.connectionId && !selected && <option value={form.connectionId} disabled>原连接已不可用，请重新选择</option>}{eligible.map(connection => <option key={connection.id} value={connection.id}>{connection.name} · {connection.accountId || connection.id}</option>)}</select></Field>
        <Field label="站点（来自所选连接的 MCF 配置）"><input readOnly className={inputClass} value={selected?.businesses.mcf?.site ?? ''} placeholder="选择连接后自动显示" /></Field>
      </fieldset>
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={buttonClass} onClick={() => { setForm(null); setError(''); }}>取消</button><button type="submit" className={primaryClass} disabled={!canWrite || !ready || busy || !selected || !form.name.trim() || !form.code.trim()}>{busy ? '保存中…' : '保存配置'}</button></div>
    </form>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <div className="overflow-x-auto rounded-md border border-[var(--border)]"><table className="w-full text-left text-[13px]">
      <thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr>{['名称 / 编码', '类型 / 服务', '服务账号', '站点', '配置 / 授权状态', '操作'].map(title => <th key={title} className="whitespace-nowrap px-4 py-3 font-medium">{title}</th>)}</tr></thead>
      <tbody className="divide-y divide-[var(--border-subtle)]">{warehouses.map(warehouse => {
        const connection = connections.find(item => item.id === warehouse.connectionId);
        const status = !ready ? '授权状态未知' : !connection ? '连接不存在' : connection.identity !== 'seller' ? '账号身份不匹配' : !connection.authorized ? '授权已失效' : connection.businesses.mcf?.status !== 'enabled' ? 'MCF 未启用' : connection.businesses.mcf.site !== warehouse.site ? 'MCF 站点已变更，请检查绑定' : '已授权 · MCF 已启用';
        return <tr key={warehouse.id}><td className="px-4 py-3"><p className="font-medium">{warehouse.name}</p><p className="mt-1 font-mono text-xs text-[var(--muted)]">{warehouse.code}</p></td><td className="px-4 py-3">外部履约仓 / Amazon MCF</td><td className="px-4 py-3"><p>{connection?.name ?? warehouse.connectionId}</p>{connection?.accountId && <p className="mt-1 text-xs text-[var(--muted)]">{connection.accountId}</p>}</td><td className="px-4 py-3">{warehouse.site}</td><td className="px-4 py-3"><p>{warehouse.active ? '启用' : '停用'}</p><p className="mt-1 text-xs text-[var(--muted)]">{status}</p></td><td className="px-4 py-3"><button type="button" className={buttonClass} disabled={!canWrite || !ready || busy} onClick={() => { setForm({ id: warehouse.id, name: warehouse.name, code: warehouse.code, connectionId: warehouse.connectionId }); setNotice(''); setError(''); }}>编辑</button></td></tr>;
      })}{warehouses.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">尚未配置 MCF 外部履约仓，请按需创建。</td></tr>}</tbody>
    </table></div>
  </div>;
}
