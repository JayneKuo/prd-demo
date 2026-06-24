import { cn } from '@/lib/utils';

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;

  const width = 120;
  const height = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-10 w-full', className)} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function ComparisonBar({ value, max, tone = 'primary' }: { value: number; max: number; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const width = max === 0 ? 0 : Math.max(10, (value / max) * 100);
  const toneClass = {
    primary: 'bg-[var(--primary)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--danger)]'
  }[tone];

  return (
    <div className="h-2.5 rounded-full bg-[var(--surface-subtle)]">
      <div className={cn('h-2.5 rounded-full', toneClass)} style={{ width: `${width}%` }} />
    </div>
  );
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const toneClass = {
    primary: 'bg-[var(--primary)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--danger)]'
  }[tone];

  return (
    <div className="h-2.5 rounded-full bg-[var(--surface-subtle)]">
      <div className={cn('h-2.5 rounded-full', toneClass)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function MiniBars({ values, tone = 'primary' }: { values: number[]; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const max = Math.max(...values, 1);
  const toneClass = {
    primary: 'bg-[var(--primary)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--danger)]'
  }[tone];

  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex-1 rounded-t-sm bg-[var(--surface-subtle)]">
          <div className={cn('w-full rounded-t-sm', toneClass)} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function StackedBar({
  segments
}: {
  segments: Array<{ value: number; tone: 'primary' | 'success' | 'warning' | 'danger' }>;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const toneClass = {
    primary: 'bg-[var(--primary)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--danger)]'
  };

  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
      {segments.map((segment, index) => (
        <div
          key={`${segment.tone}-${index}`}
          className={cn(toneClass[segment.tone])}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function DonutMeter({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const toneClass = {
    primary: 'stroke-[var(--primary)]',
    success: 'stroke-[var(--success)]',
    warning: 'stroke-[var(--warning)]',
    danger: 'stroke-[var(--danger)]'
  }[tone];

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--color-surface-subtle, #e5e7eb)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={toneClass}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-[18px] font-semibold text-[var(--foreground)]">{value}%</div>
      </div>
    </div>
  );
}
