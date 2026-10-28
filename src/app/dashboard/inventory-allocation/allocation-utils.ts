export type AllocationSku = {
  skuCode: string;
  ratio: string;
  excluded: boolean;
};

export type AllocationRetailer = {
  retailer: { id: string };
  enabled: boolean;
  skus: AllocationSku[];
};

export function isValidRatio(ratio: string) {
  if (!ratio.trim()) return false;
  const value = Number(ratio);
  return /^\d+(\.\d{1,2})?$/.test(ratio) && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function allocationValue(sku: AllocationSku) {
  return !sku.excluded && isValidRatio(sku.ratio) ? Number(sku.ratio) : 0;
}

export function allocationTotals(data: AllocationRetailer[]) {
  const totals: Record<string, number> = {};
  data.forEach(entry => {
    if (!entry.enabled) return;
    entry.skus.forEach(sku => {
      totals[sku.skuCode] = (totals[sku.skuCode] ?? 0) + Math.round(allocationValue(sku) * 100);
    });
  });
  return Object.fromEntries(Object.entries(totals).map(([code, value]) => [code, value / 100]));
}

export function otherAllocation(total: number, enabled: boolean, sku: AllocationSku) {
  return Math.round((total - (enabled ? allocationValue(sku) : 0)) * 100) / 100;
}

export type SkuStatusFilter = 'all' | 'pending' | 'over' | 'excluded';

export function matchSkuStatus(sku: AllocationSku, filter: SkuStatusFilter, enabled: boolean, total: number) {
  switch (filter) {
    case 'pending': return !sku.excluded && sku.ratio === '';
    case 'over': return enabled && allocationValue(sku) > 0 && total > 100;
    case 'excluded': return sku.excluded;
    default: return true;
  }
}

export function parseSkuCodes(value: string) {
  return [...new Set(value.split(/[\s,，;；]+/).filter(Boolean).map(code => code.toUpperCase()))];
}

export function matchSkuSearch(sku: { skuCode: string; skuName: string }, keyword: string, codes: string[]) {
  if (codes.length) return codes.includes(sku.skuCode.toUpperCase());
  return `${sku.skuCode} ${sku.skuName}`.toLowerCase().includes(keyword.trim().toLowerCase());
}

export function formatRatio(value: number) {
  return Number(value.toFixed(2));
}
