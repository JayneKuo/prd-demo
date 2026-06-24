# Order Detail Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the SaaS sales order detail page so the header emphasizes lifecycle progress, the left column stays focused on operational workflow, and addresses move into the right-side context rail.

**Architecture:** Keep the page as a single Next.js route component backed by the existing mock order-detail model. Implement the redesign with focused edits in `src/app/dashboard/orders/[id]/page.tsx`, deriving lifecycle progress from existing `status`, `financialStatus`, `fulfillmentStatus`, and timestamp fields instead of introducing new data structures.

**Tech Stack:** Next.js 15 App Router, React 19 server component, TypeScript, Tailwind CSS utility classes, lucide-react icons.

---

## File Structure

Modify these files:

- `src/app/dashboard/orders/[id]/page.tsx` — Rework the header, add lifecycle progress UI, move addresses into the right rail, and tighten the sidebar context cards.

No new runtime files are required.

---

### Task 1: Add Lifecycle Progress Model In The Page

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Define a small in-file helper that maps existing order detail fields into a fixed list of lifecycle steps (`Created`, `Paid`, `Processing`, `Fulfillment`, `Delivered`) plus state for completed/current/upcoming.
- [ ] Use existing timestamps and statuses to compute the current step without changing mock data files.
- [ ] Keep exceptional states such as cancellation or exception badges outside the main progress line.

### Task 2: Rebuild The Header Around Progress And Actions

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Remove the redundant top summary cards currently repeating order, payment, and fulfillment state.
- [ ] Keep the order title row, primary status badge, exception badge, and metadata.
- [ ] Insert a horizontal lifecycle progress section below the metadata.
- [ ] Preserve the existing action buttons and keep them visible in the header.

### Task 3: Move Addresses Into The Right Context Rail

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Remove the left-column two-card address section.
- [ ] Add compact `收货地址` and `账单地址` cards to the right rail beneath customer info.
- [ ] Keep address cards visually compact and summary-oriented so the sidebar remains secondary to the main workflow.
- [ ] Show a `Same as shipping` hint when the billing and shipping formatted addresses match.

### Task 4: Keep Left Column Focused On Operational Flow

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Keep `物流与履约`, `商品明细`, and `操作时间线` in the left column.
- [ ] Add a light destination summary to the fulfillment header so operators retain shipping context after the address move.
- [ ] Leave existing package, line-item, and timeline behavior intact unless a small styling adjustment is needed for consistency.

### Task 5: Verify The Redesign

**Files:**
- No direct edits expected.

- [ ] Run `pnpm lint` and fix any new issues from the page refactor.
- [ ] Run `pnpm build` if lint passes.
- [ ] Start `pnpm dev` and manually verify the order detail page in the browser, including header progress, sidebar addresses, fulfillment destination summary, and no layout overflow.

---

## Self-Review Notes

Spec coverage:
- Header simplification and lifecycle progress: Tasks 1-2
- Address move into right rail: Task 3
- Left-column operational focus: Task 4
- Verification: Task 5

No placeholders are intentionally left in this plan. Scope remains limited to the approved order detail page redesign.
