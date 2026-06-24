import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  isStatus?: boolean;
};

export function DataTableShell<T extends { id: string }>({ columns, rows, rowHref }: { columns: TableColumn<T>[]; rows: T[]; rowHref?: (row: T) => string }) {
  return (
    <div className="overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[13px]">
          <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            <tr>
              <th className="w-10 px-4 py-3"><input className="size-4 rounded border-[var(--border)]" type="checkbox" aria-label="Select all rows" /></th>
              {columns.map((column) => (
                <th key={String(column.key)} className="whitespace-nowrap px-5 py-3">{column.label}</th>
              ))}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr key={row.id} className={cn('group transition-colors duration-150 hover:bg-[var(--surface-subtle)]', href && 'cursor-pointer')}>
                  <td className="px-4 py-3.5"><input className="size-4 rounded border-[var(--border)]" type="checkbox" aria-label={`Select ${row.id}`} /></td>
                  {columns.map((column, index) => {
                    const value = String(row[column.key] ?? '');
                    const cell = column.isStatus ? <StatusBadge status={value} /> : value;
                    return (
                      <td key={String(column.key)} className={index === 0 ? 'whitespace-nowrap px-5 py-3.5 text-[13px] font-semibold text-[var(--foreground)]' : 'whitespace-nowrap px-5 py-3.5 text-[13px] text-[var(--muted)]'}>
                        {index === 0 && href ? (
                          <Link href={href} className="text-[var(--primary)] underline-offset-2 hover:underline">{cell}</Link>
                        ) : cell}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 text-right text-[var(--muted)]">
                    <button className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent opacity-0 transition duration-150 hover:border-[var(--border)] hover:bg-[var(--surface)] group-hover:opacity-100 focus-visible:opacity-100" aria-label={`More actions for ${row.id}`}>
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-3 text-[13px] text-[var(--muted)]">
        <span>{rows.length} 条结果</span>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)]">上一页</button>
          <span>第 1 / 1 页</span>
          <button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)]">下一页</button>
        </div>
      </div>
    </div>
  );
}
