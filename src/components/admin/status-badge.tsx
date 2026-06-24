import { mapStatusToBadge } from '@/lib/mappers/status';
import { cn } from '@/lib/utils';

const variantClasses = {
  success: 'bg-green-50 text-[var(--success)] ring-green-200',
  warning: 'bg-amber-50 text-[var(--warning)] ring-amber-200',
  danger: 'bg-red-50 text-[var(--danger)] ring-red-200',
  info: 'bg-blue-50 text-[var(--info)] ring-blue-200',
  neutral: 'bg-gray-50 text-[var(--muted)] ring-gray-200'
};

export function StatusBadge({ status }: { status: string }) {
  const badge = mapStatusToBadge(status);

  return <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', variantClasses[badge.variant])}>{badge.label}</span>;
}
