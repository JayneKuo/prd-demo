# Stripe Shell Interaction Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the ERP admin console shell into a Stripe-like operational console with better visual tokens, polished interaction states, and a high-quality collapsible sidebar.

**Architecture:** Keep the existing Next.js App Router structure and `ShellStateProvider` state model. Implement the polish through focused edits to global tokens, shell layout, sidebar, topbar, and shared admin primitives without changing business data models or routing.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4 utility classes, lucide-react icons, CSS variables in `src/app/globals.css`.

---

## File Structure

Modify these files:

- `src/app/globals.css` — Refine design tokens, focus rings, reduced-motion behavior, and base interaction defaults.
- `src/components/layout/app-shell.tsx` — Improve page canvas, shell layering, main work area background, and content viewport rhythm.
- `src/components/layout/sidebar-nav.tsx` — Refine expanded/collapsed states, active/hover/focus styles, group rhythm, and icon-only accessibility.
- `src/components/layout/topbar.tsx` — Polish global utility controls, search command trigger, create button, and sidebar toggle affordance.
- `src/components/admin/page-header.tsx` — Align page actions with the refined button hierarchy and focus states.
- `src/components/admin/section-card.tsx` — Convert soft cards into Stripe-like panels.
- `src/components/admin/action-toolbar.tsx` — Improve toolbar control density and interaction states.
- `src/components/admin/data-table-shell.tsx` — Improve table density, row hover, checkbox sizing, row actions, and pagination controls.

No new files are needed.

---

### Task 1: Refine Global Tokens And Interaction Defaults

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace root visual tokens with a sharper Stripe-like neutral system**

In `src/app/globals.css`, replace the current `:root` block with:

```css
:root {
  --background: #f7f9fc;
  --foreground: #111827;
  --surface: #ffffff;
  --surface-subtle: #f8fafc;
  --surface-hover: #f1f5f9;
  --surface-strong: #ffffff;
  --surface-strong-foreground: #111827;
  --border: #d9e0e8;
  --border-subtle: #e9eef5;
  --muted: #526176;
  --muted-foreground: #7b8798;
  --primary: #0a2540;
  --primary-foreground: #ffffff;
  --success: #067647;
  --warning: #b54708;
  --danger: #b42318;
  --info: #175cd3;
  --focus-ring: rgba(10, 37, 64, 0.22);
  --shadow-soft: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-panel: 0 8px 24px rgba(15, 23, 42, 0.06);
}
```

- [ ] **Step 2: Replace dark theme tokens with matching restrained contrast**

In the same file, replace the current `:root[data-theme='dark']` block with:

```css
:root[data-theme='dark'] {
  --background: #0b1118;
  --foreground: #f3f6fb;
  --surface: #101820;
  --surface-subtle: #151f2a;
  --surface-hover: #1b2734;
  --surface-strong: #101820;
  --surface-strong-foreground: #f3f6fb;
  --border: #263444;
  --border-subtle: #1f2b39;
  --muted: #a4b1c1;
  --muted-foreground: #7f90a3;
  --primary: #f3f6fb;
  --primary-foreground: #0b1118;
  --focus-ring: rgba(147, 197, 253, 0.28);
  --shadow-soft: 0 1px 2px rgba(0, 0, 0, 0.22);
  --shadow-panel: 0 12px 28px rgba(0, 0, 0, 0.28);
}
```

- [ ] **Step 3: Add global focus and reduced-motion defaults**

Append this after the `button, input, select` rule:

```css
button,
a,
input,
select {
  -webkit-tap-highlight-color: transparent;
}

:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 4: Run lint after token changes**

Run: `pnpm lint`

Expected: command completes without new lint errors. If the project lint command is unavailable because of local configuration, record the exact error before continuing.

---

### Task 2: Polish The Persistent App Shell

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Replace `AppShell` markup with refined shell layering**

Replace the component body with:

```tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-dvh overflow-hidden">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--surface)_0%,var(--background)_220px)]">
          <Topbar />
          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint after shell markup change**

Run: `pnpm lint`

Expected: PASS or no new lint errors.

---

### Task 3: Rebuild Sidebar Interaction Polish

**Files:**
- Modify: `src/components/layout/sidebar-nav.tsx`

- [ ] **Step 1: Update imports for richer icon grammar**

Replace the lucide import line:

```tsx
import { LayoutPanelTop } from 'lucide-react';
```

with:

```tsx
import { Boxes, CalendarDays, CheckCircle2, CircleDollarSign, Code2, Home, LayoutPanelTop, PackageSearch, Plug, Settings, ShoppingCart, Truck } from 'lucide-react';
```

- [ ] **Step 2: Add icon mapping above `SidebarNav`**

Add this after the imports:

```tsx
const navIconMap = {
  首页: Home,
  工作台: CheckCircle2,
  交易: ShoppingCart,
  库存: PackageSearch,
  采购: Truck,
  财务: CircleDollarSign,
  应用: Plug,
  开发者: Code2,
  报表: LayoutPanelTop,
  系统: Settings
} as const;
```

- [ ] **Step 3: Replace the sidebar JSX with polished expanded/collapsed states**

Replace the full `return (...)` inside `SidebarNav` with:

```tsx
  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] transition-[width] duration-200 ease-out lg:flex lg:flex-col',
        sidebarCollapsed ? 'w-[76px]' : 'w-[264px]'
      )}
      aria-label="Primary navigation"
    >
      <div className={cn('border-b border-[var(--border-subtle)] px-3 py-4', sidebarCollapsed && 'px-2')}>
        <div className={cn('mb-4 flex items-center gap-2 px-2', sidebarCollapsed && 'justify-center px-0')}>
          <div className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--foreground)]">
            <Boxes className="size-4" aria-hidden="true" />
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">ERP Console</div>
              <div className="truncate text-[11px] font-medium text-[var(--muted-foreground)]">Operational workspace</div>
            </div>
          ) : null}
        </div>
        <CompanySwitcher />
      </div>

      <nav className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4', sidebarCollapsed && 'px-2')}>
        {navigationGroups.map((group) => {
          const items = group.items.filter((item) => hasAnyCapability('admin', item.capabilities));
          const GroupIcon = navIconMap[group.title as keyof typeof navIconMap] ?? CalendarDays;
          if (items.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <GroupIcon className="size-3.5" aria-hidden="true" />
                  <span>{group.title}</span>
                </div>
              ) : null}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/dashboard/overview' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={`${group.title}-${item.title}`}
                      href={item.href}
                      title={item.title}
                      aria-label={item.title}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex min-h-11 items-center rounded-lg text-[13px] font-medium text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:bg-[var(--surface-hover)]',
                        active && 'bg-[var(--surface-subtle)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--border-subtle)]',
                        sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-2.5'
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
                          active
                            ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]'
                            : 'border-transparent bg-transparent text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
                        )}
                      >
                        <GroupIcon className="size-3.5" aria-hidden="true" />
                      </span>
                      {!sidebarCollapsed ? <span className="truncate">{item.title}</span> : null}
                      {active ? <span className="absolute left-0 top-2 h-7 w-0.5 rounded-full bg-[var(--primary)]" aria-hidden="true" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
```

- [ ] **Step 4: Run lint after sidebar change**

Run: `pnpm lint`

Expected: PASS or no new lint errors.

---

### Task 4: Polish Topbar Global Utility Interactions

**Files:**
- Modify: `src/components/layout/topbar.tsx`

- [ ] **Step 1: Replace topbar JSX with refined controls**

Replace the full `return (...)` inside `Topbar` with:

```tsx
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-4 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-soft)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] active:scale-[0.98]"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? copy.expand : copy.collapse}
          aria-pressed={sidebarCollapsed}
        >
          <PanelLeft className="size-4" aria-hidden="true" />
        </button>
        <button className="hidden h-9 min-w-[280px] max-w-[420px] items-center justify-between gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-left text-[13px] text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] sm:flex lg:min-w-[360px]" aria-label={copy.searchPlaceholder}>
          <span className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.searchPlaceholder}</span>
          </span>
          <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">/</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] active:scale-[0.98]" aria-label={copy.help}>
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
        <button className="relative flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] active:scale-[0.98]" aria-label={copy.notifications}>
          <Bell className="size-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--warning)]" aria-hidden="true" />
        </button>
        <button className="mx-1 hidden h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] transition duration-150 hover:opacity-90 active:scale-[0.98] sm:flex">
          <Plus className="size-3.5" aria-hidden="true" />
          {copy.create}
        </button>
        <UserMenu />
      </div>
    </header>
  );
```

- [ ] **Step 2: Run lint after topbar change**

Run: `pnpm lint`

Expected: PASS or no new lint errors.

---

### Task 5: Align Shared Admin Components With The New Shell

**Files:**
- Modify: `src/components/admin/page-header.tsx`
- Modify: `src/components/admin/section-card.tsx`
- Modify: `src/components/admin/action-toolbar.tsx`
- Modify: `src/components/admin/data-table-shell.tsx`

- [ ] **Step 1: Update page header button styling**

In `src/components/admin/page-header.tsx`, replace the `className={...}` expression on the action button with:

```tsx
            className={
              action.variant === 'primary'
                ? 'h-9 rounded-lg bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] transition duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
                : 'h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
            }
```

- [ ] **Step 2: Update section card panel styling**

In `src/components/admin/section-card.tsx`, replace the returned JSX with:

```tsx
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
```

- [ ] **Step 3: Update action toolbar styling**

In `src/components/admin/action-toolbar.tsx`, replace the returned JSX with:

```tsx
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <button className="flex h-9 min-w-[260px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-left text-[13px] text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] sm:min-w-[320px]" aria-label={searchPlaceholder}>
        <Search className="size-4" aria-hidden="true" />
        <span>{searchPlaceholder}</span>
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]">
          <Filter className="size-3.5" aria-hidden="true" />
          筛选
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]">
          <Columns3 className="size-3.5" aria-hidden="true" />
          列设置
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          更多视图
        </button>
      </div>
    </div>
  );
```

- [ ] **Step 4: Update data table styling**

In `src/components/admin/data-table-shell.tsx`, make these replacements:

Replace:

```tsx
<div className="overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--surface)]">
```

with:

```tsx
<div className="overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--surface)]">
```

Replace the table class:

```tsx
<table className="min-w-full border-collapse text-left text-[13px]">
```

with:

```tsx
<table className="min-w-full border-collapse text-left text-[13px]">
```

Replace the `thead` class with:

```tsx
<thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
```

Replace checkbox cells:

```tsx
<th className="w-10 px-5 py-3"><input type="checkbox" aria-label="Select all rows" /></th>
```

with:

```tsx
<th className="w-10 px-4 py-3"><input className="size-4 rounded border-[var(--border)]" type="checkbox" aria-label="Select all rows" /></th>
```

Replace body row class:

```tsx
<tr key={row.id} className="group hover:bg-[var(--surface-subtle)]/80">
```

with:

```tsx
<tr key={row.id} className="group transition-colors duration-150 hover:bg-[var(--surface-subtle)]">
```

Replace row checkbox cell:

```tsx
<td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${row.id}`} /></td>
```

with:

```tsx
<td className="px-4 py-3.5"><input className="size-4 rounded border-[var(--border)]" type="checkbox" aria-label={`Select ${row.id}`} /></td>
```

Replace the mapped data cell classes with:

```tsx
<td key={String(column.key)} className={index === 0 ? 'whitespace-nowrap px-5 py-3.5 text-[13px] font-semibold text-[var(--foreground)]' : 'whitespace-nowrap px-5 py-3.5 text-[13px] text-[var(--muted)]'}>
```

Replace row action cell:

```tsx
<td className="px-5 py-4 text-right text-[var(--muted)] opacity-0 transition group-hover:opacity-100"><MoreHorizontal className="inline size-4" /></td>
```

with:

```tsx
<td className="px-4 py-3.5 text-right text-[var(--muted)]">
  <button className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent opacity-0 transition duration-150 hover:border-[var(--border)] hover:bg-[var(--surface)] group-hover:opacity-100 focus-visible:opacity-100" aria-label={`More actions for ${row.id}`}>
    <MoreHorizontal className="size-4" aria-hidden="true" />
  </button>
</td>
```

Replace pagination button classes:

```tsx
<button className="rounded-xl border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-hover)]">上一页</button>
```

and:

```tsx
<button className="rounded-xl border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-hover)]">下一页</button>
```

with:

```tsx
<button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)]">上一页</button>
```

and:

```tsx
<button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)]">下一页</button>
```

- [ ] **Step 5: Run lint after shared component polish**

Run: `pnpm lint`

Expected: PASS or no new lint errors.

---

### Task 6: Verify In Browser And Build

**Files:**
- No direct edits expected.

- [ ] **Step 1: Run the production build**

Run: `pnpm build`

Expected: build completes successfully.

- [ ] **Step 2: Start the development server**

Run: `pnpm dev`

Expected: Next.js dev server starts and reports a local URL, usually `http://localhost:3000`.

- [ ] **Step 3: Verify desktop shell manually in browser**

Open the local app and verify:

- Dashboard shell renders.
- Sidebar expanded state shows product identity, grouped nav, company switcher, and active item.
- Sidebar collapse button collapses the sidebar.
- Collapsed sidebar keeps icon navigation clickable.
- Active route remains visible in collapsed state.
- Topbar controls show hover/focus states.
- Overview content remains readable and aligned.

- [ ] **Step 4: Verify narrow viewport manually in browser**

Resize to a narrow viewport around 390px width and verify:

- No horizontal page overflow.
- Topbar does not crowd into unusable controls.
- Main content remains reachable.
- No fixed shell element hides primary content.

- [ ] **Step 5: Stop dev server**

Stop the running `pnpm dev` process after browser verification.

---

## Self-Review Notes

Spec coverage:

- Visual tokens: Task 1
- Shell layout: Task 2
- Sidebar collapse/expand and accessibility: Task 3
- Topbar utility polish: Task 4
- Shared panel/button/table states: Task 5
- Lint/build/browser verification: Task 6

No placeholders are intentionally left in this plan. This plan avoids broader page archetype rewrites and keeps the implementation scoped to the approved Shell + Interaction Polish phase.
