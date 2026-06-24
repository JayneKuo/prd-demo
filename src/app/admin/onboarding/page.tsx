import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';

const checklist = ['Contract signed', 'Tenant provisioned', 'Catalog imported', 'Channel auth completed', 'First sync passed'];

export default function AdminOnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="Track implementation milestones from provisioning through first successful operational sync."
        actions={[{ label: 'Start onboarding', variant: 'primary' }]}
      />
      <SectionCard title="Launch checklist" description="A standard onboarding template for enterprise implementations.">
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] text-[var(--foreground)]">{item}</div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
