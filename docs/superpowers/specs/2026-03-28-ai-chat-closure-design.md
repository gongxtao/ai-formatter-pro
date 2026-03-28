# AI Chat Closure Design

Date: 2026-03-28
Status: Draft

## Overview

实现两个 AI 聊天组件的业务闭环：
1. **DashboardChatBox**：用户输入内容后生成文档并跳转 Editor
2. **AIChatSidebar**：用户通过对话生成/编辑文档内容

## Problem Statement

### DashboardChatBox 当前问题
- 文档类型选择器功能不完整（只有占位按钮）
- 当用户未选择文档类型时，AI 无法判断应生成什么类型的文档
- 缺少多轮对话机制来澄清用户意图

### AIChatSidebar 当前问题
- AI 不知道当前使用的模板/文档类型
- 生成的内容可能不符合模板结构
- 缺少模板感知机制

## Solution Design

### 1. Dashboard ChatBox Flow

```
用户进入 Dashboard
    ↓
activeDocType 自动设置为 document 类型的第一个子类型
    ↓
用户输入提示词 + 点击 Generate
    ↓
┌─────────────────────────────────────────────────────┐
│ 情况 A：activeDocType 有值                           │
│   → 调用 /api/ai/generate (category=activeDocType)  │
│   → 直接生成 HTML                                    │
│   → setPendingEditorContent → 跳转 Editor            │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ 情况 B：activeDocType 为空，AI 能从提示词推断         │
│   → 调用 /api/ai/generate (category=null)           │
│   → AI 推断文档类型                                   │
│   → 生成 HTML → 跳转 Editor                          │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ 情况 C：activeDocType 为空，AI 无法推断              │
│   → 调用 /api/ai/generate (category=null)           │
│   → 返回 needsClarification=true + sessionId        │
│   → 跳转 /dashboard/ai-chat/[sessionId]             │
│   → 多轮对话澄清意图                                  │
│   → 对话结束后 → 跳转 Editor                          │
└─────────────────────────────────────────────────────┘
```

### 2. Editor AIChatSidebar Flow

```
用户进入 Editor（可能从 Dashboard 生成后跳转，也可能直接进入）
    ↓
AIChatSidebar 读取 selectedTemplateId
    ↓
┌─────────────────────────────────────────────────────┐
│ 有 selectedTemplateId                                │
│   → 获取模板 HTML                                      │
│   → 传递给 AI 作为上下文                               │
│   → AI 基于模板样式生成内容                             │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ 无 selectedTemplateId                                │
│   → AI 根据编辑器内容/用户输入推断文档类型              │
│   → 能推断：使用对应模板样式生成内容                    │
│   → 不能推断：引导用户提供信息辅助选择模板              │
└─────────────────────────────────────────────────────┘
    ↓
用户发送消息
    ↓
AI 流式生成 HTML（实时渲染到编辑器）
    ↓
编辑器实时显示 AI 输出过程
    ↓
生成完成
```

**关键体验改进：**
- AI 生成内容时**实时流式渲染**到编辑器，用户可以看到输出过程
- 不需要用户点击"插入"按钮，减少操作步骤
- 避免"系统卡住"的错觉，提升用户体验

## Technical Design

### State Changes

**useDashboardStore 新增：**
```typescript
interface DashboardState {
  // ...existing fields

  // 新增：生成会话 ID（用于中间对话页面）
  generationSessionId: string | null;
  setGenerationSessionId: (id: string | null) => void;
}
```

**复用现有字段：**
- `selectedTemplateId`：当前使用的模板 ID，用于 AI 感知模板类型
- `activeDocType`：当前选择的文档类型
- `pendingEditorContent`：待插入编辑器的内容

### Routes

**新增路由：**
```
/dashboard/ai-chat/[sessionId]  → 中间对话页面
```

**现有路由（无变化）：**
```
/dashboard           → Dashboard 页面
/dashboard/editor    → Editor 页面
```

### API Changes

---

#### `/api/ai/generate` 修改

**请求：**
```typescript
interface GenerateRequest {
  category?: string;  // 改为可选
  prompt: string;
  topic?: string;
  industry?: string;
  model?: string;
}
```

**逻辑流程：**
```
1. 接收请求
2. 如果 category 有值 → 直接生成（现有逻辑）
3. 如果 category 为空：
   a. 调用 LLM 进行"意图分类"
   b. LLM 返回：
      - 推断的类型（如果能推断）
      - needsClarification=true（如果不能推断）
   c. 如果能推断 → 使用推断的类型生成
   d. 如果不能推断 → 返回 clarification_needed 事件
```

**意图分类 Prompt：**
```typescript
const INTENT_CLASSIFICATION_PROMPT = `
You are a document type classifier. Analyze the user's request and determine the most appropriate document type.

Available types: ${Object.keys(PROMPT_TEMPLATES).join(', ')}

User request: "${prompt}"

If you can confidently determine the type, respond with JSON:
{ "type": "resume", "confidence": 0.9 }

If the request is too vague or could match multiple types, respond with:
{ "needsClarification": true, "possibleTypes": ["resume", "coverLetter", "letter"] }

Respond ONLY with the JSON object, no other text.
`;
```

**SSE 事件流：**
```
情况 A：能推断类型
→ { type: 'status', data: 'Analyzing request...', percentage: 10 }
→ { type: 'status', data: 'Detected document type: resume', percentage: 20 }
→ { type: 'content', data: '<h1>...' }  // 开始生成
→ { type: 'completion', data: '<html>...' }
→ { type: 'done', data: '' }

情况 B：不能推断类型
→ { type: 'status', data: 'Analyzing request...', percentage: 10 }
→ { type: 'clarification_needed', sessionId: 'xxx', question: 'What type of document?' }
// 流结束
```

---

**请求：**
```typescript
interface GenerateRequest {
  category?: string;  // 改为可选
  prompt: string;
  topic?: string;
  industry?: string;
  model?: string;
}
```

**响应（新增场景）：**
```typescript
interface GenerateResponse {
  // 正常生成
  html?: string;

  // 需要澄清
  needsClarification?: boolean;
  sessionId?: string;
  question?: string;  // AI 提出的问题
}
```

**逻辑：**
1. 如果 `category` 有值 → 直接生成
2. 如果 `category` 为空 → AI 尝试从 `prompt` 推断
3. 如果能推断 → 直接生成
4. 如果不能推断 → 返回 `needsClarification=true` + `sessionId`

#### `/api/ai/clarify` 新增

**请求：**
```typescript
interface ClarifyRequest {
  sessionId: string;
  message: string;
}
```

**响应：**
```typescript
interface ClarifyResponse {
  type: 'continue' | 'complete';

  // continue 时
  content?: string;              // AI 回复内容
  quickReplies?: string[];       // 内联按钮选项

  // complete 时
  html?: string;                 // 生成的 HTML
  category?: string;             // 确定的文档类型
}
```

**示例响应：**
```json
{
  "type": "continue",
  "content": "What type of document do you want to create?",
  "quickReplies": ["Resume", "Contract", "Report", "Letter"]
}
```

**逻辑流程：**
```
1. 接收请求（sessionId + message）
2. 从内存获取会话上下文（用户原始 prompt + 历史对话）
3. 调用 LLM 进行对话
4. LLM 返回结构化响应：
   a. 如果还需要更多信息 → type: continue + quickReplies
   b. 如果信息足够 → type: complete + html
5. 如果 complete，返回 HTML 并结束会话
```

**System Prompt：**
```typescript
const CLARIFY_SYSTEM_PROMPT = `
You are a helpful document creation assistant. Your goal is to help users create documents.

First, determine what type of document the user wants to create.
Available types: resume, coverLetter, letter, report, proposal, businessPlan, contract, etc.

If you need more information to determine the document type, ask a clear question.
When asking, provide relevant options as quick replies.

When you have enough information, respond with JSON:
{
  "type": "complete",
  "category": "resume",
  "summary": "Brief summary of what you'll generate"
}

When you need more info:
{
  "type": "continue",
  "content": "What type of document would you like to create?",
  "quickReplies": ["Resume", "Cover Letter", "Report", "Letter"]
}

Always respond with valid JSON only.
`;
```

**会话存储（内存）：**
```typescript
// 简单的内存存储
const clarifySessions = new Map<string, {
  originalPrompt: string;
  messages: Array<{ role: string; content: string }>;
  createdAt: Date;
}>();

// 过期清理（5分钟后自动删除）
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of clarifySessions) {
    if (now - session.createdAt.getTime() > 5 * 60 * 1000) {
      clarifySessions.delete(id);
    }
  }
}, 60 * 1000);
```

---

#### `/api/ai/chat` 修改

**请求新增参数：**
```typescript
interface ChatRequest {
  conversationId: string;
  message: string;
  contextHtml?: string;    // 现有：编辑器当前内容
  category?: string;       // 现有：文档类型
  templateId?: string;     // 新增：模板 ID
}
```

**逻辑修改：**
```
1. 接收请求
2. 如果 templateId 有值：
   a. 从 /api/templates?id=xxx 获取模板 HTML
   b. 提取模板结构特征（或直接使用 HTML）
   c. 构建 System Prompt 包含模板信息
3. 如果 templateId 为空：
   a. 使用 contextHtml 推断文档类型
   b. 如果能推断 → 使用对应类型的 prompt
   c. 如果不能推断 → 使用通用编辑 prompt
4. 调用 LLM 生成（流式）
5. 流式返回内容
```

**System Prompt 构建（有模板时）：**
```typescript
function buildChatSystemPrompt(templateHtml: string, category?: string): string {
  const basePrompt = getPromptTemplate(category ?? 'document');

  return `${basePrompt}

IMPORTANT: The user is working with a template. Here is the template structure:

<template>
${templateHtml}
</template>

When generating or editing content:
1. Maintain the template's structure and styling
2. Replace placeholder content appropriately
3. Keep the same HTML elements and layout
4. Match the template's tone and format

The user's current document content is provided separately.
`;
}
```

**System Prompt 构建（无模板时）：**
```typescript
function buildChatSystemPromptNoTemplate(contextHtml?: string, category?: string): string {
  if (category) {
    // 有类型但无模板：使用类型对应的 prompt
    return getPromptTemplate(category);
  }

  if (contextHtml) {
    // 有内容但无类型：推断类型
    return `You are a helpful document editing assistant.

Analyze the user's current document and help them edit or improve it.
When generating content, match the style and structure of the existing document.

Current document:
<document>
${contextHtml}
</document>

Respond with complete HTML when generating new content.
`;
  }

  // 无内容无类型：通用 prompt + 引导用户
  return `You are a helpful document creation assistant.

The user hasn't started a document yet. Help them by:
1. Asking what type of document they want to create
2. Gathering necessary information
3. Generating a complete document when ready

When generating content, use semantic HTML with inline styles.
`;
}
```

**类型推断逻辑：**
```typescript
const TYPE_INFERENCE_PROMPT = `
Analyze the following document content and determine its type.
Available types: ${Object.keys(PROMPT_TEMPLATES).join(', ')}

Document content:
${contextHtml.substring(0, 1000)}

Respond with JSON only:
{ "type": "resume", "confidence": 0.85 }

If uncertain, use "document" as default.
`;

async function inferDocumentType(contextHtml: string): Promise<string> {
  // 调用 LLM 进行类型推断
  const response = await callLLM(TYPE_INFERENCE_PROMPT);
  const result = JSON.parse(response);
  return result.confidence > 0.6 ? result.type : 'document';
}
```

### Component Changes

#### DashboardChatBox

**改动：**
1. 修改 `handleGenerate` 逻辑，处理 `needsClarification` 响应
2. 如果需要澄清 → 跳转 `/dashboard/ai-chat/[sessionId]`
3. 否则 → 现有逻辑（跳转 Editor）

```typescript
const handleGenerate = async () => {
  if (!prompt.trim()) return;

  const response = await generate({
    category: activeDocType || undefined,
    prompt: prompt.trim(),
  });

  if (response.needsClarification && response.sessionId) {
    setGenerationSessionId(response.sessionId);
    router.push(`/dashboard/ai-chat/${response.sessionId}`);
  } else {
    // 现有逻辑：setPendingEditorContent + 跳转 Editor
  }
};
```

#### 新增：AI Chat Page (`/dashboard/ai-chat/[sessionId]`)

**组件结构：**
```tsx
// src/app/[locale]/dashboard/ai-chat/[sessionId]/page.tsx
export default function AIChatPage({ params }) {
  const { sessionId } = params;

  return (
    <div className="h-screen">
      {/* 全屏对话界面 */}
      <AIClarifyChat sessionId={sessionId} />
    </div>
  );
}
```

**AIClarifyChat 组件功能：**
1. 全屏对话界面
2. 显示对话历史
3. **A2UI 支持**：渲染 AI 消息中的内联按钮（Quick Replies）
4. 用户点击按钮 → 自动发送消息
5. 发送消息到 `/api/ai/clarify`
6. 对话完成后跳转 Editor

**A2UI 消息格式：**
```typescript
interface ClarifyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: string[];  // 内联按钮选项
}

// 示例
{
  role: 'assistant',
  content: 'What type of document do you want to create?',
  quickReplies: ['Resume', 'Contract', 'Report', 'Letter']
}
```

#### AIChatSidebar

**改动：**
1. 读取 `selectedTemplateId`
2. 发送消息时传递 `templateId`
3. **删除 "Insert into Editor" 按钮**
4. **实时流式渲染**：AI 生成的内容实时更新到编辑器

```typescript
const selectedTemplateId = useDashboardStore((s) => s.selectedTemplateId);
const setCurrentEditorHtml = useDashboardStore((s) => s.setCurrentEditorHtml);

const { sendMessage } = useAIChat({
  conversationId,
  templateId: selectedTemplateId,  // 新增
  onChunk: (html: string) => {
    // 实时更新编辑器内容
    setCurrentEditorHtml(html);
  },
});
```

**实时渲染逻辑：**
- AI 返回的每个 chunk 累积成完整 HTML
- 每次收到 chunk 后立即调用 `setCurrentEditorHtml`
- EditorShell 监听 `currentEditorHtml` 变化并重新渲染

#### useAIChat Hook

**改动：**
1. 新增 `templateId` 参数
2. 新增 `onChunk` 回调，用于实时更新编辑器
3. 发送到 API

```typescript
interface UseAIChatOptions {
  conversationId?: string | null;
  category?: string;
  templateId?: string | null;  // 新增
  onChunk?: (accumulatedHtml: string) => void;  // 新增：实时更新回调
}

// sendMessage 时传递 templateId
body: JSON.stringify({
  conversationId,
  message,
  contextHtml: sendOptions?.contextHtml,
  category: options?.category,
  templateId: options?.templateId,  // 新增
}),

// 处理流式响应时
case 'content':
  accumulated += event.data;
  onChunk?.(accumulated);  // 实时回调
  break;
```

### Data Flow Diagrams

#### Dashboard Generate Flow
```
┌────────────────────────────────────────────────────────────────────┐
│                        Dashboard ChatBox                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐     │
│  │ User Input   │───▶│ Generate API │───▶│ needsClarify?    │     │
│  │ + Generate   │    │              │    │                  │     │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘     │
│                                                    │               │
│                           ┌────────────────────────┼───────────┐   │
│                           │ No                     │ Yes       │   │
│                           ▼                        ▼           │   │
│                    ┌──────────────┐    ┌──────────────────┐   │   │
│                    │ Set Content  │    │ Navigate to      │   │   │
│                    │ + Navigate   │    │ /ai-chat/[id]    │   │   │
│                    │ to Editor    │    └──────────────────┘   │   │
│                    └──────────────┘                           │   │
│                                                                │   │
└────────────────────────────────────────────────────────────────────┘
```

#### AI Clarify Chat Flow
```
┌────────────────────────────────────────────────────────────────────┐
│                     AI Clarify Chat Page (A2UI)                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │   Full-screen Chat Interface                                  │ │
│  │                                                               │ │
│  │  AI: "What type of document do you want to create?"          │ │
│  │                                                               │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │ │
│  │  │ Resume │ │Contract│ │ Report │ │ Letter │  ← 内联按钮    │ │
│  │  └────────┘ └────────┘ └────────┘ └────────┘                │ │
│  │                                                               │ │
│  │  User: *clicks Resume*                                        │ │
│  │                                                               │ │
│  │  AI: "Great! I'll generate a resume for you. What's your    │ │
│  │       name and work experience?"                              │ │
│  │                                                               │ │
│  │  User: "My name is John, I'm a software engineer..."         │ │
│  │                                                               │ │
│  │  AI: *generating resume...* → Navigate to Editor             │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**A2UI 机制：**
- AI 消息可以包含内联按钮（Quick Replies）
- 用户点击按钮后，自动发送对应消息
- 对话流程自然，不中断

#### Editor AI Chat Flow
```
┌────────────────────────────────────────────────────────────────────┐
│                        Editor Page                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────┐    ┌────────────────────────────────┐    │
│  │   AIChatSidebar    │    │   Editor Canvas                │    │
│  │                    │    │                                │    │
│  │  Read:             │    │   ┌──────────────────────┐    │    │
│  │  selectedTemplateId│    │   │  Document Content    │    │    │
│  │                    │    │   │                      │    │    │
│  │  Send message with │    │   │  (实时流式更新)       │    │    │
│  │  templateId        │    │   │                      │    │    │
│  │       │            │    │   └──────────────────────┘    │    │
│  │       ▼            │    │             ▲                 │    │
│  │  /api/ai/chat      │    │             │                 │    │
│  │  (SSE Stream)      │    │   实时渲染 AI 输出            │    │
│  │       │            │    │             │                 │    │
│  │       ▼            │    │             │                 │    │
│  │  AI 流式生成 HTML  │──────────────────┘                 │    │
│  │  每个 chunk 实时   │                                      │    │
│  │  更新编辑器内容    │                                      │    │
│  │                    │                                         │
│  └────────────────────┘                                         │
│                                                                  │
└────────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Dashboard ChatBox Closure
1. 修改 `useAIGeneration` hook 处理 `needsClarification` 响应
2. 修改 `DashboardChatBox` 组件处理跳转逻辑
3. 新增 `generationSessionId` 状态

### Phase 2: AI Clarify Chat Page
1. 创建 `/dashboard/ai-chat/[sessionId]` 路由
2. 创建 `AIClarifyChat` 组件
3. 创建 `DocumentTypeSelector` 组件
4. 新增 `/api/ai/clarify` API

### Phase 3: Editor AIChatSidebar Closure
1. 修改 `useAIChat` hook 支持 `templateId` 参数
2. 修改 `AIChatSidebar` 组件传递 `selectedTemplateId`
3. 修改 `/api/ai/chat` API 支持 `templateId` 参数

### Phase 4: Testing & Polish
1. 端到端测试所有流程
2. 边界情况处理
3. 用户体验优化

## Success Criteria

1. **Dashboard ChatBox**
   - 用户输入提示词 + Generate → 生成文档并跳转 Editor
   - 未选择类型且 AI 无法推断 → 跳转中间对话页面
   - 中间对话完成后 → 跳转 Editor 并显示生成内容

2. **Editor AIChatSidebar**
   - AI 感知当前模板类型（通过 selectedTemplateId）
   - 无模板时，AI 能根据上下文推断文档类型并使用对应模板样式
   - **实时流式渲染**：AI 生成内容实时显示在编辑器中
   - 用户能看到 AI 正在输出的过程，体验流畅

## Decisions

1. **会话数据持久化**：不持久化，使用内存存储。用户刷新中间对话页面会丢失对话。
2. **模板信息传递**：直接传模板 HTML 给 AI，不提取结构特征。
3. **needsClarification 处理**：在 SSE 流中发送 `clarification_needed` 事件。

### SSE 事件格式

```typescript
// 新增事件类型
interface ClarificationEvent {
  type: 'clarification_needed';
  sessionId: string;
  question: string;
}
```

### 客户端处理逻辑

```typescript
switch (event.type) {
  case 'clarification_needed':
    setGenerationSessionId(event.sessionId);
    router.push(`/dashboard/ai-chat/${event.sessionId}`);
    return; // 停止处理流
  case 'status':
    setStatusMessage(event.data);
    break;
  case 'content':
    accumulated += event.data;
    break;
  // ...
}
```
