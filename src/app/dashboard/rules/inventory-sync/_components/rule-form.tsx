'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronDown, ChevronLeft, Loader2, Play, Upload, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSkuImportFile } from './sku-import';

const CHANNELS = [
  { id: 'ch-walmart', name: 'Walmart', type: 'EDI', status: 'active' },
  { id: 'ch-target', name: 'Target', type: 'EDI', status: 'active' },
  { id: 'ch-costco', name: 'Costco', type: 'EDI', status: 'active' },
  { id: 'ch-kroger', name: 'Kroger', type: 'EDI', status: 'testing' },
  { id: 'ch-amazon', name: 'Amazon', type: '平台授权', status: 'active' },
  { id: 'ch-tiktok', name: 'TikTok Shop', type: '平台授权', status: 'active' },
  { id: 'ch-shopify', name: 'Shopify US', type: '平台授权', status: 'active' },
  { id: 'ch-wayfair', name: 'Wayfair', type: '文件传输', status: 'active' },
  { id: 'ch-homedepot', name: 'Home Depot', type: 'EDI', status: 'paused' },
] as const;

// 各平台的仓库/Location 列表（mock 数据）
const PLATFORM_LOCATIONS: Record<string, { id: string; name: string; address: string }[]> = {
  'ch-amazon': [
    { id: 'ONT8',  name: 'Amazon FC Ontario',      address: 'Ontario, CA 91761, US' },
    { id: 'BDL3',  name: 'Amazon FC Windsor',       address: 'Windsor, CT 06095, US' },
    { id: 'MDW2',  name: 'Amazon FC Joliet',        address: 'Joliet, IL 60436, US' },
    { id: 'DFW7',  name: 'Amazon FC Coppell',       address: 'Coppell, TX 75019, US' },
    { id: 'SIN3',  name: 'Amazon FC Singapore',     address: 'Singapore 486000, SG' },
  ],
  'ch-shopify': [
    { id: '12345678', name: 'LA Warehouse',         address: '1234 Commerce Ave, Los Angeles, CA 90001, US' },
    { id: '23456789', name: 'NYC Fulfillment',      address: '56 Industrial Blvd, New York, NY 10001, US' },
    { id: '34567890', name: 'Dallas Distribution',  address: '789 Logistics Dr, Dallas, TX 75201, US' },
  ],
  'ch-tiktok': [
    { id: 'TKTK-US-W', name: 'TikTok WH West',     address: 'Los Angeles, CA 90001, US' },
    { id: 'TKTK-US-E', name: 'TikTok WH East',     address: 'New Jersey, NJ 07001, US' },
  ],
};

const WAREHOUSES = [
  { id: 'wh-lax', name: 'US 西部仓（洛杉矶）', tag: '自营' },
  { id: 'wh-ewr', name: 'US 东部仓（纽约）', tag: '自营' },
  { id: 'wh-dfw', name: 'US 中部仓（达拉斯）', tag: '自营' },
  { id: 'wh-sg', name: '新加坡仓', tag: '自营' },
  { id: 'wh-3pla', name: '谷仓（三方仓）', tag: '三方' },
  { id: 'wh-3plb', name: '万邑通（三方仓）', tag: '三方' },
  { id: 'wh-fba', name: 'Amazon FBA', tag: 'FBA' },
  { id: 'wh-drop', name: '供应商直发', tag: '直发' },
] as const;

const EXTRA_FIELDS = ['商品重量', '商品尺寸', '品牌名称', '原产国', '海关编码', '效期/保质期', '箱规数量', '自定义属性'] as const;
const REALTIME_EVENTS = ['库存归零', 'SKU 状态变更', '库存超阈值', '入库完成'] as const;
const ALERT_CHANNELS = ['站内通知', '邮件', '钉钉', 'Slack'] as const;

type PlatformTargetLocation = {
  // 'preset' = 从列表选的，'custom' = 自定义输入
  mode: 'preset' | 'custom';
  // 选择的预设 location id
  presetId: string;
  // 自定义输入的代码
  customCode: string;
};

type QtyMode = 'full' | 'deduct' | 'ratio';
type SkuMode = 'all' | 'include' | 'exclude';
type SkuBy = 'sku_list' | 'tag' | 'category';
type OwnerMode = 'all' | 'include' | 'exclude';
type FormState = {
  name: string;
  status: 'active' | 'inactive' | 'draft';
  priority: string;
  channelIds: string[];
  retailerInput: string;
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
  dataPrepMode: 'direct' | 'query_first';
  qtyMode: QtyMode;
  deductReserved: boolean;
  deductSafety: boolean;
  inclInTransit: 'none' | '1' | '3' | '7';
  buffer: string;
  ratio: string;
  maxQty: string;
  safetyThreshold: string;
  syncStatus: boolean;
  unavailToZero: boolean;
  includeZero: boolean;
  includePreorder: boolean;
  includeBackorder: boolean;
  extraFields: boolean;
  extraFieldKeys: string[];
  frequency: 'daily' | 'hourly' | 'realtime' | 'pull' | 'manual';
  execTime: string;
  realtimeEvents: string[];
  retryMax: string;
  retryInterval: string;
  onFailure: 'alert_wait' | 'alert_skip' | 'silent_skip';
  diffCheck: boolean;
  diffTolerance: string;
  alertChannels: string[];
  platformTargetLocation: PlatformTargetLocation;
};

const DEFAULT_FORM: FormState = {
  name: '',
  status: 'active',
  priority: '50',
  channelIds: [],
  retailerInput: '',
  ownerMode: 'include',
  ownerInput: '',
  warehouseMode: 'all',
  warehouseIds: [],
  warehouseMerge: 'sum',
  skuMode: 'all',
  skuBy: 'sku_list',
  skuList: '',
  skuTags: '',
  skuCategories: '',
  dataPrepMode: 'direct',
  qtyMode: 'full',
  deductReserved: true,
  deductSafety: false,
  inclInTransit: 'none',
  buffer: '0',
  ratio: '80',
  maxQty: '',
  safetyThreshold: '',
  syncStatus: true,
  unavailToZero: true,
  includeZero: true,
  includePreorder: false,
  includeBackorder: false,
  extraFields: false,
  extraFieldKeys: [],
  frequency: 'daily',
  execTime: '02:00',
  realtimeEvents: ['库存归零'],
  retryMax: '3',
  retryInterval: '5',
  onFailure: 'alert_wait',
  diffCheck: true,
  diffTolerance: '5',
  alertChannels: ['站内通知', '邮件'],
  platformTargetLocation: { mode: 'preset', presetId: '', customCode: '' },
};

function Section({ title, desc, children, compact = false }: { title: string; desc?: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={cn(compact ? 'rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]' : 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]')}>
      <div className={cn(compact ? 'mb-4' : 'border-b border-[var(--border-subtle)] px-5 py-3.5')}>
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
        {desc ? <p className="mt-0.5 text-[12px] text-[var(--muted)]">{desc}</p> : null}
      </div>
      <div className={cn(compact ? 'space-y-0' : 'p-5')}>{children}</div>
    </section>
  );
}

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[13px] font-medium text-[var(--foreground)]">
          {label}
          {required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </div>
        {hint ? <div className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: 'text' | 'number' | 'time'; className?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn('h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10', className)} />;
}

function Select({ value, onChange, children, className }: { value: string; onChange: (value: string) => void; children: React.ReactNode; className?: string }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className={cn('h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10', className)}>{children}</select>;
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn('h-8 rounded-full border px-3 text-[12px] font-medium transition-colors', active ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]')}>{children}</button>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')}><span className={cn('mt-[3px] inline-block size-3.5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-[3px]')} /></button>;
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
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

function MultiSelect({ opts, value, onChange, placeholder, className }: { opts: { id: string; label: string; sub?: string }[]; value: string[]; onChange: (value: string[]) => void; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const labels = value.map((id) => opts.find((opt) => opt.id === id)?.label ?? id);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  return (
    <div className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((current) => !current)} className={cn('flex min-h-[40px] w-full flex-wrap items-start gap-1 rounded-xl border px-3 py-2 text-left transition-colors', open ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40')}>
        {labels.length === 0 ? <span className="self-center text-[13px] text-[var(--muted)]">{placeholder ?? '全部（不限制）'}</span> : labels.map((label) => <span key={label} className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">{label}</span>)}
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
                  <button key={opt.id} type="button" onClick={() => toggle(opt.id)} className={cn('flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-subtle)]', checked ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
                    <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border', checked ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]')}>{checked ? <span className="text-[10px]">✓</span> : null}</span>
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

function CompactSummary({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2.5">
      <div className="text-[11px] font-medium text-[var(--muted)]">{title}</div>
      <div className="mt-1 text-[12px] text-[var(--foreground)]">{items.join(' · ')}</div>
    </div>
  );
}

// ─── 平台目标仓配置组件（折叠式，默认收起）───
type PlatformChannel = { id: string; name: string; type: string; status: string };

function PlatformTargetLocationSection({
  channelId,
  channelName,
  value,
  onChange,
}: {
  channelId: string;
  channelName: string;
  value: PlatformTargetLocation;
  onChange: (val: PlatformTargetLocation) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const locations = PLATFORM_LOCATIONS[channelId] ?? [];
  const selectedLocation = locations.find((l) => l.id === value.presetId);

  const hasValue =
    (value.mode === 'preset' && value.presetId !== '') ||
    (value.mode === 'custom' && value.customCode.trim() !== '');

  const displayLabel = hasValue
    ? value.mode === 'preset'
      ? `${selectedLocation?.name ?? value.presetId}（${value.presetId}）`
      : value.customCode
    : null;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
      {/* 折叠触发行 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <ChevronDown className={cn('size-4 shrink-0 text-[var(--muted)] transition-transform', expanded && 'rotate-180')} />
          <span className="text-[13px] font-medium text-[var(--foreground)]">指定平台目标仓</span>
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-[var(--border)]">可选</span>
        </div>
        <span className="text-[11px] text-[var(--muted)]">
          {displayLabel
            ? <span className="font-medium text-[var(--foreground)]">{displayLabel}</span>
            : '不配置则推送到平台默认仓'}
        </span>
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="space-y-3 border-t border-[var(--border-subtle)] px-4 pb-4 pt-3">
          <p className="text-[11px] text-[var(--muted)]">
            如果 {channelName} 有多个仓库 / Location，可在此指定将库存同步到哪个。不填则推送到平台默认仓。
          </p>

          {/* 下拉选择器 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                'flex min-h-[40px] w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                dropdownOpen
                  ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40'
              )}
            >
              {value.mode === 'preset' && selectedLocation ? (
                <span className="flex-1 truncate text-[var(--foreground)]">
                  <span className="font-medium">{selectedLocation.name}</span>
                  <span className="ml-2 text-[11px] text-[var(--muted)]">{selectedLocation.id}</span>
                </span>
              ) : value.mode === 'custom' && value.customCode ? (
                <span className="flex-1 truncate text-[var(--foreground)]">
                  <span className="text-[11px] text-[var(--muted)] mr-1">自定义</span>
                  {value.customCode}
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
                  {/* 预设选项 */}
                  {locations.length > 0 && (
                    <div className="border-b border-[var(--border-subtle)] py-1">
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {channelName} 仓库
                      </div>
                      {locations.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            onChange({ mode: 'preset', presetId: loc.id, customCode: '' });
                            setDropdownOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-subtle)]',
                            value.mode === 'preset' && value.presetId === loc.id && 'bg-[var(--primary-soft)]'
                          )}
                        >
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--muted)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-medium text-[var(--foreground)]">
                              {loc.name}
                              <span className="ml-2 font-mono text-[11px] text-[var(--muted)]">{loc.id}</span>
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{loc.address}</span>
                          </span>
                          {value.mode === 'preset' && value.presetId === loc.id && (
                            <span className="mt-0.5 text-[10px] text-[var(--primary)]">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 自定义输入 */}
                  <div className="p-3">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">自定义输入</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={value.mode === 'custom' ? value.customCode : ''}
                        onChange={(e) => onChange({ mode: 'custom', presetId: '', customCode: e.target.value })}
                        placeholder="输入仓库 ID / Location Code"
                        maxLength={64}
                        className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/10"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (value.customCode.trim()) setDropdownOpen(false);
                        }}
                        className="h-9 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-medium text-white transition-colors hover:opacity-90"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 已选状态 + 清除 */}
          {hasValue && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-[12px]">
              <MapPin className="size-3.5 shrink-0 text-[var(--primary)]" />
              <span className="flex-1 text-[var(--foreground)]">
                {value.mode === 'preset' && selectedLocation ? (
                  <>
                    <span className="font-medium">{selectedLocation.name}</span>
                    <span className="mx-1.5 text-[var(--muted)]">·</span>
                    <span className="font-mono text-[var(--muted)]">{selectedLocation.id}</span>
                    <span className="mx-1.5 text-[var(--muted)]">·</span>
                    <span className="text-[var(--muted)]">{selectedLocation.address}</span>
                  </>
                ) : (
                  <span className="font-mono">{value.customCode}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onChange({ mode: 'preset', presetId: '', customCode: '' })}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InventorySyncRuleForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [skuImportMessage, setSkuImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuDraft, setSkuDraft] = useState('');

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const selectedChannels = useMemo(() => CHANNELS.filter((channel) => form.channelIds.includes(channel.id)), [form.channelIds]);
  const selectedWarehouses = useMemo(() => WAREHOUSES.filter((warehouse) => form.warehouseIds.includes(warehouse.id)), [form.warehouseIds]);
  const ediSelected = selectedChannels.some((channel) => channel.type === 'EDI');
  const platformChannel = useMemo(() => selectedChannels.find((ch) => ch.type === '平台授权') ?? null, [selectedChannels]);
  const skuItems = useMemo(() => Array.from(new Set(form.skuList.split(',').map((item) => item.trim()).filter(Boolean))), [form.skuList]);
  const filteredSkuItems = useMemo(() => {
    if (!skuSearch.trim()) {
      return skuItems;
    }
    const keyword = skuSearch.trim().toLowerCase();
    return skuItems.filter((item) => item.toLowerCase().includes(keyword));
  }, [skuItems, skuSearch]);

  const scopeSummary = [
    `渠道：${selectedChannels.length > 0 ? selectedChannels.map((channel) => channel.name).join('、') : '全部渠道'}`,
    ediSelected ? `Retailer：${form.retailerInput.trim() || '待填 retailer'}` : null,
    `货主：${form.ownerMode === 'all' ? '全部货主' : form.ownerInput.trim() ? `${form.ownerMode === 'include' ? '指定' : '排除'} ${form.ownerInput.trim()}` : '待填货主'}`,
    `仓库：${form.warehouseMode === 'all' ? '全部仓库' : selectedWarehouses.length > 0 ? `${selectedWarehouses.map((warehouse) => warehouse.name).join('、')}（${form.warehouseMerge === 'sum' ? '库存求和' : '取最大值'}）` : '待选仓库'}`,
    `SKU 条件：${form.skuMode === 'all' ? '全部 SKU' : `${form.skuMode === 'include' ? '仅包含' : '排除'} ${form.skuBy === 'sku_list' ? 'SKU 列表' : form.skuBy === 'tag' ? '标签' : '品类'} ${form.skuBy === 'sku_list' ? (form.skuList || '待填') : form.skuBy === 'tag' ? (form.skuTags || '待填') : (form.skuCategories || '待填')}`}`,
  ].filter(Boolean) as string[];

  const dataPrepSummary = [
    form.dataPrepMode === 'direct' ? '参与同步的 SKU 直接进入库存计算' : '先确认参与同步的 SKU，再执行库存查询',
  ];

  const quantitySummary = [
    form.qtyMode === 'full' ? '直接同步实际库存' : form.qtyMode === 'deduct' ? '扣减后同步' : `按 ${form.ratio}% 比例同步`,
    form.deductReserved ? '扣减仓库预占库存' : '不扣减仓库预占库存',
    form.deductSafety ? '扣除安全库存' : '不扣除安全库存',
    form.inclInTransit === 'none' ? '不含在途库存' : `包含 ${form.inclInTransit} 天在途库存`,
    form.maxQty ? `最大同步量 ${form.maxQty}` : '最大同步量不限',
  ];

  const outputSummary = [
    form.syncStatus ? '同步商品状态' : '仅同步库存数量',
    form.includeZero ? '包含 0 库存 SKU' : '跳过 0 库存 SKU',
    form.unavailToZero ? '不可用 SKU 按 0 库存输出' : '不可用 SKU 保留原库存结果',
    form.includeBackorder ? '包含 Backorder SKU' : '不包含 Backorder SKU',
    form.extraFields ? `附带 ${form.extraFieldKeys.length || 0} 个扩展字段` : '不附带扩展字段',
  ];

  const isSkuListPathRequired = form.skuMode !== 'all' && form.skuBy === 'sku_list';

  const syncSkuList = (items: string[]) => {
    setField('skuList', Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).join(','));
  };

  const handleSkuFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseSkuImportFile(file);
      syncSkuList(parsed.values);
      setSkuImportMessage({
        type: 'success',
        text: `已导入 ${parsed.values.length} 个 SKU，来源列：${parsed.sourceColumn}${parsed.warnings.length ? `；${parsed.warnings.join('；')}` : ''}`
      });
      setSkuSearch('');
      setSkuDraft('');
    } catch (error) {
      setSkuImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'SKU 文件导入失败'
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleAddSkuDraft = () => {
    const draftItems = skuDraft
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (draftItems.length === 0) {
      return;
    }

    syncSkuList([...skuItems, ...draftItems]);
    setSkuDraft('');
    setSkuImportMessage({
      type: 'success',
      text: `已补充 ${draftItems.length} 个 SKU`
    });
  };

  const handleRemoveSku = (sku: string) => {
    syncSkuList(skuItems.filter((item) => item !== sku));
  };

  const handleClearSkuList = () => {
    syncSkuList([]);
    setSkuSearch('');
    setSkuDraft('');
    setSkuImportMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-5 lg:pt-6">
      <div className="mb-5 flex items-start gap-3">
        <button type="button" onClick={() => router.push('/dashboard/rules/inventory-sync')} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface-subtle)]">
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">{editId ? `编辑库存同步规则 · ${editId}` : '新建库存同步规则'}</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">先选择同步渠道，再定义参与同步的 SKU 范围与数据准备方式，最后配置库存计算、输出处理和执行策略。</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="基本信息" compact>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px_180px]">
            <Field label="规则名称" required>
              <Input value={form.name} onChange={(value) => setField('name', value)} placeholder="如：Walmart EDI · 货主 A · 每日库存同步" className={!form.name ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : undefined} />
            </Field>
            <Field label="状态">
              <Select value={form.status} onChange={(value) => setField('status', value as FormState['status'])}>
                <option value="active">启用</option>
                <option value="inactive">停用</option>
                <option value="draft">草稿</option>
              </Select>
            </Field>
            <Field label="优先级">
              <Input type="number" value={form.priority} onChange={(value) => setField('priority', value)} />
            </Field>
          </div>
        </Section>

        <Section title="同步渠道" desc="先明确这条规则要把库存同步到哪些渠道。" compact>
          <div className="space-y-5">
            <Field label="目标渠道" required>
              <MultiSelect
                opts={CHANNELS.map((channel) => ({ id: channel.id, label: channel.name, sub: `${channel.type} · ${channel.status === 'active' ? '已启用' : channel.status === 'testing' ? '测试中' : '已暂停'}` }))}
                value={form.channelIds}
                onChange={(value) => {
                  const channels = CHANNELS.filter((channel) => value.includes(channel.id));
                  const hasEdi = channels.some((channel) => channel.type === 'EDI');
                  const hasPlatform = channels.some((c) => c.type === '平台授权');
                  setForm((current) => ({
                    ...current,
                    channelIds: value,
                    retailerInput: hasEdi ? current.retailerInput : '',
                    ownerMode: hasEdi ? 'include' : current.ownerMode,
                    // 切换掉平台授权渠道时清空目标仓选择
                    platformTargetLocation: hasPlatform ? current.platformTargetLocation : { mode: 'preset', presetId: '', customCode: '' },
                  }));
                }}
                placeholder="全部渠道（不限）"
              />
            </Field>
            {ediSelected ? (
              <>
                <Field label="Retailer" required hint="选择 EDI 渠道后，需要填写对应 retailer。">
                  <Input value={form.retailerInput} onChange={(value) => setField('retailerInput', value)} placeholder="输入 retailer，如 Walmart US" className={!form.retailerInput ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : undefined} />
                </Field>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">已选择 EDI 渠道时，目标渠道为必填项，且后续需要明确 retailer 与货主范围后才能参与同步。</div>
              </>
            ) : null}
            {platformChannel ? (
              <PlatformTargetLocationSection
                channelId={platformChannel.id}
                channelName={platformChannel.name}
                value={form.platformTargetLocation}
                onChange={(val) => setField('platformTargetLocation', val)}
              />
            ) : null}
          </div>
        </Section>

        <Section title="参与同步的 SKU" desc="通过货主、仓库和 SKU 条件逐层筛选参与本次同步的商品范围。" compact>
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="货主条件" hint="先限定哪些货主名下的 SKU 可以参与同步。">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <ChipButton active={form.ownerMode === 'all'} onClick={() => setField('ownerMode', 'all')}>全部货主</ChipButton>
                    <ChipButton active={form.ownerMode === 'include'} onClick={() => setField('ownerMode', 'include')}>仅包含货主</ChipButton>
                    <ChipButton active={form.ownerMode === 'exclude'} onClick={() => setField('ownerMode', 'exclude')}>排除货主</ChipButton>
                  </div>
                  {form.ownerMode !== 'all' ? <Input value={form.ownerInput} onChange={(value) => setField('ownerInput', value)} placeholder={form.ownerMode === 'include' ? '输入允许参与同步的货主，如 货主A,货主B' : '输入要排除的货主，如 货主C'} /> : null}
                </div>
              </Field>

              <Field label="仓库条件" hint="定义这些 SKU 从哪些仓库汇总库存。">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <ChipButton active={form.warehouseMode === 'all'} onClick={() => setField('warehouseMode', 'all')}>全部仓库</ChipButton>
                    <ChipButton active={form.warehouseMode === 'specific'} onClick={() => setField('warehouseMode', 'specific')}>指定仓库</ChipButton>
                  </div>
                  {form.warehouseMode === 'specific' ? (
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                      <MultiSelect opts={WAREHOUSES.map((warehouse) => ({ id: warehouse.id, label: warehouse.name, sub: warehouse.tag }))} value={form.warehouseIds} onChange={(value) => setField('warehouseIds', value)} placeholder="选择参与汇总的仓库…" />
                      <Select value={form.warehouseMerge} onChange={(value) => setField('warehouseMerge', value as FormState['warehouseMerge'])}>
                        <option value="sum">库存求和</option>
                        <option value="max">取最大值</option>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>

            <Field label="SKU 条件" required={isSkuListPathRequired} hint="可与货主、仓库条件叠加使用，进一步收窄参与同步的 SKU 范围。">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <ChipButton active={form.skuMode === 'all'} onClick={() => { setField('skuMode', 'all'); setSkuImportMessage(null); }}>全部 SKU</ChipButton>
                  <ChipButton active={form.skuMode === 'include'} onClick={() => setField('skuMode', 'include')}>仅包含</ChipButton>
                  <ChipButton active={form.skuMode === 'exclude'} onClick={() => setField('skuMode', 'exclude')}>排除</ChipButton>
                </div>
                {form.skuMode !== 'all' ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <Select value={form.skuBy} onChange={(value) => { setField('skuBy', value as SkuBy); setSkuImportMessage(null); setSkuSearch(''); setSkuDraft(''); }}>
                        <option value="sku_list">SKU 列表</option>
                        <option value="tag">标签</option>
                        <option value="category">品类</option>
                      </Select>
                      {form.skuBy === 'sku_list' ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_110px]">
                            <Input
                              value={skuDraft}
                              onChange={setSkuDraft}
                              placeholder="粘贴或输入 SKU，支持逗号 / 换行分隔"
                              className={!skuItems.length ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : undefined}
                            />
                            <button type="button" onClick={handleAddSkuDraft} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">补充 SKU</button>
                          </div>

                          <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="text-[12px] font-medium text-[var(--foreground)]">文件导入<span className="ml-0.5 text-red-500">*</span></div>
                                <div className="mt-0.5 text-[11px] text-[var(--muted)]">支持 Excel / CSV，导入会覆盖当前 SKU 列表，导入后仍可继续手动粘贴或编辑。</div>
                              </div>
                              <>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                  className="hidden"
                                  onChange={handleSkuFileImport}
                                />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">
                                  <Upload className="size-3.5" />
                                  导入文件
                                </button>
                              </>
                            </div>
                            {skuImportMessage ? (
                              <div className={cn('text-[11px]', skuImportMessage.type === 'success' ? 'text-green-600' : 'text-red-500')}>
                                {skuImportMessage.text}
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-[12px] text-[var(--muted)]">已选 SKU {skuItems.length} 个{skuSearch ? ` · 当前筛选 ${filteredSkuItems.length} 个` : ''}</div>
                              <button type="button" onClick={handleClearSkuList} className="text-[12px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">清空全部</button>
                            </div>
                            <Input value={skuSearch} onChange={setSkuSearch} placeholder="搜索已选 SKU" />
                            <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                              {filteredSkuItems.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {filteredSkuItems.map((sku) => (
                                    <span key={sku} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1 text-[11px] font-medium text-[var(--foreground)]">
                                      {sku}
                                      <button type="button" onClick={() => handleRemoveSku(sku)} className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">×</button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-[var(--muted)]">{skuItems.length > 0 ? '没有匹配当前搜索条件的 SKU' : '请导入文件或手动补充 SKU'}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {form.skuBy === 'tag' ? <Input value={form.skuTags} onChange={(value) => setField('skuTags', value)} placeholder="标签，如 no-sync,promo" /> : null}
                      {form.skuBy === 'category' ? <Input value={form.skuCategories} onChange={(value) => setField('skuCategories', value)} placeholder="品类，如 Electronics,Apparel" /> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </Field>

            <CompactSummary title="当前参与范围" items={scopeSummary} />
          </div>
        </Section>

        <Section title="数据准备" desc="确定参与同步的 SKU 后，选择进入库存计算前的数据准备方式。" compact>
          <div className="space-y-5">
            <Field label="准备方式">
              <div className="flex flex-wrap gap-2">
                <ChipButton active={form.dataPrepMode === 'direct'} onClick={() => setField('dataPrepMode', 'direct')}>直接同步库存</ChipButton>
                <ChipButton active={form.dataPrepMode === 'query_first'} onClick={() => setField('dataPrepMode', 'query_first')}>先查询 SKU，再同步库存</ChipButton>
              </div>
            </Field>

            {form.dataPrepMode === 'query_first' ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3 text-[12px] text-[var(--muted)]">
                先根据上方条件确认参与同步的 SKU，再对确认后的 SKU 执行库存查询与后续输出处理。
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3 text-[12px] text-[var(--muted)]">
                参与同步的 SKU 将直接进入库存计算。
              </div>
            )}

            <CompactSummary title="当前数据准备策略" items={dataPrepSummary} />
          </div>
        </Section>

        <Section title="库存计算" desc="定义参与同步的 SKU 最终输出库存数量的计算方式。" compact>
          <div className="space-y-5">
            <Field label="库存口径">
              <div className="flex flex-wrap gap-2">
                <ChipButton active={form.qtyMode === 'full'} onClick={() => setField('qtyMode', 'full')}>直接同步</ChipButton>
                <ChipButton active={form.qtyMode === 'deduct'} onClick={() => setField('qtyMode', 'deduct')}>扣减后同步</ChipButton>
                <ChipButton active={form.qtyMode === 'ratio'} onClick={() => setField('qtyMode', 'ratio')}>比例同步</ChipButton>
              </div>
            </Field>

            {form.qtyMode !== 'full' ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <ToggleRow label="扣减仓库预占库存" hint="从可同步库存中扣减仓库已预占但未释放的数量。" checked={form.deductReserved} onChange={(value) => setField('deductReserved', value)} />
                <ToggleRow label="扣除安全库存" checked={form.deductSafety} onChange={(value) => setField('deductSafety', value)} />
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
              {form.qtyMode === 'ratio' ? (
                <Field label="同步比例">
                  <Input type="number" value={form.ratio} onChange={(value) => setField('ratio', value)} placeholder="80" />
                </Field>
              ) : null}
              <Field label="固定保留量">
                <Input type="number" value={form.buffer} onChange={(value) => setField('buffer', value)} placeholder="0" />
              </Field>
              <Field label="最大同步量">
                <Input type="number" value={form.maxQty} onChange={(value) => setField('maxQty', value)} placeholder="不限" />
              </Field>
              <Field label="安全阈值">
                <Input type="number" value={form.safetyThreshold} onChange={(value) => setField('safetyThreshold', value)} placeholder="不限" />
              </Field>
              {form.qtyMode !== 'full' ? (
                <Field label="在途库存">
                  <Select value={form.inclInTransit} onChange={(value) => setField('inclInTransit', value as FormState['inclInTransit'])}>
                    <option value="none">不含在途</option>
                    <option value="1">1 天在途</option>
                    <option value="3">3 天在途</option>
                    <option value="7">7 天在途</option>
                  </Select>
                </Field>
              ) : null}
            </div>

            <CompactSummary title="当前库存计算策略" items={quantitySummary} />
          </div>
        </Section>

        <Section title="输出处理" desc="定义同步报文中输出哪些字段，以及特殊状态的处理方式。" compact>
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-2">
              <ToggleRow label="同步商品状态" hint="除库存数量外，一并输出可用 / 不可用等状态。" checked={form.syncStatus} onChange={(value) => setField('syncStatus', value)} />
              <ToggleRow label="不可用 SKU 按 0 库存输出" hint="对已参与同步但当前不可用的 SKU，统一按 0 库存输出。" checked={form.unavailToZero} onChange={(value) => setField('unavailToZero', value)} />
              <ToggleRow label="包含 0 库存 SKU" checked={form.includeZero} onChange={(value) => setField('includeZero', value)} />
              <ToggleRow label="包含 Backorder SKU" checked={form.includeBackorder} onChange={(value) => setField('includeBackorder', value)} />
            </div>

            <Field label="附加输出字段">
              <div className="space-y-3">
                <ToggleRow label="输出额外商品字段" checked={form.extraFields} onChange={(value) => setField('extraFields', value)} />
                {form.extraFields ? <div className="flex flex-wrap gap-2">{EXTRA_FIELDS.map((field) => { const active = form.extraFieldKeys.includes(field); return <button key={field} type="button" onClick={() => setField('extraFieldKeys', active ? form.extraFieldKeys.filter((item) => item !== field) : [...form.extraFieldKeys, field])} className={cn('rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors', active ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]')}>{field}</button>; })}</div> : null}
              </div>
            </Field>

            <CompactSummary title="当前输出策略" items={outputSummary} />
          </div>
        </Section>

        <Section title="执行与异常" desc="最后再配置执行频率、失败重试和差异预警，保证日常运营可控。" compact>
          <div className="space-y-5">
            <Field label="执行频率">
              <div className="flex flex-wrap gap-2">
                <ChipButton active={form.frequency === 'daily'} onClick={() => setField('frequency', 'daily')}>每日定时</ChipButton>
                <ChipButton active={form.frequency === 'hourly'} onClick={() => setField('frequency', 'hourly')}>每小时</ChipButton>
                <ChipButton active={form.frequency === 'realtime'} onClick={() => setField('frequency', 'realtime')}>实时触发</ChipButton>
                <ChipButton active={form.frequency === 'pull'} onClick={() => setField('frequency', 'pull')}>拉取模式</ChipButton>
                <ChipButton active={form.frequency === 'manual'} onClick={() => setField('frequency', 'manual')}>手动执行</ChipButton>
              </div>
            </Field>

            {form.frequency === 'daily' || form.frequency === 'hourly' ? (
              <Field label="执行时间">
                <Input type="time" value={form.execTime} onChange={(value) => setField('execTime', value)} className="max-w-[220px]" />
              </Field>
            ) : null}

            {form.frequency === 'realtime' ? (
              <Field label="触发事件">
                <div className="flex flex-wrap gap-2">
                  {REALTIME_EVENTS.map((event) => {
                    const active = form.realtimeEvents.includes(event);
                    return <button key={event} type="button" onClick={() => setField('realtimeEvents', active ? form.realtimeEvents.filter((item) => item !== event) : [...form.realtimeEvents, event])} className={cn('rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors', active ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]')}>{event}</button>;
                  })}
                </div>
              </Field>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[160px_160px_minmax(0,1fr)]">
              <Field label="失败重试次数">
                <Input type="number" value={form.retryMax} onChange={(value) => setField('retryMax', value)} />
              </Field>
              <Field label="重试间隔（分钟）">
                <Input type="number" value={form.retryInterval} onChange={(value) => setField('retryInterval', value)} />
              </Field>
              <Field label="超限处理策略">
                <Select value={form.onFailure} onChange={(value) => setField('onFailure', value as FormState['onFailure'])}>
                  <option value="alert_wait">告警并挂起</option>
                  <option value="alert_skip">告警并跳过</option>
                  <option value="silent_skip">静默跳过</option>
                </Select>
              </Field>
            </div>

            <Field label="差异预警">
              <div className="space-y-3">
                <ToggleRow label="启用差异预警" checked={form.diffCheck} onChange={(value) => setField('diffCheck', value)} />
                {form.diffCheck ? (
                  <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <Field label="差值容忍（%）">
                      <Input type="number" value={form.diffTolerance} onChange={(value) => setField('diffTolerance', value)} />
                    </Field>
                    <Field label="通知渠道">
                      <div className="flex flex-wrap gap-2">
                        {ALERT_CHANNELS.map((channel) => {
                          const active = form.alertChannels.includes(channel);
                          return <button key={channel} type="button" onClick={() => setField('alertChannels', active ? form.alertChannels.filter((item) => item !== channel) : [...form.alertChannels, channel])} className={cn('rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors', active ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]')}>{channel}</button>;
                        })}
                      </div>
                    </Field>
                  </div>
                ) : null}
              </div>
            </Field>
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
            {saved ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="size-3.5" />已保存</span> : form.name ? <span>未保存的更改</span> : <span>填写后保存即可生效</span>}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/rules/inventory-sync" className="flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">取消</Link>
            <button type="button" onClick={() => { setField('status', 'draft'); handleSave(); }} className="flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">存为草稿</button>
            <button type="button" onClick={handleSave} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-60">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}{saving ? '保存中…' : form.status === 'draft' ? '保存草稿' : '保存并启用'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
