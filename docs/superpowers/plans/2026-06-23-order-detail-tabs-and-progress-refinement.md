# Order Detail Tabs And Progress Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the dashboard order detail page so the main operational content uses tabs, the lifecycle progress better reflects order operations, and the payment card exposes transaction identifiers needed for support workflows.

**Architecture:** Keep the work scoped to `src/app/dashboard/orders/[id]/page.tsx` and derive all new UI state from the existing mock order detail model. Use a small client-side tab control inside the page for the fulfillment/product switch, refine the lifecycle mapping logic for more operationally accurate stages, and surface gateway reference data in the right-rail payment card without changing upstream data files.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS utility classes, lucide-react icons.

---

## File Structure

Modify these files:

- `src/app/dashboard/orders/[id]/page.tsx` — Refine lifecycle stage mapping, add tabbed primary content, and expand payment metadata presentation.

No new files are required unless the page must be split for client-side tabs.

---

### Task 1: Refine Lifecycle Stage Semantics

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Update the lifecycle labels so they better match operations language, such as `Created`, `Paid`, `Confirmed`, `Fulfillment`, and `Delivered`.
- [ ] Adjust the helper logic so `hold`, `partial fulfillment`, and delivered package states land in the right stage.
- [ ] Keep cancellation, refund, and exception states as badges or auxiliary state rather than forcing them into the primary stage sequence.

### Task 2: Convert Fulfillment And Line Items Into Main Content Tabs

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Add a compact tab switcher for the main work area with `物流与履约` and `商品明细` tabs.
- [ ] Default the page to the fulfillment tab.
- [ ] Keep the timeline outside the tab set so it remains continuously visible below the active operational panel.
- [ ] Preserve the fulfillment destination summary and all existing package/line-item content within their respective tab panels.

### Task 3: Expand Payment Support Metadata

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Keep the existing amount, method, gateway, and created time in each payment entry.
- [ ] Add transaction or gateway reference identifiers prominently enough for support and reconciliation.
- [ ] If refund records are present, preserve them and include any existing reference-oriented fields already available from the model.

### Task 4: Verify The Refinement

**Files:**
- No direct edits expected.

- [ ] Run `pnpm lint` and confirm no new errors are introduced by this page update.
- [ ] Run `pnpm build`.
- [ ] Start `pnpm dev` and verify desktop and narrow layouts in the browser, including tabs, progress labels, payment reference display, and timeline placement.

---

## Self-Review Notes

Spec coverage:
- Lifecycle refinement: Task 1
- Tabbed operational content: Task 2
- Payment reference details: Task 3
- Verification: Task 4

No placeholders are intentionally left in this plan. Scope stays limited to the approved order detail refinement.
