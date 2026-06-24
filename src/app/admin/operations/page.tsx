import { MetadataPanel } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';

const alerts = [
  { title: 'Inventory sync queue delayed', scope: '3 merchants · Production', severity: 'High', owner: 'Ari Patel' },
  { title: 'Amazon token refresh required', scope: '2 merchants · Production', severity: 'Medium', owner: 'Mina Chen' },
  { title: 'Webhook retry backlog above threshold', scope: 'Staging cluster', severity: 'Low', owner: 'Sam Rivera' }
];

const queueHealth = [
  { name: 'Orders ingestion', backlog: '182 jobs', sla: '4m over target', status: 'Warning' },
  { name: 'Inventory sync', backlog: '36 jobs', sla: 'Healthy', status: 'Active' },
  { name: 'Catalog publish', backlog: '12 jobs', sla: 'Healthy', status: 'Active' }
];

const channelHealth = [
  { channel: 'Shopify', merchants: '18', issue: '1 webhook retry storm' },
  { channel: 'Amazon', merchants: '9', issue: '2 expiring tokens' },
  { channel: 'TikTok Shop', merchants: '10', issue: '1 catalog remap pending' }
];

export default function AdminOperationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Monitor"
        description="Surface multi-tenant incidents before merchants feel them in the day-to-day console."
        actions={[{ label: 'Retry failed jobs', variant: 'secondary' }, { label: 'Open incident room', variant: 'primary' }]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Open incidents', value: '7', detail: '2 need escalation this hour' },
              { label: 'Blocked merchants', value: '4', detail: 'Awaiting credentials or remap' },
              { label: 'Jobs retried today', value: '186', detail: '92% auto-recovered' }
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
                <div className="text-[12px] font-medium text-[var(--muted)]">{metric.label}</div>
                <div className="mt-2 text-[30px] font-semibold tracking-tight text-[var(--foreground)]">{metric.value}</div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">{metric.detail}</div>
              </div>
            ))}
          </div>

          <SectionCard title="Active alerts" description="Operational signals that require internal follow-up.">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--foreground)]">{alert.title}</div>
                    <div className="mt-1 text-[12px] text-[var(--muted)]">{alert.scope}</div>
                  </div>
                  <div className="text-right text-[12px] text-[var(--muted)]">
                    <div>{alert.severity}</div>
                    <div className="mt-1">{alert.owner}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Queue health" description="Backlog and SLA posture across asynchronous jobs.">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">Queue</th>
                    <th className="px-4 py-3">Backlog</th>
                    <th className="px-4 py-3">SLA</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {queueHealth.map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{row.name}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.backlog}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.sla}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Channel health" description="Quick scan of channel-level operational fragility.">
            <div className="grid gap-3 md:grid-cols-3">
              {channelHealth.map((item) => (
                <div key={item.channel} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">{item.channel}</div>
                  <div className="mt-1 text-[12px] text-[var(--muted)]">{item.merchants} merchants connected</div>
                  <div className="mt-3 text-[12px] leading-6 text-[var(--foreground)]">{item.issue}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <MetadataPanel
          title="Ops snapshot"
          items={[
            { label: 'Incident commander', value: 'Mina Chen' },
            { label: 'Retry success rate', value: '92%' },
            { label: 'Tokens expiring < 7d', value: '3' },
            { label: 'Webhook backlog', value: '147 pending' }
          ]}
        />
      </div>
    </div>
  );
}
