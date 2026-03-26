import { setRequestLocale } from 'next-intl/server';
import { EditorShell } from '@/components/dashboard/EditorShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ErrorBoundary>
      <EditorShell />
    </ErrorBoundary>
  );
}
