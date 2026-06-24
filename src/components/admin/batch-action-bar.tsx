import { X } from 'lucide-react';

export type BatchAction = {
  label: string;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
};

export function BatchActionBar({
  selectedCount,
  actions,
  onClear
}: {
  selectedCount: number;
  actions: BatchAction[];
  onClear?: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5 shadow-[var(--shadow-soft)]">
      <span className="text-[13px] font-medium text-[var(--primary)]">
        已选择 {selectedCount} 项
      </span>
      <div className="mx-1 h-4 w-px bg-[var(--border)]" />
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            disabled={action.disabled}
            className={
              action.variant === 'primary'
                ? 'h-7 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-50'
                : action.variant === 'danger'
                  ? 'h-7 rounded-md bg-[var(--danger)] px-2.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50'
                  : 'h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50'
            }
          >
            {action.label}
          </button>
        ))}
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="ml-auto flex size-6 items-center justify-center rounded-md text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
          aria-label="取消选择"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
