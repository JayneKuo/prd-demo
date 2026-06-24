import type { OrderRow } from '@/lib/mock-data/orders';

export type OrderSearchType = 'orderNo' | 'platformNo' | 'refNo' | 'customer';

export type OrderFilterState = {
  searchType: OrderSearchType;
  batchValues: string[];
  channel: string;
  store: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  startDate: string;
  endDate: string;
};

export type OrderFilterChip = {
  key:
    | 'batch'
    | 'channel'
    | 'store'
    | 'orderStatus'
    | 'paymentStatus'
    | 'fulfillmentStatus'
    | 'dateRange';
  label: string;
};

const SEARCH_LABELS: Record<OrderSearchType, string> = {
  orderNo: '订单号',
  platformNo: '平台单号',
  refNo: '参考单号',
  customer: '客户名'
};

const getSearchFieldValue = (row: OrderRow, searchType: OrderSearchType) => {
  if (searchType === 'orderNo') return row.orderNo;
  if (searchType === 'platformNo') return row.platformNo;
  if (searchType === 'refNo') return row.refNo;
  return row.customer;
};

const toComparable = (value: string) => value.trim().toLowerCase();

const toOrderDate = (value: string) => {
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

export const applyOrderFilters = (rows: OrderRow[], filters: OrderFilterState) => {
  const normalizedRange = normalizeDateRange(filters.startDate, filters.endDate);

  return rows.filter((row) => {
    if (filters.channel && row.channel !== filters.channel) return false;
    if (filters.store && row.merchant !== filters.store) return false;
    if (filters.orderStatus && row.status !== filters.orderStatus) return false;
    if (filters.paymentStatus && row.payment !== filters.paymentStatus) return false;
    if (filters.fulfillmentStatus && row.fulfillment !== filters.fulfillmentStatus) return false;

    if (filters.batchValues.length > 0) {
      const haystack = toComparable(getSearchFieldValue(row, filters.searchType));
      const matched = filters.batchValues.some((value) => haystack === toComparable(value));
      if (!matched) return false;
    }

    const orderDate = toOrderDate(row.orderTime);
    if (normalizedRange.startDate && orderDate < normalizedRange.startDate) return false;
    if (normalizedRange.endDate && orderDate > normalizedRange.endDate) return false;

    return true;
  });
};

export const buildOrderFilterChips = (filters: OrderFilterState): OrderFilterChip[] => {
  const chips: OrderFilterChip[] = [];

  if (filters.batchValues.length > 0) {
    chips.push({
      key: 'batch',
      label: `${SEARCH_LABELS[filters.searchType]}：${filters.batchValues.length} 项`
    });
  }

  if (filters.channel) chips.push({ key: 'channel', label: `渠道：${filters.channel}` });
  if (filters.store) chips.push({ key: 'store', label: `店铺：${filters.store}` });
  if (filters.orderStatus) chips.push({ key: 'orderStatus', label: `订单状态：${filters.orderStatus}` });
  if (filters.paymentStatus) chips.push({ key: 'paymentStatus', label: `支付状态：${filters.paymentStatus}` });
  if (filters.fulfillmentStatus) chips.push({ key: 'fulfillmentStatus', label: `履约状态：${filters.fulfillmentStatus}` });

  if (filters.startDate || filters.endDate) {
    chips.push({
      key: 'dateRange',
      label: `下单时间：${filters.startDate || '开始'} ~ ${filters.endDate || '结束'}`
    });
  }

  return chips;
};
