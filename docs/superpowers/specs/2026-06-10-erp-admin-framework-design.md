---
title: ERP Admin Framework Design
---

# ERP Admin Framework Design

## Goal

Build a new ERP-style admin frontend framework that follows the Stripe dashboard grammar documented in `Stripe 风格后台规范/01-Stripe后台UI统一规范.md` and `Stripe 风格后台规范/02-Stripe后台技术实现规范.md`.

The first version should establish the system shell, navigation, page archetypes, shared components, and representative ERP pages. It should not behave like a generic ERP template, a marketing SaaS page, or an AI-gradient dashboard.

## Product Scope

The product is an ERP console with OMS, WMS, procurement, finance, reporting, developer, settings, multi-tenant, multi-company, and permission foundations.

The first implementation focuses on framework completeness over business depth:

- Persistent shell
- Stripe-style left navigation
- Top utility bar
- Company switcher
- Permission-aware navigation and actions
- Dashboard overview page
- Orders list page
- Inventory list page
- Settings hub
- Access settings page

Authentication and backend integration are out of scope for the first version. The app will use typed mock data and config fixtures.

## Architecture

The project should be created as a new Next.js App Router frontend using TypeScript, Tailwind CSS, shadcn/ui-style primitives, and a feature-based structure.

Recommended structure:

```text
app/
  dashboard/
    layout.tsx
    overview/
      page.tsx
    orders/
      page.tsx
    inventory/
      page.tsx
    settings/
      page.tsx
      access/
        page.tsx
components/
  layout/
    app-shell.tsx
    environment-bar.tsx
    sidebar-nav.tsx
    topbar.tsx
    company-switcher.tsx
  archetypes/
    dashboard-template.tsx
    list-page-template.tsx
    detail-page-template.tsx
    settings-hub-template.tsx
    workbench-template.tsx
  admin/
    page-header.tsx
    action-toolbar.tsx
    section-card.tsx
    status-badge.tsx
    metadata-panel.tsx
    data-table-shell.tsx
features/
  overview/
  orders/
  inventory/
  settings/
lib/
  navigation.ts
  permissions.ts
  tenant-context.ts
  mock-data/
  mappers/
  schemas/
```

Pages should only select archetypes, compose sections, and inject data/config. They should not own large JSX blocks, table grammar, status mapping, permission rules, or shell layout.

## Shell Design

The shell follows Stripe-style product navigation:

```text
ERP Console                    Test mode

Home
  Overview
  Today

Commerce
  Orders
  Customers
  Returns

Operations
  Inventory
  Warehouses
  Shipments
  Exceptions

Procurement
  Purchase orders
  Suppliers
  Receiving

Money
  Invoices
  Payments
  Adjustments

Insights
  Reports
  Analytics

Developer
  Events
  API logs
  Workbench

Settings
```

The top utility bar contains only global utilities:

- Environment status
- Company switcher
- Global search
- Help
- Notifications
- Global create action

Page-specific actions stay in the page header and never move into the global utility bar.

## Multi-Tenant And Multi-Company Model

The first version includes a frontend-only context model:

- Tenant: the top-level product space or group, such as `Acme Group`
- Company: an operating entity under the tenant, such as `Northwind Trading Ltd.`
- Warehouse, store, and channel: future operational scopes under a company

The topbar includes `CompanySwitcher`. The current company affects navigation context, page subtitles, list filters, metadata panels, and settings pages.

Settings includes organization and access management modules:

- Organization
- Companies
- Users
- Roles
- Access policies
- Audit logs

## Permission Model

The first version implements frontend permission config only. It does not implement real authentication.

Default roles:

- Owner: full access
- Admin: business and user administration, excluding owner-only high-risk settings
- Operations: orders, inventory, warehouse, fulfillment, and exceptions
- Finance: invoices, payments, adjustments, and finance reports
- Analyst: read-only lists, details, and reports
- Developer: events, API logs, and workbench

UI permission behavior:

- If the user has no module permission, hide the nav item.
- If the user has read-only access, show list/detail content but hide create, edit, approve, and destructive actions.
- If the user has operation access, show page primary actions.
- High-risk actions should be disabled with a reason or moved into overflow, depending on context.

## Page Archetypes

### DashboardTemplate

Used by `dashboard/overview`.

Main content:

- Summary metrics
- Alerts
- Recent activity
- Operational hot lists

Side metadata/config:

- Current tenant
- Current company
- System health
- Pending approvals

Primary action: `Create report`.

### ListPageTemplate

Used by `dashboard/orders` and `dashboard/inventory`.

Structure:

1. Page header
2. Page-level actions
3. Status tabs
4. Toolbar with search, filter, saved views, and columns
5. Data table
6. Pagination/result count

Orders fields:

- Order number
- Status
- Customer
- Channel
- Order date
- Total amount
- Fulfillment state
- Exception indicator

Orders primary action: `Create order`.

Inventory fields:

- SKU
- Product/variant name
- Available quantity
- Reserved quantity
- Warehouse summary
- Inventory status
- Updated at

Inventory primary action: `Adjust inventory`.

### SettingsHubTemplate

Used by `dashboard/settings`.

Groups:

- Organization
- Access
- Operations
- Finance
- Developer

Each settings module has a title, short description, optional status, and destination.

### Access Settings Page

Used by `dashboard/settings/access`.

Main content:

- Users overview
- Roles overview
- Access policy overview

Side metadata/config:

- Current tenant
- Current company
- Audit summary
- Last changed

## Visual Direction

The UI must follow the Stripe-style admin rules:

- Neutral surfaces
- Clear borders
- Compact density
- Text-first navigation
- Precise active states
- Minimal shadows
- Moderate radius
- Status badges with restrained semantics
- Page headers with title, concise description, and right-aligned actions
- List pages with consistent status tabs and toolbar grammar

The UI must not use:

- Marketing hero sections
- Large decorative cards
- Heavy gradients
- Glassmorphism
- Purple/blue generic AI SaaS styling
- Multiple primary actions at the same level
- Per-page custom layout grammar

## Implementation Order

Implementation must follow the documented system order:

1. Shell layer
2. Page archetype layer
3. Shared admin components
4. Domain sections
5. Display schema and mappers
6. Mock business data binding

## Verification

Before reporting implementation complete, verify:

- The app starts locally.
- The dashboard shell renders.
- Sidebar active states work across overview, orders, inventory, settings, and access settings.
- Company switcher appears in the global topbar.
- Permission config affects at least navigation visibility and page primary actions.
- Orders and inventory list pages use the same list archetype grammar.
- Settings uses grouped module navigation rather than a generic card grid.
- Lint/build pass if dependencies are installable in the local environment.
