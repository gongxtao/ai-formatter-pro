# 架构重构方案 — 三大核心业务流

> 审查日期: 2026-03-30
> 范围: Dashboard → Editor 的三条导航路径
> 状态: 方案待实施

---

## 目录

1. [现状分析](#1-现状分析)
2. [问题清单（按严重程度）](#2-问题清单)
3. [重构方案](#3-重构方案)
4. [实施计划](#4-实施计划)
5. [风险评估](#5-风险评估)

---

## 1. 现状分析

### 1.1 三条业务流

#### Flow 1: Dashboard → Generate → Editor（意图明确）

```
用户输入 → DashboardChatBox.handleGenerate()
  → useAIGeneration.generate()
    → POST /api/ai/generate { category, prompt }
      → classifyIntent()
      → [ready] createConversation() + matchTemplate()
        → SSE: ready_to_generate { conversationId, category, templateId }
      → [not ready] SSE: clarification_needed → 进入 Flow 2
    → Client: setGenerateParams({ shouldAutoGenerate: true })
    → router.push('/dashboard/editor')
      → EditorShell → AIChatSidebar → useEditorInit
        → onAutoGenerate(lastUserMessage)
          → useAIChat.sendMessage(msg, { autoGenerate: true })
            → POST /api/ai/chat { autoGenerate: true }
              → SSE stream HTML chunks
                → onChunk → setCurrentEditorHtml()
```

#### Flow 2: Dashboard → Generate → Create → Editor（意图不明）

```
(Flow 1 的 clarification_needed 分支)
  → router.push('/dashboard/create?conversationId=...&message=...')
    → CreateConversationView
      → 初始化/加载对话
      → POST /api/ai/clarify (每轮重新 classifyIntent)
        → [ready] SSE: ready_to_generate
          → setGenerateParams() → router.push('/dashboard/editor')
            → (同 Flow 1 后半段)
        → [not ready] 流式返回澄清回复 → 用户继续对话
```

#### Flow 3: Dashboard → Use Template → Editor

```
TemplateCardGrid / EditorTemplatesGrid
  → MemoizedTemplateCard 包裹 TemplateCard，外层 div 添加 onClick
    → handleCardClick(templateId)
      → setSelectedTemplateId(templateId)
      → setEditorView('editor')
      → router.push('/dashboard/editor')  [TemplateCardGrid 场景]
        → EditorShell 监听 selectedTemplateId
          → fetch /api/templates?id=xxx
          → setCurrentEditorHtml(html)
```

> **注意**: `TemplateCard` 本身是纯展示组件，不含 onClick。点击逻辑由父组件
> `TemplateCardGrid`（dashboard 页面）和 `EditorTemplatesGrid`（editor 页面）通过
> `MemoizedTemplateCard` 包裹层添加。这是正确的容器/展示组件分离模式。

### 1.2 关键文件映射

| 文件 | 职责 |
|------|------|
| `useDashboardStore.ts` | 全局状态（UI + 生成 + 内容混合） |
| `DashboardChatBox.tsx` | 首页输入框 + Generate 按钮 |
| `useAIGeneration.ts` | SSE 客户端：调用 /api/ai/generate |
| `generate/route.ts` | 意图分类 + 创建对话（不做实际生成） |
| `clarify/route.ts` | 多轮澄清 + 意图再分类 |
| `CreateConversationView.tsx` | 澄清对话页面（内嵌 SSE 解析） |
| `EditorShell.tsx` | 编辑器外壳（布局 + 内容生命周期） |
| `AIChatSidebar.tsx` | 编辑器侧边栏 AI 聊天 |
| `useEditorInit.ts` | 编辑器初始化 + 触发自动生成 |
| `useAIChat.ts` | SSE 客户端：调用 /api/ai/chat（实际生成） |
| `intent-classifier.ts` | LLM 意图分类 |
| `conversation-helper.ts` | Supabase 对话工具函数 |

### 1.3 状态传递机制

当前存在三种独立的内容传递路径：

| 机制 | 来源 | 目标 | 状态 |
|------|------|------|------|
| `pendingEditorContent` | useAIGeneration (旧直接生成) | EditorShell | **死代码** — 新流程不再产生 HTML |
| `generateParams` | useAIGeneration / CreateConversationView | useEditorInit → useAIChat | 活跃 |
| `selectedTemplateId` | TemplateCardGrid / EditorTemplatesGrid | EditorShell 直接 fetch | 活跃 |

---

## 2. 问题清单

### P0 — 功能性缺陷

#### P0-1: React Strict Mode 下 useEditorInit 双重触发

**位置**: `src/hooks/useEditorInit.ts`

**问题**: `useEffect` 在 dev 模式下执行 unmount → remount cycle。`initCompleteRef` 和 `autoGenerateTriggeredRef` 是组件实例级别的 refs，remount 后重置为 `false`，导致 `tryAutoGenerate()` 被调用两次。

**触发路径**:
```
mount → useEffect → loadConversation → tryAutoGenerate → sendMessage()  ← 第一次
unmount (strict mode)
mount → useEffect → initCompleteRef.current === false → loadConversation → tryAutoGenerate → sendMessage()  ← 第二次
```

**影响**: 同一个生成请求被发送两次，浪费 API 调用，可能产生重复的 assistant 消息。

---

#### P0-2: EditorShell 初始化加载 localStorage 内容会闪烁

**位置**: `src/components/dashboard/EditorShell.tsx:69-77`

**问题**: 当从 dashboard 导航到 editor 时，`currentEditorHtml` 为空字符串 `''`。`!''` 为 `true`，所以会加载 localStorage 中的旧内容。随后 autoGenerate 的 HTML 通过 `onChunk` 实时覆盖。

**当前代码**:
```ts
useEffect(() => {
  const store = useDashboardStore.getState();
  if (!store.currentEditorHtml) {  // '' 是 falsy，会进入
    const saved = loadFromLocalStorage();
    if (saved) store.setCurrentEditorHtml(saved);  // 加载旧内容
  }
}, []);
```

**影响**: 用户看到旧内容闪一下，然后被新生成的内容替换。

---

### P1 — 架构性问题

#### P1-1: SSE 解析逻辑重复（~150 行）

**位置**:
- `src/hooks/useAIGeneration.ts:66-132`
- `src/components/dashboard/CreateConversationView.tsx:142-256`

**问题**: 两处有近乎相同的 SSE 解析逻辑：
- buffer 分割 + `data:` 前缀处理
- JSON 解析 + event.type switch
- 错误处理和 abort 处理

差异点:
| 特性 | useAIGeneration | CreateConversationView |
|------|----------------|----------------------|
| 处理 `completion` 事件 | ✅ | ❌ |
| 处理 `clarification_needed` | ✅ | ❌ |
| 处理 `continue` 事件 | ❌ | ✅ |
| 处理 `ready_to_generate` | ✅ (设置 generateParams) | ✅ (设置 generateParams) |
| 错误恢复 | 仅 console.error | 添加 error 消息到 chat |

---

#### P1-2: `/api/ai/generate` 名不副实

**位置**: `src/app/api/ai/generate/route.ts`

**问题**: 这个 route 的名字是 "generate"，但它不做任何文档生成。它只做：
1. `classifyIntent()` — LLM 意图分类
2. `createConversation()` — Supabase 写入
3. `matchTemplate()` — 模板匹配
4. 返回 `ready_to_generate` 或 `clarification_needed`

实际的文档生成发生在 `/api/ai/chat` + `autoGenerate: true`。

**影响**:
- 新开发者阅读代码时产生误解
- 每次从 dashboard 点击 generate 都要两次网络往返（先 /generate 再 /chat）
- 如果 intent 一次就 clear，中间的分类步骤完全可以通过更简单的方式处理

---

#### P1-3: `pendingEditorContent` 是死代码

**位置**:
- `src/hooks/useAIGeneration.ts:135` — 设置
- `src/components/dashboard/EditorShell.tsx:145-152` — 消费

**问题**: 新的 `/api/ai/generate` 不再返回 `content` 事件，只返回 `ready_to_generate` 或 `clarification_needed`。所以 `pendingEditorContent` 的赋值路径永远不会被执行。

```ts
// useAIGeneration.ts:134-136 — 死路径
// 只有在没有任何 ready_to_generate/clarification_needed 事件时才执行
setPendingEditorContent(accumulated);  // accumulated 永远是 ''
router.push('/dashboard/editor');
```

---

#### P1-4: CreateConversationView 重复实现 SSE 客户端

**位置**: `src/components/dashboard/CreateConversationView.tsx:127-270`

**问题**: 不使用 `useAIChat` hook，而是内嵌了完整的 SSE 解析。导致：
- 与 `useAIChat` 的行为可能不一致
- 无法复用 `useAIChat` 中的 abort 管理、错误恢复逻辑
- 未来修改 SSE 处理时需要改两处

---

### P2 — 设计改进

#### P2-1: useDashboardStore 是 God Store

**位置**: `src/stores/useDashboardStore.ts`

**问题**: 20+ 个字段混合了三种关注点：

| 关注点 | 字段 |
|--------|------|
| UI Routing | `activeNav`, `editorView`, `showDocTypesOverlay`, `activeDocType` |
| Generation Lifecycle | `isGenerating`, `isAutoGenerating`, `isTemplateLoading`, `generateParams`, `generationSessionId` |
| Content | `currentEditorHtml`, `pendingEditorContent` |
| 其他 UI | `sidebarSearchQuery`, `templateSearchQuery`, `shuffleTrigger`, `activeFilterTag`, `selectedTemplateId` |

---

#### P2-2: 隐式状态机

**位置**: 涉及多个组件和 hooks

**问题**: 生成流程由多个布尔标志组合驱动，没有显式的状态机定义：

```
isGenerating × isAutoGenerating × shouldAutoGenerate × pendingEditorContent
```

合法的状态组合有多少种？没有文档说明。可能的不一致状态：
- `isAutoGenerating=true` 但 `isGenerating=false`
- `shouldAutoGenerate=true` 但 `conversationId=null`
- `pendingEditorContent` 有值但 `isGenerating=false`

---

#### P2-3: useEditorInit 依赖数组过于复杂

**位置**: `src/hooks/useEditorInit.ts:113`

```ts
}, [effectiveConvId, effectiveCategory, effectiveTemplateId, effectiveShouldAutoGen,
    chatConversationId, messages.length, generateParams.conversationId]);
```

7 个依赖项，其中 `generateParams.conversationId` 在 effect 内部被 `clearGenerateParams()` 清除（变为 null），可能触发 effect 重新执行。

---

## 3. 重构方案

### Phase 1: P0 修复（功能修复）

#### 3.1.1 修复 useEditorInit Strict Mode 双重触发

**修改文件**: `src/hooks/useEditorInit.ts`

**方案**: 使用模块级别的 `Set` 追踪已处理的 conversationId，而非依赖组件实例的 ref。

```ts
// useEditorInit.ts — 关键改动

// 模块级别：跨组件实例持久化
const processedConversations = new Set<string>();

export function useEditorInit(options: EditorInitOptions) {
  const onAutoGenerateRef = useRef(options.onAutoGenerate);
  useEffect(() => { onAutoGenerateRef.current = options.onAutoGenerate; });

  const generateParams = useDashboardStore((s) => s.generateParams);
  const effectiveConvId = generateParams.conversationId;
  const effectiveShouldAutoGen = generateParams.shouldAutoGenerate;

  useEffect(() => {
    if (!effectiveConvId) return;

    // 防止重复处理（strict mode safe）
    if (processedConversations.has(effectiveConvId)) return;

    const dashStore = useDashboardStore.getState();

    const tryAutoGenerate = () => {
      if (!effectiveShouldAutoGen) return;
      processedConversations.add(effectiveConvId);
      dashStore.clearGenerateParams();

      const lastUserMsg = [...useChatStore.getState().messages]
        .reverse()
        .find((m) => m.role === 'user')?.content;
      if (lastUserMsg && onAutoGenerateRef.current) {
        dashStore.setIsAutoGenerating(true);
        onAutoGenerateRef.current(lastUserMsg);
      }
    };

    // 检查消息是否已加载
    const chatState = useChatStore.getState();
    if (chatState.conversationId === effectiveConvId && chatState.messages.length > 0) {
      // 消息已在 store 中
      if (generateParams.category) {
        dashStore.setActiveDocType(generateParams.category);
        dashStore.setActiveTemplateCategory(generateParams.category);
      }
      tryAutoGenerate();
      return;
    }

    // 从 API 加载
    (async () => {
      try {
        const res = await fetch(`/api/ai/chat/conversations/${effectiveConvId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            useChatStore.getState().initConversation(effectiveConvId, data.messages);
          } else {
            useChatStore.getState().setConversationId(effectiveConvId);
          }
        }
      } catch (e) {
        console.error('Failed to load conversation:', e);
        useChatStore.getState().setConversationId(effectiveConvId);
      }

      if (generateParams.category) {
        dashStore.setActiveDocType(generateParams.category);
        dashStore.setActiveTemplateCategory(generateParams.category);
      }

      tryAutoGenerate();
    })();
  }, [effectiveConvId, effectiveShouldAutoGen, generateParams.category]);

  return {
    effectiveCategory: generateParams.category,
    effectiveTemplateId: generateParams.templateId,
  };
}
```

**关键改动**:
1. `processedConversations` 是模块级别的 `Set`，不受组件 remount 影响
2. 简化依赖数组，移除 `messages.length` 和 `generateParams.conversationId` 的循环依赖
3. 在 `tryAutoGenerate` 中立即标记 conversationId 为已处理 + 清除 generateParams

---

#### 3.1.3 修复 EditorShell localStorage 闪烁

**修改文件**: `src/components/dashboard/EditorShell.tsx`

**方案**: 在初始化时检查 `generateParams.shouldAutoGenerate`，如果是自动生成流程则跳过 localStorage 加载。

```ts
// EditorShell.tsx — 修改初始化逻辑
useEffect(() => {
  const store = useDashboardStore.getState();
  // 如果是自动生成流程，不加载 localStorage（避免闪烁）
  if (store.generateParams.shouldAutoGenerate) return;
  if (!store.currentEditorHtml) {
    const saved = loadFromLocalStorage();
    if (saved) store.setCurrentEditorHtml(saved);
  }
}, []);
```

---

### Phase 2: P1 重构（架构改善）

#### 3.2.1 提取通用 SSE Hook — `useSSEStream`

**新建文件**: `src/hooks/useSSEStream.ts`

**方案**: 将 SSE 解析逻辑提取为可复用的 hook，两处调用方各自注册事件处理器。

```ts
// src/hooks/useSSEStream.ts
import { useRef, useCallback, useEffect } from 'react';

export interface SSEEvent {
  type: string;
  data?: string;
  [key: string]: unknown;
}

export interface SSEStreamHandlers {
  onEvent: (event: SSEEvent) => boolean; // return true to abort reading
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export function useSSEStream() {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(
    async (url: string, body: unknown, handlers: SSEStreamHandlers) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (controller.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            try {
              const event: SSEEvent = JSON.parse(trimmed.slice(6));
              if (handlers.onEvent(event)) return; // early exit
            } catch {
              // skip incomplete JSON
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim().startsWith('data: ')) {
          try {
            const event: SSEEvent = JSON.parse(buffer.trim().slice(6));
            handlers.onEvent(event);
          } catch { /* skip */ }
        }

        handlers.onComplete?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
      } finally {
        abortRef.current = null;
      }
    },
    []
  );

  return { start, abort };
}
```

**改造 useAIGeneration**:
```ts
// useAIGeneration.ts — 使用 useSSEStream
export function useAIGeneration() {
  const router = useRouter();
  const { start, abort } = useSSEStream();
  // ... store selectors ...

  const generate = useCallback(async (params: GenerateParams) => {
    setIsGenerating(true);
    let accumulated = '';

    await start('/api/ai/generate', params, {
      onEvent: (event) => {
        switch (event.type) {
          case 'content':
            if (event.data) accumulated += event.data;
            break;
          case 'ready_to_generate':
            setGenerateParams({ ... });
            router.push('/dashboard/editor');
            return true; // early exit
          case 'clarification_needed':
            router.push(`/dashboard/create?...`);
            return true;
          case 'error':
            throw new Error(event.data || 'Unknown error');
        }
        return false;
      },
      onError: (err) => console.error('[useAIGeneration]', err),
      onComplete: () => {
        // Fallback: 如果没有 ready_to_generate，直接用 accumulated
        if (accumulated) {
          setPendingEditorContent(accumulated);
          router.push('/dashboard/editor');
        }
      },
    });
    setIsGenerating(false);
  }, [...]);

  return { generate, cancel: abort, isGenerating };
}
```

**改造 CreateConversationView**: 同样使用 `useSSEStream` + 自定义 handlers。

---

#### 3.2.2 重命名 `/api/ai/generate` → `/api/ai/init`

**涉及文件**:
- 重命名 `src/app/api/ai/generate/route.ts` → `src/app/api/ai/init/route.ts`
- 修改 `useAIGeneration.ts` 中的 fetch URL
- 修改 `DashboardChatBox.tsx` 中的注释（如有）

**理由**: `/api/ai/generate` 这个名字暗示它会生成文档内容，但它实际上只做意图分类和对话创建。改名为 `/api/ai/init` 更准确地反映了它的职责：**初始化一个文档创建流程**。

---

#### 3.2.3 清理 `pendingEditorContent` 死代码

**涉及文件**:
- `src/stores/useDashboardStore.ts` — 移除 `pendingEditorContent` 和 `setPendingEditorContent`
- `src/hooks/useAIGeneration.ts` — 移除 L135 的 `setPendingEditorContent` 调用
- `src/components/dashboard/EditorShell.tsx` — 移除 L145-152 的 `useEffect`
- `src/hooks/useAIChat.ts` — 移除 `insertIntoEditor` 方法

**前提**: 确认当前 `/api/ai/generate`（或重命名后的 `/api/ai/init`）确实不会返回 HTML `content` 事件。

---

#### 3.2.4 统一 CreateConversationView 的 SSE 处理

**修改文件**: `src/components/dashboard/CreateConversationView.tsx`

**方案**: 将内嵌的 SSE 解析替换为 `useSSEStream` hook + 事件处理器。

```ts
// CreateConversationView.tsx — 改造后
const { start, abort } = useSSEStream();

const handleSend = useCallback(async (messageText?: string) => {
  const text = (messageText || input).trim();
  if (!text || isLoading || !conversationId) return;

  setInput('');
  setIsLoading(true);
  setStreamingContent('');

  // Add user message
  chatStore.addMessage({ id: crypto.randomUUID(), role: 'user', content: text });

  let accumulatedContent = '';

  await start('/api/ai/clarify', { conversationId, message: text }, {
    onEvent: (event) => {
      if (event.type === 'content') {
        accumulatedContent += event.data;
        setStreamingContent(accumulatedContent);
      }
      if (event.type === 'ready_to_generate') {
        setStreamingContent('');
        chatStore.addMessage({ id: crypto.randomUUID(), role: 'assistant', content: accumulatedContent || event.data || t('generatingDocument') });
        dashStore.setGenerateParams({ conversationId, category: event.category, templateId: event.templateId, shouldAutoGenerate: true });
        setIsLoading(false);
        router.push('/dashboard/editor');
        return true; // early exit
      }
      if (event.type === 'continue') {
        if (accumulatedContent) {
          chatStore.addMessage({ id: crypto.randomUUID(), role: 'assistant', content: accumulatedContent });
          setStreamingContent('');
          accumulatedContent = '';
        }
      }
      if (event.type === 'error') {
        setStreamingContent('');
        chatStore.addMessage({ id: crypto.randomUUID(), role: 'assistant', content: event.data || t('errorOccurred') });
      }
      return false;
    },
    onError: (err) => {
      setStreamingContent('');
      chatStore.addMessage({ id: crypto.randomUUID(), role: 'assistant', content: t('errorOccurred') });
    },
    onComplete: () => {
      if (accumulatedContent) {
        setStreamingContent('');
        chatStore.addMessage({ id: crypto.randomUUID(), role: 'assistant', content: accumulatedContent });
      }
    },
  });
  setIsLoading(false);
}, [input, isLoading, conversationId, router, t]);
```

---

### Phase 3: P2 改善（可选）

#### 3.3.1 拆分 useDashboardStore

**方案**: 将 store 拆分为三个：

```
useDashboardStore (保留)
  ├── activeNav, editorView, showDocTypesOverlay
  ├── activeDocType, activeTemplateCategory
  ├── sidebarSearchQuery, templateSearchQuery
  ├── shuffleTrigger, activeFilterTag, selectedTemplateId

useGenerationStore (新建)
  ├── isGenerating, isAutoGenerating, isTemplateLoading
  ├── generateParams, generationSessionId
  ├── pendingEditorContent (如果保留)

useEditorStore (新建)
  ├── currentEditorHtml, setCurrentEditorHtml
```

**影响范围**: 所有导入 `useDashboardStore` 的组件需要更新 selector。约 15-20 个文件。

**建议**: 作为独立的 PR，不与其他重构混合。

---

#### 3.3.2 显式状态机

**方案**: 使用有限状态机建模生成流程。

```ts
// src/lib/generation-state.ts
type GenerationState =
  | { phase: 'idle' }
  | { phase: 'classifying'; abortController: AbortController }
  | { phase: 'clarifying'; conversationId: string }
  | { phase: 'generating'; conversationId: string; category: string }
  | { phase: 'done' }
  | { phase: 'error'; error: string };

// 状态转换函数
function transition(state: GenerationState, event: GenerationEvent): GenerationState {
  switch (state.phase) {
    case 'idle':
      if (event.type === 'START_CLASSIFY') return { phase: 'classifying', abortController: event.abortController };
      break;
    case 'classifying':
      if (event.type === 'NEEDS_CLARIFICATION') return { phase: 'clarifying', conversationId: event.conversationId };
      if (event.type === 'READY_TO_GENERATE') return { phase: 'generating', conversationId: event.conversationId, category: event.category };
      if (event.type === 'ERROR') return { phase: 'error', error: event.error };
      break;
    // ... 其他转换
  }
  return state; // 非法转换，忽略
}
```

**建议**: 作为长期改进，不阻塞当前重构。

---

## 4. 实施计划

### Phase 1: P0 修复（1-2 天）

| 步骤 | 任务 | 文件 | 验证 |
|------|------|------|------|
| 1.1 | useEditorInit 防双重触发 | `useEditorInit.ts` | dev 模式下不产生双重 API 调用 |
| 1.2 | EditorShell localStorage 闪烁修复 | `EditorShell.tsx` | 从 dashboard generate 后导航到 editor 不闪烁 |

**验收标准**:
- [ ] Flow 3: 点击模板 → editor 加载模板 HTML
- [ ] Flow 1: dashboard generate → editor 自动生成，不闪烁
- [ ] Flow 2: dashboard generate → create → 对话后 → editor 自动生成
- [ ] dev 模式 (strict mode) 下所有流程不产生双重请求

---

### Phase 2: P1 重构（2-3 天）

| 步骤 | 任务 | 文件 | 验证 |
|------|------|------|------|
| 2.1 | 创建 `useSSEStream` hook | `src/hooks/useSSEStream.ts` | 单元测试通过 |
| 2.2 | 改造 `useAIGeneration` 使用 `useSSEStream` | `useAIGeneration.ts` | Flow 1/2 不变 |
| 2.3 | 改造 `CreateConversationView` 使用 `useSSEStream` | `CreateConversationView.tsx` | Flow 2 不变 |
| 2.4 | 重命名 `/api/ai/generate` → `/api/ai/init` | route 文件 + 引用 | Flow 1/2 不变 |
| 2.5 | 清理 `pendingEditorContent` 死代码 | store + hooks + EditorShell | 编译通过，流程不变 |

**验收标准**:
- [ ] SSE 解析代码只存在一处（`useSSEStream`）
- [ ] 无 `pendingEditorContent` 相关代码
- [ ] API route 名字与实际行为一致
- [ ] 所有三个 Flow 功能正常

---

### Phase 3: P2 改善（可选，3-5 天）

| 步骤 | 任务 | 文件 | 验证 |
|------|------|------|------|
| 3.1 | 拆分 `useDashboardStore` | store 文件 + 15-20 组件 | 编译通过，功能不变 |
| 3.2 | 简化 `useEditorInit` 依赖数组 | `useEditorInit.ts` | Flow 1/2 不变 |
| 3.3 | 添加生成状态机（可选） | 新文件 | — |

---

## 5. 风险评估

### Phase 1 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `processedConversations` Set 内存泄漏 | 低 | 低 | 设置 TTL 或在 conversation 完成后清理 |

### Phase 2 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| SSE 事件处理差异导致回归 | 中 | 高 | 逐个迁移，每个步骤手动测试三个 Flow |
| `pendingEditorContent` 有其他使用方 | 低 | 高 | 全局搜索确认无其他引用后再删除 |

### Phase 3 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Store 拆分引入 import 错误 | 中 | 中 | TypeScript 编译检查 + 逐文件迁移 |
| 组件间依赖关系复杂 | 中 | 中 | 先画依赖图，确定迁移顺序 |

---

## 附录: 依赖关系图

```
DashboardChatBox
  └── useAIGeneration ──────────→ /api/ai/generate (→ /api/ai/init)
       ├── useDashboardStore (isGenerating, generateParams)
       └── router.push

CreateConversationView
  ├── useChatStore (messages, conversationId)
  ├── useDashboardStore (generateParams)
  ├── useTemplatesStore (categories)
  └── [内嵌 SSE] ──────────────→ /api/ai/clarify

EditorShell
  ├── useDashboardStore (几乎所有字段)
  ├── useHistoryStore (saveDocument)
  ├── useTemplates
  └── AIChatSidebar
        ├── useEditorInit ←────── useDashboardStore (generateParams)
        │     └── useChatStore (conversationId, messages)
        ├── useAIChat ──────────→ /api/ai/chat
        │     ├── useChatStore (messages, streamingContent)
        │     └── useDashboardStore (pendingEditorContent, isGenerating)
        └── useChatStore (messages, streamingContent)

TemplateCard (纯展示)
  └── TemplateCardGrid / EditorTemplatesGrid (添加 onClick) ← 容器/展示分离 ✅
```

---

## 变更日志

| 日期 | 版本 | 描述 |
|------|------|------|
| 2026-03-30 | v1.0 | 初始架构审查 + 重构方案 |
