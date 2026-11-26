'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  returnReasonLabels,
  returnTypeLabels,
  shipMethodLabels,
  warehouseReturnAddresses,
  type ReturnReason,
  type ReturnType,
  type ReturnShipMethod,
} from '@/lib/mock-data/return-orders';

// ─── 样式常量（与 orders/new 完全一致） ─────────────────────────────────────

const inputCls = [
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)]',
  'px-3 py-2 text-[13px] text-[var(--foreground)]',
  'placeholder:text-[var(--muted-foreground)]',
  'transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]',
].join(' ');

const selectCls = [
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)]',
  'px-3 py-2 text-[13px] text-[var(--foreground)]',
  'transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]',
].join(' ');

const cardCls = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]';

// ─── 类型 ────────────────────────────────────────────────────────────────────

type ReturnItem = {
  _key: string;
  lineItemId: string;
  sku: string;
  title: string;
  variantTitle: string;
  maxQty: number;
  quantity: number;
  reason: ReturnReason;
};

/** 换货：替换商品行（新发出的商品） */
type ExchangeItem = {
  _key: string;
  sku: string;
  title: string;
  variantTitle: string;
  quantity: number;
  note: string;
};

// ─── Mock 源订单数据 ──────────────────────────────────────────────────────────

type SourceOrderLine = {
  lineItemId: string;
  sku: string;
  title: string;
  variantTitle: string;
  orderedQty: number;
};

type SourceOrder = {
  id: string;
  orderNo: string;
  customer: string;
  company?: string;
  channel: string;
  merchant: string;
  currency: string;
  originalShippingAddress?: import('@/lib/mock-data/return-orders').ReturnAddress;
  lines: SourceOrderLine[];
};

const mockOrders: SourceOrder[] = [
  {
    id: 'so_007', orderNo: 'SO-20260603-0007', customer: 'Robert Taylor', company: '', channel: 'Shopify', merchant: 'US Store', currency: 'USD',
    originalShippingAddress: { recipientName: 'Robert Taylor', phone: '+1 617-555-0190', addressLine1: '88 Atlantic Ave', city: 'Boston', state: 'MA', postalCode: '02110', countryCode: 'US', country: 'United States' },
    lines: [
      { lineItemId: 'li_073', sku: 'HL-LED-400', title: 'Headlamp', variantTitle: '400 Lumen / USB-C', orderedQty: 2 },
      { lineItemId: 'li_074', sku: 'HL-ACC-USB', title: 'Headlamp Charging Cable', variantTitle: 'USB-C 1m', orderedQty: 1 },
    ],
  },
  {
    id: 'so_010', orderNo: 'SO-20260601-0010', customer: 'Kevin Park', company: '', channel: 'Shopify', merchant: 'SG Store', currency: 'SGD',
    originalShippingAddress: { recipientName: 'Kevin Park', phone: '+65 9123 4567', addressLine1: '12 Orchard Road', addressLine2: '#08-01', city: 'Singapore', postalCode: '238801', countryCode: 'SG', country: 'Singapore' },
    lines: [
      { lineItemId: 'li_101', sku: 'KK-SET-PRO', title: 'Kitchen Knife Set', variantTitle: 'Professional / 8-piece / German Steel', orderedQty: 1 },
    ],
  },
  {
    id: 'so_011', orderNo: 'SO-20260601-0011', customer: 'Tom Harris', company: '', channel: 'Amazon', merchant: 'US Amazon', currency: 'USD',
    originalShippingAddress: { recipientName: 'Tom Harris', phone: '+1 312-555-0177', addressLine1: '233 S Wacker Dr', city: 'Chicago', state: 'IL', postalCode: '60606', countryCode: 'US', country: 'United States' },
    lines: [
      { lineItemId: 'li_111', sku: 'GM-PRO-BLK', title: 'Gaming Mouse', variantTitle: 'Black / 25600 DPI / Wireless', orderedQty: 1 },
      { lineItemId: 'li_112', sku: 'GM-PAD-XL', title: 'Gaming Mouse Pad XL', variantTitle: 'Black / 900×400mm', orderedQty: 1 },
    ],
  },
  {
    id: 'so_031', orderNo: 'SO-20260820-0031', customer: 'James Wong', company: 'Acme Retail Co., Ltd.', channel: 'Direct', merchant: 'B2B Direct', currency: 'USD',
    originalShippingAddress: { recipientName: 'James Wong', company: 'Acme Retail Co., Ltd.', phone: '+1 312-555-0188', addressLine1: '1234 Commerce Blvd', city: 'Chicago', state: 'IL', postalCode: '60601', countryCode: 'US', country: 'United States' },
    lines: [
      { lineItemId: 'li_311', sku: 'OF-DSK-WLN-XL', title: 'Office Desk (Walnut)', variantTitle: 'XL 180cm / Solid Wood', orderedQty: 3 },
      { lineItemId: 'li_312', sku: 'OF-CHR-ERG-BLK', title: 'Ergonomic Chair', variantTitle: 'Black / Mesh / Lumbar Support', orderedQty: 5 },
      { lineItemId: 'li_313', sku: 'OF-LAMP-DSK-BLK', title: 'Desk Lamp', variantTitle: 'Black / Wireless Charging', orderedQty: 8 },
    ],
  },
  {
    id: 'so_035', orderNo: 'SO-20260901-0035', customer: 'Lisa Park', company: 'TechSupply Korea', channel: 'Direct', merchant: 'B2B Direct', currency: 'USD',
    originalShippingAddress: { recipientName: 'Lisa Park', company: 'TechSupply Korea', phone: '+82 2-555-0100', addressLine1: '100 Teheran-ro', addressLine2: 'Gangnam-gu', city: 'Seoul', postalCode: '06234', countryCode: 'KR', country: 'South Korea' },
    lines: [
      { lineItemId: 'li_351', sku: 'SV-ENT-PRO-Y1', title: 'Software License – Enterprise Pro', variantTitle: '1-Year / Unlimited Users', orderedQty: 10 },
    ],
  },
];

// ─── 商品选择弹窗（复用 orders/new 的交互模式） ──────────────────────────────

function ItemPickerModal({
  open, orderLines, existingKeys, onClose, onConfirm,
}: {
  open: boolean;
  orderLines: SourceOrderLine[];
  existingKeys: string[];         // 已添加的 lineItemId 列表
  onClose: () => void;
  onConfirm: (lines: SourceOrderLine[]) => void;
}) {
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setSelected(new Set()); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return orderLines;
    const q = query.toLowerCase();
    return orderLines.filter((l) => l.sku.toLowerCase().includes(q) || l.title.toLowerCase().includes(q));
  }, [query, orderLines]);

  const isAdded  = (id: string) => existingKeys.includes(id);
  const toggle   = (id: string) => { if (isAdded(id)) return; setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const available  = filtered.filter((l) => !isAdded(l.lineItemId));
  const allChecked = available.length > 0 && available.every((l) => selected.has(l.lineItemId));
  const toggleAll  = () => allChecked
    ? setSelected((prev) => { const n = new Set(prev); available.forEach((l) => n.delete(l.lineItemId)); return n; })
    : setSelected((prev) => { const n = new Set(prev); available.forEach((l) => n.add(l.lineItemId)); return n; });

  const handleConfirm = () => {
    onConfirm(orderLines.filter((l) => selected.has(l.lineItemId)));
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="mx-4 flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        style={{ maxHeight: 'min(80vh, 600px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">选择退货商品</h3>
          <button type="button" onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
            <X className="size-4" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索 SKU 或商品名称…"
              className={cn(inputCls, 'pl-9')} />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 列表头 */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2">
          <input type="checkbox" checked={allChecked} onChange={toggleAll}
            className="size-3.5 accent-[var(--primary)]" />
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">商品</span>
          <span className="w-16 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">已下单</span>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14">
              <Package className="size-8 text-[var(--border)]" />
              <p className="text-[13px] text-[var(--muted)]">未找到匹配商品</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((line) => {
                const added   = isAdded(line.lineItemId);
                const checked = selected.has(line.lineItemId);
                return (
                  <label key={line.lineItemId}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors select-none',
                      added   ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--surface-subtle)]',
                      checked && !added && 'bg-[var(--primary-soft)]',
                    )}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(line.lineItemId)}
                      disabled={added} className="size-3.5 accent-[var(--primary)]" />
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]">
                      <Package className="size-4 text-[var(--muted-foreground)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{line.title}</span>
                        {line.variantTitle && (
                          <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-[var(--border-subtle)]">
                            {line.variantTitle}
                          </span>
                        )}
                        {added && (
                          <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">已添加</span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{line.sku}</p>
                    </div>
                    <span className="w-16 text-right text-[13px] font-medium text-[var(--foreground)]">× {line.orderedQty}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">
            {selected.size > 0 ? `已选 ${selected.size} 件商品` : `共 ${filtered.length} 件商品`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
              取消
            </button>
            <button type="button" onClick={handleConfirm} disabled={selected.size === 0}
              className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
              添加{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 页面 ─────────────────────────────────────────────────────────────────────

export default function NewReturnPage() {
  const router = useRouter();

  // ── 第一块：退单信息 ──
  const [orderSearch, setOrderSearch]       = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [showOrderDrop, setShowOrderDrop]   = useState(false);
  const [returnType, setReturnType]         = useState<ReturnType>('return_refund');
  const [shipMethod, setShipMethod]         = useState<ReturnShipMethod>('prepaid_label');
  const [warehouse, setWarehouse]           = useState('US-West-SEA');
  const [preferredCarrier, setPreferredCarrier] = useState('');
  const [refundMethod, setRefundMethod]     = useState('原路返回');
  const [refundShipping, setRefundShipping] = useState(false);
  // B2B
  const [buyerPoNo, setBuyerPoNo]           = useState('');
  const [contractNo, setContractNo]         = useState('');
  const [approvalLevel, setApprovalLevel]   = useState(1);

  // ── 第二块：商品明细 ──
  const [items, setItems]           = useState<ReturnItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  // 换货商品（新发出的替换品）
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);

  // ── 第三块：备注 ──
  const [internalNote, setInternalNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const selectedOrder = mockOrders.find((o) => o.id === selectedOrderId);
  // B2B 根据订单数据自动识别（有公司名即为 B2B），无需手动切换
  const isB2B = !!(selectedOrder?.company);
  const orderSearchFiltered = mockOrders.filter(
    (o) => !orderSearch ||
      o.orderNo.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.company ?? '').toLowerCase().includes(orderSearch.toLowerCase()),
  );

  const noReturnNeeded = returnType === 'refund_only' || shipMethod === 'no_return_needed';
  const isValid = !!selectedOrderId && items.length > 0 && items.every((i) => i.quantity >= 1);

  const removeItem    = (key: string) => setItems((prev) => prev.filter((i) => i._key !== key));
  const updateItem    = (key: string, patch: Partial<ReturnItem>) => setItems((prev) => prev.map((i) => i._key === key ? { ...i, ...patch } : i));

  const handlePickerConfirm = (lines: typeof mockOrders[0]['lines']) => {
    const existing = new Set(items.map((i) => i.lineItemId));
    const toAdd: ReturnItem[] = lines
      .filter((l) => !existing.has(l.lineItemId))
      .map((l) => ({
        _key: `${l.lineItemId}_${Date.now()}`,
        lineItemId: l.lineItemId,
        sku: l.sku,
        title: l.title,
        variantTitle: l.variantTitle,
        maxQty: l.orderedQty,
        quantity: l.orderedQty,
        reason: 'quality_issue' as ReturnReason,
      }));
    setItems((prev) => [...prev, ...toAdd]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); router.push('/dashboard/returns'); }, 1200);
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* ── 顶部导航 ── */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/returns"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
            <ArrowLeft className="size-3.5" />退货列表
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-[13px] font-semibold text-[var(--foreground)]">新建退货 / 售后申请</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/returns"
            className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            取消
          </Link>
          <button type="submit" disabled={!isValid || submitting}
            className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50">
            {submitting ? '提交中…' : '提交申请'}
          </button>
        </div>
      </div>

      {/* ── 两栏：左主区域 + 右侧边栏 ── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
      {/* ═══ 左：主表单区域 ═══ */}
      <div className="space-y-4">

      {/* ════════════════════════════════════════════════════════
          第一块：退单信息
      ════════════════════════════════════════════════════════ */}
      <section className={cardCls}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">退单信息</h2>
        </div>

        <div className="space-y-5 p-5">

          {/* 退货类型 */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              退货类型 <span className="text-[var(--danger)]">*</span>
            </label>
            <select value={returnType}
              onChange={(e) => { const v = e.target.value as ReturnType; setReturnType(v); if (v === 'refund_only') setShipMethod('no_return_needed'); }}
              className={selectCls}>
              {(Object.entries(returnTypeLabels) as [ReturnType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* 关联订单 */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              关联销售订单 <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedOrder
                  ? `${selectedOrder.orderNo}  ·  ${selectedOrder.customer}${selectedOrder.company ? '  /  ' + selectedOrder.company : ''}`
                  : orderSearch}
                onChange={(e) => { setOrderSearch(e.target.value); setSelectedOrderId(''); setItems([]); setShowOrderDrop(true); }}
                onFocus={() => setShowOrderDrop(true)}
                placeholder="输入订单号 / 客户名 搜索…"
                className={cn(inputCls, 'pr-8')}
                readOnly={!!selectedOrderId}
              />
              {selectedOrderId
                ? <button type="button" onClick={() => { setSelectedOrderId(''); setOrderSearch(''); setItems([]); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                    <X className="size-3.5" />
                  </button>
                : <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)]" />
              }

              {/* 下拉列表 */}
              {showOrderDrop && !selectedOrderId && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
                  onMouseDown={(e) => e.preventDefault()}>
                  {orderSearchFiltered.length === 0
                    ? <p className="px-4 py-3 text-[12px] text-[var(--muted)]">未找到匹配订单</p>
                    : orderSearchFiltered.map((o) => (
                      <button key={o.id} type="button"
                        onClick={() => { setSelectedOrderId(o.id); setShowOrderDrop(false); setOrderSearch(''); setItems([]); }}
                        className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-subtle)]">
                        <Package className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[var(--foreground)]">{o.orderNo}</span>
                            {o.company && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">B2B</span>}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {o.customer}{o.company ? ` · ${o.company}` : ''} · {o.channel} / {o.merchant}
                          </div>
                        </div>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {/* 选中订单摘要 + 自动识别客户类型 */}
            {selectedOrder && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)]">
                <span>渠道：<strong className="text-[var(--foreground)]">{selectedOrder.channel}</strong></span>
                <span>店铺：<strong className="text-[var(--foreground)]">{selectedOrder.merchant}</strong></span>
                <span>币种：<strong className="text-[var(--foreground)]">{selectedOrder.currency}</strong></span>
                <span className="ml-auto flex items-center gap-1.5">
                  客户类型：
                  {isB2B
                    ? <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">B2B 企业客户</span>
                    : <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">B2C 消费者</span>}
                  <span className="text-[10px] text-[var(--muted)]">（自动识别）</span>
                </span>
              </div>
            )}
          </div>

          {/* 地址信息移至独立卡片，此处仅显示订单摘要 */}

          {/* 物流信息（非仅退款时显示） */}
          {!noReturnNeeded && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">寄回方式</label>
                <select value={shipMethod} onChange={(e) => setShipMethod(e.target.value as ReturnShipMethod)} className={selectCls}>
                  {(Object.entries(shipMethodLabels) as [ReturnShipMethod, string][])
                    .filter(([k]) => k !== 'no_return_needed')
                    .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">收货仓库</label>
                <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={selectCls}>
                  {['US-West-SEA', 'US-East-EWR', 'US-Central-DFW', 'UK-London', 'SG-Central', 'DE-Frankfurt'].map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">偏好承运商</label>
                <select value={preferredCarrier} onChange={(e) => setPreferredCarrier(e.target.value)} className={selectCls}>
                  <option value="">系统自动选择</option>
                  {['UPS', 'FedEx', 'USPS', 'Royal Mail', 'DHL', 'DPD', 'Ninja Van', 'FedEx Freight'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">退款方式</label>
                <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className={selectCls}>
                  <option value="原路返回">原路返回</option>
                  <option value="信用票据 (Credit Memo)">信用票据 (Credit Memo)</option>
                  <option value="商店积分">商店积分</option>
                  <option value="换货">换货</option>
                  <option value="银行转账">银行转账</option>
                </select>
              </div>
            </div>
          )}

          {/* 仅退款时的退款方式 */}
          {noReturnNeeded && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">退款方式</label>
                <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className={selectCls}>
                  <option value="原路返回">原路返回</option>
                  <option value="信用票据 (Credit Memo)">信用票据 (Credit Memo)</option>
                  <option value="商店积分">商店积分</option>
                  <option value="银行转账">银行转账</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-7">
                <input type="checkbox" id="refund_shipping" checked={refundShipping}
                  onChange={(e) => setRefundShipping(e.target.checked)}
                  className="size-4 rounded border-[var(--border)]" />
                <label htmlFor="refund_shipping" className="text-[13px] text-[var(--foreground)]">含运费退款</label>
              </div>
            </div>
          )}

          {/* B2B 专属 */}
          {isB2B && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
              <p className="mb-3 text-[12px] font-semibold text-blue-800">B2B 专属信息</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-600">买方采购单号（PO）</label>
                  <input value={buyerPoNo} onChange={(e) => setBuyerPoNo(e.target.value)}
                    placeholder="如 PO-ACME-2026-0001"
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-[13px] text-[var(--foreground)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-600">合同编号</label>
                  <input value={contractNo} onChange={(e) => setContractNo(e.target.value)}
                    placeholder="如 CTR-2026-US-0001"
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-[13px] text-[var(--foreground)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-600">审批层级</label>
                  <select value={approvalLevel} onChange={(e) => setApprovalLevel(Number(e.target.value))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-[13px] text-[var(--foreground)] focus:border-blue-400 focus:outline-none">
                    <option value={1}>1 级 — 直属主管</option>
                    <option value={2}>2 级 — 部门经理</option>
                    <option value={3}>3 级 — 财务总监</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          第二块：商品明细
      ════════════════════════════════════════════════════════ */}
      <section className={cardCls}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--foreground)]">商品明细</h2>
            {items.length > 0 && (
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{items.length} 种商品 · 共 {totalItems} 件</p>
            )}
          </div>
          <button type="button"
            onClick={() => { if (!selectedOrderId) { alert('请先选择关联订单'); return; } setShowPicker(true); }}
            className={cn('flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
              selectedOrderId
                ? 'bg-[var(--primary)] text-white hover:opacity-90'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] cursor-not-allowed')}>
            <Plus className="size-3.5" />添加商品
          </button>
        </div>

        {/* 空态 */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
              <Package className="size-5 text-[var(--muted)]" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-[var(--foreground)]">尚未添加退货商品</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              {selectedOrderId ? '点击右上角「添加商品」从原订单中选择' : '请先选择关联销售订单'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[13px]">
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-2.5 text-left">商品</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center">退货数量</th>
                  <th className="whitespace-nowrap px-3 py-2.5">退货原因</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {items.map((item) => (
                  <tr key={item._key} className="hover:bg-[var(--surface-subtle)]">
                    {/* 商品 */}
                    <td className="px-5 py-3">
                      <div className="font-medium text-[var(--foreground)]">{item.title}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                        {item.variantTitle && <span>{item.variantTitle} · </span>}
                        <span className="font-mono">{item.sku}</span>
                      </div>
                    </td>

                    {/* 数量 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => updateItem(item._key, { quantity: Math.max(1, item.quantity - 1) })}
                          className="flex size-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                          −
                        </button>
                        <input type="number" min={1} max={item.maxQty} value={item.quantity}
                          onChange={(e) => updateItem(item._key, { quantity: Math.min(item.maxQty, Math.max(1, Number(e.target.value))) })}
                          className="w-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-center text-[13px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none" />
                        <button type="button" onClick={() => updateItem(item._key, { quantity: Math.min(item.maxQty, item.quantity + 1) })}
                          className="flex size-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                          +
                        </button>
                        <span className="ml-1 text-[11px] text-[var(--muted)]">/ {item.maxQty}</span>
                      </div>
                    </td>

                    {/* 原因 */}
                    <td className="px-3 py-3">
                      <select value={item.reason}
                        onChange={(e) => updateItem(item._key, { reason: e.target.value as ReturnReason })}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[12px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none">
                        {(Object.entries(returnReasonLabels) as [ReturnReason, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>

                    {/* 删除 */}
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => removeItem(item._key)}
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border)] bg-[var(--surface-subtle)]">
                  <td className="px-5 py-2.5 text-[12px] font-semibold text-[var(--muted-foreground)]">合计</td>
                  <td className="px-3 py-2.5 text-center text-[13px] font-bold text-[var(--foreground)]">{totalItems} 件</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ════ 换货商品（仅换货类型显示） ════ */}
      {returnType === 'exchange' && (
        <section className={cardCls}>
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">换货商品（新发出）</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">指定客户希望换取的商品。审批通过后，系统将生成换货发货单（新销售订单）。</p>
            </div>
            <button type="button"
              onClick={() => setExchangeItems((prev) => [...prev, { _key: Date.now().toString(), sku: '', title: '', variantTitle: '', quantity: 1, note: '' }])}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
              <Plus className="size-3.5" />添加换货商品
            </button>
          </div>

          {exchangeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
                <svg className="size-5 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              <p className="mt-2 text-[13px] font-medium text-[var(--foreground)]">尚未添加换货商品</p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">点击「添加换货商品」指定替换品的 SKU 和数量</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[13px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-2.5 text-left">换货 SKU / 商品名称</th>
                    <th className="whitespace-nowrap px-3 py-2.5">规格</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-center">数量</th>
                    <th className="whitespace-nowrap px-3 py-2.5">备注</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {exchangeItems.map((item) => (
                    <tr key={item._key} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-5 py-3">
                        <input value={item.title || item.sku} onChange={(e) => setExchangeItems((prev) => prev.map((i) => i._key === item._key ? { ...i, title: e.target.value, sku: e.target.value } : i))}
                          placeholder="SKU 或商品名称" required className={inputCls} />
                      </td>
                      <td className="px-3 py-3">
                        <input value={item.variantTitle} onChange={(e) => setExchangeItems((prev) => prev.map((i) => i._key === item._key ? { ...i, variantTitle: e.target.value } : i))}
                          placeholder="如 Black / XL" className="w-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[12px] focus:border-[var(--primary)] focus:outline-none" />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => setExchangeItems((prev) => prev.map((i) => i._key === item._key ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                            className="flex size-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">−</button>
                          <span className="w-8 text-center text-[13px] font-medium">{item.quantity}</span>
                          <button type="button" onClick={() => setExchangeItems((prev) => prev.map((i) => i._key === item._key ? { ...i, quantity: i.quantity + 1 } : i))}
                            className="flex size-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">+</button>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <input value={item.note} onChange={(e) => setExchangeItems((prev) => prev.map((i) => i._key === item._key ? { ...i, note: e.target.value } : i))}
                          placeholder="颜色/尺寸说明等" className="w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[12px] focus:border-[var(--primary)] focus:outline-none" />
                      </td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => setExchangeItems((prev) => prev.filter((i) => i._key !== item._key))}
                          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {exchangeItems.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] bg-amber-50/60 px-5 py-3 text-[12px] text-amber-800">
              <strong>换货逻辑说明：</strong> 旧品退回流程（物流→QC→入库）与正常退货相同；换货商品审批后系统自���创建换货发货单，由发货模块处理出库。
            </div>
          )}
        </section>
      )}

      {/* ════ 第三块：备注 ════ */}
      <section className={cn(cardCls, 'mb-6')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">备注</h2>
        </div>
        <div className="p-5">
          <textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={4}
            placeholder="仅内部可见，填写处理说明或与客户沟通记录…"
            className={cn(inputCls, 'resize-none')}
          />
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">此备注对客户不可见，仅供内部团队参考。</p>
        </div>
      </section>

      {/* ═══ 右：侧边栏 ═══ */}
      </div>
      <div className="space-y-4">

        {/* 地址信息 */}
        {selectedOrder && (
          <section className={cardCls}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="text-[13px] font-semibold">地址信息</h2>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">客户收货地址 · 退货收件地址</p>
            </div>
            <div className="space-y-4 p-4">
              {/* 客户原收货地址 */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">客户原收货地址</p>
                {selectedOrder.originalShippingAddress ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-2.5 text-[11px] space-y-0.5">
                    <div className="font-semibold text-[var(--foreground)]">{selectedOrder.originalShippingAddress.recipientName}</div>
                    {selectedOrder.originalShippingAddress.company && <div className="text-[var(--muted)]">{selectedOrder.originalShippingAddress.company}</div>}
                    <div>{selectedOrder.originalShippingAddress.addressLine1}</div>
                    {selectedOrder.originalShippingAddress.addressLine2 && <div>{selectedOrder.originalShippingAddress.addressLine2}</div>}
                    <div>{selectedOrder.originalShippingAddress.city}{selectedOrder.originalShippingAddress.state ? `, ${selectedOrder.originalShippingAddress.state}` : ''} {selectedOrder.originalShippingAddress.postalCode}</div>
                    <div className="text-[var(--muted)]">{selectedOrder.originalShippingAddress.country}</div>
                    {selectedOrder.originalShippingAddress.phone && <div className="text-[var(--muted)]">{selectedOrder.originalShippingAddress.phone}</div>}
                  </div>
                ) : <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-2.5 text-[11px] text-[var(--muted)]">暂无地址信息</div>}
              </div>

              {/* 退货收件地址 */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {noReturnNeeded ? '退货收件地址' : '退货收件地址（客户须寄往）'}
                </p>
                {noReturnNeeded ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-2.5 text-[11px] text-[var(--muted)]">此类型无需寄回</div>
                ) : (() => {
                  const addr = warehouseReturnAddresses[warehouse];
                  return addr ? (
                    <div className="rounded-lg border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-2.5 text-[11px] space-y-0.5">
                      <div className="font-semibold text-[var(--primary)]">{addr.recipientName}</div>
                      {addr.company && <div className="text-[var(--muted)]">{addr.company}</div>}
                      <div>{addr.addressLine1}</div>
                      {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                      <div>{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode}</div>
                      <div className="text-[var(--muted)]">{addr.country}</div>
                      {addr.phone && <div className="text-[var(--muted)]">{addr.phone}</div>}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-2.5 text-[11px] text-[var(--muted)]">请选择收货仓库</div>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* 申请摘要 */}
        <section className={cardCls}>
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
            <h2 className="text-[13px] font-semibold">申请摘要</h2>
          </div>
          <div className="p-4 space-y-2.5 text-[12px]">
            <div className="flex justify-between"><span className="text-[var(--muted)]">客户类型</span><span className="font-medium text-[var(--foreground)]">{isB2B ? 'B2B 企业' : 'B2C 消费者'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">退货类型</span><span className="font-medium">{returnTypeLabels[returnType]}</span></div>
            {!noReturnNeeded && <div className="flex justify-between"><span className="text-[var(--muted)]">寄回方式</span><span className="font-medium text-right max-w-[150px]">{shipMethodLabels[shipMethod as ReturnShipMethod]}</span></div>}
            {!noReturnNeeded && <div className="flex justify-between"><span className="text-[var(--muted)]">收货仓库</span><span className="font-mono text-[11px] font-medium">{warehouse}</span></div>}
            <div className="flex justify-between"><span className="text-[var(--muted)]">退款方式</span><span className="font-medium text-right max-w-[150px]">{refundMethod}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">退货商品</span><span className="font-medium">{items.reduce((s, i) => s + i.quantity, 0)} 件</span></div>
            {isB2B && buyerPoNo && <div className="flex justify-between"><span className="text-[var(--muted)]">采购单号</span><span className="font-mono text-[11px]">{buyerPoNo}</span></div>}
          </div>
          <div className="border-t border-[var(--border-subtle)] px-4 py-3 text-[11px] text-[var(--muted)]">
            {!isValid
              ? (!selectedOrderId ? '请选择关联订单' : '请至少添加一件退货商品')
              : <span className="text-[var(--success)]">✓ 信息完整，可提交申请</span>}
          </div>
        </section>

        {/* 提交 */}
        <button type="submit" disabled={!isValid || submitting}
          className="w-full h-10 rounded-xl bg-[var(--primary)] text-[14px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 transition">
          {submitting ? '提交中…' : '提交退货申请'}
        </button>
        <Link href="/dashboard/returns"
          className="block w-full h-10 rounded-xl border border-[var(--border)] text-center text-[13px] font-medium text-[var(--foreground)] leading-10 hover:bg-[var(--surface-hover)] transition">
          取消
        </Link>
      </div>
      </div>{/* end grid */}

      {/* ── 商品选择弹窗 ── */}
      <ItemPickerModal
        open={showPicker}
        orderLines={selectedOrder?.lines ?? []}
        existingKeys={items.map((i) => i.lineItemId)}
        onClose={() => setShowPicker(false)}
        onConfirm={handlePickerConfirm}
      />

    </form>
  );
}
