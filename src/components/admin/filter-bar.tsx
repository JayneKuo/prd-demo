import { Filter, X } from 'lucide-react';

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterConfig = {
  key: string;
  label: string;
  options: FilterOption[];
};

export type ActiveFilter = {
  key: string;
  value: string;
};

export function FilterBar({
  filters,
  activeFilters = [],
  onClearAll
}: {
  filters: FilterConfig[];
  activeFilters?: ActiveFilter[];
  onClearAll?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted-foreground)]">
        <Filter className="size-3.5" aria-hidden="true" />
        筛选
      </span>
      {filters.map((filter) => (
        <select
          key={filter.key}
          className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] font-medium text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          defaultValue=""
          aria-label={filter.label}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {activeFilters.length > 0 && (
        <>
          <div className="mx-1 h-4 w-px bg-[var(--border-subtle)]" />
          {activeFilters.map((af) => {
            const filterDef = filters.find((f) => f.key === af.key);
            const optionLabel = filterDef?.options.find((o) => o.value === af.value)?.label ?? af.value;
            return (
              <span
                key={`${af.key}-${af.value}`}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--primary)]"
              >
                {filterDef?.label}: {optionLabel}
                <button className="ml-0.5 rounded-sm p-0.5 transition-colors hover:bg-[var(--primary)]/10" aria-label={`移除筛选 ${optionLabel}`}>
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            );
          })}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-[12px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              清除全部
            </button>
          )}
        </>
      )}
    </div>
  );
}
