import { AppShell } from '@/components/layout/app-shell';
import { OmsProvider } from '@/features/oms/provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OmsProvider>
      <AppShell>{children}</AppShell>
    </OmsProvider>
  );
}
