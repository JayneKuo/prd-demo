'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Store } from 'lucide-react';
import { shellCopy } from '@/lib/locale-config';
import { useShellState } from '@/components/providers/shell-state-provider';
import { ALL_MERCHANTS_SCOPE, companies, currentTenant, getCompanyById, getMerchantByScope, getMerchantsByCompany } from '@/lib/tenant-context';
import { cn } from '@/lib/utils';

export function CompanySwitcher() {
  const { locale, companyId, merchantScope, setCompanyId, setMerchantScope } = useShellState();
  const [open, setOpen] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState('');
  const copy = shellCopy[locale];
  const company = getCompanyById(companyId);
  const companyMerchants = getMerchantsByCompany(companyId);
  const merchant = getMerchantByScope(merchantScope);
  const merchantQuery = merchantSearch.trim().toLowerCase();
  const visibleMerchants = merchantQuery
    ? companyMerchants.filter((item) => [item.name, item.channel, item.region].some((value) => value.toLowerCase().includes(merchantQuery)))
    : companyMerchants;
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">
          {company.name[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-[var(--foreground)]">{company.name}</span>
          <span className="block truncate text-[11px] text-[var(--muted)]">{merchant?.name ?? 'All merchants'}</span>
        </span>
        {currentTenant.environment !== 'live' && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">{copy.testData}</span>
        )}
        <ChevronDown className={cn('size-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 grid w-[560px] grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
          <div className="border-r border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2">
            <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">Company</div>
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">Merchant</div>
                <div className="text-[12px] text-[var(--muted)]">{company.name}</div>
              </div>
              <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">{companyMerchants.length}</span>
            </div>
            <div className="px-2 pb-2">
              <input
                value={merchantSearch}
                onChange={(event) => setMerchantSearch(event.target.value)}
                placeholder="Search merchant, channel, region..."
                className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 text-[12px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:bg-[var(--surface)]"
              />
            </div>
            <div className="max-h-[300px] space-y-1 overflow-y-auto px-1">
              <button
                onClick={() => {
                  setMerchantScope(ALL_MERCHANTS_SCOPE);
                  setOpen(false);
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
                    <span className="block truncate text-[13px] font-semibold">All merchants</span>
                    <span className="block text-[11px] text-[var(--muted)]">Roll up every merchant in {company.name}</span>
                  </span>
                </span>
                {merchantScope === ALL_MERCHANTS_SCOPE && <Check className="size-3.5 shrink-0" />}
              </button>
              {visibleMerchants.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setMerchantScope(item.id);
                    setOpen(false);
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
  );
}
