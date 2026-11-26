'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Plus, Search, Trash2, X, ChevronDown } from 'lucide-react';
import { useOms } from './provider';
import {
  inboundReasonLabels,
  type InboundPlan, type InboundReason,
  type ReplenishmentDestinationType, type ReplenishmentLine,
  type ReplenishmentSourceType,
} from './replenishment';
import { useShellState } from '@/components/providers/shell-state-provider';
import { warehouses } from '@/lib/mock-data/warehouses';
import { cn } from '@/lib/utils';

// ─── 样式 ─────────────────────────────────────────────────────────────────────

const input = 'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]';
const tdInput = 'h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] outline-none transition focus:border-[var(--primary)]';

// ─── 商品目录 ─────────────────────────────────────────────────────────────────

const products = [
  { sku: 'WEP-BLK-001', name: 'Wireless Earbuds Pro · 午夜黑',      variantId: 'var_001_1', channelSku: 'NW-WEP-BLK-US', asin: 'B0C8NW4P21', fnsku: 'X004NWEP01' },
  { sku: 'WEP-WHT-001', name: 'Wireless Earbuds Pro · 珍珠白',      variantId: 'var_001_2', channelSku: 'NW-WEP-WHT-US', asin: 'B0C8NW4P22', fnsku: 'X004NWEP02' },
  { sku: 'WEP-BLU-001', name: 'Wireless Earbuds Pro · 星空蓝',      variantId: 'var_001_3', channelSku: 'NW-WEP-BLU-US', asin: 'B0C8NW4P24', fnsku: 'X004NWEP03' },
  { sku: 'TP-BLK-STD',  name: 'Transit Pack · 黑色标准版',          variantId: 'var_002_1', channelSku: 'NW-TP-BLK-STD',  asin: 'B0C8NW4P23', fnsku: 'X004NWTP01' },
  { sku: 'TP-BLK-MINI', name: 'Transit Pack · 黑色迷你版',          variantId: 'var_002_2', channelSku: 'NW-TP-BLK-MINI', asin: 'B0C8NW4P25', fnsku: 'X004NWTP02' },
  { sku: 'TP-GRY-STD',  name: 'Transit Pack · 深灰标准版',          variantId: 'var_002_3', channelSku: 'NW-TP-GRY-STD',  asin: 'B0C8NW4P26', fnsku: 'X004NWTP03' },
  { sku: 'TP-OLV-STD',  name: 'Transit Pack · 橄榄绿标准版',        variantId: 'var_002_5', channelSku: 'NW-TP-OLV-STD',  asin: 'B0C8NW4P28', fnsku: 'X004NWTP05' },
  { sku: 'DC16-BLK',    name: 'Dock Case iPhone 16 · 石墨黑',       variantId: 'var_003_1', channelSku: 'NW-DC16-BLK-US', asin: 'B0C9DC1600', fnsku: 'X004DC1601' },
  { sku: 'DC16-WHT',    name: 'Dock Case iPhone 16 · 月白',         variantId: 'var_003_2', channelSku: 'NW-DC16-WHT-US', asin: 'B0C9DC1601', fnsku: 'X004DC1602' },
  { sku: 'DC16-ONG',    name: 'Dock Case iPhone 16 · 沙漠橙',       variantId: 'var_003_3', channelSku: 'NW-DC16-ONG-US', asin: 'B0C9DC1602', fnsku: 'X004DC1603' },
  { sku: 'DC16-BLU',    name: 'Dock Case iPhone 16 · 深海蓝',       variantId: 'var_003_4', channelSku: 'NW-DC16-BLU-US', asin: 'B0C9DC1603', fnsku: 'X004DC1604' },
  { sku: 'HL-LED-400',  name: 'Headlamp LED 400',                   variantId: 'hl_001',   channelSku: '', asin: '', fnsku: '' },
  { sku: 'SWB-SIL-M',  name: 'Smart Watch Band · 银色 M',           variantId: 'swb_001',  channelSku: '', asin: '', fnsku: '' },
  { sku: 'FAK-DLX-01', name: 'First Aid Kit Deluxe',                variantId: 'fak_001',  channelSku: '', asin: '', fnsku: '' },
  { sku: 'PC-CLR-IP15', name: 'Phone Case Clear iPhone 15',         variantId: 'pc_001',   channelSku: '', asin: '', fnsku: '' },
  { sku: 'UC-2M-WHT',  name: 'USB-C Cable 2m · 白色',               variantId: 'uc_001',   channelSku: '', asin: '', fnsku: '' },
  { sku: 'SP-TG-IP15', name: 'Screen Protector iPhone 15',          variantId: 'sp_001',   channelSku: '', asin: '', fnsku: '' },
  { sku: 'CD-MG-WHT',  name: 'Charging Dock MagSafe · 白色',        variantId: 'cd_001',   channelSku: '', asin: '', fnsku: '' },
];

// ─── 收货仓库选项（OMS + 平台，收货仓库第一）────────────────────────────────

type DestOption = {
  id: string;
  name: string;
  destinationType: ReplenishmentDestinationType;
  address: string;
  country: string;
  connectionId?: string;
  site?: string;
  warehouseId?: string;
};

const makeDestOptions = (): DestOption[] => [
  ...warehouses.filter(w => w.active).map(w => ({
    id: w.id, name: `${w.code} · ${w.name}`, destinationType: 'oms_warehouse' as ReplenishmentDestinationType,
    address: w.address, country: w.country, warehouseId: w.id,
  })),
  { id: 'plt-amz-us', name: 'Amazon FBA · 美国站 (US)', destinationType: 'amazon_fba', address: '由 Amazon 分仓分配', country: 'US', connectionId: 'amz-northwind-seller-na', site: 'US' },
  { id: 'plt-amz-ca', name: 'Amazon FBA · 加拿大站 (CA)', destinationType: 'amazon_fba', address: '由 Amazon 分仓分配', country: 'CA', connectionId: 'amz-northwind-seller-na', site: 'CA' },
  { id: 'plt-amz-uk', name: 'Amazon FBA · 英国站 (UK)', destinationType: 'amazon_fba', address: '由 Amazon 分仓分配', country: 'GB', connectionId: 'amz-northwind-seller-eu', site: 'UK' },
  { id: 'plt-tiktok-us', name: 'TikTok FBT · 美国站 (US)', destinationType: 'tiktok_fulfillment', address: '由 TikTok 分仓分配', country: 'US', connectionId: 'tiktok-seller-us', site: 'US' },
  { id: 'plt-walmart-us', name: 'Walmart WFS · 美国站 (US)', destinationType: 'walmart_fc', address: '由 Walmart 分仓分配', country: 'US', connectionId: 'wmt-northwind-us', site: 'US' },
];

// ─── 发货仓库选项（从发货仓库配置派生 sourceType）────────────────────────────

type SourceOption = { id: string; name: string; address: string; city: string; country: string; type: ReplenishmentSourceType };

const externalSources: SourceOption[] = [
  { id: 'supplier-techparts', name: 'TechParts Supplier', address: '88 Baoan Industrial Road, Shenzhen', city: 'Shenzhen', country: 'CN', type: 'supplier' },
  { id: 'supplier-gz', name: 'Guangzhou Electronics', address: '18 Huangpu Avenue, Guangzhou', city: 'Guangzhou', country: 'CN', type: 'supplier' },
  { id: 'retailer-acme', name: 'Acme Retailer DC', address: '500 Commerce Way, Newark, NJ', city: 'Newark', country: 'US', type: 'retailer' },
];

// ─── 子组件 ───────────────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-3">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-[12px] text-[var(--muted)]">{hint}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--muted)]">
        {label}{required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        <div className="mt-1">{children}</div>
      </label>
      {hint && <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

// ─── 商品搜索下拉（用于映射弹窗）────────────────────────────────────────────

type SuggestionItem = { value: string; label: string; sub?: string };

function ComboInput({ value, onChange, suggestions, placeholder }: {
  value: string; onChange: (v: string) => void; suggestions: SuggestionItem[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() =>
    value.trim()
      ? suggestions.filter(s => `${s.value} ${s.label}`.toLowerCase().includes(value.toLowerCase())).slice(0, 20)
      : suggestions.slice(0, 20)
  , [value, suggestions]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder}
        className={input}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[70] mt-1 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl" style={{ maxHeight: 200 }}>
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {filtered.map(s => (
              <button key={s.value} type="button"
                className="w-full px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(s.value); setOpen(false); }}>
                <div className="text-[12px] font-medium">{s.value}</div>
                {s.label && <div className="text-[11px] text-[var(--muted)]">{s.label}{s.sub ? ` · ${s.sub}` : ''}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 映射弹窗（双栏：左侧商品搜索，右侧 SKU 字段）────────────────────────────

function MappingDialog({ line, destType, onClose, onSave }: {
  line: ReplenishmentLine;
  destType: ReplenishmentDestinationType;
  onClose: () => void;
  onSave: (patch: Partial<ReplenishmentLine>) => void;
}) {
  const [query, setQuery] = useState('');
  const isPlatform = ['amazon_fba', 'walmart_fc', 'tiktok_fulfillment'].includes(destType);
  const isFba = destType === 'amazon_fba';

  // Field states
  const [platformSku, setPlatformSku] = useState(line.channelSku ?? line.msku ?? '');
  const [asin, setAsin] = useState(line.asin ?? '');
  const [fnsku, setFnsku] = useState(line.fnsku ?? '');
  const [warehouseSku, setWarehouseSku] = useState(line.sourceSku ?? line.sku);
  const [prepOwner, setPrepOwner] = useState<'seller' | 'amazon'>('seller');
  const [labelOwner, setLabelOwner] = useState<'seller' | 'amazon'>('seller');

  const filtered = useMemo(() =>
    query ? products.filter(p => `${p.sku} ${p.name} ${p.channelSku} ${p.asin}`.toLowerCase().includes(query.toLowerCase())) : products
  , [query]);

  const selectProduct = (p: typeof products[0]) => {
    if (p.channelSku) setPlatformSku(p.channelSku);
    if (p.asin) setAsin(p.asin);
    if (p.fnsku) setFnsku(p.fnsku);
    setWarehouseSku(p.sku);
  };

  const platformSkuSuggestions = products.filter(p => p.channelSku).map(p => ({ value: p.channelSku, label: p.sku, sub: p.name }));
  const warehouseSkuSuggestions = products.map(p => ({ value: p.sku, label: p.name }));

  const canSave = isPlatform ? (platformSku.trim() && warehouseSku.trim()) : warehouseSku.trim();

  const platformSkuLabel = destType === 'amazon_fba' ? 'MSKU（Merchant SKU）' : destType === 'walmart_fc' ? 'Seller SKU' : destType === 'tiktok_fulfillment' ? 'FBT Goods ID' : '目标仓库SKU';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex w-full max-w-[720px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" style={{ height: 520 }} onClick={e => e.stopPropagation()}>
        {/* 左侧：商品搜索 */}
        <div className="flex w-[260px] shrink-0 flex-col border-r border-[var(--border)]">
          <div className="border-b border-[var(--border-subtle)] p-3">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5">
              <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索商品" className="w-full bg-transparent text-[12px] outline-none" />
              {query && <button type="button" onClick={() => setQuery('')}><X className="size-3 text-[var(--muted)]" /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(p => (
              <button key={p.sku} type="button" onClick={() => selectProduct(p)}
                className={cn('w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-subtle)]', p.sku === line.sku && 'bg-[var(--primary-soft)]')}>
                <div className="text-[12px] font-medium">{p.sku}</div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：映射字段 */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold">维护 SKU 映射</h2>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">{line.sku} · {products.find(p => p.sku === line.sku)?.name}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 p-5">
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
              OMS SKU：<span className="font-medium">{line.sku}</span>
              <span className="ml-3 text-[var(--muted)]">{products.find(p => p.sku === line.sku)?.name}</span>
            </div>

            {isPlatform ? (
              <>
                <Field label={platformSkuLabel} required>
                  <ComboInput value={platformSku} onChange={setPlatformSku} suggestions={platformSkuSuggestions} placeholder="输入或搜索" />
                </Field>
                {isFba && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ASIN">
                      <input className={input} value={asin} onChange={e => setAsin(e.target.value)} placeholder="B0C8NW4P21" />
                    </Field>
                    <Field label="FNSKU / 条码">
                      <input className={input} value={fnsku} onChange={e => setFnsku(e.target.value)} placeholder="X004NWEP01" />
                    </Field>
                  </div>
                )}
                {isFba && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="贴标责任方">
                      <select className={input} value={labelOwner} onChange={e => setLabelOwner(e.target.value as 'seller' | 'amazon')}>
                        <option value="seller">Seller</option>
                        <option value="amazon">Amazon</option>
                      </select>
                    </Field>
                    <Field label="预处理责任方">
                      <select className={input} value={prepOwner} onChange={e => setPrepOwner(e.target.value as 'seller' | 'amazon')}>
                        <option value="seller">Seller</option>
                        <option value="amazon">Amazon</option>
                      </select>
                    </Field>
                  </div>
                )}
              </>
            ) : (
              <Field label="目标仓库SKU">
                <ComboInput value={platformSku} onChange={setPlatformSku} suggestions={warehouseSkuSuggestions} placeholder="目标仓内商品编码" />
              </Field>
            )}

            <Field label="发货仓库SKU" required>
              <ComboInput value={warehouseSku} onChange={setWarehouseSku} suggestions={warehouseSkuSuggestions} placeholder="发货仓库的商品编码" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5">
            <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">取消</button>
            <button type="button" disabled={!canSave} onClick={() => {
              onSave({ channelSku: platformSku.trim() || undefined, destinationSku: platformSku.trim() || undefined, msku: isFba ? platformSku.trim() : undefined, sourceSku: warehouseSku.trim(), asin: asin.trim() || undefined, fnsku: fnsku.trim() || undefined, prepOwnership: isFba ? prepOwner : undefined, labelOwnership: isFba ? labelOwner : undefined });
              onClose();
            }} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white disabled:opacity-40">保存映射</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 添加商品弹窗 ─────────────────────────────────────────────────────────────

function ProductPicker({ open, selectedSkus, destType, onClose, onConfirm }: {
  open: boolean; selectedSkus: Set<string>; destType: ReplenishmentDestinationType;
  onClose: () => void; onConfirm: (skus: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const terms = query.split(/[\n,，\s]+/).map(v => v.trim().toLowerCase()).filter(Boolean);
  const filtered = products.filter(p => terms.length === 0 || terms.some(t => `${p.sku} ${p.name} ${p.channelSku} ${p.asin}`.toLowerCase().includes(t)));
  const selectable = filtered.filter(p => !selectedSkus.has(p.sku));
  const allSelected = selectable.length > 0 && selectable.every(p => pending.has(p.sku));
  if (!open) return null;
  const toggle = (sku: string) => setPending(prev => { const n = new Set(prev); n.has(sku) ? n.delete(sku) : n.add(sku); return n; });
  const toggleAll = () => setPending(prev => { const n = new Set(prev); selectable.forEach(p => allSelected ? n.delete(p.sku) : n.add(p.sku)); return n; });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[82vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">添加商品</h2>
            <p className="mt-1 text-[12px] text-[var(--muted)]">支持搜索 SKU、商品名、MSKU、ASIN；多个关键词可换行或逗号分隔。</p>
          </div>
          <button type="button" onClick={onClose}><X className="size-4 text-[var(--muted)]" /></button>
        </div>
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2">
            <Search className="mt-1 size-4 shrink-0 text-[var(--muted)]" />
            <textarea autoFocus rows={2} value={query} onChange={e => setQuery(e.target.value)} placeholder="SKU、商品名、MSKU…" className="w-full resize-none bg-transparent text-[13px] outline-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-2.5 text-[12px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} />全选</label>
          <span className="text-[var(--muted)]">{filtered.length} 项 · 已选 {pending.size}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filtered.map(p => {
            const added = selectedSkus.has(p.sku);
            const checked = added || pending.has(p.sku);
            return (
              <label key={p.sku} className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 hover:bg-[var(--surface-subtle)]', added && 'opacity-50 cursor-not-allowed')}>
                <input type="checkbox" disabled={added} checked={checked} onChange={() => toggle(p.sku)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{p.sku} · {p.name}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {destType === 'amazon_fba' ? `MSKU: ${p.channelSku || '—'} · ASIN: ${p.asin || '—'}` : `平台SKU: ${p.channelSku || '—'}`}
                  </div>
                </div>
                {added && <span className="text-[11px] text-[var(--muted)]">已添加</span>}
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">已添加商品不会重复加入</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[12px]">取消</button>
            <button type="button" disabled={!pending.size} onClick={() => { onConfirm([...pending]); setPending(new Set()); setQuery(''); }} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white disabled:opacity-40">添加 {pending.size || ''} 个</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主表单 ───────────────────────────────────────────────────────────────────

export function InboundPlanCreate() {
  const { merchantScope } = useShellState();
  const { executeReplenishment, snapshots } = useOms();
  const merchantId = merchantScope === 'all' ? snapshots[0]?.merchantId : merchantScope;
  const searchParams = useSearchParams();
  const skusParam = searchParams.get('skus');
  const router = useRouter();

  // 目标/来源仓库选项
  const destOptions = useMemo(() => makeDestOptions(), []);
  const sourceWarehouses = useMemo(() => warehouses.filter(w => w.active).map(w => ({ id: w.id, name: `${w.code} · ${w.name}`, address: w.address, city: w.city, country: w.country, type: 'own_warehouse' as ReplenishmentSourceType })), []);
  const allSourceOptions: SourceOption[] = useMemo(() => [...sourceWarehouses, ...externalSources], [sourceWarehouses]);

  // 表单状态
  const [number, setNumber] = useState(() => {
    const d = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `IP-${d}-${suffix}`;
  });
  const [inboundReason, setInboundReason] = useState<InboundReason>('purchase_receipt');
  const [sourceDocType, setSourceDocType] = useState<'purchase_order' | 'transfer_order' | 'replenishment' | 'return_order' | 'manual'>('purchase_order');
  const [sourceDocNumber, setSourceDocNumber] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('plt-amz-us');
  const [sourceId, setSourceId] = useState('wh_lax');
  const [arrival, setArrival] = useState('');
  const [plannedShip, setPlannedShip] = useState('');
  const [note, setNote] = useState('');
  // FBA 分仓方式
  const [shipmentMode, setShipmentMode] = useState<'box_first' | 'placement_first'>('box_first');
  // WFS 退货地址
  const [returnAddr, setReturnAddr] = useState({ name: '', address1: '', city: '', state: '', zip: '', country: 'US' });
  // 供应商/Retailer 自定义发货地址
  const [customShipFrom, setCustomShipFrom] = useState({ name: '', phone: '', address1: '', city: '', country: 'CN' });
  const [editingShipFrom, setEditingShipFrom] = useState(false);

  // 商品明细
  const [lines, setLines] = useState<ReplenishmentLine[]>(() => {
    if (!skusParam) return [];
    return skusParam.split(',').flatMap(item => {
      const [rawSku, qtyStr] = item.split(':');
      const sku = rawSku?.trim(); const qty = parseInt(qtyStr) || 1;
      const p = products.find(x => x.sku === sku);
      if (!p) return [];
      return [{ id: `new:${p.sku}`, sku: p.sku, omsVariantId: p.variantId, channelSku: p.channelSku, asin: p.asin, fnsku: p.fnsku, sourceSku: p.sku, quantity: qty, unit: '件' as const, cartonQuantity: 0 }] satisfies ReplenishmentLine[];
    });
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mappingLineId, setMappingLineId] = useState<string | null>(null);

  // 批量操作
  const [bulkQty, setBulkQty] = useState('');
  const [bulkUnit, setBulkUnit] = useState('');
  const [bulkCarton, setBulkCarton] = useState('');
  const [bulkLot, setBulkLot] = useState('');
  const [bulkExpiry, setBulkExpiry] = useState('');
  const [bulkGtin, setBulkGtin] = useState('');
  const [bulkArrival, setBulkArrival] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 派生
  const selectedDest = destOptions.find(d => d.id === destWarehouseId) ?? destOptions[0];
  const destType = selectedDest.destinationType;
  const isFba = destType === 'amazon_fba';
  const isWfs = destType === 'walmart_fc';
  const isFbt = destType === 'tiktok_fulfillment';
  const isPlatform = isFba || isWfs || isFbt;

  const sourceOption = allSourceOptions.find(o => o.id === sourceId) ?? allSourceOptions[0];
  const isExternalSource = ['supplier', 'retailer'].includes(sourceOption.type);

  // 来源单号建议（从快照中读取已有单据）
  const sourceDocSuggestions = useMemo<SuggestionItem[]>(() => {
    const items: SuggestionItem[] = [];
    snapshots.forEach(s => {
      (s.purchaseOrders ?? []).forEach(po => items.push({ value: po.number, label: po.number, sub: '采购单' }));
      (s.transferOrders ?? []).forEach(to => items.push({ value: to.number, label: to.number, sub: '调拨单' }));
    });
    return items;
  }, [snapshots]);
  const selectedSkus = new Set(lines.map(l => l.sku));
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  // 改点2：提交成功后跳详情
  useEffect(() => {
    if (!success) return;
    const snap = snapshots.find(s => s.merchantId === merchantId);
    if (!snap) return;
    // 按 createdAt 降序取最新那条，避免相同编号的历史计划干扰跳转
    const matches = (snap.inboundPlansV2 ?? []).filter(p => p.number === number);
    const created = matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (created) router.push('/dashboard/inbound-plans/' + encodeURIComponent(created.id));
  }, [success, snapshots, merchantId, number, router]);

  const updateLine = (id: string, patch: Partial<ReplenishmentLine>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));

  const applyBulk = (patch: Partial<ReplenishmentLine>) =>
    setLines(prev => prev.map(l => selectedRows.has(l.id) ? { ...l, ...patch } : l));

  const addProducts = (skus: string[]) => {
    const additions = skus.map(sku => products.find(p => p.sku === sku)).filter(Boolean).map(p => ({
      id: `new:${p!.sku}`, sku: p!.sku, omsVariantId: p!.variantId, channelSku: p!.channelSku, destinationSku: p!.channelSku,
      msku: p!.channelSku || undefined, asin: p!.asin || undefined, fnsku: p!.fnsku || undefined, sourceSku: p!.sku,
      quantity: 1, unit: '件', cartonQuantity: 0, prepOwnership: isFba ? 'seller' as const : undefined, labelOwnership: isFba ? 'seller' as const : undefined,
    } satisfies ReplenishmentLine));
    setLines(prev => [...prev, ...additions.filter(l => !prev.some(x => x.sku === l.sku))]);
    setPickerOpen(false);
  };

  const submit = async (asDraft: boolean) => {
    setError('');
    if (!merchantId) return setError('请选择具体商户');
    if (!lines.length) return setError('请至少添加一条商品明细');
    if (lines.some(l => l.quantity < 1)) return setError('商品数量必须 ≥ 1');
    if (isPlatform && lines.some(l => !(l.channelSku ?? l.msku ?? l.fbtGoodsId)?.trim())) return setError(`平台目标必须先维护 ${isFba ? 'MSKU' : isWfs ? 'Seller SKU' : 'FBT Goods ID'}`);
    if (isWfs && lines.some(l => !l.gtin?.trim())) return setError('Walmart WFS 目标每行必须填写 GTIN');
    if (isWfs && (!returnAddr.address1.trim() || !returnAddr.city.trim())) return setError('Walmart WFS 目标必须填写退货地址');

    const sourceAddress = { name: sourceOption.name, address1: sourceOption.address, city: sourceOption.city, country: sourceOption.country };
    const targetAddress = selectedDest.warehouseId
      ? { name: selectedDest.name, address1: selectedDest.address, city: '', country: selectedDest.country }
      : { name: selectedDest.name, address1: '', city: '', country: selectedDest.country, pendingExternalConfirmation: true };

    const plan: Omit<InboundPlan, keyof import('./types').Entity | 'status' | 'createdAt'> = {
      number, inboundReason, sourceType: sourceOption.type,
      sourceLabel: sourceOption.name, sourcePartyId: sourceOption.id,
      sourceAddressId: sourceOption.id, sourceWarehouseId: sourceOption.id,
      sourceAddress, destinationAddress: targetAddress,
      destinationType: destType, connectionId: selectedDest.connectionId, site: selectedDest.site,
      destinationWarehouseId: selectedDest.warehouseId,
      sourceDoc: sourceDocNumber.trim() ? ({ type: sourceDocType === 'return_order' ? 'return' : sourceDocType === 'purchase_order' ? 'purchase_order' : sourceDocType === 'transfer_order' ? 'transfer_order' : sourceDocType === 'replenishment' ? 'replenishment' : 'manual', number: sourceDocNumber.trim() } as import('./replenishment').SourceDoc) : undefined,
      returnAddress: isWfs ? { name: returnAddr.name, address1: returnAddr.address1, city: returnAddr.city, state: returnAddr.state, zip: returnAddr.zip, country: returnAddr.country } : undefined,
      shipmentMode: isFba ? shipmentMode : undefined,
      plannedShipDate: plannedShip || undefined,
      plannedArrivalDate: arrival || undefined,
      lines, allocationIds: [], inboundOrderIds: [], outboundPlanIds: [],
    };

    try {
      await executeReplenishment(merchantId, { type: 'inbound_create', plan, submit: !asDraft });
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建失败');
    }
  };

  if (success) {
    return (
      <main className="mx-auto max-w-[720px] pt-16">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-[var(--shadow-soft)]">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-semibold">入库计划已创建</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">正在跳转到计划详情…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1360px] space-y-5 pt-5 pb-12 lg:pt-6">
      <Link href="/dashboard/inbound-plans" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />返回入库计划
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">新建入库计划</h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">先选择收货仓库，系统自动加载对应的申报字段。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void submit(true)} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium hover:bg-[var(--surface-subtle)]">保存草稿</button>
          <button onClick={() => void submit(false)} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">创建并提交</button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      <div className="space-y-5">
        {/* ── 计划信息（收货仓库第一）── */}
        <Section title="计划信息" hint="收货仓库决定所有必填字段。">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 改点2：计划单号（可编辑）*/}
            <Field label="入库计划编号" required>
              <input className={input} value={number} onChange={e => setNumber(e.target.value)} placeholder="IP-20261118-001" />
            </Field>

            {/* 1. 收货仓库（第一位）*/}
            <Field label="收货仓库" required>
              <select className={input} value={destWarehouseId} onChange={e => setDestWarehouseId(e.target.value)}>
                <optgroup label="自有 WMS 仓库">
                  {destOptions.filter(d => d.destinationType === 'oms_warehouse').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
                <optgroup label="Amazon FBA">
                  {destOptions.filter(d => d.destinationType === 'amazon_fba').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
                <optgroup label="TikTok FBT">
                  {destOptions.filter(d => d.destinationType === 'tiktok_fulfillment').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
                <optgroup label="Walmart WFS">
                  {destOptions.filter(d => d.destinationType === 'walmart_fc').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
              </select>
            </Field>

            {/* 2. 发货仓库 */}
            <Field label="发货仓库" required>
              <select className={input} value={sourceId} onChange={e => setSourceId(e.target.value)}>
                <optgroup label="自有仓库">{sourceWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</optgroup>
                <optgroup label="供应商">{externalSources.filter(s => s.type === 'supplier').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                <optgroup label="Retailer">{externalSources.filter(s => s.type === 'retailer').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
              </select>
            </Field>

            {/* 3. 入库类型 */}
            <Field label="入库类型" required>
              <select className={input} value={inboundReason} onChange={e => setInboundReason(e.target.value as InboundReason)}>
                {Object.entries(inboundReasonLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>

            {/* 改点1：来源单号 — 类型选择 + 搜索支持自定义 */}
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-medium text-[var(--muted)]">来源单号</label>
              <div className="mt-1 flex gap-2">
                <select
                  className={cn(input, 'w-36 shrink-0')}
                  value={sourceDocType}
                  onChange={e => setSourceDocType(e.target.value as typeof sourceDocType)}
                >
                  <option value="purchase_order">采购单</option>
                  <option value="transfer_order">调拨单</option>
                  <option value="replenishment">补货计划</option>
                  <option value="return_order">退货单</option>
                  <option value="manual">手工单</option>
                </select>
                <div className="flex-1">
                  <ComboInput
                    value={sourceDocNumber}
                    onChange={setSourceDocNumber}
                    suggestions={sourceDocSuggestions}
                    placeholder="搜索已有单号或手动输入"
                  />
                </div>
              </div>
            </div>

            {/* 5. 计划发货日期 */}
            <Field label="计划发货日期">
              <input type="date" className={input} value={plannedShip} onChange={e => setPlannedShip(e.target.value)} />
            </Field>

            {/* 6. 预计到仓日期 */}
            <Field label="预计到仓日期" required={isWfs}>
              <input type="date" className={input} value={arrival} onChange={e => setArrival(e.target.value)} />
            </Field>
          </div>

          {/* 地址摘要 */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)]">
              发货地址：<span className="font-medium text-[var(--foreground)]">{sourceOption.address} · {sourceOption.country}</span>
            </div>
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)]">
              收货仓库：<span className="font-medium text-[var(--foreground)]">{selectedDest.address} · {selectedDest.country}</span>
            </div>
          </div>

          {/* 改点4：供应商/Retailer 编辑发货地址 */}
          {isExternalSource && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--muted)]">发货方地址</span>
                <button type="button" onClick={() => setEditingShipFrom(v => !v)} className="text-[12px] text-[var(--primary)] hover:underline">
                  {editingShipFrom ? '收起' : '编辑发货地址'}
                </button>
              </div>
              {!editingShipFrom ? (
                <div className="mt-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)]">
                  {customShipFrom.address1 ? `${customShipFrom.name} · ${customShipFrom.address1}, ${customShipFrom.city} · ${customShipFrom.country}` : sourceOption.address + ' · ' + sourceOption.country}
                </div>
              ) : (
                <div className="mt-2 grid gap-3 rounded-xl border border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="公司/供应商名称" required>
                    <input className={input} value={customShipFrom.name} onChange={e => setCustomShipFrom(a => ({ ...a, name: e.target.value }))} placeholder={sourceOption.name} />
                  </Field>
                  <Field label="联系电话">
                    <input className={input} value={customShipFrom.phone} onChange={e => setCustomShipFrom(a => ({ ...a, phone: e.target.value }))} placeholder="+86 138..." />
                  </Field>
                  <Field label="街道地址" required>
                    <input className={input} value={customShipFrom.address1} onChange={e => setCustomShipFrom(a => ({ ...a, address1: e.target.value }))} placeholder={sourceOption.address} />
                  </Field>
                  <Field label="城市">
                    <input className={input} value={customShipFrom.city} onChange={e => setCustomShipFrom(a => ({ ...a, city: e.target.value }))} placeholder={sourceOption.city} />
                  </Field>
                  <Field label="国家/地区">
                    <select className={input} value={customShipFrom.country} onChange={e => setCustomShipFrom(a => ({ ...a, country: e.target.value }))}>
                      <option value="CN">中国 (CN)</option>
                      <option value="US">美国 (US)</option>
                      <option value="UK">英国 (UK)</option>
                      <option value="JP">日本 (JP)</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* FBA 分仓方式 + 信息提示 */}
          {isFba && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="mb-3 text-[13px] font-semibold">FBA 分仓方式</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'box_first', label: '先装箱再分仓', desc: '提前预装箱，提交装箱信息后获取分仓结果，适合已确定装箱方案的情况' },
                    { value: 'placement_first', label: '先分仓再装箱', desc: '先获取分仓方案，确认后再按每票货件装箱（通常用于 LTL）' },
                  ] as const).map(opt => (
                    <label key={opt.value} className={cn('cursor-pointer rounded-lg border-2 p-3 transition-all', shipmentMode === opt.value ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40')}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="shipmentMode" value={opt.value} checked={shipmentMode === opt.value} onChange={() => setShipmentMode(opt.value)} className="shrink-0" />
                        <span className="text-[13px] font-medium">{opt.label}</span>
                      </div>
                      <p className="mt-1 pl-5 text-[11px] text-[var(--muted)]">{opt.desc}</p>
                    </label>
                  ))}
                </div>
              </div>
              {/* 流程说明 */}
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                <p className="mb-2.5 text-[12px] font-semibold text-[var(--foreground)]">
                  {shipmentMode === 'box_first' ? '先装箱再分仓' : '先分仓再装箱（仅限 LTL）'} · 提交后的流程
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {shipmentMode === 'box_first' ? (
                    <>
                      <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-1">① 添加商品+预处理</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-1">② 申请入仓（创建计划）</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-amber-50 border border-amber-200 px-2 py-1 text-amber-700">③ Amazon自动生成包装组 → 按组装箱</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-blue-50 border border-blue-200 px-2 py-1 text-blue-700">④ 提交装箱 → Amazon返回分仓方案 → 选择</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-700">⑤ 配送·标签·发货后填追踪号</span>
                    </>
                  ) : (
                    <>
                      <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-1">① 添加商品+预处理</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-1">② 申请入仓（创建计划）</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-blue-50 border border-blue-200 px-2 py-1 text-blue-700">③ Amazon直接返回分仓方案 → 选择</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-amber-50 border border-amber-200 px-2 py-1 text-amber-700">④ 货件生成 → 按货件装箱</span>
                      <span className="text-[var(--muted)]">→</span>
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-700">⑤ LTL配送·标签·发货后填追踪号</span>
                    </>
                  )}
                </div>
                <p className="mt-2.5 text-[11px] text-[var(--muted)]">
                  {shipmentMode === 'box_first'
                    ? '装箱信息在步骤 ③ 填写，分仓方案由 Amazon 在收到装箱数据后返回。支持 SPD 和 LTL。'
                    : '先分仓再装箱仅适用整车/零担 LTL 模式，Amazon 按商品数量分仓（不按箱），确认货件后再逐票装箱。'}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-blue-800">
                <strong>Amazon FBA US</strong> · 账号：{selectedDest.connectionId} · 站点：{selectedDest.site}
                <br />创建后将调用 createInboundPlan，获取 Reference ID，之后按所选分仓方式继续操作。
              </div>
            </div>
          )}

          {/* WFS 退货地址（必填）*/}
          {isWfs && (
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4 space-y-3">
              <p className="text-[13px] font-semibold">退货地址（Walmart WFS 必填）</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="公司名称" required>
                  <input className={input} value={returnAddr.name} onChange={e => setReturnAddr(r => ({ ...r, name: e.target.value }))} placeholder="Northwind Co." />
                </Field>
                <Field label="街道地址" required>
                  <input className={input} value={returnAddr.address1} onChange={e => setReturnAddr(r => ({ ...r, address1: e.target.value }))} placeholder="1234 Return Ave" />
                </Field>
                <Field label="城市" required>
                  <input className={input} value={returnAddr.city} onChange={e => setReturnAddr(r => ({ ...r, city: e.target.value }))} placeholder="Los Angeles" />
                </Field>
                <Field label="州">
                  <input className={input} value={returnAddr.state} onChange={e => setReturnAddr(r => ({ ...r, state: e.target.value }))} placeholder="CA" />
                </Field>
                <Field label="邮编">
                  <input className={input} value={returnAddr.zip} onChange={e => setReturnAddr(r => ({ ...r, zip: e.target.value }))} placeholder="90001" />
                </Field>
              </div>
            </div>
          )}

          {/* FBT 信息 */}
          {isFbt && (
            <div className="mt-4 rounded-lg border border-pink-200 bg-pink-50 px-4 py-3 text-[12px] text-pink-800">
              <strong>TikTok FBT US</strong> · 账号：{selectedDest.connectionId}<br />
              商品须已在 TikTok Seller Center 完成 FBT Goods 匹配。创建后按插件能力决定自动建单或引导人工建单并回填。
            </div>
          )}
        </Section>

        {/* ── 商品明细 ── */}
        <Section title="商品明细" hint={isFba ? 'FBA：MSKU、预处理/贴标责任方须在映射中维护（US站2026年后仅 Seller）' : isWfs ? 'WFS：GTIN 和每行到仓日期为必填' : isFbt ? 'FBT：须填写 FBT Goods ID，可从左侧商品搜索后选择对应商品' : ''}>
          {/* 工具栏 */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] text-[var(--muted)]">{lines.length} 行 · {totalQty} 件</span>
            <button type="button" onClick={() => setPickerOpen(true)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90">
              <Plus className="size-3.5" />添加商品
            </button>
          </div>

          {/* 批量操作（选中行时显示）*/}
          {selectedRows.size > 0 && (
            <div className="mb-3 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] p-3">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[var(--primary)]">已选 {selectedRows.size} 行 — 批量设置</span>
                <button type="button" className="ml-auto text-[11px] text-[var(--muted)]" onClick={() => setSelectedRows(new Set())}>清除</button>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {/* 数量 — 所有类型都有 */}
                <div>
                  <div className="mb-1 text-[11px] text-[var(--muted)]">数量</div>
                  <div className="flex gap-1">
                    <input type="number" value={bulkQty} onChange={e => setBulkQty(e.target.value)} className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                    <button type="button" disabled={!bulkQty} onClick={() => { const q = Number(bulkQty); if (q > 0) { applyBulk({ quantity: q }); setBulkQty(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                  </div>
                </div>

                {/* 改点5：动态批量字段 */}
                {/* OMS/3PL/FBA：批次号 + 有效期 */}
                {(!isWfs) && (
                  <>
                    {!isPlatform && (
                      <div>
                        <div className="mb-1 text-[11px] text-[var(--muted)]">批次号</div>
                        <div className="flex gap-1">
                          <input type="text" value={bulkLot} onChange={e => setBulkLot(e.target.value)} className="h-7 w-28 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                          <button type="button" disabled={!bulkLot} onClick={() => { if (bulkLot) { applyBulk({ lotNo: bulkLot }); setBulkLot(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">有效期</div>
                      <div className="flex gap-1">
                        <input type="date" value={bulkExpiry} onChange={e => setBulkExpiry(e.target.value)} className="h-7 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                        <button type="button" disabled={!bulkExpiry} onClick={() => { if (bulkExpiry) { applyBulk({ expiryDate: bulkExpiry }); setBulkExpiry(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                      </div>
                    </div>
                  </>
                )}

                {/* 非平台：单位 + 箱数 */}
                {!isPlatform && (
                  <>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">单位</div>
                      <div className="flex gap-1">
                        <select value={bulkUnit} onChange={e => setBulkUnit(e.target.value)} className="h-7 rounded-md border border-[var(--border)] px-1.5 text-[12px]">
                          <option value="">选择</option>
                          {['件', '箱', '套', 'KG'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button type="button" disabled={!bulkUnit} onClick={() => { if (bulkUnit) { applyBulk({ unit: bulkUnit }); setBulkUnit(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">箱数</div>
                      <div className="flex gap-1">
                        <input type="number" min={0} value={bulkCarton} onChange={e => setBulkCarton(e.target.value)} className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                        <button type="button" disabled={bulkCarton === ''} onClick={() => { const c = Number(bulkCarton); if (c >= 0) { applyBulk({ cartonQuantity: c }); setBulkCarton(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                      </div>
                    </div>
                  </>
                )}

                {/* FBA：参考箱数 + 贴标方 + 预处理方 */}
                {isFba && (
                  <>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">参考箱数</div>
                      <div className="flex gap-1">
                        <input type="number" min={0} value={bulkCarton} onChange={e => setBulkCarton(e.target.value)} className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                        <button type="button" disabled={bulkCarton === ''} onClick={() => { const c = Number(bulkCarton); if (c >= 0) { applyBulk({ cartonQuantity: c }); setBulkCarton(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">贴标方</div>
                      <div className="flex gap-1">
                        <select className="h-7 rounded-md border border-[var(--border)] px-1.5 text-[12px]"
                          onChange={e => { const v = e.target.value as 'seller'|'amazon'; if (v) { applyBulk({ labelOwnership: v }); e.target.value = ''; } }}>
                          <option value="">选择</option>
                          <option value="seller">Seller</option>
                          <option value="amazon">Amazon</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">预处理方</div>
                      <div className="flex gap-1">
                        <select className="h-7 rounded-md border border-[var(--border)] px-1.5 text-[12px]"
                          onChange={e => { const v = e.target.value as 'seller'|'amazon'; if (v) { applyBulk({ prepOwnership: v }); e.target.value = ''; } }}>
                          <option value="">选择</option>
                          <option value="seller">Seller</option>
                          <option value="amazon">Amazon</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* WFS 专属：GTIN + 到仓日期 */}
                {isWfs && (
                  <>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">GTIN（批量填写）</div>
                      <div className="flex gap-1">
                        <input type="text" value={bulkGtin} onChange={e => setBulkGtin(e.target.value)} placeholder="GTIN-14" className="h-7 w-32 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                        <button type="button" disabled={!bulkGtin} onClick={() => { if (bulkGtin) { applyBulk({ gtin: bulkGtin }); setBulkGtin(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">到仓日期</div>
                      <div className="flex gap-1">
                        <input type="date" value={bulkArrival} onChange={e => setBulkArrival(e.target.value)} className="h-7 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                        <button type="button" disabled={!bulkArrival} onClick={() => { if (bulkArrival) { applyBulk({ estimatedArrivalDate: bulkArrival }); setBulkArrival(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">箱数</div>
                      <div className="flex gap-1">
                        <input type="number" min={0} value={bulkCarton} onChange={e => setBulkCarton(e.target.value)} className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px]" />
                        <button type="button" disabled={bulkCarton === ''} onClick={() => { const c = Number(bulkCarton); if (c >= 0) { applyBulk({ cartonQuantity: c }); setBulkCarton(''); } }} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
                      </div>
                    </div>
                  </>
                )}

                <button type="button" onClick={() => { setLines(prev => prev.filter(l => !selectedRows.has(l.id))); setSelectedRows(new Set()); }} className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2 text-[12px] text-red-600 hover:bg-red-50">
                  <Trash2 className="size-3.5" />删除已选
                </button>
              </div>
            </div>
          )}

          {/* 商品表格（动态列）*/}
          <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
            <table className="w-full text-left text-[12px]" style={{ minWidth: isFba ? 1300 : isWfs ? 1100 : 1000 }}>
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="全选" checked={lines.length > 0 && selectedRows.size === lines.length} onChange={() => setSelectedRows(prev => prev.size === lines.length ? new Set() : new Set(lines.map(l => l.id)))} /></th>
                  <th className="px-3 py-2.5">OMS SKU</th>
                  {/* FBA */}
                  {isFba && <th className="px-3 py-2.5">MSKU</th>}
                  {isFba && <th className="px-3 py-2.5">ASIN</th>}
                  {isFba && <th className="px-3 py-2.5">预处理要求</th>}
                  {isFba && <th className="px-3 py-2.5">贴标</th>}
                  {isFba && <th className="px-3 py-2.5">预处理</th>}
                  {/* WFS */}
                  {isWfs && <th className="px-3 py-2.5">Seller SKU</th>}
                  {isWfs && <th className="px-3 py-2.5">GTIN</th>}
                  {/* FBT */}
                  {isFbt && <th className="px-3 py-2.5">FBT Goods ID</th>}
                  {/* 发货仓库SKU（所有类型，与tbody顺序一致）*/}
                  <th className="px-3 py-2.5">发货仓库SKU</th>
                  <th className="px-3 py-2.5 text-right">数量</th>
                  {!isPlatform && <th className="px-3 py-2.5">单位</th>}
                  {/* FBA 箱数在装箱阶段填写，这里仅供参考 */}
                  {isFba && <th className="px-3 py-2.5 text-right text-[var(--muted)]">参考箱数↓装箱阶段填</th>}
                  {!isFba && <th className="px-3 py-2.5 text-right">{isWfs ? '箱数*' : '箱数'}</th>}
                  {isWfs && <th className="px-3 py-2.5 text-right">每箱件数</th>}
                  {isWfs && <th className="px-3 py-2.5">到仓日期</th>}
                  {!isWfs && !isFba && <th className="px-3 py-2.5">批次 / 有效期</th>}
                  {isFba && <th className="px-3 py-2.5">有效期</th>}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {lines.map(line => (
                  <tr key={line.id} className={cn(selectedRows.has(line.id) ? 'bg-[var(--primary-soft)]' : 'hover:bg-[var(--surface-subtle)] transition-colors')}>
                    <td className="px-3 py-2.5"><input type="checkbox" aria-label={`选择 ${line.sku}`} checked={selectedRows.has(line.id)} onChange={() => setSelectedRows(prev => { const n = new Set(prev); n.has(line.id) ? n.delete(line.id) : n.add(line.id); return n; })} /></td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{line.sku}</div>
                      <div className="text-[10px] text-[var(--muted)]">{products.find(p => p.sku === line.sku)?.name}</div>
                    </td>
                    {/* FBA: MSKU */}
                    {isFba && (
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={() => setMappingLineId(line.id)} className={cn('text-left hover:underline', (line.msku || line.channelSku) ? 'text-[var(--primary)]' : 'text-amber-600')}>
                          <div>{line.msku || line.channelSku || '待维护映射'}</div>
                        </button>
                      </td>
                    )}
                    {/* FBA: ASIN (readonly) */}
                    {isFba && <td className="px-3 py-2.5 text-[11px] text-[var(--muted)]">{line.asin || '—'}</td>}
                    {/* FBA: 预处理要求（平台返回，只读显示） */}
                    {isFba && (
                      <td className="px-3 py-2.5">
                        {line.prepRequirements?.length ? (
                          <div className="flex flex-wrap gap-1">{line.prepRequirements.map(r => <span key={r} className="rounded bg-amber-100 px-1.5 text-[10px] text-amber-700">{r}</span>)}</div>
                        ) : <span className="text-[11px] text-[var(--muted)]">待提交后获取</span>}
                      </td>
                    )}
                    {/* FBA: 贴标责任方（2026年后US站固定Seller） */}
                    {isFba && (
                      <td className="px-3 py-2.5">
                        <select className={cn(tdInput, 'w-24')} value={line.labelOwnership ?? 'seller'}
                          onChange={e => updateLine(line.id, { labelOwnership: e.target.value as 'seller' | 'amazon' })}>
                          <option value="seller">Seller</option>
                          <option value="amazon">Amazon</option>
                        </select>
                      </td>
                    )}
                    {/* FBA: 预处理责任方（2026年后US站固定Seller） */}
                    {isFba && (
                      <td className="px-3 py-2.5">
                        <select className={cn(tdInput, 'w-24')} value={line.prepOwnership ?? 'seller'}
                          onChange={e => updateLine(line.id, { prepOwnership: e.target.value as 'seller' | 'amazon' })}>
                          <option value="seller">Seller</option>
                          <option value="amazon">Amazon</option>
                        </select>
                      </td>
                    )}
                    {/* WFS: Seller SKU */}
                    {isWfs && (
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={() => setMappingLineId(line.id)} className={cn('text-left hover:underline', line.channelSku ? 'text-[var(--primary)]' : 'text-amber-600')}>
                          {line.channelSku || '待维护'}
                        </button>
                      </td>
                    )}
                    {/* WFS: GTIN */}
                    {isWfs && <td className="px-3 py-2.5"><input className={cn(tdInput, 'w-32', !line.gtin && 'border-amber-300')} value={line.gtin ?? ''} onChange={e => updateLine(line.id, { gtin: e.target.value })} placeholder="GTIN-14 *" /></td>}
                    {/* FBT: Goods ID */}
                    {isFbt && (
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={() => setMappingLineId(line.id)} className={cn('text-left hover:underline', line.fbtGoodsId || line.channelSku ? 'text-[var(--primary)]' : 'text-amber-600')}>
                          {line.fbtGoodsId || line.channelSku || '待匹配'}
                        </button>
                      </td>
                    )}
                    {/* 改点3：发货仓库SKU（所有仓库类型均显示）*/}
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setMappingLineId(line.id)} className={cn('text-left hover:underline', line.sourceSku ? 'text-[var(--primary)]' : 'text-amber-600')}>
                        {line.sourceSku || '待维护'}
                      </button>
                    </td>


                    {/* 数量 */}
                    <td className="px-3 py-2.5 text-right"><input type="number" min={1} className={cn(tdInput, 'w-20 text-right')} value={line.quantity} onChange={e => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })} /></td>
                    {/* 单位（非平台）*/}
                    {!isPlatform && (
                      <td className="px-3 py-2.5">
                        <select className={cn(tdInput, 'w-16')} value={line.unit ?? '件'} onChange={e => updateLine(line.id, { unit: e.target.value })}>
                          {['件', '箱', '套', 'KG'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                    )}
                    {/* 箱数 */}
                    <td className="px-3 py-2.5"><input type="number" min={0} className={cn(tdInput, 'w-16 text-right')} value={line.cartonQuantity ?? 0} onChange={e => updateLine(line.id, { cartonQuantity: Math.max(0, Number(e.target.value) || 0) })} /></td>
                    {/* WFS: 每箱件数 */}
                    {isWfs && <td className="px-3 py-2.5"><input type="number" min={1} className={cn(tdInput, 'w-16 text-right')} value={(line as ReplenishmentLine & { unitsPerBox?: number }).unitsPerBox ?? ''} onChange={e => updateLine(line.id, { unitsPerBox: Number(e.target.value) } as Partial<ReplenishmentLine>)} placeholder="件/箱" /></td>}
                    {/* WFS: 到仓日期 */}
                    {isWfs && <td className="px-3 py-2.5"><input type="date" className={cn(tdInput, 'w-32', !line.estimatedArrivalDate && 'border-amber-300')} value={line.estimatedArrivalDate ?? ''} onChange={e => updateLine(line.id, { estimatedArrivalDate: e.target.value })} /></td>}
                    {/* 批次/有效期（非 WFS 非 FBA）*/}
                    {!isWfs && !isFba && (
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <input placeholder="批次号" className={cn(tdInput, 'w-24')} value={line.lotNo ?? ''} onChange={e => updateLine(line.id, { lotNo: e.target.value })} />
                          <input type="date" className={cn(tdInput, 'w-32')} value={line.expiryDate ?? ''} onChange={e => updateLine(line.id, { expiryDate: e.target.value })} />
                        </div>
                      </td>
                    )}
                    {/* FBA: 只显示有效期 */}
                    {isFba && <td className="px-3 py-2.5"><input type="date" className={cn(tdInput, 'w-32')} value={line.expiryDate ?? ''} onChange={e => updateLine(line.id, { expiryDate: e.target.value })} /></td>}
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))} className="rounded p-1 text-[var(--muted)] hover:text-[var(--danger)]"><X className="size-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lines.length === 0 && <div className="py-14 text-center text-[13px] text-[var(--muted)]">暂无商品，点击「添加商品」开始</div>}
          </div>
        </Section>

        {/* ── 备注 ── */}
        <Section title="备注">
          <textarea className="min-h-20 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)]" value={note} onChange={e => setNote(e.target.value)} placeholder="发货、收货、平台办理说明" />
        </Section>
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/dashboard/inbound-plans" className="h-9 rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">取消</Link>
        <button onClick={() => void submit(true)} className="h-9 rounded-lg border border-[var(--border)] px-4 py-2 text-[13px]">保存草稿</button>
        <button onClick={() => void submit(false)} className="h-9 rounded-lg bg-[var(--primary)] px-5 py-2 text-[13px] font-semibold text-white hover:opacity-90">创建并提交</button>
      </div>

      <ProductPicker open={pickerOpen} selectedSkus={selectedSkus} destType={destType} onClose={() => setPickerOpen(false)} onConfirm={addProducts} />
      {mappingLineId && lines.find(l => l.id === mappingLineId) && (
        <MappingDialog
          line={lines.find(l => l.id === mappingLineId)!}
          destType={destType}
          onClose={() => setMappingLineId(null)}
          onSave={patch => updateLine(mappingLineId, patch)}
        />
      )}
    </main>
  );
}
