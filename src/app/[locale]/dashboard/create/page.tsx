import { setRequestLocale } from 'next-intl/server';
import { CreateConversationView } from '@/components/dashboard/CreateConversationView';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ conversationId?: string; message?: string }>;
}) {
  const { locale } = await params;
  const { conversationId, message } = await searchParams;
  setRequestLocale(locale);

  return (
    <ErrorBoundary>
      <CreateConversationView
        initialConversationId={conversationId}
        initialMessage={message}
      />
    </ErrorBoundary>
  );
}
