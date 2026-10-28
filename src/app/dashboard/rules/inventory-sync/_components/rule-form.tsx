'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronDown, ChevronLeft, Loader2, Play, Upload, MapPin, Plus, X, Zap, Search, Info, AlertTriangle, RefreshCw } from 'lucide-react';
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

// 模拟 SKU 数据（实际项目从 API 获取）
const MOCK_SKUS = [
  { code: 'SKU-A001', name: '红色圆领T恤 S码',    qty: 156 },
  { code: 'SKU-A002', name: '红色圆领T恤 M码',    qty: 234 },
  { code: 'SKU-A003', name: '红色圆领T恤 L码',    qty: 88  },
  { code: 'SKU-A004', name: '红色圆领T恤 XL码',   qty: 45  },
  { code: 'SKU-B001', name: '蓝色条纹衬衫 S码',   qty: 210 },
  { code: 'SKU-B002', name: '蓝色条纹衬衫 M码',   qty: 318 },
  { code: 'SKU-B003', name: '蓝色条纹衬衫 L码',   qty: 127 },
  { code: 'SKU-C001', name: '黑色运动裤 S码',     qty: 445 },
  { code: 'SKU-C002', name: '黑色运动裤 M码',     qty: 532 },
  { code: 'SKU-C003', name: '黑色运动裤 L码',     qty: 289 },
  { code: 'SKU-D001', name: '白色帆布鞋 38',      qty: 68  },
  { code: 'SKU-D002', name: '白色帆布鞋 39',      qty: 134 },
  { code: 'SKU-D003', name: '白色帆布鞋 40',      qty: 156 },
  { code: 'SKU-D004', name: '白色帆布鞋 41',      qty: 98  },
  { code: 'SKU-D005', name: '白色帆布鞋 42',      qty: 72  },
  { code: 'SKU-E001', name: '保温水杯 350ml 黑',  qty: 892 },
  { code: 'SKU-E002', name: '保温水杯 500ml 黑',  qty: 756 },
  { code: 'SKU-E003', name: '保温水杯 500ml 白',  qty: 634 },
  { code: 'SKU-F001', name: '无线蓝牙耳机 Pro',   qty: 234 },
  { code: 'SKU-F002', name: '无线蓝牙耳机 Lite',  qty: 456 },
];

// 货主预设选项
const OWNER_OPTIONS: { value: string; sub: string }[] = [
  { value: '货主 A（品牌方）',   sub: 'OWN-001' },
  { value: '货主 B（代工厂）',   sub: 'OWN-002' },
  { value: '货主 C（分销商）',   sub: 'OWN-003' },
  { value: '华南品牌代理',       sub: 'OWN-004' },
  { value: '北美直营仓',         sub: 'OWN-005' },
  { value: '欧盟认证货主',       sub: 'OWN-006' },
  { value: '跨境直发供应商',     sub: 'OWN-007' },
];

// Retailer 标识预设（EDI 对接用）
const RETAILER_OPTIONS: { value: string; sub: string }[] = [
  { value: 'WALMART_US',    sub: 'Walmart'    },
  { value: 'TARGET_US',     sub: 'Target'     },
  { value: 'COSTCO_US',     sub: 'Costco'     },
  { value: 'KROGER_US',     sub: 'Kroger'     },
  { value: 'HOME_DEPOT_US', sub: 'Home Depot' },
  { value: 'WAYFAIR_US',    sub: 'Wayfair'    },
  { value: 'AMAZON_US',     sub: 'Amazon US'  },
  { value: 'TIKTOK_US',     sub: 'TikTok Shop US' },
  { value: 'SHOPIFY_US',    sub: 'Shopify US' },
];

// 各 SKU 在其他 Retailer 规则中已占用的分配比例（模拟数据）
const MOCK_SKU_ALLOCATIONS: Record<string, number> = {
  'SKU-A001': 40, 'SKU-A002': 30, 'SKU-A003': 60, 'SKU-A004': 0,
  'SKU-B001': 50, 'SKU-B002': 20, 'SKU-B003': 70,
  'SKU-C001': 0,  'SKU-C002': 45, 'SKU-C003': 80,
  'SKU-D001': 0,  'SKU-D002': 35, 'SKU-D003': 60,  'SKU-D004': 0,  'SKU-D005': 25,
  'SKU-E001': 0,  'SKU-E002': 50, 'SKU-E003': 40,
  'SKU-F001': 30, 'SKU-F002': 0,
};

// 规则名称常用模板
const RULE_NAME_TEMPLATES: { value: string; sub: string }[] = [
  { value: 'Walmart EDI · 每日同步',      sub: 'Retailer 渠道' },
  { value: 'Target EDI · 每日同步',       sub: 'Retailer 渠道' },
  { value: 'Costco EDI · 每日同步',       sub: 'Retailer 渠道' },
  { value: 'Kroger EDI · 每日同步',       sub: 'Retailer 渠道' },
  { value: '货主 A → 全渠道同步',          sub: '货主维度'      },
  { value: '货主 B → Costco 专供同步',     sub: '货主维度'      },
  { value: '预售 SKU 同步规则',            sub: 'SKU 规则'     },
  { value: '不可用 SKU 强制置零',          sub: 'SKU 规则'     },
  { value: '紧急缺货实时推送',             sub: '同步计划'      },
  { value: '周末全量补充同步',             sub: '同步计划'      },
  { value: 'EDI 推送失败重试',             sub: '异常处理'      },
  { value: '库存差异预警',                 sub: '异常处理'      },
];

type PlatformTargetLocation = { mode: 'preset' | 'custom'; presetId: string; customCode: string };
type QtyMode        = 'configured' | 'deduct';
type SyncValueType  = 'ratio' | 'fixed';
type SkuMode   = 'all'  | 'include' | 'exclude';
type SkuBy     = 'sku_list' | 'tag' | 'category';
type OwnerMode = 'all'  | 'include' | 'exclude';
type SkuLevelConfig = { skuCode: string; overrideType: '' | 'ratio' | 'fixed' | 'deduct'; value: string; allocationRatio: string };


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
  syncValueType: SyncValueType;
  fixedQty: string;
  deductOpenOrder: boolean;
  deductSafety: boolean;
  safetyQty: string;
  reserveQty: string;
  inclInTransit: boolean;
  ratio: string;
  // 输出字段
  syncStatus: boolean;
  unavailToZero: boolean;
  noLedgerAsZero: boolean;
  ignoreShipTimeLimit: boolean;
  includeZero: boolean;
  includePreorder: boolean;
  syncRetailerSkuName: boolean;
  includeBarcode: boolean;
  // 执行策略
  frequency: 'daily' | 'interval' | 'realtime' | 'pull' | 'scheduled';
  execTimes: string[];
  intervalMinutes: string;
  pushUrl: string;
  realtimeEvents: string[];
  scheduledDatetimes: string[];
  // SKU 差异化配置
  skuLevelOverrideEnabled: boolean;
  skuLevelConfigs: SkuLevelConfig[];
  // 分配约束
  allocationConstraint: boolean;
  overflowPolicy: 'cap' | 'skip' | 'force_alert';
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
  qtyMode: 'configured',
  syncValueType: 'ratio',
  fixedQty: '',
  deductOpenOrder: true,
  deductSafety: false,
  safetyQty: '',
  reserveQty: '',
  inclInTransit: false,
  ratio: '80',
  syncStatus: true,
  unavailToZero: true,
  noLedgerAsZero: false,
  ignoreShipTimeLimit: false,
  includeZero: true,
  includePreorder: false,
  syncRetailerSkuName: false,
  includeBarcode: false,
  frequency: 'daily',
  execTimes: ['02:00'],
  intervalMinutes: '60',
  pushUrl: '',
  realtimeEvents: ['库存归零'],
  scheduledDatetimes: [''],
  skuLevelOverrideEnabled: false,
  skuLevelConfigs: [],
  allocationConstraint: false,
  overflowPolicy: 'cap',
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

// ─── Tags + ComboBox（多选：货主等字段用） ────────────────────────────────────

function TagsComboBox({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; sub?: string }[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const tags = useMemo(
    () => value.split(',').map((s) => s.trim()).filter(Boolean),
    [value],
  );

  const filtered = useMemo(() => {
    const kw = draft.trim().toLowerCase();
    return options.filter(
      (o) =>
        !tags.includes(o.value) &&
        (!kw || o.value.toLowerCase().includes(kw) || (o.sub && o.sub.toLowerCase().includes(kw))),
    );
  }, [options, draft, tags]);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t].join(', '));
    setDraft('');
    setOpen(false);
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag).join(', '));

  const isExactMatch = options.some((o) => o.value === draft.trim()) || tags.includes(draft.trim());
  const showDropdown = open && (filtered.length > 0 || (draft.trim() && !isExactMatch));

  return (
    <div className="space-y-2">
      {/* 已选标签 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}
                className="text-[var(--muted)] hover:text-red-500 leading-none">×</button>
            </span>
          ))}
        </div>
      )}

      {/* 搜索输入 + 下拉 */}
      <div className="relative">
        <input
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { e.preventDefault(); addTag(draft); } }}
          placeholder={placeholder}
          autoComplete="off"
          className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 pr-8 text-[13px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
        <button type="button" tabIndex={-1} onClick={() => setOpen((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
              {filtered.length > 0 && (
                <div className="max-h-48 overflow-y-auto py-1">
                  {filtered.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => addTag(opt.value)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surface-subtle)]">
                      <span className="flex-1 text-[var(--foreground)]">{opt.value}</span>
                      {opt.sub && <span className="shrink-0 text-[11px] text-[var(--muted)]">{opt.sub}</span>}
                    </button>
                  ))}
                </div>
              )}
              {draft.trim() && !isExactMatch && (
                <div className={cn('p-1.5', filtered.length > 0 && 'border-t border-[var(--border-subtle)]')}>
                  <button type="button"
                    onClick={() => addTag(draft)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                    <Plus className="size-3.5 shrink-0" />
                    新增 &ldquo;{draft.trim()}&rdquo;
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 可搜索 + 自定义新增的 ComboBox ─────────────────────────────────────────

type ComboBoxOption = { value: string; sub?: string };

function ComboBox({ value, onChange, options, placeholder, id, errorState }: {
  value: string;
  onChange: (v: string) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  id?: string;
  errorState?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!value.trim()) return options;
    const kw = value.trim().toLowerCase();
    return options.filter(
      (o) => o.value.toLowerCase().includes(kw) || (o.sub && o.sub.toLowerCase().includes(kw))
    );
  }, [options, value]);

  const isExactMatch = options.some((o) => o.value === value.trim());
  const showDropdown = open && (filtered.length > 0 || (value.trim() && !isExactMatch));

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'h-10 w-full rounded-xl border bg-[var(--surface)] px-3 pr-8 text-[13px] outline-none focus:ring-2',
          errorState
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/10'
        )}
      />
      <button type="button" tabIndex={-1}
        onClick={() => setOpen((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            {filtered.length > 0 && (
              <div className="max-h-52 overflow-y-auto py-1">
                {filtered.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surface-subtle)]',
                      value === opt.value && 'bg-[var(--primary-soft)]'
                    )}>
                    <span className="flex-1 text-[var(--foreground)]">{opt.value}</span>
                    {opt.sub && <span className="shrink-0 text-[11px] text-[var(--muted)]">{opt.sub}</span>}
                    {value === opt.value && <span className="shrink-0 text-[11px] text-[var(--primary)]">✓</span>}
                  </button>
                ))}
              </div>
            )}
            {value.trim() && !isExactMatch && (
              <div className={cn('p-1.5', filtered.length > 0 && 'border-t border-[var(--border-subtle)]')}>
                <button type="button"
                  onClick={() => { onChange(value.trim()); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                  <Plus className="size-3.5 shrink-0" />
                  新增 &ldquo;{value.trim()}&rdquo;
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SKU 搜索选择面板（Section ③ 和 Section ④ 共用） ──────────────────────────

type SkuPickerPanelProps = {
  alreadySelected: Set<string>;
  onAdd: (codes: string[]) => void;
  footerHint?: string;
};

function SkuPickerPanel({ alreadySelected, onAdd, footerHint }: SkuPickerPanelProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [query, setQuery] = useState('');
  const [batchText, setBatchText] = useState('');
  const [batchCommitted, setBatchCommitted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const results = useMemo(() => {
    if (mode === 'single') {
      if (!query.trim()) return [];
      const kw = query.trim().toLowerCase();
      return MOCK_SKUS.filter(
        (s) => !alreadySelected.has(s.code) &&
               (s.code.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw))
      );
    }
    if (!batchCommitted || !batchText.trim()) return [];
    const inputCodes = new Set(batchText.split(/[\n,，\s]+/).map((s) => s.trim()).filter(Boolean));
    return MOCK_SKUS.filter((s) => !alreadySelected.has(s.code) && inputCodes.has(s.code));
  }, [mode, query, batchText, batchCommitted, alreadySelected]);

  const notFound = useMemo(() => {
    if (mode !== 'batch' || !batchCommitted) return [];
    const inputCodes = batchText.split(/[\n,，\s]+/).map((s) => s.trim()).filter(Boolean);
    const found = new Set(results.map((s) => s.code));
    return Array.from(new Set(inputCodes)).filter((c) => !found.has(c));
  }, [mode, batchText, batchCommitted, results]);

  const handleBatchSearch = () => {
    setBatchCommitted(true);
    const inputCodes = new Set(batchText.split(/[\n,，\s]+/).map((s) => s.trim()).filter(Boolean));
    const matched = MOCK_SKUS.filter((s) => !alreadySelected.has(s.code) && inputCodes.has(s.code)).map((s) => s.code);
    setSelected(matched);
  };

  const handleAdd = () => {
    if (!selected.length) return;
    onAdd(selected);
    setSelected([]);
    setQuery('');
    setBatchText('');
    setBatchCommitted(false);
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
      {/* 模式切换 */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium text-[var(--foreground)]">搜索添加 SKU</div>
        <div className="flex overflow-hidden rounded-lg border border-[var(--border)] text-[11px]">
          <button type="button" onClick={() => { setMode('single'); setSelected([]); }}
            className={cn('px-3 py-1 transition-colors', mode === 'single' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]')}>
            单个搜索
          </button>
          <button type="button" onClick={() => { setMode('batch'); setSelected([]); }}
            className={cn('border-l border-[var(--border)] px-3 py-1 transition-colors', mode === 'batch' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]')}>
            批量搜索
          </button>
        </div>
      </div>

      {mode === 'single' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)]" />
          <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setSelected([]); }}
            placeholder="搜索 SKU 编码或名称…"
            className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-[12px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/10" />
        </div>
      )}

      {mode === 'batch' && (
        <div className="space-y-2">
          <textarea value={batchText}
            onChange={(e) => { setBatchText(e.target.value); setBatchCommitted(false); setSelected([]); }}
            placeholder={'粘贴多个 SKU 编码，每行一个或逗号分隔\n例：SKU-A001\nSKU-B002, SKU-C003'}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/10"
          />
          <button type="button" onClick={handleBatchSearch} disabled={!batchText.trim()}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium transition-colors hover:bg-[var(--surface-subtle)] disabled:opacity-40">
            <Search className="size-3.5" />搜索
          </button>
        </div>
      )}

      {mode === 'batch' && batchCommitted && notFound.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
          {notFound.length} 个编码未找到：{notFound.slice(0, 5).join('、')}{notFound.length > 5 ? ' 等' : ''}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <button type="button" onClick={() => setSelected(results.map((s) => s.code))} className="hover:text-[var(--foreground)]">全选</button>
            <span>·</span>
            <button type="button" onClick={() => setSelected([])} className="hover:text-[var(--foreground)]">清空</button>
            <span className="ml-auto">
              {selected.length > 0
                ? <span className="text-[var(--primary)]">已选 {selected.length} 个</span>
                : `共 ${results.length} 个结果`}
            </span>
          </div>
          <div className="max-h-48 divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
            {results.map((sku) => {
              const sel = selected.includes(sku.code);
              return (
                <button key={sku.code} type="button"
                  onClick={() => setSelected(sel ? selected.filter((c) => c !== sku.code) : [...selected, sku.code])}
                  className={cn('flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-subtle)]', sel && 'bg-[var(--primary-soft)]')}>
                  <div className={cn('flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    sel ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]')}>
                    {sel && <span className="text-[9px] font-bold leading-none">✓</span>}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12px] font-medium text-[var(--foreground)]">{sku.code}</span>
                    <span className="block truncate text-[11px] text-[var(--muted)]">{sku.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[11px] text-[var(--muted)]">{sku.qty} 件</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={handleAdd} disabled={selected.length === 0}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] text-[12px] font-medium text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-40">
            <Plus className="size-3.5" />添加选中的 {selected.length || ''} 个 SKU
          </button>
        </div>
      )}

      {((mode === 'single' && query.trim() && results.length === 0) ||
        (mode === 'batch' && batchCommitted && results.length === 0 && notFound.length === 0)) && (
        <div className="py-3 text-center text-[11px] text-[var(--muted)]">没有找到可添加的 SKU</div>
      )}

      {footerHint && <div className="text-[10px] text-[var(--muted)]">{footerHint}</div>}
    </div>
  );
}

// ─── 主表单 ─────────────────────────────────────────────────────────────────

export default function InventorySyncRuleForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [runningNow, setRunningNow]   = useState(false);
  const [skuImportMsg, setSkuImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skuSearch, setSkuSearch]     = useState('');
  const [skuOverrideSearch, setSkuOverrideSearch] = useState('');
  const [skuInventoryLoading, setSkuInventoryLoading] = useState(false);
  const [skuInventoryData, setSkuInventoryData]       = useState<Record<string, number>>({});
  const [selectedSkuCodes, setSelectedSkuCodes]       = useState<Set<string>>(new Set());
  const [selectedOverrideCodes, setSelectedOverrideCodes] = useState<Set<string>>(new Set());
  const [batchCfg, setBatchCfg] = useState<{ overrideType: SkuLevelConfig['overrideType']; value: string; allocRatio: string }>({ overrideType: '', value: '', allocRatio: '' });


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
    if (form.qtyMode === 'configured') {
      if (form.syncValueType === 'fixed') return `同步库存 = ${form.fixedQty || '?'} 件（固定）`;
      return `同步库存 = 实际可用库存 × ${form.ratio || '?'}%`;
    }
    // 扣减后同步
    const deductions: string[] = [];
    if (form.syncValueType === 'fixed') deductions.push(`${form.fixedQty || '?'} 件`);
    else                                deductions.push(`实际可用库存 × ${form.ratio || '?'}%`);
    if (form.deductOpenOrder) deductions.push('Open Order');
    if (form.deductSafety)    deductions.push(`安全库存${form.safetyQty ? `（${form.safetyQty}）` : ''}`);
    if (form.reserveQty)      deductions.push(`保留（${form.reserveQty}）`);
    const extra = form.inclInTransit ? ' + 在途库存' : '';
    return `同步库存 = 实际可用库存 − (${deductions.join(' + ')})${extra}`;
  }, [form.qtyMode, form.syncValueType, form.ratio, form.fixedQty, form.deductOpenOrder, form.deductSafety, form.safetyQty, form.reserveQty, form.inclInTransit]);

  const syncSkuList = (items: string[]) =>
    set('skuList', Array.from(new Set(items.map((s) => s.trim()).filter(Boolean))).join(','));

  // 获取当前库存（模拟 API）
  const fetchSkuInventory = async () => {
    setSkuInventoryLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const data: Record<string, number> = {};
    MOCK_SKUS.forEach((s) => { data[s.code] = s.qty; });
    setSkuInventoryData(data);
    setSkuInventoryLoading(false);
  };

  // 批量应用配置到已选 SKU
  const applyBatchConfig = () => {
    if (!selectedSkuCodes.size) return;
    setForm((cur) => {
      let configs = [...cur.skuLevelConfigs];
      selectedSkuCodes.forEach((sku) => {
        const idx = configs.findIndex((c) => c.skuCode === sku);
        const base = idx >= 0 ? configs[idx] : { skuCode: sku, overrideType: '' as const, value: '', allocationRatio: '' };
        const updated = {
          ...base,
          ...(batchCfg.overrideType !== '' ? { overrideType: batchCfg.overrideType, value: batchCfg.value } : {}),
          ...(batchCfg.allocRatio !== ''   ? { allocationRatio: batchCfg.allocRatio }                      : {}),
        };
        if (!updated.overrideType && !updated.allocationRatio) {
          configs = configs.filter((c) => c.skuCode !== sku);
        } else if (idx >= 0) {
          configs[idx] = updated;
        } else {
          configs.push(updated);
        }
      });
      return { ...cur, skuLevelConfigs: configs };
    });
    setSelectedSkuCodes(new Set());
    setBatchCfg({ overrideType: '', value: '', allocRatio: '' });
  };

  // Section ④ 差异化配置：已配置的过滤列表（保留原始 index 供更新）
  const filteredSkuOverrideConfigs = useMemo(() => {
    const kw = skuOverrideSearch.trim().toLowerCase();
    return form.skuLevelConfigs
      .map((cfg, originalIdx) => ({ cfg, originalIdx }))
      .filter(({ cfg }) => !kw || cfg.skuCode.toLowerCase().includes(kw));
  }, [form.skuLevelConfigs, skuOverrideSearch]);

  // 约束模式：全局比例应用到没有差异化配置的所有 SKU，检测与其他规则是否冲突
  const globalRatioConflicts = useMemo(() => {
    if (!form.allocationConstraint || !form.ratio.trim()) return [];
    const r = parseFloat(form.ratio);
    if (isNaN(r) || r <= 0) return [];
    return MOCK_SKUS.filter((s) => {
      const override = form.skuLevelConfigs.find((c) => c.skuCode === s.code);
      if (override?.allocationRatio?.trim()) return false; // 已有差异化比例，不用全局
      return r + (MOCK_SKU_ALLOCATIONS[s.code] ?? 0) > 100;
    }).map((s) => s.code);
  }, [form.allocationConstraint, form.ratio, form.skuLevelConfigs]);

  const handleSkuFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseSkuImportFile(file);
      syncSkuList(parsed.values);
      setSkuImportMsg({ type: 'success', text: `已导入 ${parsed.values.length} 个 SKU，来源列：${parsed.sourceColumn}${parsed.warnings.length ? `；${parsed.warnings.join('；')}` : ''}` });
      setSkuSearch('');
    } catch (err) {
      setSkuImportMsg({ type: 'error', text: err instanceof Error ? err.message : 'SKU 文件导入失败' });
    } finally { e.target.value = ''; }
  };

  const handleSave = async () => {
    if (ediSelected && !form.retailerInput.trim()) {
      document.getElementById('retailer-input')?.focus(); return;
    }
    if (form.frequency !== 'pull' && !form.pushUrl.trim()) {
      document.getElementById('push-url-input')?.focus(); return;
    }
    if (form.allocationConstraint) {
      const overCount = skuItems.filter((sku) => {
        const cfg = form.skuLevelConfigs.find((c) => c.skuCode === sku);
        const ratio = parseFloat(cfg?.allocationRatio || '0');
        return ratio + (MOCK_SKU_ALLOCATIONS[sku] ?? 0) > 100;
      }).length;
      if (overCount > 0) return; // 警告横幅已在列表里提示，此处静默拦截
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRunNow = async () => {
    setRunningNow(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRunningNow(false);
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
              <ComboBox
                value={form.name}
                onChange={(v) => set('name', v)}
                options={RULE_NAME_TEMPLATES}
                placeholder="如：Walmart EDI · 货主 A · 每日同步"
                errorState={!form.name}
              />
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
                  <ComboBox
                    id="retailer-input"
                    value={form.retailerInput}
                    onChange={(v) => set('retailerInput', v)}
                    options={RETAILER_OPTIONS}
                    placeholder="如：WALMART_US"
                    errorState={!form.retailerInput}
                  />
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
        <Section title="同步范围" desc="配置货主和仓库的数据来源范围。">
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
                    <TagsComboBox
                      value={form.ownerInput}
                      onChange={(v) => set('ownerInput', v)}
                      options={OWNER_OPTIONS}
                      placeholder={form.ownerMode === 'include' ? '搜索或输入货主名称…' : '搜索或输入要排除的货主…'}
                    />
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
          </div>
        </Section>

        {/* ④  SKU 与计算规则 */}
        <Section title="SKU 与计算规则" desc="先设定全局计算方式，再按 SKU 分别配置计算规则和分配比例。">
          <div className="space-y-5">
            <Field label="计算方式">
              {/* 模式选择 */}
              <div className="flex gap-2">
                <ChipButton active={form.qtyMode === 'configured'} onClick={() => set('qtyMode', 'configured')}>按照设置同步</ChipButton>
                <ChipButton active={form.qtyMode === 'deduct'} onClick={() => setForm((cur) => ({ ...cur, qtyMode: 'deduct', allocationConstraint: false }))}>扣减后同步</ChipButton>
              </div>

              {/* 值类型 + 输入框 */}
              <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 space-y-3">
                <div className="flex gap-2">
                  <ChipButton active={form.syncValueType === 'ratio'} onClick={() => set('syncValueType', 'ratio')}>百分比</ChipButton>
                  <ChipButton active={form.syncValueType === 'fixed'} onClick={() => setForm((cur) => ({ ...cur, syncValueType: 'fixed', allocationConstraint: false }))}>固定数量</ChipButton>
                </div>

                {form.syncValueType === 'ratio' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input type="number" value={form.ratio} onChange={(v) => set('ratio', v)} placeholder="80" className="w-24" />
                      <span className="text-[12px] text-[var(--muted)]">
                        {form.qtyMode === 'configured' ? '% 的实际可用库存' : '% 作为缓冲扣减，同步剩余'}
                      </span>
                    </div>
                    {/* 跨规则约束开关：仅在"按照设置同步 + 百分比"时显示 */}
                    {form.qtyMode === 'configured' && (
                      <div className="border-t border-[var(--border-subtle)] pt-3 space-y-2">
                        <ToggleRow
                          label="启用跨规则分配总量约束"
                          hint="启用后，SKU 列表切换为分配模式：各 SKU 填写分配比例，实时显示其他规则已占用量与预估余量，总和不能超过 100%。"
                          checked={form.allocationConstraint}
                          onChange={(v) => setForm((cur) => ({ ...cur, allocationConstraint: v }))}
                        />
                        {form.allocationConstraint && globalRatioConflicts.length > 0 && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                              当前全局比例 <strong>{form.ratio}%</strong> 与其他规则存在冲突：
                              <strong>{globalRatioConflicts.length}</strong> 个 SKU 的总分配将超过 100%
                              （{globalRatioConflicts.slice(0, 3).join('、')}{globalRatioConflicts.length > 3 ? ` 等` : ''}）。
                              请在下方差异化配置中为这些 SKU 单独设置比例。
                            </span>
                          </div>
                        )}
                        {form.allocationConstraint && (
                          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 space-y-2">
                            <div className="text-[12px] font-medium text-[var(--foreground)]">运行时约束超出处理策略</div>
                            <p className="text-[11px] text-[var(--muted)]">
                              WMS 新增商品或其他规则变更导致某 SKU 超出 100% 时，按以下方式处理：
                            </p>
                            <div className="space-y-1.5">
                              {([
                                { val: 'cap',         label: '按可用余量同步',   hint: '自动将比例降至可用余量上限，安全不丢数据（推荐）' },
                                { val: 'skip',        label: '跳过该 SKU',      hint: '本次同步跳过超出的 SKU，不推送任何数据' },
                                { val: 'force_alert', label: '强制同步并告警',  hint: '按配置比例强制推送，同时触发告警通知运营' },
                              ] as const).map(({ val, label, hint }) => (
                                <label key={val}
                                  className={cn('flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                                    form.overflowPolicy === val
                                      ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40')}>
                                  <input type="radio" name="overflowPolicy" value={val}
                                    checked={form.overflowPolicy === val}
                                    onChange={() => set('overflowPolicy', val)}
                                    className="mt-0.5 accent-[var(--primary)]" />
                                  <span>
                                    <span className="block text-[12px] font-medium text-[var(--foreground)]">{label}</span>
                                    <span className="block text-[11px] text-[var(--muted)]">{hint}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {form.syncValueType === 'fixed' && (
                  <div className="flex items-center gap-2">
                    <Input type="number" value={form.fixedQty} onChange={(v) => set('fixedQty', v)} placeholder="500" className="w-24" />
                    <span className="text-[12px] text-[var(--muted)]">
                      {form.qtyMode === 'configured' ? '件（始终同步该数量，不随库存变动）' : '件 作为缓冲扣减，同步剩余'}
                    </span>
                  </div>
                )}
              </div>
            </Field>

            {!form.allocationConstraint && form.qtyMode === 'deduct' && (
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
                </div>
              </>
            )}

            {/* 公式预览：始终在配置下方 */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="mb-1 text-[11px] font-medium text-[var(--muted)]">计算公式</div>
              <div className="font-mono text-[13px] text-[var(--foreground)]">{quantityFormula}</div>
            </div>

            {/* ── SKU 范围 ── */}
            <div className="border-t border-[var(--border-subtle)] pt-5">
              <Field label="SKU 范围">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <ChipButton active={form.skuMode === 'all'}     onClick={() => { set('skuMode', 'all'); setSkuImportMsg(null); }}>全部 SKU</ChipButton>
                    <ChipButton active={form.skuMode === 'include'} onClick={() => set('skuMode', 'include')}>仅同步指定 SKU</ChipButton>
                    <ChipButton active={form.skuMode === 'exclude'} onClick={() => set('skuMode', 'exclude')}>排除指定 SKU</ChipButton>
                  </div>

                  {form.skuMode === 'all' && (
                    <div className="flex items-start gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2.5 text-[11px] text-[var(--muted)]">
                      <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--primary)]" />
                      <span>
                        规则动态匹配 WMS 中的<strong className="text-[var(--foreground)]">全部 SKU</strong>，每次同步时实时拉取；
                        WMS 新增商品会在下次同步自动纳入并遵循整体计算规则，无需手动更新规则。
                        差异化配置中的 SKU 仍使用各自的独立规则。
                      </span>
                    </div>
                  )}

                  {form.skuMode !== 'all' && (
                    <div className="space-y-3">
                      <Select value={form.skuBy} onChange={(v) => { set('skuBy', v as SkuBy); setSkuImportMsg(null); setSkuSearch(''); }} className="max-w-[200px]">
                        <option value="sku_list">SKU 列表</option>
                        <option value="tag">标签</option>
                        <option value="category">品类</option>
                      </Select>

                      {form.skuBy === 'tag'      && <Input value={form.skuTags}       onChange={(v) => set('skuTags', v)}       placeholder="标签，如 no-sync,promo" />}
                      {form.skuBy === 'category' && <Input value={form.skuCategories} onChange={(v) => set('skuCategories', v)} placeholder="品类，如 Electronics,Apparel" />}

                      {form.skuBy === 'sku_list' && (
                        <div className="space-y-3">
                          <SkuPickerPanel
                            alreadySelected={new Set(skuItems)}
                            onAdd={(codes) => {
                              syncSkuList([...skuItems, ...codes]);
                              setSkuImportMsg({ type: 'success', text: `已添加 ${codes.length} 个 SKU` });
                            }}
                          />
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
                          {skuItems.length > 0 && (
                            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">

                              {/* 批量操作工具栏 */}
                              {selectedSkuCodes.size > 0 && (
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2">
                                  <span className="shrink-0 text-[12px] font-medium text-[var(--primary)]">已选 {selectedSkuCodes.size} 个</span>
                                  {form.allocationConstraint ? (
                                    /* 约束模式：只批量设置分配比例 */
                                    <div className="relative">
                                      <input type="number" min="0" max="100" value={batchCfg.allocRatio}
                                        onChange={(e) => setBatchCfg((c) => ({ ...c, allocRatio: e.target.value }))}
                                        placeholder="批量分配比例"
                                        className="h-7 w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 pr-5 text-[11px] outline-none focus:border-[var(--primary)]" />
                                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
                                    </div>
                                  ) : (
                                    /* 计算覆盖模式：批量设置计算规则 + 值 */
                                    <>
                                      <select value={batchCfg.overrideType}
                                        onChange={(e) => setBatchCfg((c) => ({ ...c, overrideType: e.target.value as SkuLevelConfig['overrideType'], value: '' }))}
                                        className="h-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] outline-none focus:border-[var(--primary)]">
                                        <option value="">计算规则（不修改）</option>
                                        <option value="ratio">同步比例（%）</option>
                                        <option value="fixed">固定数量（件）</option>
                                        <option value="deduct">扣减数量（件）</option>
                                      </select>
                                      {batchCfg.overrideType && (
                                        <div className="relative">
                                          <input type="number" value={batchCfg.value}
                                            onChange={(e) => setBatchCfg((c) => ({ ...c, value: e.target.value }))}
                                            placeholder="请输入"
                                            className="h-7 w-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 pr-5 text-[11px] outline-none focus:border-[var(--primary)]" />
                                          {batchCfg.overrideType === 'ratio' && <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <button type="button" onClick={applyBatchConfig}
                                    disabled={batchCfg.overrideType === '' && batchCfg.allocRatio === ''}
                                    className="h-7 rounded-lg bg-[var(--primary)] px-3 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-40">
                                    应用到已选
                                  </button>
                                  <button type="button" onClick={() => setSelectedSkuCodes(new Set())}
                                    className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]">
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* 标题行 */}
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[12px] text-[var(--muted)]">
                                  已选 {skuItems.length} 个 SKU{skuSearch ? ` · 匹配 ${filteredSkuItems.length} 个` : ''}
                                  {form.skuLevelConfigs.filter((c) => skuItems.includes(c.skuCode)).length > 0 && (
                                    <span className="ml-2 text-[var(--primary)]">
                                      · {form.skuLevelConfigs.filter((c) => skuItems.includes(c.skuCode)).length} 个已配置
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={fetchSkuInventory} disabled={skuInventoryLoading}
                                    className="flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-medium transition hover:bg-[var(--surface-subtle)] disabled:opacity-50">
                                    <RefreshCw className={cn('size-3', skuInventoryLoading && 'animate-spin')} />
                                    {skuInventoryLoading ? '获取中…' : '获取当前库存'}
                                  </button>
                                  <Input value={skuSearch} onChange={setSkuSearch} placeholder="搜索…" className="h-8 w-36 text-[11px]" />
                                  <button type="button" onClick={() => {
                                    syncSkuList([]);
                                    set('skuLevelConfigs', form.skuLevelConfigs.filter((c) => !skuItems.includes(c.skuCode)));
                                    setSkuSearch(''); setSkuImportMsg(null); setSelectedSkuCodes(new Set());
                                  }} className="text-[12px] text-[var(--muted)] hover:text-red-500">清空</button>
                                </div>
                              </div>

                              {/* 列标签 */}
                              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-1.5">
                                <input type="checkbox"
                                  checked={filteredSkuItems.length > 0 && filteredSkuItems.every((s) => selectedSkuCodes.has(s))}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedSkuCodes(new Set([...selectedSkuCodes, ...filteredSkuItems]));
                                    else setSelectedSkuCodes(new Set([...selectedSkuCodes].filter((s) => !filteredSkuItems.includes(s))));
                                  }}
                                  className="size-3.5 shrink-0 accent-[var(--primary)]" />
                                <span className="flex-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">SKU 编码</span>
                                {form.allocationConstraint ? (
                                  <>
                                    <span className="w-20 shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] pr-4">预估余量</span>
                                    <span className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">分配比例</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-32 shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">计算规则</span>
                                    <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">值</span>
                                  </>
                                )}
                                <span className="size-5 shrink-0" />
                              </div>

                              {/* 数据行 */}
                              <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">                                {filteredSkuItems.length > 0 ? (
                                  <div className="divide-y divide-[var(--border-subtle)]">
                                    {filteredSkuItems.map((sku) => {
                                      const overrideIdx  = form.skuLevelConfigs.findIndex((c) => c.skuCode === sku);
                                      const override     = overrideIdx >= 0 ? form.skuLevelConfigs[overrideIdx] : null;
                                      const overrideType = override?.overrideType ?? '';
                                      const allocRatio   = override?.allocationRatio ?? '';
                                      const allocUsed    = MOCK_SKU_ALLOCATIONS[sku] ?? 0;
                                      const allocVal     = parseFloat(allocRatio) || 0;
                                      const availableCap = 100 - allocUsed;
                                      // 实际生效比例：有差异化填值就用填值，否则用全局比例
                                      const effectiveVal = allocRatio ? allocVal : (parseFloat(form.ratio) || 0);
                                      const allocOver    = form.allocationConstraint && effectiveVal > availableCap;
                                      const isSelected   = selectedSkuCodes.has(sku);
                                      const invQty       = skuInventoryData[sku];
                                      const remainQty    = invQty !== undefined ? Math.round(invQty * Math.max(availableCap, 0) / 100) : null;
                                      const globalValueLabel = (() => {
                                        const val = form.syncValueType === 'ratio' ? `${form.ratio || '?'}%` : `${form.fixedQty || '?'} 件`;
                                        return form.qtyMode === 'deduct' ? `扣减 ${val}` : val;
                                      })();

                                      const patchCfg = (patch: Partial<SkuLevelConfig>) => {
                                        const base = override ?? { skuCode: sku, overrideType: '' as const, value: '', allocationRatio: '' };
                                        const updated = { ...base, ...patch };
                                        if (!updated.overrideType && !updated.allocationRatio) {
                                          set('skuLevelConfigs', form.skuLevelConfigs.filter((c) => c.skuCode !== sku));
                                        } else if (overrideIdx >= 0) {
                                          const next = [...form.skuLevelConfigs]; next[overrideIdx] = updated; set('skuLevelConfigs', next);
                                        } else {
                                          set('skuLevelConfigs', [...form.skuLevelConfigs, updated]);
                                        }
                                      };

                                      return (
                                        <div key={sku} className={cn(
                                          'flex items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer',
                                          allocOver  ? 'bg-red-100 ring-1 ring-inset ring-red-200' :
                                          isSelected ? 'bg-[var(--primary-soft)]' : 'hover:bg-[var(--surface-subtle)]'
                                        )}
                                          onClick={(e) => { if (['SELECT','INPUT','BUTTON'].includes((e.target as HTMLElement).tagName)) return; setSelectedSkuCodes((prev) => { const next = new Set(prev); next.has(sku) ? next.delete(sku) : next.add(sku); return next; }); }}>
                                          <input type="checkbox" checked={isSelected}
                                            onChange={() => setSelectedSkuCodes((prev) => {
                                              const next = new Set(prev); next.has(sku) ? next.delete(sku) : next.add(sku); return next;
                                            })}
                                            className="size-3.5 shrink-0 accent-[var(--primary)]" />
                                          <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-medium text-[var(--foreground)]">{sku}</span>

                                          {/* 预估余量（在计算规则之前） */}
                                          {form.allocationConstraint && (
                                            <span title={`其他已分配 ${allocUsed}%，可用余量 ${availableCap}%`}
                                              className={cn('w-20 shrink-0 text-right text-[11px] font-medium tabular-nums pr-4',
                                                allocOver          ? 'text-red-600 font-semibold' :
                                                availableCap <= 0  ? 'text-red-600' :
                                                availableCap <= 10 ? 'text-amber-600' : 'text-green-600')}>
                                              {availableCap}%
                                            </span>
                                          )}

                                          {form.allocationConstraint ? (
                                            /* 分配模式：只显示分配比例 */
                                            <div className="relative w-20 shrink-0">
                                              <input type="number" min="0" max="100" value={allocRatio}
                                                onChange={(e) => patchCfg({ allocationRatio: e.target.value })}
                                                placeholder="—"
                                                className={cn('h-7 w-full rounded-lg border px-2 pr-5 text-[11px] tabular-nums outline-none transition-colors',
                                                  allocOver ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500'
                                                            : 'border-[var(--border)] bg-[var(--surface-subtle)] focus:border-[var(--primary)]')} />
                                              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
                                            </div>
                                          ) : (
                                            /* 计算覆盖模式：显示计算规则 + 值 */
                                            <>
                                              <select value={overrideType}
                                                onChange={(e) => patchCfg({ overrideType: e.target.value as SkuLevelConfig['overrideType'], value: '' })}
                                                className="h-7 w-32 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 text-[11px] outline-none focus:border-[var(--primary)]">
                                                <option value="">整体规则</option>
                                                <option value="ratio">同步比例（%）</option>
                                                <option value="fixed">固定数量（件）</option>
                                                <option value="deduct">扣减数量（件）</option>
                                              </select>
                                              {overrideType ? (
                                                <div className="relative w-16 shrink-0">
                                                  <input type="number" value={override?.value ?? ''}
                                                    onChange={(e) => patchCfg({ value: e.target.value })}
                                                    placeholder="请输入"
                                                    className="h-7 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2 pr-5 text-[11px] outline-none focus:border-[var(--primary)]" />
                                                  {overrideType === 'ratio' && <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>}
                                                </div>
                                              ) : (
                                                <div className="flex h-7 w-16 shrink-0 items-center rounded-lg border border-[var(--border-subtle)] px-2 text-[11px] text-[var(--muted)]">
                                                  {globalValueLabel}
                                                </div>
                                              )}
                                            </>
                                          )}
                                          <button type="button"
                                            onClick={() => {
                                              syncSkuList(skuItems.filter((s) => s !== sku));
                                              set('skuLevelConfigs', form.skuLevelConfigs.filter((c) => c.skuCode !== sku));
                                              setSelectedSkuCodes((prev) => { const next = new Set(prev); next.delete(sku); return next; });
                                            }}
                                            className="size-5 shrink-0 text-center text-[13px] leading-none text-[var(--muted)] hover:text-red-500">×</button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="px-3 py-4 text-center text-[11px] text-[var(--muted)]">没有匹配的 SKU</div>
                                )}
                              </div>

                              {/* 超出警告 */}
                              {form.allocationConstraint && (() => {
                                const overList = filteredSkuItems.filter((sku) => {
                                  const cfg = form.skuLevelConfigs.find((c) => c.skuCode === sku);
                                  const ratio = parseFloat(cfg?.allocationRatio || '0');
                                  return ratio + (MOCK_SKU_ALLOCATIONS[sku] ?? 0) > 100;
                                });
                                if (!overList.length) return null;
                                return (
                                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-700">
                                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                    <span>
                                      <strong>{overList.length} 个 SKU 分配超出上限</strong>（{overList.slice(0, 3).join('、')}{overList.length > 3 ? ` 等` : ''}），
                                      总分配比例不能超过 100%。请调整分配比例后再保存。
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            {/* SKU 差异化配置：仅在非"仅同步指定 SKU + SKU 列表"模式下显示，避免用户在两处维护同一个 SKU 列表 */}
            {!(form.skuMode === 'include' && form.skuBy === 'sku_list') && (
            <div className="border-t border-[var(--border-subtle)] pt-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-[var(--foreground)]">SKU 差异化配置</div>
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    为特定 SKU 设置独立的同步比例或数量，覆盖上方整体设置；未列出的 SKU 仍遵循整体规则。
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.skuLevelOverrideEnabled}
                  onClick={() => {
                    const enabling = !form.skuLevelOverrideEnabled;
                    if (enabling) {
                      // 自动加载当前 SKU 范围内所有 SKU，已有配置保留
                      const source = form.skuMode === 'include' && form.skuBy === 'sku_list'
                        ? skuItems
                        : MOCK_SKUS.map((s) => s.code);
                      const existing = new Set(form.skuLevelConfigs.map((c) => c.skuCode));
                      const toAdd = source
                        .filter((code) => !existing.has(code))
                        .map((skuCode) => ({ skuCode, overrideType: '' as const, value: '', allocationRatio: '' }));
                      setForm((cur) => ({
                        ...cur,
                        skuLevelOverrideEnabled: true,
                        skuLevelConfigs: [...cur.skuLevelConfigs, ...toAdd],
                      }));
                    } else {
                      set('skuLevelOverrideEnabled', false);
                    }
                  }}
                  className={cn(
                    'relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
                    form.skuLevelOverrideEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                  )}>
                  <span className={cn(
                    'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform',
                    form.skuLevelOverrideEnabled ? 'translate-x-4' : 'translate-x-0'
                  )} />
                </button>
              </div>

              {form.skuLevelOverrideEnabled && (
                <div className="space-y-3">

                  {/* SKU 搜索选择 */}
                  <SkuPickerPanel
                    alreadySelected={new Set(form.skuLevelConfigs.map((c) => c.skuCode))}
                    onAdd={(codes) => set('skuLevelConfigs', [
                      ...form.skuLevelConfigs,
                      ...codes.map((skuCode) => ({ skuCode, overrideType: '' as const, value: '', allocationRatio: '' })),
                    ])}
                    footerHint="未在下方列表中的 SKU 均遵循上方整体计算规则。"
                  />

                  {/* 已添加列表 */}
                  {form.skuLevelConfigs.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">

                      {/* 批量操作栏 */}
                      {selectedOverrideCodes.size > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2">
                          <span className="shrink-0 text-[12px] font-medium text-[var(--primary)]">已选 {selectedOverrideCodes.size} 个</span>
                          {form.allocationConstraint ? (
                            <div className="relative">
                              <input type="number" min="0" max="100" value={batchCfg.allocRatio}
                                onChange={(e) => setBatchCfg((c) => ({ ...c, allocRatio: e.target.value }))}
                                placeholder="批量分配比例"
                                className="h-7 w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 pr-5 text-[11px] outline-none focus:border-[var(--primary)]" />
                              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
                            </div>
                          ) : (
                            <>
                              <select value={batchCfg.overrideType}
                                onChange={(e) => setBatchCfg((c) => ({ ...c, overrideType: e.target.value as SkuLevelConfig['overrideType'], value: '' }))}
                                className="h-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] outline-none focus:border-[var(--primary)]">
                                <option value="">计算规则（不修改）</option>
                                <option value="ratio">同步比例（%）</option>
                                <option value="fixed">固定数量（件）</option>
                                <option value="deduct">扣减数量（件）</option>
                              </select>
                              {batchCfg.overrideType && (
                                <div className="relative">
                                  <input type="number" value={batchCfg.value}
                                    onChange={(e) => setBatchCfg((c) => ({ ...c, value: e.target.value }))}
                                    placeholder="请输入"
                                    className="h-7 w-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 pr-5 text-[11px] outline-none focus:border-[var(--primary)]" />
                                  {batchCfg.overrideType === 'ratio' && <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>}
                                </div>
                              )}
                            </>
                          )}
                          <button type="button"
                            onClick={() => {
                              setForm((cur) => {
                                const configs = [...cur.skuLevelConfigs];
                                selectedOverrideCodes.forEach((skuCode) => {
                                  const idx = configs.findIndex((c) => c.skuCode === skuCode);
                                  if (idx < 0) return;
                                  configs[idx] = {
                                    ...configs[idx],
                                    ...(batchCfg.overrideType !== '' ? { overrideType: batchCfg.overrideType, value: batchCfg.value } : {}),
                                    ...(batchCfg.allocRatio !== ''   ? { allocationRatio: batchCfg.allocRatio } : {}),
                                  };
                                });
                                return { ...cur, skuLevelConfigs: configs };
                              });
                              setSelectedOverrideCodes(new Set());
                              setBatchCfg({ overrideType: '', value: '', allocRatio: '' });
                            }}
                            disabled={batchCfg.overrideType === '' && batchCfg.allocRatio === ''}
                            className="h-7 rounded-lg bg-[var(--primary)] px-3 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-40">
                            应用到已选
                          </button>
                          <button type="button" onClick={() => setSelectedOverrideCodes(new Set())}
                            className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      )}

                      {/* 工具栏 */}
                      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
                        <span className="flex-1 text-[11px] text-[var(--muted)]">
                          已配置 <strong className="text-[var(--foreground)]">{form.skuLevelConfigs.filter((c) => c.skuCode.trim()).length}</strong> 个 SKU
                          {skuOverrideSearch && filteredSkuOverrideConfigs.length !== form.skuLevelConfigs.length && (
                            <span>，匹配 {filteredSkuOverrideConfigs.length} 个</span>
                          )}
                        </span>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-[var(--muted)]" />
                          <input
                            type="text"
                            value={skuOverrideSearch}
                            onChange={(e) => setSkuOverrideSearch(e.target.value)}
                            placeholder="搜索 SKU…"
                            className="h-7 w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-6 pr-2 text-[11px] outline-none focus:border-[var(--primary)]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => { set('skuLevelConfigs', []); setSkuOverrideSearch(''); setSelectedOverrideCodes(new Set()); }}
                          className="text-[11px] text-[var(--muted)] hover:text-red-500">清空</button>
                      </div>

                      {/* 空态批量提示（未选中任何行时显示） */}
                      {selectedOverrideCodes.size === 0 && (
                        <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
                          <span>勾选行后可批量设置</span>
                          {filteredSkuOverrideConfigs.length > 0 && (
                            <button type="button"
                              onClick={() => setSelectedOverrideCodes(new Set(filteredSkuOverrideConfigs.map((c) => c.cfg.skuCode)))}
                              className="ml-1 text-[var(--primary)] hover:underline">
                              全选当前 {filteredSkuOverrideConfigs.length} 条
                            </button>
                          )}
                        </div>
                      )}

                      {/* 列标签 */}
                      {form.allocationConstraint ? (
                        <div className="grid grid-cols-[20px_minmax(0,1fr)_100px_100px_32px] gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5">
                          <input type="checkbox"
                            checked={filteredSkuOverrideConfigs.length > 0 && filteredSkuOverrideConfigs.every((c) => selectedOverrideCodes.has(c.cfg.skuCode))}
                            onChange={(e) => {
                              const codes = filteredSkuOverrideConfigs.map((c) => c.cfg.skuCode);
                              if (e.target.checked) setSelectedOverrideCodes(new Set([...selectedOverrideCodes, ...codes]));
                              else setSelectedOverrideCodes(new Set([...selectedOverrideCodes].filter((s) => !codes.includes(s))));
                            }}
                            className="size-3.5 accent-[var(--primary)]" />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">SKU 编码</span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-right text-[var(--muted)] pr-4">预估余量</span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">分配比例</span>
                          <span />
                        </div>
                      ) : (
                        <div className="grid grid-cols-[20px_minmax(0,2fr)_160px_100px_32px] gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5">
                          <input type="checkbox"
                            checked={filteredSkuOverrideConfigs.length > 0 && filteredSkuOverrideConfigs.every((c) => selectedOverrideCodes.has(c.cfg.skuCode))}
                            onChange={(e) => {
                              const codes = filteredSkuOverrideConfigs.map((c) => c.cfg.skuCode);
                              if (e.target.checked) setSelectedOverrideCodes(new Set([...selectedOverrideCodes, ...codes]));
                              else setSelectedOverrideCodes(new Set([...selectedOverrideCodes].filter((s) => !codes.includes(s))));
                            }}
                            className="size-3.5 accent-[var(--primary)]" />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">SKU 编码</span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">计算方式</span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">值</span>
                          <span />
                        </div>
                      )}

                      {/* 配置行 */}
                      <div className="max-h-64 divide-y divide-[var(--border-subtle)] overflow-y-auto bg-[var(--surface)]">
                        {filteredSkuOverrideConfigs.length > 0 ? (
                          filteredSkuOverrideConfigs.map(({ cfg, originalIdx }) => {
                            const allocUsed    = MOCK_SKU_ALLOCATIONS[cfg.skuCode] ?? 0;
                            const allocVal     = parseFloat(cfg.allocationRatio) || 0;
                            const availableCap = 100 - allocUsed;
                            // 实际生效比例：有差异化填值就用填值，否则用全局比例
                            const effectiveVal = cfg.allocationRatio ? allocVal : (parseFloat(form.ratio) || 0);
                            const allocOver    = form.allocationConstraint && effectiveVal > availableCap;
                            const globalLabel  = `${form.ratio || '?'}%`;

                            return form.allocationConstraint ? (
                              /* ── 约束模式：checkbox | SKU | 预估余量 | 分配比例 | × ── */
                              <div key={originalIdx}
                                onClick={(e) => { if (['INPUT','BUTTON'].includes((e.target as HTMLElement).tagName)) return; setSelectedOverrideCodes((prev) => { const next = new Set(prev); next.has(cfg.skuCode) ? next.delete(cfg.skuCode) : next.add(cfg.skuCode); return next; }); }}
                                className={cn('grid grid-cols-[20px_minmax(0,1fr)_100px_100px_32px] items-center gap-2 px-3 py-1.5 cursor-pointer',
                                allocOver ? 'bg-red-100 ring-1 ring-inset ring-red-200' :
                                selectedOverrideCodes.has(cfg.skuCode) ? 'bg-[var(--primary-soft)]' : 'hover:bg-[var(--surface-subtle)]')}>
                                <input type="checkbox" checked={selectedOverrideCodes.has(cfg.skuCode)}
                                  onChange={() => setSelectedOverrideCodes((prev) => { const next = new Set(prev); next.has(cfg.skuCode) ? next.delete(cfg.skuCode) : next.add(cfg.skuCode); return next; })}
                                  className="size-3.5 accent-[var(--primary)]" />
                                <div className="min-w-0">
                                  <div className="truncate font-mono text-[12px] font-medium text-[var(--foreground)]">{cfg.skuCode}</div>
                                  <div className="text-[10px] text-[var(--muted)]">整体规则：{globalLabel} · 其他已分配 {allocUsed}%</div>
                                </div>
                                {/* 预估余量 = 100 - 其他规则已占用，始终显示，超出标红 */}
                                <span className={cn('text-right text-[11px] font-medium tabular-nums pr-4',
                                  allocOver          ? 'text-red-600 font-semibold' :
                                  availableCap <= 0  ? 'text-red-600' :
                                  availableCap <= 10 ? 'text-amber-600' : 'text-green-600')}>
                                  {availableCap}%
                                </span>
                                {/* 分配比例 */}
                                <div className="relative">
                                  <input type="number" min="0" max="100" value={cfg.allocationRatio}
                                    onChange={(e) => {
                                      const next = [...form.skuLevelConfigs];
                                      next[originalIdx] = { ...next[originalIdx], allocationRatio: e.target.value };
                                      set('skuLevelConfigs', next);
                                    }}
                                    placeholder={globalLabel}
                                    className={cn('h-8 w-full rounded-lg border px-2 pr-6 text-[11px] tabular-nums outline-none transition-colors',
                                      allocOver ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500'
                                               : 'border-[var(--border)] bg-[var(--surface-subtle)] focus:border-[var(--primary)]')} />
                                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
                                </div>
                                <button type="button"
                                  onClick={() => { set('skuLevelConfigs', form.skuLevelConfigs.filter((_, idx) => idx !== originalIdx)); setSelectedOverrideCodes((prev) => { const next = new Set(prev); next.delete(cfg.skuCode); return next; }); }}
                                  className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-red-500">
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              /* ── 计算覆盖模式：checkbox | SKU | 计算方式 | 值 | × ── */
                              <div key={originalIdx}
                                onClick={(e) => { if (['SELECT','INPUT','BUTTON'].includes((e.target as HTMLElement).tagName)) return; setSelectedOverrideCodes((prev) => { const next = new Set(prev); next.has(cfg.skuCode) ? next.delete(cfg.skuCode) : next.add(cfg.skuCode); return next; }); }}
                                className={cn('grid grid-cols-[20px_minmax(0,2fr)_160px_100px_32px] items-center gap-2 px-3 py-1.5 cursor-pointer',
                                  selectedOverrideCodes.has(cfg.skuCode) ? 'bg-[var(--primary-soft)]' : 'hover:bg-[var(--surface-subtle)]')}>
                                <input type="checkbox" checked={selectedOverrideCodes.has(cfg.skuCode)}
                                  onChange={() => setSelectedOverrideCodes((prev) => { const next = new Set(prev); next.has(cfg.skuCode) ? next.delete(cfg.skuCode) : next.add(cfg.skuCode); return next; })}
                                  className="size-3.5 accent-[var(--primary)]" />
                                <span className="min-w-0 truncate font-mono text-[12px] font-medium text-[var(--foreground)]">{cfg.skuCode}</span>
                                <select value={cfg.overrideType}
                                  onChange={(e) => {
                                    const next = [...form.skuLevelConfigs];
                                    next[originalIdx] = { ...next[originalIdx], overrideType: e.target.value as SkuLevelConfig['overrideType'] };
                                    set('skuLevelConfigs', next);
                                  }}
                                  className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-[11px] outline-none focus:border-[var(--primary)]">
                                  <option value="">整体规则</option>
                                  <option value="ratio">同步比例（%）</option>
                                  <option value="fixed">固定数量（件）</option>
                                  <option value="deduct">扣减数量（件）</option>
                                </select>
                                {/* 值：整体规则时显示全局值 */}
                                {cfg.overrideType ? (
                                  <div className="relative">
                                    <input type="number" value={cfg.value}
                                      onChange={(e) => {
                                        const next = [...form.skuLevelConfigs];
                                        next[originalIdx] = { ...next[originalIdx], value: e.target.value };
                                        set('skuLevelConfigs', next);
                                      }}
                                      placeholder="请输入"
                                      className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2 pr-6 text-[11px] outline-none focus:border-[var(--primary)]" />
                                    {cfg.overrideType === 'ratio' && <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>}
                                  </div>
                                ) : (
                                  <div className="flex h-8 items-center rounded-lg border border-[var(--border-subtle)] px-2 text-[11px] text-[var(--muted)]">
                                    {(() => {
                                      const val = form.syncValueType === 'ratio' ? `${form.ratio || '?'}%` : `${form.fixedQty || '?'} 件`;
                                      return form.qtyMode === 'deduct' ? `扣减 ${val}` : val;
                                    })()}
                                  </div>
                                )}
                                <button type="button"
                                  onClick={() => { set('skuLevelConfigs', form.skuLevelConfigs.filter((_, idx) => idx !== originalIdx)); setSelectedOverrideCodes((prev) => { const next = new Set(prev); next.delete(cfg.skuCode); return next; }); }}
                                  className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-red-500">
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-3 py-4 text-center text-[11px] text-[var(--muted)]">
                            {skuOverrideSearch ? `没有包含"${skuOverrideSearch}"的 SKU` : '暂无配置'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 汇总提示 */}
                  {form.skuLevelConfigs.filter((c) => c.skuCode.trim()).length > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                      <Zap className="size-3 shrink-0" />
                      已为 <strong>{form.skuLevelConfigs.filter((c) => c.skuCode.trim()).length}</strong> 个 SKU 配置差异化规则，其余 SKU 遵循整体计算设置。
                    </div>
                  )}
                </div>
              )}
            </div>
            )}{/* end !(include + sku_list) conditional */}
          </div>
        </Section>

        {/* ⑤  输出与执行 */}
        <Section title="输出与执行" desc="定义报文里输出哪些字段，以及何时推送、推送到哪里。">
          <div className="space-y-7">

            {/* 输出字段 */}
            <div>
              <div className="mb-3 text-[13px] font-medium text-[var(--foreground)]">输出字段</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <ToggleRow label="同步 SKU 状态" hint="随库存数量一并输出 SKU 可用 / 不可用状态。"
                  checked={form.syncStatus} onChange={(v) => set('syncStatus', v)} />
                <ToggleRow label="不可用 SKU 置零" hint="SKU 状态不可用时，同步库存强制输出为 0。"
                  checked={form.unavailToZero} onChange={(v) => set('unavailToZero', v)} />
                <ToggleRow label="可用 SKU 无流水时置零" hint="SKU 状态可用，但无任何库存流水记录时，同步库存强制输出为 0。"
                  checked={form.noLedgerAsZero} onChange={(v) => set('noLedgerAsZero', v)} />
                <ToggleRow label="忽略已发货时间限制" hint="启用后，WMS 将返回库存记录，无论发货时间窗口如何。"
                  checked={form.ignoreShipTimeLimit} onChange={(v) => set('ignoreShipTimeLimit', v)} />
                <ToggleRow label="同步零库存 SKU" hint="库存为 0 的 SKU 仍然输出，不跳过。"
                  checked={form.includeZero} onChange={(v) => set('includeZero', v)} />
                <ToggleRow label="同步 Retailer SKU 名称" hint="随库存报文附带 Retailer 侧的 SKU 名称。"
                  checked={form.syncRetailerSkuName} onChange={(v) => set('syncRetailerSkuName', v)} />
                <ToggleRow label="包含条码" hint="输出 UPC、EAN 等条码字段。"
                  checked={form.includeBarcode} onChange={(v) => set('includeBarcode', v)} />
              </div>
            </div>

            {/* 分割线 */}
            <div className="border-t border-[var(--border-subtle)]" />

            {/* 执行频率 */}
            <div className="space-y-4">
              <div className="text-[13px] font-medium text-[var(--foreground)]">执行频率</div>
              <div className="flex flex-wrap gap-2">
                <ChipButton active={form.frequency === 'daily'}     onClick={() => set('frequency', 'daily')}>每日定时</ChipButton>
                <ChipButton active={form.frequency === 'interval'}  onClick={() => set('frequency', 'interval')}>按时间间隔</ChipButton>
                <ChipButton active={form.frequency === 'realtime'}  onClick={() => set('frequency', 'realtime')}>实时触发</ChipButton>
                <ChipButton active={form.frequency === 'scheduled'} onClick={() => set('frequency', 'scheduled')}>指定日期时间</ChipButton>
                <ChipButton active={form.frequency === 'pull'}      onClick={() => set('frequency', 'pull')}>拉取模式</ChipButton>
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {form.frequency === 'daily'     && '每天在指定时刻执行同步，可设置多个时间点。'}
                {form.frequency === 'interval'  && '按固定时间间隔循环执行。'}
                {form.frequency === 'realtime'  && '库存发生特定变化时立即触发同步。'}
                {form.frequency === 'scheduled' && '在指定的一个或多个固定日期时刻各触发一次同步，适用于大促预热、节假日补货等不规律场景。'}
                {form.frequency === 'pull'      && 'Retailer 主动拉取，系统不主动推送，无需配置推送地址。'}
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

              {form.frequency === 'scheduled' && (
                <Field label="指定同步时间" hint="可添加多个时间点，系统将在每个指定时刻各触发一次同步。执行完毕后规则自动置为停用。">
                  <div className="space-y-2">
                    {form.scheduledDatetimes.map((dt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={dt}
                          onChange={(e) => {
                            const next = [...form.scheduledDatetimes];
                            next[i] = e.target.value;
                            set('scheduledDatetimes', next);
                          }}
                          className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                        />
                        {form.scheduledDatetimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => set('scheduledDatetimes', form.scheduledDatetimes.filter((_, idx) => idx !== i))}
                            className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-red-300 hover:text-red-500">
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => set('scheduledDatetimes', [...form.scheduledDatetimes, ''])}
                      className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-3 text-[12px] text-[var(--muted)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)]">
                      + 添加时间点
                    </button>
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
            <button
              type="button"
              onClick={handleRunNow}
              disabled={runningNow || !form.name.trim()}
              title={!form.name.trim() ? '请先填写规则名称' : '立即执行一次同步，不受执行频率限制'}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--primary)] px-4 text-[13px] font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-50">
              {runningNow ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
              {runningNow ? '执行中…' : '立即执行'}
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
