import { notFound } from 'next/navigation';
import { AIClarifyChat } from '@/components/ai/AIClarifyChat';

interface PageProps {
  params: Promise<{
    locale: string;
    sessionId: string;
  }>;
}

export default async function AIClarifyChatPage({ params }: PageProps) {
  const { sessionId } = await params;

  // Validate session ID format
  if (!sessionId || !sessionId.startsWith('clarify-')) {
    notFound();
  }

  return <AIClarifyChat sessionId={sessionId} />;
}
