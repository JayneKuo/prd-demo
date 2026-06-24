'use client';

import { Bell, Moon, PanelLeft, Search, Sun } from 'lucide-react';
import { UserMenu } from '@/components/layout/user-menu';
import { shellCopy } from '@/lib/locale-config';
import { useShellState } from '@/components/providers/shell-state-provider';
import { cn } from '@/lib/utils';

export function Topbar() {
  const { locale, sidebarCollapsed, themeMode, setSidebarCollapsed, setThemeMode } = useShellState();
  const copy = shellCopy[locale];

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="flex size-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? copy.expand : copy.collapse}
          aria-pressed={sidebarCollapsed}
        >
          <PanelLeft className="size-[18px]" aria-hidden="true" />
        </button>

        <button
          className="hidden h-8 w-[280px] items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-left text-[13px] text-[var(--muted)] transition-colors duration-150 hover:border-[var(--primary)] xl:flex"
          aria-label={copy.searchPlaceholder}
        >
          <Search className="size-3.5 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
          <span className="flex-1 truncate">{copy.searchPlaceholder}</span>
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          className="flex size-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          aria-label={locale === 'zh-CN' ? '切换外观' : 'Toggle appearance'}
        >
          {themeMode === 'dark' ? (
            <Sun className="size-[18px]" aria-hidden="true" />
          ) : (
            <Moon className="size-[18px]" aria-hidden="true" />
          )}
        </button>

        <button
          className={cn(
            'relative flex size-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]'
          )}
          aria-label={copy.notifications}
        >
          <Bell className="size-[18px]" aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#f97316]" aria-hidden="true" />
        </button>

        <div className="mx-1.5 h-5 w-px bg-[var(--border)]" />

        <UserMenu />
      </div>
    </header>
  );
}
