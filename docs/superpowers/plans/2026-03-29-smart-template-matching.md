# 智能模版匹配与文档生成系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 文档生成系统改造为智能模版匹配 + 对话式生成架构，实现意图判断、模版匹配、流式生成一体化。

**Architecture:** 新建 `template_categories` 表存储文档类型和 system_prompt；改造 `/api/ai/generate` 增加意图判断；新建 `/api/templates/match` 实现模版匹配；新建 `/dashboard/create` 页面处理多轮对话；改造编辑器支持自动生成和对话历史继承。

**Tech Stack:** Next.js 16, React 19, Supabase, Zustand, SSE streaming

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `supabase/migrations/003_template_categories.sql` | 数据库 migration：创建 template_categories 表 |
| `src/types/template.ts` | 模版相关类型定义 |
| `src/app/api/templates/match/route.ts` | 模版匹配 API |
| `src/app/api/templates/categories/route.ts` | 获取文档类型列表 API |
| `src/app/[locale]/dashboard/create/page.tsx` | 类型确认对话页面 |
| `src/components/dashboard/CreateConversation.tsx` | 对话组件 |
| `src/hooks/useTemplateMatch.ts` | 模版匹配 hook |

### 改造文件

| 文件 | 改动 |
|------|------|
| `src/types/clarify.ts` | 增加 `ready_to_generate` 类型 |
| `src/types/database.ts` | 增加 `TemplateCategory` 类型 |
| `src/lib/ai/intent-classifier.ts` | 增强意图判断：判断意图是否明确 |
| `src/lib/ai/prompt-builder.ts` | 从数据库获取 system_prompt，增加模版样式注入 |
| `src/app/api/ai/generate/route.ts` | 增加意图判断分支，返回不同响应类型 |
| `src/app/api/ai/clarify/route.ts` | 支持多轮对话直到意图明确 |
| `src/app/api/ai/chat/route.ts` | 支持 autoGenerate + 模版样式注入 |
| `src/stores/useChatStore.ts` | 增加 `initConversation` 方法 |
| `src/stores/useDashboardStore.ts` | 增加生成相关状态 |
| `src/hooks/useAIGeneration.ts` | 处理 `ready_to_generate` 和 `clarification_needed` |
| `src/components/dashboard/AIChatSidebar.tsx` | 支持 autoGenerate 触发 |
| `src/components/dashboard/EditorShell.tsx` | 读取 URL 参数，自动触发生成 |

### 删除文件

| 文件 | 说明 |
|------|------|
| `src/config/prompt-templates.ts` | 迁移到数据库后删除 |

---

## Task 1: 数据库层 - 创建 template_categories 表

**Files:**
- Create: `supabase/migrations/003_template_categories.sql`

- [ ] **Step 1: 创建 migration 文件**

```sql
-- supabase/migrations/003_template_categories.sql

-- ========================================
-- template_categories table
-- Stores document categories with system prompts
-- ========================================

CREATE TABLE public.template_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  name_en       TEXT,
  description   TEXT,
  system_prompt TEXT NOT NULL,
  icon          TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_template_categories_active
  ON public.template_categories(is_active) WHERE is_active = true;

CREATE INDEX idx_template_categories_sort
  ON public.template_categories(sort_order);

-- Trigger for updated_at
CREATE TRIGGER on_template_categories_updated
  BEFORE UPDATE ON public.template_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: 运行 migration**

```bash
# 如果使用本地 Supabase
npx supabase db push

# 或者直接在 Supabase Dashboard 执行 SQL
```

- [ ] **Step 3: 提交**

```bash
git add supabase/migrations/003_template_categories.sql
git commit -m "$(cat <<'EOF'
feat(db): add template_categories table

Stores document categories with system prompts for AI generation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 数据库层 - 迁移 PROMPT_TEMPLATES 数据

**Files:**
- Create: `scripts/migrate-prompt-templates.ts` (临时脚本)

- [ ] **Step 1: 创建数据迁移脚本**

```typescript
// scripts/migrate-prompt-templates.ts

import { createClient } from '@supabase/supabase-js';
import { PROMPT_TEMPLATES } from '../src/config/prompt-templates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
  const entries = Object.entries(PROMPT_TEMPLATES);

  for (const [category, data] of entries) {
    const { error } = await supabase
      .from('template_categories')
      .upsert({
        category,
        name: category, // 临时用 category 作为 name，后续可手动更新
        name_en: category,
        system_prompt: data.systemPrompt,
        sort_order: 0,
        is_active: true,
      });

    if (error) {
      console.error(`Failed to migrate ${category}:`, error);
    } else {
      console.log(`Migrated: ${category}`);
    }
  }

  console.log('Migration complete!');
}

migrate();
```

- [ ] **Step 2: 执行迁移脚本**

```bash
npx ts-node scripts/migrate-prompt-templates.ts
```

- [ ] **Step 3: 验证数据**

```sql
-- 在 Supabase Dashboard 执行
SELECT category, name, name_en FROM template_categories ORDER BY sort_order;
```

预期结果：20 条记录（document, businessPlan, report, manual, caseStudy, ebook, whitePaper, marketResearch, researchPaper, proposal, budget, todoList, resume, coverLetter, letter, meetingMinutes, writer, policy, payslip, companyProfile）

- [ ] **Step 4: 手动更新中文名称**

```sql
-- 更新中文名称
UPDATE template_categories SET name = '通用文档', name_en = 'Document' WHERE category = 'document';
UPDATE template_categories SET name = '商业计划书', name_en = 'Business Plan' WHERE category = 'businessPlan';
UPDATE template_categories SET name = '报告', name_en = 'Report' WHERE category = 'report';
UPDATE template_categories SET name = '操作手册', name_en = 'Manual' WHERE category = 'manual';
UPDATE template_categories SET name = '案例分析', name_en = 'Case Study' WHERE category = 'caseStudy';
UPDATE template_categories SET name = '电子书', name_en = 'E-Book' WHERE category = 'ebook';
UPDATE template_categories SET name = '白皮书', name_en = 'White Paper' WHERE category = 'whitePaper';
UPDATE template_categories SET name = '市场调研', name_en = 'Market Research' WHERE category = 'marketResearch';
UPDATE template_categories SET name = '研究论文', name_en = 'Research Paper' WHERE category = 'researchPaper';
UPDATE template_categories SET name = '提案', name_en = 'Proposal' WHERE category = 'proposal';
UPDATE template_categories SET name = '预算表', name_en = 'Budget' WHERE category = 'budget';
UPDATE template_categories SET name = '待办清单', name_en = 'To-Do List' WHERE category = 'todoList';
UPDATE template_categories SET name = '简历', name_en = 'Resume' WHERE category = 'resume';
UPDATE template_categories SET name = '求职信', name_en = 'Cover Letter' WHERE category = 'coverLetter';
UPDATE template_categories SET name = '信函', name_en = 'Letter' WHERE category = 'letter';
UPDATE template_categories SET name = '会议纪要', name_en = 'Meeting Minutes' WHERE category = 'meetingMinutes';
UPDATE template_categories SET name = '创意写作', name_en = 'Creative Writing' WHERE category = 'writer';
UPDATE template_categories SET name = '政策文档', name_en = 'Policy' WHERE category = 'policy';
UPDATE template_categories SET name = '工资条', name_en = 'Payslip' WHERE category = 'payslip';
UPDATE template_categories SET name = '公司简介', name_en = 'Company Profile' WHERE category = 'companyProfile';
```

- [ ] **Step 5: 删除临时脚本并提交**

```bash
rm scripts/migrate-prompt-templates.ts
git add .
git commit -m "$(cat <<'EOF'
chore: migrate PROMPT_TEMPLATES to database

Data migrated to template_categories table with Chinese names.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 类型定义 - 新增模版相关类型

**Files:**
- Create: `src/types/template.ts`
- Modify: `src/types/database.ts`
- Modify: `src/types/clarify.ts`

- [ ] **Step 1: 创建 template.ts**

```typescript
// src/types/template.ts

/**
 * Template category from database
 */
export interface TemplateCategory {
  id: string;
  category: string;
  name: string;
  name_en: string | null;
  description: string | null;
  system_prompt: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Template match request
 */
export interface TemplateMatchRequest {
  category: string;
  userPrompt: string;
  limit?: number;
}

/**
 * Template match response
 */
export interface TemplateMatchResponse {
  template: {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    tags: string[];
    html_url: string;
    thumbnail_url: string;
  };
  score: number;
}

/**
 * Intent classification result
 */
export interface IntentClassificationResult {
  readyToGenerate: boolean;
  category?: string;
  confidence: number;
  reason?: 'unclear_intent' | 'insufficient_content' | 'unknown_type';
  suggestedQuestion?: string;
  quickReplies?: string[];
}
```

- [ ] **Step 2: 更新 database.ts**

在文件末尾添加：

```typescript
// 在 src/types/database.ts 末尾添加

export interface TemplateCategory {
  id: string;
  category: string;
  name: string;
  name_en: string | null;
  description: string | null;
  system_prompt: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: 更新 clarify.ts**

修改 `IntentClassificationResult` 接口：

```typescript
// src/types/clarify.ts

/**
 * Intent classification result from /api/ai/generate
 */
export interface IntentClassificationResult {
  readyToGenerate: boolean;
  category?: string;
  confidence: number;
  reason?: 'unclear_intent' | 'insufficient_content' | 'unknown_type';
  suggestedQuestion?: string;
  quickReplies?: string[];
  // Legacy fields for backward compatibility
  type?: string;
  needsClarification?: boolean;
  possibleTypes?: string[];
}
```

- [ ] **Step 4: 提交**

```bash
git add src/types/template.ts src/types/database.ts src/types/clarify.ts
git commit -m "$(cat <<'EOF'
feat(types): add template and intent classification types

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: API 层 - 改造意图分类器

**Files:**
- Modify: `src/lib/ai/intent-classifier.ts`

- [ ] **Step 1: 改造 intent-classifier.ts**

```typescript
// src/lib/ai/intent-classifier.ts

import { streamChatCompletion } from '@/lib/ai/llm-client';
import type { IntentClassificationResult } from '@/types/clarify';

const CONFIDENCE_THRESHOLD = 0.7;

const INTENT_CLASSIFICATION_SYSTEM = `You are a document intent classifier. Analyze the user's request and determine if they want to generate a document.

Respond with JSON ONLY (no markdown, no code blocks):

If the user clearly wants to generate a document and provides enough context:
{
  "readyToGenerate": true,
  "category": "resume",
  "confidence": 0.9
}

If the intent is unclear or more information is needed:
{
  "readyToGenerate": false,
  "confidence": 0.3,
  "reason": "unclear_intent",
  "suggestedQuestion": "你想创建什么类型的文档？",
  "quickReplies": ["简历", "求职信", "报告", "商业计划"]
}

Possible reasons:
- "unclear_intent": User's intent is not clear (e.g., "hello", "help")
- "insufficient_content": Not enough context to generate (e.g., "写简历" without details)
- "unknown_type": Document type cannot be determined

Valid categories: document, businessPlan, report, manual, caseStudy, ebook, whitePaper, marketResearch, researchPaper, proposal, budget, todoList, resume, coverLetter, letter, meetingMinutes, writer, policy, payslip, companyProfile

Important:
1. If category is provided in context, trust it but still check if the prompt has enough content
2. "写简历", "帮我写个简历" should be readyToGenerate: true with sufficient content
3. "hello", "你好", "帮我" should be readyToGenerate: false with unclear_intent`;

/**
 * Classify user intent from their prompt
 */
export async function classifyIntent(
  prompt: string,
  category?: string | null
): Promise<IntentClassificationResult> {
  if (!prompt?.trim()) {
    return {
      readyToGenerate: false,
      confidence: 0,
      reason: 'insufficient_content',
      suggestedQuestion: '请描述你想创建的文档内容',
    };
  }

  try {
    const contextInfo = category
      ? `Context: User has selected category "${category}"`
      : 'Context: No category selected';

    const generator = await streamChatCompletion({
      model: 'kimi-k2.5',
      messages: [
        { role: 'system', content: INTENT_CLASSIFICATION_SYSTEM },
        { role: 'user', content: `${contextInfo}\n\nUser input: ${prompt}` },
      ],
    });

    let accumulated = '';

    for await (const chunk of generator) {
      if (chunk.type === 'delta') {
        accumulated += chunk.data;
      } else if (chunk.type === 'error') {
        console.error('Intent classification error:', chunk.data);
        return getDefaultResult(category);
      }
    }

    return parseClassificationResult(accumulated, category);
  } catch (error) {
    console.error('Intent classification failed:', error);
    return getDefaultResult(category);
  }
}

function parseClassificationResult(
  response: string,
  providedCategory?: string | null
): IntentClassificationResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultResult(providedCategory);
    }

    const parsed = JSON.parse(jsonMatch[0]) as IntentClassificationResult;

    if (parsed.readyToGenerate) {
      // If category was provided, use it; otherwise use detected category
      const finalCategory = providedCategory || parsed.category || 'document';

      return {
        readyToGenerate: true,
        category: finalCategory,
        confidence: parsed.confidence ?? 0.8,
      };
    }

    return {
      readyToGenerate: false,
      confidence: parsed.confidence ?? 0.5,
      reason: parsed.reason || 'unclear_intent',
      suggestedQuestion: parsed.suggestedQuestion || '你想创建什么类型的文档？',
      quickReplies: parsed.quickReplies || ['简历', '求职信', '报告', '商业计划'],
    };
  } catch {
    return getDefaultResult(providedCategory);
  }
}

function getDefaultResult(category?: string | null): IntentClassificationResult {
  if (category) {
    // If category is provided, be more lenient
    return {
      readyToGenerate: true,
      category,
      confidence: 0.6,
    };
  }

  return {
    readyToGenerate: false,
    confidence: 0.3,
    reason: 'unknown_type',
    suggestedQuestion: '你想创建什么类型的文档？',
    quickReplies: ['简历', '求职信', '报告', '商业计划'],
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/ai/intent-classifier.ts
git commit -m "$(cat <<'EOF'
feat(ai): enhance intent classifier with readyToGenerate logic

- Add context-aware classification
- Return readyToGenerate flag instead of needsClarification
- Include suggested questions and quick replies

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: API 层 - 新建模版匹配 API

**Files:**
- Create: `src/app/api/templates/match/route.ts`

- [ ] **Step 1: 创建模版匹配 API**

```typescript
// src/app/api/templates/match/route.ts

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { streamChatCompletion } from '@/lib/ai/llm-client';
import type { TemplateMatchResponse } from '@/types/template';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, userPrompt, limit = 10 } = body;

    if (!category || !userPrompt) {
      return new Response(
        JSON.stringify({ error: 'category and userPrompt are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get all active templates for this category
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, name, category, subcategory, tags, html_url, thumbnail_url')
      .eq('category', category)
      .eq('is_active', true)
      .order('popularity', { ascending: false })
      .limit(limit);

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch templates' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No templates found for this category' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If only one template, return it directly
    if (templates.length === 1) {
      return new Response(
        JSON.stringify({
          template: templates[0],
          score: 1.0,
        } as TemplateMatchResponse),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use LLM to select the best matching template
    const matchResult = await selectBestTemplate(templates, userPrompt);

    return new Response(
      JSON.stringify(matchResult),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Template match error:', error);
    return new Response(
      JSON.stringify({ error: 'Template matching failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function selectBestTemplate(
  templates: Array<{
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    tags: string[];
    html_url: string;
    thumbnail_url: string;
  }>,
  userPrompt: string
): Promise<TemplateMatchResponse> {
  const candidatesInfo = templates.map((t, i) => ({
    index: i,
    name: t.name,
    subcategory: t.subcategory,
    tags: t.tags,
  }));

  const systemPrompt = `You are a template matching assistant. Select the best template for the user's request.

Available templates:
${JSON.stringify(candidatesInfo, null, 2)}

Respond with JSON ONLY (no markdown):
{
  "selectedIndex": 0,
  "score": 0.92,
  "reason": "Brief reason for selection"
}

Select based on:
1. Name relevance
2. Subcategory match
3. Tags alignment with user intent`;

  try {
    const generator = await streamChatCompletion({
      model: 'kimi-k2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User request: ${userPrompt}` },
      ],
    });

    let accumulated = '';

    for await (const chunk of generator) {
      if (chunk.type === 'delta') {
        accumulated += chunk.data;
      }
    }

    const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback to first template
      return { template: templates[0], score: 0.5 };
    }

    const result = JSON.parse(jsonMatch[0]);
    const selectedIndex = Math.min(
      Math.max(0, result.selectedIndex || 0),
      templates.length - 1
    );

    return {
      template: templates[selectedIndex],
      score: result.score || 0.8,
    };
  } catch (error) {
    console.error('LLM template selection failed:', error);
    // Fallback to first template
    return { template: templates[0], score: 0.5 };
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/templates/match/route.ts
git commit -m "$(cat <<'EOF'
feat(api): add template matching endpoint

- Query templates by category
- Use LLM to select best matching template
- Return single best match with score

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: API 层 - 新建获取文档类型列表 API

**Files:**
- Create: `src/app/api/templates/categories/route.ts`

- [ ] **Step 1: 创建获取分类列表 API**

```typescript
// src/app/api/templates/categories/route.ts

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('template_categories')
      .select('id, category, name, name_en, description, icon, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch categories' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fetch categories error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch categories' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/templates/categories/route.ts
git commit -m "$(cat <<'EOF'
feat(api): add template categories endpoint

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: API 层 - 改造 prompt-builder.ts

**Files:**
- Modify: `src/lib/ai/prompt-builder.ts`

- [ ] **Step 1: 改造 prompt-builder.ts**

在文件末尾添加新函数：

```typescript
// 在 src/lib/ai/prompt-builder.ts 末尾添加

import { createServerSupabaseClient } from '@/lib/db/supabase-server';

/**
 * Get system prompt from database by category
 */
export async function getSystemPrompt(category: string): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('template_categories')
    .select('system_prompt')
    .eq('category', category)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    // Fallback to default
    return getPromptTemplate(category);
  }

  return data.system_prompt;
}

/**
 * Build generation messages with database-fetched system prompt
 */
export async function buildGenerationMessagesAsync(params: GenerationParams): Promise<{
  model: string;
  messages: Array<{ role: string; content: string }>;
}> {
  const systemPrompt = await getSystemPrompt(params.category);

  let userContent = params.prompt;
  if (params.topic) {
    userContent = `Topic: ${params.topic}\n\n${userContent}`;
  }
  if (params.industry) {
    userContent = `Industry: ${params.industry}\n\n${userContent}`;
  }

  return {
    model: params.model ?? DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

/**
 * Build chat messages with template style injection
 */
export async function buildChatMessagesWithTemplateStyle(params: {
  category: string;
  templateHtml?: string;
  contextHtml?: string;
  history: Array<{ role: string; content: string }>;
  userMessage: string;
  model?: string;
  isAutoGenerate?: boolean;
}): Promise<{
  model: string;
  messages: Array<{ role: string; content: string }>;
}> {
  const systemPrompt = await getSystemPrompt(params.category);

  const systemParts: string[] = [systemPrompt];

  // Inject template style for first generation
  if (params.isAutoGenerate && params.templateHtml) {
    systemParts.push(`

IMPORTANT: Generate content that matches this template's style and structure:

<template_structure>
${params.templateHtml.substring(0, 2000)}
</template_structure>

Maintain the template's:
1. Heading hierarchy and formatting
2. Section structure
3. Overall style and tone`);
  }

  // Add current document context
  if (params.contextHtml) {
    systemParts.push(`

The user is currently working on the following document. When they ask you to edit, revise, or improve it, provide the complete updated HTML:

<document>
${params.contextHtml}
</document>`);
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemParts.join('') },
  ];

  // Add history
  const recentHistory = params.history
    .filter((m) => m.role !== 'system')
    .slice(-20);

  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: 'user', content: params.userMessage });

  return {
    model: params.model ?? DEFAULT_MODEL,
    messages,
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/ai/prompt-builder.ts
git commit -m "$(cat <<'EOF'
feat(ai): add async prompt builder with database support

- Fetch system_prompt from template_categories table
- Inject template style for first generation
- Maintain backward compatibility with PROMPT_TEMPLATES

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: API 层 - 改造 /api/ai/generate

**Files:**
- Modify: `src/app/api/ai/generate/route.ts`

- [ ] **Step 1: 完全重写 generate route**

```typescript
// src/app/api/ai/generate/route.ts

import { NextRequest } from 'next/server';
import { classifyIntent } from '@/lib/ai/intent-classifier';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { createSSEStream, sendSSEStatus, sendSSEContent, sendSSECompletion, sendSSEError, sendSSEEvent } from '@/lib/ai/sse-helper';
import { getUserId } from '@/lib/utils/user-id';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, prompt, topic, industry, model } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { controller, stream } = createSSEStream();

    // Start async processing
    (async () => {
      try {
        sendSSEStatus(controller!, '分析你的请求...', 5);

        // Step 1: Classify intent
        const intentResult = await classifyIntent(prompt, category);

        if (!intentResult.readyToGenerate) {
          // Need clarification - create conversation and return
          const conversationId = await createConversation(category);

          sendSSEEvent(controller!, {
            type: 'clarification_needed',
            conversationId,
            message: intentResult.suggestedQuestion || '你想创建什么类型的文档？',
            quickReplies: intentResult.quickReplies || ['简历', '求职信', '报告', '商业计划'],
          });
          controller!.close();
          return;
        }

        // Ready to generate - match template
        sendSSEStatus(controller!, '匹配模版...', 20);

        const finalCategory = intentResult.category || 'document';
        const templateMatch = await matchTemplate(finalCategory, prompt);

        sendSSEStatus(controller!, '准备生成...', 30);

        // Create conversation
        const conversationId = await createConversation(finalCategory);

        // Save user message
        await saveUserMessage(conversationId, prompt);

        // Return ready_to_generate event
        sendSSEEvent(controller!, {
          type: 'ready_to_generate',
          conversationId,
          category: finalCategory,
          templateId: templateMatch?.template?.id,
        });
        controller!.close();

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        sendSSEError(controller!, message);
        controller!.close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function createConversation(category?: string | null): Promise<string> {
  const supabase = createServerSupabaseClient();
  const userId = getUserId();

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      category: category || null,
      title: 'New Document',
      model: 'gpt-4o',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error('Failed to create conversation');
  }

  return data.id;
}

async function saveUserMessage(conversationId: string, content: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content,
    content_type: 'text',
  });
}

async function matchTemplate(category: string, userPrompt: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/templates/match`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, userPrompt }),
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 更新 sse-helper.ts 添加 sendSSEEvent**

在 `src/lib/ai/sse-helper.ts` 中添加：

```typescript
// 在 src/lib/ai/sse-helper.ts 中添加

export function sendSSEEvent(
  controller: TransformStreamDefaultController,
  event: Record<string, unknown>
) {
  const encoder = new TextEncoder();
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/ai/generate/route.ts src/lib/ai/sse-helper.ts
git commit -m "$(cat <<'EOF'
feat(api): refactor generate endpoint with intent classification

- Classify intent before generation
- Return clarification_needed for unclear intent
- Return ready_to_generate with template info for clear intent
- Create conversation for both paths

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: API 层 - 改造 /api/ai/clarify

**Files:**
- Modify: `src/app/api/ai/clarify/route.ts`

- [ ] **Step 1: 改造 clarify route**

```typescript
// src/app/api/ai/clarify/route.ts

import { NextRequest } from 'next/server';
import { getSession, addMessage, setSessionCategory, deleteSession } from '@/lib/ai/clarify-session-store';
import { streamChatCompletion } from '@/lib/ai/llm-client';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { classifyIntent } from '@/lib/ai/intent-classifier';

export const runtime = 'edge';
export const maxDuration = 60;

const CLARIFY_SYSTEM_PROMPT = `You are a helpful document creation assistant. Help users clarify what document they want to create.

Available document types: document, businessPlan, report, manual, caseStudy, ebook, whitePaper, marketResearch, researchPaper, proposal, budget, todoList, resume, coverLetter, letter, meetingMinutes, writer, policy, payslip, companyProfile

When the user clarifies their intent, respond with JSON ONLY:
{
  "type": "intent_clear",
  "category": "resume",
  "summary": "I'll generate a resume for you"
}

When you need more information, respond conversationally:
{
  "type": "continue",
  "content": "What type of document would you like?",
  "quickReplies": ["简历", "求职信", "报告"]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, conversationId, message } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If conversationId provided, save message to database
    if (conversationId) {
      const supabase = createServerSupabaseClient();
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        content_type: 'text',
      });
    }

    // Classify intent with the new message
    const intentResult = await classifyIntent(message);

    if (intentResult.readyToGenerate && intentResult.category) {
      // Intent is clear - return ready_to_generate
      const templateMatch = await matchTemplate(intentResult.category, message);

      // Save assistant message
      if (conversationId) {
        const supabase = createServerSupabaseClient();
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: `好的，我将为你生成${intentResult.category}文档...`,
          content_type: 'text',
          metadata: { category: intentResult.category },
        });
      }

      return new Response(
        JSON.stringify({
          type: 'ready_to_generate',
          conversationId,
          category: intentResult.category,
          templateId: templateMatch?.template?.id,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Need more clarification - use LLM for conversational response
    const response = await getClarificationResponse(message);

    // Save assistant message
    if (conversationId) {
      const supabase = createServerSupabaseClient();
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: response.content || '',
        content_type: 'text',
        metadata: { quickReplies: response.quickReplies },
      });
    }

    return new Response(
      JSON.stringify({
        type: 'continue',
        ...response,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clarify failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getClarificationResponse(userMessage: string): Promise<{
  content: string;
  quickReplies?: string[];
}> {
  try {
    const generator = await streamChatCompletion({
      model: 'kimi-k2.5',
      messages: [
        { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    let accumulated = '';

    for await (const chunk of generator) {
      if (chunk.type === 'delta') {
        accumulated += chunk.data;
      }
    }

    const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        content: '你想创建什么类型的文档？',
        quickReplies: ['简历', '求职信', '报告', '商业计划'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.type === 'intent_clear') {
      // This shouldn't happen since we already checked intentResult.readyToGenerate
      return {
        content: parsed.summary || '好的，我来为你生成文档。',
      };
    }

    return {
      content: parsed.content || '你想创建什么类型的文档？',
      quickReplies: parsed.quickReplies,
    };
  } catch {
    return {
      content: '你想创建什么类型的文档？',
      quickReplies: ['简历', '求职信', '报告', '商业计划'],
    };
  }
}

async function matchTemplate(category: string, userPrompt: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/templates/match`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, userPrompt }),
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/ai/clarify/route.ts
git commit -m "$(cat <<'EOF'
feat(api): refactor clarify endpoint for multi-turn dialog

- Use intent classifier for each message
- Return ready_to_generate when intent is clear
- Save messages to database
- Support conversationId for persistence

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: API 层 - 改造 /api/ai/chat

**Files:**
- Modify: `src/app/api/ai/chat/route.ts`

- [ ] **Step 1: 改造 chat route 支持 autoGenerate**

在现有代码基础上修改，增加 autoGenerate 支持：

```typescript
// 在 src/app/api/ai/chat/route.ts 中修改

// ... 现有 imports ...

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message, contextHtml, model, category, templateId, autoGenerate } = body;

    if (!conversationId || !message) {
      return new Response(JSON.stringify({ error: 'conversationId and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load conversation history from Supabase
    const supabase = createServerSupabaseClient();
    const { data: dbMessages, error: historyError } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (historyError) {
      console.error('Failed to load message history:', historyError);
    }

    const history = (dbMessages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Load template HTML if templateId provided
    let templateHtml: string | undefined;

    if (templateId) {
      try {
        const templateRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/templates?id=${templateId}`
        );
        if (templateRes.ok) {
          const templateData = await templateRes.json();
          templateHtml = templateData.html;
        }
      } catch (e) {
        console.error('Failed to load template:', e);
      }
    }

    // Persist user message
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
      content_type: 'text',
      metadata: { category, templateId },
    });

    const { controller, stream } = createSSEStream();

    // Start streaming in background
    (async () => {
      try {
        const startTime = Date.now();

        sendSSEStatus(controller!, 'Thinking...', 10);

        // Use async prompt builder with template style injection
        const { model: selectedModel, messages } = await buildChatMessagesWithTemplateStyle({
          category: category || 'document',
          templateHtml,
          contextHtml,
          history,
          userMessage: message,
          model,
          isAutoGenerate: autoGenerate,
        });

        sendSSEStatus(controller!, 'Generating response...', 30);

        const generator = await streamChatCompletion({ model: selectedModel, messages });

        let accumulated = '';
        let chunkCount = 0;

        for await (const chunk of generator) {
          if (chunk.type === 'delta') {
            accumulated += chunk.data;
            chunkCount++;
            sendSSEContent(controller!, chunk.data);
          } else if (chunk.type === 'error') {
            sendSSEError(controller!, chunk.data);
            controller!.close();
            return;
          }
        }

        const duration = Date.now() - startTime;

        // Persist assistant message
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: accumulated,
          content_type: 'text',
          metadata: { stream_duration_ms: duration, category },
          duration_ms: duration,
          model: selectedModel,
        });

        // Send completion
        const encoder = new TextEncoder();
        controller!.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', data: '', percentage: 100 })}\n\n`,
          ),
        );
        controller!.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chat failed';
        sendSSEError(controller!, message);
        controller!.close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

- [ ] **Step 2: 在文件顶部添加 import**

```typescript
import { buildChatMessagesWithTemplateStyle } from '@/lib/ai/prompt-builder';
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/ai/chat/route.ts
git commit -m "$(cat <<'EOF'
feat(api): add autoGenerate support to chat endpoint

- Support autoGenerate flag for first generation
- Inject template style into system prompt
- Use async prompt builder

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Store 层 - 改造 useChatStore

**Files:**
- Modify: `src/stores/useChatStore.ts`

- [ ] **Step 1: 增加初始化方法**

```typescript
// src/stores/useChatStore.ts

import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatState {
  conversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  streamingContent: string;

  setConversationId: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  finalizeStreaming: () => void;
  clearMessages: () => void;

  // New method for initializing from existing conversation
  initConversation: (conversationId: string, messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messages: [],
  isLoading: false,
  streamingContent: '',

  setConversationId: (id) => set({ conversationId: id }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = { ...messages[i], content, isStreaming: false };
          break;
        }
      }
      return { messages };
    }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  finalizeStreaming: () =>
    set((state) => {
      const messages = [...state.messages];
      const streamingContent = state.streamingContent;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].isStreaming) {
          messages[i] = { ...messages[i], content: streamingContent, isStreaming: false };
          break;
        }
      }
      return { messages, streamingContent: '' };
    }),

  clearMessages: () => set({ messages: [], streamingContent: '' }),

  // Initialize from existing conversation (e.g., from /dashboard/create)
  initConversation: (conversationId, messages) =>
    set({
      conversationId,
      messages,
      streamingContent: '',
      isLoading: false,
    }),
}));
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/useChatStore.ts
git commit -m "$(cat <<'EOF'
feat(store): add initConversation method to useChatStore

Allows initializing store with existing conversation data
for seamless transition from create page to editor.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Store 层 - 改造 useDashboardStore

**Files:**
- Modify: `src/stores/useDashboardStore.ts`

- [ ] **Step 1: 增加生成相关状态**

在现有 `DashboardState` 接口中添加：

```typescript
// 在 src/stores/useDashboardStore.ts 中添加

interface DashboardState {
  // ... 现有字段 ...

  // New fields for generation flow
  generateParams: {
    conversationId: string | null;
    category: string | null;
    templateId: string | null;
    shouldAutoGenerate: boolean;
  };
  setGenerateParams: (params: Partial<DashboardState['generateParams']>) => void;
  clearGenerateParams: () => void;
}

// 在 create 函数中添加实现：
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      // ... 现有实现 ...

      generateParams: {
        conversationId: null,
        category: null,
        templateId: null,
        shouldAutoGenerate: false,
      },
      setGenerateParams: (params) =>
        set((state) => ({
          generateParams: { ...state.generateParams, ...params },
        })),
      clearGenerateParams: () =>
        set({
          generateParams: {
            conversationId: null,
            category: null,
            templateId: null,
            shouldAutoGenerate: false,
          },
        }),
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        activeDocType: state.activeDocType,
        activeTemplateCategory: state.activeTemplateCategory,
        editorView: state.editorView,
      }),
    }
  )
);
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/useDashboardStore.ts
git commit -m "$(cat <<'EOF'
feat(store): add generateParams to useDashboardStore

Track generation parameters for editor auto-generate feature.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: 前端 - 新建 /dashboard/create 页面

**Files:**
- Create: `src/app/[locale]/dashboard/create/page.tsx`
- Create: `src/components/dashboard/CreateConversation.tsx`

- [ ] **Step 1: 创建页面文件**

```typescript
// src/app/[locale]/dashboard/create/page.tsx

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
```

- [ ] **Step 2: 创建对话组件**

```typescript
// src/components/dashboard/CreateConversationView.tsx

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { getUserId } from '@/lib/utils/user-id';
import type { StreamEvent } from '@/types/ai';

interface CreateConversationViewProps {
  initialConversationId?: string;
  initialMessage?: string;
}

export function CreateConversationView({
  initialConversationId,
  initialMessage,
}: CreateConversationViewProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const setGenerateParams = useDashboardStore((s) => s.setGenerateParams);

  // Initialize conversation
  useEffect(() => {
    const init = async () => {
      if (initialConversationId) {
        setConversationId(initialConversationId);
        // Load messages from database
        const res = await fetch(`/api/ai/chat/conversations/${initialConversationId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } else {
        // Create new conversation
        const res = await fetch('/api/ai/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Document', userId: getUserId() }),
        });
        const data = await res.json();
        if (data.data?.id) {
          setConversationId(data.data.id);
        }
      }
    };

    init();
  }, [initialConversationId, setConversationId, setMessages]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && conversationId && messages.length === 0) {
      handleSend(initialMessage);
    }
  }, [initialMessage, conversationId, messages.length]);

  const handleSend = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading || !conversationId) return;

    setInput('');
    setIsLoading(true);

    // Add user message to UI
    addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    });

    try {
      const response = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: text,
        }),
      });

      const data = await response.json();

      if (data.type === 'ready_to_generate') {
        // Intent is clear - navigate to editor
        addMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `好的，我将为你生成文档...`,
        });

        setGenerateParams({
          conversationId,
          category: data.category,
          templateId: data.templateId,
          shouldAutoGenerate: true,
        });

        router.push('/dashboard/editor');
      } else {
        // Continue conversation
        addMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content,
        });
      }
    } catch (error) {
      console.error('Clarify error:', error);
      addMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，出了点问题。请重试。',
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId, addMessage, setGenerateParams, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      {/* MiniNav */}
      <aside className="w-[72px] bg-white border-r border-gray-200 h-full flex-shrink-0" />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8 px-4">
          创建文档
        </h1>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                <span className="animate-pulse">思考中...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想创建的文档..."
              rows={2}
              disabled={isLoading}
              className="w-full resize-none border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/[locale]/dashboard/create/page.tsx src/components/dashboard/CreateConversationView.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add /dashboard/create page for multi-turn clarification

- Display conversation for type clarification
- Navigate to editor when intent is clear
- Support initial message from dashboard

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: 前端 - 改造 useAIGeneration hook

**Files:**
- Modify: `src/hooks/useAIGeneration.ts`

- [ ] **Step 1: 改造 hook 处理新事件类型**

```typescript
// src/hooks/useAIGeneration.ts

'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useChatStore } from '@/stores/useChatStore';
import type { StreamEvent } from '@/types/ai';

interface GenerateResult {
  type: 'ready_to_generate' | 'clarification_needed';
  conversationId?: string;
  category?: string;
  templateId?: string;
  message?: string;
  quickReplies?: string[];
}

export function useAIGeneration() {
  const router = useRouter();
  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const setIsGenerating = useDashboardStore((s) => s.setIsGenerating);
  const setGenerateParams = useDashboardStore((s) => s.setGenerateParams);
  const initConversation = useChatStore((s) => s.initConversation);

  const [isGenerating, setIsGeneratingLocal] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (params: {
      category: string;
      prompt: string;
      topic?: string;
      industry?: string;
      model?: string;
    }) => {
      // Abort any previous generation
      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      setIsGeneratingLocal(true);
      setIsGenerating(true);
      setGeneratedContent(null);
      setProgress(0);
      setStatusMessage('Starting...');
      setError(null);

      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            try {
              const event = JSON.parse(trimmed.slice(6));

              switch (event.type) {
                case 'status':
                  setStatusMessage(event.data);
                  if (event.percentage) setProgress(event.percentage);
                  break;

                case 'ready_to_generate':
                  // Intent is clear - navigate to editor
                  setGenerateParams({
                    conversationId: event.conversationId,
                    category: event.category,
                    templateId: event.templateId,
                    shouldAutoGenerate: true,
                  });
                  setIsGeneratingLocal(false);
                  setIsGenerating(false);
                  router.push('/dashboard/editor');
                  return;

                case 'clarification_needed':
                  // Need multi-turn conversation
                  setIsGeneratingLocal(false);
                  setIsGenerating(false);
                  router.push(
                    `/dashboard/create?conversationId=${event.conversationId}&message=${encodeURIComponent(params.prompt)}`
                  );
                  return;

                case 'error':
                  throw new Error(event.data);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                throw e;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setIsGeneratingLocal(false);
        setIsGenerating(false);
      }
    },
    [router, setPendingEditorContent, setIsGenerating, setGenerateParams]
  );

  return { generate, isGenerating, generatedContent, progress, statusMessage, error };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useAIGeneration.ts
git commit -m "$(cat <<'EOF'
feat(hook): handle ready_to_generate and clarification_needed events

- Navigate to editor on ready_to_generate
- Navigate to create page on clarification_needed
- Set generate params for auto-generate

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: 前端 - 改造 EditorShell

**Files:**
- Modify: `src/components/dashboard/EditorShell.tsx`

- [ ] **Step 1: 增加 URL 参数读取和自动生成**

在 EditorShell 组件中添加：

```typescript
// 在 src/components/dashboard/EditorShell.tsx 中添加

// 在文件顶部添加
import { useSearchParams } from 'next/navigation';

// 在组件内部添加
export function EditorShell() {
  const searchParams = useSearchParams();
  // ... 现有代码 ...

  // Get generate params from store
  const generateParams = useDashboardStore((s) => s.generateParams);
  const clearGenerateParams = useDashboardStore((s) => s.clearGenerateParams);
  const initConversation = useChatStore((s) => s.initConversation);
  const conversationId = useChatStore((s) => s.conversationId);

  // Check for auto-generate on mount
  useEffect(() => {
    const autoGenerate = async () => {
      if (!generateParams.shouldAutoGenerate || !generateParams.conversationId) return;

      // Clear the flag to prevent re-triggering
      clearGenerateParams();

      // Load conversation history
      try {
        const res = await fetch(`/api/ai/chat/conversations/${generateParams.conversationId}/messages`);
        if (res.ok) {
          const data = await res.json();
          const messages = (data.messages || []).map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
          initConversation(generateParams.conversationId, messages);
        }
      } catch (e) {
        console.error('Failed to load conversation:', e);
      }
    };

    autoGenerate();
  }, [generateParams, clearGenerateParams, initConversation]);

  // ... 其余代码 ...
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/dashboard/EditorShell.tsx
git commit -m "$(cat <<'EOF'
feat(editor): add auto-generate support on editor load

- Read generateParams from store
- Load conversation history
- Initialize chat store with existing conversation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: 前端 - 改造 AIChatSidebar

**Files:**
- Modify: `src/components/dashboard/AIChatSidebar.tsx`

- [ ] **Step 1: 增加自动生成触发逻辑**

```typescript
// 在 src/components/dashboard/AIChatSidebar.tsx 中修改

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatStream } from '@/components/ai/ChatStream';
import { getUserId } from '@/lib/utils/user-id';

export function AIChatSidebar() {
  const t = useTranslations('editor');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoGenerated = useRef(false);

  const conversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isLoading = useChatStore((s) => s.isLoading);

  const selectedTemplateId = useDashboardStore((s) => s.selectedTemplateId);
  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);
  const setCurrentEditorHtml = useDashboardStore((s) => s.setCurrentEditorHtml);
  const generateParams = useDashboardStore((s) => s.generateParams);

  const { sendMessage } = useAIChat({
    conversationId,
    templateId: selectedTemplateId || generateParams.templateId,
    category: generateParams.category,
    onChunk: (html: string) => {
      setCurrentEditorHtml(html);
    },
  });

  // Auto-generate when shouldAutoGenerate is true
  useEffect(() => {
    if (
      generateParams.shouldAutoGenerate &&
      generateParams.conversationId &&
      conversationId === generateParams.conversationId &&
      messages.length > 0 &&
      !hasAutoGenerated.current
    ) {
      hasAutoGenerated.current = true;

      // Find the last user message
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMessage) {
        // Trigger generation with the user's original prompt
        sendMessage(lastUserMessage.content, {
          contextHtml: '',
          autoGenerate: true,
          templateId: generateParams.templateId,
        });
      }
    }
  }, [generateParams, conversationId, messages, sendMessage]);

  // ... 其余代码保持不变 ...
}
```

- [ ] **Step 2: 更新 useAIChat hook 支持 autoGenerate**

在 `src/hooks/useAIChat.ts` 中修改 sendMessage 调用：

```typescript
// 在 useAIChat.ts 的 sendMessage 函数中

const sendMessage = useCallback(
  async (message: string, sendOptions?: { contextHtml?: string; autoGenerate?: boolean; templateId?: string }) => {
    // ... 现有代码 ...

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        message,
        contextHtml: sendOptions?.contextHtml,
        category: options?.category,
        templateId: sendOptions?.templateId ?? options?.templateId,
        autoGenerate: sendOptions?.autoGenerate,
      }),
      signal: abortController.signal,
    });

    // ... 其余代码 ...
  },
  [options, addMessage, setIsLoading, setStreamingContent, appendStreamingContent, finalizeStreaming]
);
```

- [ ] **Step 3: 提交**

```bash
git add src/components/dashboard/AIChatSidebar.tsx src/hooks/useAIChat.ts
git commit -m "$(cat <<'EOF'
feat(ui): add auto-generate trigger in AIChatSidebar

- Auto-trigger generation when shouldAutoGenerate is true
- Pass autoGenerate flag to chat API
- Use last user message as generation prompt

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: 收尾 - 删除 PROMPT_TEMPLATES

**Files:**
- Delete: `src/config/prompt-templates.ts`
- Modify: 所有引用该文件的代码

- [ ] **Step 1: 检查引用**

```bash
grep -r "prompt-templates" src/
```

- [ ] **Step 2: 移除引用并替换为数据库查询**

在 `src/lib/ai/prompt-builder.ts` 中移除对 `PROMPT_TEMPLATES` 的引用：

```typescript
// 移除这行
import { getPromptTemplate, PROMPT_TEMPLATES } from '@/config/prompt-templates';

// 保留 getPromptTemplate 函数作为 fallback
// 但主要使用 getSystemPrompt 从数据库获取
```

- [ ] **Step 3: 删除文件**

```bash
rm src/config/prompt-templates.ts
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: remove PROMPT_TEMPLATES, use database

All system prompts now stored in template_categories table.
Fallback to default prompt if not found in database.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: 测试与验证

- [ ] **Step 1: 测试意图判断**

```bash
# 测试明确意图
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "写一份前端工程师简历"}'

# 预期: ready_to_generate

# 测试模糊意图
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello"}'

# 预期: clarification_needed
```

- [ ] **Step 2: 测试模版匹配**

```bash
curl -X POST http://localhost:3000/api/templates/match \
  -H "Content-Type: application/json" \
  -d '{"category": "resume", "userPrompt": "前端工程师，5年经验"}'

# 预期: 返回匹配的模版
```

- [ ] **Step 3: 端到端测试**

1. 访问 dashboard
2. 输入 "hello" → 应跳转到 create 页面
3. 在 create 页面回答 "简历" → 应跳转到编辑器并自动生成

- [ ] **Step 4: 修复发现的 bug**

---

## Spec Coverage Check

| Spec 需求 | Task |
|-----------|------|
| 新建 template_categories 表 | Task 1 |
| 迁移 PROMPT_TEMPLATES 数据 | Task 2 |
| 模版相关类型定义 | Task 3 |
| 意图判断逻辑 | Task 4 |
| 模版匹配 API | Task 5 |
| 获取分类列表 API | Task 6 |
| prompt-builder 改造 | Task 7 |
| /api/ai/generate 改造 | Task 8 |
| /api/ai/clarify 改造 | Task 9 |
| /api/ai/chat 改造 | Task 10 |
| useChatStore 改造 | Task 11 |
| useDashboardStore 改造 | Task 12 |
| /dashboard/create 页面 | Task 13 |
| useAIGeneration 改造 | Task 14 |
| EditorShell 改造 | Task 15 |
| AIChatSidebar 改造 | Task 16 |
| 删除 PROMPT_TEMPLATES | Task 17 |
| 端到端测试 | Task 18 |

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
