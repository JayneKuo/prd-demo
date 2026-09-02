'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type PageTab = {
  path: string;
  label: string;
  closable: boolean;
};

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard/overview': '首页概览',
  '/dashboard/today': '今日看板',
  '/dashboard/orders': '订单管理',
  '/dashboard/orders/list': '订单列表',
  '/dashboard/orders/new': '新建销售订单',
  '/dashboard/orders/pending': '待处理订单',
  '/dashboard/orders/exceptions': '异常订单',
  '/dashboard/inventory': '库存总览',
  '/dashboard/inventory/list': '库存列表',
  '/dashboard/inventory/aging': '库龄分析',
  '/dashboard/inventory/replenish': '补货计划',
  '/dashboard/inbound': '入库管理',
  '/dashboard/inbound/list': '入库单列表',
  '/dashboard/inbound/create': '创建入库单',
  '/dashboard/outbound': '出库管理',
  '/dashboard/outbound/list': '出库单列表',
  '/dashboard/outbound/create': '创建出库单',
  '/dashboard/apps': '应用中心',
  '/dashboard/settings': '系统设置',
  '/dashboard/calendar': '日历',
  '/dashboard/developers': '开发者',
  '/dashboard/rules/fulfillment': '履约规则',
  '/dashboard/rules/inventory-sync': '库存同步规则',
  '/dashboard/rules/replenishment': '补货规则',
  '/dashboard/rules/pricing': '价格规则',
};

function getTabLabel(path: string): string {
  // Exact match first
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path];
  // Try parent path
  const segments = path.split('/');
  while (segments.length > 2) {
    segments.pop();
    const parent = segments.join('/');
    if (ROUTE_LABELS[parent]) return ROUTE_LABELS[parent];
  }
  // Fallback: last segment
  const last = path.split('/').pop() || 'Page';
  return last.charAt(0).toUpperCase() + last.slice(1);
}

const STORAGE_KEY = 'erp-page-tabs';
const DEFAULT_TAB: PageTab = { path: '/dashboard/overview', label: '首页概览', closable: false };

export function PageTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<PageTab[]>([DEFAULT_TAB]);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: PageTab[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Add current page as a tab if not already present
  useEffect(() => {
    if (!pathname) return;
    setTabs(prev => {
      const exists = prev.some(t => t.path === pathname);
      if (exists) return prev;
      const label = getTabLabel(pathname);
      const newTabs = [...prev, { path: pathname, label, closable: true }];
      return newTabs;
    });
  }, [pathname]);

  // Persist tabs
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch { /* ignore */ }
  }, [tabs]);

  // Scroll overflow detection
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 0);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      const observer = new ResizeObserver(checkScroll);
      observer.observe(el);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        observer.disconnect();
      };
    }
  }, [checkScroll, tabs]);

  const closeTab = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => {
      const newTabs = prev.filter(t => t.path !== path);
      // If we're closing the active tab, navigate to the previous or first tab
      if (pathname === path) {
        const idx = prev.findIndex(t => t.path === path);
        const nextTab = newTabs[Math.min(idx, newTabs.length - 1)] || DEFAULT_TAB;
        router.push(nextTab.path);
      }
      return newTabs.length > 0 ? newTabs : [DEFAULT_TAB];
    });
  }, [pathname, router]);

  const navigateTab = useCallback((path: string) => {
    if (path !== pathname) {
      router.push(path);
    }
  }, [pathname, router]);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center border-b border-[var(--border)] bg-[var(--surface)] h-[34px] min-h-[34px]">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-r from-[var(--surface)] to-transparent"
        >
          <ChevronLeft className="size-3.5 text-[var(--muted)]" />
        </button>
      )}

      {/* Tabs container */}
      <div
        ref={scrollRef}
        className="flex h-full flex-1 items-end overflow-x-auto scrollbar-none px-1"
      >
        {tabs.map(tab => {
          const isActive = pathname === tab.path;
          return (
            <div
              key={tab.path}
              onClick={() => navigateTab(tab.path)}
              className={cn(
                'group relative flex h-[30px] cursor-pointer items-center gap-1 whitespace-nowrap border-x border-t px-3 text-[12px] transition-colors select-none rounded-t-md',
                isActive
                  ? 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-medium z-[1] -mb-px'
                  : 'border-transparent bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]'
              )}
            >
              <span className="max-w-[120px] truncate">{tab.label}</span>
              {tab.closable && (
                <button
                  onClick={(e) => closeTab(tab.path, e)}
                  className={cn(
                    'ml-1 flex size-4 items-center justify-center rounded-sm transition-colors',
                    isActive
                      ? 'text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]'
                      : 'text-transparent group-hover:text-[var(--muted)] hover:!bg-[var(--surface-subtle)] hover:!text-[var(--foreground)]'
                  )}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-6 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-l from-[var(--surface)] to-transparent"
        >
          <ChevronRight className="size-3.5 text-[var(--muted)]" />
        </button>
      )}

      {/* More / Dropdown button */}
      <button className="flex h-full w-7 items-center justify-center border-l border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
