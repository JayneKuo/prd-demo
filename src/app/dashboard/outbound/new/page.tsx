'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Package, ChevronDown, Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputClassName = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]';
const compactInputClassName = 'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]';

// ─── Mock product catalog ───
const productCatalog = [
  { id: 'SKU-0001', name: 'Smart Watch Band', barcode: '6901234567890' },
  { id: 'SKU-0002', name: 'Screen Protector', barcode: '6901234567891' },
  { id: 'SKU-0003', name: 'Charging Dock', barcode: '6901234567892' },
  { id: 'SKU-0004', name: 'Mechanical Keyboard', barcode: '6901234567893' },
  { id: 'SKU-0005', name: 'Webcam 4K', barcode: '6901234567894' },
  { id: 'SKU-0006', name: 'Ring Light Mini', barcode: '6901234567895' },
  { id: 'SKU-0007', name: 'Phone Case', barcode: '6901234567896' },
  { id: 'SKU-0008', name: 'Tempered Glass', barcode: '6901234567897' },
  { id: 'SKU-0009', name: 'USB-C Cable', barcode: '6901234567898' },
  { id: 'SKU-0010', name: 'Bluetooth Speaker', barcode: '6901234567899' },
  { id: 'SKU-0011', name: 'Wireless Earbuds', barcode: '6901234567900' },
  { id: 'SKU-0012', name: 'Wireless Charger', barcode: '6901234567901' },
  { id: 'SKU-0013', name: 'USB-C Hub', barcode: '6901234567902' },
  { id: 'SKU-0014', name: 'Laptop Stand', barcode: '6901234567903' },
  { id: 'SKU-0015', name: 'LED Ring Light', barcode: '6901234567904' },
  { id: 'SKU-0016', name: 'Phone Tripod', barcode: '6901234567905' },
  { id: 'SKU-0017', name: 'Selfie Stick', barcode: '6901234567906' },
  { id: 'SKU-0018', name: 'Mouse Pad', barcode: '6901234567907' },
  { id: 'SKU-0019', name: 'Wrist Rest', barcode: '6901234567908' },
  { id: 'SKU-0020', name: 'Smart Watch', barcode: '6901234567909' },
];

type ItemLine = {
  id: string;
  itemId: string;
  name: string;
  qty: number;
  uom: string;
  lotNo: string;
  snList: string;
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--muted-foreground)] mb-1">
        {label}{required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, badge, defaultOpen = false, children }: {
  title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--foreground)]">{title}</span>
          {badge && <span className="rounded-full bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">{badge}</span>}
        </div>
        <ChevronDown className={cn('size-4 text-[var(--muted)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-[var(--border-subtle)] p-4">{children}</div>}
    </div>
  );
}

/** 商品搜索弹窗 */
function ProductSearchModal({ open, onClose, onConfirm, existingIds }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (products: typeof productCatalog) => void;
  existingIds: string[];
}) {
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const searchTerms = useMemo(() => searchInput.split(/[\n,，\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean), [searchInput]);
  const filteredProducts = useMemo(() => {
    if (searchTerms.length === 0) return productCatalog;
    return productCatalog.filter(p => searchTerms.some(term => p.id.toLowerCase().includes(term) || p.name.toLowerCase().includes(term) || p.barcode.includes(term)));
  }, [searchTerms]);

  const toggleSelect = (id: string) => { setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleAll = () => { const available = filteredProducts.filter(p => !existingIds.includes(p.id)); selected.size === available.length ? setSelected(new Set()) : setSelected(new Set(available.map(p => p.id))); };
  const handleConfirm = () => { onConfirm(productCatalog.filter(p => selected.has(p.id))); setSelected(new Set()); setSearchInput(''); onClose(); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 flex w-full max-w-[680px] max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <div><h3 className="text-[15px] font-semibold text-[var(--foreground)]">选择商品</h3><p className="mt-0.5 text-[12px] text-[var(--muted)]">搜索SKU/商品名/条码，支持批量粘贴</p></div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"><X className="size-4" /></button>
        </div>
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="flex items-start gap-2"><Search className="mt-2.5 size-4 shrink-0 text-[var(--muted)]" /><textarea value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="输入SKU、商品名或条码..." rows={2} className={`${inputClassName} resize-none`} autoFocus /></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2">
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={selected.size === filteredProducts.filter(p => !existingIds.includes(p.id)).length && filteredProducts.length > 0} onChange={toggleAll} className="size-3.5 rounded border-[var(--border)]" /><span className="text-[12px] text-[var(--muted-foreground)]">全选</span></label>
            <span className="text-[12px] text-[var(--muted)]">{filteredProducts.length} 个商品{selected.size > 0 && ` · 已选 ${selected.size}`}</span>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center"><Package className="mx-auto size-8 text-[var(--border)]" /><p className="mt-2 text-[13px] text-[var(--muted)]">未找到匹配商品</p></div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredProducts.map(product => {
                const alreadyAdded = existingIds.includes(product.id);
                return (
                  <label key={product.id} className={cn('flex items-center gap-3 px-5 py-2.5 transition-colors', alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--surface-subtle)]', selected.has(product.id) && !alreadyAdded && 'bg-[var(--primary-soft)]/30')}>
                    <input type="checkbox" checked={selected.has(product.id)} onChange={() => !alreadyAdded && toggleSelect(product.id)} disabled={alreadyAdded} className="size-3.5 rounded border-[var(--border)] disabled:opacity-50" />
                    <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="text-[13px] font-medium text-[var(--foreground)]">{product.name}</span>{alreadyAdded && <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">已添加</span>}</div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]"><span className="font-mono">{product.id}</span><span>·</span><span>{product.barcode}</span></div>
                    </div>
                    {selected.has(product.id) && !alreadyAdded && <Check className="size-4 text-[var(--primary)]" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">已选择 {selected.size} 个商品</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">取消</button>
            <button type="button" onClick={handleConfirm} disabled={selected.size === 0} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40">添加 ({selected.size})</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewOutboundPage() {
  // ===== 头部核心字段 =====
  const [outboundType, setOutboundType] = useState('销售出库');
  const [customerId, setCustomerId] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [source, setSource] = useState('销售订单');
  const [poNo, setPoNo] = useState('');
  const [channelOrderNo, setChannelOrderNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');

  // ===== 收货地址（折叠） =====
  const [shipToName, setShipToName] = useState('');
  const [shipToPhone, setShipToPhone] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [shipToAddress2, setShipToAddress2] = useState('');
  const [shipToCity, setShipToCity] = useState('');
  const [shipToState, setShipToState] = useState('');
  const [shipToZip, setShipToZip] = useState('');
  const [shipToCountry, setShipToCountry] = useState('US');

  // ===== 发货信息（折叠） =====
  const [shippingMethod, setShippingMethod] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [carrierScac, setCarrierScac] = useState('');
  const [deliveryService, setDeliveryService] = useState('');
  const [freightTerm, setFreightTerm] = useState('PREPAID');
  const [incoterm, setIncoterm] = useState('');
  const [shipNotBefore, setShipNotBefore] = useState('');
  const [shipNoLater, setShipNoLater] = useState('');
  const [mabd, setMabd] = useState('');

  // ===== 发货要求（折叠） =====
  const [isRush, setIsRush] = useState(false);
  const [containBattery, setContainBattery] = useState(false);
  const [containHazardous, setContainHazardous] = useState(false);
  const [isInternational, setIsInternational] = useState(false);
  const [pickNote, setPickNote] = useState('');
  const [packNote, setPackNote] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [autoPush, setAutoPush] = useState(true);

  // ===== 商品明细 =====
  const [items, setItems] = useState<ItemLine[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedItemRows, setSelectedItemRows] = useState<Set<string>>(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditQty, setBatchEditQty] = useState('');
  const [batchEditUom, setBatchEditUom] = useState('');
  const [batchEditLotNo, setBatchEditLotNo] = useState('');

  const addItem = () => { setItems([...items, { id: String(Date.now()), itemId: '', name: '', qty: 1, uom: '件', lotNo: '', snList: '' }]); };
  const removeItem = (id: string) => { setItems(items.filter(i => i.id !== id)); setSelectedItemRows(prev => { const n = new Set(prev); n.delete(id); return n; }); };
  const updateItem = (id: string, field: keyof ItemLine, value: string | number) => { setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i)); };
  const handleAddProducts = (products: typeof productCatalog) => {
    setItems([...items, ...products.map(p => ({ id: `${p.id}-${Date.now()}`, itemId: p.id, name: p.name, qty: 1, uom: '件', lotNo: '', snList: '' }))]);
  };
  const toggleItemRow = (id: string) => { setSelectedItemRows(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleAllItems = () => { selectedItemRows.size === items.length ? setSelectedItemRows(new Set()) : setSelectedItemRows(new Set(items.map(i => i.id))); };
  const applyBatchEdit = () => {
    setItems(items.map(i => {
      if (!selectedItemRows.has(i.id)) return i;
      return { ...i, ...(batchEditQty ? { qty: parseInt(batchEditQty) || i.qty } : {}), ...(batchEditUom ? { uom: batchEditUom } : {}), ...(batchEditLotNo ? { lotNo: batchEditLotNo } : {}) };
    }));
    setShowBatchEdit(false); setBatchEditQty(''); setBatchEditUom(''); setBatchEditLotNo('');
  };

  const addressCount = [shipToName, shipToAddress, shipToCity].filter(Boolean).length;
  const shippingCount = [shippingMethod, carrierId, deliveryService, shipNotBefore, shipNoLater, mabd].filter(Boolean).length;
  const requirementFlags = [isRush, containBattery, containHazardous, isInternational].filter(Boolean).length;
  const requirementCount = requirementFlags + [pickNote, packNote, orderNote].filter(Boolean).length;

  // 仓库地址映射
  const warehouseAddresses: Record<string, { name: string; address1: string; address2: string; city: string; state: string; zip: string; country: string }> = {
    'US-West-LAX': { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', address2: 'Building C, Dock 5', city: 'Los Angeles', state: 'CA', zip: '90015', country: 'US' },
    'US-East-EWR': { name: 'EWR Distribution Hub', address1: '500 Logistics Way', address2: 'Suite 200', city: 'Newark', state: 'NJ', zip: '07114', country: 'US' },
    'US-Central-DFW': { name: 'DFW Central Warehouse', address1: '8800 Commerce Dr', address2: '', city: 'Dallas', state: 'TX', zip: '75001', country: 'US' },
    'US-West-SEA': { name: 'SEA Pacific Center', address1: '2100 Harbor Ave', address2: 'Unit 12', city: 'Seattle', state: 'WA', zip: '98101', country: 'US' },
    'SG-Central': { name: 'SG Logistics Hub', address1: '10 Changi South Lane', address2: '#03-01', city: 'Singapore', state: '', zip: '486162', country: 'SG' },
    'UK-London': { name: 'London DC', address1: '45 Warehouse Road', address2: '', city: 'London', state: '', zip: 'EC2A 1NT', country: 'UK' },
  };
  const selectedWarehouseAddress = warehouse ? warehouseAddresses[warehouse] : null;

  return (
    <div className="mx-auto max-w-[1280px] pt-5 lg:pt-6 pb-20">
      <Link href="/dashboard/outbound" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />返回出库单列表
      </Link>
      <h1 className="mb-5 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">新建出库单</h1>

      {/* ═══ 头部核心字段 ═══ */}
      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <Field label="出库类型" required>
            <select value={outboundType} onChange={e => setOutboundType(e.target.value)} className={compactInputClassName}>
              <option>销售出库</option><option>调拨出库</option><option>退供出库</option>
            </select>
          </Field>
          <Field label="客户" required>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={compactInputClassName}>
              <option value="">选择客户</option><option value="cust_us">US Store</option><option value="cust_sg">SG Store</option><option value="cust_uk">UK Store</option>
            </select>
          </Field>
          <Field label="发货仓库" required>
            <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className={compactInputClassName}>
              <option value="">选择仓库</option><option>US-West-LAX</option><option>US-East-EWR</option><option>US-Central-DFW</option><option>SG-Central</option><option>UK-London</option>
            </select>
          </Field>
          <Field label="来源">
            <select value={source} onChange={e => setSource(e.target.value)} className={compactInputClassName}>
              <option>销售订单</option><option>调拨单</option><option>退供单</option><option>手动</option>
            </select>
          </Field>
          <Field label="客户PO号">
            <input value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="客户PO" className={compactInputClassName} />
          </Field>
          <Field label="客户渠道单号">
            <input value={channelOrderNo} onChange={e => setChannelOrderNo(e.target.value)} placeholder="#SH-xxx" className={compactInputClassName} />
          </Field>
          <Field label="客户参考号">
            <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Ref" className={compactInputClassName} />
          </Field>
        </div>
      </section>

      {/* 发货地址（仓库地址卡片 — 选仓后自动填充） */}
      {selectedWarehouseAddress && (
        <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] font-medium text-[var(--foreground)]">发货地址</span>
            <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-inset ring-[var(--border)]">{warehouse}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Field label="发货方" required>
              <input value={selectedWarehouseAddress.name} readOnly className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`} />
            </Field>
            <Field label="电话">
              <input value="+1 000-000-0000" readOnly className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`} />
            </Field>
            <Field label="国家" required>
              <select value={selectedWarehouseAddress.country} disabled className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`}>
                <option value="US">United States</option><option value="SG">Singapore</option><option value="UK">United Kingdom</option><option value="CN">China</option>
              </select>
            </Field>
            <Field label="州/省">
              <select value={selectedWarehouseAddress.state} disabled className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`}>
                <option value="">N/A</option>
                <option value="CA">CA</option><option value="NJ">NJ</option><option value="TX">TX</option><option value="WA">WA</option>
                <option value="NY">NY</option><option value="FL">FL</option><option value="IL">IL</option>
              </select>
            </Field>
            <Field label="城市">
              <select value={selectedWarehouseAddress.city} disabled className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`}>
                <option>{selectedWarehouseAddress.city}</option>
              </select>
            </Field>
            <Field label="地址1" required>
              <input value={selectedWarehouseAddress.address1} readOnly className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`} />
            </Field>
            <Field label="地址2">
              <input value={selectedWarehouseAddress.address2} readOnly className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`} />
            </Field>
            <Field label="邮编" required>
              <input value={selectedWarehouseAddress.zip} readOnly className={`${compactInputClassName} bg-[var(--surface-subtle)] cursor-default`} />
            </Field>
          </div>
        </section>
      )}

      {/* ═══ 折叠面板 ═══ */}
      <div className="mb-4 flex flex-col gap-2">
        {/* 收货地址 */}
        <CollapsibleSection title="收货地址" badge={addressCount > 0 ? `已填${addressCount}项` : undefined} defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Field label="收件人" required><input value={shipToName} onChange={e => setShipToName(e.target.value)} placeholder="Name" className={compactInputClassName} /></Field>
            <Field label="电话"><input value={shipToPhone} onChange={e => setShipToPhone(e.target.value)} placeholder="+1 xxx" className={compactInputClassName} /></Field>
            <Field label="国家" required>
              <select value={shipToCountry} onChange={e => setShipToCountry(e.target.value)} className={compactInputClassName}>
                <option value="US">United States</option><option value="SG">Singapore</option><option value="UK">United Kingdom</option><option value="CN">China</option>
              </select>
            </Field>
            <Field label="州/省">
              <select value={shipToState} onChange={e => setShipToState(e.target.value)} className={compactInputClassName}>
                <option value="">请选择</option>
                <option value="CA">CA</option><option value="NJ">NJ</option><option value="TX">TX</option><option value="WA">WA</option>
                <option value="NY">NY</option><option value="FL">FL</option><option value="IL">IL</option>
              </select>
            </Field>
            <Field label="城市" required>
              <select value={shipToCity} onChange={e => setShipToCity(e.target.value)} className={compactInputClassName}>
                <option value="">请选择</option>
                <option value="Los Angeles">Los Angeles</option><option value="San Francisco">San Francisco</option>
                <option value="New York">New York</option><option value="Houston">Houston</option>
                <option value="Seattle">Seattle</option><option value="Chicago">Chicago</option>
                <option value="Miami">Miami</option><option value="Newark">Newark</option>
              </select>
            </Field>
            <Field label="地址1" required><input value={shipToAddress} onChange={e => setShipToAddress(e.target.value)} placeholder="Street" className={compactInputClassName} /></Field>
            <Field label="地址2"><input value={shipToAddress2} onChange={e => setShipToAddress2(e.target.value)} placeholder="Apt, Suite, Unit, Building (optional)" className={compactInputClassName} /></Field>
            <Field label="邮编" required><input value={shipToZip} onChange={e => setShipToZip(e.target.value)} placeholder="ZIP" className={compactInputClassName} /></Field>
          </div>
        </CollapsibleSection>

        {/* 发货信息 */}
        <CollapsibleSection title="发货信息" badge={shippingCount > 0 ? `已填${shippingCount}项` : undefined}>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Field label="运输方式">
              <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} className={compactInputClassName}>
                <option value="">选择</option><option value="SP">小包裹 (SP)</option><option value="LTL">零担 (LTL)</option><option value="TL">整车 (TL)</option><option value="WILL_CALL">自提</option>
              </select>
            </Field>
            <Field label="承运商">
              <div className="space-y-1">
                <select value={carrierId} onChange={e => { setCarrierId(e.target.value); const m: Record<string, string> = { 'FedEx': 'FEDX', 'UPS': 'UPSN', 'USPS': 'USPS', 'DHL Express': 'DHLX', 'FedEx Freight': 'FXFE', 'Royal Mail': 'ROYM', 'Ninja Van': 'NJVN' }; setCarrierScac(m[e.target.value] || ''); }} className={compactInputClassName}>
                  <option value="">选择承运商</option><option>FedEx</option><option>UPS</option><option>USPS</option><option>DHL Express</option><option>FedEx Freight</option><option>Royal Mail</option><option>Ninja Van</option><option value="__custom">自定义...</option>
                </select>
                {carrierScac && <div className="text-[10px] text-[var(--muted)]">SCAC: <span className="font-mono font-medium text-[var(--foreground)]">{carrierScac}</span></div>}
              </div>
            </Field>
            <Field label="配送服务"><input value={deliveryService} onChange={e => setDeliveryService(e.target.value)} placeholder="Standard / Express" className={compactInputClassName} /></Field>
            <Field label="运费条款">
              <select value={freightTerm} onChange={e => setFreightTerm(e.target.value)} className={compactInputClassName}>
                <option value="PREPAID">PREPAID</option><option value="COLLECT">COLLECT</option><option value="THIRD_PARTY">THIRD_PARTY</option>
              </select>
            </Field>
            <Field label="贸易术语">
              <select value={incoterm} onChange={e => setIncoterm(e.target.value)} className={compactInputClassName}>
                <option value="">N/A</option><option value="DDP">DDP</option><option value="DAP">DAP</option><option value="EXW">EXW</option><option value="FCA">FCA</option>
              </select>
            </Field>
            <Field label="最早发货"><input type="datetime-local" value={shipNotBefore} onChange={e => setShipNotBefore(e.target.value)} className={compactInputClassName} /></Field>
            <Field label="最晚发货"><input type="datetime-local" value={shipNoLater} onChange={e => setShipNoLater(e.target.value)} className={compactInputClassName} /></Field>
            <Field label="必须到达 (MABD)"><input type="date" value={mabd} onChange={e => setMabd(e.target.value)} className={compactInputClassName} /></Field>
          </div>
        </CollapsibleSection>

        {/* 发货要求 */}
        <CollapsibleSection title="发货要求" badge={requirementCount > 0 ? `${requirementCount}项` : undefined}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={isRush} onChange={e => setIsRush(e.target.checked)} className="size-3.5 rounded border-[var(--border)]" /><span className="text-[13px] text-[var(--foreground)]">加急</span></label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={containBattery} onChange={e => setContainBattery(e.target.checked)} className="size-3.5 rounded border-[var(--border)]" /><span className="text-[13px] text-[var(--foreground)]">含电池</span></label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={containHazardous} onChange={e => setContainHazardous(e.target.checked)} className="size-3.5 rounded border-[var(--border)]" /><span className="text-[13px] text-[var(--foreground)]">含危险品</span></label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={isInternational} onChange={e => setIsInternational(e.target.checked)} className="size-3.5 rounded border-[var(--border)]" /><span className="text-[13px] text-[var(--foreground)]">国际</span></label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={autoPush} onChange={e => setAutoPush(e.target.checked)} className="size-3.5 rounded border-[var(--border)]" /><span className="text-[13px] text-[var(--foreground)]">自动推送WMS</span></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Field label="拣货备注"><input value={pickNote} onChange={e => setPickNote(e.target.value)} placeholder="如: 大件需叉车" className={compactInputClassName} /></Field>
              <Field label="打包备注"><input value={packNote} onChange={e => setPackNote(e.target.value)} placeholder="如: 含电池需DG标签" className={compactInputClassName} /></Field>
              <Field label="订单备注"><input value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="通用备注" className={compactInputClassName} /></Field>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* ═══ 商品明细 ═══ */}
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)]">商品明细</h2>
            <span className="text-[12px] text-[var(--muted)]">{items.length} 行 · {items.reduce((s, i) => s + i.qty, 0)} 件</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedItemRows.size > 0 && (
              <button type="button" onClick={() => setShowBatchEdit(!showBatchEdit)} className="inline-flex items-center gap-1 rounded-md border border-[var(--primary)] bg-[var(--primary-soft)] px-2 py-1 text-[12px] font-medium text-[var(--primary)] transition hover:opacity-80">
                批量设置 ({selectedItemRows.size})
              </button>
            )}
            <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"><Plus className="size-3" />手动添加</button>
            <button type="button" onClick={() => setShowProductModal(true)} className="inline-flex items-center gap-1 rounded-md bg-[var(--primary)] px-2 py-1 text-[12px] font-semibold text-white transition hover:opacity-90"><Search className="size-3" />搜索添加</button>
          </div>
        </div>

        {showBatchEdit && selectedItemRows.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
            <span className="text-[12px] font-medium text-[var(--primary)]">批量设置 {selectedItemRows.size} 行：</span>
            <input type="number" min={1} value={batchEditQty} onChange={e => setBatchEditQty(e.target.value)} placeholder="数量" className="w-[70px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
            <select value={batchEditUom} onChange={e => setBatchEditUom(e.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] outline-none"><option value="">单位</option><option>件</option><option>箱</option><option>板</option><option>kg</option></select>
            <input value={batchEditLotNo} onChange={e => setBatchEditLotNo(e.target.value)} placeholder="批次号" className="w-[100px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
            <button type="button" onClick={applyBatchEdit} className="rounded-md bg-[var(--primary)] px-2.5 py-1 text-[12px] font-medium text-white transition hover:opacity-90">应用</button>
            <button type="button" onClick={() => setShowBatchEdit(false)} className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]">取消</button>
          </div>
        )}

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[13px]">
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 w-8"><input type="checkbox" checked={selectedItemRows.size === items.length && items.length > 0} onChange={toggleAllItems} className="size-3.5 rounded border-[var(--border)]" /></th>
                  <th className="whitespace-nowrap px-2 py-2 w-8">#</th>
                  <th className="whitespace-nowrap px-2 py-2">商品ID / SKU</th>
                  <th className="whitespace-nowrap px-2 py-2">商品名称</th>
                  <th className="whitespace-nowrap px-2 py-2 w-[72px]">数量 *</th>
                  <th className="whitespace-nowrap px-2 py-2 w-[60px]">单位 *</th>
                  <th className="whitespace-nowrap px-2 py-2">批次号</th>
                  <th className="whitespace-nowrap px-2 py-2">序列号</th>
                  <th className="whitespace-nowrap px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {items.map((item, idx) => (
                  <tr key={item.id} className={cn('transition-colors hover:bg-[var(--surface-subtle)]', selectedItemRows.has(item.id) && 'bg-[var(--primary-soft)]/20')}>
                    <td className="px-3 py-2"><input type="checkbox" checked={selectedItemRows.has(item.id)} onChange={() => toggleItemRow(item.id)} className="size-3.5 rounded border-[var(--border)]" /></td>
                    <td className="px-2 py-2 text-[var(--muted)]">{idx + 1}</td>
                    <td className="px-2 py-2"><input value={item.itemId} onChange={e => updateItem(item.id, 'itemId', e.target.value)} placeholder="SKU" className={compactInputClassName} /></td>
                    <td className="px-2 py-2"><input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="名称" className={compactInputClassName} /></td>
                    <td className="px-2 py-2"><input type="number" min={1} value={item.qty} onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)} className={compactInputClassName} /></td>
                    <td className="px-2 py-2"><select value={item.uom} onChange={e => updateItem(item.id, 'uom', e.target.value)} className={compactInputClassName}><option>件</option><option>箱</option><option>板</option><option>kg</option></select></td>
                    <td className="px-2 py-2"><input value={item.lotNo} onChange={e => updateItem(item.id, 'lotNo', e.target.value)} placeholder="批次" className={compactInputClassName} /></td>
                    <td className="px-2 py-2"><input value={item.snList} onChange={e => updateItem(item.id, 'snList', e.target.value)} placeholder="SN" className={compactInputClassName} /></td>
                    <td className="px-2 py-2"><button type="button" onClick={() => removeItem(item.id)} className="inline-flex size-6 items-center justify-center rounded text-[var(--muted)] transition hover:bg-red-50 hover:text-[var(--danger)]"><Trash2 className="size-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Package className="mx-auto size-10 text-[var(--border)]" />
            <p className="mt-3 text-[14px] font-medium text-[var(--foreground)]">暂无商品</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">"搜索添加"从商品库批量选择，或"手动添加"逐行录入</p>
            <button type="button" onClick={() => setShowProductModal(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"><Search className="size-3.5" />搜索添加商品</button>
          </div>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5 text-[12px]">
            <span className="text-[var(--muted)]">合计</span>
            <div className="flex items-center gap-6">
              <span className="text-[var(--foreground)]">{items.length} 行</span>
              <span className="font-medium text-[var(--foreground)]">{items.reduce((s, i) => s + i.qty, 0)} 件</span>
            </div>
          </div>
        )}
      </section>

      {/* ═══ 底部固定操作栏 ═══ */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3 text-[12px] text-[var(--muted)]">
            <span>{items.length} 行商品</span><span>·</span><span>{items.reduce((s, i) => s + i.qty, 0)} 件</span>
            {!autoPush && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-200">手动推送</span>}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/outbound" className="h-8 inline-flex items-center rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">取消</Link>
            <button className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">暂存</button>
            <button className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90">{autoPush ? '提交并推送' : '提交'}</button>
          </div>
        </div>
      </div>

      <ProductSearchModal open={showProductModal} onClose={() => setShowProductModal(false)} onConfirm={handleAddProducts} existingIds={items.map(i => i.itemId)} />
    </div>
  );
}
