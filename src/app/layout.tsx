import type { Metadata } from 'next';
import { RequirementAnnotator } from '@/components/requirement-annotator';
import { ShellStateProvider } from '@/components/providers/shell-state-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ERP Console',
  description: 'Stripe-style ERP admin framework'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ShellStateProvider>{children}</ShellStateProvider>
        <RequirementAnnotator />
      </body>
    </html>
  );
}
