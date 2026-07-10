import type { InboundRow } from '@/lib/mock-data/inbound';

export type InboundSearchType = 'inboundNo' | 'allRefs' | 'upstream' | 'downstream' | 'supplier';

export type InboundFilterState = {
  searchType: InboundSearchType;
  batchValues: string[];
  warehouse: string;
  inboundStatus: string;
  inboundType: string;
  startDate: string;
  endDate: string;
};

export type InboundFilterChip = {
  key:
    | 'batch'
    | 'warehouse'
    | 'inboundStatus'
    | 'inboundType'
    | 'dateRange';
  label: string;
};

const SEARCH_LABELS: Record<InboundSearchType, string> = {
  inboundNo: '入库单号',
  allRefs: '全部单号',
  upstream: '上游单号',
  downstream: '下游单号',
  supplier: '供应商'
};

/**
 * Get all searchable values for a row based on search type.
 * For ref-based search, we collect all matching ref numbers + internal link numbers.
 */
const getSearchValues = (row: InboundRow, searchType: InboundSearchType): string[] => {
  if (searchType === 'inboundNo') return [row.inboundNo];
  if (searchType === 'supplier') return [row.supplier];
  if (searchType === 'upstream') {
    return [
      ...row.externalRefs.filter(r => r.source === 'upstream').map(r => r.no),
      ...row.internalLinks.map(l => l.no)
    ];
  }
  if (searchType === 'downstream') {
    return row.externalRefs.filter(r => r.source === 'downstream').map(r => r.no);
  }
  // allRefs — search everything
  return [
    row.inboundNo,
    ...row.internalLinks.map(l => l.no),
    ...row.externalRefs.map(r => r.no)
  ];
};

const toComparable = (value: string) => value.trim().toLowerCase();

const toInboundDate = (value: string) => {
  const [month, day] = value.split(' ')[0].split('-');
  return `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const normalizeBatchInput = (value: string) => {
  return Array.from(
    new Set(
      value
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

export const normalizeDateRange = (startDate: string, endDate: string) => {
  if (!startDate || !endDate || startDate <= endDate) {
    return { startDate, endDate };
  }
  return { startDate: endDate, endDate: startDate };
};

export const applyInboundFilters = (rows: InboundRow[], filters: InboundFilterState) => {
  const normalizedRange = normalizeDateRange(filters.startDate, filters.endDate);

  return rows.filter((row) => {
    if (filters.warehouse && row.warehouse !== filters.warehouse) return false;
    if (filters.inboundStatus && row.status !== filters.inboundStatus) return false;
    if (filters.inboundType && row.inboundType !== filters.inboundType) return false;

    if (filters.batchValues.length > 0) {
      const haystacks = getSearchValues(row, filters.searchType).map(toComparable);
      const matched = filters.batchValues.some((value) =>
        haystacks.some((h) => h.includes(toComparable(value)))
      );
      if (!matched) return false;
    }

    const inboundDate = toInboundDate(row.createdAt);
    if (normalizedRange.startDate && inboundDate < normalizedRange.startDate) return false;
    if (normalizedRange.endDate && inboundDate > normalizedRange.endDate) return false;

    return true;
  });
};

export const buildInboundFilterChips = (filters: InboundFilterState): InboundFilterChip[] => {
  const chips: InboundFilterChip[] = [];

  if (filters.batchValues.length > 0) {
    chips.push({
      key: 'batch',
      label: `${SEARCH_LABELS[filters.searchType]}：${filters.batchValues.length} 项`
    });
  }

  if (filters.warehouse) chips.push({ key: 'warehouse', label: `仓库：${filters.warehouse}` });
  if (filters.inboundStatus) chips.push({ key: 'inboundStatus', label: `状态：${filters.inboundStatus}` });
  if (filters.inboundType) chips.push({ key: 'inboundType', label: `类型：${filters.inboundType}` });

  if (filters.startDate || filters.endDate) {
    chips.push({
      key: 'dateRange',
      label: `创建时间：${filters.startDate || '开始'} ~ ${filters.endDate || '结束'}`
    });
  }

  return chips;
};
