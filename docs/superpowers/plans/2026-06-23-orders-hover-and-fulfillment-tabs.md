# Orders Hover And Fulfillment Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the orders list/detail experience so order numbers feel more interactive in the list and the detail page separates 商品明细, 履约信息, and 物流信息 with the right operational meaning.

**Architecture:** Keep the list and detail work scoped to the two existing route files. Update the list row link styling in `src/app/dashboard/orders/page.tsx`, and restructure the detail page main work area in `src/app/dashboard/orders/[id]/page.tsx` so fulfillment becomes an internal processing view distinct from downstream logistics.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS utility classes, lucide-react icons.

---

## File Structure

Modify these files:

- `src/app/dashboard/orders/page.tsx` — Strengthen hover affordance on the order number link.
- `src/app/dashboard/orders/[id]/page.tsx` — Replace the current mixed work area with 商品明细 / 履约信息 / 物流信息 tabs and reorganize content into the correct tab.

No new files are required.

---

### Task 1: Refine Order Number Hover Feedback

**Files:**
- Modify: `src/app/dashboard/orders/page.tsx`

- [ ] Make the order number link visibly change color on hover.
- [ ] Preserve the current click behavior and copy affordance.

### Task 2: Restructure Detail Main Work Area Tabs

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Replace the current two-item mixed header with three tabs in this order: 商品明细, 履约信息, 物流信息.
- [ ] Make 商品明细 the first/default tab.
- [ ] Keep the timeline below the tabbed work area.

### Task 3: Separate Fulfillment From Logistics

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Keep the current package/tracking/carrier content under 物流信息.
- [ ] Build 履约信息 as an internal pre-shipment view: items requiring fulfillment, non-fulfillment items if any, fulfillment-related status, and warehouse allocation summary.
- [ ] Avoid presenting shipping carrier/tracking content inside 履约信息.

### Task 4: Verify The Orders UX Refinement

**Files:**
- No direct edits expected.

- [ ] Run `pnpm lint`.
- [ ] Verify the list hover state and detail tab structure in the browser.

---

## Self-Review Notes

Spec coverage:
- List hover affordance: Task 1
- Detail tab order and default: Task 2
- Fulfillment vs logistics separation: Task 3
- Verification: Task 4

No placeholders are intentionally left in this plan. Scope remains limited to the approved orders UX refinement.
