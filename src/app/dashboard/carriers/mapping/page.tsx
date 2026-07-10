'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Save, X, Check } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';
import {
  systemCarriers,
  carrierMappings,
  connectedSystems,
  type CarrierMapping,
} from '@/lib/mock-data/carriers';

/**
 * 渠道承运商映射总览页
 * 一个大表格展示所有平台承运商 → 系统承运商的映射关系
 * 商户可以快速看到哪些还没映射、直接行内编辑
 */
export default function CarrierMappingPage() {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const platforms = useMemo(() => {
    const set = new Set(carrierMappings.map((m) => m.sourceSystem));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    let data = [...carrierMappings];
    if (platformFilter) data = data.filter((m) => m.sourceSystem === platformFilter);
    if (statusFilter) data = data.filter((m) => m.mappingStatus === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (m) =>
          m.externalName.toLowerCase().includes(q) ||
          (m.mappedCode || '').toLowerCase().includes(q) ||
          m.systemCarrierName.toLowerCase().includes(q)
      );
    }
    return data;
  }, [search, platformFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: carrierMappings.length,
    mapped: carrierMappings.filter((m) => m.mappingStatus === '已映射').length,
    unmapped: carrierMappings.filter((m) => m.mappingStatus === '未映射').length,
  }), []);

  return (
    <div className="mx-auto max-w-[1200px] pt-5 lg:pt-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">渠道承运商映射</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
          管理各电商平台上的承运商名称与系统内部承运商的对应关系。未映射的会导致订单无法自动匹配承运商。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[11px] text-[var(--muted)]">总映射</p>
          <p className="text-[20px] font-semibold text-[var(--foreground)]">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[11px] text-[var(--muted)]">已映射</p>
          <p className="text-[20px] font-semibold text-green-600">{stats.mapped}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[11px] text-[var(--muted)]">未映射</p>
          <p className="text-[20px] font-semibold text-orange-500">{stats.unmapped}</p>
        </div>
      </div>

      {/* 表格卡片 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
        {/* 工具栏 */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索承运商名称/代码..."
                className="h-8 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 text-[12px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
              />
            </div>
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none">
              <option value="">全部平台</option>
              {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none">
              <option value="">全部状态</option>
              <option value="已映射">已映射</option>
              <option value="未映射">未映射</option>
            </select>
          </div>
          <button onClick={() => setShowAdd(true)} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90">
            <Plus className="inline size-3.5 mr-1" />新增映射
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-2.5 text-left">渠道承运商名称</th>
                <th className="px-5 py-2.5 text-left">渠道代码</th>
                <th className="px-5 py-2.5 text-left">→ 系统承运商</th>
                <th className="px-5 py-2.5 text-left">来源平台</th>
                <th className="px-5 py-2.5 text-left">映射状态</th>
                <th className="px-5 py-2.5 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((row) => (
                <MappingRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-2.5 text-[11px] text-[var(--muted)]">
          <span>共 {filtered.length} 条</span>
          <span>第 1 / 1 页 · 每页 20 条</span>
        </div>
      </div>

      {/* 新增映射弹窗 */}
      {showAdd && <AddMappingModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

/** 映射行 — 支持行内编辑 */
function MappingRow({ row }: { row: CarrierMapping }) {
  const [editing, setEditing] = useState(false);
  const [mappedCarrier, setMappedCarrier] = useState(row.systemCarrierName || '');

  const handleSave = () => {
    alert(`映射已更新: "${row.externalName}" → ${mappedCarrier}`);
    setEditing(false);
  };

  return (
    <tr className="group hover:bg-[var(--surface-subtle)]">
      <td className="px-5 py-3 font-medium text-[var(--foreground)]">{row.externalName}</td>
      <td className="px-5 py-3 font-mono text-[var(--muted)]">{row.mappedCode || row.externalCode}</td>
      <td className="px-5 py-3">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <select value={mappedCarrier} onChange={(e) => setMappedCarrier(e.target.value)} className="h-7 rounded border border-[var(--primary)] bg-[var(--surface)] px-2 text-[12px] outline-none">
              <option value="">选择承运商</option>
              {systemCarriers.filter((c) => c.status === '启用').map((c) => (
                <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
              ))}
            </select>
            <button onClick={handleSave} className="rounded bg-[var(--primary)] p-1 text-white"><Check className="size-3" /></button>
            <button onClick={() => setEditing(false)} className="rounded border border-[var(--border)] p-1 text-[var(--muted)]"><X className="size-3" /></button>
          </div>
        ) : (
          <span className={cn(row.systemCarrierName ? 'text-[var(--foreground)] font-medium' : 'text-orange-500 italic')}>
            {row.systemCarrierName || '未映射'}
          </span>
        )}
      </td>
      <td className="px-5 py-3 text-[var(--muted)]">{row.sourceSystem}</td>
      <td className="px-5 py-3"><StatusBadge status={row.mappingStatus} /></td>
      <td className="px-5 py-3">
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-[11px] text-[var(--primary)] font-medium hover:underline">
            {row.systemCarrierName ? '修改' : '映射'}
          </button>
        )}
      </td>
    </tr>
  );
}

/** 新增映射弹窗 */
function AddMappingModal({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalCode, setExternalCode] = useState('');
  const [targetCarrier, setTargetCarrier] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`映射已创建: ${platform} "${externalName}" (${externalCode}) → ${targetCarrier}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">新增渠道承运商映射</h2>
          <button onClick={onClose} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)]"><X className="size-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--foreground)] mb-1.5">来源平台 <span className="text-red-500">*</span></label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} required className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)]">
              <option value="">选择平台</option>
              {connectedSystems.filter((s) => s.direction === 'upstream').map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--foreground)] mb-1.5">平台上的承运商名称 <span className="text-red-500">*</span></label>
            <input type="text" value={externalName} onChange={(e) => setExternalName(e.target.value)} required placeholder='该平台订单里显示的承运商名称，如 "UPS Ground"' className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--foreground)] mb-1.5">承运商代码</label>
            <input type="text" value={externalCode} onChange={(e) => setExternalCode(e.target.value)} placeholder="平台传输用的代码，如 UPS_GND（可留空）" className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--foreground)] mb-1.5">映射到系统承运商 <span className="text-red-500">*</span></label>
            <select value={targetCarrier} onChange={(e) => setTargetCarrier(e.target.value)} required className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)]">
              <option value="">选择系统中的承运商</option>
              {systemCarriers.filter((c) => c.status === '启用').map((c) => (
                <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-[var(--muted)]">选择后，该平台订单上出现此承运商名称时，系统会自动关联到对应的系统承运商。</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] font-medium text-[var(--foreground)]">取消</button>
            <button type="submit" className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90">创建映射</button>
          </div>
        </form>
      </div>
    </div>
  );
}
