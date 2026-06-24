# Orders List Filter Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real orders-list filter toolbar that supports batch search by order identifiers or customer name, structured dropdown filters, date range filtering, and removable active chips on the SaaS orders page.

**Architecture:** Keep the first version page-local to avoid over-generalizing the current shared filter bar. Extract the pure filtering and token-normalization logic into a narrow helper under `src/features/orders/` so it can be unit-tested independently, then wire that helper into `src/app/dashboard/orders/page.tsx` and manually verify the updated toolbar behavior in the running app.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, existing mock-data orders module, ESLint, local browser verification

---

## File Structure

### Files to create

- `src/features/orders/filtering.ts`
  - Pure helper functions for batch token parsing, date normalization, active-chip derivation, and final order filtering.
- `src/features/orders/filtering.test.ts`
  - Focused unit tests for parsing and filtering logic.

### Files to modify

- `src/app/dashboard/orders/page.tsx`
  - Replace the placeholder toolbar with the real filter UI, own local UI state, connect to helper functions, and render active chips.
- `package.json`
  - Add a minimal test script only if needed to run the new filtering unit tests.

### Files to inspect while implementing

- `src/lib/mock-data/orders.ts`
  - Source of filterable order fields and value shapes.
- `src/lib/tenant-context.ts`
  - Existing merchant-scope behavior that the page already depends on.

---

### Task 1: Add testable filtering helpers

**Files:**
- Create: `src/features/orders/filtering.ts`
- Test: `src/features/orders/filtering.test.ts`
- Inspect: `src/lib/mock-data/orders.ts`

- [ ] **Step 1: Write the failing test file for token parsing and filter behavior**

```ts
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

  it('combines channel, store, status, and tab-friendly filters with AND semantics', () => {
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
```

- [ ] **Step 2: Add a minimal Vitest setup to `package.json` if the repo does not already expose one**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^4.0.18"
  }
}
```

If `vitest` is already intentionally managed elsewhere, keep `package.json` unchanged and record the actual local test command you will use before moving on.

- [ ] **Step 3: Run the test file to verify it fails before implementation**

Run:

```bash
pnpm test -- src/features/orders/filtering.test.ts
```

Expected: FAIL with module-not-found or exported-function errors for `src/features/orders/filtering.ts`.

- [ ] **Step 4: Implement the filtering helper module with the exact exported API used by the tests**

```ts
import { type OrderRow } from '@/lib/mock-data/orders';

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

export const applyOrderFilters = (
  rows: OrderRow[],
  filters: OrderFilterState
) => {
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
```

- [ ] **Step 5: Run the helper tests again and verify they pass**

Run:

```bash
pnpm test -- src/features/orders/filtering.test.ts
```

Expected: PASS with all parsing, combination, and chip-generation checks green.

- [ ] **Step 6: Commit the helper layer**

```bash
git add package.json src/features/orders/filtering.ts src/features/orders/filtering.test.ts
git commit -m "feat: add orders filter helpers"
```

---

### Task 2: Replace the placeholder orders toolbar with real filter controls

**Files:**
- Modify: `src/app/dashboard/orders/page.tsx`
- Inspect: `src/lib/tenant-context.ts`
- Reuse: `src/features/orders/filtering.ts`

- [ ] **Step 1: Write the failing UI-oriented test case as an implementation checklist comment in the plan and keep the page behavior target explicit**

```ts
// Desired behavior after this task:
// 1. Search type select defaults to orderNo.
// 2. Batch textarea accepts pasted multi-line values.
// 3. Channel/store/status/date controls update local filter state.
// 4. Filtered rows derive from: tenant scope -> store -> tab -> helper filters.
// 5. Active chips render below the toolbar and can remove one filter at a time.
// 6. Clear-all resets toolbar filters but does not change activeTab or merchantScope.
```

- [ ] **Step 2: Add local filter state and derived option lists near the top of `OrdersPage`**

```ts
const [searchType, setSearchType] = useState<OrderSearchType>('orderNo');
const [batchInput, setBatchInput] = useState('');
const [channelFilter, setChannelFilter] = useState('');
const [orderStatusFilter, setOrderStatusFilter] = useState('');
const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState('');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');

const batchValues = useMemo(() => normalizeBatchInput(batchInput), [batchInput]);
const channelOptions = useMemo(
  () => Array.from(new Set(scopedOrders.map((order) => order.channel))),
  [scopedOrders]
);
const orderStatusOptions = useMemo(
  () => Array.from(new Set(scopedOrders.map((order) => order.status))),
  [scopedOrders]
);
const paymentStatusOptions = useMemo(
  () => Array.from(new Set(scopedOrders.map((order) => order.payment))),
  [scopedOrders]
);
const fulfillmentStatusOptions = useMemo(
  () => Array.from(new Set(scopedOrders.map((order) => order.fulfillment))),
  [scopedOrders]
);
```

Also add the imports:

```ts
import { useEffect, useMemo, useState } from 'react';
import {
  applyOrderFilters,
  buildOrderFilterChips,
  normalizeBatchInput,
  type OrderSearchType
} from '@/features/orders/filtering';
```

- [ ] **Step 3: Replace the old `filteredOrders` derivation with a two-stage pipeline that preserves tab behavior**

```ts
const tabFilteredOrders = activeFilter?.filter
  ? merchantFilteredOrders.filter(activeFilter.filter)
  : merchantFilteredOrders;

const filteredOrders = useMemo(
  () =>
    applyOrderFilters(tabFilteredOrders, {
      searchType,
      batchValues,
      channel: channelFilter,
      store: merchantFilter === ALL_MERCHANTS_SCOPE ? '' : merchantFilter,
      orderStatus: orderStatusFilter,
      paymentStatus: paymentStatusFilter,
      fulfillmentStatus: fulfillmentStatusFilter,
      startDate,
      endDate
    }),
  [
    batchValues,
    channelFilter,
    endDate,
    fulfillmentStatusFilter,
    merchantFilter,
    orderStatusFilter,
    paymentStatusFilter,
    searchType,
    startDate,
    tabFilteredOrders
  ]
);

const activeChips = useMemo(
  () =>
    buildOrderFilterChips({
      searchType,
      batchValues,
      channel: channelFilter,
      store: merchantFilter === ALL_MERCHANTS_SCOPE ? '' : merchantFilter,
      orderStatus: orderStatusFilter,
      paymentStatus: paymentStatusFilter,
      fulfillmentStatus: fulfillmentStatusFilter,
      startDate,
      endDate
    }),
  [
    batchValues,
    channelFilter,
    endDate,
    fulfillmentStatusFilter,
    merchantFilter,
    orderStatusFilter,
    paymentStatusFilter,
    searchType,
    startDate
  ]
);
```

- [ ] **Step 4: Replace the placeholder toolbar JSX with real controls**

```tsx
<div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
        <select
          value={searchType}
          onChange={(event) => setSearchType(event.target.value as OrderSearchType)}
          className="bg-transparent text-[13px] outline-none"
          aria-label="搜索类型"
        >
          <option value="orderNo">订单号</option>
          <option value="platformNo">平台单号</option>
          <option value="refNo">参考单号</option>
          <option value="customer">客户名</option>
        </select>
      </label>

      <textarea
        value={batchInput}
        onChange={(event) => setBatchInput(event.target.value)}
        placeholder="支持换行、逗号、中英文逗号批量输入"
        rows={2}
        className="min-h-9 min-w-[280px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      />

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <span>渠道</span>
        <select
          value={channelFilter}
          onChange={(event) => setChannelFilter(event.target.value)}
          className="bg-transparent text-[13px] outline-none"
          aria-label="渠道筛选"
        >
          <option value="">全部</option>
          {channelOptions.map((channel) => (
            <option key={channel} value={channel}>{channel}</option>
          ))}
        </select>
      </label>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <span>店铺</span>
        <select
          value={merchantFilter}
          onChange={(event) => {
            setMerchantFilter(event.target.value);
            setSelectedRows(new Set());
          }}
          className="bg-transparent text-[13px] outline-none"
          aria-label="店铺筛选"
        >
          <option value={ALL_MERCHANTS_SCOPE}>全部</option>
          {availableMerchantNames.map((merchant) => (
            <option key={merchant} value={merchant}>{merchant}</option>
          ))}
        </select>
      </label>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <span>订单状态</span>
        <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className="bg-transparent text-[13px] outline-none">
          <option value="">全部</option>
          {orderStatusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <span>支付状态</span>
        <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)} className="bg-transparent text-[13px] outline-none">
          <option value="">全部</option>
          {paymentStatusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <span>履约状态</span>
        <select value={fulfillmentStatusFilter} onChange={(event) => setFulfillmentStatusFilter(event.target.value)} className="bg-transparent text-[13px] outline-none">
          <option value="">全部</option>
          {fulfillmentStatusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <span>开始</span>
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="bg-transparent text-[13px] outline-none" />
      </label>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]">
        <span>结束</span>
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="bg-transparent text-[13px] outline-none" />
      </label>
    </div>

    <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
      <Columns3 className="size-3.5" />
      列设置
    </button>
  </div>

  {activeChips.length > 0 && (
    <div className="flex flex-wrap items-center gap-2">
      {activeChips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => removeFilterChip(chip.key)}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--primary-soft)] px-2 py-1 text-[12px] font-medium text-[var(--primary)]"
        >
          <span>{chip.label}</span>
          <X className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAllFilters}
        className="text-[12px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        清除全部
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 5: Add chip-removal and clear-all handlers that only reset toolbar filters**

```ts
const clearAllFilters = () => {
  setSearchType('orderNo');
  setBatchInput('');
  setChannelFilter('');
  setMerchantFilter(ALL_MERCHANTS_SCOPE);
  setOrderStatusFilter('');
  setPaymentStatusFilter('');
  setFulfillmentStatusFilter('');
  setStartDate('');
  setEndDate('');
  setSelectedRows(new Set());
};

const removeFilterChip = (key: ReturnType<typeof buildOrderFilterChips>[number]['key']) => {
  if (key === 'batch') setBatchInput('');
  if (key === 'channel') setChannelFilter('');
  if (key === 'store') setMerchantFilter(ALL_MERCHANTS_SCOPE);
  if (key === 'orderStatus') setOrderStatusFilter('');
  if (key === 'paymentStatus') setPaymentStatusFilter('');
  if (key === 'fulfillmentStatus') setFulfillmentStatusFilter('');
  if (key === 'dateRange') {
    setStartDate('');
    setEndDate('');
  }
};
```

- [ ] **Step 6: Run lint and fix any React/TypeScript issues from the page changes**

Run:

```bash
pnpm lint
```

Expected: PASS with no new lint errors in `src/app/dashboard/orders/page.tsx` or `src/features/orders/filtering.ts`.

- [ ] **Step 7: Commit the page wiring**

```bash
git add src/app/dashboard/orders/page.tsx
git commit -m "feat: expand orders list filters"
```

---

### Task 3: Verify the real page behavior in the running app

**Files:**
- Verify: `src/app/dashboard/orders/page.tsx`
- Verify: `src/features/orders/filtering.ts`

- [ ] **Step 1: Start the local app**

Run:

```bash
pnpm dev
```

Expected: Next.js dev server starts successfully and prints a local URL.

- [ ] **Step 2: Open the orders page in a browser and verify the golden path**

Check these behaviors manually:

```text
1. Navigate to /dashboard/orders.
2. Confirm the placeholder search button is replaced by the new filter workbench.
3. Switch search type to 订单号.
4. Paste:
   SO-20260604-0001
   SO-20260602-0008
5. Confirm exactly those rows remain.
6. Remove the batch chip and confirm the full tab-scoped list returns.
```

- [ ] **Step 3: Verify structured filter combinations and edge cases**

Check these behaviors manually:

```text
1. Choose 渠道 = Shopify.
2. Choose 店铺 = US Store.
3. Choose 订单状态 = 处理中.
4. Choose 支付状态 = 已支付.
5. Choose 履约状态 = 已生成.
6. Confirm only SO-20260604-0002 remains.
7. Set 开始 = 2026-06-04 and 结束 = 2026-06-01.
8. Confirm the UI still yields a sensible normalized range result instead of an empty confusing state.
9. Clear all and confirm tabs still work and the page count recovers.
```

- [ ] **Step 4: Verify narrower desktop layout and interaction clarity**

Check these behaviors manually:

```text
1. Reduce the browser width to a narrow desktop/tablet-like viewport.
2. Confirm the filter controls wrap instead of overflowing horizontally.
3. Confirm active chips remain visible and removable.
4. Confirm textarea input, selects, and date inputs stay usable.
```

- [ ] **Step 5: Commit after verification if code changed during manual fixups**

```bash
git add src/app/dashboard/orders/page.tsx src/features/orders/filtering.ts src/features/orders/filtering.test.ts package.json
git commit -m "fix: polish orders filter interactions"
```

If no fixups were needed after manual verification, skip this commit.

---

## Self-Review

### Spec coverage

Covered requirements:

- Unified search type + batch input: Task 1 and Task 2
- Supported fields: order number, platform order number, reference number, customer name, channel, store, order status, payment status, fulfillment status, date range: Task 1 and Task 2
- Batch splitting by newline/comma/Chinese comma: Task 1
- OR semantics inside one batch field and AND semantics across filter groups: Task 1 and Task 2
- Active chips with single-remove and clear-all: Task 1 and Task 2
- Coexistence with current tab and merchant scope filtering: Task 2
- Manual browser verification: Task 3

No uncovered spec sections remain.

### Placeholder scan

The plan contains exact file paths, helper APIs, code samples, and verification commands. No TBD/TODO placeholders remain.

### Type consistency

The plan uses one consistent filter type set:

- `OrderSearchType`
- `OrderFilterState`
- `OrderFilterChip`
- `applyOrderFilters`
- `buildOrderFilterChips`
- `normalizeBatchInput`
- `normalizeDateRange`

The same property names are reused consistently across helper tests, helper implementation, and page wiring.
