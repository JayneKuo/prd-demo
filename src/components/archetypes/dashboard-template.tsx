import { MetadataPanel, type MetadataItem } from '@/components/admin/metadata-panel';
import { PageHeader, type PageAction } from '@/components/admin/page-header';

export function DashboardTemplate({
  title,
  description,
  actions,
  children,
  metadata
}: {
  title: string;
  description: string;
  actions: PageAction[];
  children: React.ReactNode;
  metadata?: MetadataItem[];
}) {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title={title} description={description} actions={actions} />
      {metadata && metadata.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_300px]">
          <div className="space-y-6">{children}</div>
          <MetadataPanel title="当前上下文" items={metadata} />
        </div>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
    </div>
  );
}
