// src/lib/ai/conversation-helper.ts
// Shared conversation utilities used by /api/ai/init and /api/ai/clarify

import { createServerSupabaseClient, getEffectiveUserId } from '@/lib/db/supabase-server';
import { getDefaultModel } from '@/lib/ai/llm-client';

/**
 * Create a new conversation in Supabase
 */
export async function createConversation(category?: string | null): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: getEffectiveUserId(),
      category: category || null,
      title: 'New Document',
      model: getDefaultModel(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[createConversation] Error:', error);
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data.id;
}

/**
 * Save a message (user or assistant) to Supabase
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role,
    content,
    content_type: 'text',
    metadata: metadata ?? null,
  });

  if (error) {
    console.error(`Failed to save ${role} message:`, error);
  }
}

/**
 * Get display name for a document category (Chinese)
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    resume: '简历',
    coverLetter: '求职信',
    report: '报告',
    businessPlan: '商业计划',
    proposal: '提案',
    document: '文档',
    manual: '手册',
    caseStudy: '案例分析',
    ebook: '电子书',
    whitePaper: '白皮书',
    marketResearch: '市场调研',
    researchPaper: '研究论文',
    budget: '预算',
    todoList: '待办清单',
    letter: '信函',
    meetingMinutes: '会议纪要',
    writer: '文章',
    policy: '政策',
    payslip: '工资条',
    companyProfile: '公司简介',
  };
  return names[category] || category;
}

/**
 * Call template matching API
 */
export async function matchTemplate(
  category: string,
  userPrompt: string,
): Promise<{ template?: { id: string } } | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/templates/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, userPrompt }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Template matching failed:', error);
    return null;
  }
}
