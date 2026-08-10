'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronDown, ChevronLeft, Loader2, Play, Upload, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSkuImportFile } from './sku-import';

const CHANNELS = [
  { id: 'ch-walmart',   name: 'Walmart',    type: 'EDI',    status: 'active'  },
  { id: 'ch-target',    name: 'Target',     type: 'EDI',    status: 'active'  },
  { id: 'ch-costco',    name: 'Costco',     type: 'EDI',    status: 'active'  },
  { id: 'ch-kroger',    name: 'Kroger',     type: 'EDI',    status: 'testing' },
  { id: 'ch-amazon',    name: 'Amazon',     type: '平台授权', status: 'active' },
  { id: 'ch-tiktok',    name: 'TikTok Shop',type: '平台授权', status: 'active' },
  { id: 'ch-shopify',   name: 'Shopify US', type: '平台授权', status: 'active' },
  { id: 'ch-wayfair',   name: 'Wayfair',    type: '文件传输', status: 'active' },
  { id: 'ch-homedepot', name: 'Home Depot', type: 'EDI',    status: 'paused'  },
] as const;

const PLATFORM_LOCATIONS: Record<string, { id: string; name: string; address: string }[]> = {
  'ch-amazon': [
    { id: 'ONT8', name: 'Amazon FC Ontario',   address: 'Ontario, CA 91761, US'   },
    { id: 'BDL3', name: 'Amazon FC Windsor',   address: 'Windsor, CT 06095, US'   },
    { id: 'MDW2', name: 'Amazon FC Joliet',    address: 'Joliet, IL 60436, US'    },
    { id: 'DFW7', name: 'Amazon FC Coppell',   address: 'Coppell, TX 75019, US'   },
    { id: 'SIN3', name: 'Amazon FC Singapore', address: 'Singapore 486000, SG'    },
  ],
  'ch-shopify': [
    { id: '12345678', name: 'LA Warehouse',       address: '1234 Commerce Ave, Los Angeles, CA 90001, US' },
    { id: '23456789', name: 'NYC Fulfillment',    address: '56 Industrial Blvd, New York, NY 10001, US'  },
    { id: '34567890', name: 'Dallas Distribution',address: '789 Logistics Dr, Dallas, TX 75201, US'      },
  ],
  'ch-tiktok': [
    { id: 'TKTK-US-W', name: 'TikTok WH West', address: 'Los Angeles, CA 90001, US' },
    { id: 'TKTK-US-E', name: 'TikTok WH East', address: 'New Jersey, NJ 07001, US'  },
  ],
};

const WAREHOUSES = [
  { id: 'wh-lax',  name: 'US 西部仓（洛杉矶）', tag: '自营' },
  { id: 'wh-ewr',  name: 'US 东部仓（纽约）',   tag: '自营' },
  { id: 'wh-dfw',  name: 'US 中部仓（达拉斯）', tag: '自营' },
  { id: 'wh-sg',   name: '新加坡仓',            tag: '自营' },
  { id: 'wh-3pla', name: '谷仓（三方仓）',       tag: '三方' },
  { id: 'wh-3plb', name: '万邑通（三方仓）',     tag: '三方' },
  { id: 'wh-fba',  name: 'Amazon FBA',          tag: 'FBA'  },
  { id: 'wh-drop', name: '供应商直发',           tag: '直发' },
] as const;

const REALTIME_EVENTS = ['库存归零', 'SKU 状态变更', '库存超阈值', '入库完成'] as const;

type PlatformTargetLocation = { mode: 'preset' | 'custom'; presetId: string; customCode: string };
type QtyMode   = 'full' | 'deduct' | 'ratio';
type SkuMode   = 'all'  | 'include' | 'exclude';
type SkuBy     = 'sku_list' | 'tag' | 'category';
type OwnerMode = 'all'  | 'include' | 'exclude';

type FormState = {
  // 基本信息
  name: string;
  status: 'active' | 'inactive' | 'draft';
  priority: string;
  // 同步目标
  channelIds: string[];
  retailerInput: string;
  platformTargetLocation: PlatformTargetLocation;
  // 同步范围
  ownerMode: OwnerMode;
  ownerInput: string;
  warehouseMode: 'all' | 'specific';
  warehouseIds: string[];
  warehouseMerge: 'sum' | 'max';
  skuMode: SkuMode;
  skuBy: SkuBy;
  skuList: string;
  skuTags: string;
  skuCategories: string;
  // 库存计算
  qtyMode: QtyMode;
  deductOpenOrder: boolean;
  deductSafety: boolean;
  safetyQty: string;
  reserveQty: string;
  inclInTransit: boolean;
  ratio: string;
  // 输出字段
  syncStatus: boolean;
  unavailToZero: boolean;
  includeZero: boolean;
  includePreorder: boolean;
  syncRetailerSkuName: boolean;
  includeBarcode: boolean;
  // 执行策略
  frequency: 'daily' | 'interval' | 'realtime' | 'pull';
  execTimes: string[];
  intervalMinutes: string;
  pushUrl: string;
  realtimeEvents: string[];
  // 异常处理
  retryMax: string;
  retryInterval: string;
  onFailure: 'alert_wait' | 'alert_skip' | 'silent_skip';
};

const DEFAULT_FORM: FormState = {
  name: '',
  status: 'active',
  priority: '50',
  channelIds: [],
  retailerInput: '',
  platformTargetLocation: { mode: 'preset', presetId: '', customCode: '' },
  ownerMode: 'all',
  ownerInput: '',
  warehouseMode: 'all',
  warehouseIds: [],
  warehouseMerge: 'sum',
  skuMode: 'all',
  skuBy: 'sku_list',
  skuList: '',
  skuTags: '',
  skuCategories: '',
  qtyMode: 'full',
  deductOpenOrder: true,
  deductSafety: false,
  safetyQty: '',
  reserveQty: '',
  inclInTransit: false,
  ratio: '80',
  syncStatus: true,
  unavailToZero: true,
  includeZero: true,
  includePreorder: false,
  syncRetailerSkuName: false,
  includeBarcode: false,
  frequency: 'daily',
  execTimes: ['02:00'],
  intervalMinutes: '60',
  pushUrl: '',
  realtimeEvents: ['库存归零'],
  retryMax: '3',
  retryInterval: '5',
  onFailure: 'alert_wait',
};

// ─── 基础 UI 组件 ───────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] px-6 py-4">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
        {desc ? <p className="mt-0.5 text-[12px] text-[var(--muted)]">{desc}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-medium text-[var(--foreground)]">
        {label}{required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </div>
      {hint ? <div className="text-[11px] text-[var(--muted)]">{hint}</div> : null}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className, id }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: 'text' | 'number' | 'time'; className?: string; id?: string;
}) {
  return (
    <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn('h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10', className)} />
  );
}

function Select({ value, onChange, children, className }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={cn('h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10', className)}>
      {children}
    </select>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('h-8 rounded-full border px-3 text-[12px] font-medium transition-colors',
        active ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
               : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]')}>
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')}>
      <span className={cn('mt-[3px] inline-block size-3.5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
    </button>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2.5">
      <div>
        <div className="text-[12px] font-medium text-[var(--foreground)]">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</div> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function MultiSelect({ opts, value, onChange, placeholder, className }: {
  opts: { id: string; label: string; sub?: string }[];
  value: string[]; onChange: (v: string[]) => void; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const labels = value.map((id) => opts.find((o) => o.id === id)?.label ?? id);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn('flex min-h-[40px] w-full flex-wrap items-start gap-1 rounded-xl border px-3 py-2 text-left transition-colors',
          open ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40')}>
        {labels.length === 0
          ? <span className="self-center text-[13px] text-[var(--muted)]">{placeholder ?? '全部（不限）'}</span>
          : labels.map((l) => <span key={l} className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">{l}</span>)}
        <ChevronDown className={cn('ml-auto size-4 shrink-0 self-center text-[var(--muted)] transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="max-h-64 overflow-y-auto py-1">
              {opts.map((opt) => {
                const checked = value.includes(opt.id);
                return (
                  <button key={opt.id} type="button" onClick={() => toggle(opt.id)}
                    className={cn('flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-subtle)]', checked ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
                    <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border', checked ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]')}>
                      {checked ? <span className="text-[10px]">✓</span> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px]">{opt.label}</span>
                      {opt.sub ? <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{opt.sub}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── 平台目标仓选择器 ───────────────────────────────────────────────────────

function PlatformTargetLocationSection({ channelId, channelName, value, onChange }: {
  channelId: string; channelName: string;
  value: PlatformTargetLocation; onChange: (v: PlatformTargetLocation) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const locations = PLATFORM_LOCATIONS[channelId] ?? [];
  const selectedLocation = locations.find((l) => l.id === value.presetId);
  const hasValue = (value.mode === 'preset' && value.presetId !== '') || (value.mode === 'custom' && value.customCode.trim() !== '');
  const displayLabel = hasValue
    ? value.mode === 'preset' ? `${selectedLocation?.name ?? value.presetId}（${value.presetId}）` : value.customCode
    : null;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
      <button type="button" onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <ChevronDown className={cn('size-4 shrink-0 text-[var(--muted)] transition-transform', expanded && 'rotate-180')} />
          <span className="text-[13px] font-medium text-[var(--foreground)]">指定目标仓库</span>
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-[var(--border)]">可选</span>
        </div>
        <span className="text-[11px] text-[var(--muted)]">
          {displayLabel ? <span className="font-medium text-[var(--foreground)]">{displayLabel}</span> : '默认推送到平台主仓'}
        </span>
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-[var(--border-subtle)] px-4 pb-4 pt-3">
          <p className="text-[11px] text-[var(--muted)]">
            {channelName} 有多个仓库时，可指定将库存推送到哪个 Location。不填则使用平台默认仓。
          </p>
          <div className="relative">
            <button type="button" onClick={() => setDropdownOpen((v) => !v)}
              className={cn('flex min-h-[40px] w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                dropdownOpen ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40')}>
              {value.mode === 'preset' && selectedLocation ? (
                <span className="flex-1 truncate text-[var(--foreground)]">
                  <span className="font-medium">{selectedLocation.name}</span>
                  <span className="ml-2 text-[11px] text-[var(--muted)]">{selectedLocation.id}</span>
                </span>
              ) : value.mode === 'custom' && value.customCode ? (
                <span className="flex-1 truncate text-[var(--foreground)]">
                  <span className="text-[11px] text-[var(--muted)] mr-1">自定义</span>{value.customCode}
                </span>
              ) : (
                <span className="flex-1 text-[var(--muted)]">选择或输入目标仓…</span>
              )}
              <ChevronDown className={cn('size-4 shrink-0 text-[var(--muted)] transition-transform', dropdownOpen && 'rotate-180')} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
                  {locations.length > 0 && (
                    <div className="border-b border-[var(--border-subtle)] py-1">
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{channelName} 仓库</div>
                      {locations.map((loc) => (
                        <button key={loc.id} type="button"
                          onClick={() => { onChange({ mode: 'preset', presetId: loc.id, customCode: '' }); setDropdownOpen(false); }}
                          className={cn('flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-subtle)]',
                            value.mode === 'preset' && value.presetId === loc.id && 'bg-[var(--primary-soft)]')}>
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--muted)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-medium text-[var(--foreground)]">
                              {loc.name}<span className="ml-2 font-mono text-[11px] text-[var(--muted)]">{loc.id}</span>
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{loc.address}</span>
                          </span>
                          {value.mode === 'preset' && value.presetId === loc.id && <span className="mt-0.5 text-[10px] text-[var(--primary)]">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">手动输入</div>
                    <div className="flex gap-2">
                      <input type="text" value={value.mode === 'custom' ? value.customCode : ''}
                        onChange={(e) => onChange({ mode: 'custom', presetId: '', customCode: e.target.value })}
                        placeholder="仓库 ID / Location Code" maxLength={64} onClick={(e) => e.stopPropagation()}
                        className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[12px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/10" />
                      <button type="button" onClick={() => { if (value.customCode.trim()) setDropdownOpen(false); }}
                        className="h-9 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-medium text-white transition-colors hover:opacity-90">确认</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {hasValue && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-[12px]">
              <MapPin className="size-3.5 shrink-0 text-[var(--primary)]" />
              <span className="flex-1 text-[var(--foreground)]">
                {value.mode === 'preset' && selectedLocation ? (
                  <><span className="font-medium">{selectedLocation.name}</span><span className="mx-1.5 text-[var(--muted)]">·</span><span className="font-mono text-[var(--muted)]">{selectedLocation.id}</span><span className="mx-1.5 text-[var(--muted)]">·</span><span className="text-[var(--muted)]">{selectedLocation.address}</span></>
                ) : <span className="font-mono">{value.customCode}</span>}
              </span>
              <button type="button" onClick={() => onChange({ mode: 'preset', presetId: '', customCode: '' })} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 主表单 ─────────────────────────────────────────────────────────────────

export default function InventorySyncRuleForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [skuImportMsg, setSkuImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuDraft, setSkuDraft] = useState('');

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const selectedChannels = useMemo(() => CHANNELS.filter((ch) => form.channelIds.includes(ch.id)), [form.channelIds]);
  const selectedWarehouses = useMemo(() => WAREHOUSES.filter((wh) => form.warehouseIds.includes(wh.id)), [form.warehouseIds]);
  const ediSelected = selectedChannels.some((ch) => ch.type === 'EDI');
  const platformChannel = useMemo(() => selectedChannels.find((ch) => ch.type === '平台授权') ?? null, [selectedChannels]);
  const skuItems = useMemo(() => Array.from(new Set(form.skuList.split(',').map((s) => s.trim()).filter(Boolean))), [form.skuList]);
  const filteredSkuItems = useMemo(() => {
    if (!skuSearch.trim()) return skuItems;
    const kw = skuSearch.trim().toLowerCase();
    return skuItems.filter((s) => s.toLowerCase().includes(kw));
  }, [skuItems, skuSearch]);

  // 库存计算公式（实时）
  const quantityFormula = useMemo(() => {
    if (form.qtyMode === 'full') return '同步库存 = 实际可用库存';
    const parts: string[] = ['实际可用库存'];
    if (form.deductOpenOrder) parts.push('− Open Order');
    if (form.deductSafety)    parts.push(`− 安全库存${form.safetyQty ? `（${form.safetyQty}）` : ''}`);
    if (form.reserveQty)      parts.push(`− 保留数量（${form.reserveQty}）`);
    if (form.inclInTransit)   parts.push('+ 在途库存');
    const base = parts.join(' ');
    if (form.qtyMode === 'ratio') return `同步库存 = (${base}) × ${form.ratio || '?'}%`;
    return `同步库存 = ${base}`;
  }, [form.qtyMode, form.deductOpenOrder, form.deductSafety, form.safetyQty, form.reserveQty, form.inclInTransit, form.ratio]);

  const syncSkuList = (items: string[]) =>
    set('skuList', Array.from(new Set(items.map((s) => s.trim()).filter(Boolean))).join(','));

  const handleSkuFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseSkuImportFile(file);
      syncSkuList(parsed.values);
      setSkuImportMsg({ type: 'success', text: `已导入 ${parsed.values.length} 个 SKU，来源列：${parsed.sourceColumn}${parsed.warnings.length ? `；${parsed.warnings.join('；')}` : ''}` });
      setSkuSearch(''); setSkuDraft('');
    } catch (err) {
      setSkuImportMsg({ type: 'error', text: err instanceof Error ? err.message : 'SKU 文件导入失败' });
    } finally { e.target.value = ''; }
  };

  const handleAddSkuDraft = () => {
    const items = skuDraft.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean);
    if (!items.length) return;
    syncSkuList([...skuItems, ...items]);
    setSkuDraft('');
    setSkuImportMsg({ type: 'success', text: `已补充 ${items.length} 个 SKU` });
  };

  const handleSave = async () => {
    if (ediSelected && !form.retailerInput.trim()) {
      document.getElementById('retailer-input')?.focus(); return;
    }
    if (form.frequency !== 'pull' && !form.pushUrl.trim()) {
      document.getElementById('push-url-input')?.focus(); return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-28 pt-6">

      {/* ── 页头 ── */}
      <div className="mb-6 flex items-start gap-3">
        <button type="button" onClick={() => router.push('/dashboard/rules/inventory-sync')}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)]">
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">
            {editId ? `编辑同步规则 · ${editId}` : '新建库存同步规则'}
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">配置哪些 SKU 的库存、以何种方式计算、同步到哪些渠道。</p>
        </div>
      </div>

      <div className="space-y-5">

        {/* ①  基本信息 */}
        <Section title="基本信息">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_200px_160px]">
            <Field label="规则名称" required>
              <Input value={form.name} onChange={(v) => set('name', v)}
                placeholder="如：Walmart EDI · 货主 A · 每日同步"
                className={!form.name ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : undefined} />
            </Field>
            <Field label="启用状态">
              <Select value={form.status} onChange={(v) => set('status', v as FormState['status'])}>
                <option value="active">启用</option>
                <option value="inactive">停用</option>
                <option value="draft">草稿</option>
              </Select>
            </Field>
            <Field label="优先级" hint="数值越高越优先">
              <Input type="number" value={form.priority} onChange={(v) => set('priority', v)} />
            </Field>
          </div>
        </Section>

        {/* ②  同步目标 */}
        <Section title="同步目标" desc="选择要将库存推送到哪些渠道，以及渠道侧的接收配置。">
          <div className="space-y-5">
            <Field label="目标渠道" required>
              <MultiSelect
                opts={CHANNELS.map((ch) => ({ id: ch.id, label: ch.name, sub: `${ch.type} · ${ch.status === 'active' ? '已启用' : ch.status === 'testing' ? '测试中' : '已暂停'}` }))}
                value={form.channelIds}
                onChange={(ids) => {
                  const chs = CHANNELS.filter((ch) => ids.includes(ch.id));
                  setForm((cur) => ({
                    ...cur,
                    channelIds: ids,
                    retailerInput: chs.some((c) => c.type === 'EDI') ? cur.retailerInput : '',
                    platformTargetLocation: chs.some((c) => c.type === '平台授权') ? cur.platformTargetLocation : { mode: 'preset', presetId: '', customCode: '' },
                  }));
                }}
                placeholder="选择渠道…" />
            </Field>

            {/* EDI：Retailer 必填 */}
            {ediSelected && (
              <div className="space-y-3">
                <Field label="Retailer" required hint="EDI 对接时对方的 retailer 标识，同步报文中会用到。">
                  <input id="retailer-input" type="text" value={form.retailerInput}
                    onChange={(e) => set('retailerInput', e.target.value)}
                    placeholder="如：WALMART_US"
                    className={cn('h-10 w-full rounded-xl border bg-[var(--surface)] px-3 text-[13px] outline-none focus:ring-2',
                      form.retailerInput ? 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/10'
                                         : 'border-red-300 focus:border-red-400 focus:ring-red-100')} />
                </Field>
              </div>
            )}

            {/* 平台授权：目标仓可选 */}
            {platformChannel && (
              <PlatformTargetLocationSection
                channelId={platformChannel.id} channelName={platformChannel.name}
                value={form.platformTargetLocation} onChange={(v) => set('platformTargetLocation', v)} />
            )}
          </div>
        </Section>

        {/* ③  同步范围 */}
        <Section title="同步范围" desc="筛选哪些货主、仓库、SKU 参与本次同步。三个维度可单独配置也可叠加使用。">
          <div className="space-y-6">

            {/* 货主 + 仓库 并排 */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Field label="货主" hint="限定哪些货主名下的 SKU 参与同步。">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <ChipButton active={form.ownerMode === 'all'}     onClick={() => set('ownerMode', 'all')}>全部货主</ChipButton>
                    <ChipButton active={form.ownerMode === 'include'} onClick={() => set('ownerMode', 'include')}>指定货主</ChipButton>
                    <ChipButton active={form.ownerMode === 'exclude'} onClick={() => set('ownerMode', 'exclude')}>排除货主</ChipButton>
                  </div>
                  {form.ownerMode !== 'all' && (
                    <Input value={form.ownerInput} onChange={(v) => set('ownerInput', v)}
                      placeholder={form.ownerMode === 'include' ? '货主名称，多个用逗号分隔' : '要排除的货主名称'} />
                  )}
                </div>
              </Field>

              <Field label="仓库" hint="从哪些仓库汇总库存数据。">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <ChipButton active={form.warehouseMode === 'all'}      onClick={() => set('warehouseMode', 'all')}>全部仓库</ChipButton>
                    <ChipButton active={form.warehouseMode === 'specific'} onClick={() => set('warehouseMode', 'specific')}>指定仓库</ChipButton>
                  </div>
                  {form.warehouseMode === 'specific' && (
                    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_140px]">
                      <MultiSelect opts={WAREHOUSES.map((wh) => ({ id: wh.id, label: wh.name, sub: wh.tag }))}
                        value={form.warehouseIds} onChange={(v) => set('warehouseIds', v)} placeholder="选择仓库…" />
                      <Select value={form.warehouseMerge} onChange={(v) => set('warehouseMerge', v as FormState['warehouseMerge'])}>
                        <option value="sum">各仓求和</option>
                        <option value="max">取最大值</option>
                      </Select>
                    </div>
                  )}
                </div>
              </Field>
            </div>

            {/* SKU 条件 */}
            <Field label="SKU 范围">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <ChipButton active={form.skuMode === 'all'}     onClick={() => { set('skuMode', 'all'); setSkuImportMsg(null); }}>全部 SKU</ChipButton>
                  <ChipButton active={form.skuMode === 'include'} onClick={() => set('skuMode', 'include')}>仅同步指定 SKU</ChipButton>
                  <ChipButton active={form.skuMode === 'exclude'} onClick={() => set('skuMode', 'exclude')}>排除指定 SKU</ChipButton>
                </div>

                {form.skuMode !== 'all' && (
                  <div className="space-y-3">
                    <Select value={form.skuBy} onChange={(v) => { set('skuBy', v as SkuBy); setSkuImportMsg(null); setSkuSearch(''); setSkuDraft(''); }} className="max-w-[200px]">
                      <option value="sku_list">SKU 列表</option>
                      <option value="tag">标签</option>
                      <option value="category">品类</option>
                    </Select>

                    {form.skuBy === 'tag'      && <Input value={form.skuTags}       onChange={(v) => set('skuTags', v)}       placeholder="标签，如 no-sync,promo" />}
                    {form.skuBy === 'category' && <Input value={form.skuCategories} onChange={(v) => set('skuCategories', v)} placeholder="品类，如 Electronics,Apparel" />}

                    {form.skuBy === 'sku_list' && (
                      <div className="space-y-3">
                        {/* 手动输入 */}
                        <div className="flex gap-2">
                          <Input value={skuDraft} onChange={setSkuDraft}
                            placeholder="粘贴 SKU，逗号或换行分隔"
                            className={!skuItems.length ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : undefined} />
                          <button type="button" onClick={handleAddSkuDraft}
                            className="h-10 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[12px] font-medium transition-colors hover:bg-[var(--surface-subtle)]">
                            添加
                          </button>
                        </div>
                        {/* 文件导入 */}
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                          <div>
                            <div className="text-[12px] font-medium text-[var(--foreground)]">从文件导入</div>
                            <div className="mt-0.5 text-[11px] text-[var(--muted)]">支持 Excel / CSV，导入后仍可手动追加</div>
                          </div>
                          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleSkuFileImport} />
                          <button type="button" onClick={() => fileInputRef.current?.click()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium transition-colors hover:bg-[var(--surface-subtle)]">
                            <Upload className="size-3.5" />导入文件
                          </button>
                        </div>
                        {skuImportMsg && (
                          <div className={cn('text-[11px]', skuImportMsg.type === 'success' ? 'text-green-600' : 'text-red-500')}>
                            {skuImportMsg.text}
                          </div>
                        )}
                        {/* SKU 预览列表 */}
                        {skuItems.length > 0 && (
                          <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[12px] text-[var(--muted)]">已选 {skuItems.length} 个 SKU{skuSearch ? ` · 匹配 ${filteredSkuItems.length} 个` : ''}</span>
                              <div className="flex items-center gap-3">
                                <Input value={skuSearch} onChange={setSkuSearch} placeholder="搜索…" className="h-8 w-40 text-[11px]" />
                                <button type="button" onClick={() => { syncSkuList([]); setSkuSearch(''); setSkuDraft(''); setSkuImportMsg(null); }}
                                  className="text-[12px] text-[var(--muted)] hover:text-red-500">清空</button>
                              </div>
                            </div>
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                              {filteredSkuItems.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {filteredSkuItems.map((sku) => (
                                    <span key={sku} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[11px] font-medium">
                                      {sku}
                                      <button type="button" onClick={() => syncSkuList(skuItems.filter((s) => s !== sku))} className="text-[var(--muted)] hover:text-red-500">×</button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-[var(--muted)]">没有匹配的 SKU</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Field>
          </div>
        </Section>

        {/* ④  库存计算 */}
        <Section title="库存计算" desc="决定最终同步出去的数字是怎么算的。">
          <div className="space-y-5">
            <Field label="计算方式">
              <div className="flex flex-wrap gap-2">
                <ChipButton active={form.qtyMode === 'full'}   onClick={() => set('qtyMode', 'full')}>直接同步</ChipButton>
                <ChipButton active={form.qtyMode === 'deduct'} onClick={() => set('qtyMode', 'deduct')}>扣减后同步</ChipButton>
                <ChipButton active={form.qtyMode === 'ratio'}  onClick={() => set('qtyMode', 'ratio')}>比例同步</ChipButton>
              </div>
              <div className="mt-2 text-[11px] text-[var(--muted)]">
                {form.qtyMode === 'full'   && '实际可用库存是多少就同步多少。'}
                {form.qtyMode === 'deduct' && '从实际库存中扣除指定项后，同步剩余数量。'}
                {form.qtyMode === 'ratio'  && '从实际库存中扣除指定项后，再按设定比例同步。'}
              </div>
            </Field>

            {form.qtyMode !== 'full' && (
              <>
                <div className="space-y-2">
                  <div className="text-[12px] font-medium text-[var(--foreground)]">扣减项</div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    <ToggleRow label="扣减 Open Order" hint="已下单但未发货的订单占用量。"
                      checked={form.deductOpenOrder} onChange={(v) => set('deductOpenOrder', v)} />
                    <ToggleRow label="扣减安全库存" hint="保留一部分库存作为缓冲，不对外同步。"
                      checked={form.deductSafety} onChange={(v) => set('deductSafety', v)} />
                    <ToggleRow label="加入在途库存" hint="在途中尚未入库的部分计入可同步数量。"
                      checked={form.inclInTransit} onChange={(v) => set('inclInTransit', v)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {form.deductSafety && (
                    <Field label="安全库存量">
                      <Input type="number" value={form.safetyQty} onChange={(v) => set('safetyQty', v)} placeholder="如：50" />
                    </Field>
                  )}
                  <Field label="额外保留量" hint="扣减完成后再额外扣除，留空不保留。">
                    <Input type="number" value={form.reserveQty} onChange={(v) => set('reserveQty', v)} placeholder="如：10" />
                  </Field>
                  {form.qtyMode === 'ratio' && (
                    <Field label="同步比例（%）">
                      <Input type="number" value={form.ratio} onChange={(v) => set('ratio', v)} placeholder="如：80" />
                    </Field>
                  )}
                </div>
              </>
            )}

            {/* 公式预览：始终在配置下方 */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="mb-1 text-[11px] font-medium text-[var(--muted)]">计算公式</div>
              <div className="font-mono text-[13px] text-[var(--foreground)]">{quantityFormula}</div>
            </div>
          </div>
        </Section>

        {/* ⑤  输出与执行 */}
        <Section title="输出与执行" desc="定义报文里输出哪些字段，以及何时推送、推送到哪里。">
          <div className="space-y-7">

            {/* 输出字段 */}
            <div>
              <div className="mb-3 text-[13px] font-medium text-[var(--foreground)]">输出字段</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <ToggleRow label="同步商品状态" hint="在库存数量之外，一并输出可用 / 不可用状态。"
                  checked={form.syncStatus} onChange={(v) => set('syncStatus', v)} />
                <ToggleRow label="不可用 SKU 输出为 0" hint="已不可用的 SKU 统一按零库存输出。"
                  checked={form.unavailToZero} onChange={(v) => set('unavailToZero', v)} />
                <ToggleRow label="同步零库存 SKU" hint="库存为 0 的 SKU 仍然输出，不跳过。"
                  checked={form.includeZero} onChange={(v) => set('includeZero', v)} />
                <ToggleRow label="同步 Retailer SKU Name" hint="附带 Retailer 侧的 SKU 名称。"
                  checked={form.syncRetailerSkuName} onChange={(v) => set('syncRetailerSkuName', v)} />
                <ToggleRow label="包含 Barcode" hint="输出 UPC、EAN 等条码字段。"
                  checked={form.includeBarcode} onChange={(v) => set('includeBarcode', v)} />
              </div>
            </div>

            {/* 分割线 */}
            <div className="border-t border-[var(--border-subtle)]" />

            {/* 执行频率 */}
            <div className="space-y-4">
              <div className="text-[13px] font-medium text-[var(--foreground)]">执行频率</div>
              <div className="flex flex-wrap gap-2">
                <ChipButton active={form.frequency === 'daily'}    onClick={() => set('frequency', 'daily')}>每日定时</ChipButton>
                <ChipButton active={form.frequency === 'interval'} onClick={() => set('frequency', 'interval')}>按时间间隔</ChipButton>
                <ChipButton active={form.frequency === 'realtime'} onClick={() => set('frequency', 'realtime')}>实时触发</ChipButton>
                <ChipButton active={form.frequency === 'pull'}     onClick={() => set('frequency', 'pull')}>拉取模式</ChipButton>
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {form.frequency === 'daily'    && '每天在指定时刻执行同步，可设置多个时间点。'}
                {form.frequency === 'interval' && '按固定时间间隔循环执行。'}
                {form.frequency === 'realtime' && '库存发生特定变化时立即触发同步。'}
                {form.frequency === 'pull'     && 'Retailer 主动拉取，系统不主动推送，无需配置推送地址。'}
              </div>

              {form.frequency === 'daily' && (
                <Field label="执行时间" hint="每天在以下时刻各执行一次，可添加多个。">
                  <div className="space-y-2">
                    {form.execTimes.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="time" value={t}
                          onChange={(e) => { const next = [...form.execTimes]; next[i] = e.target.value; set('execTimes', next); }}
                          className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
                        {form.execTimes.length > 1 && (
                          <button type="button" onClick={() => set('execTimes', form.execTimes.filter((_, idx) => idx !== i))}
                            className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:border-red-300 hover:text-red-500">×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => set('execTimes', [...form.execTimes, '08:00'])}
                      className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-3 text-[12px] text-[var(--muted)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)]">
                      + 添加时间点
                    </button>
                  </div>
                </Field>
              )}

              {form.frequency === 'interval' && (
                <Field label="同步间隔">
                  <select value={form.intervalMinutes} onChange={(e) => set('intervalMinutes', e.target.value)}
                    className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10">
                    <option value="30">每 30 分钟</option>
                    <option value="60">每 1 小时</option>
                    <option value="120">每 2 小时</option>
                    <option value="180">每 3 小时</option>
                    <option value="360">每 6 小时</option>
                    <option value="720">每 12 小时</option>
                    <option value="1440">每 24 小时</option>
                  </select>
                </Field>
              )}

              {form.frequency === 'realtime' && (
                <Field label="触发事件" hint="勾选任意事件，库存发生对应变化时立即推送。">
                  <div className="flex flex-wrap gap-2">
                    {REALTIME_EVENTS.map((ev) => {
                      const active = form.realtimeEvents.includes(ev);
                      return <button key={ev} type="button"
                        onClick={() => set('realtimeEvents', active ? form.realtimeEvents.filter((e) => e !== ev) : [...form.realtimeEvents, ev])}
                        className={cn('rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                          active ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                                 : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]')}>
                        {ev}
                      </button>;
                    })}
                  </div>
                </Field>
              )}
            </div>

            {/* 推送 URL（非拉取模式） */}
            {form.frequency !== 'pull' && (
              <Field label="推送目标 URL" required hint="系统将以 HTTP POST 方式把库存报文推送到此地址。">
                <Input id="push-url-input" value={form.pushUrl} onChange={(v) => set('pushUrl', v)}
                  placeholder="https://your-endpoint.example.com/inventory/sync"
                  className={cn('font-mono text-[12px]', !form.pushUrl ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : undefined)} />
              </Field>
            )}

            {/* 分割线 */}
            <div className="border-t border-[var(--border-subtle)]" />

            {/* 异常处理 */}
            <div>
              <div className="mb-3 text-[13px] font-medium text-[var(--foreground)]">异常处理</div>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="失败重试次数">
                  <Input type="number" value={form.retryMax} onChange={(v) => set('retryMax', v)} placeholder="3" />
                </Field>
                <Field label="重试间隔（分钟）">
                  <Input type="number" value={form.retryInterval} onChange={(v) => set('retryInterval', v)} placeholder="5" />
                </Field>
                <Field label="重试耗尽后的处理">
                  <Select value={form.onFailure} onChange={(v) => set('onFailure', v as FormState['onFailure'])}>
                    <option value="alert_wait">告警并挂起</option>
                    <option value="alert_skip">告警并跳过</option>
                    <option value="silent_skip">静默跳过</option>
                  </Select>
                </Field>
              </div>
            </div>

          </div>
        </Section>

      </div>{/* end space-y-5 */}

      {/* ── 底部操作栏 ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3">
          <div className="text-[12px] text-[var(--muted)]">
            {saved
              ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="size-3.5" />已保存</span>
              : form.name ? '有未保存的更改' : '配置完成后保存即可生效'}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/rules/inventory-sync"
              className="flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium transition-colors hover:bg-[var(--surface-subtle)]">
              取消
            </Link>
            <button type="button" onClick={() => { set('status', 'draft'); handleSave(); }}
              className="flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium transition-colors hover:bg-[var(--surface-subtle)]">
              存为草稿
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              {saving ? '保存中…' : form.status === 'draft' ? '保存草稿' : '保存并启用'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
