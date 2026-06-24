---
title: Stripe Shell Interaction Polish Design
---

# Stripe Shell Interaction Polish Design

## Goal

Upgrade the existing ERP admin console from a generic template shell into a Stripe-like operational console with stronger structure, restrained visual polish, and complete interaction states.

This phase focuses on the shared shell and base component feel. It should improve the perceived quality of every page without changing business data structure or rebuilding all page archetypes.

## References

- `Stripe 风格后台规范/01-Stripe后台UI统一规范.md`
- `Stripe 风格后台规范/H-02-Stripe页面模板规范.md`
- `Stripe 风格后台规范/H-08-Stripe设计Token与排版实现规范.md`
- UI/UX Pro Max priorities: accessibility, interaction feedback, layout density, typography/color tokens, and restrained motion.

## Scope

In scope:

- Global visual tokens in `src/app/globals.css`
- Persistent shell structure in `src/components/layout/app-shell.tsx`
- Sidebar navigation interaction and collapsed state in `src/components/layout/sidebar-nav.tsx`
- Top utility bar interaction polish in `src/components/layout/topbar.tsx`
- Shared panel/card/header/table surface refinements where needed
- Keyboard, focus, hover, pressed, active, and reduced-motion states

Out of scope for this phase:

- Rebuilding all business pages
- Changing mock data models
- Adding backend integration
- Adding complex animated page transitions
- Introducing marketing-style visuals, heavy gradients, glassmorphism, or decorative dashboards

## Design Direction

The UI should become a Stripe-like operational console:

- Calm, precise, data-first, and enterprise-ready
- Medium-high density without feeling cramped
- Neutral surfaces with clear borders and restrained elevation
- Text-first navigation with icons as supporting cues
- One coherent shell grammar across dashboard, list, settings, and developer pages

The system should not look like a generic shadcn starter, a soft SaaS template, or an AI-gradient dashboard.

## Visual System

### Tokens

Refine the global CSS variables to create a sharper neutral system:

- `--background`: very light neutral page canvas
- `--surface`: primary white panel surface
- `--surface-subtle`: toolbar, nav item, input, and secondary panel surface
- `--surface-hover`: low-noise hover state
- `--border`: structural border for panels and shell divisions
- `--border-subtle`: internal dividers
- `--foreground`, `--muted`, `--muted-foreground`: readable text hierarchy
- `--primary`: restrained accent for focus, active states, and key links only
- `--shadow-soft`, `--shadow-panel`: minimal elevation, never decorative

The palette should keep the existing Satoshi-based typography direction and avoid generic purple-blue SaaS styling as the dominant product language.

### Density

Use the Stripe reference density rules:

- 4px for micro spacing
- 8px for compact control gaps
- 12px for nav and toolbar inner rhythm
- 16px for normal panel padding
- 24px for section spacing
- 32px only for major page separation

Avoid random one-off values unless required by an existing component constraint.

### Surfaces

Cards should read as panels, not decorative blocks:

- Borders define structure before shadows do.
- Rounded corners stay moderate and precise.
- Section headers use subtle dividers.
- Metric cards become tighter and more operational.

## Shell Layout

### App Shell

`AppShell` should remain the persistent container for all dashboard pages.

Expected structure:

1. Page canvas
2. Left sidebar
3. Main work area
4. Top utility bar
5. Content viewport

The main work area should react smoothly when the sidebar collapses or expands. The content should not jump horizontally in a distracting way, and there should be no mobile horizontal overflow.

### Sidebar

The sidebar should support two states:

- Expanded: product name, company/context selector, grouped text navigation, icons, active state
- Collapsed: compact width, icons retained, active state retained, native title/accessible label for each item

Interaction requirements:

- Collapse/expand transition should be smooth and restrained, around 150-250ms.
- Active state must be obvious but not a loud filled block.
- Hover and focus states should be visible in both expanded and collapsed states.
- Icon-only collapsed items must remain keyboard reachable and understandable through `title` or `aria-label`.
- Navigation group structure should not become visually noisy when expanded.

### Topbar

The topbar remains a global utility area, not a page action area.

It should contain:

- Sidebar collapse/expand control
- Global search or command trigger
- Help
- Notifications
- Global create action
- User menu

Interaction requirements:

- Icon buttons should have consistent dimensions, hover, focus, and pressed states.
- The sidebar toggle should clearly expose its current action through `aria-label`.
- Search should feel like a global command/search entry, with clear scope and keyboard-friendly affordance.
- Primary create action should be visually stronger than utility buttons but still restrained.

## Component Polish

### Buttons

Use a clear button hierarchy:

- Primary: single strongest action per area
- Secondary: outlined or subtle action
- Utility: icon or low-emphasis toolbar controls
- Danger: only for destructive outcomes

All interactive buttons must have visible hover and focus states. Focus rings must not be removed.

### Panels And Cards

Shared panel components should use:

- Border-first structure
- Light surface background
- Compact headers
- Optional section action on the right
- Internal dividers where content density benefits from structure

### Tables And Toolbars

Tables should retain medium density:

- Clear table header
- Lightweight row hover
- Clickable primary identity field where applicable
- Row-end actions on the far right
- Toolbar search/filter/settings grammar kept consistent across list pages

This phase may refine table shell styling, but should not redesign every table field.

## Motion And Interaction

Motion exists only to explain state change:

- Sidebar width transition
- Nav hover/active transition
- Button and input state transition
- Optional panel hover elevation where useful

Rules:

- Duration: 150-250ms for shell and control transitions
- Properties: prefer color, background, border, opacity, and transform; avoid layout-heavy animations except sidebar width
- Reduced motion: respect `prefers-reduced-motion` by disabling or shortening transitions
- No decorative animated gradients, parallax, or page-level theatrics

## Accessibility Requirements

The shell should satisfy the UI/UX Pro Max critical checks:

- Interactive targets should be at least 44px tall where practical.
- Icon-only controls require accessible labels.
- Keyboard focus order follows the visual order.
- Focus states are visible and high contrast.
- Collapsed sidebar navigation remains understandable.
- Color is not the only indicator of navigation state; active state should combine contrast, weight, border/background, or icon treatment.
- Text contrast should meet WCAG AA for normal interface text.

## Responsive Behavior

Desktop:

- Sidebar can remain expanded or collapsed.
- Main content keeps a readable max width where page templates already define one.
- Utility controls remain inline.

Tablet/narrow desktop:

- Collapsed sidebar becomes the preferred compact state.
- Topbar controls remain usable and avoid crowding.
- Content stacks according to existing page templates.

Small screens:

- No horizontal scroll.
- Shell should not hide core page content behind fixed elements.
- If full mobile navigation is not implemented in this phase, the design should still avoid broken layouts and clearly preserve the main content path.

## Acceptance Criteria

Implementation is successful when:

- The shell visibly reads as a refined Stripe-like operational console.
- Sidebar collapse and expand work without breaking active state or page layout.
- Collapsed sidebar items remain accessible and understandable.
- Topbar utility controls have consistent hover, focus, pressed, and accessible states.
- Shared panels and cards feel more structured and less like generic soft cards.
- The overview page benefits from the new shell and token polish without needing a full page rewrite.
- The UI remains restrained: no heavy gradients, glassmorphism, oversized hero areas, or loud decorative effects.
- `pnpm lint` and `pnpm build` pass, or any environment-specific blocker is documented.
- The app is launched locally and the shell is manually verified in a browser on desktop and a narrow viewport.
