# ERP Admin Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Stripe-style ERP admin frontend framework with shell, navigation, multi-company context, permission-aware actions, and representative overview/orders/inventory/settings pages.

**Architecture:** Create a new Next.js App Router project, then implement the framework in layers: shell, archetypes, shared admin components, typed configs, domain fixtures, and pages. Keep business pages thin by passing data/config into reusable templates.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, lucide-react, class-variance-authority-style utility patterns, local mock data/config.

---

## File Structure

Create a new project in `erp-admin-console/` under the current workspace.

- `erp-admin-console/package.json` — scripts and dependencies.
- `erp-admin-console/tsconfig.json` — TypeScript configuration with `@/*` alias.
- `erp-admin-console/next.config.ts` — Next.js config.
- `erp-admin-console/postcss.config.mjs` — Tailwind v4 PostCSS config.
- `erp-admin-console/eslint.config.mjs` — Next lint config.
- `erp-admin-console/src/app/layout.tsx` — root HTML shell.
- `erp-admin-console/src/app/page.tsx` — redirect to `/dashboard/overview`.
- `erp-admin-console/src/app/globals.css` — Stripe-style neutral theme tokens and base styles.
- `erp-admin-console/src/app/dashboard/layout.tsx` — app shell wrapper.
- `erp-admin-console/src/app/dashboard/overview/page.tsx` — overview dashboard.
- `erp-admin-console/src/app/dashboard/orders/page.tsx` — orders list.
- `erp-admin-console/src/app/dashboard/inventory/page.tsx` — inventory list.
- `erp-admin-console/src/app/dashboard/settings/page.tsx` — settings hub.
- `erp-admin-console/src/app/dashboard/settings/access/page.tsx` — access settings page.
- `erp-admin-console/src/components/layout/app-shell.tsx` — persistent shell layout.
- `erp-admin-console/src/components/layout/environment-bar.tsx` — top environment strip.
- `erp-admin-console/src/components/layout/sidebar-nav.tsx` — permission-aware navigation.
- `erp-admin-console/src/components/layout/topbar.tsx` — global utility bar.
- `erp-admin-console/src/components/layout/company-switcher.tsx` — company selector UI.
- `erp-admin-console/src/components/archetypes/dashboard-template.tsx` — dashboard page grammar.
- `erp-admin-console/src/components/archetypes/list-page-template.tsx` — list page grammar.
- `erp-admin-console/src/components/archetypes/settings-hub-template.tsx` — settings hub grammar.
- `erp-admin-console/src/components/admin/page-header.tsx` — consistent page headers.
- `erp-admin-console/src/components/admin/action-toolbar.tsx` — list toolbar.
- `erp-admin-console/src/components/admin/status-badge.tsx` — mapped status badges.
- `erp-admin-console/src/components/admin/section-card.tsx` — bordered information panel.
- `erp-admin-console/src/components/admin/metadata-panel.tsx` — right-side metadata/config panel.
- `erp-admin-console/src/components/admin/data-table-shell.tsx` — compact table wrapper.
- `erp-admin-console/src/lib/utils.ts` — `cn` class utility.
- `erp-admin-console/src/lib/tenant-context.ts` — mock tenant, company, and current role.
- `erp-admin-console/src/lib/permissions.ts` — role capabilities and permission helpers.
- `erp-admin-console/src/lib/navigation.ts` — grouped navigation config.
- `erp-admin-console/src/lib/mappers/status.ts` — status-to-badge mapping.
- `erp-admin-console/src/lib/mock-data/overview.ts` — overview fixtures.
- `erp-admin-console/src/lib/mock-data/orders.ts` — order fixtures.
- `erp-admin-console/src/lib/mock-data/inventory.ts` — inventory fixtures.
- `erp-admin-console/src/lib/mock-data/settings.ts` — settings fixtures.

## Task 1: Scaffold The Next.js Project

**Files:**
- Create: `erp-admin-console/package.json`
- Create: `erp-admin-console/tsconfig.json`
- Create: `erp-admin-console/next.config.ts`
- Create: `erp-admin-console/postcss.config.mjs`
- Create: `erp-admin-console/eslint.config.mjs`
- Create: `erp-admin-console/src/app/layout.tsx`
- Create: `erp-admin-console/src/app/page.tsx`
- Create: `erp-admin-console/src/app/globals.css`

- [ ] **Step 1: Create the project directories**

Run:

```bash
mkdir -p erp-admin-console/src/app
```

Expected: `erp-admin-console/src/app` exists.

- [ ] **Step 2: Create `package.json`**

Create `erp-admin-console/package.json`:

```json
{
  "name": "erp-admin-console",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@tailwindcss/postcss": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "tailwindcss": "latest",
    "typescript": "latest"
  }
}
```

- [ ] **Step 3: Create TypeScript and Next config**

Create `erp-admin-console/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `erp-admin-console/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `erp-admin-console/postcss.config.mjs`:

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {}
  }
};

export default config;
```

Create `erp-admin-console/eslint.config.mjs`:

```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [...compat.extends('next/core-web-vitals', 'next/typescript')];

export default eslintConfig;
```

- [ ] **Step 4: Create root app files**

Create `erp-admin-console/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ERP Console',
  description: 'Stripe-style ERP admin framework'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `erp-admin-console/src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard/overview');
}
```

Create `erp-admin-console/src/app/globals.css`:

```css
@import 'tailwindcss';

:root {
  --background: #f6f8fa;
  --foreground: #1f2933;
  --surface: #ffffff;
  --surface-subtle: #f9fafb;
  --border: #d8dee4;
  --border-subtle: #eaeef2;
  --muted: #687385;
  --muted-foreground: #7a8594;
  --primary: #635bff;
  --primary-foreground: #ffffff;
  --success: #067647;
  --warning: #b54708;
  --danger: #b42318;
  --info: #175cd3;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select {
  font: inherit;
}
```

- [ ] **Step 5: Install dependencies**

Run:

```bash
cd erp-admin-console && pnpm install
```

Expected: dependencies install and `pnpm-lock.yaml` is created.

- [ ] **Step 6: Verify scaffold builds**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: Next.js builds successfully, though `/dashboard/overview` does not exist yet and will be created in later tasks.

## Task 2: Add Core Utilities, Tenant Context, Permissions, And Navigation

**Files:**
- Create: `erp-admin-console/src/lib/utils.ts`
- Create: `erp-admin-console/src/lib/tenant-context.ts`
- Create: `erp-admin-console/src/lib/permissions.ts`
- Create: `erp-admin-console/src/lib/navigation.ts`

- [ ] **Step 1: Create `cn` utility**

Create `erp-admin-console/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create tenant context fixtures**

Create `erp-admin-console/src/lib/tenant-context.ts`:

```ts
export type Role = 'owner' | 'admin' | 'operations' | 'finance' | 'analyst' | 'developer';

export type Tenant = {
  id: string;
  name: string;
  environment: 'test' | 'live';
};

export type Company = {
  id: string;
  tenantId: string;
  name: string;
  region: string;
  currency: string;
};

export const currentTenant: Tenant = {
  id: 'tenant_acme',
  name: 'Acme Group',
  environment: 'test'
};

export const companies: Company[] = [
  { id: 'company_northwind', tenantId: 'tenant_acme', name: 'Northwind Trading Ltd.', region: 'US', currency: 'USD' },
  { id: 'company_contoso', tenantId: 'tenant_acme', name: 'Contoso Supply Co.', region: 'EU', currency: 'EUR' },
  { id: 'company_adatum', tenantId: 'tenant_acme', name: 'A. Datum Logistics', region: 'APAC', currency: 'SGD' }
];

export const currentCompany = companies[0];
export const currentUserRole: Role = 'admin';
```

- [ ] **Step 3: Create permission helpers**

Create `erp-admin-console/src/lib/permissions.ts`:

```ts
import type { Role } from '@/lib/tenant-context';

export type Capability =
  | 'overview:read'
  | 'orders:read'
  | 'orders:write'
  | 'customers:read'
  | 'inventory:read'
  | 'inventory:write'
  | 'procurement:read'
  | 'finance:read'
  | 'finance:write'
  | 'reports:read'
  | 'developer:read'
  | 'settings:read'
  | 'settings:write'
  | 'access:manage';

const roleCapabilities: Record<Role, Capability[]> = {
  owner: [
    'overview:read',
    'orders:read',
    'orders:write',
    'customers:read',
    'inventory:read',
    'inventory:write',
    'procurement:read',
    'finance:read',
    'finance:write',
    'reports:read',
    'developer:read',
    'settings:read',
    'settings:write',
    'access:manage'
  ],
  admin: [
    'overview:read',
    'orders:read',
    'orders:write',
    'customers:read',
    'inventory:read',
    'inventory:write',
    'procurement:read',
    'finance:read',
    'reports:read',
    'developer:read',
    'settings:read',
    'settings:write',
    'access:manage'
  ],
  operations: ['overview:read', 'orders:read', 'orders:write', 'customers:read', 'inventory:read', 'inventory:write', 'procurement:read'],
  finance: ['overview:read', 'orders:read', 'customers:read', 'finance:read', 'finance:write', 'reports:read'],
  analyst: ['overview:read', 'orders:read', 'customers:read', 'inventory:read', 'procurement:read', 'finance:read', 'reports:read'],
  developer: ['overview:read', 'developer:read', 'settings:read']
};

export function hasCapability(role: Role, capability: Capability) {
  return roleCapabilities[role].includes(capability);
}

export function hasAnyCapability(role: Role, capabilities: Capability[]) {
  return capabilities.some((capability) => hasCapability(role, capability));
}
```

- [ ] **Step 4: Create grouped navigation config**

Create `erp-admin-console/src/lib/navigation.ts`:

```ts
import type { Capability } from '@/lib/permissions';

export type NavItem = {
  title: string;
  href: string;
  capabilities: Capability[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navigationGroups: NavGroup[] = [
  {
    title: 'Home',
    items: [
      { title: 'Overview', href: '/dashboard/overview', capabilities: ['overview:read'] },
      { title: 'Today', href: '/dashboard/overview', capabilities: ['overview:read'] }
    ]
  },
  {
    title: 'Commerce',
    items: [
      { title: 'Orders', href: '/dashboard/orders', capabilities: ['orders:read'] },
      { title: 'Customers', href: '/dashboard/orders', capabilities: ['customers:read'] },
      { title: 'Returns', href: '/dashboard/orders', capabilities: ['orders:read'] }
    ]
  },
  {
    title: 'Operations',
    items: [
      { title: 'Inventory', href: '/dashboard/inventory', capabilities: ['inventory:read'] },
      { title: 'Warehouses', href: '/dashboard/inventory', capabilities: ['inventory:read'] },
      { title: 'Shipments', href: '/dashboard/orders', capabilities: ['orders:read'] },
      { title: 'Exceptions', href: '/dashboard/orders', capabilities: ['orders:read'] }
    ]
  },
  {
    title: 'Procurement',
    items: [
      { title: 'Purchase orders', href: '/dashboard/inventory', capabilities: ['procurement:read'] },
      { title: 'Suppliers', href: '/dashboard/inventory', capabilities: ['procurement:read'] },
      { title: 'Receiving', href: '/dashboard/inventory', capabilities: ['procurement:read'] }
    ]
  },
  {
    title: 'Money',
    items: [
      { title: 'Invoices', href: '/dashboard/overview', capabilities: ['finance:read'] },
      { title: 'Payments', href: '/dashboard/overview', capabilities: ['finance:read'] },
      { title: 'Adjustments', href: '/dashboard/overview', capabilities: ['finance:write'] }
    ]
  },
  {
    title: 'Insights',
    items: [
      { title: 'Reports', href: '/dashboard/overview', capabilities: ['reports:read'] },
      { title: 'Analytics', href: '/dashboard/overview', capabilities: ['reports:read'] }
    ]
  },
  {
    title: 'Developer',
    items: [
      { title: 'Events', href: '/dashboard/settings/access', capabilities: ['developer:read'] },
      { title: 'API logs', href: '/dashboard/settings/access', capabilities: ['developer:read'] },
      { title: 'Workbench', href: '/dashboard/settings/access', capabilities: ['developer:read'] }
    ]
  },
  {
    title: 'System',
    items: [{ title: 'Settings', href: '/dashboard/settings', capabilities: ['settings:read'] }]
  }
];
```

- [ ] **Step 5: Run type check through build**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: build succeeds or fails only because dashboard pages/layout do not exist yet.

## Task 3: Build The Persistent Shell

**Files:**
- Create: `erp-admin-console/src/components/layout/environment-bar.tsx`
- Create: `erp-admin-console/src/components/layout/company-switcher.tsx`
- Create: `erp-admin-console/src/components/layout/topbar.tsx`
- Create: `erp-admin-console/src/components/layout/sidebar-nav.tsx`
- Create: `erp-admin-console/src/components/layout/app-shell.tsx`
- Create: `erp-admin-console/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create environment bar**

Create `erp-admin-console/src/components/layout/environment-bar.tsx`:

```tsx
import { currentTenant } from '@/lib/tenant-context';

export function EnvironmentBar() {
  return (
    <div className="flex h-8 items-center border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 text-xs text-[var(--muted)]">
      <span className="font-medium text-[var(--foreground)]">{currentTenant.environment === 'test' ? 'Test mode' : 'Live mode'}</span>
      <span className="mx-2 text-[var(--border)]">/</span>
      <span>{currentTenant.name}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create company switcher**

Create `erp-admin-console/src/components/layout/company-switcher.tsx`:

```tsx
import { ChevronDown } from 'lucide-react';
import { companies, currentCompany } from '@/lib/tenant-context';

export function CompanySwitcher() {
  return (
    <button className="flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
      <span className="max-w-44 truncate">{currentCompany.name}</span>
      <span className="text-xs text-[var(--muted)]">{companies.length}</span>
      <ChevronDown className="size-3.5 text-[var(--muted)]" />
    </button>
  );
}
```

- [ ] **Step 3: Create topbar**

Create `erp-admin-console/src/components/layout/topbar.tsx`:

```tsx
import { Bell, CircleHelp, Plus, Search } from 'lucide-react';
import { CompanySwitcher } from '@/components/layout/company-switcher';

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-white px-5">
      <div className="flex min-w-0 items-center gap-3">
        <CompanySwitcher />
        <div className="hidden h-8 w-80 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-sm text-[var(--muted)] md:flex">
          <Search className="size-4" />
          <span>Search orders, inventory, reports...</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]" aria-label="Help">
          <CircleHelp className="size-4" />
        </button>
        <button className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]" aria-label="Notifications">
          <Bell className="size-4" />
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-md bg-[var(--foreground)] px-3 text-sm font-medium text-white hover:bg-black">
          <Plus className="size-3.5" />
          Create
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create permission-aware sidebar nav**

Create `erp-admin-console/src/components/layout/sidebar-nav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationGroups } from '@/lib/navigation';
import { hasAnyCapability } from '@/lib/permissions';
import { currentUserRole } from '@/lib/tenant-context';
import { cn } from '@/lib/utils';

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-white lg:block">
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        <div>
          <div className="text-sm font-semibold text-[var(--foreground)]">ERP Console</div>
          <div className="text-xs text-[var(--muted)]">Operations workspace</div>
        </div>
      </div>
      <nav className="space-y-6 px-3 py-4">
        {navigationGroups.map((group) => {
          const items = group.items.filter((item) => hasAnyCapability(currentUserRole, item.capabilities));
          if (items.length === 0) return null;

          return (
            <div key={group.title}>
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{group.title}</div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/dashboard/overview' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={`${group.title}-${item.title}`}
                      href={item.href}
                      className={cn(
                        'block rounded-md border-l-2 px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]',
                        active && 'border-l-[var(--primary)] bg-[var(--surface-subtle)] font-medium text-[var(--foreground)]',
                        !active && 'border-l-transparent'
                      )}
                    >
                      {item.title}
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
}
```

- [ ] **Step 5: Create app shell and dashboard layout**

Create `erp-admin-console/src/components/layout/app-shell.tsx`:

```tsx
import { EnvironmentBar } from '@/components/layout/environment-bar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Topbar } from '@/components/layout/topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <EnvironmentBar />
      <div className="flex min-h-[calc(100vh-2rem)]">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
```

Create `erp-admin-console/src/app/dashboard/layout.tsx`:

```tsx
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 6: Verify shell compiles**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: build fails only for missing dashboard route pages, not for imports or TypeScript errors.

## Task 4: Build Shared Admin Components And Mappers

**Files:**
- Create: `erp-admin-console/src/components/admin/page-header.tsx`
- Create: `erp-admin-console/src/components/admin/action-toolbar.tsx`
- Create: `erp-admin-console/src/components/admin/status-badge.tsx`
- Create: `erp-admin-console/src/components/admin/section-card.tsx`
- Create: `erp-admin-console/src/components/admin/metadata-panel.tsx`
- Create: `erp-admin-console/src/components/admin/data-table-shell.tsx`
- Create: `erp-admin-console/src/lib/mappers/status.ts`

- [ ] **Step 1: Create page header**

Create `erp-admin-console/src/components/admin/page-header.tsx`:

```tsx
export type PageAction = {
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function PageHeader({ title, description, actions = [] }: { title: string; description: string; actions?: PageAction[] }) {
  return (
    <div className="mb-5 flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            disabled={action.disabled}
            className={
              action.variant === 'primary'
                ? 'h-8 rounded-md bg-[var(--foreground)] px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'
                : 'h-8 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create toolbar and panels**

Create `erp-admin-console/src/components/admin/action-toolbar.tsx`:

```tsx
import { Columns3, Filter, Search, SlidersHorizontal } from 'lucide-react';

export function ActionToolbar({ searchPlaceholder }: { searchPlaceholder: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex h-8 min-w-64 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-sm text-[var(--muted)]">
        <Search className="size-4" />
        <span>{searchPlaceholder}</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
          <Filter className="size-3.5" />
          Filter
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
          <SlidersHorizontal className="size-3.5" />
          Views
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
          <Columns3 className="size-3.5" />
          Columns
        </button>
      </div>
    </div>
  );
}
```

Create `erp-admin-console/src/components/admin/section-card.tsx`:

```tsx
export function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
```

Create `erp-admin-console/src/components/admin/metadata-panel.tsx`:

```tsx
export type MetadataItem = {
  label: string;
  value: string;
};

export function MetadataPanel({ title, items }: { title: string; items: MetadataItem[] }) {
  return (
    <aside className="rounded-lg border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{title}</div>
      <dl className="divide-y divide-[var(--border-subtle)]">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{item.label}</dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
```

- [ ] **Step 3: Create status mapper and badge**

Create `erp-admin-console/src/lib/mappers/status.ts`:

```ts
export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function mapStatusToBadge(status: string): { label: string; variant: StatusVariant } {
  const normalized = status.toLowerCase();

  if (['paid', 'completed', 'available', 'active', 'healthy'].includes(normalized)) return { label: status, variant: 'success' };
  if (['processing', 'reserved', 'pending', 'scheduled'].includes(normalized)) return { label: status, variant: 'info' };
  if (['hold', 'low stock', 'review', 'delayed'].includes(normalized)) return { label: status, variant: 'warning' };
  if (['failed', 'blocked', 'out of stock', 'exception'].includes(normalized)) return { label: status, variant: 'danger' };

  return { label: status, variant: 'neutral' };
}
```

Create `erp-admin-console/src/components/admin/status-badge.tsx`:

```tsx
import { mapStatusToBadge } from '@/lib/mappers/status';
import { cn } from '@/lib/utils';

const variantClasses = {
  success: 'bg-green-50 text-[var(--success)] ring-green-200',
  warning: 'bg-amber-50 text-[var(--warning)] ring-amber-200',
  danger: 'bg-red-50 text-[var(--danger)] ring-red-200',
  info: 'bg-blue-50 text-[var(--info)] ring-blue-200',
  neutral: 'bg-gray-50 text-[var(--muted)] ring-gray-200'
};

export function StatusBadge({ status }: { status: string }) {
  const badge = mapStatusToBadge(status);

  return <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', variantClasses[badge.variant])}>{badge.label}</span>;
}
```

- [ ] **Step 4: Create table shell**

Create `erp-admin-console/src/components/admin/data-table-shell.tsx`:

```tsx
import { MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  isStatus?: boolean;
};

export function DataTableShell<T extends { id: string }>({ columns, rows }: { columns: TableColumn<T>[]; rows: T[] }) {
  return (
    <div className="overflow-hidden rounded-b-lg border-t border-[var(--border-subtle)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="w-10 px-3 py-2"><input type="checkbox" aria-label="Select all rows" /></th>
              {columns.map((column) => (
                <th key={String(column.key)} className="whitespace-nowrap px-3 py-2">{column.label}</th>
              ))}
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--surface-subtle)]">
                <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${row.id}`} /></td>
                {columns.map((column, index) => {
                  const value = String(row[column.key] ?? '');
                  return (
                    <td key={String(column.key)} className={index === 0 ? 'whitespace-nowrap px-3 py-2 font-medium text-[var(--foreground)]' : 'whitespace-nowrap px-3 py-2 text-[var(--muted)]'}>
                      {column.isStatus ? <StatusBadge status={value} /> : value}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-[var(--muted)]"><MoreHorizontal className="inline size-4" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--muted)]">
        <span>{rows.length} results</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run build**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: no TypeScript errors from shared components.

## Task 5: Build Page Archetypes

**Files:**
- Create: `erp-admin-console/src/components/archetypes/list-page-template.tsx`
- Create: `erp-admin-console/src/components/archetypes/dashboard-template.tsx`
- Create: `erp-admin-console/src/components/archetypes/settings-hub-template.tsx`

- [ ] **Step 1: Create list page template**

Create `erp-admin-console/src/components/archetypes/list-page-template.tsx`:

```tsx
import { ActionToolbar } from '@/components/admin/action-toolbar';
import { DataTableShell, type TableColumn } from '@/components/admin/data-table-shell';
import { PageHeader, type PageAction } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';

export function ListPageTemplate<T extends { id: string }>({
  title,
  description,
  actions,
  tabs,
  activeTab,
  searchPlaceholder,
  columns,
  rows
}: {
  title: string;
  description: string;
  actions: PageAction[];
  tabs: string[];
  activeTab: string;
  searchPlaceholder: string;
  columns: TableColumn<T>[];
  rows: T[];
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        <div className="flex gap-1 border-b border-[var(--border)] px-3 pt-3">
          {tabs.map((tab) => (
            <button key={tab} className={cn('border-b-2 px-2.5 pb-2 text-sm font-medium', tab === activeTab ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]')}>
              {tab}
            </button>
          ))}
        </div>
        <ActionToolbar searchPlaceholder={searchPlaceholder} />
        <DataTableShell columns={columns} rows={rows} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard template**

Create `erp-admin-console/src/components/archetypes/dashboard-template.tsx`:

```tsx
import { MetadataPanel, type MetadataItem } from '@/components/admin/metadata-panel';
import { PageHeader, type PageAction } from '@/components/admin/page-header';

export function DashboardTemplate({
  title,
  description,
  actions,
  children,
  metadata
}: {
  title: string;
  description: string;
  actions: PageAction[];
  children: React.ReactNode;
  metadata: MetadataItem[];
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">{children}</div>
        <MetadataPanel title="Company context" items={metadata} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create settings hub template**

Create `erp-admin-console/src/components/archetypes/settings-hub-template.tsx`:

```tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MetadataPanel, type MetadataItem } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';

export type SettingsModule = {
  title: string;
  description: string;
  href: string;
  status?: string;
};

export type SettingsGroup = {
  title: string;
  modules: SettingsModule[];
};

export function SettingsHubTemplate({ groups, metadata }: { groups: SettingsGroup[]; metadata: MetadataItem[] }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Settings" description="Manage organization, access, operations, finance, and developer configuration." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{group.title}</h2>
              <div className="divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border)] bg-white">
                {group.modules.map((module) => (
                  <Link key={module.title} href={module.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--surface-subtle)]">
                    <div>
                      <div className="text-sm font-medium text-[var(--foreground)]">{module.title}</div>
                      <div className="mt-0.5 text-sm text-[var(--muted)]">{module.description}</div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                      {module.status ? <span>{module.status}</span> : null}
                      <ArrowRight className="size-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        <MetadataPanel title="Account scope" items={metadata} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run build**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: archetype components compile.

## Task 6: Add Mock Data Fixtures

**Files:**
- Create: `erp-admin-console/src/lib/mock-data/overview.ts`
- Create: `erp-admin-console/src/lib/mock-data/orders.ts`
- Create: `erp-admin-console/src/lib/mock-data/inventory.ts`
- Create: `erp-admin-console/src/lib/mock-data/settings.ts`

- [ ] **Step 1: Create overview fixtures**

Create `erp-admin-console/src/lib/mock-data/overview.ts`:

```ts
export const overviewMetrics = [
  { label: 'Open orders', value: '1,284', detail: '+8.2% from last week' },
  { label: 'Inventory exceptions', value: '32', detail: '12 require review today' },
  { label: 'Pending approvals', value: '18', detail: 'Oldest waiting 3 days' },
  { label: 'Revenue pending capture', value: '$84.2k', detail: 'Across 9 channels' }
];

export const recentActivity = [
  'Order #10024 moved to processing',
  'Northwind Trading switched receiving policy',
  'Inventory adjustment created for SKU-2048',
  'Payment batch B-2931 completed'
];
```

- [ ] **Step 2: Create orders fixtures**

Create `erp-admin-console/src/lib/mock-data/orders.ts`:

```ts
import type { TableColumn } from '@/components/admin/data-table-shell';

export type OrderRow = {
  id: string;
  order: string;
  status: string;
  customer: string;
  channel: string;
  date: string;
  amount: string;
  fulfillment: string;
  exception: string;
};

export const orderColumns: TableColumn<OrderRow>[] = [
  { key: 'order', label: 'Order' },
  { key: 'status', label: 'Status', isStatus: true },
  { key: 'customer', label: 'Customer' },
  { key: 'channel', label: 'Channel' },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'fulfillment', label: 'Fulfillment', isStatus: true },
  { key: 'exception', label: 'Exception' }
];

export const orders: OrderRow[] = [
  { id: 'ord_10024', order: '#10024', status: 'Processing', customer: 'Acme Retail', channel: 'Shopify', date: 'Jun 10', amount: '$420.00', fulfillment: 'Scheduled', exception: 'None' },
  { id: 'ord_10023', order: '#10023', status: 'Hold', customer: 'Northwind', channel: 'EDI', date: 'Jun 10', amount: '$118.40', fulfillment: 'Review', exception: 'Address' },
  { id: 'ord_10022', order: '#10022', status: 'Paid', customer: 'Contoso', channel: 'Wholesale', date: 'Jun 09', amount: '$2,840.00', fulfillment: 'Completed', exception: 'None' },
  { id: 'ord_10021', order: '#10021', status: 'Blocked', customer: 'A. Datum', channel: 'Marketplace', date: 'Jun 09', amount: '$937.12', fulfillment: 'Delayed', exception: 'Inventory' }
];
```

- [ ] **Step 3: Create inventory fixtures**

Create `erp-admin-console/src/lib/mock-data/inventory.ts`:

```ts
import type { TableColumn } from '@/components/admin/data-table-shell';

export type InventoryRow = {
  id: string;
  sku: string;
  product: string;
  available: string;
  reserved: string;
  warehouse: string;
  status: string;
  updated: string;
};

export const inventoryColumns: TableColumn<InventoryRow>[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'product', label: 'Product' },
  { key: 'available', label: 'Available' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'status', label: 'Status', isStatus: true },
  { key: 'updated', label: 'Updated' }
];

export const inventoryRows: InventoryRow[] = [
  { id: 'sku_2048', sku: 'SKU-2048', product: 'Transit Pack / Black', available: '1,204', reserved: '86', warehouse: 'LAX-01', status: 'Available', updated: '6 min ago' },
  { id: 'sku_1031', sku: 'SKU-1031', product: 'Dock Case / Slate', available: '42', reserved: '31', warehouse: 'DAL-02', status: 'Low stock', updated: '18 min ago' },
  { id: 'sku_8820', sku: 'SKU-8820', product: 'Field Kit / Sand', available: '0', reserved: '12', warehouse: 'NYC-03', status: 'Out of stock', updated: '1 hr ago' },
  { id: 'sku_4472', sku: 'SKU-4472', product: 'Control Module', available: '827', reserved: '104', warehouse: 'SFO-01', status: 'Reserved', updated: '2 hr ago' }
];
```

- [ ] **Step 4: Create settings fixtures**

Create `erp-admin-console/src/lib/mock-data/settings.ts`:

```ts
import type { SettingsGroup } from '@/components/archetypes/settings-hub-template';

export const settingsGroups: SettingsGroup[] = [
  {
    title: 'Organization',
    modules: [
      { title: 'Organization profile', description: 'Legal entity, tenant identity, and regional defaults.', href: '/dashboard/settings' },
      { title: 'Companies', description: 'Manage operating companies under this tenant.', href: '/dashboard/settings' }
    ]
  },
  {
    title: 'Access',
    modules: [
      { title: 'Users and roles', description: 'Invite users, assign roles, and review access scope.', href: '/dashboard/settings/access', status: 'Admin' },
      { title: 'Access policies', description: 'Define cross-company permissions and high-risk actions.', href: '/dashboard/settings/access' },
      { title: 'Audit logs', description: 'Review security and configuration activity.', href: '/dashboard/settings/access' }
    ]
  },
  {
    title: 'Operations',
    modules: [
      { title: 'Order routing', description: 'Default routing, fulfillment, and exception behavior.', href: '/dashboard/settings' },
      { title: 'Warehouse rules', description: 'Receiving, reservation, and transfer defaults.', href: '/dashboard/settings' }
    ]
  },
  {
    title: 'Finance',
    modules: [{ title: 'Payment and invoice settings', description: 'Invoice numbering, capture rules, and adjustments.', href: '/dashboard/settings' }]
  },
  {
    title: 'Developer',
    modules: [{ title: 'API and events', description: 'API logs, event delivery, and workbench settings.', href: '/dashboard/settings/access' }]
  }
];
```

- [ ] **Step 5: Run build**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: fixtures compile.

## Task 7: Implement Overview, Orders, Inventory, And Settings Pages

**Files:**
- Create: `erp-admin-console/src/app/dashboard/overview/page.tsx`
- Create: `erp-admin-console/src/app/dashboard/orders/page.tsx`
- Create: `erp-admin-console/src/app/dashboard/inventory/page.tsx`
- Create: `erp-admin-console/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Create overview page**

Create `erp-admin-console/src/app/dashboard/overview/page.tsx`:

```tsx
import { DashboardTemplate } from '@/components/archetypes/dashboard-template';
import { SectionCard } from '@/components/admin/section-card';
import { overviewMetrics, recentActivity } from '@/lib/mock-data/overview';
import { currentCompany, currentTenant } from '@/lib/tenant-context';

export default function OverviewPage() {
  return (
    <DashboardTemplate
      title="Overview"
      description="Monitor orders, inventory, approvals, and finance activity across the current company."
      actions={[{ label: 'Create report', variant: 'primary' }]}
      metadata={[
        { label: 'Tenant', value: currentTenant.name },
        { label: 'Company', value: currentCompany.name },
        { label: 'Environment', value: 'Test mode' },
        { label: 'System health', value: 'Healthy' }
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewMetrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="text-sm text-[var(--muted)]">{metric.label}</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{metric.value}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">{metric.detail}</div>
          </div>
        ))}
      </div>
      <SectionCard title="Recent activity" description="Latest operational events in this company.">
        <ul className="divide-y divide-[var(--border-subtle)]">
          {recentActivity.map((activity) => (
            <li key={activity} className="py-2 text-sm text-[var(--foreground)]">{activity}</li>
          ))}
        </ul>
      </SectionCard>
    </DashboardTemplate>
  );
}
```

- [ ] **Step 2: Create orders page**

Create `erp-admin-console/src/app/dashboard/orders/page.tsx`:

```tsx
import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import { hasCapability } from '@/lib/permissions';
import { orderColumns, orders } from '@/lib/mock-data/orders';
import { currentCompany, currentUserRole } from '@/lib/tenant-context';

export default function OrdersPage() {
  const canWriteOrders = hasCapability(currentUserRole, 'orders:write');

  return (
    <ListPageTemplate
      title="Orders"
      description={`Manage customer orders, fulfillment state, and exceptions for ${currentCompany.name}.`}
      actions={[
        { label: 'Export', variant: 'secondary' },
        { label: 'Create order', variant: 'primary', disabled: !canWriteOrders }
      ]}
      tabs={['All', 'Open', 'Processing', 'Exceptions', 'Completed']}
      activeTab="All"
      searchPlaceholder="Search orders..."
      columns={orderColumns}
      rows={orders}
    />
  );
}
```

- [ ] **Step 3: Create inventory page**

Create `erp-admin-console/src/app/dashboard/inventory/page.tsx`:

```tsx
import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import { inventoryColumns, inventoryRows } from '@/lib/mock-data/inventory';
import { hasCapability } from '@/lib/permissions';
import { currentCompany, currentUserRole } from '@/lib/tenant-context';

export default function InventoryPage() {
  const canWriteInventory = hasCapability(currentUserRole, 'inventory:write');

  return (
    <ListPageTemplate
      title="Inventory"
      description={`Review availability, reservations, and warehouse exceptions for ${currentCompany.name}.`}
      actions={[
        { label: 'Transfer', variant: 'secondary', disabled: !canWriteInventory },
        { label: 'Adjust inventory', variant: 'primary', disabled: !canWriteInventory }
      ]}
      tabs={['All', 'Available', 'Low stock', 'Reserved', 'Exceptions']}
      activeTab="All"
      searchPlaceholder="Search SKUs, products, warehouses..."
      columns={inventoryColumns}
      rows={inventoryRows}
    />
  );
}
```

- [ ] **Step 4: Create settings hub page**

Create `erp-admin-console/src/app/dashboard/settings/page.tsx`:

```tsx
import { SettingsHubTemplate } from '@/components/archetypes/settings-hub-template';
import { settingsGroups } from '@/lib/mock-data/settings';
import { currentCompany, currentTenant, currentUserRole } from '@/lib/tenant-context';

export default function SettingsPage() {
  return (
    <SettingsHubTemplate
      groups={settingsGroups}
      metadata={[
        { label: 'Tenant', value: currentTenant.name },
        { label: 'Current company', value: currentCompany.name },
        { label: 'Current role', value: currentUserRole },
        { label: 'Environment', value: 'Test mode' }
      ]}
    />
  );
}
```

- [ ] **Step 5: Run build**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: overview, orders, inventory, and settings pages compile and static rendering succeeds.

## Task 8: Implement Access Settings Page

**Files:**
- Create: `erp-admin-console/src/app/dashboard/settings/access/page.tsx`

- [ ] **Step 1: Create access settings page**

Create `erp-admin-console/src/app/dashboard/settings/access/page.tsx`:

```tsx
import { MetadataPanel } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { currentCompany, currentTenant, currentUserRole } from '@/lib/tenant-context';

const users = [
  { name: 'Mina Chen', email: 'mina@example.com', role: 'Owner', status: 'Active' },
  { name: 'Ari Patel', email: 'ari@example.com', role: 'Admin', status: 'Active' },
  { name: 'Sam Rivera', email: 'sam@example.com', role: 'Operations', status: 'Review' }
];

const policies = [
  'Company-scoped inventory adjustments require Operations or Admin.',
  'Finance adjustments require Finance or Owner.',
  'Cross-company access requires Admin approval.'
];

export default function AccessSettingsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Users and roles"
        description="Review user access, role assignments, and company-scoped policies."
        actions={[{ label: 'Invite user', variant: 'primary' }]}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <SectionCard title="Users" description="People with access to this tenant.">
            <div className="divide-y divide-[var(--border-subtle)]">
              {users.map((user) => (
                <div key={user.email} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{user.name}</div>
                    <div className="text-sm text-[var(--muted)]">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                    <span>{user.role}</span>
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Access policies" description="Company and high-risk action rules.">
            <ul className="space-y-2">
              {policies.map((policy) => (
                <li key={policy} className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)]">{policy}</li>
              ))}
            </ul>
          </SectionCard>
        </div>
        <MetadataPanel
          title="Access context"
          items={[
            { label: 'Tenant', value: currentTenant.name },
            { label: 'Company', value: currentCompany.name },
            { label: 'Your role', value: currentUserRole },
            { label: 'Last changed', value: 'Today at 09:42' }
          ]}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: access settings page compiles.

## Task 9: Final Verification And UI Smoke Test

**Files:**
- Modify only if verification finds defects.

- [ ] **Step 1: Run lint**

Run:

```bash
cd erp-admin-console && pnpm lint
```

Expected: no ESLint errors.

- [ ] **Step 2: Run production build**

Run:

```bash
cd erp-admin-console && pnpm build
```

Expected: production build succeeds.

- [ ] **Step 3: Start the dev server**

Run:

```bash
cd erp-admin-console && pnpm dev
```

Expected: Next.js starts on `http://localhost:3000` or the next available port.

- [ ] **Step 4: Manually verify pages in browser**

Open the local app and verify:

```text
/dashboard/overview renders the shell, overview metrics, recent activity, and company context.
/dashboard/orders renders the same shell, orders status tabs, toolbar, and compact table.
/dashboard/inventory renders the same list grammar with inventory fields.
/dashboard/settings renders grouped settings modules, including access modules.
/dashboard/settings/access renders users, roles, policies, and access context.
```

Expected: the shell remains stable across pages; active sidebar states update; company switcher remains visible; page actions stay in page headers.

- [ ] **Step 5: Check Stripe-style constraints**

Verify visually:

```text
No marketing hero sections.
No heavy gradients or glassmorphism.
No oversized soft cards.
No multiple primary actions at the same level.
No page-specific custom shell.
List pages share the same toolbar and table grammar.
Settings is grouped by system areas, not a generic landing grid.
```

Expected: the interface reads like a Stripe-style product admin console for ERP operations.

---

## Self-Review

Spec coverage:

- New project setup is covered by Task 1.
- Shell, navigation, and topbar are covered by Task 3.
- Multi-tenant and multi-company context are covered by Task 2 and surfaced in Tasks 3, 7, and 8.
- Permission-aware navigation and actions are covered by Tasks 2, 3, and 7.
- Page archetypes are covered by Task 5.
- Shared admin components are covered by Task 4.
- Mock data and field mapping are covered by Task 6.
- Overview, orders, inventory, settings, and access pages are covered by Tasks 7 and 8.
- Verification is covered by Task 9.

Placeholder scan: no TBD/TODO placeholders remain.

Type consistency: `Role`, `Capability`, `PageAction`, `TableColumn`, `SettingsGroup`, and fixture object keys match the components that consume them.
