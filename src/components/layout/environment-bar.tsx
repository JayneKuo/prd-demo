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
