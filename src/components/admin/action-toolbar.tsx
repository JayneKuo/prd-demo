import { Columns3, Filter, Search, SlidersHorizontal } from 'lucide-react';

export function ActionToolbar({ searchPlaceholder }: { searchPlaceholder: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <button className="flex h-9 min-w-[260px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-left text-[13px] text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] sm:min-w-[320px]" aria-label={searchPlaceholder}>
        <Search className="size-4" aria-hidden="true" />
        <span>{searchPlaceholder}</span>
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]">
          <Filter className="size-3.5" aria-hidden="true" />
          筛选
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]">
          <Columns3 className="size-3.5" aria-hidden="true" />
          列设置
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          更多视图
        </button>
      </div>
    </div>
  );
}
