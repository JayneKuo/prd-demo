import { ActionToolbar } from '@/components/admin/action-toolbar';
import { DataTableShell, type TableColumn } from '@/components/admin/data-table-shell';
import { PageHeader, type PageAction } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';

type SelectFilter = {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
};

export function ListPageTemplate<T extends { id: string }>({
  title,
  description,
  actions,
  tabs,
  activeTab,
  searchPlaceholder,
  filters = [],
  columns,
  rows,
  rowHref
}: {
  title: string;
  description: string;
  actions: PageAction[];
  tabs: string[];
  activeTab: string;
  searchPlaceholder: string;
  filters?: SelectFilter[];
  columns: TableColumn<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
}) {
  return (
    <div className="mx-auto max-w-[1280px] pt-5 lg:pt-6">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex gap-4 border-b border-[var(--border)] px-4 pt-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={cn(
                'border-b-2 px-0 pb-2.5 text-[13px] font-medium',
                tab === activeTab ? 'border-[var(--foreground)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <ActionToolbar searchPlaceholder={searchPlaceholder} />
          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {filters.map((filter) => (
                <label key={filter.label} className="flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 text-[13px] font-medium text-[var(--foreground)]">
                  <span>{filter.label}</span>
                  <select
                    value={filter.value}
                    onChange={(event) => filter.onChange(event.target.value)}
                    className="bg-transparent text-[13px] text-[var(--foreground)] outline-none"
                  >
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
        <DataTableShell columns={columns} rows={rows} rowHref={rowHref} />
      </div>
    </div>
  );
}
