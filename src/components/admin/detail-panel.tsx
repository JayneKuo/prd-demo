import { StatusBadge } from '@/components/admin/status-badge';
import { PageHeader, type PageAction } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';

/* ─── Detail Section ─── */
export type DetailField = {
  label: string;
  value: string;
  isStatus?: boolean;
  span?: 1 | 2;
};

export type DetailSection = {
  title: string;
  fields: DetailField[];
};

export function DetailSectionCard({ section }: { section: DetailSection }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">{section.title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {section.fields.map((field) => (
          <div key={field.label} className={cn(field.span === 2 && 'col-span-2')}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{field.label}</dt>
            <dd className="mt-0.5 text-[13px] text-[var(--foreground)]">
              {field.isStatus ? <StatusBadge status={field.value} /> : field.value}
            </dd>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Timeline ─── */
export type TimelineEvent = {
  time: string;
  title: string;
  description?: string;
  status?: 'completed' | 'current' | 'pending';
};

export function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">状态时间线</h2>
      </div>
      <div className="p-4">
        <ol className="relative border-l border-[var(--border-subtle)] pl-4">
          {events.map((event, index) => (
            <li key={index} className={cn('pb-4 last:pb-0')}>
              <span
                className={cn(
                  'absolute -left-[5px] size-2.5 rounded-full ring-2 ring-[var(--surface)]',
                  event.status === 'completed' && 'bg-[var(--success)]',
                  event.status === 'current' && 'bg-[var(--primary)]',
                  event.status === 'pending' && 'bg-[var(--border)]'
                )}
                style={{ top: `${index * 44 + 4}px` }}
              />
              <div className="ml-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--foreground)]">{event.title}</span>
                  <span className="text-[11px] text-[var(--muted)]">{event.time}</span>
                </div>
                {event.description && <p className="mt-0.5 text-[12px] text-[var(--muted)]">{event.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─── Detail Page Template ─── */
export function DetailPageTemplate({
  title,
  description,
  actions = [],
  children
}: {
  title: string;
  description: string;
  actions?: PageAction[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="space-y-5">{children}</div>
    </div>
  );
}
