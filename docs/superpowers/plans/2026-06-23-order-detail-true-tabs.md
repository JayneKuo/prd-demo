# Order Detail True Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the order detail main work area into real clickable tabs so 商品明细 / 履约信息 / 物流信息 switch the visible panel instead of rendering all sections at once.

**Architecture:** Keep the scope limited to `src/app/dashboard/orders/[id]/page.tsx`. Introduce a small client-side tab state for the main work area while preserving the existing data mapping and keeping the timeline outside the tab panels.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS utility classes.

---

## File Structure

Modify these files:

- `src/app/dashboard/orders/[id]/page.tsx` — Add tab switching state and conditionally render the active panel.

No new files are required unless the page must be split into a client wrapper.

---

### Task 1: Add Real Tab State

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Add a default active tab of 商品明细.
- [ ] Make tab buttons visually reflect active vs inactive state.

### Task 2: Render Only The Active Panel

**Files:**
- Modify: `src/app/dashboard/orders/[id]/page.tsx`

- [ ] Show 商品明细 only when 商品明细 tab is active.
- [ ] Show 履约信息 only when 履约信息 tab is active.
- [ ] Show 物流信息 only when 物流信息 tab is active.
- [ ] Keep 时间线 outside the tabbed panel.

### Task 3: Verify Tab Switching

**Files:**
- No direct edits expected.

- [ ] Run `pnpm lint`.
- [ ] Verify in browser that clicking each tab switches the visible panel and 商品明细 is the default.

---

## Self-Review Notes

Spec coverage:
- Clickable tabs: Tasks 1-2
- Default 商品明细: Task 1
- Single visible panel at a time: Task 2
- Verification: Task 3

No placeholders are intentionally left in this plan.
