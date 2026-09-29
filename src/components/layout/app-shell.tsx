'use client';

import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Topbar } from '@/components/layout/topbar';
import { PageTabs } from '@/components/layout/page-tabs';
import { useShellState } from '@/components/providers/shell-state-provider';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { compactLayout } = useShellState();

  return (
    <div className="h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex h-full">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <PageTabs />
          <main
            className={cn(
              'min-w-0 flex-1 overflow-y-auto',
              compactLayout ? 'pb-5 lg:pb-6' : 'px-5 pb-5 lg:px-8 lg:pb-6'
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
