'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronDown, ChevronLeft, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const OWNERS = [
  { id: 'oa', name: '货主 A（品牌自营）' },
  { id: 'ob', name: '货主 B（代工代管）' },
  { id: 'oc', name: '货主 C（经销合作）' },
] as const;

const EXTRA_FIELDS = ['商品重量', '商品尺寸', '品牌名称', '原产国', '海关编码', '效期/保质期', '箱规数量', '自定义属性'] as const;
const REALTIME_EVENTS = ['库存归零', 'SKU 状态变更', '库存超阈值', '入库完成'] as const;
const ALERT_CHANNELS = ['站内通知', '邮件', '钉钉', 'Slack'] as const;

type QtyMode = 'full' | 'deduct' | 'ratio';
type SkuMode = 'all' | 'include' | 'exclude';
type SkuBy = 'sku_list' | 'tag' | 'category';
type OwnerMode = 'all' | 'include' | 'exclude';
type FormState = {
  name: string;
  status: 'active' | 'inactive' | 'draft';
  priority: string;
  channelIds: string[];
  ownerMode: OwnerMode;
  ownerIds: string[];
  warehouseMode: 'all' | 'specific';
  warehouseIds: string[];
  warehouseMerge: 'sum' | 'max';
  skuMode: SkuMode;
  skuBy: SkuBy;
  skuList: string;
  skuTags: string;
  skuCategories: string;
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
};

const DEFAULT_FORM: FormState = {
  name: '',
  status: 'active',
  priority: '50',
  channelIds: [],
  ownerMode: 'include',
  ownerIds: [],
  warehouseMode: 'all',
  warehouseIds: [],
  warehouseMerge: 'sum',
  skuMode: 'all',
  skuBy: 'sku_list',
  skuList: '',
  skuTags: '',
  skuCategories: '',
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[13px] font-medium text-[var(--foreground)]">{label}</div>
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

export default function InventorySyncRuleForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const selectedChannels = useMemo(() => CHANNELS.filter((channel) => form.channelIds.includes(channel.id)), [form.channelIds]);
  const selectedOwners = useMemo(() => OWNERS.filter((owner) => form.ownerIds.includes(owner.id)), [form.ownerIds]);
  const selectedWarehouses = useMemo(() => WAREHOUSES.filter((warehouse) => form.warehouseIds.includes(warehouse.id)), [form.warehouseIds]);
  const ediSelected = selectedChannels.some((channel) => channel.type === 'EDI');

  const scopeSummary = [
    selectedChannels.length > 0 ? selectedChannels.map((channel) => channel.name).join('、') : '全部渠道',
    form.ownerMode === 'all' ? '全部货主' : selectedOwners.length > 0 ? `${form.ownerMode === 'include' ? '指定' : '排除'} ${selectedOwners.map((owner) => owner.name).join('、')}` : '待选货主',
    form.warehouseMode === 'all' ? '全部仓库' : selectedWarehouses.length > 0 ? `${selectedWarehouses.map((warehouse) => warehouse.name).join('、')}（${form.warehouseMerge === 'sum' ? '求和' : '取最大'}）` : '待选仓库',
    form.skuMode === 'all' ? '全部 SKU' : `${form.skuMode === 'include' ? '白名单' : '黑名单'} ${form.skuBy === 'sku_list' ? (form.skuList || '待填') : form.skuBy === 'tag' ? (form.skuTags || '待填') : (form.skuCategories || '待填')}`,
  ];

  const quantitySummary = [
    form.qtyMode === 'full' ? '直接同步实际库存' : form.qtyMode === 'deduct' ? '扣减后同步' : `按 ${form.ratio}% 比例同步`,
    form.deductReserved ? '扣已占用' : '不扣已占用',
    form.deductSafety ? '扣安全库存' : '不扣安全库存',
    form.inclInTransit === 'none' ? '不含在途' : `含 ${form.inclInTransit} 天在途`,
    form.maxQty ? `上限 ${form.maxQty}` : '无上限',
  ];

  const outputSummary = [
    form.syncStatus ? '同步商品状态' : '仅同步库存数量',
    form.includeZero ? '含 0 库存' : '跳过 0 库存',
    form.unavailToZero ? '不可用归零' : '不可用保留原值',
    form.includePreorder ? '含预售' : '不含预售',
    form.includeBackorder ? '含 Backorder' : '不含 Backorder',
    form.extraFields ? `附带 ${form.extraFieldKeys.length || 0} 个扩展字段` : '不带扩展字段',
  ];

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
            <p className="mt-1 text-[13px] text-[var(--muted)]">先选同步对象，再定库存口径，最后设置同步结果和异常处理。</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="基本信息" compact>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px_180px]">
            <Field label="规则名称">
              <Input value={form.name} onChange={(value) => setField('name', value)} placeholder="如：Walmart EDI · 货主 A · 每日库存同步" />
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

        <Section title="同步对象" desc="商户先关心同步给谁、同步哪些货，这块优先配置。" compact>
          <div className="space-y-5">
            <Field label="同步渠道">
              <MultiSelect
                opts={CHANNELS.map((channel) => ({ id: channel.id, label: channel.name, sub: `${channel.type} · ${channel.status === 'active' ? '已启用' : channel.status === 'testing' ? '测试中' : '已暂停'}` }))}
                value={form.channelIds}
                onChange={(value) => {
                  const channels = CHANNELS.filter((channel) => value.includes(channel.id));
                  const hasEdi = channels.some((channel) => channel.type === 'EDI');
                  setForm((current) => ({
                    ...current,
                    channelIds: value,
                    ownerMode: hasEdi ? 'include' : current.ownerMode,
                  }));
                }}
                placeholder="全部渠道（不限）"
              />
              {ediSelected ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">EDI 同步按货主范围执行，非所选货主的 SKU 不进入同步结果。</div> : null}
            </Field>

            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="货主范围">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <ChipButton active={form.ownerMode === 'all'} onClick={() => setField('ownerMode', 'all')}>全部货主</ChipButton>
                    <ChipButton active={form.ownerMode === 'include'} onClick={() => setField('ownerMode', 'include')}>指定货主</ChipButton>
                    <ChipButton active={form.ownerMode === 'exclude'} onClick={() => setField('ownerMode', 'exclude')}>排除货主</ChipButton>
                  </div>
                  {form.ownerMode !== 'all' ? <MultiSelect opts={OWNERS.map((owner) => ({ id: owner.id, label: owner.name }))} value={form.ownerIds} onChange={(value) => setField('ownerIds', value)} placeholder={form.ownerMode === 'include' ? '选择允许同步的货主…' : '选择排除的货主…'} /> : null}
                </div>
              </Field>

              <Field label="仓库范围">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <ChipButton active={form.warehouseMode === 'all'} onClick={() => setField('warehouseMode', 'all')}>全部仓库</ChipButton>
                    <ChipButton active={form.warehouseMode === 'specific'} onClick={() => setField('warehouseMode', 'specific')}>指定仓库</ChipButton>
                  </div>
                  {form.warehouseMode === 'specific' ? (
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                      <MultiSelect opts={WAREHOUSES.map((warehouse) => ({ id: warehouse.id, label: warehouse.name, sub: warehouse.tag }))} value={form.warehouseIds} onChange={(value) => setField('warehouseIds', value)} placeholder="选择仓库…" />
                      <Select value={form.warehouseMerge} onChange={(value) => setField('warehouseMerge', value as FormState['warehouseMerge'])}>
                        <option value="sum">库存求和</option>
                        <option value="max">取最大值</option>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>

            <Field label="SKU 范围">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <ChipButton active={form.skuMode === 'all'} onClick={() => setField('skuMode', 'all')}>全部 SKU</ChipButton>
                  <ChipButton active={form.skuMode === 'include'} onClick={() => setField('skuMode', 'include')}>白名单</ChipButton>
                  <ChipButton active={form.skuMode === 'exclude'} onClick={() => setField('skuMode', 'exclude')}>黑名单</ChipButton>
                </div>
                {form.skuMode !== 'all' ? (
                  <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <Select value={form.skuBy} onChange={(value) => setField('skuBy', value as SkuBy)}>
                      <option value="sku_list">SKU 列表</option>
                      <option value="tag">Tag</option>
                      <option value="category">品类</option>
                    </Select>
                    {form.skuBy === 'sku_list' ? <Input value={form.skuList} onChange={(value) => setField('skuList', value)} placeholder="逗号分隔，如 SKU001,SKU002" /> : null}
                    {form.skuBy === 'tag' ? <Input value={form.skuTags} onChange={(value) => setField('skuTags', value)} placeholder="标签，如 no-sync,promo" /> : null}
                    {form.skuBy === 'category' ? <Input value={form.skuCategories} onChange={(value) => setField('skuCategories', value)} placeholder="品类，如 Electronics,Apparel" /> : null}
                  </div>
                ) : null}
              </div>
            </Field>

            <CompactSummary title="当前同步范围" items={scopeSummary} />
          </div>
        </Section>

        <Section title="同步库存" desc="这里决定商户最终同步多少库存，是最关键的业务配置区。" compact>
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
                <ToggleRow label="扣除已占用库存" checked={form.deductReserved} onChange={(value) => setField('deductReserved', value)} />
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

            <CompactSummary title="当前库存策略" items={quantitySummary} />
          </div>
        </Section>

        <Section title="同步结果" desc="这里决定最终同步给渠道的数据里包含哪些内容和状态。" compact>
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-2">
              <ToggleRow label="同步商品状态" hint="除库存数量外，一并同步可用 / 不可用等状态。" checked={form.syncStatus} onChange={(value) => setField('syncStatus', value)} />
              <ToggleRow label="不可用 SKU 强制归零" checked={form.unavailToZero} onChange={(value) => setField('unavailToZero', value)} />
              <ToggleRow label="包含 0 库存 SKU" checked={form.includeZero} onChange={(value) => setField('includeZero', value)} />
              <ToggleRow label="包含预售 SKU" checked={form.includePreorder} onChange={(value) => setField('includePreorder', value)} />
              <ToggleRow label="包含 Backorder SKU" checked={form.includeBackorder} onChange={(value) => setField('includeBackorder', value)} />
            </div>

            <Field label="附加字段">
              <div className="space-y-3">
                <ToggleRow label="同步额外商品字段" checked={form.extraFields} onChange={(value) => setField('extraFields', value)} />
                {form.extraFields ? <div className="flex flex-wrap gap-2">{EXTRA_FIELDS.map((field) => { const active = form.extraFieldKeys.includes(field); return <button key={field} type="button" onClick={() => setField('extraFieldKeys', active ? form.extraFieldKeys.filter((item) => item !== field) : [...form.extraFieldKeys, field])} className={cn('rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors', active ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]')}>{field}</button>; })}</div> : null}
              </div>
            </Field>

            <CompactSummary title="当前同步方式" items={outputSummary} />
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
