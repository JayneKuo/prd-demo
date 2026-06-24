# Order Detail Layout Gap And Timeline Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the order detail page so the lifecycle header no longer wastes space, the tab area becomes the primary work header, the fulfillment panel reads more cleanly, and timelines feel specific to each order state.

**Architecture:** Keep the work scoped to `src/app/dashboard/orders/[id]/page.tsx` and existing mock order detail data. Rebalance the header layout, simplify the tab chrome, tighten the fulfillment panel composition, and tune timeline rendering so each order detail reads like a distinct operational story.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS utility classes.

---

## File Structure

Modify these files:

- `src/app/dashboard/orders/[id]/page.tsx` — Improve header layout, tab header structure, fulfillment panel composition, and timeline rendering.
- `src/lib/mock-data/order-details.ts` — Adjust mock order detail event data only if needed so each order timeline better matches its state.

No new files are required.

---

### Task 1: Tighten The Header Layout

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Remove the awkward blank right-side area in the lifecycle header card.
- [ ] Keep actions aligned without leaving a large unused block beside the progress content.

### Task 2: Make Tabs The Primary Work Header

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Remove the separate '订单主工作区' title/description chrome.
- [ ] Let the tabs themselves act as the primary section header.

### Task 3: Clean Up Fulfillment Panel Composition

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Improve the lower fulfillment layout so the item list and summary do not feel like two awkward loose boxes.
- [ ] Keep the same information, but rebalance spacing, hierarchy, and grouping.

### Task 4: Make Timeline Feel Per-Order Specific

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`
- Modify: `src/lib/mock-data/order-details.ts` (only if mock event details need refinement)

- [ ] Ensure each order’s timeline presentation matches its current detail state.
- [ ] Avoid a generic repeated feel in the timeline.

### Task 5: Verify The Refinement

**Files:**
- No direct edits expected.

- [ ] Run `pnpm lint`.
- [ ] Verify the detail page in the browser against the marked screenshot concerns.

---

## Self-Review Notes

Spec coverage:
- Header gap removal: Task 1
- Tabs as primary header: Task 2
- Fulfillment panel cleanup: Task 3
- More specific timeline feel: Task 4
- Verification: Task 5

No placeholders are intentionally left in this plan.
