import type { OutboundRow } from '@/lib/mock-data/outbound';

export type OutboundSearchType = 'outboundNo' | 'sourceNo' | 'trackingNo' | 'fulfillmentNo' | 'wmsOutboundNo' | 'channelOrderNo' | 'referenceNo';

export type OutboundFilterState = {
  searchType: OutboundSearchType;
  batchValues: string[];
  warehouse: string;
  carrier: string;
  outboundStatus: string;
  outboundType: string;
  startDate: string;
  endDate: string;
};

export type OutboundFilterChip = {
  key:
    | 'batch'
    | 'warehouse'
    | 'carrier'
    | 'outboundStatus'
    | 'outboundType'
    | 'dateRange';
  label: string;
};

const SEARCH_LABELS: Record<OutboundSearchType, string> = {
  outboundNo: '出库单号',
  sourceNo: '来源单号',
  trackingNo: '运单号',
  fulfillmentNo: '履约单号',
  wmsOutboundNo: 'WMS单号',
  channelOrderNo: '渠道单号',
  referenceNo: '采购单号'
};

const getSearchFieldValue = (row: OutboundRow, searchType: OutboundSearchType) => {
  if (searchType === 'outboundNo') return row.outboundNo;
  if (searchType === 'sourceNo') return row.sourceNo;
  if (searchType === 'trackingNo') return row.trackingNo;
  if (searchType === 'wmsOutboundNo') return row.wmsOutboundNo;
  if (searchType === 'channelOrderNo') return row.channelOrderNo;
  if (searchType === 'referenceNo') return row.referenceNo;
  return row.fulfillmentNo;
};

const toComparable = (value: string) => value.trim().toLowerCase();

const toOutboundDate = (value: string) => {
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

export const applyOutboundFilters = (rows: OutboundRow[], filters: OutboundFilterState) => {
  const normalizedRange = normalizeDateRange(filters.startDate, filters.endDate);

  return rows.filter((row) => {
    if (filters.warehouse && row.warehouse !== filters.warehouse) return false;
    if (filters.carrier && row.carrier !== filters.carrier) return false;
    if (filters.outboundStatus && row.status !== filters.outboundStatus) return false;
    if (filters.outboundType && row.outboundType !== filters.outboundType) return false;

    if (filters.batchValues.length > 0) {
      const haystack = toComparable(getSearchFieldValue(row, filters.searchType));
      const matched = filters.batchValues.some((value) => haystack.includes(toComparable(value)));
      if (!matched) return false;
    }

    const outboundDate = toOutboundDate(row.createdAt);
    if (normalizedRange.startDate && outboundDate < normalizedRange.startDate) return false;
    if (normalizedRange.endDate && outboundDate > normalizedRange.endDate) return false;

    return true;
  });
};

export const buildOutboundFilterChips = (filters: OutboundFilterState): OutboundFilterChip[] => {
  const chips: OutboundFilterChip[] = [];

  if (filters.batchValues.length > 0) {
    chips.push({
      key: 'batch',
      label: `${SEARCH_LABELS[filters.searchType]}：${filters.batchValues.length} 项`
    });
  }

  if (filters.warehouse) chips.push({ key: 'warehouse', label: `仓库：${filters.warehouse}` });
  if (filters.carrier) chips.push({ key: 'carrier', label: `承运商：${filters.carrier}` });
  if (filters.outboundStatus) chips.push({ key: 'outboundStatus', label: `状态：${filters.outboundStatus}` });
  if (filters.outboundType) chips.push({ key: 'outboundType', label: `类型：${filters.outboundType}` });

  if (filters.startDate || filters.endDate) {
    chips.push({
      key: 'dateRange',
      label: `创建时间：${filters.startDate || '开始'} ~ ${filters.endDate || '结束'}`
    });
  }

  return chips;
};
