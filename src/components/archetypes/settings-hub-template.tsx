import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MetadataPanel, type MetadataItem } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';

export type SettingsModule = {
  title: string;
  description: string;
  href: string;
  status?: string;
};

export type SettingsGroup = {
  title: string;
  modules: SettingsModule[];
};

export function SettingsHubTemplate({ groups, metadata }: { groups: SettingsGroup[]; metadata: MetadataItem[] }) {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="设置" description="管理组织、访问、运营、应用以及个人偏好等系统配置。" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_300px]">
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 text-[15px] font-semibold text-[var(--foreground)]">{group.title}</h2>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
                {group.modules.map((module, index) => (
                  <Link
                    key={module.title}
                    href={module.href}
                    className={`flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--surface-hover)] ${index !== 0 ? 'border-t border-[var(--border-subtle)]' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-medium text-[var(--foreground)]">{module.title}</div>
                        {module.status ? <span className="rounded-sm bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--muted)] ring-1 ring-[var(--border)]">{module.status}</span> : null}
                      </div>
                      <div className="mt-1 text-[13px] text-[var(--muted)]">{module.description}</div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-[var(--muted)]" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        <MetadataPanel title="当前上下文" items={metadata} />
      </div>
    </div>
  );
}
