export type MetadataItem = {
  label: string;
  value: string;
};

export function MetadataPanel({ title, items }: { title: string; items: MetadataItem[] }) {
  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-[13px] font-semibold text-[var(--foreground)]">{title}</div>
      <dl className="divide-y divide-[var(--border-subtle)]">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{item.label}</dt>
            <dd className="mt-1 text-[13px] text-[var(--foreground)]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
