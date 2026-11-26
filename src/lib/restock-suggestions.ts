/**
 * 备货建议计算引擎
 *
 * 生产环境：dailyRate 由订单历史聚合计算；库存由 OmsSnapshot + FBA 同步数据提供。
 * 当前原型：使用硬编码的 Demo 销量 + 静态库存 mock，模拟真实分布。
 */

import { warehouses } from './mock-data/warehouses';

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export type UrgencyLevel = 'critical' | 'warning' | 'normal' | 'overstocked';

export type RestockSuggestion = {
  sku: string;
  productTitle: string;
  variantLabel: string;        // 颜色/规格等，空字符串表示单规格商品

  // 库存分解
  warehouseAvail: number;
  fbaFulfillable: number;
  inboundWarehouse: number;    // 自有仓在途
  inboundFba: number;          // FBA 入库中

  // 合计（供 DOC 计算用）
  totalAvail: number;          // warehouseAvail + fbaFulfillable
  totalInbound: number;        // inboundWarehouse + inboundFba

  // 销量
  sales7d: number;
  sales30d: number;
  sales90d: number;
  dailyRate: number;           // 有效日均销量（基于近 30 天）
  trendPct: number;            // 7天年化 vs 30天年化，正值=加速

  // 覆盖天数
  docAvail: number;            // totalAvail / dailyRate，0 表示断货
  docTotal: number;            // (totalAvail + totalInbound) / dailyRate

  // 预警
  urgency: UrgencyLevel;
  leadTimeDays: number;

  // 建议
  suggestedQty: number;        // 距 targetDays 的缺口，向上取整至 10
  targetDays: number;          // 目标覆盖天数

  // 财务
  unitCost: number;
  reorderValue: number;        // suggestedQty * unitCost

  // 最优来源仓
  bestSourceWarehouseId: string;
  bestSourceWarehouseCode: string;
  bestSourceAvail: number;
};

// ─── 参数 ─────────────────────────────────────────────────────────────────────

const TARGET_DAYS = 60;
const LEAD_TIME_WAREHOUSE = 14;
const LEAD_TIME_FBA = 21;
const SAFETY_STOCK_DAYS = 14;

// ─── Demo 原始数据 ─────────────────────────────────────────────────────────────

type MockSkuRow = {
  sku: string;
  productTitle: string;
  variantLabel: string;
  warehouseAvail: number;
  fbaFulfillable: number;
  inboundWarehouse: number;
  inboundFba: number;
  dailyRate: number;
  trendPct: number;            // -0.3 ~ +0.5
  unitCost: number;
  leadTimeDays: number;
  bestSourceWarehouseId: string;
  bestSourceAvail: number;
};

const MOCK_SKU_ROWS: MockSkuRow[] = [
  // ── 危急 (DOC_avail < leadTime) ───────────────────────────────────────────
  {
    sku: 'HL-LED-400', productTitle: 'Headlamp LED 400', variantLabel: '',
    warehouseAvail: 0, fbaFulfillable: 0, inboundWarehouse: 60, inboundFba: 0,
    dailyRate: 6.8, trendPct: -0.08, unitCost: 8.00,
    leadTimeDays: LEAD_TIME_WAREHOUSE, bestSourceWarehouseId: 'wh_sea', bestSourceAvail: 0,
  },
  {
    sku: 'WEP-BLU-001', productTitle: 'Wireless Earbuds Pro', variantLabel: '星空蓝',
    warehouseAvail: 50, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 8.5, trendPct: 0.15, unitCost: 32.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 50,
  },
  {
    sku: 'DC16-BLK', productTitle: 'Dock Case for iPhone 16', variantLabel: '石墨黑',
    warehouseAvail: 160, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 13.4, trendPct: 0.22, unitCost: 12.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_ewr', bestSourceAvail: 160,
  },
  // ── 预警 (leadTime ≤ DOC_avail < leadTime + safetyStock) ──────────────────
  {
    sku: 'WEP-WHT-001', productTitle: 'Wireless Earbuds Pro', variantLabel: '珍珠白',
    warehouseAvail: 180, fbaFulfillable: 146, inboundWarehouse: 0, inboundFba: 128,
    dailyRate: 12.5, trendPct: 0.05, unitCost: 32.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 180,
  },
  {
    sku: 'DC16-WHT', productTitle: 'Dock Case for iPhone 16', variantLabel: '月白',
    warehouseAvail: 240, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 9.8, trendPct: 0.10, unitCost: 12.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_ewr', bestSourceAvail: 240,
  },
  {
    sku: 'TP-BLK-MINI', productTitle: 'Transit Pack', variantLabel: '黑色迷你版',
    warehouseAvail: 110, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 5.5, trendPct: -0.12, unitCost: 22.00,
    leadTimeDays: LEAD_TIME_WAREHOUSE, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 110,
  },
  {
    sku: 'SWB-SIL-M', productTitle: 'Smart Watch Band', variantLabel: '银色 M',
    warehouseAvail: 500, fbaFulfillable: 0, inboundWarehouse: 60, inboundFba: 0,
    dailyRate: 18.5, trendPct: 0.18, unitCost: 8.50,
    leadTimeDays: LEAD_TIME_WAREHOUSE, bestSourceWarehouseId: 'wh_ewr', bestSourceAvail: 180,
  },
  {
    sku: 'FAK-DLX-01', productTitle: 'First Aid Kit Deluxe', variantLabel: '',
    warehouseAvail: 43, fbaFulfillable: 0, inboundWarehouse: 10, inboundFba: 0,
    dailyRate: 2.5, trendPct: -0.05, unitCost: 27.00,
    leadTimeDays: LEAD_TIME_WAREHOUSE, bestSourceWarehouseId: 'wh_sea', bestSourceAvail: 28,
  },
  // ── 正常 (leadTime + safetyStock ≤ DOC_avail < targetDays) ───────────────
  {
    sku: 'WEP-BLK-001', productTitle: 'Wireless Earbuds Pro', variantLabel: '午夜黑',
    warehouseAvail: 850, fbaFulfillable: 268, inboundWarehouse: 100, inboundFba: 198,
    dailyRate: 20.0, trendPct: -0.03, unitCost: 32.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 450,
  },
  {
    sku: 'TP-BLK-STD', productTitle: 'Transit Pack', variantLabel: '黑色标准版',
    warehouseAvail: 320, fbaFulfillable: 58, inboundWarehouse: 40, inboundFba: 55,
    dailyRate: 7.2, trendPct: 0.02, unitCost: 28.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 320,
  },
  {
    sku: 'DC16-BLU', productTitle: 'Dock Case for iPhone 16', variantLabel: '深海蓝',
    warehouseAvail: 560, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 11.5, trendPct: 0.08, unitCost: 13.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_ewr', bestSourceAvail: 560,
  },
  {
    sku: 'TP-OLV-STD', productTitle: 'Transit Pack', variantLabel: '橄榄绿标准版',
    warehouseAvail: 155, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 3.5, trendPct: -0.08, unitCost: 29.00,
    leadTimeDays: LEAD_TIME_WAREHOUSE, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 155,
  },
  {
    sku: 'DC16-ONG', productTitle: 'Dock Case for iPhone 16', variantLabel: '沙漠橙',
    warehouseAvail: 420, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 7.5, trendPct: 0.12, unitCost: 13.00,
    leadTimeDays: LEAD_TIME_FBA, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 420,
  },
  // ── 库存充足 (DOC_total ≥ targetDays，无需补货) ───────────────────────────
  {
    sku: 'UC-2M-WHT', productTitle: 'USB-C Cable 2m', variantLabel: '白色',
    warehouseAvail: 6190, fbaFulfillable: 0, inboundWarehouse: 500, inboundFba: 0,
    dailyRate: 42.0, trendPct: -0.15, unitCost: 5.50,
    leadTimeDays: 7, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 3200,
  },
  {
    sku: 'SP-TG-IP15', productTitle: 'Screen Protector iPhone 15', variantLabel: '',
    warehouseAvail: 2360, fbaFulfillable: 0, inboundWarehouse: 200, inboundFba: 0,
    dailyRate: 28.5, trendPct: -0.08, unitCost: 3.20,
    leadTimeDays: 7, bestSourceWarehouseId: 'wh_ewr', bestSourceAvail: 860,
  },
  {
    sku: 'PC-CLR-IP15', productTitle: 'Phone Case Clear iPhone 15', variantLabel: '',
    warehouseAvail: 1400, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 18.5, trendPct: -0.20, unitCost: 12.00,
    leadTimeDays: 14, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 980,
  },
  {
    sku: 'TP-GRY-STD', productTitle: 'Transit Pack', variantLabel: '深灰标准版',
    warehouseAvail: 380, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 4.0, trendPct: -0.10, unitCost: 28.00,
    leadTimeDays: LEAD_TIME_WAREHOUSE, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 380,
  },
  {
    sku: 'CD-MG-WHT', productTitle: 'Charging Dock MagSafe', variantLabel: '白色',
    warehouseAvail: 325, fbaFulfillable: 0, inboundWarehouse: 0, inboundFba: 0,
    dailyRate: 3.1, trendPct: -0.03, unitCost: 28.00,
    leadTimeDays: LEAD_TIME_WAREHOUSE, bestSourceWarehouseId: 'wh_lax', bestSourceAvail: 240,
  },
];

// ─── 计算逻辑 ─────────────────────────────────────────────────────────────────

function computeUrgency(docAvail: number, leadTimeDays: number): UrgencyLevel {
  if (docAvail < leadTimeDays) return 'critical';
  if (docAvail < leadTimeDays + SAFETY_STOCK_DAYS) return 'warning';
  if (docAvail < TARGET_DAYS) return 'normal';
  return 'overstocked';
}

function computeSuggestedQty(dailyRate: number, totalEffective: number): number {
  const need = dailyRate * TARGET_DAYS - totalEffective;
  if (need <= 0) return 0;
  return Math.ceil(need / 10) * 10;
}

export function computeRestockSuggestions(): RestockSuggestion[] {
  const whMap = new Map(warehouses.map(w => [w.id, w]));

  return MOCK_SKU_ROWS.map(row => {
    const { sku, productTitle, variantLabel, warehouseAvail, fbaFulfillable,
      inboundWarehouse, inboundFba, dailyRate, trendPct, unitCost, leadTimeDays,
      bestSourceWarehouseId, bestSourceAvail } = row;

    const totalAvail = warehouseAvail + fbaFulfillable;
    const totalInbound = inboundWarehouse + inboundFba;
    const totalEffective = totalAvail + totalInbound;

    const docAvail = dailyRate > 0 ? totalAvail / dailyRate : Infinity;
    const docTotal = dailyRate > 0 ? totalEffective / dailyRate : Infinity;

    const urgency = computeUrgency(docAvail, leadTimeDays);
    const suggestedQty = computeSuggestedQty(dailyRate, totalEffective);

    // 7d / 30d / 90d 销量（由 dailyRate 推算，加入趋势因子）
    const rate7d = dailyRate * (1 + trendPct);
    const sales7d = Math.round(rate7d * 7);
    const sales30d = Math.round(dailyRate * 30);
    const sales90d = Math.round(dailyRate * 90 * (1 - Math.abs(trendPct) * 0.3));

    const bestWh = whMap.get(bestSourceWarehouseId);

    return {
      sku, productTitle, variantLabel,
      warehouseAvail, fbaFulfillable, inboundWarehouse, inboundFba,
      totalAvail, totalInbound,
      sales7d, sales30d, sales90d,
      dailyRate, trendPct,
      docAvail: Number.isFinite(docAvail) ? Math.round(docAvail * 10) / 10 : 999,
      docTotal: Number.isFinite(docTotal) ? Math.round(docTotal * 10) / 10 : 999,
      urgency, leadTimeDays,
      suggestedQty, targetDays: TARGET_DAYS,
      unitCost, reorderValue: suggestedQty * unitCost,
      bestSourceWarehouseId,
      bestSourceWarehouseCode: bestWh?.code ?? bestSourceWarehouseId,
      bestSourceAvail,
    };
  });
}

// ─── 聚合统计 ─────────────────────────────────────────────────────────────────

export type RestockSummary = {
  critical: number;
  warning: number;
  normal: number;
  overstocked: number;
  totalReorderValue: number;
  totalSuggestedSkus: number;
};

export function computeRestockSummary(suggestions: RestockSuggestion[]): RestockSummary {
  const critical = suggestions.filter(s => s.urgency === 'critical').length;
  const warning = suggestions.filter(s => s.urgency === 'warning').length;
  const normal = suggestions.filter(s => s.urgency === 'normal').length;
  const overstocked = suggestions.filter(s => s.urgency === 'overstocked').length;
  const withReorder = suggestions.filter(s => s.suggestedQty > 0);
  return {
    critical, warning, normal, overstocked,
    totalReorderValue: withReorder.reduce((s, r) => s + r.reorderValue, 0),
    totalSuggestedSkus: withReorder.length,
  };
}
