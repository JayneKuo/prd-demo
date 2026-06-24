import { cn } from '@/lib/utils';

export function SectionCard({
  title,
  description,
  children,
  variant = 'default',
  bodyClassName,
  headerClassName
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: 'default' | 'hero' | 'quiet';
  bodyClassName?: string;
  headerClassName?: string;
}) {
  const rootClassName = {
    default: 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]',
    hero: 'rounded-3xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary-soft)_20%,white)] shadow-[var(--shadow-soft)]',
    quiet: 'rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]'
  }[variant];

  const headerBaseClassName = {
    default: 'border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3',
    hero: 'border-b border-[color-mix(in_srgb,var(--primary)_16%,var(--border-subtle))] bg-transparent px-5 py-4',
    quiet: 'px-4 py-3'
  }[variant];

  const bodyBaseClassName = {
    default: 'p-4',
    hero: 'p-5',
    quiet: 'px-4 pb-4'
  }[variant];

  return (
    <section className={rootClassName}>
      <div className={cn(headerBaseClassName, headerClassName)}>
        <h2 className={cn('font-semibold tracking-[-0.01em] text-[var(--foreground)]', variant === 'hero' ? 'text-[18px]' : 'text-[15px]')}>
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p> : null}
      </div>
      <div className={cn(bodyBaseClassName, bodyClassName)}>{children}</div>
    </section>
  );
}
