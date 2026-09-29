'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Plus, Package, Search, X,
  Building2, MapPin, Info, CheckCircle2,
  Loader2, Trash2, ClipboardList, AlertTriangle,
  TrendingUp, FileText, Settings2, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 样式常量 ─────────────────────────────────────────────────────────────────

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

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type PlanItem = {
  _key: string;
  sku: string;
  productName: string;
  spec: string;
  unit: string;
  planQty: number;
  currentStock: number;
  safetyStock: number;
  unitCost: number;
  currency: string;
  supplierId: string;
  expectedDate: string;
  remark: string;
  fromCatalog: boolean;
};

type Supplier = { id: string; name: string; code: string; contact: string; phone: string; email: string; paymentTerms: string; leadDays: number; currency: string; };
type Warehouse = { id: string; name: string; code: string; region: string; };
type CatalogVariant = { id: string; sku: string; name: string; spec: string; unit: string; basePrice: number; currency: string; currentStock: number; safetyStock: number; };

// ─── Mock 数据（与新增页/详情页共享）────────────────────────────────────────────

const mockSuppliers: Supplier[] = [
  { id: 'sup_001', name: '深圳华强电子有限公司',       code: 'SUP-001', contact: '李经理',      phone: '+86 755-8888-0001', email: 'li@hqe.cn',                 paymentTerms: 'Net 30', leadDays: 14, currency: 'CNY' },
  { id: 'sup_002', name: 'Shenzhen TechParts Co., Ltd.', code: 'SUP-002', contact: 'John Smith',  phone: '+86 755-9999-0002', email: 'john@techparts.com',         paymentTerms: 'Net 45', leadDays: 21, currency: 'USD' },
  { id: 'sup_003', name: '广州科技配件有限公司',         code: 'SUP-003', contact: '王总',         phone: '+86 20-7777-0003',  email: 'wang@gztech.com',            paymentTerms: 'Net 30', leadDays: 10, currency: 'CNY' },
  { id: 'sup_004', name: 'Audio Supplies Ltd.',          code: 'SUP-004', contact: 'Emma Clarke',  phone: '+44 20 7946 0010',  email: 'emma@audiosupplies.co.uk',   paymentTerms: 'Net 60', leadDays: 28, currency: 'GBP' },
  { id: 'sup_005', name: 'Global Cable Inc.',            code: 'SUP-005', contact: 'Mike Chen',    phone: '+1 626-888-0005',   email: 'mike@globalcable.com',       paymentTerms: 'Net 30', leadDays: 18, currency: 'USD' },
];

const mockWarehouses: Warehouse[] = [
  { id: 'wh_001', name: 'US-West-LAX',    code: 'LAX', region: '美国西部' },
  { id: 'wh_002', name: 'US-West-SEA',    code: 'SEA', region: '美国西北' },
  { id: 'wh_003', name: 'US-East-EWR',    code: 'EWR', region: '美国东部' },
  { id: 'wh_004', name: 'US-Central-DFW', code: 'DFW', region: '美国中部' },
  { id: 'wh_005', name: 'SG-Central',     code: 'SGP', region: '新加坡'   },
  { id: 'wh_006', name: 'UK-London',      code: 'LDN', region: '英国'     },
];

const mockVariants: CatalogVariant[] = [
  { id: 'var_001', sku: 'SKU-0001', name: 'Smart Watch Band',    spec: 'Black / S',         unit: 'PCS', basePrice: 12.99, currency: 'USD', currentStock: 320,  safetyStock: 200 },
  { id: 'var_002', sku: 'SKU-0002', name: 'Screen Protector',    spec: 'Tempered Glass',    unit: 'PCS', basePrice: 8.99,  currency: 'USD', currentStock: 85,   safetyStock: 150 },
  { id: 'var_003', sku: 'SKU-0003', name: 'Charging Dock',       spec: 'White',             unit: 'PCS', basePrice: 29.99, currency: 'USD', currentStock: 42,   safetyStock: 100 },
  { id: 'var_004', sku: 'SKU-0004', name: 'Mechanical Keyboard', spec: 'Cherry MX Blue',    unit: 'PCS', basePrice: 89.99, currency: 'USD', currentStock: 18,   safetyStock: 50  },
  { id: 'var_005', sku: 'SKU-0005', name: 'Webcam 4K',           spec: '60fps / USB-C',     unit: 'PCS', basePrice: 59.99, currency: 'USD', currentStock: 67,   safetyStock: 80  },
  { id: 'var_006', sku: 'SKU-0006', name: 'Ring Light Mini',     spec: '6-inch',            unit: 'PCS', basePrice: 24.99, currency: 'USD', currentStock: 210,  safetyStock: 100 },
  { id: 'var_007', sku: 'SKU-0007', name: 'Phone Case',          spec: 'iPhone 15 / Clear', unit: 'PCS', basePrice: 15.99, currency: 'USD', currentStock: 450,  safetyStock: 300 },
  { id: 'var_008', sku: 'SKU-0008', name: 'USB-C Cable 2m',      spec: 'White',             unit: 'PCS', basePrice: 9.99,  currency: 'USD', currentStock: 1200, safetyStock: 500 },
  { id: 'var_009', sku: 'SKU-0009', name: 'Bluetooth Speaker',   spec: 'Midnight Black',    unit: 'PCS', basePrice: 45.99, currency: 'USD', currentStock: 33,   safetyStock: 80  },
  { id: 'var_010', sku: 'SKU-0010', name: 'Wireless Earbuds Pro',spec: 'ANC / USB-C',       unit: 'PCS', basePrice: 79.99, currency: 'USD', currentStock: 25,   safetyStock: 60  },
  { id: 'var_011', sku: 'SKU-0011', name: 'Laptop Stand',        spec: 'Aluminum / Silver', unit: 'PCS', basePrice: 49.99, currency: 'USD', currentStock: 95,   safetyStock: 50  },
  { id: 'var_012', sku: 'SKU-0012', name: 'Wireless Charger',    spec: '15W / Black',       unit: 'PCS', basePrice: 19.99, currency: 'USD', currentStock: 140,  safetyStock: 100 },
];

// ─── 与详情页共享的 mock 详情（用于预填）────────────────────────────────────────

type ExistingPlan = {
  planNo: string; title: string; planType: string; priority: string;
  planDate: string; expectedArrival: string; validUntil: string;
  supplierId: string; contactName: string; contactPhone: string; contactEmail: string; paymentTerms: string;
  warehouseId: string; deliveryAddress: string; shippingMethod: string; incoterms: string;
  currency: string; budgetAmount: number; taxRate: number;
  approvalFlow: string; approver: string;
  sourceDoc: string; department: string; costCenter: string; tags: string[]; remark: string;
  items: PlanItem[];
};

const existingPlans: Record<string, ExistingPlan> = {
  pp_001: {
    planNo: 'PP-2026-0001', title: 'Q3 电子配件补货计划', planType: 'REGULAR', priority: 'URGENT',
    planDate: '2026-09-01', expectedArrival: '2026-09-20', validUntil: '2026-09-30',
    supplierId: 'sup_001', contactName: '李经理', contactPhone: '+86 755-8888-0001', contactEmail: 'li@hqe.cn', paymentTerms: 'Net 30',
    warehouseId: 'wh_001', deliveryAddress: '', shippingMethod: 'SEA', incoterms: 'FOB',
    currency: 'USD', budgetAmount: 20000, taxRate: 0,
    approvalFlow: 'STANDARD', approver: 'mgr_002',
    sourceDoc: 'REP-2026-0012', department: '采购部', costCenter: 'CC-WAREHOUSE',
    tags: ['Q3', '季末备货', '重点SKU'], remark: '季末备货，需优先审批，确保国庆前到仓',
    items: [
      { _key: 'i1', sku: 'SKU-0001', productName: 'Smart Watch Band',    spec: 'Black / S',     unit: 'PCS', planQty: 200, currentStock: 320,  safetyStock: 200, unitCost: 12.99, currency: 'USD', supplierId: '', expectedDate: '2026-09-20', remark: '',                        fromCatalog: true },
      { _key: 'i2', sku: 'SKU-0002', productName: 'Screen Protector',    spec: 'Tempered Glass', unit: 'PCS', planQty: 300, currentStock: 85,   safetyStock: 150, unitCost: 8.99,  currency: 'USD', supplierId: '', expectedDate: '2026-09-20', remark: '库存低于安全库存，加急',  fromCatalog: true },
      { _key: 'i3', sku: 'SKU-0003', productName: 'Charging Dock',       spec: 'White',          unit: 'PCS', planQty: 200, currentStock: 42,   safetyStock: 100, unitCost: 29.99, currency: 'USD', supplierId: '', expectedDate: '2026-09-20', remark: '',                        fromCatalog: true },
      { _key: 'i4', sku: 'SKU-0009', productName: 'Bluetooth Speaker',   spec: 'Midnight Black', unit: 'PCS', planQty: 100, currentStock: 33,   safetyStock: 80,  unitCost: 45.99, currency: 'USD', supplierId: '', expectedDate: '2026-09-25', remark: '',                        fromCatalog: true },
      { _key: 'i5', sku: 'SKU-0010', productName: 'Wireless Earbuds Pro',spec: 'ANC/USB-C',      unit: 'PCS', planQty: 100, currentStock: 25,   safetyStock: 60,  unitCost: 79.99, currency: 'USD', supplierId: '', expectedDate: '2026-09-25', remark: '黑五主推SKU，确保足量',  fromCatalog: true },
      { _key: 'i6', sku: 'SKU-0004', productName: 'Mechanical Keyboard', spec: 'Cherry MX',      unit: 'PCS', planQty: 100, currentStock: 18,   safetyStock: 50,  unitCost: 89.99, currency: 'USD', supplierId: '', expectedDate: '2026-09-28', remark: '',                        fromCatalog: true },
      { _key: 'i7', sku: 'SKU-0005', productName: 'Webcam 4K',           spec: '60fps/USB-C',    unit: 'PCS', planQty: 100, currentStock: 67,   safetyStock: 80,  unitCost: 59.99, currency: 'USD', supplierId: '', expectedDate: '2026-09-28', remark: '',                        fromCatalog: true },
      { _key: 'i8', sku: 'SKU-0012', productName: 'Wireless Charger',    spec: '15W / Black',    unit: 'PCS', planQty: 100, currentStock: 140,  safetyStock: 100, unitCost: 19.99, currency: 'USD', supplierId: '', expectedDate: '2026-09-20', remark: '',                        fromCatalog: true },
    ],
  },
  pp_004: {
    planNo: 'PP-2026-0004', title: '无线充电器年度补货', planType: 'REGULAR', priority: 'LOW',
    planDate: '2026-09-10', expectedArrival: '2026-10-10', validUntil: '2026-10-31',
    supplierId: 'sup_003', contactName: '王总', contactPhone: '+86 20-7777-0003', contactEmail: 'wang@gztech.com', paymentTerms: 'Net 30',
    warehouseId: 'wh_003', deliveryAddress: '', shippingMethod: 'SEA', incoterms: 'FOB',
    currency: 'USD', budgetAmount: 18000, taxRate: 0,
    approvalFlow: 'STANDARD', approver: '',
    sourceDoc: '', department: '采购部', costCenter: 'CC-WAREHOUSE',
    tags: ['年度补货', '东部仓'], remark: '',
    items: [
      { _key: 'i1', sku: 'SKU-0012', productName: 'Wireless Charger', spec: '15W / Black', unit: 'PCS', planQty: 300, currentStock: 140, safetyStock: 100, unitCost: 19.99, currency: 'USD', supplierId: '', expectedDate: '2026-10-10', remark: '',           fromCatalog: true },
      { _key: 'i2', sku: 'SKU-0003', productName: 'Charging Dock',    spec: 'White',       unit: 'PCS', planQty: 300, currentStock: 42,  safetyStock: 100, unitCost: 29.99, currency: 'USD', supplierId: '', expectedDate: '2026-10-10', remark: '库存不足，优先补', fromCatalog: true },
      { _key: 'i3', sku: 'SKU-0008', productName: 'USB-C Cable 2m',   spec: 'White',       unit: 'PCS', planQty: 200, currentStock: 1200,safetyStock: 500, unitCost: 9.99,  currency: 'USD', supplierId: '', expectedDate: '2026-10-10', remark: '',           fromCatalog: true },
    ],
  },
  pp_007: {
    planNo: 'PP-2026-0007', title: '键盘/鼠标外设补货', planType: 'REGULAR', priority: 'NORMAL',
    planDate: '2026-09-20', expectedArrival: '2026-10-15', validUntil: '2026-10-31',
    supplierId: 'sup_001', contactName: '李经理', contactPhone: '+86 755-8888-0001', contactEmail: 'li@hqe.cn', paymentTerms: 'Net 30',
    warehouseId: 'wh_004', deliveryAddress: '', shippingMethod: 'SEA', incoterms: 'FOB',
    currency: 'USD', budgetAmount: 45000, taxRate: 0,
    approvalFlow: 'STANDARD', approver: '',
    sourceDoc: '', department: '采购部', costCenter: 'CC-WAREHOUSE',
    tags: ['外设', '中部仓'], remark: '',
    items: [
      { _key: 'i1', sku: 'SKU-0004', productName: 'Mechanical Keyboard', spec: 'Cherry MX Blue',    unit: 'PCS', planQty: 150, currentStock: 18, safetyStock: 50, unitCost: 89.99, currency: 'USD', supplierId: '', expectedDate: '2026-10-15', remark: '库存严重不足', fromCatalog: true },
      { _key: 'i2', sku: 'SKU-0005', productName: 'Webcam 4K',           spec: '60fps / USB-C',     unit: 'PCS', planQty: 150, currentStock: 67, safetyStock: 80, unitCost: 59.99, currency: 'USD', supplierId: '', expectedDate: '2026-10-15', remark: '',           fromCatalog: true },
      { _key: 'i3', sku: 'SKU-0011', productName: 'Laptop Stand',        spec: 'Aluminum / Silver',  unit: 'PCS', planQty: 150, currentStock: 95, safetyStock: 50, unitCost: 49.99, currency: 'USD', supplierId: '', expectedDate: '2026-10-15', remark: '',           fromCatalog: true },
    ],
  },
};

// ─── 子组件 ───────────────────────────────────────────────────────────────────

function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
      {required && <span className="text-[14px] leading-none text-[var(--danger)] -mt-px">*</span>}
      {children}
      {hint && (
        <span className="group relative ml-0.5 cursor-default">
          <Info className="size-3 text-[var(--muted-foreground)]" />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-[var(--foreground)] shadow-[var(--shadow-panel)] group-hover:block">
            {hint}
          </span>
        </span>
      )}
    </label>
  );
}

function SectionCard({ icon: Icon, title, children, className, action }: {
  icon?: React.ElementType; title: string; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) {
  return (
    <div className={cn(cardCls, 'p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-[15px] text-[var(--muted)]" />}
          <span className="text-[13px] font-semibold text-[var(--foreground)]">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── 商品选择弹窗 ─────────────────────────────────────────────────────────────

function ProductPickerModal({ open, onClose, onConfirm, existingSkus }: {
  open: boolean; onClose: () => void; onConfirm: (v: CatalogVariant[]) => void; existingSkus: string[];
}) {
  const [query, setQuery]     = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setSelected(new Set()); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return mockVariants;
    return mockVariants.filter(v => v.sku.toLowerCase().includes(q) || v.name.toLowerCase().includes(q));
  }, [query]);

  const alreadyAdded = (sku: string) => existingSkus.includes(sku);
  const toggle = (id: string, sku: string) => {
    if (alreadyAdded(sku)) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const available  = filtered.filter(v => !alreadyAdded(v.sku));
  const allChecked = available.length > 0 && available.every(v => selected.has(v.id));
  const toggleAll  = () => allChecked
    ? setSelected(prev => { const n = new Set(prev); available.forEach(v => n.delete(v.id)); return n; })
    : setSelected(prev => { const n = new Set(prev); available.forEach(v => n.add(v.id)); return n; });

  const handleConfirm = () => { onConfirm(mockVariants.filter(v => selected.has(v.id))); onClose(); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="mx-4 flex w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        style={{ maxHeight: 'min(84vh, 700px)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">选择采购商品</h3>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)] transition"><X className="size-4" /></button>
        </div>
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索 SKU 或商品名称..." className={cn(inputCls, 'pl-9')} />
            {query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"><X className="size-3.5" /></button>}
          </div>
        </div>
        <div className="grid grid-cols-[2rem_1fr_80px_80px_80px_90px] items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="size-3.5 accent-[var(--primary)]" />
          <span>商品</span><span className="text-right">现库存</span><span className="text-right">安全库存</span><span className="text-right">缺口</span><span className="text-right">参考单价</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2"><Package className="size-8 text-[var(--border)]" /><p className="text-[13px] text-[var(--muted)]">未找到匹配商品</p></div>
          ) : filtered.map(v => {
            const added   = alreadyAdded(v.sku);
            const checked = selected.has(v.id);
            const gap     = Math.max(0, v.safetyStock - v.currentStock);
            return (
              <label key={v.id} className={cn('grid cursor-pointer grid-cols-[2rem_1fr_80px_80px_80px_90px] items-center gap-3 px-5 py-2.5 transition-colors select-none', added ? 'cursor-not-allowed opacity-45' : 'hover:bg-[var(--surface-subtle)]', checked && !added && 'bg-[var(--primary-soft)]')}>
                <input type="checkbox" checked={checked} onChange={() => toggle(v.id, v.sku)} disabled={added} className="size-3.5 accent-[var(--primary)]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[var(--foreground)]">{v.name}</span>
                    {v.spec && <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-[var(--border-subtle)]">{v.spec}</span>}
                    {added && <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">已添加</span>}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{v.sku}</p>
                </div>
                <span className="text-right text-[12px] text-[var(--foreground)]">{v.currentStock.toLocaleString()}</span>
                <span className="text-right text-[12px] text-[var(--muted)]">{v.safetyStock.toLocaleString()}</span>
                <span className={cn('text-right text-[12px] font-medium', gap > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>{gap > 0 ? `-${gap}` : '充足'}</span>
                <span className="text-right text-[13px] font-medium text-[var(--foreground)]">${v.basePrice.toFixed(2)}</span>
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">{selected.size > 0 ? `已选 ${selected.size} 个商品` : `共 ${filtered.length} 个商品`}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition">取消</button>
            <button type="button" onClick={handleConfirm} disabled={selected.size === 0} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 transition">
              添加{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function SaveToast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <div className={cn('fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2.5 rounded-xl border border-green-200 bg-white px-4 py-3 shadow-[var(--shadow-panel)] transition-all duration-300', visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2')}>
      <CheckCircle2 className="size-4 text-[var(--success)]" />
      <span className="text-[13px] font-medium text-[var(--foreground)]">{message}</span>
    </div>
  );
}

// ─── 表单类型 ─────────────────────────────────────────────────────────────────

type FormState = {
  title: string; planNo: string; planType: string; priority: string;
  planDate: string; expectedArrival: string; validUntil: string;
  supplierId: string; contactName: string; contactPhone: string; contactEmail: string; paymentTerms: string;
  warehouseId: string; deliveryAddress: string; shippingMethod: string; incoterms: string;
  currency: string; budgetAmount: string; taxRate: string;
  approvalFlow: string; approver: string;
  sourceDoc: string; department: string; costCenter: string; tags: string; remark: string;
};

// ─── 主页面 ───────────────────────────────────────────────────────────────────

let _itemCounter = 0;
function newItem(): PlanItem {
  return {
    _key: `item_edit_${++_itemCounter}_${Math.random().toString(36).slice(2, 7)}`,
    sku: '', productName: '', spec: '', unit: 'PCS',
    planQty: 1, currentStock: 0, safetyStock: 0, unitCost: 0, currency: 'USD',
    supplierId: '', expectedDate: '', remark: '', fromCatalog: false,
  };
}

export default function EditPurchasePlanPage() {
  const params = useParams();
  const router = useRouter();
  const id     = Array.isArray(params.id) ? params.id[0] : params.id as string;

  // 从 mock 数据预填，找不到则用空默认值
  const existing = existingPlans[id];

  const [form, setForm] = useState<FormState>(() => ({
    title:          existing?.title           ?? '',
    planNo:         existing?.planNo          ?? `PP-2026-${id.replace('pp_', '').padStart(4, '0')}`,
    planType:       existing?.planType        ?? 'REGULAR',
    priority:       existing?.priority        ?? 'NORMAL',
    planDate:       existing?.planDate        ?? '',
    expectedArrival:existing?.expectedArrival ?? '',
    validUntil:     existing?.validUntil      ?? '',
    supplierId:     existing?.supplierId      ?? '',
    contactName:    existing?.contactName     ?? '',
    contactPhone:   existing?.contactPhone    ?? '',
    contactEmail:   existing?.contactEmail    ?? '',
    paymentTerms:   existing?.paymentTerms    ?? 'Net 30',
    warehouseId:    existing?.warehouseId     ?? '',
    deliveryAddress:existing?.deliveryAddress ?? '',
    shippingMethod: existing?.shippingMethod  ?? 'SEA',
    incoterms:      existing?.incoterms       ?? 'FOB',
    currency:       existing?.currency        ?? 'USD',
    budgetAmount:   existing?.budgetAmount ? String(existing.budgetAmount) : '',
    taxRate:        existing?.taxRate !== undefined ? String(existing.taxRate) : '0',
    approvalFlow:   existing?.approvalFlow    ?? 'STANDARD',
    approver:       existing?.approver        ?? '',
    sourceDoc:      existing?.sourceDoc       ?? '',
    department:     existing?.department      ?? '',
    costCenter:     existing?.costCenter      ?? '',
    tags:           existing?.tags?.join(', ') ?? '',
    remark:         existing?.remark          ?? '',
  }));

  const [items, setItems]       = useState<PlanItem[]>(() => existing?.items ?? [newItem()]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg]     = useState('');
  const [errors, setErrors]         = useState<Partial<Record<keyof FormState | 'items', string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormState, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  // 供应商自动填充联系信息
  useEffect(() => {
    if (!form.supplierId) return;
    const sup = mockSuppliers.find(s => s.id === form.supplierId);
    if (!sup) return;
    setForm(f => ({ ...f, contactName: sup.contact, contactPhone: sup.phone, contactEmail: sup.email, paymentTerms: sup.paymentTerms }));
  }, [form.supplierId]);

  const handlePickerConfirm = (variants: CatalogVariant[]) => {
    const toAdd: PlanItem[] = variants.map(v => ({
      _key: `item_edit_${++_itemCounter}_${Math.random().toString(36).slice(2, 7)}`,
      sku: v.sku, productName: v.name, spec: v.spec, unit: v.unit,
      planQty: Math.max(1, v.safetyStock - v.currentStock),
      currentStock: v.currentStock, safetyStock: v.safetyStock,
      unitCost: v.basePrice, currency: v.currency,
      supplierId: '', expectedDate: '', remark: '', fromCatalog: true,
    }));
    setItems(prev => {
      const nonEmpty = prev.filter(i => i.sku || i.productName);
      return [...nonEmpty, ...toAdd];
    });
  };

  const updateItem = (key: string, field: keyof PlanItem, value: string | number) =>
    setItems(prev => prev.map(i => i._key === key ? { ...i, [field]: value } : i));

  const removeItem = (key: string) =>
    setItems(prev => { const n = prev.filter(i => i._key !== key); return n.length === 0 ? [newItem()] : n; });

  const existingSkus = items.map(i => i.sku).filter(Boolean);

  // 汇总
  const summary = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.planQty * i.unitCost, 0);
    const taxRate  = parseFloat(form.taxRate) || 0;
    const tax      = subtotal * (taxRate / 100);
    return { subtotal, tax, total: subtotal + tax, totalQty: items.reduce((s, i) => s + i.planQty, 0), itemCount: items.filter(i => i.sku || i.productName).length };
  }, [items, form.taxRate]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title.trim())        e.title           = '请填写计划名称';
    if (!form.supplierId)          e.supplierId      = '请选择主供应商';
    if (!form.warehouseId)         e.warehouseId     = '请选择目标仓库';
    if (!form.planDate)            e.planDate        = '请选择计划日期';
    if (!form.expectedArrival)     e.expectedArrival = '请选择预计到货日期';
    if (form.planDate && form.expectedArrival && form.expectedArrival < form.planDate)
      e.expectedArrival = '预计到货日期不能早于计划日期';
    if (!items.some(i => (i.sku || i.productName) && i.planQty > 0))
      e.items = '请至少添加一条有效的采购明细';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const showToast = (msg: string) => {
    setToastMsg(msg); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2600);
  };

  const handleSave = async () => {
    if (!validate()) {
      document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    showToast('修改已保存');
    setTimeout(() => router.push(`/dashboard/purchase-plans/${id}`), 900);
  };

  const selectedSupplier  = mockSuppliers.find(s => s.id === form.supplierId);
  const selectedWarehouse = mockWarehouses.find(w => w.id === form.warehouseId);

  // ─── 渲染 ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mx-auto max-w-[1200px] pt-5 lg:pt-6 pb-24">

        {/* 页头 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/purchase-plans/${id}`}
              className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">编辑采购计划</h1>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">草稿编辑中</span>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                单号：<span className="font-mono">{form.planNo}</span>
                <span className="ml-2 text-[var(--muted-foreground)]">· 修改后需重新提交审核</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/purchase-plans/${id}`}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
              取消
            </Link>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              保存修改
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
          {/* ── 左列 ── */}
          <div className="flex flex-col gap-5">

            {/* 1. 基本信息 */}
            <SectionCard icon={ClipboardList} title="基本信息">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2" data-error={errors.title ? 'true' : undefined}>
                  <Label required>计划名称</Label>
                  <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="例：Q4 电子配件备货计划"
                    className={cn(inputCls, errors.title && 'border-[var(--danger)] focus:ring-red-100')} />
                  {errors.title && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.title}</p>}
                </div>
                <div>
                  <Label>计划类型</Label>
                  <select value={form.planType} onChange={e => set('planType', e.target.value)} className={inputCls}>
                    <option value="REGULAR">常规补货</option><option value="URGENT">紧急采购</option>
                    <option value="SEASONAL">季节性备货</option><option value="PROJECT">项目采购</option>
                    <option value="SAMPLE">样品采购</option>
                  </select>
                </div>
                <div>
                  <Label>优先级</Label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
                    <option value="URGENT">紧急</option><option value="HIGH">高</option>
                    <option value="NORMAL">普通</option><option value="LOW">低</option>
                  </select>
                </div>
                <div data-error={errors.planDate ? 'true' : undefined}>
                  <Label required>计划日期</Label>
                  <input type="date" value={form.planDate} onChange={e => set('planDate', e.target.value)}
                    className={cn(inputCls, errors.planDate && 'border-[var(--danger)]')} />
                  {errors.planDate && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.planDate}</p>}
                </div>
                <div data-error={errors.expectedArrival ? 'true' : undefined}>
                  <Label required hint="必须晚于计划日期">预计到货日期</Label>
                  <input type="date" value={form.expectedArrival} onChange={e => set('expectedArrival', e.target.value)}
                    className={cn(inputCls, errors.expectedArrival && 'border-[var(--danger)]')} />
                  {errors.expectedArrival && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.expectedArrival}</p>}
                </div>
                <div>
                  <Label hint="超过此日期未转订单自动作废">计划有效期</Label>
                  <input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <Label>来源单据</Label>
                  <input value={form.sourceDoc} onChange={e => set('sourceDoc', e.target.value)} placeholder="如：REP-2026-0012" className={inputCls} />
                </div>
                <div>
                  <Label>申请部门</Label>
                  <select value={form.department} onChange={e => set('department', e.target.value)} className={inputCls}>
                    <option value="">请选择</option><option value="采购部">采购部</option>
                    <option value="运营部">运营部</option><option value="销售部">销售部</option>
                    <option value="仓储部">仓储部</option>
                  </select>
                </div>
                <div>
                  <Label>成本中心</Label>
                  <input value={form.costCenter} onChange={e => set('costCenter', e.target.value)} placeholder="如：CC-WAREHOUSE" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <Label hint="多个标签用逗号分隔">标签</Label>
                  <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="黑五备货, Q4, 重点SKU" className={inputCls} />
                </div>
              </div>
            </SectionCard>

            {/* 2. 供应商 */}
            <SectionCard icon={Building2} title="供应商信息">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2" data-error={errors.supplierId ? 'true' : undefined}>
                  <Label required>主供应商</Label>
                  <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)}
                    className={cn(inputCls, errors.supplierId && 'border-[var(--danger)]')}>
                    <option value="">请选择供应商</option>
                    {mockSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}（{s.code}）</option>)}
                  </select>
                  {errors.supplierId && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.supplierId}</p>}
                </div>
                {selectedSupplier && (
                  <div className="sm:col-span-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] px-4 py-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
                      {[['联系人', selectedSupplier.contact],['电话', selectedSupplier.phone],['邮箱', selectedSupplier.email],['账期', selectedSupplier.paymentTerms],['交货周期', `${selectedSupplier.leadDays} 天`],['货币', selectedSupplier.currency]].map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2"><span className="text-[var(--muted)]">{k}</span><span className="text-[var(--foreground)]">{v}</span></div>
                      ))}
                    </div>
                  </div>
                )}
                <div><Label>联系人</Label><input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="供应商联系人" className={inputCls} /></div>
                <div><Label>联系电话</Label><input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} className={inputCls} /></div>
                <div><Label>联系邮箱</Label><input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} className={inputCls} /></div>
                <div>
                  <Label>付款条款</Label>
                  <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} className={inputCls}>
                    {['Prepaid','Net 15','Net 30','Net 45','Net 60','Net 90','COD'].map(t => <option key={t} value={t}>{t === 'COD' ? '货到付款' : t === 'Prepaid' ? '预付款' : t}</option>)}
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* 3. 交货信息 */}
            <SectionCard icon={MapPin} title="交货信息">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2" data-error={errors.warehouseId ? 'true' : undefined}>
                  <Label required>目标仓库</Label>
                  <select value={form.warehouseId} onChange={e => set('warehouseId', e.target.value)}
                    className={cn(inputCls, errors.warehouseId && 'border-[var(--danger)]')}>
                    <option value="">请选择目标仓库</option>
                    {mockWarehouses.map(w => <option key={w.id} value={w.id}>{w.name} — {w.region}</option>)}
                  </select>
                  {errors.warehouseId && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.warehouseId}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label hint="留空则使用仓库默认地址">交货地址（可选覆盖）</Label>
                  <input value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} placeholder="详细收货地址" className={inputCls} />
                </div>
                <div>
                  <Label>运输方式</Label>
                  <select value={form.shippingMethod} onChange={e => set('shippingMethod', e.target.value)} className={inputCls}>
                    <option value="SEA">海运</option><option value="AIR">空运</option>
                    <option value="EXPRESS">快递</option><option value="LAND">陆运</option>
                    <option value="RAIL">铁路</option>
                  </select>
                </div>
                <div>
                  <Label hint="国际贸易术语（Incoterms 2020）">贸易条款</Label>
                  <select value={form.incoterms} onChange={e => set('incoterms', e.target.value)} className={inputCls}>
                    {[['EXW','EXW — 工厂交货'],['FCA','FCA — 承运人交货'],['FOB','FOB — 装运港船上交货'],['CIF','CIF — 成本+保险+运费'],['DAP','DAP — 目的地交货'],['DDP','DDP — 完税后交货']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* 4. 采购明细 */}
            <SectionCard
              icon={Package} title="采购明细"
              action={
                <div className="flex items-center gap-2">
                  {errors.items && <span className="flex items-center gap-1 text-[12px] text-[var(--danger)]"><AlertTriangle className="size-3.5" />{errors.items}</span>}
                  <button type="button" onClick={() => setPickerOpen(true)}
                    className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90 transition">
                    <Search className="size-3.5" />从商品库选择
                  </button>
                  <button type="button" onClick={() => setItems(prev => [...prev, newItem()])}
                    className="flex h-7 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition">
                    <Plus className="size-3.5" />手动添加
                  </button>
                </div>
              }
            >
              {/* 表头 */}
              <div className="mb-2 hidden grid-cols-[1.5fr_1fr_0.8fr_0.7fr_70px_90px_90px_80px_32px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)] sm:grid">
                <span>商品 / SKU</span><span>规格</span><span>单位</span><span>当前库存</span>
                <span className="text-right">计划数量</span><span className="text-right">参考单价</span>
                <span className="text-right">小计</span><span>期望到货</span><span />
              </div>

              <div className="flex flex-col gap-2">
                {items.map((item, idx) => (
                  <div key={item._key} className={cn('group relative rounded-lg border bg-[var(--surface-subtle)] p-3 transition', item.fromCatalog ? 'border-[var(--border)]' : 'border-dashed border-[var(--border)]')}>
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 hidden size-5 items-center justify-center rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] text-[10px] text-[var(--muted-foreground)] sm:flex">{idx + 1}</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_0.8fr_0.7fr_70px_90px_90px_80px_32px]">
                      {/* 商品 */}
                      <div>
                        {!item.fromCatalog
                          ? <><input value={item.productName} onChange={e => updateItem(item._key, 'productName', e.target.value)} placeholder="商品名称" className={smInputCls} /><input value={item.sku} onChange={e => updateItem(item._key, 'sku', e.target.value)} placeholder="SKU" className={cn(smInputCls, 'mt-1.5 font-mono')} /></>
                          : <div><p className="text-[13px] font-medium text-[var(--foreground)] truncate">{item.productName}</p><p className="font-mono text-[11px] text-[var(--muted)]">{item.sku}</p></div>
                        }
                      </div>
                      {/* 规格 */}
                      <div>{!item.fromCatalog ? <input value={item.spec} onChange={e => updateItem(item._key, 'spec', e.target.value)} placeholder="颜色/尺寸" className={smInputCls} /> : <span className="text-[12px] text-[var(--muted)]">{item.spec || '—'}</span>}</div>
                      {/* 单位 */}
                      <div><select value={item.unit} onChange={e => updateItem(item._key, 'unit', e.target.value)} className={smInputCls}>{['PCS','BOX','KG','M','SET','PAIR','ROLL','CTN'].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                      {/* 当前库存 */}
                      <div className="flex flex-col justify-center">
                        <span className={cn('text-[12px] font-medium', item.currentStock < item.safetyStock ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>{item.currentStock.toLocaleString()}</span>
                        {item.safetyStock > 0 && <span className="text-[10px] text-[var(--muted)]">安全库存 {item.safetyStock}</span>}
                      </div>
                      {/* 计划数量 */}
                      <div><input type="number" min="1" value={item.planQty} onChange={e => updateItem(item._key, 'planQty', Math.max(1, parseInt(e.target.value) || 1))} className={cn(smInputCls, 'text-right')} /></div>
                      {/* 参考单价 */}
                      <div><div className="flex items-center"><span className="rounded-l-md border border-r-0 border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-1.5 text-[11px] text-[var(--muted)]">$</span><input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateItem(item._key, 'unitCost', parseFloat(e.target.value) || 0)} className={cn(smInputCls, 'rounded-l-none text-right')} /></div></div>
                      {/* 小计 */}
                      <div className="flex items-center justify-end"><span className="text-[13px] font-semibold text-[var(--foreground)]">${(item.planQty * item.unitCost).toFixed(2)}</span></div>
                      {/* 期望到货 */}
                      <div><input type="date" value={item.expectedDate} onChange={e => updateItem(item._key, 'expectedDate', e.target.value)} className={smInputCls} /></div>
                      {/* 删除 */}
                      <div className="flex items-center justify-center"><button type="button" onClick={() => removeItem(item._key)} className="flex size-6 items-center justify-center rounded text-[var(--muted-foreground)] opacity-0 transition hover:bg-red-50 hover:text-[var(--danger)] group-hover:opacity-100"><Trash2 className="size-3.5" /></button></div>
                    </div>
                    <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
                      <input value={item.remark} onChange={e => updateItem(item._key, 'remark', e.target.value)} placeholder="行备注（可选）" className="w-full bg-transparent text-[12px] text-[var(--muted)] outline-none placeholder:text-[var(--muted-foreground)]" />
                    </div>
                  </div>
                ))}
              </div>

              {/* 汇总 */}
              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-[300px] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 text-[13px]">
                  {[['品目数', `${summary.itemCount} 品`], ['计划总数量', `${summary.totalQty.toLocaleString()} 件`], ['货款小计', `$${summary.subtotal.toFixed(2)}`]].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1"><span className="text-[var(--muted)]">{k}</span><span className="font-medium text-[var(--foreground)]">{v}</span></div>
                  ))}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2"><span className="text-[var(--muted)]">税率</span>
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" max="100" step="0.5" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} className="w-14 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[12px] text-right text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
                        <span className="text-[var(--muted)]">%</span>
                      </div>
                    </div>
                    <span className="font-medium text-[var(--foreground)]">${summary.tax.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-[var(--border)] pt-2">
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">预估总金额</span>
                    <span className="text-[15px] font-bold text-[var(--primary)]">${summary.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* 5. 财务 */}
            <SectionCard icon={TrendingUp} title="财务与结算">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>结算货币</Label>
                  <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                    {[['USD','美元'],['CNY','人民币'],['EUR','欧元'],['GBP','英镑'],['SGD','新加坡元'],['JPY','日元']].map(([v,l]) => <option key={v} value={v}>{v} — {l}</option>)}
                  </select>
                </div>
                <div>
                  <Label>预算金额</Label>
                  <div className="flex items-center">
                    <span className="rounded-l-lg border border-r-0 border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)]">{form.currency}</span>
                    <input type="number" min="0" step="100" value={form.budgetAmount} onChange={e => set('budgetAmount', e.target.value)} placeholder="0.00" className={cn(inputCls, 'rounded-l-none text-right')} />
                  </div>
                </div>
                <div>
                  <Label>付款条款</Label>
                  <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} className={inputCls}>
                    {['Prepaid','Net 15','Net 30','Net 45','Net 60','Net 90','COD'].map(t => <option key={t} value={t}>{t === 'COD' ? '货到付款' : t === 'Prepaid' ? '预付款' : t}</option>)}
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* 6. 审批 */}
            <SectionCard icon={Settings2} title="审批设置">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>审批流程</Label>
                  <select value={form.approvalFlow} onChange={e => set('approvalFlow', e.target.value)} className={inputCls}>
                    <option value="STANDARD">标准审批流</option><option value="FAST">快速审批（直属上级）</option>
                    <option value="COMMITTEE">委员会审批</option><option value="NONE">免审直接生效</option>
                  </select>
                </div>
                <div>
                  <Label hint="留空则按流程自动分配">指定审批人</Label>
                  <select value={form.approver} onChange={e => set('approver', e.target.value)} className={inputCls}>
                    <option value="">自动分配</option>
                    <option value="mgr_001">张总（采购总监）</option>
                    <option value="mgr_002">李经理（采购经理）</option>
                    <option value="mgr_003">王副总（运营副总）</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* 7. 备注与附件 */}
            <SectionCard icon={FileText} title="备注与附件">
              <div className="flex flex-col gap-4">
                <div>
                  <Label>计划备注</Label>
                  <textarea value={form.remark} onChange={e => set('remark', e.target.value)} placeholder="补充说明、特殊要求、注意事项等..." rows={4} className={cn(inputCls, 'resize-none')} />
                </div>
                <div>
                  <Label>附件</Label>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg" className="hidden" onChange={e => { if (e.target.files?.length) showToast(`已选择 ${e.target.files.length} 个文件`); }} />
                  <div onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-subtle)] px-6 py-6 transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]">
                    <Plus className="size-5 text-[var(--muted)]" />
                    <p className="text-[13px] text-[var(--muted)]">点击或拖拽上传附件</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">支持 PDF、Excel、Word、图片，单文件不超过 20MB</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── 右侧摘要 ── */}
          <div className="flex flex-col gap-4">
            <div className={cn(cardCls, 'p-4 sticky top-4')}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">编辑摘要</p>
              <div className="flex flex-col gap-0 text-[13px]">
                {[
                  ['单号',   form.planNo],
                  ['类型',   ({REGULAR:'常规补货',URGENT:'紧急采购',SEASONAL:'季节性备货',PROJECT:'项目采购',SAMPLE:'样品采购'} as Record<string,string>)[form.planType] ?? '—'],
                  ['优先级', ({URGENT:'紧急',HIGH:'高',NORMAL:'普通',LOW:'低'} as Record<string,string>)[form.priority] ?? '—'],
                  ['供应商', selectedSupplier?.name ?? '未选择'],
                  ['目标仓库',selectedWarehouse?.name ?? '未选择'],
                  ['计划日期',form.planDate || '—'],
                  ['预计到货',form.expectedArrival || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                    <span className="text-[var(--muted)]">{k}</span>
                    <span className="max-w-[150px] truncate text-right text-[var(--foreground)]">{v}</span>
                  </div>
                ))}
                <div className="mt-2 border-t border-[var(--border-subtle)] pt-3">
                  <div className="flex justify-between py-1"><span className="text-[var(--muted)]">品目数</span><span className="font-medium">{summary.itemCount} 品</span></div>
                  <div className="flex justify-between py-1"><span className="text-[var(--muted)]">总数量</span><span className="font-medium">{summary.totalQty.toLocaleString()} 件</span></div>
                  <div className="flex justify-between pt-2 mt-1 border-t border-[var(--border-subtle)]">
                    <span className="font-semibold text-[var(--foreground)]">预估总额</span>
                    <span className="text-[15px] font-bold text-[var(--primary)]">{form.currency} {summary.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 预算超额 */}
              {form.budgetAmount && summary.total > parseFloat(form.budgetAmount) && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--danger)]" />
                  <p className="text-[11px] text-[var(--danger)]">预估金额超出预算 {form.currency} {(summary.total - parseFloat(form.budgetAmount)).toFixed(2)}</p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-60">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  保存修改
                </button>
                <Link href={`/dashboard/purchase-plans/${id}`}
                  className="flex h-9 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
                  取消编辑
                </Link>
              </div>

              {/* 提示 */}
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-[11px] text-amber-700 leading-relaxed">保存后该计划将回到草稿状态，需重新提交审核才能转为采购订单。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onConfirm={handlePickerConfirm} existingSkus={existingSkus} />
      <SaveToast visible={toastVisible} message={toastMsg} />
    </>
  );
}
