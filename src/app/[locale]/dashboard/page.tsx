import { setRequestLocale } from 'next-intl/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ErrorBoundary>
      <DashboardShell />
    </ErrorBoundary>
  );
}
