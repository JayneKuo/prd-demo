export type PageAction = {
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function PageHeader({ title, description, actions = [] }: { title: string; description: string; actions?: PageAction[] }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[var(--muted)]">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            disabled={action.disabled}
            className={
              action.variant === 'primary'
                ? 'h-9 rounded-lg bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] transition duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
                : 'h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
