import { describe, expect, it } from 'vitest';
import { orders } from '@/lib/mock-data/orders';
import {
  applyOrderFilters,
  buildOrderFilterChips,
  normalizeBatchInput,
  normalizeDateRange
} from './filtering';

describe('normalizeBatchInput', () => {
  it('splits by newline, comma, and Chinese comma, then trims and deduplicates', () => {
    expect(normalizeBatchInput('SO-1\nSO-2, SO-1，SO-3 ,  ')).toEqual([
      'SO-1',
      'SO-2',
      'SO-3'
    ]);
  });

  it('returns an empty list for blank content', () => {
    expect(normalizeBatchInput(' \n ， , ')).toEqual([]);
  });
});

describe('normalizeDateRange', () => {
  it('swaps an inverted range so filtering remains predictable', () => {
    expect(normalizeDateRange('2026-06-04', '2026-06-01')).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-06-04'
    });
  });
});

describe('applyOrderFilters', () => {
  it('matches multiple order numbers with OR semantics inside one batch search', () => {
    const result = applyOrderFilters(orders, {
      searchType: 'orderNo',
      batchValues: ['SO-20260604-0001', 'SO-20260602-0008'],
      channel: '',
      store: '',
      orderStatus: '',
      paymentStatus: '',
      fulfillmentStatus: '',
      startDate: '',
      endDate: ''
    });

    expect(result.map((row) => row.orderNo)).toEqual([
      'SO-20260604-0001',
      'SO-20260602-0008'
    ]);
  });

  it('matches customer names through the shared batch search control', () => {
    const result = applyOrderFilters(orders, {
      searchType: 'customer',
      batchValues: ['Emily Johnson', 'Lisa Chen'],
      channel: '',
      store: '',
      orderStatus: '',
      paymentStatus: '',
      fulfillmentStatus: '',
      startDate: '',
      endDate: ''
    });

    expect(result.map((row) => row.customer)).toEqual([
      'Emily Johnson',
      'Lisa Chen'
    ]);
  });

  it('handles reference-number searches when some rows have no ref number', () => {
    const result = applyOrderFilters(orders, {
      searchType: 'refNo',
      batchValues: ['REF-UK-445', 'WHL-2024-112'],
      channel: '',
      store: '',
      orderStatus: '',
      paymentStatus: '',
      fulfillmentStatus: '',
      startDate: '',
      endDate: ''
    });

    expect(result.map((row) => row.refNo)).toEqual([
      'REF-UK-445',
      'WHL-2024-112'
    ]);
  });

  it('combines channel, store, and status filters with AND semantics', () => {
    const result = applyOrderFilters(orders, {
      searchType: 'orderNo',
      batchValues: [],
      channel: 'Shopify',
      store: 'US Store',
      orderStatus: '处理中',
      paymentStatus: '已支付',
      fulfillmentStatus: '已生成',
      startDate: '',
      endDate: ''
    });

    expect(result.map((row) => row.orderNo)).toEqual(['SO-20260604-0002']);
  });

  it('filters inclusively by normalized date boundaries', () => {
    const result = applyOrderFilters(orders, {
      searchType: 'orderNo',
      batchValues: [],
      channel: '',
      store: '',
      orderStatus: '',
      paymentStatus: '',
      fulfillmentStatus: '',
      startDate: '2026-06-03',
      endDate: '2026-06-03'
    });

    expect(result.every((row) => row.orderTime.startsWith('06-03'))).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('buildOrderFilterChips', () => {
  it('builds a count-based chip for batch search plus label chips for other filters', () => {
    expect(buildOrderFilterChips({
      searchType: 'platformNo',
      batchValues: ['#SH-7291034', '#AMZ-30482837'],
      channel: 'Amazon',
      store: 'US Amazon',
      orderStatus: '',
      paymentStatus: '待确认',
      fulfillmentStatus: '',
      startDate: '2026-06-01',
      endDate: '2026-06-03'
    })).toEqual([
      { key: 'batch', label: '平台单号：2 项' },
      { key: 'channel', label: '渠道：Amazon' },
      { key: 'store', label: '店铺：US Amazon' },
      { key: 'paymentStatus', label: '支付状态：待确认' },
      { key: 'dateRange', label: '下单时间：2026-06-01 ~ 2026-06-03' }
    ]);
  });
});
