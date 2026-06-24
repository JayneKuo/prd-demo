'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Activity,
  Banknote,
  BarChart2,
  Bell,
  Building,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Globe2,
  LayoutDashboard,
  PanelLeft,
  ScrollText,
  Settings,
  Shield,
  Sliders,
  Store,
  Upload,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { adminNavigationGroups } from '@/lib/admin-navigation';
import { AdminScopeSwitcher } from '@/components/layout/admin-scope-switcher';
import { AdminScopeProvider } from '@/components/providers/admin-scope-provider';
import { Topbar } from '@/components/layout/topbar';
import { useShellState } from '@/components/providers/shell-state-provider';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'activity': Activity,
  'banknote': Banknote,
  'bar-chart-2': BarChart2,
  'bell': Bell,
  'building': Building,
  'building-2': Building2,
  'check-circle': CheckCircle,
  'circle-dollar-sign': CircleDollarSign,
  'clipboard-check': ClipboardCheck,
  'file-text': FileText,
  'globe-2': Globe2,
  'layout-dashboard': LayoutDashboard,
  'scroll-text': ScrollText,
  'settings': Settings,
  'shield': Shield,
  'sliders': Sliders,
  'store': Store,
  'upload': Upload,
  'users': Users
};

function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? Building2;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed, locale, setSidebarCollapsed } = useShellState();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    adminNavigationGroups.forEach((group) => {
      initial[group.icon] = group.defaultOpen ?? false;
    });
    return initial;
  });

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <AdminScopeProvider>
      <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex min-h-dvh overflow-hidden">
          {/* Sidebar */}
          <aside
            className={cn(
              'hidden h-dvh shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:flex-col',
              sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
            )}
            aria-label="Admin navigation"
          >
            {/* Scope Switcher */}
            <div className={cn('shrink-0 border-b border-[var(--border-subtle)] p-3', sidebarCollapsed && 'flex justify-center p-2')}>
              {sidebarCollapsed ? (
                <div
                  className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[13px] font-bold text-[var(--primary)]"
                  title={locale === 'zh-CN' ? '管理后台' : 'Admin Console'}
                >
                  <Shield className="size-4" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 px-2.5 py-1">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] ring-1 ring-[var(--border)]">
                      <Shield className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{locale === 'zh-CN' ? '管理后台' : 'Admin Console'}</span>
                      <span className="block truncate text-[11px] text-[var(--muted)]">{locale === 'zh-CN' ? '全局控制面板' : 'Global control plane'}</span>
                    </span>
                  </div>
                  <AdminScopeSwitcher />
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className={cn('min-h-0 flex-1 overflow-y-auto py-3', sidebarCollapsed ? 'px-2' : 'px-3')}>
              {adminNavigationGroups.map((group) => {
                const items = group.items;
                if (items.length === 0) return null;

                const GroupIcon = getIcon(group.icon);
                const isOpen = openGroups[group.icon];
                const groupLabel = group.title[locale];

                const hasActiveChild = items.some(
                  (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                );

                // Collapsed mode
                if (sidebarCollapsed) {
                  return (
                    <div key={group.icon}>
                      {group.separator && <div className="mx-2 my-2 border-t border-[var(--border-subtle)]" />}
                      <div className="mb-1">
                        <Link
                          href={items[0].href}
                          title={groupLabel}
                          className={cn(
                            'flex size-10 items-center justify-center rounded-lg transition-colors duration-150',
                            hasActiveChild
                              ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                              : 'text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]'
                          )}
                        >
                          <GroupIcon className="size-[18px]" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={group.icon}>
                    {group.separator && <div className="mx-2 my-2.5 border-t border-[var(--border-subtle)]" />}
                    <div className="mb-0.5">
                      <button
                        onClick={() => toggleGroup(group.icon)}
                        className={cn(
                          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left transition-colors duration-150',
                          hasActiveChild
                            ? 'text-[var(--foreground)]'
                            : 'text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]'
                        )}
                      >
                        <GroupIcon
                          className={cn(
                            'size-[16px] shrink-0 transition-colors',
                            hasActiveChild ? 'text-[var(--primary)]' : 'text-[var(--muted)] group-hover:text-[var(--foreground)]'
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate text-[13px] font-semibold">{groupLabel}</span>
                        <ChevronDown
                          className={cn(
                            'size-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200',
                            isOpen && 'rotate-180'
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      <div
                        className={cn(
                          'overflow-hidden transition-all duration-200 ease-out',
                          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        )}
                      >
                        <div className="ml-[15px] border-l border-[var(--border-subtle)] pl-2.5 pt-0.5 pb-1">
                          {items.map((item) => {
                            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                            const ItemIcon = getIcon(item.icon);

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                  'group/item relative flex items-center gap-2.5 rounded-md px-2.5 py-[6px] text-[13px] transition-all duration-150',
                                  active
                                    ? 'bg-[var(--primary-soft)] font-medium text-[var(--primary)]'
                                    : 'text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]'
                                )}
                              >
                                {active && (
                                  <span className="absolute -left-[13px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[var(--primary)]" />
                                )}
                                <ItemIcon
                                  className={cn(
                                    'size-[15px] shrink-0',
                                    active ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] group-hover/item:text-[var(--foreground)]'
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{item.title[locale]}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Switch to Merchant */}
            <div className={cn('shrink-0 border-t border-[var(--border-subtle)] p-3', sidebarCollapsed && 'p-2')}>
              {sidebarCollapsed ? (
                <Link
                  href="/dashboard/overview"
                  title={locale === 'zh-CN' ? '切换到商户端' : 'Switch to Merchant'}
                  className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  <Store className="size-4" />
                </Link>
              ) : (
                <Link
                  href="/dashboard/overview"
                  className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-2 text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface)]"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--primary)] ring-1 ring-[var(--border)]">
                    <Store className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{locale === 'zh-CN' ? '切换到商户端' : 'Switch to Merchant'}</span>
                    <span className="block truncate text-[11px] text-[var(--muted)]">{locale === 'zh-CN' ? 'SaaS 商户控制台' : 'SaaS merchant dashboard'}</span>
                  </span>
                </Link>
              )}
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="min-w-0 flex-1 overflow-y-auto px-5 py-5 lg:px-8 lg:py-6">{children}</main>
          </div>
        </div>
      </div>
    </AdminScopeProvider>
  );
}
