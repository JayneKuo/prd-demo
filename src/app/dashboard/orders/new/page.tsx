'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Plus, Package, Search, X,
  ChevronDown, ChevronRight, Tag, User, AlertCircle,
  ShoppingBag, Edit3, MapPin, CreditCard, Settings2,
  Truck, Info, Loader2, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 样式常量 ───────────────────────────────────────────────────────────────

const inputCls = [
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)]',
  'px-3 py-2 text-[13px] text-[var(--foreground)]',
  'placeholder:text-[var(--muted-foreground)]',
  'transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]',
].join(' ');

const smInputCls = [
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)]',
  'px-2.5 py-1.5 text-[13px] text-[var(--foreground)]',
  'placeholder:text-[var(--muted-foreground)]',
  'transition focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]',
].join(' ');

const cardCls = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]';

// ─── 类型定义 ────────────────────────────────────────────────────────────────

type OrderItem = {
  /** 前端唯一标识 */
  _key: string;
  masterVariantId: string;
  sku: string;
  productName: string;
  qty: number;
  orderedUomCode: string;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  /** 是否来自商品库（有 masterVariantId） */
  fromCatalog: boolean;
  /** 商品履约类型（来自商品中心，随 SKU 带入，只读；手填商品默认 physical） */
  itemType: import('@/lib/mock-data/order-details').FulfillmentType;
  /** 服务商品附加字段 */
  serviceScheduledDate?: string;
  serviceTimeWindow?: string;
  /** 预售商品附加字段 */
  presaleEndDate?: string;
  /** 租赁商品附加字段 */
  rentalStartDate?: string;
  rentalEndDate?: string;
  rentalDeposit?: string;
  /** 礼品卡附加字段 */
  giftCardRecipientEmail?: string;
  giftCardExpiry?: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  code: string;
};

type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  countryCode: string;
  province: string;
  city: string;
  district: string;
  street1: string;
  street2: string;
  postalCode: string;
  isDefaultShipping: boolean;
};

type CatalogVariant = {
  id: string;
  sku: string;
  name: string;
  variantClass?: string;
  basePrice: number;
  currency: string;
  defaultImageUrl?: string;
  uomCode?: string;
  /** 商品履约类型（来自商品中心，随 SKU 带入） */
  itemType?: import('@/lib/mock-data/order-details').FulfillmentType;
};

type SalesChannel = {
  id: string;
  name: string;
  code: string;
  currency: string;
};

// ─── Mock 数据 ────────────────────────────────────────────────────────────────

const mockChannels: SalesChannel[] = [
  { id: 'ch_manual', name: '手工建单', code: 'MANUAL', currency: 'USD' },
  { id: 'ch_store_a', name: '线下门店 A', code: 'OFFLINE_A', currency: 'CNY' },
  { id: 'ch_phone', name: '电话订单', code: 'PHONE', currency: 'USD' },
];

const mockCustomers: Customer[] = [
  { id: 'cus_001', name: 'Emily Johnson', email: 'emily@example.com', phone: '+1 212-555-0100', code: 'C-0001' },
  { id: 'cus_002', name: 'James Wilson', email: 'james@example.com', phone: '+1 312-555-0102', code: 'C-0002' },
  { id: 'cus_003', name: 'Sarah Kim', email: 'sarah@example.com', phone: '+65 9123 4567', code: 'C-0003' },
  { id: 'cus_004', name: 'David Lee', email: 'david@example.com', phone: '+44 20 7946 0958', code: 'C-0004' },
  { id: 'cus_005', name: '张伟', email: 'zhangwei@example.com', phone: '+86 138 0013 8000', code: 'C-0005' },
];

const mockAddresses: Record<string, CustomerAddress[]> = {
  cus_001: [
    { id: 'addr_001', label: '家庭地址', recipientName: 'Emily Johnson', phone: '+1 212-555-0100', countryCode: 'US', province: 'NY', city: 'New York', district: '', street1: '350 5th Ave', street2: 'Suite 4920', postalCode: '10118', isDefaultShipping: true },
    { id: 'addr_002', label: '办公地址', recipientName: 'Emily Johnson', phone: '+1 212-555-0101', countryCode: 'US', province: 'NY', city: 'Brooklyn', district: '', street1: '100 Jay St', street2: '', postalCode: '11201', isDefaultShipping: false },
  ],
  cus_002: [
    { id: 'addr_003', label: '默认地址', recipientName: 'James Wilson', phone: '+1 312-555-0102', countryCode: 'US', province: 'IL', city: 'Chicago', district: '', street1: '233 S Wacker Dr', street2: '', postalCode: '60606', isDefaultShipping: true },
  ],
  cus_003: [
    { id: 'addr_004', label: '新加坡办公室', recipientName: 'Sarah Kim', phone: '+65 9123 4567', countryCode: 'SG', province: '', city: 'Singapore', district: '', street1: '1 Raffles Pl', street2: '#20-61', postalCode: '048616', isDefaultShipping: true },
  ],
};

const mockVariants: CatalogVariant[] = [
  { id: 'var_001', sku: 'SKU-0001', name: 'Smart Watch Band', variantClass: 'Black / S', basePrice: 12.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_002', sku: 'SKU-0002', name: 'Screen Protector', variantClass: 'Tempered Glass', basePrice: 8.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_003', sku: 'SKU-0003', name: 'Charging Dock', variantClass: 'White', basePrice: 29.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_004', sku: 'SKU-0004', name: 'Mechanical Keyboard', variantClass: 'Cherry MX Blue', basePrice: 89.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_005', sku: 'SKU-0005', name: 'Webcam 4K', variantClass: '60fps / USB-C', basePrice: 59.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_006', sku: 'SKU-0006', name: 'Ring Light Mini', variantClass: '6-inch', basePrice: 24.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_007', sku: 'SKU-0007', name: 'Phone Case', variantClass: 'iPhone 15 / Clear', basePrice: 15.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_008', sku: 'SKU-0008', name: 'USB-C Cable 2m', variantClass: 'White', basePrice: 9.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_009', sku: 'SKU-0009', name: 'Bluetooth Speaker', variantClass: 'Midnight Black', basePrice: 45.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_010', sku: 'SKU-0010', name: 'Wireless Earbuds Pro', variantClass: 'ANC / USB-C', basePrice: 79.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_011', sku: 'SKU-0011', name: 'Laptop Stand', variantClass: 'Aluminum / Silver', basePrice: 49.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  { id: 'var_012', sku: 'SKU-0012', name: 'Wireless Charger', variantClass: '15W / Black', basePrice: 19.99, currency: 'USD', uomCode: 'PCS', itemType: 'physical' },
  // ── 非实物商品 ──
  { id: 'var_svc_001', sku: 'SVC-INSTALL-STD', name: '设备安装服务', variantClass: '标准安装 / 上门', basePrice: 80.00, currency: 'USD', uomCode: 'PCS', itemType: 'service' },
  { id: 'var_svc_002', sku: 'SVC-DELIVERY-INSTALL', name: '送货安装一体服务', variantClass: '含拆包 / 调试', basePrice: 120.00, currency: 'USD', uomCode: 'PCS', itemType: 'service' },
  { id: 'var_gc_001', sku: 'GC-USD-50', name: 'Gift Card $50', variantClass: '$50 USD', basePrice: 50.00, currency: 'USD', uomCode: 'PCS', itemType: 'gift_card' },
  { id: 'var_gc_002', sku: 'GC-USD-100', name: 'Gift Card $100', variantClass: '$100 USD', basePrice: 100.00, currency: 'USD', uomCode: 'PCS', itemType: 'gift_card' },
  { id: 'var_rental_001', sku: 'RENTAL-CAM-A7IV-30D', name: 'Sony A7IV Camera Kit（租赁）', variantClass: '30 天 / 含镜头', basePrice: 450.00, currency: 'USD', uomCode: 'PCS', itemType: 'rental' },
  { id: 'var_digital_001', sku: 'SW-LICENSE-PRO', name: 'Pro Software License', variantClass: '1 年 / 单用户', basePrice: 199.00, currency: 'USD', uomCode: 'PCS', itemType: 'digital' },
];

// ─── 通用子组件 ───────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 flex items-center gap-0.5 text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-[0.06em]">
      {required && <span className="text-[var(--danger)] text-[14px] leading-none -mt-px">*</span>}
      {children}
    </label>
  );
}

function SectionHeader({ icon: Icon, title, action }: { icon?: React.ElementType; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-[15px] text-[var(--muted)]" />}
        <span className="text-[13px] font-semibold text-[var(--foreground)]">{title}</span>
      </div>
      {action}
    </div>
  );
}

function CardSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(cardCls, 'p-4', className)}>
      {children}
    </div>
  );
}

// ─── 商品搜索弹窗 ─────────────────────────────────────────────────────────────

function ProductSearchModal({
  open, onClose, onConfirm, existingSkus,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (variants: CatalogVariant[]) => void;
  existingSkus: string[];
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setSelected(new Set()); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return mockVariants;
    const q = query.toLowerCase();
    return mockVariants.filter(v => v.sku.toLowerCase().includes(q) || v.name.toLowerCase().includes(q));
  }, [query]);

  const alreadyAdded = (sku: string) => existingSkus.includes(sku);

  const toggle = (id: string, sku: string) => {
    if (alreadyAdded(sku)) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const available = filtered.filter(v => !alreadyAdded(v.sku));
  const allChecked = available.length > 0 && available.every(v => selected.has(v.id));
  const toggleAll = () => allChecked
    ? setSelected(prev => { const n = new Set(prev); available.forEach(v => n.delete(v.id)); return n; })
    : setSelected(prev => { const n = new Set(prev); available.forEach(v => n.add(v.id)); return n; });

  const handleConfirm = () => {
    onConfirm(mockVariants.filter(v => selected.has(v.id)));
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="mx-4 flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        style={{ maxHeight: 'min(82vh, 680px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">选择产品</h3>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] transition">
            <X className="size-4" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索 SKU 或产品名称..."
              className={cn(inputCls, 'pl-9')}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 列表表头 */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="size-3.5 accent-[var(--primary)]" />
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">产品</span>
          <span className="w-20 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">价格</span>
        </div>

        {/* 产品列表 */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Package className="size-8 text-[var(--border)]" />
              <p className="text-[13px] text-[var(--muted)]">未找到匹配商品</p>
              <p className="text-[12px] text-[var(--muted-foreground)]">可直接在订单行手填 SKU 快速建档</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(v => {
                const added = alreadyAdded(v.sku);
                const checked = selected.has(v.id);
                return (
                  <label
                    key={v.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-5 py-2.5 transition-colors select-none',
                      added ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--surface-subtle)]',
                      checked && !added && 'bg-[var(--primary-soft)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(v.id, v.sku)}
                      disabled={added}
                      className="size-3.5 accent-[var(--primary)]"
                    />
                    {/* 图片占位 */}
                    <div className="size-9 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)] flex items-center justify-center">
                      <Package className="size-4 text-[var(--muted-foreground)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{v.name}</span>
                        {v.variantClass && (
                          <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-[var(--border-subtle)]">
                            {v.variantClass}
                          </span>
                        )}
                        {added && (
                          <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">已添加</span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{v.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[13px] font-medium text-[var(--foreground)]">${v.basePrice.toFixed(2)}</span>
                      <p className="text-[11px] text-[var(--muted)]">{v.currency}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">
            {selected.size > 0 ? `已选 ${selected.size} 个产品` : `共 ${filtered.length} 个产品`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition">
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 transition"
            >
              添加{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 新建客户弹窗 ─────────────────────────────────────────────────────────────

type NewCustomerForm = {
  name: string; type: 'INDIVIDUAL' | 'COMPANY'; email: string; phone: string;
  recipientName: string; countryCode: string; province: string; city: string;
  street1: string; postalCode: string;
};

function CreateCustomerModal({
  open, onClose, onCreated, prefill,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: Customer, addr?: CustomerAddress) => void;
  prefill?: { name?: string; email?: string; phone?: string };
}) {
  const [form, setForm] = useState<NewCustomerForm>({
    name: '', type: 'INDIVIDUAL', email: '', phone: '',
    recipientName: '', countryCode: 'US', province: '', city: '', street1: '', postalCode: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, name: prefill?.name ?? '', email: prefill?.email ?? '', phone: prefill?.phone ?? '' }));
      setError('');
    }
  }, [open, prefill]);

  const set = (k: keyof NewCustomerForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('客户名称为必填项'); return; }
    if (!form.email && !form.phone) { setError('手机或邮箱至少填写一项'); return; }
    const id = `cus_new_${Date.now()}`;
    const c: Customer = { id, name: form.name, email: form.email, phone: form.phone, code: `C-${String(Date.now()).slice(-4)}` };
    let addr: CustomerAddress | undefined;
    if (form.street1 && form.postalCode && form.countryCode) {
      addr = {
        id: `addr_new_${Date.now()}`,
        label: '默认地址',
        recipientName: form.recipientName || form.name,
        phone: form.phone,
        countryCode: form.countryCode,
        province: form.province,
        city: form.city,
        district: '',
        street1: form.street1,
        street2: '',
        postalCode: form.postalCode,
        isDefaultShipping: true,
      };
    }
    onCreated(c, addr);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="mx-4 w-full max-w-[520px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">创建新客户</h3>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)] transition"><X className="size-4" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(90vh - 130px)' }}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle className="size-4 shrink-0" />{error}
            </div>
          )}

          <div>
            <Label required>客户姓名</Label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="请输入姓名或公司名" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>类型</Label>
              <select value={form.type} onChange={e => set('type', e.target.value as 'INDIVIDUAL' | 'COMPANY')} className={inputCls}>
                <option value="INDIVIDUAL">个人</option>
                <option value="COMPANY">公司</option>
              </select>
            </div>
            <div>
              <Label>邮箱</Label>
              <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" className={inputCls} />
            </div>
          </div>

          <div>
            <Label>手机号码</Label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 xxx-xxx-xxxx" className={inputCls} />
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <p className="mb-3 text-[12px] font-medium text-[var(--muted)]">默认收货地址（可选）</p>
            <div className="space-y-3">
              <div>
                <Label>收货人</Label>
                <input value={form.recipientName} onChange={e => set('recipientName', e.target.value)} placeholder="与客户名称相同则留空" className={smInputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>国家 / 地区</Label>
                  <select value={form.countryCode} onChange={e => set('countryCode', e.target.value)} className={smInputCls}>
                    <option value="US">United States</option>
                    <option value="CN">China</option>
                    <option value="SG">Singapore</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="JP">Japan</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
                <div>
                  <Label>省 / 州</Label>
                  <input value={form.province} onChange={e => set('province', e.target.value)} placeholder="Province / State" className={smInputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>城市</Label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" className={smInputCls} />
                </div>
                <div>
                  <Label>邮政编码</Label>
                  <input value={form.postalCode} onChange={e => set('postalCode', e.target.value)} placeholder="ZIP / Postal Code" className={smInputCls} />
                </div>
              </div>
              <div>
                <Label>详细地址</Label>
                <input value={form.street1} onChange={e => set('street1', e.target.value)} placeholder="Street address" className={smInputCls} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition">取消</button>
          <button type="button" onClick={handleSubmit} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 transition">创建客户</button>
        </div>
      </div>
    </div>
  );
}

// ─── 客户独立搜索输入框（fixed 定位下拉，不受父容器 overflow 影响）────────────

function CustomerSearchInput({
  onSelect, onCreateNew,
}: {
  onSelect: (c: Customer) => void;
  onCreateNew: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 计算下拉位置（fixed，跟随输入框）
  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  };

  const openDropdown = () => {
    updatePosition();
    setOpen(true);
  };

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // 点在 input 或下拉内部不关闭
      if (wrapRef.current?.contains(target)) return;
      // 下拉是 portal，检查 data-customer-dropdown
      const dropdown = document.querySelector('[data-customer-dropdown]');
      if (dropdown?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 窗口 resize / scroll 时重新定位
  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return mockCustomers;
    const q = query.toLowerCase();
    return mockCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (c: Customer) => {
    onSelect(c);
    setOpen(false);
    setQuery('');
  };

  const handleCreateNew = () => {
    onCreateNew(query.trim());
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); openDropdown(); }}
          onFocus={openDropdown}
          placeholder="搜索或创建客户"
          className={cn(inputCls, 'pl-9')}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setQuery(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && typeof window !== 'undefined' && (
        // Portal：直接挂到 body，用 fixed 定位，完全不受父容器 overflow 影响
        <div
          data-customer-dropdown
          style={dropdownStyle}
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
        >
          {/* 新建客户 */}
          {query.trim() && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleCreateNew(); }}
              className="flex w-full items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-2.5 text-[13px] font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)] transition"
            >
              <Plus className="size-4 shrink-0" />
              创建 &ldquo;{query.trim()}&rdquo; 为新客户
            </button>
          )}

          {/* 客户列表 */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelect(c); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-subtle)] transition"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[12px] font-semibold text-[var(--primary)]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--foreground)]">{c.name}</p>
                      <p className="truncate text-[11px] text-[var(--muted)]">{c.email || c.phone}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--muted-foreground)]">{c.code}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--muted)]">未找到匹配客户</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 客户信息卡片（选中后展示联系信息 + 收货地址 + 可编辑）────────────────────

type ShipAddress = {
  shipToName: string; shipToPhone: string; shipToEmail: string;
  shipToCountry: string; shipToProvince: string; shipToCity: string;
  shipToDistrict: string; shipToStreet: string; shipToStreet2: string;
  shipToPostalCode: string;
};

function CustomerCard({
  customer, addresses, addr, buyerName, buyerEmail, buyerPhone,
  billAddr, billSameAsShip,
  onSelectCustomer, onClearCustomer, onCreateNew,
  onAddrChange, onFillFromSaved, onBuyerChange,
  onBillAddrChange, onBillSameToggle,
}: {
  customer: Customer | null;
  addresses: CustomerAddress[];
  addr: ShipAddress;
  buyerName: string; buyerEmail: string; buyerPhone: string;
  billAddr: ShipAddress;
  billSameAsShip: boolean;
  onSelectCustomer: (c: Customer) => void;
  onClearCustomer: () => void;
  onCreateNew: (name: string) => void;
  onAddrChange: (k: keyof ShipAddress, v: string) => void;
  onFillFromSaved: (a: CustomerAddress) => void;
  onBuyerChange: (field: 'name' | 'email' | 'phone', value: string) => void;
  onBillAddrChange: (k: keyof ShipAddress, v: string) => void;
  onBillSameToggle: (same: boolean) => void;
}) {
  const [editingContact, setEditingContact] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingBillAddr, setEditingBillAddr] = useState(false);
  const [showSavedAddrs, setShowSavedAddrs] = useState(false);

  const hasAddr = !!(addr.shipToStreet || addr.shipToCity || addr.shipToPostalCode);
  const addrLines = hasAddr
    ? [
        addr.shipToName,
        addr.shipToStreet,
        addr.shipToStreet2,
        [addr.shipToCity, addr.shipToProvince, addr.shipToPostalCode].filter(Boolean).join(' '),
        addr.shipToCountry,
      ].filter(Boolean)
    : [];

  return (
    // ⚠️ 不加 overflow-hidden，避免裁掉客户搜索下拉层
    <div className={cn(cardCls)}>
      {/* ── 卡片标题 ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <User className="size-[14px] text-[var(--muted)]" />
          <span className="text-[13px] font-semibold text-[var(--foreground)]">客户</span>
          <span className="text-[14px] leading-none text-[var(--danger)] -mt-px">*</span>
        </div>
        {customer && (
          <button
            type="button"
            onClick={onClearCustomer}
            className="text-[12px] text-[var(--muted)] hover:text-[var(--danger)] transition"
          >
            更换
          </button>
        )}
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {/* ── 未选客户：搜索框，下拉弹出时不被裁剪 ── */}
        {!customer ? (
          <div className="p-3">
            <p className="mb-2 text-[12px] text-[var(--danger)]">请选择或创建客户</p>
            <CustomerSearchInput
              onSelect={onSelectCustomer}
              onCreateNew={onCreateNew}
            />
          </div>
        ) : (
          <>
            {/* ── 客户基本信息 ── */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[13px] font-bold text-[var(--primary)]">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--primary)] cursor-pointer hover:underline">{customer.name}</p>
                  <p className="text-[11px] text-[var(--muted)]">{customer.code}</p>
                </div>
              </div>
            </div>

            {/* ── 联系信息 ── */}
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">联系信息</p>
                <button
                  type="button"
                  onClick={() => setEditingContact(e => !e)}
                  className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                >
                  <Edit3 className="size-3" />{editingContact ? '完成' : '编辑'}
                </button>
              </div>
              {editingContact ? (
                <div className="space-y-2">
                  <div>
                    <Label>姓名</Label>
                    <input value={buyerName} onChange={e => onBuyerChange('name', e.target.value)} className={smInputCls} placeholder="Buyer name" />
                  </div>
                  <div>
                    <Label>邮箱</Label>
                    <input value={buyerEmail} onChange={e => onBuyerChange('email', e.target.value)} type="email" className={smInputCls} placeholder="email@example.com" />
                  </div>
                  <div>
                    <Label>手机</Label>
                    <input value={buyerPhone} onChange={e => onBuyerChange('phone', e.target.value)} className={smInputCls} placeholder="+1 xxx-xxx-xxxx" />
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5 text-[13px]">
                  {buyerEmail
                    ? <p className="text-[var(--foreground)]">{buyerEmail}</p>
                    : <p className="text-[var(--muted)]">未提供电子邮件</p>
                  }
                  {buyerPhone && <p className="text-[var(--foreground)]">{buyerPhone}</p>}
                </div>
              )}
            </div>

            {/* ── 收货地址 ── */}
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">收货地址</p>
                  <span className="text-[14px] leading-none text-[var(--danger)] -mt-px">*</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingAddress(e => !e); setShowSavedAddrs(false); }}
                  className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                >
                  <Edit3 className="size-3" />{editingAddress ? '完成' : '编辑'}
                </button>
              </div>

              {editingAddress && addresses.length > 1 && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setShowSavedAddrs(s => !s)}
                    className="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-[var(--primary)] hover:opacity-80 transition"
                  >
                    <MapPin className="size-3.5" />从已存地址选取
                    <ChevronDown className={cn('size-3 transition-transform', showSavedAddrs && 'rotate-180')} />
                  </button>
                  {showSavedAddrs && (
                    <div className="space-y-1.5 mb-2">
                      {addresses.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { onFillFromSaved(a); setShowSavedAddrs(false); }}
                          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-left text-[12px] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[var(--foreground)]">{a.recipientName}</span>
                            {a.label && <span className="rounded bg-[var(--surface-subtle)] px-1 py-px text-[10px] text-[var(--muted)]">{a.label}</span>}
                            {a.isDefaultShipping && <span className="rounded bg-blue-50 px-1 py-px text-[10px] font-medium text-blue-600">默认</span>}
                          </div>
                          <p className="mt-0.5 text-[var(--muted)] truncate">{a.street1}, {a.city} {a.postalCode}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editingAddress ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label required>收货人</Label>
                      <input value={addr.shipToName} onChange={e => onAddrChange('shipToName', e.target.value)} placeholder="Full name" className={smInputCls} />
                    </div>
                    <div>
                      <Label required>电话</Label>
                      <input value={addr.shipToPhone} onChange={e => onAddrChange('shipToPhone', e.target.value)} placeholder="+1 xxx" className={smInputCls} />
                    </div>
                  </div>
                  <div>
                    <Label required>国家 / 地区</Label>
                    <select value={addr.shipToCountry} onChange={e => onAddrChange('shipToCountry', e.target.value)} className={smInputCls}>
                      <option value="">请选择</option>
                      <option value="US">United States</option>
                      <option value="CN">China</option>
                      <option value="SG">Singapore</option>
                      <option value="GB">United Kingdom</option>
                      <option value="DE">Germany</option>
                      <option value="JP">Japan</option>
                      <option value="AU">Australia</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>省 / 州</Label>
                      <input value={addr.shipToProvince} onChange={e => onAddrChange('shipToProvince', e.target.value)} placeholder="Province" className={smInputCls} />
                    </div>
                    <div>
                      <Label>城市</Label>
                      <input value={addr.shipToCity} onChange={e => onAddrChange('shipToCity', e.target.value)} placeholder="City" className={smInputCls} />
                    </div>
                  </div>
                  <div>
                    <Label required>详细地址</Label>
                    <input value={addr.shipToStreet} onChange={e => onAddrChange('shipToStreet', e.target.value)} placeholder="Street address" className={smInputCls} />
                  </div>
                  <div>
                    <Label>地址补充</Label>
                    <input value={addr.shipToStreet2} onChange={e => onAddrChange('shipToStreet2', e.target.value)} placeholder="Apt, Suite (optional)" className={smInputCls} />
                  </div>
                  <div>
                    <Label required>邮政编码</Label>
                    <input value={addr.shipToPostalCode} onChange={e => onAddrChange('shipToPostalCode', e.target.value)} placeholder="ZIP / Postal Code" className={smInputCls} />
                  </div>
                </div>
              ) : (
                addrLines.length > 0 ? (
                  <div className="space-y-0.5 text-[13px] text-[var(--foreground)]">
                    {addrLines.map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0 text-[var(--danger)]" />
                    <p className="text-[13px] text-[var(--danger)]">收货地址为必填项，请点击编辑填写</p>
                  </div>
                )
              )}
            </div>

            {/* ── 账单地址 ── */}
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">账单地址</p>
                {!billSameAsShip && (
                  <button
                    type="button"
                    onClick={() => setEditingBillAddr(e => !e)}
                    className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                  >
                    <Edit3 className="size-3" />{editingBillAddr ? '完成' : '编辑'}
                  </button>
                )}
              </div>

              {/* 与收货地址相同 切换 */}
              <label className="mb-3 flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={billSameAsShip}
                  onChange={e => {
                    onBillSameToggle(e.target.checked);
                    if (e.target.checked) setEditingBillAddr(false);
                  }}
                  className="size-3.5 accent-[var(--primary)]"
                />
                <span className="text-[13px] text-[var(--foreground)]">与收货地址相同</span>
              </label>

              {!billSameAsShip && (
                editingBillAddr ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>收件人</Label>
                        <input value={billAddr.shipToName} onChange={e => onBillAddrChange('shipToName', e.target.value)} placeholder="Full name" className={smInputCls} />
                      </div>
                      <div>
                        <Label>电话</Label>
                        <input value={billAddr.shipToPhone} onChange={e => onBillAddrChange('shipToPhone', e.target.value)} placeholder="+1 xxx" className={smInputCls} />
                      </div>
                    </div>
                    <div>
                      <Label>国家 / 地区</Label>
                      <select value={billAddr.shipToCountry} onChange={e => onBillAddrChange('shipToCountry', e.target.value)} className={smInputCls}>
                        <option value="">请选择</option>
                        <option value="US">United States</option>
                        <option value="CN">China</option>
                        <option value="SG">Singapore</option>
                        <option value="GB">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="JP">Japan</option>
                        <option value="AU">Australia</option>
                        <option value="CA">Canada</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>省 / 州</Label>
                        <input value={billAddr.shipToProvince} onChange={e => onBillAddrChange('shipToProvince', e.target.value)} placeholder="Province" className={smInputCls} />
                      </div>
                      <div>
                        <Label>城市</Label>
                        <input value={billAddr.shipToCity} onChange={e => onBillAddrChange('shipToCity', e.target.value)} placeholder="City" className={smInputCls} />
                      </div>
                    </div>
                    <div>
                      <Label>详细地址</Label>
                      <input value={billAddr.shipToStreet} onChange={e => onBillAddrChange('shipToStreet', e.target.value)} placeholder="Street address" className={smInputCls} />
                    </div>
                    <div>
                      <Label>地址补充</Label>
                      <input value={billAddr.shipToStreet2} onChange={e => onBillAddrChange('shipToStreet2', e.target.value)} placeholder="Apt, Suite (optional)" className={smInputCls} />
                    </div>
                    <div>
                      <Label>邮政编码</Label>
                      <input value={billAddr.shipToPostalCode} onChange={e => onBillAddrChange('shipToPostalCode', e.target.value)} placeholder="ZIP / Postal Code" className={smInputCls} />
                    </div>
                  </div>
                ) : (
                  /* 收起时显示格式化地址，没填就提示 */
                  (() => {
                    const lines = [
                      billAddr.shipToName,
                      billAddr.shipToStreet,
                      billAddr.shipToStreet2,
                      [billAddr.shipToCity, billAddr.shipToProvince, billAddr.shipToPostalCode].filter(Boolean).join(' '),
                      billAddr.shipToCountry,
                    ].filter(Boolean);
                    return lines.length > 0 ? (
                      <div className="space-y-0.5 text-[13px] text-[var(--foreground)]">
                        {lines.map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                    ) : (
                      <p className="text-[13px] text-[var(--muted)]">尚未填写账单地址</p>
                    );
                  })()
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 收货地址卡片 ─────────────────────────────────────────────────────────────
// ─── 主页面 ──────────────────────────────────────────────────────────────────

/* ─── 商品行附加字段组件（服务/预售/租赁/礼品卡/数字商品）─── */
function ItemExtraFields({
  item,
  updateItem,
}: {
  item: OrderItem;
  updateItem: (key: string, field: keyof OrderItem, value: string | number | boolean) => void;
}) {
  const smCls = 'h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none';
  return (
    <div className="border-t border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2" style={{ minWidth: '660px' }}>
      {item.itemType === 'service' && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="shrink-0 text-[var(--muted-foreground)]">📅 预约日期</span>
          <input type="date" value={item.serviceScheduledDate ?? ''} onChange={e => updateItem(item._key, 'serviceScheduledDate', e.target.value)} className={smCls} />
          <span className="shrink-0 text-[var(--muted-foreground)]">时间窗口</span>
          <input type="text" placeholder="如 14:00–18:00" value={item.serviceTimeWindow ?? ''} onChange={e => updateItem(item._key, 'serviceTimeWindow', e.target.value)} className={`${smCls} w-32`} />
          <span className="text-[10px] text-purple-600">确认后系统生成工单并分配技术人员</span>
        </div>
      )}
      {item.itemType === 'presale' && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="shrink-0 text-[var(--muted-foreground)]">⏳ 预售截止日期 <span className="text-[var(--danger)]">*</span></span>
          <input type="date" value={item.presaleEndDate ?? ''} onChange={e => updateItem(item._key, 'presaleEndDate', e.target.value)} className={smCls} />
          <span className="text-[10px] text-amber-600">截止后才触发履约，未达起售量则退款</span>
        </div>
      )}
      {item.itemType === 'rental' && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="shrink-0 text-[var(--muted-foreground)]">🔑 租赁开始 <span className="text-[var(--danger)]">*</span></span>
          <input type="date" value={item.rentalStartDate ?? ''} onChange={e => updateItem(item._key, 'rentalStartDate', e.target.value)} className={smCls} />
          <span className="shrink-0 text-[var(--muted-foreground)]">结束</span>
          <input type="date" value={item.rentalEndDate ?? ''} onChange={e => updateItem(item._key, 'rentalEndDate', e.target.value)} className={smCls} />
          <span className="shrink-0 text-[var(--muted-foreground)]">押金</span>
          <input type="number" min={0} step={0.01} placeholder="0.00" value={item.rentalDeposit ?? ''} onChange={e => updateItem(item._key, 'rentalDeposit', e.target.value)} className={`${smCls} w-24`} />
          <span className="text-[10px] text-cyan-600">押金支付时预授权，归还确认后释放</span>
        </div>
      )}
      {item.itemType === 'gift_card' && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="shrink-0 text-[var(--muted-foreground)]">🎁 收件人邮箱</span>
          <input type="email" placeholder="recipient@example.com" value={item.giftCardRecipientEmail ?? ''} onChange={e => updateItem(item._key, 'giftCardRecipientEmail', e.target.value)} className={`${smCls} w-52`} />
          <span className="shrink-0 text-[var(--muted-foreground)]">有效期</span>
          <input type="date" value={item.giftCardExpiry ?? ''} onChange={e => updateItem(item._key, 'giftCardExpiry', e.target.value)} className={smCls} />
          <span className="text-[10px] text-pink-600">支付后自动生成卡号 / PIN 发送至收件人</span>
        </div>
      )}
      {item.itemType === 'digital' && (
        <span className="text-[11px] text-green-700">💾 支付确认后自动生成授权码发送至买家邮箱 · 无实体出库 · 不计 COGS</span>
      )}
    </div>
  );
}

export default function NewSalesOrderPage() {
  // 商品行
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);

  // 客户
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [createCustomerPrefill, setCreateCustomerPrefill] = useState<{ name?: string }>({});

  // 买家信息
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // 收货地址
  const [addr, setAddr] = useState<ShipAddress>({
    shipToName: '', shipToPhone: '', shipToEmail: '',
    shipToCountry: '', shipToProvince: '', shipToCity: '',
    shipToDistrict: '', shipToStreet: '', shipToStreet2: '', shipToPostalCode: '',
  });
  const setAddrField = (k: keyof ShipAddress, v: string) => setAddr(a => ({ ...a, [k]: v }));
  const fillFromAddress = (a: CustomerAddress) => {
    setAddr({
      shipToName: a.recipientName, shipToPhone: a.phone, shipToEmail: '',
      shipToCountry: a.countryCode, shipToProvince: a.province, shipToCity: a.city,
      shipToDistrict: a.district, shipToStreet: a.street1, shipToStreet2: a.street2,
      shipToPostalCode: a.postalCode,
    });
  };

  // 账单地址
  const [billSameAsShip, setBillSameAsShip] = useState(true);
  const [billAddr, setBillAddr] = useState<ShipAddress>({
    shipToName: '', shipToPhone: '', shipToEmail: '',
    shipToCountry: '', shipToProvince: '', shipToCity: '',
    shipToDistrict: '', shipToStreet: '', shipToStreet2: '', shipToPostalCode: '',
  });
  const setBillAddrField = (k: keyof ShipAddress, v: string) => setBillAddr(a => ({ ...a, [k]: v }));

  // 右侧配置
  const [channelId, setChannelId] = useState('ch_manual');
  const [currency, setCurrency] = useState('USD');
  const [tags, setTags] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [note, setNote] = useState('');
  const [placedAt, setPlacedAt] = useState(() => {
    // 默认当前本地时间，datetime-local 格式 yyyy-MM-ddTHH:mm
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [shippingAmount, setShippingAmount] = useState(0);
  const [carrierName, setCarrierName] = useState('');
  const [carrierNameCustom, setCarrierNameCustom] = useState('');
  const [shippingService, setShippingService] = useState('');

  // 高级选项
  const [priority, setPriority] = useState('NORMAL');
  const [businessType, setBusinessType] = useState('B2C');
  const [referenceNo, setReferenceNo] = useState('');
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');

  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'normal' | 'paid' | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<'normal' | 'paid' | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 选中渠道时自动设置币种（用户未手改时）
  const [currencyTouched, setCurrencyTouched] = useState(false);

  // 选中客户后带出信息和地址
  const handleSelectCustomer = (c: Customer) => {
    setCustomer(c);
    const addrs = mockAddresses[c.id] ?? [];
    setCustomerAddresses(addrs);
    // 自动填买家信息
    if (!buyerName) setBuyerName(c.name);
    if (!buyerEmail) setBuyerEmail(c.email);
    if (!buyerPhone) setBuyerPhone(c.phone);
    // 自动填默认收货地址
    const def = addrs.find(a => a.isDefaultShipping) ?? addrs[0];
    if (def) fillFromAddress(def);
  };

  const handleClearCustomer = () => {
    setCustomer(null);
    setCustomerAddresses([]);
  };

  const handleCreateNewCustomer = (name: string) => {
    setCreateCustomerPrefill({ name });
    setShowCreateCustomer(true);
  };

  // ─── 表单校验 ────────────────────────────────────────────────────────────

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!customer) errors.push('请选择客户');
    if (items.length === 0) errors.push('至少添加一件商品');
    items.forEach((item, i) => {
      if (!item.sku && !item.productName) errors.push(`第 ${i + 1} 行商品请填写 SKU 或商品名称`);
      if (item.qty < 1) errors.push(`第 ${i + 1} 行商品数量必须 ≥ 1`);
      if (item.unitPrice < 0) errors.push(`第 ${i + 1} 行单价不能为负`);
    });
    if (!addr.shipToName) errors.push('收货人为必填项');
    if (!addr.shipToPhone) errors.push('收货电话为必填项');
    if (!addr.shipToCountry) errors.push('收货国家为必填项');
    if (!addr.shipToStreet) errors.push('详细地址为必填项');
    if (!addr.shipToPostalCode) errors.push('邮政编码为必填项');
    // 行级校验：非实物商品的必填字段
    items.forEach((item, i) => {
      if (item.itemType === 'presale' && !item.presaleEndDate) errors.push(`第 ${i + 1} 行（${item.productName || 'SKU ' + item.sku}）预售商品必须填写截止日期`);
      if (item.itemType === 'rental') {
        if (!item.rentalStartDate) errors.push(`第 ${i + 1} 行（${item.productName || 'SKU ' + item.sku}）租赁商品必须填写租赁开始日期`);
        if (!item.rentalEndDate) errors.push(`第 ${i + 1} 行（${item.productName || 'SKU ' + item.sku}）租赁商品必须填写租赁结束日期`);
      }
    });
    return errors;
  };

  // ─── 提交处理 ────────────────────────────────────────────────────────────

  // 第一步：校验 → 弹确认框
  const handleSubmitClick = (mode: 'normal' | 'paid') => {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidation(true);
      return;
    }
    setPendingMode(mode);
    setConfirmMarkPaid(mode === 'paid'); // paid 模式默认勾选
    setShowConfirm(true);
  };

  // 第二步：用户确认 → 真正提交
  const handleConfirm = async () => {
    if (!pendingMode) return;
    const finalMode: 'normal' | 'paid' = confirmMarkPaid ? 'paid' : 'normal';
    setShowConfirm(false);
    setSubmitMode(finalMode);
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitMode(finalMode);
    setShowSuccess(true);
  };

  const handleCustomerCreated = (c: Customer, addr?: CustomerAddress) => {
    setCustomer(c);
    const addrs = addr ? [addr] : [];
    setCustomerAddresses(addrs);
    setBuyerName(c.name);
    setBuyerEmail(c.email);
    setBuyerPhone(c.phone);
    if (addr) fillFromAddress(addr);
  };

  // ─── 商品行操作 ──────────────────────────────────────────────────────────

  const handleAddFromCatalog = (variants: CatalogVariant[]) => {
    const newItems: OrderItem[] = variants.map(v => ({
      _key: `${v.id}_${Date.now()}_${Math.random()}`,
      masterVariantId: v.id,
      sku: v.sku,
      productName: v.name,
      qty: 1,
      orderedUomCode: v.uomCode ?? '',
      unitPrice: v.basePrice,
      discountAmount: 0,
      taxAmount: 0,
      fromCatalog: true,
      itemType: v.itemType ?? 'physical',
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const addBlankItem = () => {
    setItems(prev => [...prev, {
      _key: `manual_${Date.now()}`,
      masterVariantId: '',
      sku: '',
      productName: '',
      qty: 1,
      orderedUomCode: '',
      unitPrice: 0,
      discountAmount: 0,
      taxAmount: 0,
      fromCatalog: false,
      itemType: 'physical',
    }]);
  };

  const updateItem = (key: string, field: keyof OrderItem, value: string | number | boolean) => {
    setItems(prev => prev.map(i => i._key === key ? { ...i, [field]: value } : i));
  };

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i._key !== key));

  // ─── 标签管理 ────────────────────────────────────────────────────────────

  const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || tagList.includes(trimmed)) return;
    setTags([...tagList, trimmed].join(','));
    setTagInput('');
  };
  const removeTag = (t: string) => setTags(tagList.filter(x => x !== t).join(','));

  // ─── 金额计算 ────────────────────────────────────────────────────────────

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discountAmount, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const total = subtotal - totalDiscount + totalTax + shippingAmount;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  const router = useRouter();

  // ─── 渲染 ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1320px] px-4 pt-5 pb-24 lg:px-6">
      {/* 顶部导航 */}
      <div className="mb-4 flex items-center gap-2 text-[13px]">
        <Link href="/dashboard/orders" className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition">
          <ArrowLeft className="size-3.5" />订单列表
        </Link>
        <ChevronRight className="size-3.5 text-[var(--muted-foreground)]" />
        <span className="text-[var(--foreground)] font-medium">新建销售订单</span>
      </div>

      <h1 className="mb-5 text-[20px] font-bold tracking-tight text-[var(--foreground)]">新建销售订单</h1>

      {/* 双栏布局 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">

        {/* ══════════ 左栏（主内容区） ══════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── 订单基础信息（产品列表上方） ── */}
          <CardSection>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label>销售渠道</Label>
                <select
                  value={channelId}
                  onChange={e => {
                    const newId = e.target.value;
                    setChannelId(newId);
                    if (!currencyTouched) {
                      const ch = mockChannels.find(c => c.id === newId);
                      if (ch?.currency) setCurrency(ch.currency);
                    }
                  }}
                  className={smInputCls}
                >
                  {mockChannels.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>业务类型</Label>
                <select value={businessType} onChange={e => setBusinessType(e.target.value)} className={smInputCls}>
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                </select>
              </div>
              <div>
                <Label>优先级</Label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={smInputCls}>
                  <option value="NORMAL">普通</option>
                  <option value="HIGH">高优先级</option>
                  <option value="URGENT">紧急</option>
                </select>
              </div>
              <div>
                <Label>币种</Label>
                <select
                  value={currency}
                  onChange={e => { setCurrency(e.target.value); setCurrencyTouched(true); }}
                  className={smInputCls}
                >
                  {['USD', 'CNY', 'EUR', 'GBP', 'SGD', 'JPY', 'AUD', 'CAD', 'HKD'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>下单时间</Label>
                <input
                  type="datetime-local"
                  value={placedAt}
                  onChange={e => setPlacedAt(e.target.value)}
                  className={smInputCls}
                />
              </div>
            </div>
          </CardSection>

          {/* ── 商品区 ── */}
          <CardSection className="!p-0 overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-[var(--muted)]" />
                <span className="text-[13px] font-semibold text-[var(--foreground)]">产品</span>
                {items.length > 0 && (
                  <span className="rounded-full bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                    {items.length} 行 · {totalQty} 件
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={addBlankItem}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
                >
                  <Edit3 className="size-3" />添加自定义商品
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-semibold text-white hover:opacity-90 transition"
                >
                  <Plus className="size-3" />添加产品
                </button>
              </div>
            </div>

            {/* 商品列表 */}
            {items.length === 0 ? (
              <div
                className="flex cursor-pointer flex-col items-center justify-center py-14 transition hover:bg-[var(--surface-subtle)]"
                onClick={() => setShowProductModal(true)}
              >
                <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
                  <Package className="size-6 text-[var(--muted-foreground)]" />
                </div>
                <p className="text-[13px] font-medium text-[var(--foreground)]">暂无产品</p>
                <p className="mt-1 text-[12px] text-[var(--muted)]">点击此处或使用上方按钮添加产品</p>
              </div>
            ) : (
              <>
              <div className="overflow-x-auto">
                {/* 表头 */}
                <div className="grid items-center gap-x-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]"
                  style={{ gridTemplateColumns: 'minmax(180px,1fr) 60px 56px 88px 88px 72px 80px 28px', minWidth: '660px' }}>
                  <span>产品</span>
                  <span className="text-center">数量 <span className="text-[var(--danger)]">*</span></span>
                  <span className="text-center">单位</span>
                  <span className="text-right">单价 <span className="text-[var(--danger)]">*</span></span>
                  <span className="text-right">折扣</span>
                  <span className="text-right">税额</span>
                  <span className="text-right">小计</span>
                  <span />
                </div>

                {/* 商品行 */}
                <div className="divide-y divide-[var(--border-subtle)]">
                  {items.map(item => {
                    const lineTotal = item.unitPrice * item.qty - item.discountAmount + item.taxAmount;
                    return (
                      <div key={item._key}>
                        {/* 主行（8列 grid）*/}
                      <div
                        className="grid items-start gap-x-2 px-4 py-3 hover:bg-[var(--surface-subtle)] transition"
                        style={{ gridTemplateColumns: 'minmax(180px,1fr) 60px 56px 88px 88px 72px 80px 28px', minWidth: '660px' }}
                      >
                        {/* 产品信息 */}
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                            <Package className="size-4 text-[var(--muted-foreground)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <input
                              value={item.productName}
                              onChange={e => updateItem(item._key, 'productName', e.target.value)}
                              placeholder="产品名称"
                              className="w-full border-0 bg-transparent p-0 text-[13px] font-medium text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
                            />
                            <input
                              value={item.sku}
                              onChange={e => updateItem(item._key, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="mt-0.5 w-full border-0 bg-transparent p-0 font-mono text-[11px] text-[var(--muted)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
                            />
                            {/* 商品类型标签（来自商品中心，只读） */}
                            {item.itemType && item.itemType !== 'physical' && (() => {
                              const typeMeta: Record<string, { icon: string; label: string; cls: string }> = {
                                service:   { icon: '🔧', label: '服务商品', cls: 'bg-purple-50 border-purple-200 text-purple-700' },
                                presale:   { icon: '⏳', label: '预售商品', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
                                rental:    { icon: '🔑', label: '租赁商品', cls: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
                                gift_card: { icon: '🎁', label: '礼品卡',   cls: 'bg-pink-50 border-pink-200 text-pink-700' },
                                digital:   { icon: '💾', label: '数字商品', cls: 'bg-green-50 border-green-200 text-green-700' },
                              };
                              const m = typeMeta[item.itemType];
                              return m ? (
                                <span className={`mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${m.cls}`}>
                                  <span>{m.icon}</span>{m.label}
                                  {item.fromCatalog && <span className="ml-0.5 opacity-60">· 来自商品中心</span>}
                                </span>
                              ) : null;
                            })()}
                            {!item.fromCatalog && item.sku && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-700">
                                <Info className="size-3 shrink-0" />手填 · 提交时自动建档
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 数量 */}
                        <div className="flex items-start pt-0.5">
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={e => updateItem(item._key, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center text-[13px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                          />
                        </div>

                        {/* 单位 */}
                        <div className="flex items-start pt-0.5">
                          <select
                            value={item.orderedUomCode}
                            onChange={e => updateItem(item._key, 'orderedUomCode', e.target.value)}
                            title="下单单位"
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center text-[12px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                          >
                            <option value="PCS">件</option>
                            <option value="BOX">箱</option>
                            <option value="CTN">纸箱</option>
                            <option value="SET">套</option>
                            <option value="ROLL">卷</option>
                            <option value="BAG">袋</option>
                            <option value="KG">kg</option>
                            <option value="G">g</option>
                            <option value="M">m</option>
                            <option value="PAIR">双</option>
                          </select>
                        </div>

                        {/* 单价 */}
                        <div className="flex items-start pt-0.5">
                          <div className="relative w-full">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)]">{currency}</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unitPrice}
                              onChange={e => updateItem(item._key, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-8 pr-2 py-1.5 text-right text-[13px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                            />
                          </div>
                        </div>

                        {/* 折扣 */}
                        <div className="flex items-start pt-0.5">
                          <div className="relative w-full">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)]">-{currency}</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.discountAmount}
                              onChange={e => updateItem(item._key, 'discountAmount', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-9 pr-2 py-1.5 text-right text-[13px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                            />
                          </div>
                        </div>

                        {/* 税额 */}
                        <div className="flex items-start pt-0.5">
                          <div className="relative w-full">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)]">{currency}</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.taxAmount}
                              onChange={e => updateItem(item._key, 'taxAmount', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-8 pr-2 py-1.5 text-right text-[13px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                            />
                          </div>
                        </div>

                        {/* 小计 */}
                        <div className="flex items-start justify-end pt-2">
                          <span className="text-[13px] font-semibold text-[var(--foreground)]">
                            {currency} {lineTotal.toFixed(2)}
                          </span>
                        </div>

                        {/* 删除 */}
                        <div className="flex items-start justify-center pt-1">
                          <button
                            type="button"
                            onClick={() => removeItem(item._key)}
                            className="flex size-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)] transition"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>{/* end 主行 grid */}

                      {/* 非实物类型附加字段 — 全宽条，紧贴主行下方 */}
                      {item.itemType !== 'physical' && (
                        <ItemExtraFields item={item} updateItem={updateItem} />
                      )}
                      </div>
                    );
                  })}
                </div>
              </div>{/* end overflow-x-auto */}

              {/* 添加更多 */}
              <div className="flex gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="flex items-center gap-1 text-[12px] font-medium text-[var(--primary)] hover:opacity-80 transition"
                >
                  <Plus className="size-3.5" />添加产品
                </button>
                <span className="text-[var(--border)]">·</span>
                <button
                  type="button"
                  onClick={addBlankItem}
                  className="flex items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
                >
                  <Edit3 className="size-3.5" />添加自定义商品
                </button>
              </div>
            </>
            )}
          </CardSection>
          {/* ── 支付汇总（仅有商品时显示） ── */}
          {items.length > 0 && (
          <CardSection>
            <SectionHeader icon={CreditCard} title="支付汇总" />
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">小计</span>
                <span className="font-medium text-[var(--foreground)]">{totalQty} 件商品</span>
                <span className="w-24 text-right font-medium text-[var(--foreground)]">${subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">折扣</span>
                  <span />
                  <span className="w-24 text-right font-medium text-[var(--danger)]">-${totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">运费</span>
                <span />
                <div className="w-24">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={shippingAmount}
                      onChange={e => setShippingAmount(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-5 pr-2 py-1 text-right text-[13px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                    />
                  </div>
                </div>
              </div>
              {totalTax > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">税额</span>
                  <span />
                  <span className="w-24 text-right text-[var(--foreground)]">${totalTax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
                <span className="font-semibold text-[var(--foreground)]">总计</span>
                <span />
                <span className="w-24 text-right text-[15px] font-bold text-[var(--foreground)]">
                  ${total.toFixed(2)} <span className="text-[11px] font-normal text-[var(--muted)]">{currency}</span>
                </span>
              </div>
            </div>
          </CardSection>
          )}

        </div>

        {/* ══════════ 右栏（配置区） ══════════ */}
        <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 space-y-4">

          {/* ── 客户 ── */}
          <CustomerCard
            customer={customer}
            addresses={customerAddresses}
            addr={addr}
            buyerName={buyerName}
            buyerEmail={buyerEmail}
            buyerPhone={buyerPhone}
            billAddr={billAddr}
            billSameAsShip={billSameAsShip}
            onSelectCustomer={handleSelectCustomer}
            onClearCustomer={handleClearCustomer}
            onCreateNew={handleCreateNewCustomer}
            onAddrChange={setAddrField}
            onFillFromSaved={fillFromAddress}
            onBuyerChange={(field, value) => {
              if (field === 'name') setBuyerName(value);
              if (field === 'email') setBuyerEmail(value);
              if (field === 'phone') setBuyerPhone(value);
            }}
            onBillAddrChange={setBillAddrField}
            onBillSameToggle={setBillSameAsShip}
          />

          {/* ── 物流信息 ── */}
          <CardSection>
            <SectionHeader icon={Truck} title="物流信息" />
            <div className="space-y-3">
              <div>
                <Label>承运商</Label>
                <select value={carrierName} onChange={e => setCarrierName(e.target.value)} className={smInputCls}>
                  <option value="">请选择承运商</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="USPS">USPS</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="DHL eCommerce">DHL eCommerce</option>
                  <option value="Royal Mail">Royal Mail</option>
                  <option value="Ninja Van">Ninja Van</option>
                  <option value="SF Express">顺丰速运</option>
                  <option value="YTO">圆通速递</option>
                  <option value="Other">其他</option>
                </select>
              </div>
              {carrierName === 'Other' && (
                <div>
                  <Label>承运商名称</Label>
                  <input
                    value={carrierNameCustom}
                    onChange={e => setCarrierNameCustom(e.target.value)}
                    placeholder="请输入承运商名称"
                    className={smInputCls}
                  />
                </div>
              )}
              <div>
                <Label>服务方式</Label>
                <select value={shippingService} onChange={e => setShippingService(e.target.value)} className={smInputCls}>
                  <option value="">请选择</option>
                  <option value="Standard">标准配送</option>
                  <option value="Express">加急配送</option>
                  <option value="Overnight">次日达</option>
                  <option value="2Day">两日达</option>
                  <option value="Economy">经济配送</option>
                  <option value="Freight">整车 / 零担</option>
                  <option value="Pickup">上门自提</option>
                </select>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">承运商信息将参与后续分仓规则匹配。</p>
            </div>
          </CardSection>

          {/* ── 其他信息 ── */}
          <CardSection>
            <SectionHeader icon={Settings2} title="其他信息" />
            <div className="space-y-3">
              <div>
                <Label>参考号</Label>
                <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Reference No." className={smInputCls} />
              </div>
              <div>
                <Label>采购单号</Label>
                <input value={purchaseOrderNo} onChange={e => setPurchaseOrderNo(e.target.value)} placeholder="PO Number (B2B)" className={smInputCls} />
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <Label>标签</Label>
                {tagList.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {tagList.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-0.5 text-[12px] text-[var(--foreground)]">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="text-[var(--muted)] hover:text-[var(--danger)] transition">
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="输入标签，回车添加"
                    className={cn(smInputCls, 'flex-1')}
                  />
                  <button
                    type="button"
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                    className="h-8 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-2 text-[12px] text-[var(--muted)] hover:bg-[var(--surface-hover)] disabled:opacity-40 transition"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <Label>备注</Label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="添加订单备注（客户可见）"
                  rows={3}
                  className={cn(smInputCls, 'resize-none')}
                />
              </div>
            </div>
          </CardSection>

        </div>
      </div>

      {/* ══════════ 固定底部操作栏 ══════════ */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          {/* 左侧汇总 */}
          <div className="hidden items-center gap-3 text-[12px] text-[var(--muted)] sm:flex">
            {items.length === 0 ? (
              <span>尚未添加产品</span>
            ) : (
              <>
                <span className="font-medium text-[var(--foreground)]">{items.length} 行</span>
                <span className="text-[var(--border)]">·</span>
                <span>{totalQty} 件</span>
                <span className="text-[var(--border)]">·</span>
                <span className="font-semibold text-[var(--foreground)]">
                  ${total.toFixed(2)} <span className="font-normal text-[var(--muted)]">{currency}</span>
                </span>
              </>
            )}
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2 ml-auto">
            <Link
              href="/dashboard/orders"
              className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              取消
            </Link>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitClick('paid')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-5 text-[13px] font-semibold text-[var(--surface)] hover:opacity-85 disabled:opacity-50 transition"
            >
              {submitting && submitMode === 'paid'
                ? <><Loader2 className="size-3.5 animate-spin" />处理中...</>
                : '标记为已付款'
              }
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitClick('normal')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {submitting && submitMode === 'normal'
                ? <><Loader2 className="size-3.5 animate-spin" />提交中...</>
                : '提交订单'
              }
            </button>
          </div>
        </div>
      </div>

      {/* 校验错误弹窗 */}
      {showValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setShowValidation(false)}>
          <div className="mx-4 w-full max-w-[400px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-red-50 px-5 py-4">
              <AlertCircle className="size-5 shrink-0 text-[var(--danger)]" />
              <h3 className="text-[14px] font-semibold text-[var(--danger)]">请修正以下问题</h3>
            </div>
            <ul className="space-y-2 px-5 py-4">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--danger)]" />
                  {err}
                </li>
              ))}
            </ul>
            <div className="flex justify-end border-t border-[var(--border-subtle)] px-5 py-3">
              <button
                type="button"
                onClick={() => setShowValidation(false)}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 transition"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提交确认弹窗 */}
      {showConfirm && pendingMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setShowConfirm(false)}>
          <div className="mx-4 w-full max-w-[420px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 弹窗标题 */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">创建订单</h3>
              <button type="button" onClick={() => setShowConfirm(false)} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)] transition">
                <X className="size-4" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-5 py-5 space-y-4">
              {/* 订单摘要 */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">订单金额</span>
                  <span className="font-semibold text-[var(--foreground)]">{currency} {total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">商品</span>
                  <span className="text-[var(--foreground)]">{items.length} 行 · {totalQty} 件</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">付款状态</span>
                  {confirmMarkPaid
                    ? <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">已付款</span>
                    : <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">待支付</span>
                  }
                </div>
              </div>

              {/* 标记为已付款勾选 */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3.5 transition hover:bg-[var(--surface-subtle)] select-none"
                style={{ borderColor: confirmMarkPaid ? 'var(--primary)' : undefined, background: confirmMarkPaid ? 'var(--primary-soft)' : undefined }}>
                <input
                  type="checkbox"
                  checked={confirmMarkPaid}
                  onChange={e => setConfirmMarkPaid(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--primary)] shrink-0"
                />
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">标记为已付款</p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)] leading-relaxed">
                    如果您已通过其他方式收到{' '}
                    <span className="font-medium text-[var(--foreground)]">{currency} {total.toFixed(2)}</span>，
                    勾选此项将自动补记一笔等额收款流水。
                  </p>
                </div>
              </label>
            </div>

            {/* 弹窗操作 */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="h-9 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="h-9 rounded-lg bg-[var(--foreground)] px-5 text-[13px] font-semibold text-[var(--surface)] hover:opacity-85 transition"
              >
                创建订单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提交成功提示 */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="mx-4 w-full max-w-[360px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl text-center px-8 py-8">
            <div className="mb-4 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
            </div>
            <h3 className="mb-1.5 text-[16px] font-bold text-[var(--foreground)]">
              {submitMode === 'paid' ? '订单已创建并标记为已付款' : '订单提交成功'}
            </h3>
            <p className="mb-6 text-[13px] text-[var(--muted)]">正在跳转到订单详情页...</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => { setShowSuccess(false); router.push('/dashboard/orders'); }}
                className="h-9 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
              >
                返回列表
              </button>
              <button
                type="button"
                onClick={() => { setShowSuccess(false); router.push('/dashboard/orders'); }}
                className="h-9 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 transition"
              >
                查看订单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 */}
      <ProductSearchModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        onConfirm={handleAddFromCatalog}
        existingSkus={items.map(i => i.sku)}
      />
      <CreateCustomerModal
        open={showCreateCustomer}
        onClose={() => setShowCreateCustomer(false)}
        onCreated={handleCustomerCreated}
        prefill={createCustomerPrefill}
      />
    </div>
  );
}
