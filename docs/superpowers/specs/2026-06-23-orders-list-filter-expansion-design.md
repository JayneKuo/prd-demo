---
title: Orders List Filter Expansion Design
---

# Orders List Filter Expansion Design

## Goal

Expand the SaaS orders list filtering experience so the page supports the core operational search paths used by order teams, instead of relying on a single generic keyword entry.

The updated experience should let users filter by order identifiers, customer identity, channel/store context, operational statuses, and order time range. Identifier-style search must support batch input so operators can paste multiple values at once.

## Current State

The current orders list implementation lives in [src/app/dashboard/orders/page.tsx](src/app/dashboard/orders/page.tsx).

Today the toolbar only exposes:

- One placeholder search trigger with no real filter state
- One Merchant dropdown tied to tenant scope
- Tab-based status slices above the toolbar

The shared `FilterBar` component in [src/components/admin/filter-bar.tsx](src/components/admin/filter-bar.tsx) currently supports only simple single-value select controls and active chips. It does not support:

- Text-based batch input
- Search type switching
- Date ranges
- Multiple coordinated filter states in one list toolbar

## Scope

In scope:

- Upgrade the orders list toolbar in [src/app/dashboard/orders/page.tsx](src/app/dashboard/orders/page.tsx)
- Add structured filter state for the orders list page
- Support batch input for identifier and customer search
- Add explicit filters for channel, store, order status, payment status, fulfillment status, and order time range
- Show active filter chips with single-remove and clear-all behavior
- Filter the current mock-data-backed list in memory

Out of scope:

- Backend API integration or query parameter serialization
- Rebuilding unrelated list pages
- Replacing the existing tenant-scope model
- Advanced saved filters, presets, or export behavior changes
- Fuzzy matching, OCR-style parsing, or auto-detection of identifier type

## Confirmed User Requirements

The first version must support these fields:

- Order number
- Platform order number
- Reference number
- Customer name
- Channel
- Store
- Order status
- Payment status
- Fulfillment status
- Order time range

Interaction rules confirmed during brainstorming:

- Order number, platform order number, reference number, and customer name are searched through a unified "search type + batch input" interaction
- Batch input supports newline, comma, and Chinese comma splitting
- Status fields use dropdown selection rather than text batch input
- Time filtering uses a start/end range
- Within the same text field, multiple pasted values use OR matching
- Across different filter groups, conditions use AND matching

## Recommended Approach

Use a mixed toolbar pattern directly inside the orders list page.

Why this approach:

- It matches the current page structure without introducing a detached modal flow
- It keeps high-frequency operational filters visible and fast to use
- It avoids over-generalizing `FilterBar` before the project has a stable cross-page filter grammar
- It keeps the implementation focused on the only page that currently needs this richer behavior

Alternatives that were considered but not selected:

1. Expand `FilterBar` into a generic advanced-filter system. This would increase abstraction cost before the interaction model is proven.
2. Move all filters into a modal or drawer. This would reduce toolbar density but slow down repeated order lookup work.

## Interaction Design

### Toolbar Structure

The table toolbar should be upgraded from a static placeholder row into a real filter workbench with three logical zones:

1. Batch search controls
2. Structured dropdown/date filters
3. Utility actions such as column settings

The toolbar remains above the table and below the tabs.

### Batch Search Controls

The left side should contain:

- A search-type dropdown with these options:
  - 订单号
  - 平台单号
  - 参考单号
  - 客户名
- A multiline-capable text entry surface sized like a compact toolbar field but able to accept pasted lists
- A search/apply action if needed by the chosen implementation, or immediate filtering if the interaction remains responsive enough

Input normalization rules:

- Split by newline, comma, and Chinese comma
- Trim whitespace on each token
- Remove empty tokens
- Deduplicate repeated values

Matching rules:

- If search type is 订单号, match `row.orderNo`
- If search type is 平台单号, match `row.platformNo`
- If search type is 参考单号, match `row.refNo`
- If search type is 客户名, match `row.customer`

Batch matching semantics:

- Any token match satisfies the selected text filter
- Matching can be exact or normalized exact in the first version; do not introduce fuzzy heuristics unless the current data format clearly requires it

### Structured Filters

The toolbar should also expose the following structured filters:

- 渠道
- 店铺
- 订单状态
- 支付状态
- 履约状态
- 下单时间范围

Recommended behavior:

- Channel: dropdown select
- Store: dropdown select based on the currently scoped merchant options
- Order status: dropdown select
- Payment status: dropdown select
- Fulfillment status: dropdown select
- Order time range: start date + end date inputs

These structured filters combine with the active batch text filter using AND logic.

### Active Filter Chips

Below the toolbar, show applied filters as removable chips.

Display rules:

- Batch text filter chip shows label + count, such as `订单号：12 项`
- Dropdown filters show their selected label
- Date range shows explicit boundaries
- Each chip can be removed individually
- A clear-all action resets all toolbar filters and returns to the current tab slice + merchant scope defaults

## Data Flow

The filtering pipeline in [src/app/dashboard/orders/page.tsx](src/app/dashboard/orders/page.tsx) should remain local and predictable.

Recommended order:

1. Base tenant scope filtering
2. Merchant/store filtering
3. Active tab filtering
4. Batch text filter for the selected search type
5. Status filters
6. Time range filter

This keeps the page behavior aligned with the current shell context and tab semantics.

## Component Boundaries

Keep the first implementation mostly page-local.

Recommended boundaries:

- `src/app/dashboard/orders/page.tsx`
  - Owns filter state
  - Owns normalization helpers or imports a small helper if needed
  - Applies the final filtering pipeline
  - Renders the upgraded toolbar and active chips
- `src/components/admin/filter-bar.tsx`
  - Do not force-fit this page into the current generic `FilterBar` unless the component can be extended cleanly without awkward props
  - It is acceptable for the orders page to render its own richer toolbar controls in this phase

If a helper is extracted, keep it narrowly focused on token normalization or date-range checks rather than building a premature generic filtering framework.

## Error Handling And Edge Cases

The design should handle these cases cleanly:

- Empty batch input means no text filter is applied
- Duplicate pasted values are collapsed silently
- Whitespace-only pasted content is ignored
- Missing `refNo` values should not break reference-number filtering
- If only a start date is given, filter from that point forward
- If only an end date is given, filter up to that point
- If both dates are given and the start is after the end, the UI should prevent or normalize the invalid range rather than silently returning confusing results
- Changing merchant/store scope should preserve valid filters and reset only values that are no longer selectable

## Testing Strategy

Verification should cover both filtering logic and real-page behavior.

Required checks:

- Order number batch input matches multiple rows correctly
- Platform order number batch input matches multiple rows correctly
- Reference number batch input handles missing refs safely
- Customer batch input matches multiple named customers correctly
- Status dropdowns narrow the results as expected
- Channel and store filters combine correctly with tab selection
- Date range filters include the correct boundaries
- Clear-all removes all applied toolbar filters
- Removing one chip only removes its corresponding condition
- The page remains usable at narrower desktop widths without the toolbar collapsing into a broken layout

## Acceptance Criteria

Implementation is successful when:

- The orders list no longer depends on a placeholder keyword search
- Users can search by order number, platform order number, reference number, or customer name through a single batch-search interaction
- Users can filter by channel, store, order status, payment status, fulfillment status, and order time range
- Batch input correctly supports newline/comma/Chinese-comma splitting
- Active filters are visible and removable
- Filtering logic works together with the existing tab model and merchant scope model
- The page remains visually consistent with the current admin toolbar style
- `pnpm lint` passes
- The page is run locally and manually verified in a browser
