import { MetadataPanel } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';

const auditEvents = [
  {
    time: '09:42',
    actor: 'Mina Chen',
    action: 'Granted temporary tenant-admin access',
    scope: 'Acme Group',
    reason: 'Support ticket SUP-4182',
    risk: 'Review'
  },
  {
    time: '09:18',
    actor: 'Ari Patel',
    action: 'Rotated Amazon credentials',
    scope: 'US Amazon',
    reason: 'Token expiry remediation',
    risk: 'Active'
  },
  {
    time: '08:51',
    actor: 'Sam Rivera',
    action: 'Replayed failed inventory sync',
    scope: 'UK TikTok Shop',
    reason: 'Queue recovery',
    risk: 'Active'
  },
  {
    time: '08:04',
    actor: 'Dylan Wu',
    action: 'Exported cross-tenant billing report',
    scope: 'All tenants',
    reason: 'Finance close',
    risk: 'Warning'
  }
];

const reviewQueue = [
  '2 elevated access grants expire within 3 hours.',
  '1 cross-tenant export requires finance confirmation.',
  '3 support interventions are missing linked resolution notes.'
];

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Review privileged actions, support interventions, and control-plane changes across tenants."
        actions={[{ label: 'Export logs', variant: 'secondary' }, { label: 'Open review queue', variant: 'primary' }]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Privileged activity" description="Sensitive actions that should be attributable, reversible, and reviewable.">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {auditEvents.map((event) => (
                    <tr key={`${event.time}-${event.actor}-${event.action}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{event.time}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--foreground)]">{event.actor}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{event.action}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{event.scope}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{event.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={event.risk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Review queue" description="Events that need human closure before the audit window ends.">
            <div className="space-y-2">
              {reviewQueue.map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] text-[var(--foreground)]">{item}</div>
              ))}
            </div>
          </SectionCard>
        </div>

        <MetadataPanel
          title="Audit posture"
          items={[
            { label: 'Events today', value: '418' },
            { label: 'Privileged events', value: '23' },
            { label: 'Needs review', value: '6' },
            { label: 'Retention policy', value: '365 days' }
          ]}
        />
      </div>
    </div>
  );
}
