'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Plus, Package, Search, X,
  ChevronDown, ChevronRight, AlertCircle,
  Edit3, Settings2, Truck, Info, Loader2,
  CheckCircle2, Building2, Warehouse, FileText,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 样式常量 ────────────────────────────────────────────────────────────────

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

type InboundItem = {
  _key: string;
  sku: string;
  productName: string;
  qty: number;
  uom: string;
  unitPrice: number;
  taxRate: number;        // 税率 %，如 13
  cartonQty: number;      // 箱数
  expectedPalletQty: number;
  lotNo: string;
  snList: string;
  poLineNo: string;
  weight: number;         // 预计重量 kg
  goodQty: number;        // 良品数
  defectQty: number;      // 次品数量
};

type Supplier = {
  id: string;
  name: string;
  code: string;
  country: string;
};

type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  uomCode?: string;
  basePrice?: number;
};

// ─── Mock 数据 ────────────────────────────────────────────────────────────────

const mockSuppliers: Supplier[] = [
  { id: 'sup_001', name: 'Shenzhen Tech Co., Ltd.', code: 'SUP-SZ-001', country: 'CN' },
  { id: 'sup_002', name: 'Global Parts Inc.', code: 'SUP-US-002', country: 'US' },
  { id: 'sup_003', name: 'Asia Pacific Trading', code: 'SUP-SG-003', country: 'SG' },
  { id: 'sup_004', name: '广州众兴电子有限公司', code: 'SUP-GZ-004', country: 'CN' },
  { id: 'sup_005', name: 'Euro Components GmbH', code: 'SUP-DE-005', country: 'DE' },
];

const productCatalog: CatalogProduct[] = [
  { id: 'SKU-0001', sku: 'SKU-0001', name: 'Smart Watch Band', barcode: '6901234567890', uomCode: 'PCS', basePrice: 12.99 },
  { id: 'SKU-0002', sku: 'SKU-0002', name: 'Screen Protector', barcode: '6901234567891', uomCode: 'PCS', basePrice: 8.99 },
  { id: 'SKU-0003', sku: 'SKU-0003', name: 'Charging Dock', barcode: '6901234567892', uomCode: 'PCS', basePrice: 29.99 },
  { id: 'SKU-0004', sku: 'SKU-0004', name: 'Mechanical Keyboard', barcode: '6901234567893', uomCode: 'PCS', basePrice: 89.99 },
  { id: 'SKU-0005', sku: 'SKU-0005', name: 'Webcam 4K', barcode: '6901234567894', uomCode: 'PCS', basePrice: 59.99 },
  { id: 'SKU-0006', sku: 'SKU-0006', name: 'Ring Light Mini', barcode: '6901234567895', uomCode: 'PCS', basePrice: 24.99 },
  { id: 'SKU-0007', sku: 'SKU-0007', name: 'Phone Case', barcode: '6901234567896', uomCode: 'PCS', basePrice: 15.99 },
  { id: 'SKU-0008', sku: 'SKU-0008', name: 'Tempered Glass', barcode: '6901234567897', uomCode: 'PCS', basePrice: 9.99 },
  { id: 'SKU-0009', sku: 'SKU-0009', name: 'USB-C Cable', barcode: '6901234567898', uomCode: 'PCS', basePrice: 7.99 },
  { id: 'SKU-0010', sku: 'SKU-0010', name: 'Bluetooth Speaker', barcode: '6901234567899', uomCode: 'PCS', basePrice: 45.99 },
  { id: 'SKU-0011', sku: 'SKU-0011', name: 'Wireless Earbuds', barcode: '6901234567900', uomCode: 'PCS', basePrice: 79.99 },
  { id: 'SKU-0012', sku: 'SKU-0012', name: 'Wireless Charger', barcode: '6901234567901', uomCode: 'PCS', basePrice: 19.99 },
  { id: 'SKU-0013', sku: 'SKU-0013', name: 'USB-C Hub', barcode: '6901234567902', uomCode: 'PCS', basePrice: 34.99 },
  { id: 'SKU-0014', sku: 'SKU-0014', name: 'Laptop Stand', barcode: '6901234567903', uomCode: 'PCS', basePrice: 49.99 },
  { id: 'SKU-0015', sku: 'SKU-0015', name: 'LED Ring Light', barcode: '6901234567904', uomCode: 'PCS', basePrice: 29.99 },
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

function SectionHeader({
  icon: Icon, title, action,
}: {
  icon?: React.ElementType; title: string; action?: React.ReactNode;
}) {
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
  return <div className={cn(cardCls, 'p-4', className)}>{children}</div>;
}

// ─── 折叠面板 ─────────────────────────────────────────────────────────────────

function CollapsibleSection({
  icon: Icon, title, badge, defaultOpen = false, children,
}: {
  icon?: React.ElementType; title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn(cardCls, 'overflow-hidden')}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--surface-subtle)]"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-[14px] text-[var(--muted)]" />}
          <span className="text-[13px] font-semibold text-[var(--foreground)]">{title}</span>
          {badge && (
            <span className="rounded-full bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={cn('size-4 text-[var(--muted)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-[var(--border-subtle)] p-4">{children}</div>}
    </div>
  );
}

// ─── 供应商搜索输入框（fixed 定位下拉，不受父容器 overflow 影响）──────────────

function SupplierSearchInput({
  value, onChange, onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: Supplier) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
  };

  const openDropdown = () => { updatePosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      const dd = document.querySelector('[data-supplier-dropdown]');
      if (dd?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open]);

  const filtered = useMemo(() => {
    if (!value.trim()) return mockSuppliers;
    const q = value.toLowerCase();
    return mockSuppliers.filter(s =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [value]);

  const handleSelect = (s: Supplier) => { onSelect(s); setOpen(false); };

  return (
    <div ref={wrapRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
        <input
          ref={inputRef}
          value={value}
          onChange={e => { onChange(e.target.value); openDropdown(); }}
          onFocus={openDropdown}
          placeholder="搜索供应商名称或编码"
          className={cn(smInputCls, 'pl-9')}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && typeof window !== 'undefined' && (
        <div
          data-supplier-dropdown
          style={dropdownStyle}
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
        >
          <div className="max-h-52 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {filtered.length > 0 ? filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-subtle)] transition"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[12px] font-semibold text-[var(--primary)]">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[var(--foreground)]">{s.name}</p>
                  <p className="text-[11px] text-[var(--muted)]">{s.code} · {s.country}</p>
                </div>
              </button>
            )) : (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--muted)]">未找到匹配供应商</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 商品搜索弹窗 ─────────────────────────────────────────────────────────────

function ProductSearchModal({
  open, onClose, onConfirm, existingSkus,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (products: CatalogProduct[]) => void;
  existingSkus: string[];
}) {
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) { setSearchInput(''); setSelected(new Set()); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [open]);

  const searchTerms = useMemo(() =>
    searchInput.split(/[\n,，\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean),
    [searchInput]
  );

  const filtered = useMemo(() => {
    if (searchTerms.length === 0) return productCatalog;
    return productCatalog.filter(p =>
      searchTerms.some(t =>
        p.sku.toLowerCase().includes(t) ||
        p.name.toLowerCase().includes(t) ||
        p.barcode.includes(t)
      )
    );
  }, [searchTerms]);

  const alreadyAdded = (sku: string) => existingSkus.includes(sku);
  const toggle = (id: string) => {
    if (alreadyAdded(id)) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const available = filtered.filter(p => !alreadyAdded(p.id));
  const allChecked = available.length > 0 && available.every(p => selected.has(p.id));
  const toggleAll = () => allChecked
    ? setSelected(prev => { const n = new Set(prev); available.forEach(p => n.delete(p.id)); return n; })
    : setSelected(prev => { const n = new Set(prev); available.forEach(p => n.add(p.id)); return n; });

  const handleConfirm = () => {
    onConfirm(productCatalog.filter(p => selected.has(p.id)));
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
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)]">选择商品</h3>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">支持批量粘贴 SKU / 商品名 / 条码</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)] transition">
            <X className="size-4" />
          </button>
        </div>

        {/* 搜索 */}
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="flex items-start gap-2">
            <Search className="mt-2.5 size-4 shrink-0 text-[var(--muted)]" />
            <textarea
              ref={inputRef}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="输入 SKU、商品名或条码，多个用换行或逗号分隔..."
              rows={2}
              className={cn(inputCls, 'resize-none')}
            />
          </div>
        </div>

        {/* 列表表头 */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="size-3.5 accent-[var(--primary)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">全选</span>
          </label>
          <span className="text-[12px] text-[var(--muted)]">
            {filtered.length} 个商品{selected.size > 0 ? ` · 已选 ${selected.size}` : ''}
          </span>
        </div>

        {/* 产品列表 */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Package className="size-8 text-[var(--border)]" />
              <p className="text-[13px] text-[var(--muted)]">未找到匹配商品</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(p => {
                const added = alreadyAdded(p.id);
                const checked = selected.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-5 py-2.5 transition-colors select-none',
                      added ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--surface-subtle)]',
                      checked && !added && 'bg-[var(--primary-soft)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                      disabled={added}
                      className="size-3.5 accent-[var(--primary)]"
                    />
                    <div className="size-9 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)] flex items-center justify-center">
                      <Package className="size-4 text-[var(--muted-foreground)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{p.name}</span>
                        {added && <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">已添加</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-[var(--muted)]">{p.sku}</span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">·</span>
                        <span className="text-[11px] text-[var(--muted)]">{p.barcode}</span>
                      </div>
                    </div>
                    {p.basePrice != null && (
                      <span className="text-[13px] font-medium text-[var(--foreground)]">${p.basePrice.toFixed(2)}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">
            {selected.size > 0 ? `已选 ${selected.size} 个商品` : `共 ${filtered.length} 个商品`}
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

// ─── 主页面 ──────────────────────────────────────────────────────────────────

export default function NewInboundPage() {
  const router = useRouter();

  // ── 头部核心字段 ──
  const [receiptType, setReceiptType] = useState('采购入库');
  const [customerId, setCustomerId] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [source, setSource] = useState('采购单');
  const [poNo, setPoNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [rmaNo, setRmaNo] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState<number | ''>('');

  // ── 供应商 ──
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplier, setSupplier] = useState<Supplier | null>(null);

  // ── 到货信息 ──
  const [shippingMethod, setShippingMethod] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [carrierScac, setCarrierScac] = useState('');
  const [carrierCustom, setCarrierCustom] = useState('');
  const [eta, setEta] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentNo, setAppointmentNo] = useState('');
  const [totalPalletQty, setTotalPalletQty] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [bolNo, setBolNo] = useState('');
  const [mbolNo, setMbolNo] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [containerSize, setContainerSize] = useState('');
  const [trailerNo, setTrailerNo] = useState('');
  const [sealNo, setSealNo] = useState('');
  const [vesselNo, setVesselNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  // ── 收货要求 ──
  const [isRush, setIsRush] = useState(false);
  const [isTransload, setIsTransload] = useState(false);
  const [requireCollectCartonId, setRequireCollectCartonId] = useState(false);
  const [autoPush, setAutoPush] = useState(true);
  const [qcMode, setQcMode] = useState('');
  const [note, setNote] = useState('');
  const [shippingInstruction, setShippingInstruction] = useState('');

  // ── 商品明细 ──
  const [items, setItems] = useState<InboundItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);

  // ── 提交状态 ──
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // ─── 仓库地址映射 ─────────────────────────────────────────────────────────

  const warehouseMap: Record<string, { name: string; address1: string; address2: string; city: string; state: string; zip: string; country: string }> = {
    'US-West-LAX': { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', address2: 'Building C, Dock 5', city: 'Los Angeles', state: 'CA', zip: '90015', country: 'US' },
    'US-East-EWR': { name: 'EWR Distribution Hub', address1: '500 Logistics Way', address2: 'Suite 200', city: 'Newark', state: 'NJ', zip: '07114', country: 'US' },
    'US-Central-DFW': { name: 'DFW Central Warehouse', address1: '8800 Commerce Dr', address2: '', city: 'Dallas', state: 'TX', zip: '75001', country: 'US' },
    'US-West-SEA': { name: 'SEA Pacific Center', address1: '2100 Harbor Ave', address2: 'Unit 12', city: 'Seattle', state: 'WA', zip: '98101', country: 'US' },
    'SG-Central': { name: 'SG Logistics Hub', address1: '10 Changi South Lane', address2: '#03-01', city: 'Singapore', state: '', zip: '486162', country: 'SG' },
    'UK-London': { name: 'London DC', address1: '45 Warehouse Road', address2: '', city: 'London', state: '', zip: 'EC2A 1NT', country: 'UK' },
  };
  const selectedWarehouse = warehouse ? warehouseMap[warehouse] : null;

  // ─── 商品行操作 ───────────────────────────────────────────────────────────

  const addBlankItem = () => {
    setItems(prev => [...prev, {
      _key: `manual_${Date.now()}`,
      sku: '', productName: '', qty: 1, uom: 'PCS',
      unitPrice: 0, taxRate: 0, cartonQty: 0,
      expectedPalletQty: 0, lotNo: '', snList: '',
      poLineNo: '', weight: 0,
      goodQty: 0, defectQty: 0,
    }]);
  };

  const handleAddFromCatalog = (products: CatalogProduct[]) => {
    const newItems: InboundItem[] = products.map(p => ({
      _key: `${p.id}_${Date.now()}_${Math.random()}`,
      sku: p.sku,
      productName: p.name,
      qty: 1,
      uom: p.uomCode ?? 'PCS',
      unitPrice: p.basePrice ?? 0,
      taxRate: 0,
      cartonQty: 0,
      expectedPalletQty: 0,
      lotNo: '',
      snList: '',
      poLineNo: '',
      weight: 0,
      goodQty: 0,
      defectQty: 0,
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const updateItem = (key: string, field: keyof InboundItem, value: string | number) => {
    setItems(prev => prev.map(i => i._key === key ? { ...i, [field]: value } : i));
  };

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i._key !== key));

  const handleSelectSupplier = (s: Supplier) => {
    setSupplier(s);
    setSupplierSearch(s.name);
  };

  // ─── 金额计算 ────────────────────────────────────────────────────────────

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const totalTax = items.reduce((s, i) => s + (i.unitPrice * i.qty * i.taxRate) / 100, 0);
  const total = subtotal + totalTax;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalCartons = items.reduce((s, i) => s + i.cartonQty, 0);
  const totalPallets = items.reduce((s, i) => s + i.expectedPalletQty, 0);
  const totalGoodQty = items.reduce((s, i) => s + i.goodQty, 0);
  const totalDefectQty = items.reduce((s, i) => s + i.defectQty, 0);

  // ─── 校验 ─────────────────────────────────────────────────────────────────

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!customerId) errors.push('请选择客户');
    if (!warehouse) errors.push('请选择收货仓库');
    if (items.length === 0) errors.push('至少添加一行商品');
    items.forEach((item, i) => {
      if (!item.sku && !item.productName) errors.push(`第 ${i + 1} 行商品请填写 SKU 或商品名称`);
      if (item.qty < 1) errors.push(`第 ${i + 1} 行数量必须 ≥ 1`);
    });
    return errors;
  };

  const handleSubmitClick = () => {
    const errors = validate();
    if (errors.length > 0) { setValidationErrors(errors); setShowValidation(true); return; }
    handleConfirm();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setShowSuccess(true);
  };

  // ─── badge helpers ────────────────────────────────────────────────────────

  const arrivalBadge = [shippingMethod, carrierId, eta, appointmentTime, bolNo, containerNo, trailerNo, trackingNo].filter(Boolean).length;
  const requireBadge = [isRush && '加急', isTransload && '转运', requireCollectCartonId && '采集箱号', !autoPush && '手动推送', qcMode, note, shippingInstruction].filter(Boolean).length;

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1320px] px-4 pt-5 pb-24 lg:px-6">
      {/* 顶部导航 */}
      <div className="mb-4 flex items-center gap-2 text-[13px]">
        <Link href="/dashboard/inbound" className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition">
          <ArrowLeft className="size-3.5" />入库单列表
        </Link>
        <ChevronRight className="size-3.5 text-[var(--muted-foreground)]" />
        <span className="text-[var(--foreground)] font-medium">新建入库单</span>
      </div>

      <h1 className="mb-5 text-[20px] font-bold tracking-tight text-[var(--foreground)]">新建入库单</h1>

      {/* ══════════ 双栏布局 ══════════ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">

        {/* ════ 左栏（主内容区） ════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── 基础信息卡片 ── */}
          <CardSection>
            <SectionHeader icon={FileText} title="基础信息" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label required>入库类型</Label>
                <select value={receiptType} onChange={e => setReceiptType(e.target.value)} className={smInputCls}>
                  <option>采购入库</option>
                  <option>退货入库</option>
                  <option>调拨入库</option>
                  <option>转运入库</option>
                </select>
              </div>
              <div>
                <Label required>客户</Label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={smInputCls}>
                  <option value="">选择客户</option>
                  <option value="cust_us">US Store</option>
                  <option value="cust_sg">SG Store</option>
                  <option value="cust_uk">UK Store</option>
                </select>
              </div>
              <div>
                <Label required>收货仓库</Label>
                <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className={smInputCls}>
                  <option value="">选择仓库</option>
                  <option>US-West-LAX</option>
                  <option>US-East-EWR</option>
                  <option>US-Central-DFW</option>
                  <option>US-West-SEA</option>
                  <option>SG-Central</option>
                  <option>UK-London</option>
                </select>
              </div>
              <div>
                <Label>来源</Label>
                <select value={source} onChange={e => setSource(e.target.value)} className={smInputCls}>
                  <option>采购单</option>
                  <option>退货单</option>
                  <option>调拨单</option>
                  <option>API</option>
                  <option>手动</option>
                </select>
              </div>
              <div>
                <Label>币种</Label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className={smInputCls}>
                  {['USD', 'CNY', 'EUR', 'GBP', 'SGD', 'JPY', 'AUD', 'CAD', 'HKD'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>汇率</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)]">1 USD =</span>
                  <input
                    type="number"
                    min={0}
                    step={0.0001}
                    value={exchangeRate}
                    onChange={e => setExchangeRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="自动"
                    className={cn(smInputCls, 'pl-[62px] text-right')}
                  />
                </div>
              </div>
              <div>
                <Label>客户 PO 号</Label>
                <input value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="采购单号" className={smInputCls} />
              </div>
              <div>
                <Label>客户参考号</Label>
                <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Ref / SO" className={smInputCls} />
              </div>
              {receiptType === '退货入库' && (
                <div>
                  <Label>RMA 号</Label>
                  <input value={rmaNo} onChange={e => setRmaNo(e.target.value)} placeholder="RMA 号" className={smInputCls} />
                </div>
              )}
            </div>
          </CardSection>

          {/* ── 收货地址（选仓后自动填充） ── */}
          {selectedWarehouse && (
            <CardSection>
              <SectionHeader icon={Warehouse} title="收货地址">
              </SectionHeader>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-inset ring-[var(--border)]">{warehouse}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <Label>收货方</Label>
                  <input value={selectedWarehouse.name} readOnly className={cn(smInputCls, 'bg-[var(--surface-subtle)] cursor-default')} />
                </div>
                <div>
                  <Label>国家</Label>
                  <input value={selectedWarehouse.country} readOnly className={cn(smInputCls, 'bg-[var(--surface-subtle)] cursor-default')} />
                </div>
                <div>
                  <Label>州 / 省</Label>
                  <input value={selectedWarehouse.state || '—'} readOnly className={cn(smInputCls, 'bg-[var(--surface-subtle)] cursor-default')} />
                </div>
                <div>
                  <Label>城市</Label>
                  <input value={selectedWarehouse.city} readOnly className={cn(smInputCls, 'bg-[var(--surface-subtle)] cursor-default')} />
                </div>
                <div className="sm:col-span-2">
                  <Label>地址 1</Label>
                  <input value={selectedWarehouse.address1} readOnly className={cn(smInputCls, 'bg-[var(--surface-subtle)] cursor-default')} />
                </div>
                {selectedWarehouse.address2 && (
                  <div>
                    <Label>地址 2</Label>
                    <input value={selectedWarehouse.address2} readOnly className={cn(smInputCls, 'bg-[var(--surface-subtle)] cursor-default')} />
                  </div>
                )}
                <div>
                  <Label>邮编</Label>
                  <input value={selectedWarehouse.zip} readOnly className={cn(smInputCls, 'bg-[var(--surface-subtle)] cursor-default')} />
                </div>
              </div>
            </CardSection>
          )}

          {/* ── 到货信息 ── */}
          <CollapsibleSection
            icon={Truck}
            title="到货信息"
            badge={arrivalBadge > 0 ? `已填 ${arrivalBadge} 项` : undefined}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div>
                <Label>运输方式</Label>
                <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} className={smInputCls}>
                  <option value="">请选择</option>
                  <option value="TL">整车 (TL)</option>
                  <option value="LTL">零担 (LTL)</option>
                  <option value="SP">小包裹 (SP)</option>
                  <option value="AIR">空运</option>
                  <option value="SEA">海运</option>
                  <option value="WILL_CALL">自提</option>
                </select>
              </div>
              <div>
                <Label>承运商</Label>
                <select
                  value={carrierId}
                  onChange={e => {
                    const v = e.target.value;
                    setCarrierId(v);
                    const scacMap: Record<string, string> = { FedEx: 'FEDX', UPS: 'UPSN', USPS: 'USPS', 'DHL Express': 'DHLX', 'FedEx Freight': 'FXFE', 'XPO Logistics': 'CNWY', 'COSCO Shipping': 'COSU' };
                    setCarrierScac(scacMap[v] ?? '');
                  }}
                  className={smInputCls}
                >
                  <option value="">选择承运商</option>
                  <option>FedEx</option><option>UPS</option><option>USPS</option>
                  <option>DHL Express</option><option>FedEx Freight</option>
                  <option>XPO Logistics</option><option>COSCO Shipping</option>
                  <option value="__custom">自定义...</option>
                </select>
                {carrierId === '__custom' && (
                  <input value={carrierCustom} onChange={e => setCarrierCustom(e.target.value)} placeholder="承运商名称" className={cn(smInputCls, 'mt-1')} />
                )}
                {carrierScac && (
                  <p className="mt-1 text-[10px] text-[var(--muted)]">SCAC: <span className="font-mono font-medium text-[var(--foreground)]">{carrierScac}</span></p>
                )}
              </div>
              <div>
                <Label>预计到货 (ETA)</Label>
                <input type="datetime-local" value={eta} onChange={e => setEta(e.target.value)} className={smInputCls} />
              </div>
              <div>
                <Label>预约卸货时间</Label>
                <input type="datetime-local" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} className={smInputCls} />
              </div>
              <div>
                <Label>仓库预约号</Label>
                <input value={appointmentNo} onChange={e => setAppointmentNo(e.target.value)} placeholder="Appointment No." className={smInputCls} />
              </div>
              <div>
                <Label>预计托盘数</Label>
                <input type="number" min={0} value={totalPalletQty} onChange={e => setTotalPalletQty(e.target.value)} placeholder="0" className={smInputCls} />
              </div>
              <div>
                <Label>追踪号</Label>
                <input value={trackingNo} onChange={e => setTrackingNo(e.target.value)} placeholder="Tracking No." className={smInputCls} />
              </div>
              <div>
                <Label>提单号 (BOL)</Label>
                <input value={bolNo} onChange={e => setBolNo(e.target.value)} placeholder="BOL" className={smInputCls} />
              </div>
              <div>
                <Label>主提单号 (MBOL)</Label>
                <input value={mbolNo} onChange={e => setMbolNo(e.target.value)} placeholder="MBOL" className={smInputCls} />
              </div>
              <div>
                <Label>集装箱号</Label>
                <input value={containerNo} onChange={e => setContainerNo(e.target.value)} placeholder="Container" className={smInputCls} />
              </div>
              <div>
                <Label>集装箱尺寸</Label>
                <select value={containerSize} onChange={e => setContainerSize(e.target.value)} className={smInputCls}>
                  <option value="">N/A</option><option>20GP</option><option>40GP</option><option>40HQ</option><option>45HQ</option>
                </select>
              </div>
              <div>
                <Label>拖车号</Label>
                <input value={trailerNo} onChange={e => setTrailerNo(e.target.value)} placeholder="Trailer" className={smInputCls} />
              </div>
              <div>
                <Label>封条号</Label>
                <input value={sealNo} onChange={e => setSealNo(e.target.value)} placeholder="Seal" className={smInputCls} />
              </div>
              <div>
                <Label>船号</Label>
                <input value={vesselNo} onChange={e => setVesselNo(e.target.value)} placeholder="Vessel" className={smInputCls} />
              </div>
              <div>
                <Label>司机姓名</Label>
                <input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver name" className={smInputCls} />
              </div>
              <div>
                <Label>司机电话</Label>
                <input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="+1 xxx-xxx-xxxx" className={smInputCls} />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── 收货要求 ── */}
          <CollapsibleSection
            icon={Settings2}
            title="收货要求"
            badge={requireBadge > 0 ? `${requireBadge} 项` : undefined}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-5">
                {[
                  { label: '加急', checked: isRush, set: setIsRush },
                  { label: '转运', checked: isTransload, set: setIsTransload },
                  { label: '采集箱号', checked: requireCollectCartonId, set: setRequireCollectCartonId },
                  { label: '自动推送 WMS', checked: autoPush, set: setAutoPush },
                ].map(({ label, checked, set }) => (
                  <label key={label} className="flex cursor-pointer items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => set(e.target.checked)}
                      className="size-3.5 accent-[var(--primary)]"
                    />
                    <span className="text-[13px] text-[var(--foreground)]">{label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label>质检方式</Label>
                  <select value={qcMode} onChange={e => setQcMode(e.target.value)} className={smInputCls}>
                    <option value="">按客户配置</option>
                    <option>全检</option><option>抽检</option><option>免检</option>
                  </select>
                </div>
                <div>
                  <Label>收货指示</Label>
                  <input value={shippingInstruction} onChange={e => setShippingInstruction(e.target.value)} placeholder="如：需叉车卸货" className={smInputCls} />
                </div>
                <div>
                  <Label>备注</Label>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="通用备注" className={smInputCls} />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ── 商品明细 ── */}
          <div className={cn(cardCls, 'overflow-hidden !p-0')}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-[var(--muted)]" />
                <span className="text-[13px] font-semibold text-[var(--foreground)]">商品明细</span>
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
                  <Edit3 className="size-3" />手动添加
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-semibold text-white hover:opacity-90 transition"
                >
                  <Plus className="size-3" />添加商品
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
                <p className="text-[13px] font-medium text-[var(--foreground)]">暂无商品</p>
                <p className="mt-1 text-[12px] text-[var(--muted)]">点击此处或使用上方按钮添加商品</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {/* 表头
                      列顺序：商品 | 数量* | 单位 | 单价(不含税) | 总价(不含税) | 税率% | 税额 | 含税总价 | 箱数 | 托盘数 | 批次号 | 序列号 | 良品数 | 次品数 | PO行号 | ×
                  */}
                  <div
                    className="grid items-center gap-x-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]"
                    style={{ gridTemplateColumns: 'minmax(150px,1.5fr) 52px 48px 76px 76px 54px 68px 76px 60px 60px 68px 68px 60px 60px 68px 24px', minWidth: '1160px' }}
                  >
                    <span>商品</span>
                    <span className="text-center">数量 <span className="text-[var(--danger)]">*</span></span>
                    <span className="text-center">单位</span>
                    <span className="text-right">单价</span>
                    <span className="text-right">总价</span>
                    <span className="text-right">税率%</span>
                    <span className="text-right">税额</span>
                    <span className="text-right">含税总价</span>
                    <span className="text-center">箱数</span>
                    <span className="text-center">托盘数</span>
                    <span>批次号</span>
                    <span>序列号</span>
                    <span className="text-center text-green-700">良品数</span>
                    <span className="text-center text-[var(--danger)]">次品数</span>
                    <span>PO 行号</span>
                    <span />
                  </div>

                  {/* 商品行 */}
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {items.map(item => {
                      const lineSubtotal = item.unitPrice * item.qty;                        // 总价（不含税）
                      const lineTax = lineSubtotal * item.taxRate / 100;                     // 税额
                      const lineTaxed = lineSubtotal + lineTax;                              // 含税总价
                      return (
                        <div
                          key={item._key}
                          className="grid items-start gap-x-2 px-4 py-3 hover:bg-[var(--surface-subtle)] transition"
                          style={{ gridTemplateColumns: 'minmax(150px,1.5fr) 52px 48px 76px 76px 54px 68px 76px 60px 60px 68px 68px 60px 60px 68px 24px', minWidth: '1160px' }}
                        >
                          {/* 商品信息 */}
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                              <Package className="size-4 text-[var(--muted-foreground)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <input
                                value={item.productName}
                                onChange={e => updateItem(item._key, 'productName', e.target.value)}
                                placeholder="商品名称"
                                className="w-full border-0 bg-transparent p-0 text-[13px] font-medium text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
                              />
                              <input
                                value={item.sku}
                                onChange={e => updateItem(item._key, 'sku', e.target.value)}
                                placeholder="SKU"
                                className="mt-0.5 w-full border-0 bg-transparent p-0 font-mono text-[11px] text-[var(--muted)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
                              />
                              {!item.sku && !item.productName && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-700">
                                  <Info className="size-3 shrink-0" />请填写 SKU 或名称
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
                              value={item.uom}
                              onChange={e => updateItem(item._key, 'uom', e.target.value)}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center text-[12px] focus:border-[var(--primary)] focus:outline-none"
                            >
                              <option value="PCS">件</option>
                              <option value="BOX">箱</option>
                              <option value="CTN">纸箱</option>
                              <option value="SET">套</option>
                              <option value="ROLL">卷</option>
                              <option value="BAG">袋</option>
                              <option value="KG">kg</option>
                              <option value="PAIR">双</option>
                            </select>
                          </div>

                          {/* 单价（不含税） */}
                          <div className="flex items-start pt-0.5">
                            <div className="relative w-full">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitPrice}
                                onChange={e => updateItem(item._key, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-right text-[13px] focus:border-[var(--primary)] focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* 总价（不含税）— 只读 */}
                          <div className="flex items-start justify-end pt-2">
                            <span className="text-[13px] text-[var(--foreground)]">{lineSubtotal.toFixed(2)}</span>
                          </div>

                          {/* 税率 */}
                          <div className="flex items-start pt-0.5">
                            <div className="relative w-full">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={item.taxRate}
                                onChange={e => updateItem(item._key, 'taxRate', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pr-5 pl-1 py-1.5 text-right text-[13px] focus:border-[var(--primary)] focus:outline-none"
                              />
                              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
                            </div>
                          </div>

                          {/* 税额 — 只读 */}
                          <div className="flex items-start justify-end pt-2">
                            <span className="text-[13px] text-[var(--muted)]">{lineTax.toFixed(2)}</span>
                          </div>

                          {/* 含税总价 — 只读 */}
                          <div className="flex items-start justify-end pt-2">
                            <span className="text-[13px] font-semibold text-[var(--foreground)]">{lineTaxed.toFixed(2)}</span>
                          </div>

                          {/* 箱数 */}
                          <div className="flex items-start pt-0.5">
                            <input
                              type="number"
                              min={0}
                              value={item.cartonQty || ''}
                              onChange={e => updateItem(item._key, 'cartonQty', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center text-[13px] focus:border-[var(--primary)] focus:outline-none"
                            />
                          </div>

                          {/* 托盘数 */}
                          <div className="flex items-start pt-0.5">
                            <input
                              type="number"
                              min={0}
                              value={item.expectedPalletQty || ''}
                              onChange={e => updateItem(item._key, 'expectedPalletQty', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center text-[13px] focus:border-[var(--primary)] focus:outline-none"
                            />
                          </div>

                          {/* 批次号 */}
                          <div className="flex items-start pt-0.5">
                            <input
                              value={item.lotNo}
                              onChange={e => updateItem(item._key, 'lotNo', e.target.value)}
                              placeholder="批次"
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[12px] focus:border-[var(--primary)] focus:outline-none"
                            />
                          </div>

                          {/* 序列号 */}
                          <div className="flex items-start pt-0.5">
                            <input
                              value={item.snList}
                              onChange={e => updateItem(item._key, 'snList', e.target.value)}
                              placeholder="SN"
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[12px] focus:border-[var(--primary)] focus:outline-none"
                            />
                          </div>

                          {/* 良品数 */}
                          <div className="flex items-start pt-0.5">
                            <input
                              type="number"
                              min={0}
                              value={item.goodQty || ''}
                              onChange={e => updateItem(item._key, 'goodQty', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center text-[13px] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-200"
                            />
                          </div>

                          {/* 次品数 */}
                          <div className="flex items-start pt-0.5">
                            <input
                              type="number"
                              min={0}
                              value={item.defectQty || ''}
                              onChange={e => updateItem(item._key, 'defectQty', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center text-[13px] focus:border-[var(--danger)] focus:outline-none focus:ring-1 focus:ring-red-200"
                            />
                          </div>

                          {/* PO 行号 */}
                          <div className="flex items-start pt-0.5">
                            <input
                              value={item.poLineNo}
                              onChange={e => updateItem(item._key, 'poLineNo', e.target.value)}
                              placeholder="PO Line"
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[12px] focus:border-[var(--primary)] focus:outline-none"
                            />
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 添加更多 */}
                <div className="flex gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    className="flex items-center gap-1 text-[12px] font-medium text-[var(--primary)] hover:opacity-80 transition"
                  >
                    <Plus className="size-3.5" />添加商品
                  </button>
                  <span className="text-[var(--border)]">·</span>
                  <button
                    type="button"
                    onClick={addBlankItem}
                    className="flex items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
                  >
                    <Edit3 className="size-3.5" />手动添加
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── 费用汇总 ── */}
          {items.length > 0 && (
            <CardSection>
              <SectionHeader icon={Hash} title="费用汇总" />
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">小计（不含税）</span>
                  <span className="font-medium text-[var(--foreground)]">{totalQty} 件 · {totalCartons} 箱 · {totalPallets} 托</span>
                  <span className="w-28 text-right font-medium text-[var(--foreground)]">
                    {currency} {subtotal.toFixed(2)}
                  </span>
                </div>
                {(totalGoodQty > 0 || totalDefectQty > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">质检结果</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-green-700 font-medium">
                        <span className="size-1.5 rounded-full bg-green-500 inline-block" />
                        良品 {totalGoodQty} 件
                      </span>
                      {totalDefectQty > 0 && (
                        <span className="flex items-center gap-1 text-[var(--danger)] font-medium">
                          <span className="size-1.5 rounded-full bg-[var(--danger)] inline-block" />
                          次品 {totalDefectQty} 件
                        </span>
                      )}
                    </div>
                    <span className="w-28" />
                  </div>
                )}
                {totalTax > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">税额</span>
                    <span />
                    <span className="w-28 text-right text-[var(--foreground)]">
                      {currency} {totalTax.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
                  <span className="font-semibold text-[var(--foreground)]">合计（含税）</span>
                  <span />
                  <span className="w-28 text-right text-[15px] font-bold text-[var(--foreground)]">
                    {currency} {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardSection>
          )}

        </div>{/* end 左栏 */}

        {/* ════ 右栏（配置区） ════ */}
        <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 space-y-4">

          {/* ── 供应商 ── */}
          <div className={cn(cardCls)}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] rounded-t-xl px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-[14px] text-[var(--muted)]" />
                <span className="text-[13px] font-semibold text-[var(--foreground)]">供应商</span>
              </div>
              {supplier && (
                <button
                  type="button"
                  onClick={() => { setSupplier(null); setSupplierSearch(''); }}
                  className="text-[12px] text-[var(--muted)] hover:text-[var(--danger)] transition"
                >
                  更换
                </button>
              )}
            </div>

            <div className="p-3">
              {!supplier ? (
                <>
                  <p className="mb-2 text-[12px] text-[var(--muted)]">搜索并选择供应商</p>
                  <SupplierSearchInput
                    value={supplierSearch}
                    onChange={setSupplierSearch}
                    onSelect={handleSelectSupplier}
                  />
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[13px] font-bold text-[var(--primary)]">
                      {supplier.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--primary)]">{supplier.name}</p>
                      <p className="text-[11px] text-[var(--muted)]">{supplier.code} · {supplier.country}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 其他信息 ── */}
          <CardSection>
            <SectionHeader icon={Settings2} title="其他信息" />
            <div className="space-y-3">
              <div>
                <Label>序列号备注</Label>
                <textarea
                  placeholder="如需记录序列号，可在此填写（多个换行）"
                  rows={3}
                  className={cn(smInputCls, 'resize-none')}
                />
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <p className="mb-2 text-[11px] text-[var(--muted-foreground)] uppercase tracking-[0.06em] font-medium">提交选项</p>
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={autoPush}
                    onChange={e => setAutoPush(e.target.checked)}
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  <span className="text-[13px] text-[var(--foreground)]">提交后自动推送 WMS</span>
                </label>
                {!autoPush && (
                  <p className="mt-1 flex items-center gap-1 text-[12px] text-amber-700">
                    <AlertCircle className="size-3.5 shrink-0" />提交后需手动推送 WMS
                  </p>
                )}
              </div>
            </div>
          </CardSection>

        </div>{/* end 右栏 */}

      </div>{/* end 双栏 */}

      {/* ══════════ 固定底部操作栏 ══════════ */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          {/* 左侧汇总 */}
          <div className="hidden items-center gap-3 text-[12px] text-[var(--muted)] sm:flex">
            {items.length === 0 ? (
              <span>暂无商品</span>
            ) : (
              <>
                <span className="font-medium text-[var(--foreground)]">{items.length} 行</span>
                <span className="text-[var(--border)]">·</span>
                <span>{totalQty} 件</span>
                {totalCartons > 0 && <><span className="text-[var(--border)]">·</span><span>{totalCartons} 箱</span></>}
                {total > 0 && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span className="font-semibold text-[var(--foreground)]">{currency} {total.toFixed(2)}</span>
                  </>
                )}
                {!autoPush && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-200">手动推送</span>
                )}
              </>
            )}
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2 ml-auto">
            <Link
              href="/dashboard/inbound"
              className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              取消
            </Link>
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              暂存草稿
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitClick}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {submitting
                ? <><Loader2 className="size-3.5 animate-spin" />提交中...</>
                : autoPush ? '提交并推送' : '提交入库单'
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── 商品搜索弹窗 ── */}
      <ProductSearchModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        onConfirm={handleAddFromCatalog}
        existingSkus={items.map(i => i.sku)}
      />

      {/* ── 校验错误弹窗 ── */}
      {showValidation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setShowValidation(false)}
        >
          <div
            className="mx-4 w-full max-w-[400px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
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

      {/* ── 提交成功弹窗 ── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="mx-4 w-full max-w-[360px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl text-center px-8 py-8">
            <div className="mb-4 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
            </div>
            <h3 className="mb-1.5 text-[16px] font-bold text-[var(--foreground)]">入库单提交成功</h3>
            <p className="mb-6 text-[13px] text-[var(--muted)]">
              {autoPush ? '已自动推送至 WMS，正在跳转...' : '待手动推送至 WMS，正在跳转...'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => { setShowSuccess(false); router.push('/dashboard/inbound'); }}
                className="h-9 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
              >
                返回列表
              </button>
              <button
                type="button"
                onClick={() => { setShowSuccess(false); router.push('/dashboard/inbound'); }}
                className="h-9 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 transition"
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
