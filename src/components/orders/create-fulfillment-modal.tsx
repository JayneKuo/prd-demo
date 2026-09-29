'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Check, ChevronDown, Info, Package, Printer, Warehouse, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderDetail, OrderLineItem, FulfillmentPackage } from '@/lib/mock-data/order-details';
import { warehouses, skuInventory, carrierOptions, getBestWarehousesForSku, type CarrierOption } from '@/lib/mock-data/warehouses';

// ─── 类型 ────────────────────────────────────────────────────────────────────

export type FulfillmentLineAlloc = {
  lineItemId: string;
  sku: string;
  title: string;
  quantity: number;           // 本次分配数量
  maxQty: number;             // 可分配上限（订单数量 - 已履约）
  warehouseId: string;
  warehouseCode: string;
  available: number;          // 所选仓库可用库存
  hasStock: boolean;
};

export type FulfillmentGroup = {
  id: string;                 // 临时 ID
  warehouseId: string;
  warehouseCode: string;
  carrierId: string;
  lines: FulfillmentLineAlloc[];
  totalWeight: number;        // kg
  note: string;
};

export type CreateFulfillmentResult = {
  groups: FulfillmentGroup[];
  fulfillments: Omit<FulfillmentPackage, 'id'>[];
};

interface Props {
  detail: OrderDetail;
  onConfirm: (result: CreateFulfillmentResult) => void;
  onClose: () => void;
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

function generateFulfillmentNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `FO-${date}-${seq}`;
}

function generateOutboundNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `OB-${date}-${seq}`;
}

/** 根据 SKU 和仓库找库存 */
function getAvailable(sku: string, warehouseId: string): number {
  return skuInventory.find((s) => s.sku === sku && s.warehouseId === warehouseId)?.available ?? 0;
}

/** 估算商品重量（kg），从 lineItem.weight(g) 转换 */
function getItemWeight(item: OrderLineItem): number {
  return (item.weight / 1000) * item.quantity;
}

// ─── 自动分配建议算法 ─────────────────────────────────────────────────────────

function autoAllocate(items: OrderLineItem[]): FulfillmentGroup[] {
  // 按仓库聚合，优先把所有商品放到同一仓库
  const warehouseScore: Record<string, number> = {};

  for (const item of items) {
    const inv = getBestWarehousesForSku(item.sku);
    for (const i of inv) {
      const canFulfill = i.available >= item.quantity ? 2 : (i.available > 0 ? 1 : 0);
      warehouseScore[i.warehouseId] = (warehouseScore[i.warehouseId] ?? 0) + canFulfill;
    }
  }

  // 找评分最高的仓库
  const bestWhId = Object.entries(warehouseScore).sort((a, b) => b[1] - a[1])[0]?.[0];
  const wh = warehouses.find((w) => w.id === bestWhId);
  if (!wh) return [];

  const lines: FulfillmentLineAlloc[] = items.map((item) => {
    const av = getAvailable(item.sku, bestWhId);
    return {
      lineItemId: item.id,
      sku: item.sku,
      title: item.title + (item.variantTitle ? ` / ${item.variantTitle}` : ''),
      quantity: Math.min(item.quantity, av),
      maxQty: item.quantity,
      warehouseId: bestWhId,
      warehouseCode: wh.code,
      available: av,
      hasStock: av >= item.quantity,
    };
  });

  const totalWeight = items.reduce((s, i) => s + getItemWeight(i), 0);
  const defaultCarrier = carrierOptions[bestWhId]?.[0];

  const group: FulfillmentGroup = {
    id: `fg_${Date.now()}`,
    warehouseId: bestWhId,
    warehouseCode: wh.code,
    carrierId: defaultCarrier?.id ?? '',
    lines,
    totalWeight,
    note: '',
  };

  // 如果有商品在该仓无库存，把它们拆到第二个最优仓库
  const noStockLines = lines.filter((l) => l.available < l.maxQty);
  if (noStockLines.length === 0) return [group];

  // 尝试从其他仓库补充
  const extraGroups: FulfillmentGroup[] = [];
  for (const line of noStockLines) {
    const remaining = line.maxQty - line.quantity;
    if (remaining <= 0) continue;

    const alternatives = getBestWarehousesForSku(line.sku).filter((i) => i.warehouseId !== bestWhId && i.available >= remaining);
    if (alternatives.length === 0) continue;

    const altWh = alternatives[0];
    const altWarehouse = warehouses.find((w) => w.id === altWh.warehouseId)!;
    const existingGroup = extraGroups.find((g) => g.warehouseId === altWh.warehouseId);

    if (existingGroup) {
      existingGroup.lines.push({
        lineItemId: line.lineItemId,
        sku: line.sku,
        title: line.title,
        quantity: remaining,
        maxQty: remaining,
        warehouseId: altWh.warehouseId,
        warehouseCode: altWarehouse.code,
        available: altWh.available,
        hasStock: true,
      });
      existingGroup.totalWeight += getItemWeight(items.find((i) => i.id === line.lineItemId)!) * (remaining / line.maxQty);
    } else {
      const altCarrier = carrierOptions[altWh.warehouseId]?.[0];
      extraGroups.push({
        id: `fg_${Date.now()}_${extraGroups.length + 1}`,
        warehouseId: altWh.warehouseId,
        warehouseCode: altWarehouse.code,
        carrierId: altCarrier?.id ?? '',
        lines: [{
          lineItemId: line.lineItemId,
          sku: line.sku,
          title: line.title,
          quantity: remaining,
          maxQty: remaining,
          warehouseId: altWh.warehouseId,
          warehouseCode: altWarehouse.code,
          available: altWh.available,
          hasStock: true,
        }],
        totalWeight: getItemWeight(items.find((i) => i.id === line.lineItemId)!) * (remaining / line.maxQty),
        note: '缺货拆单补发',
      });
    }
  }

  return [group, ...extraGroups];
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function CreateFulfillmentModal({ detail, onConfirm, onClose }: Props) {
  // 需要发货的商品行（过滤掉已完全履约的）
  const pendingItems = useMemo(() =>
    detail.lineItems.filter((i) => i.requiresShipping && i.fulfillmentStatus !== '已发货' && i.fulfillmentStatus !== '已签收'),
    [detail.lineItems]
  );

  // 自动计算建议方案
  const [groups, setGroups] = useState<FulfillmentGroup[]>(() => autoAllocate(pendingItems));
  const [step, setStep] = useState<'allocate' | 'confirm'>('allocate');

  // 更新某个 group 的某行分配数量
  const updateLineQty = (groupId: string, lineItemId: string, qty: number) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? {
      ...g,
      lines: g.lines.map((l) => l.lineItemId === lineItemId ? { ...l, quantity: Math.max(0, Math.min(qty, l.maxQty)) } : l),
    } : g));
  };

  // 更新某个 group 的仓库
  const updateGroupWarehouse = (groupId: string, warehouseId: string) => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    if (!wh) return;
    setGroups((prev) => prev.map((g) => g.id === groupId ? {
      ...g,
      warehouseId,
      warehouseCode: wh.code,
      carrierId: carrierOptions[warehouseId]?.[0]?.id ?? '',
      lines: g.lines.map((l) => ({
        ...l,
        warehouseId,
        warehouseCode: wh.code,
        available: getAvailable(l.sku, warehouseId),
        hasStock: getAvailable(l.sku, warehouseId) >= l.maxQty,
      })),
    } : g));
  };

  // 更新承运商
  const updateCarrier = (groupId: string, carrierId: string) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, carrierId } : g));
  };

  // 更新备注
  const updateNote = (groupId: string, note: string) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, note } : g));
  };

  // 拆分为新 group
  const splitGroup = (groupId: string, lineItemId: string) => {
    setGroups((prev) => {
      const group = prev.find((g) => g.id === groupId);
      if (!group) return prev;
      const line = group.lines.find((l) => l.lineItemId === lineItemId);
      if (!line || group.lines.length <= 1) return prev;

      const newGroup: FulfillmentGroup = {
        id: `fg_split_${Date.now()}`,
        warehouseId: group.warehouseId,
        warehouseCode: group.warehouseCode,
        carrierId: group.carrierId,
        lines: [line],
        totalWeight: getItemWeight(detail.lineItems.find((i) => i.id === lineItemId)!),
        note: '',
      };

      return [
        ...prev.map((g) => g.id === groupId ? { ...g, lines: g.lines.filter((l) => l.lineItemId !== lineItemId) } : g),
        newGroup,
      ];
    });
  };

  // 合并 groups
  const mergeGroups = () => {
    if (groups.length <= 1) return;
    const merged = groups[0];
    merged.lines = groups.flatMap((g) => g.lines);
    merged.totalWeight = groups.reduce((s, g) => s + g.totalWeight, 0);
    setGroups([merged]);
  };

  // 校验：所有商品都有分配
  const totalAllocated = groups.flatMap((g) => g.lines).reduce((s, l) => {
    const map = s;
    map[l.lineItemId] = (map[l.lineItemId] ?? 0) + l.quantity;
    return map;
  }, {} as Record<string, number>);

  const unallocatedItems = pendingItems.filter((i) => (totalAllocated[i.id] ?? 0) < i.quantity);
  const hasStockIssue = groups.some((g) => g.lines.some((l) => l.available < l.quantity));
  const canConfirm = groups.length > 0 && groups.every((g) => g.lines.length > 0 && g.warehouseId && g.carrierId);

  const handleConfirm = () => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const fulfillments: Omit<FulfillmentPackage, 'id'>[] = groups.map((g) => {
      const wh = warehouses.find((w) => w.id === g.warehouseId)!;
      const carrier = carrierOptions[g.warehouseId]?.find((c) => c.id === g.carrierId);
      return {
        status: 'in_progress',
        carrier: carrier?.name ?? '',
        trackingNumber: '',
        fulfillmentOrderNo: generateFulfillmentNo(),
        outboundOrderNo: generateOutboundNo(),
        outboundStatus: '待拣货',
        lineItemIds: g.lines.map((l) => l.lineItemId),
        warehouse: wh.code,
        matchedRule: '手动分仓',
        warehouseReason: g.note || '人工指定仓库',
        serviceLevel: carrier?.serviceLevel,
        shippingMode: carrier?.mode,
        shippedAt: undefined,
        estimatedDelivery: undefined,
      };
    });

    onConfirm({ groups, fulfillments });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[820px] max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-6 py-4 shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--foreground)]">生成履约单</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {detail.orderNo} · {pendingItems.length} 个商品行 · {pendingItems.reduce((s, i) => s + i.quantity, 0)} 件
            </p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
            <X className="size-4" />
          </button>
        </div>

        {/* 提示 */}
        {hasStockIssue && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 ring-1 ring-inset ring-amber-200 shrink-0">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-[12px] text-amber-700">
              部分商品库存不足，当前分配数量小于订单数量。可调整仓库或分配数量，剩余将作为缺货项处理。
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {groups.map((group, groupIdx) => {
            const wh = warehouses.find((w) => w.id === group.warehouseId);
            const carriers = carrierOptions[group.warehouseId] ?? [];
            const selectedCarrier = carriers.find((c) => c.id === group.carrierId);
            const groupTotalQty = group.lines.reduce((s, l) => s + l.quantity, 0);

            return (
              <div key={group.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                {/* Group header */}
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                  <span className="flex size-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">
                    {groupIdx + 1}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--foreground)]">履约单 #{groupIdx + 1}</span>
                  <span className="text-[12px] text-[var(--muted)]">{groupTotalQty} 件 · {group.totalWeight.toFixed(1)} kg</span>
                  {group.note && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-200">
                      {group.note}
                    </span>
                  )}
                  {groups.length > 1 && (
                    <button
                      onClick={() => setGroups((prev) => prev.filter((g) => g.id !== group.id))}
                      className="ml-auto text-[11px] text-[var(--danger)] hover:underline"
                    >
                      删除此单
                    </button>
                  )}
                </div>

                {/* 商品行 */}
                <div className="divide-y divide-[var(--border-subtle)]">
                  {group.lines.map((line) => {
                    const invOptions = skuInventory.filter((s) => s.sku === line.sku).map((s) => ({
                      ...s,
                      warehouse: warehouses.find((w) => w.id === s.warehouseId)!,
                    })).filter((s) => s.warehouse);

                    return (
                      <div key={line.lineItemId} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                        {/* 商品信息 */}
                        <div>
                          <div className="text-[13px] font-medium text-[var(--foreground)]">{line.title}</div>
                          <div className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{line.sku}</div>
                        </div>

                        {/* 数量 */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--muted)]">数量</span>
                          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                            <button
                              onClick={() => updateLineQty(group.id, line.lineItemId, line.quantity - 1)}
                              className="flex size-7 items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-subtle)] rounded-l-lg"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-[13px] font-medium">{line.quantity}</span>
                            <button
                              onClick={() => updateLineQty(group.id, line.lineItemId, line.quantity + 1)}
                              className="flex size-7 items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-subtle)] rounded-r-lg"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[11px] text-[var(--muted)]">/ {line.maxQty}</span>
                        </div>

                        {/* 仓库选择 */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--muted)]">仓库</span>
                          <select
                            value={group.warehouseId}
                            onChange={(e) => updateGroupWarehouse(group.id, e.target.value)}
                            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                          >
                            {warehouses.filter((w) => w.active).map((w) => {
                              const av = getAvailable(line.sku, w.id);
                              return (
                                <option key={w.id} value={w.id}>
                                  {w.code} (库存 {av})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* 库存状态 + 操作 */}
                        <div className="flex items-center gap-2">
                          {line.available >= line.quantity ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              <Check className="size-3" />库存充足
                            </span>
                          ) : line.available > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                              <AlertTriangle className="size-3" />库存 {line.available}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                              <X className="size-3" />无库存
                            </span>
                          )}
                          {group.lines.length > 1 && (
                            <button
                              onClick={() => splitGroup(group.id, line.lineItemId)}
                              className="text-[11px] text-[var(--primary)] hover:underline"
                            >
                              拆分
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 承运商选择 + 备注 */}
                <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[var(--muted)]">承运商</span>
                      <select
                        value={group.carrierId}
                        onChange={(e) => updateCarrier(group.id, e.target.value)}
                        className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                      >
                        {carriers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.serviceLevel} · {c.estimatedDays} · ${c.estimatedCost}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedCarrier && (
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                        selectedCarrier.mode === 'express' ? 'bg-blue-50 text-[var(--primary)] ring-blue-200' :
                        selectedCarrier.mode === 'ltl' ? 'bg-purple-50 text-purple-700 ring-purple-200' :
                        'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]'
                      )}>
                        {selectedCarrier.mode === 'ltl' ? '零担货运' : selectedCarrier.mode === 'express' ? '快递' : '标准包裹'}
                      </span>
                    )}
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-[12px] text-[var(--muted)]">备注</span>
                      <input
                        type="text"
                        value={group.note}
                        onChange={(e) => updateNote(group.id, e.target.value)}
                        placeholder="履约备注（可选）"
                        className="h-8 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 操作栏 */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const firstGroup = groups[0];
                if (!firstGroup) return;
                setGroups((prev) => [...prev, {
                  id: `fg_new_${Date.now()}`,
                  warehouseId: firstGroup.warehouseId,
                  warehouseCode: firstGroup.warehouseCode,
                  carrierId: firstGroup.carrierId,
                  lines: [],
                  totalWeight: 0,
                  note: '',
                }]);
              }}
              className="flex h-7 items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 text-[12px] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              + 添加履约单
            </button>
            {groups.length > 1 && (
              <button onClick={mergeGroups} className="text-[12px] text-[var(--primary)] hover:underline">
                合并为一单
              </button>
            )}
          </div>

          {/* 未分配提示 */}
          {unallocatedItems.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-[var(--surface-subtle)] px-3.5 py-3 ring-1 ring-inset ring-[var(--border)]">
              <Info className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
              <div className="text-[12px] text-[var(--muted)]">
                以下商品未完全分配，将标记为缺货待处理：
                {unallocatedItems.map((i) => (
                  <span key={i.id} className="ml-2 font-mono text-[11px] text-[var(--foreground)]">{i.sku} ×{i.quantity - (totalAllocated[i.id] ?? 0)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-6 py-4 shrink-0">
          <div className="text-[12px] text-[var(--muted)]">
            共 {groups.length} 个履约单 · {groups.reduce((s, g) => s + g.lines.reduce((ss, l) => ss + l.quantity, 0), 0)} 件分配
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="h-9 rounded-xl border border-[var(--border)] px-5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
              取消
            </button>
            <button
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="h-9 rounded-xl bg-[var(--primary)] px-5 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认生成 {groups.length > 1 ? `${groups.length} 个` : ''}履约单
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
