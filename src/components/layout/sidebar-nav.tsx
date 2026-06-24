'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Activity,
  ArchiveRestore,
  ArrowLeftRight,
  Banknote,
  BarChart2,
  BarChart3,
  Bell,
  Bot,
  Box,
  Boxes,
  Briefcase,
  Building,
  Building2,
  Calculator,
  Check,
  CheckCircle,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Combine,
  FileBarChart,
  FileMinus,
  FilePlus,
  FileText,
  GitBranch,
  Grid2X2,
  Home,
  Key,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Link as LinkIcon,
  Map,
  MapPin,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PackageX,
  Percent,
  PieChart,
  Plug,
  Receipt,
  RefreshCw,
  Scale,
  ScrollText,
  Settings,
  Settings2,
  Share2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Store,
  Tag,
  Timer,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Warehouse,
  Webhook
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { merchantNavigationGroups } from '@/lib/merchant-navigation';
import { hasAnyCapability } from '@/lib/permissions';
import { useShellState } from '@/components/providers/shell-state-provider';
import { ALL_MERCHANTS_SCOPE, companies, getCompanyById, getMerchantByScope, getMerchantsByCompany } from '@/lib/tenant-context';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'home': Home,
  'layout-dashboard': LayoutDashboard,
  'clipboard-list': ClipboardList,
  'shopping-cart': ShoppingCart,
  'file-text': FileText,
  'package-check': PackageCheck,
  'package-x': PackageX,
  'users': Users,
  'warehouse': Warehouse,
  'package-plus': PackagePlus,
  'package-minus': PackageMinus,
  'boxes': Boxes,
  'map-pin': MapPin,
  'arrow-left-right': ArrowLeftRight,
  'clipboard-check': ClipboardCheck,
  'truck': Truck,
  'map': Map,
  'building': Building,
  'circle-dollar-sign': CircleDollarSign,
  'shopping-bag': ShoppingBag,
  'file-plus': FilePlus,
  'file-minus': FileMinus,
  'lightbulb': Lightbulb,
  'tag': Tag,
  'box': Box,
  'layers': Layers,
  'link': LinkIcon,
  'combine': Combine,
  'upload': Upload,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'receipt': Receipt,
  'scale': Scale,
  'banknote': Banknote,
  'bar-chart-3': BarChart3,
  'bar-chart-2': BarChart2,
  'pie-chart': PieChart,
  'file-bar-chart': FileBarChart,
  'timer': Timer,
  'calculator': Calculator,
  'settings-2': Settings2,
  'git-branch': GitBranch,
  'refresh-cw': RefreshCw,
  'archive-restore': ArchiveRestore,
  'percent': Percent,
  'plug': Plug,
  'grid-2x2': Grid2X2,
  'code-2': Code2,
  'activity': Activity,
  'webhook': Webhook,
  'key': Key,
  'bot': Bot,
  'settings': Settings,
  'building-2': Building2,
  'briefcase': Briefcase,
  'store': Store,
  'shield': Shield,
  'share-2': Share2,
  'bell': Bell,
  'check-circle': CheckCircle,
  'scroll-text': ScrollText,
  'sliders': Sliders
};

function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? Box;
}

export function SidebarNav() {
  const pathname = usePathname();
  const { sidebarCollapsed, companyId, merchantScope, locale, setCompanyId, setMerchantScope } = useShellState();
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState('');
  const tenantRef = useRef<HTMLDivElement>(null);
  const company = getCompanyById(companyId);
  const companyMerchants = getMerchantsByCompany(companyId);
  const merchant = getMerchantByScope(merchantScope);
  const scopeName = company.name;
  const scopeMeta = merchant?.name ?? `${companyMerchants.length} ${locale === 'zh-CN' ? '个商户' : 'merchants'}`;
  const merchantQuery = merchantSearch.trim().toLowerCase();
  const visibleMerchants = merchantQuery
    ? companyMerchants.filter((item) => [item.name, item.channel, item.region].some((value) => value.toLowerCase().includes(merchantQuery)))
    : companyMerchants;

  // Close tenant menu on outside click
  useEffect(() => {
    if (!tenantMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) {
        setTenantMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [tenantMenuOpen]);

  // Initialize open state from navigation config
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    merchantNavigationGroups.forEach((group) => {
      initial[group.icon] = group.defaultOpen ?? false;
    });
    return initial;
  });

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <aside
      className={cn(
        'hidden h-dvh shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:flex-col',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
      aria-label="Primary navigation"
    >
      {/* Tenant Switcher */}
      <div className={cn('relative shrink-0 border-b border-[var(--border-subtle)] p-3', sidebarCollapsed && 'flex justify-center p-2')} ref={tenantRef}>
        {sidebarCollapsed ? (
          <button
            onClick={() => setTenantMenuOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[13px] font-bold text-[var(--primary)] transition-colors hover:bg-[var(--surface-hover)]"
            title={scopeName}
          >
            {company.name[0]}
          </button>
        ) : (
          <button
            onClick={() => setTenantMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[12px] font-bold text-[var(--primary)]">
              {company.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{scopeName}</span>
              <span className="block truncate text-[11px] text-[var(--muted)]">{scopeMeta}</span>
            </span>
            <ChevronDown className={cn('size-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200', tenantMenuOpen && 'rotate-180')} />
          </button>
        )}

        {/* Tenant dropdown */}
        {tenantMenuOpen && (
          <div className={cn(
            'absolute z-40 grid w-[560px] grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]',
            sidebarCollapsed ? 'left-full top-0 ml-2' : 'left-3 top-[calc(100%+4px)]'
          )}>
            <div className="border-r border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                {locale === 'zh-CN' ? '公司' : 'Company'}
              </div>
              <div className="space-y-1">
                {companies.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCompanyId(item.id);
                      setMerchantSearch('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors duration-150',
                      item.id === companyId
                        ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--border)]'
                        : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{item.name}</span>
                      <span className="block text-[11px]">{item.region} · {item.currency}</span>
                    </span>
                    {item.id === companyId && <Check className="size-3.5 shrink-0 text-[var(--primary)]" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2">
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">{locale === 'zh-CN' ? '商户' : 'Merchant'}</div>
                  <div className="text-[12px] text-[var(--muted)]">{company.name}</div>
                </div>
                <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">{companyMerchants.length}</span>
              </div>
              <div className="px-2 pb-2">
                <input
                  value={merchantSearch}
                  onChange={(event) => setMerchantSearch(event.target.value)}
                  placeholder={locale === 'zh-CN' ? '搜索商户、渠道、地区...' : 'Search merchant, channel, region...'}
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 text-[12px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:bg-[var(--surface)]"
                />
              </div>
              <div className="max-h-[300px] space-y-1 overflow-y-auto px-1">
                <button
                  onClick={() => {
                    setMerchantScope(ALL_MERCHANTS_SCOPE);
                    setTenantMenuOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors duration-150',
                    merchantScope === ALL_MERCHANTS_SCOPE
                      ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                      <Store className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{locale === 'zh-CN' ? '全部商户' : 'All merchants'}</span>
                      <span className="block text-[11px] text-[var(--muted)]">{locale === 'zh-CN' ? `汇总 ${company.name} 下所有商户` : `Roll up every merchant in ${company.name}`}</span>
                    </span>
                  </span>
                  {merchantScope === ALL_MERCHANTS_SCOPE && <Check className="size-3.5 shrink-0" />}
                </button>
                {visibleMerchants.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMerchantScope(item.id);
                      setTenantMenuOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors duration-150',
                      item.id === merchantScope
                        ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                        <Store className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{item.name}</span>
                        <span className="block text-[11px] text-[var(--muted)]">{item.channel} · {item.region} · {item.currency}</span>
                      </span>
                    </span>
                    {item.id === merchantScope && <Check className="size-3.5 shrink-0" />}
                  </button>
                ))}
                {visibleMerchants.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-6 text-center text-[12px] text-[var(--muted)]">
                    No merchants match “{merchantSearch}”.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('min-h-0 flex-1 overflow-y-auto py-3', sidebarCollapsed ? 'px-2' : 'px-3')}>
        {merchantNavigationGroups.map((group) => {
          const items = group.items.filter((item) => hasAnyCapability('admin', item.capabilities));
          if (items.length === 0) return null;

          const GroupIcon = getIcon(group.icon);
          const isOpen = openGroups[group.icon];
          const groupLabel = group.title[locale];

          // Check if any item in this group is active
          const hasActiveChild = items.some(
            (item) => pathname === item.href || (item.href !== '/dashboard/overview' && pathname.startsWith(item.href))
          );

          // Collapsed mode: show only group icon
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
                {/* Group header - clickable to toggle */}
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

                {/* Collapsible items */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200 ease-out',
                    isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="ml-[15px] border-l border-[var(--border-subtle)] pl-2.5 pt-0.5 pb-1">
                    {items.map((item) => {
                      const active = pathname === item.href || (item.href !== '/dashboard/overview' && pathname.startsWith(item.href));
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
                          {/* Active indicator dot */}
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

      <div className={cn('shrink-0 border-t border-[var(--border-subtle)] p-3', sidebarCollapsed && 'p-2')}>
        {sidebarCollapsed ? (
          <Link
            href="/admin"
            title={locale === 'zh-CN' ? '切换到管理后台' : 'Switch to Admin'}
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <Shield className="size-4" />
          </Link>
        ) : (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-2 text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface)]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--primary)] ring-1 ring-[var(--border)]">
              <Shield className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{locale === 'zh-CN' ? '切换到管理后台' : 'Switch to Admin'}</span>
              <span className="block truncate text-[11px] text-[var(--muted)]">{locale === 'zh-CN' ? '全局控制面板' : 'Global control plane'}</span>
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
