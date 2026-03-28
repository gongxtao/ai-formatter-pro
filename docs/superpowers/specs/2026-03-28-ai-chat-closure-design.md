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
  selectedCategory?: string;  // 用户从列表选择的类型
}
```

**响应：**
```typescript
interface ClarifyResponse {
  type: 'continue' | 'complete';
  question?: string;        // 如果需要继续对话
  recommendedCategories?: string[];  // AI 推荐的类型
  html?: string;            // 如果对话完成
}
```

#### `/api/ai/chat` 修改

**请求新增参数：**
```typescript
interface ChatRequest {
  // ...existing
  templateId?: string;  // 新增：模板 ID
}
```

**逻辑修改：**
1. 如果 `templateId` 有值 → 从 API 获取模板结构 → 加入 system prompt
2. 如果 `templateId` 为空 → 使用现有逻辑

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
    <div className="flex h-screen">
      {/* 对话区域 */}
      <AIClarifyChat sessionId={sessionId} />

      {/* 文档类型选择列表 */}
      <DocumentTypeSelector />
    </div>
  );
}
```

**AIClarifyChat 组件功能：**
1. 显示对话历史
2. 发送消息到 `/api/ai/clarify`
3. 显示 AI 推荐的文档类型
4. 对话完成后跳转 Editor

**DocumentTypeSelector 组件功能：**
1. 显示所有文档类型
2. 用户点击选择
3. 发送选择到 `/api/ai/clarify`

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
│                     AI Clarify Chat Page                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────┐    ┌────────────────────────────────┐  │
│  │   Chat Interface     │    │   Document Type Selector       │  │
│  │                      │    │                                │  │
│  │  AI: "What type of   │    │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  document do you     │    │  │Resume│ │Contract│ │Report│  │  │
│  │  want to create?"    │    │  └──────┘ └──────┘ └──────┘  │  │
│  │                      │    │                                │  │
│  │  User: "A resume"    │    └────────────────────────────────┘  │
│  │                      │                                        │
│  │  AI: "Great! I'll    │                                        │
│  │  generate a resume   │    ┌────────────────────────────────┐  │
│  │  for you..."         │    │   Complete → Navigate to       │  │
│  │                      │    │   Editor with generated HTML   │  │
│  └──────────────────────┘    └────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

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
