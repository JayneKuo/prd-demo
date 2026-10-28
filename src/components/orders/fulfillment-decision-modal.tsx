'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, CheckCircle2, XCircle, MinusCircle, Package, MapPin, Truck, BarChart3, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FulfillmentPackage, OrderLineItem, OrderEvent } from '@/lib/mock-data/order-details';
import type { OrderDetail } from '@/lib/mock-data/order-details';
import {
  warehouses,
  skuInventory,
  carrierOptions,
  type Warehouse,
  type CarrierOption,
} from '@/lib/mock-data/warehouses';

// ─── 内部类型 ─────────────────────────────────────────────────────────────────

type SkuDemand = {
  sku: string;
  title: string;
  required: number;
};

type SkuCheck = {
  sku: string;
  title: string;
  required: number;
  available: number;
  reserved: number;
  inbound: number;
  sufficient: boolean;
  hasAny: boolean;
};

/** 单个仓库的评选结果 */
type WarehouseEval = {
  warehouse: Warehouse;
  /** selected=入选 | eliminated=淘汰 | no_data=无数据 */
  status: 'selected' | 'eliminated' | 'no_data';
  eliminationStage?: 'region' | 'inventory' | 'score';
  eliminationReason?: string;
  selectionReason?: string;
  skuChecks: SkuCheck[];
  distanceKm: number;
  bestCarrier?: CarrierOption;
  score: number;
};

/** 单个承运商的评选结果 */
type CarrierEval = {
  carrier: CarrierOption;
  status: 'selected' | 'not_selected';
  reason: string;
};

interface Props {
  fulfillmentOrderNo: string;
  /** 主履约包（第一个） */
  fulfillment: FulfillmentPackage;
  /** 同一履约单号下所有包裹（含拆单） */
  relatedFuls: FulfillmentPackage[];
  lineItems: OrderLineItem[];
  shippingAddress?: OrderDetail['shippingAddress'];
  events: OrderEvent[];
  onClose: () => void;
}

// ─── 地理计算工具 ─────────────────────────────────────────────────────────────

/** Haversine 球面距离（km） */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** 根据省/州和国家估算目的地坐标 */
function getDestCoords(province: string, country: string): [number, number] {
  const stateMap: Record<string, [number, number]> = {
    // 美国各州
    California: [36.7, -119.4], CA: [36.7, -119.4],
    'New York': [42.7, -75.5], NY: [42.7, -75.5],
    Texas: [31.0, -100.0], TX: [31.0, -100.0],
    Florida: [27.8, -81.8], FL: [27.8, -81.8],
    Illinois: [41.9, -89.0], IL: [41.9, -89.0],
    Washington: [47.4, -121.5], WA: [47.4, -121.5],
    'New Jersey': [40.1, -74.4], NJ: [40.1, -74.4],
    Georgia: [32.7, -83.4], GA: [32.7, -83.4],
    'North Carolina': [35.6, -79.4], NC: [35.6, -79.4],
    Arizona: [34.3, -111.7], AZ: [34.3, -111.7],
    Colorado: [39.5, -105.8], CO: [39.5, -105.8],
    Michigan: [44.3, -85.4], MI: [44.3, -85.4],
    Ohio: [40.4, -82.8], OH: [40.4, -82.8],
    Pennsylvania: [41.2, -77.2], PA: [41.2, -77.2],
    Nevada: [38.5, -116.4], NV: [38.5, -116.4],
    Oregon: [44.0, -120.5], OR: [44.0, -120.5],
    Utah: [39.3, -111.1], UT: [39.3, -111.1],
    Tennessee: [35.8, -86.7], TN: [35.8, -86.7],
    Massachusetts: [42.4, -71.4], MA: [42.4, -71.4],
    Virginia: [37.8, -78.2], VA: [37.8, -78.2],
    // 英国地区
    England: [51.5, -1.5],
    'Greater London': [51.5, -0.1],
    London: [51.5, -0.1],
    Scotland: [56.8, -4.0],
    Wales: [52.1, -3.8],
    // 澳洲
    'New South Wales': [-33.9, 151.0],
    Victoria: [-37.5, 144.8],
    Queensland: [-25.3, 152.0],
  };
  if (stateMap[province]) return stateMap[province];

  const countryMap: Record<string, [number, number]> = {
    US: [39.5, -98.4],
    GB: [52.4, -1.9],
    SG: [1.36, 103.99],
    AU: [-27.0, 133.0],
    CA: [56.1, -106.3],
  };
  return countryMap[country] ?? [39.5, -98.4];
}

/** 各仓库的近似经纬度 */
const WAREHOUSE_COORDS: Record<string, [number, number]> = {
  wh_lax: [34.05, -118.24],
  wh_sea: [47.61, -122.33],
  wh_ewr: [40.69, -74.17],
  wh_dfw: [32.89, -97.03],
  wh_lhr: [51.47, -0.45],
  wh_sg: [1.36, 103.99],
};

/** 仓库所属国家 */
const WAREHOUSE_COUNTRY: Record<string, string> = {
  wh_lax: 'US', wh_sea: 'US', wh_ewr: 'US', wh_dfw: 'US',
  wh_lhr: 'GB',
  wh_sg: 'SG',
};

/** 综合评分（满分约 25） */
function computeScore(distanceKm: number, skuChecks: SkuCheck[], bestCarrierCost: number): number {
  const allSufficient = skuChecks.every((c) => c.sufficient);
  const inventoryScore = allSufficient
    ? 10
    : (skuChecks.filter((c) => c.sufficient).length / skuChecks.length) * 5;
  const distanceScore = Math.max(0, 10 - distanceKm / 800);
  const costScore = Math.max(0, 5 - bestCarrierCost / 40);
  return inventoryScore + distanceScore + costScore;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 inline-flex size-4 items-center justify-center rounded text-[var(--muted)] transition hover:text-[var(--foreground)]"
      title="复制"
    >
      {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
    </button>
  );
}

// ─── 辅助子组件 ───────────────────────────────────────────────────────────────

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-[var(--muted)]">{icon}</span>}
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {title}
      </span>
      {subtitle && <span className="text-[11px] text-[var(--muted)]">· {subtitle}</span>}
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const labels: Record<string, string> = {
    parcel: '小包',
    express: '快递',
    ltl: '零担',
    ftl: '整车',
  };
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] ring-1 ring-inset ring-[var(--border-subtle)]">
      {labels[mode] ?? mode}
    </span>
  );
}

// ─── 仓库评选卡片 ─────────────────────────────────────────────────────────────

function WarehouseEvalCard({
  weval,
}: {
  weval: WarehouseEval;
}) {
  const [expanded, setExpanded] = useState(weval.status !== 'no_data' && weval.eliminationStage !== 'region');
  const isSelected = weval.status === 'selected';
  const isNoData = weval.status === 'no_data';
  const isRegion = weval.eliminationStage === 'region';

  // Compact row for irrelevant warehouses (no data or wrong region)
  if (isNoData || isRegion) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3.5 py-2.5 text-[12px]">
        <MinusCircle className="size-4 shrink-0 text-[var(--muted)]" />
        <span className="font-mono font-medium text-[var(--muted)]">{weval.warehouse.code}</span>
        <span className="text-[var(--muted)]">{weval.warehouse.city}</span>
        <span className="ml-auto text-[11px] text-[var(--muted)] italic">{weval.eliminationReason}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        isSelected ? 'border-green-200' : 'border-[var(--border-subtle)]',
      )}
    >
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex flex-wrap items-center gap-2 px-3.5 py-2.5 text-left',
          isSelected ? 'bg-green-50/70' : 'bg-[var(--surface-subtle)]',
        )}
      >
        {isSelected ? (
          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
        ) : (
          <XCircle className="size-4 shrink-0 text-red-400" />
        )}
        <span
          className={cn(
            'font-mono text-[13px] font-semibold',
            isSelected ? 'text-green-800' : 'text-[var(--foreground)]',
          )}
        >
          {weval.warehouse.code}
        </span>
        <span className="text-[12px] text-[var(--muted)]">{weval.warehouse.city}</span>
        <span className="text-[12px] text-[var(--muted)]">·</span>
        <span className="text-[12px] text-[var(--muted)]">
          约 {weval.distanceKm.toLocaleString()} km
        </span>

        {/* Status badge */}
        {isSelected && (
          <span className="ml-auto rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            ✓ 入选
          </span>
        )}
        {weval.status === 'eliminated' && (
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold',
              weval.eliminationStage === 'inventory'
                ? 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200'
                : 'bg-[var(--surface)] text-[var(--muted)] ring-1 ring-inset ring-[var(--border)]',
            )}
          >
            {weval.eliminationStage === 'inventory' ? '✗ 库存不足' : '✗ 评分较低'}
          </span>
        )}

        {/* Expand/collapse */}
        <span className={cn('ml-2 text-[var(--muted)]', isSelected ? 'ml-2' : '')}>
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </span>
      </button>

      {/* Card body */}
      {expanded && (
        <div className={cn('px-3.5 py-3 space-y-3', isSelected ? 'bg-green-50/20' : 'bg-[var(--surface)]')}>

          {/* SKU 库存对照表 */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--muted-foreground)]">
                  <th className="pb-1.5 pr-3 text-left font-medium">SKU</th>
                  <th className="pb-1.5 pr-3 text-left font-medium">商品名称</th>
                  <th className="pb-1.5 pr-3 text-right font-medium">需求量</th>
                  <th className="pb-1.5 pr-3 text-right font-medium">可售库存</th>
                  <th className="pb-1.5 pr-3 text-right font-medium">
                    <span title="已生成履约单但未出库的预留量">预留</span>
                  </th>
                  <th className="pb-1.5 pr-3 text-right font-medium">
                    <span title="正在入库途中的在途库存">在途</span>
                  </th>
                  <th className="pb-1.5 text-center font-medium">满足</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {weval.skuChecks.map((check) => (
                  <tr key={check.sku} className={check.sufficient ? '' : 'bg-red-50/40'}>
                    <td className="py-1.5 pr-3 font-mono text-[var(--muted)]">{check.sku}</td>
                    <td className="py-1.5 pr-3 text-[var(--foreground)]" title={check.title}>
                      {check.title.length > 24 ? check.title.slice(0, 24) + '…' : check.title}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-[var(--foreground)]">× {check.required}</td>
                    <td
                      className={cn(
                        'py-1.5 pr-3 text-right font-semibold',
                        check.sufficient
                          ? 'text-green-700'
                          : check.available > 0
                          ? 'text-amber-600'
                          : 'text-red-500',
                      )}
                    >
                      {check.available}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-[var(--muted)]">{check.reserved}</td>
                    <td className="py-1.5 pr-3 text-right text-[var(--muted)]">{check.inbound}</td>
                    <td className="py-1.5 text-center text-[13px]">
                      {check.sufficient ? (
                        <span className="text-green-600" title="库存充足">✓</span>
                      ) : check.available > 0 ? (
                        <span className="text-amber-500" title={`库存 ${check.available}，需求 ${check.required}，不足`}>△</span>
                      ) : (
                        <span className="text-red-500" title="无可售库存">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 物流估算 */}
          {weval.bestCarrier && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[11px] text-[var(--muted)]">
              <MapPin className="size-3 shrink-0" />
              <span>
                距目的地约{' '}
                <strong className="text-[var(--foreground)]">{weval.distanceKm.toLocaleString()} km</strong>
              </span>
              <span>·</span>
              <Truck className="size-3 shrink-0" />
              <span>
                最优承运商{' '}
                <strong className="text-[var(--foreground)]">{weval.bestCarrier.serviceLevel}</strong>
              </span>
              <span>·</span>
              <span>
                预计{' '}
                <strong className="text-[var(--foreground)]">{weval.bestCarrier.estimatedDays}</strong>
              </span>
              <span>·</span>
              <span>
                运费约{' '}
                <strong className="text-[var(--foreground)]">
                  ${weval.bestCarrier.estimatedCost.toFixed(2)}
                </strong>
              </span>
              <span className="ml-auto">
                综合得分{' '}
                <strong className={cn(isSelected ? 'text-green-700' : 'text-[var(--foreground)]')}>
                  {weval.score.toFixed(1)}
                </strong>
              </span>
            </div>
          )}

          {/* 原因说明 */}
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-[12px] leading-5',
              isSelected
                ? 'bg-green-100/70 text-green-800'
                : weval.eliminationStage === 'inventory'
                ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100'
                : 'bg-[var(--surface-subtle)] text-[var(--muted)]',
            )}
          >
            {isSelected
              ? `✓ ${weval.selectionReason ?? '库存充足，距目的地最近，综合评分最高'}`
              : `淘汰原因：${weval.eliminationReason}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function FulfillmentDecisionModal({
  fulfillmentOrderNo,
  fulfillment,
  relatedFuls,
  lineItems,
  shippingAddress,
  events,
  onClose,
}: Props) {
  // ── 本次履约需求的 SKU 汇总
  const demands: SkuDemand[] = useMemo(() => {
    const ids = new Set(relatedFuls.flatMap((f) => f.lineItemIds));
    return lineItems
      .filter((li) => ids.has(li.id))
      .map((li) => ({
        sku: li.sku,
        title: li.title + (li.variantTitle ? ` / ${li.variantTitle}` : ''),
        required: li.quantity,
      }));
  }, [relatedFuls, lineItems]);

  const destCountry = shippingAddress?.country ?? 'US';
  const destProvince = shippingAddress?.province ?? '';

  // ── 各仓库评选结果
  const warehouseEvals: WarehouseEval[] = useMemo(() => {
    const destCoords = getDestCoords(destProvince, destCountry);

    return warehouses.map((wh) => {
      const whCoords = WAREHOUSE_COORDS[wh.id] ?? [0, 0];
      const distanceKm = haversineKm(whCoords[0], whCoords[1], destCoords[0], destCoords[1]);

      // 每个 SKU 的库存情况
      const skuChecks: SkuCheck[] = demands.map((demand) => {
        const inv = skuInventory.find((s) => s.sku === demand.sku && s.warehouseId === wh.id);
        const available = inv?.available ?? 0;
        const reserved = inv?.reserved ?? 0;
        const inbound = inv?.inbound ?? 0;
        return {
          sku: demand.sku,
          title: demand.title,
          required: demand.required,
          available,
          reserved,
          inbound,
          sufficient: available >= demand.required,
          hasAny: available > 0 || inbound > 0,
        };
      });

      // 筛选最优承运商（非零担/整车，按费用升序）
      const carriers = carrierOptions[wh.id] ?? [];
      const bestCarrier = [...carriers]
        .filter((c) => c.mode === 'parcel' || c.mode === 'express')
        .sort((a, b) => a.estimatedCost - b.estimatedCost)[0];

      const bestCost = bestCarrier?.estimatedCost ?? 999;
      const score = computeScore(distanceKm, skuChecks, bestCost);

      // 判断是否是已选仓库
      const isSelected =
        wh.code === fulfillment.warehouse ||
        relatedFuls.some((f) => f.warehouse === wh.code);

      if (isSelected) {
        // 计算选仓原因描述
        const selectionParts: string[] = [];
        if (skuChecks.every((c) => c.sufficient)) selectionParts.push('所有 SKU 库存充足');
        else selectionParts.push('库存状态最优');
        selectionParts.push(`距目的地约 ${distanceKm.toLocaleString()} km`);
        if (fulfillment.matchedRule === '手动分仓') {
          selectionParts.push('人工指定仓库');
        } else {
          selectionParts.push('综合评分最高');
        }
        return {
          warehouse: wh,
          status: 'selected' as const,
          selectionReason: selectionParts.join('，'),
          skuChecks,
          distanceKm,
          bestCarrier,
          score,
        };
      }

      // 检查是否适用（同国家）
      const whCountry = WAREHOUSE_COUNTRY[wh.id];
      if (whCountry !== destCountry) {
        return {
          warehouse: wh,
          status: 'eliminated' as const,
          eliminationStage: 'region' as const,
          eliminationReason: `仓库国家 ${wh.country}，目标收货国家 ${destCountry}，不符合发货区域规则`,
          skuChecks,
          distanceKm,
          bestCarrier,
          score: 0,
        };
      }

      // 检查是否有任何库存数据
      const hasNoInventoryData = skuChecks.every(
        (c) => c.available === 0 && c.reserved === 0 && c.inbound === 0,
      );
      if (hasNoInventoryData) {
        return {
          warehouse: wh,
          status: 'no_data' as const,
          eliminationReason: '该仓库无此商品的库存数据，未参与评选',
          skuChecks,
          distanceKm,
          bestCarrier,
          score: 0,
        };
      }

      // 检查库存是否满足
      const insufficientChecks = skuChecks.filter((c) => !c.sufficient);
      if (insufficientChecks.length > 0) {
        const details = insufficientChecks
          .map((c) =>
            c.available === 0
              ? `${c.sku} 无可售库存（在途 ${c.inbound}）`
              : `${c.sku} 可售 ${c.available}，需求 ${c.required}，缺口 ${c.required - c.available}`,
          )
          .join('；');
        return {
          warehouse: wh,
          status: 'eliminated' as const,
          eliminationStage: 'inventory' as const,
          eliminationReason: details,
          skuChecks,
          distanceKm,
          bestCarrier,
          score,
        };
      }

      // 库存满足，但评分低于已选仓库
      return {
        warehouse: wh,
        status: 'eliminated' as const,
        eliminationStage: 'score' as const,
        eliminationReason: `库存满足，但距目的地 ${distanceKm.toLocaleString()} km，综合评分 ${score.toFixed(1)} 低于已选仓库`,
        skuChecks,
        distanceKm,
        bestCarrier,
        score,
      };
    });
  }, [demands, destCountry, destProvince, fulfillment.warehouse, fulfillment.matchedRule, relatedFuls]);

  // 已选仓库
  const selectedWh = warehouseEvals.find((e) => e.status === 'selected');

  // ── 承运商比选
  const carrierEvals: CarrierEval[] = useMemo(() => {
    if (!selectedWh) return [];
    const carriers = carrierOptions[selectedWh.warehouse.id] ?? [];
    const selectedServiceLevel = fulfillment.serviceLevel;
    const selectedCarrierName = fulfillment.carrier;

    // 找到已选（通过 serviceLevel 或 carrier name 匹配）
    const selectedCarrier = carriers.find(
      (c) => c.serviceLevel === selectedServiceLevel || c.name === selectedCarrierName,
    );
    const selectedCost = selectedCarrier?.estimatedCost ?? 0;

    return carriers.map((c) => {
      const isSelected = c.id === selectedCarrier?.id;
      let reason = '';
      if (isSelected) {
        if (c.mode === 'ltl' || c.mode === 'ftl') {
          reason = '已选零担/整车服务（重量或体积达到起运标准）';
        } else {
          const others = carriers.filter((o) => o.id !== c.id && o.mode === c.mode);
          const cheaperExists = others.some((o) => o.estimatedCost < c.estimatedCost);
          if (!cheaperExists) {
            reason = '当前运输方式中性价比最优';
          } else {
            reason = '命中承运商路由规则 / 人工指定';
          }
        }
      } else {
        if (c.mode === 'ltl' || c.mode === 'ftl') {
          reason = '零担/整车服务不适用于当前订单重量与体积';
        } else if (c.estimatedCost > selectedCost) {
          const diff = (c.estimatedCost - selectedCost).toFixed(2);
          reason = `运费高于已选承运商 $${diff}，性价比较低`;
        } else if (c.estimatedCost < selectedCost) {
          reason = '已被成本更低的承运商覆盖';
        } else {
          reason = '评分与已选持平，非首选';
        }
      }
      return { carrier: c, status: isSelected ? 'selected' : 'not_selected', reason } as CarrierEval;
    });
  }, [selectedWh, fulfillment.serviceLevel, fulfillment.carrier]);

  // ── 决策时间线
  const relatedEvents = events
    .filter(
      (e) =>
        e.type === 'fulfillment' &&
        (e.fulfillmentOrderNo === fulfillmentOrderNo || !e.fulfillmentOrderNo),
    )
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const isManual = fulfillment.matchedRule === '手动分仓';

  // 对仓库列表排序：已选 → 淘汰(库存) → 淘汰(评分) → 淘汰(区域) → 无数据
  const stageOrder = { selected: 0, inventory: 1, score: 2, region: 3, no_data: 4 };
  const sortedEvals = [...warehouseEvals].sort((a, b) => {
    const aOrder = a.status === 'selected' ? 0 : a.status === 'no_data' ? 4 : stageOrder[a.eliminationStage ?? 'score'];
    const bOrder = b.status === 'selected' ? 0 : b.status === 'no_data' ? 4 : stageOrder[b.eliminationStage ?? 'score'];
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.score - a.score;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[780px] max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4 shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)]">履约决策详情</h3>
            <p className="mt-0.5 inline-flex items-center font-mono text-[12px] text-[var(--muted)]">
              {fulfillmentOrderNo}
              <CopyButton text={fulfillmentOrderNo} />
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* 手动分仓提示 */}
          {isManual && (
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-3.5 py-3 ring-1 ring-inset ring-blue-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-blue-500" />
              <p className="text-[12px] text-blue-700">
                此履约单由人工手动指定仓库（{fulfillment.warehouse}），未经自动路由评选。以下仓库库存数据仅供参考。
              </p>
            </div>
          )}

          {/* ── 1. 需求摘要 ── */}
          <div>
            <SectionTitle icon={<Package className="size-3.5" />} title="需求摘要" />
            <div className="mt-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] overflow-hidden">
              {shippingAddress && (
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3.5 py-2.5 text-[12px]">
                  <MapPin className="size-3.5 shrink-0 text-[var(--muted)]" />
                  <span className="text-[var(--muted)]">收货地</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {shippingAddress.city}
                    {shippingAddress.city && ', '}
                    {shippingAddress.province},{' '}
                    {shippingAddress.country}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-[var(--muted)]">
                    {shippingAddress.zip}
                  </span>
                </div>
              )}
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface)] text-[11px] text-[var(--muted-foreground)]">
                    <th className="px-3.5 py-2 text-left font-medium">SKU</th>
                    <th className="px-3.5 py-2 text-left font-medium">商品名称</th>
                    <th className="px-3.5 py-2 text-right font-medium">需求数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {demands.map((d) => (
                    <tr key={d.sku}>
                      <td className="px-3.5 py-2 font-mono text-[var(--muted)]">{d.sku}</td>
                      <td className="px-3.5 py-2 text-[var(--foreground)]">{d.title}</td>
                      <td className="px-3.5 py-2 text-right font-semibold text-[var(--foreground)]">
                        × {d.required}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 2. 仓库评选过程 ── */}
          <div>
            <SectionTitle
              icon={<BarChart3 className="size-3.5" />}
              title="仓库评选过程"
              subtitle={`${warehouses.length} 个仓库参与评估`}
            />
            <p className="mt-1 text-[11px] text-[var(--muted)] mb-2">
              评选维度：SKU 可售库存 · 距目的地距离 · 综合运费与时效 · 区域适配规则
            </p>
            <div className="space-y-2.5">
              {sortedEvals.map((weval) => (
                <WarehouseEvalCard key={weval.warehouse.id} weval={weval} />
              ))}
            </div>
          </div>

          {/* ── 3. 承运商比选 ── */}
          {carrierEvals.length > 0 && selectedWh && (
            <div>
              <SectionTitle
                icon={<Truck className="size-3.5" />}
                title="承运商比选"
                subtitle={`基于仓库 ${selectedWh.warehouse.code}`}
              />
              <div className="mt-2 rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[11px] text-[var(--muted-foreground)]">
                      <th className="px-3.5 py-2 text-left font-medium">承运商 / 服务等级</th>
                      <th className="px-3.5 py-2 text-center font-medium">时效</th>
                      <th className="px-3.5 py-2 text-center font-medium">运费</th>
                      <th className="px-3.5 py-2 text-center font-medium">方式</th>
                      <th className="px-3.5 py-2 text-left font-medium">状态 / 说明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {carrierEvals.map((ce) => (
                      <tr
                        key={ce.carrier.id}
                        className={cn(
                          ce.status === 'selected'
                            ? 'bg-green-50/50'
                            : 'bg-[var(--surface)]',
                        )}
                      >
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {ce.status === 'selected' ? (
                              <CheckCircle2 className="size-3.5 shrink-0 text-green-600" />
                            ) : (
                              <MinusCircle className="size-3.5 shrink-0 text-[var(--muted)]" />
                            )}
                            <span
                              className={cn(
                                'font-medium',
                                ce.status === 'selected'
                                  ? 'text-[var(--foreground)]'
                                  : 'text-[var(--muted)]',
                              )}
                            >
                              {ce.carrier.serviceLevel}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-[var(--foreground)]">
                          {ce.carrier.estimatedDays}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono text-[var(--foreground)]">
                          ${ce.carrier.estimatedCost.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <ModeBadge mode={ce.carrier.mode} />
                        </td>
                        <td className="px-3.5 py-2.5 text-[11px] text-[var(--muted)]">
                          {ce.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 4. 最终决策摘要 ── */}
          <div className="rounded-xl border border-green-200 bg-green-50/60 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <CheckCircle2 className="size-4 text-green-600" />
              <span className="text-[13px] font-semibold text-green-800">最终决策</span>
            </div>
            <div className="grid gap-3 text-[12px] sm:grid-cols-3">
              <div>
                <div className="text-[11px] text-[var(--muted)]">发货仓库</div>
                <div className="mt-0.5 font-semibold text-[var(--foreground)]">
                  {fulfillment.warehouse ?? '—'}
                </div>
                {selectedWh && (
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {selectedWh.warehouse.city}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-[var(--muted)]">承运商</div>
                <div className="mt-0.5 font-semibold text-[var(--foreground)]">
                  {fulfillment.carrier || '—'}
                </div>
                {fulfillment.serviceLevel && (
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {fulfillment.serviceLevel}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-[var(--muted)]">命中规则</div>
                <div className="mt-0.5 font-semibold text-[var(--foreground)]">
                  {fulfillment.matchedRule ?? '—'}
                </div>
                {fulfillment.warehouseReason && (
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {fulfillment.warehouseReason}
                  </div>
                )}
              </div>
            </div>

            {/* 多包裹拆分信息 */}
            {relatedFuls.length > 1 && (
              <div className="mt-3 space-y-1.5 border-t border-green-200 pt-3">
                <div className="text-[11px] font-semibold text-green-800">
                  出库单拆分 ({relatedFuls.length} 个包裹)
                </div>
                {relatedFuls.map((f, i) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 rounded-lg bg-white/60 px-2.5 py-1.5 ring-1 ring-inset ring-green-200"
                  >
                    <span className="flex size-5 items-center justify-center rounded bg-green-600 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--foreground)]">
                      {f.outboundOrderNo}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      {f.carrier} · {f.lineItemIds.length} 件
                    </span>
                    {f.warehouseReason && (
                      <span className="ml-auto text-[10px] text-[var(--muted)] italic">
                        {f.warehouseReason}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 5. 决策时间线 ── */}
          {relatedEvents.length > 0 && (
            <div>
              <SectionTitle
                title="决策时间线"
                subtitle={`${relatedEvents.length} 步`}
              />
              <ol className="mt-2 relative border-l-2 border-[var(--border-subtle)] pl-5 space-y-4">
                {relatedEvents.map((event, idx) => (
                  <li key={event.id} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[21px] flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-[var(--surface)]',
                        idx === relatedEvents.length - 1
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border-subtle)]',
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-[var(--foreground)]">
                        {event.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]">
                        {event.time}
                      </span>
                    </div>
                    {event.description && (
                      <p className="mt-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] leading-5 text-[var(--muted)]">
                        {event.description}
                      </p>
                    )}
                    {event.ruleName && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)] ring-1 ring-inset ring-blue-200">
                          ⚡ {event.ruleName}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3 text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
