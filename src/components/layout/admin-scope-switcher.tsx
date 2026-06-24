'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2, Search } from 'lucide-react';
import { adminScopes, useAdminScope } from '@/components/providers/admin-scope-provider';
import { useShellState } from '@/components/providers/shell-state-provider';
import { cn } from '@/lib/utils';

const levelLabel = {
  'zh-CN': {
    'company-wide': '全公司',
    tenant: '租户',
    department: '部门',
    merchant: '商户'
  },
  'en-US': {
    'company-wide': 'Company-wide',
    tenant: 'Tenant',
    department: 'Department',
    merchant: 'Merchant'
  }
};

export function AdminScopeSwitcher() {
  const { scope, setScope } = useAdminScope();
  const { locale } = useShellState();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const labels = levelLabel[locale];
  const visibleScopes = normalizedQuery
    ? adminScopes.filter((item) => [item.label[locale], item.description[locale], item.level].some((value) => value.toLowerCase().includes(normalizedQuery)))
    : adminScopes;

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface)]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--primary)] ring-1 ring-[var(--border)]">
          <Globe2 className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{scope.label[locale]}</span>
          <span className="block truncate text-[11px] text-[var(--muted)]">{labels[scope.level]}</span>
        </span>
        <ChevronDown className={cn('size-4 text-[var(--muted)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[360px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-panel)]">
          <div className="px-2 pb-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {locale === 'zh-CN' ? '管理范围' : 'Admin scope'}
            </div>
            <label className="mt-2 flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5">
              <Search className="size-3.5 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={locale === 'zh-CN' ? '搜索公司、租户、部门、商户...' : 'Search company, tenant, department, merchant...'}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </label>
          </div>
          <div className="space-y-1">
            {visibleScopes.map((item) => (
              <button
                key={`${item.level}-${item.label['en-US']}`}
                onClick={() => {
                  setScope(item);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                  scope.level === item.level && scope.label['en-US'] === item.label['en-US']
                    ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                    : 'text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{item.label[locale]}</span>
                  <span className="block truncate text-[11px] text-[var(--muted)]">{labels[item.level]} · {item.description[locale]}</span>
                </span>
                {scope.level === item.level && scope.label['en-US'] === item.label['en-US'] && <Check className="size-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
