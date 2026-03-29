# 智能模版匹配与文档生成系统设计

> 创建日期: 2026-03-29

## 概述

将 AI 文档生成系统改造为智能模版匹配 + 对话式生成架构，实现：
1. 用户输入 → AI 判断意图 → 确定文档类型 → 匹配最佳模版 → 流式生成
2. 意图不明确时，进入多轮对话引导用户
3. 所有生成统一为对话式，流式渲染到编辑器

## 整体架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         用户流程                                         │
├──────────────────────────────────────────────────────────────────────────┤
│   Dashboard                                                              │
│   ├── 已选择类型 ──────────────────┐                                     │
│   │                               ↓                                     │
│   └── 未选择类型 ──→ /dashboard/create ──→ 确认类型 ──┐                   │
│                                                      ↓                  │
│                                              意图判断                    │
│                                                      ↓                  │
│                                              匹配模版                    │
│                                                      ↓                  │
│                                              流式生成 ──→ 编辑器          │
│                                                      ↓                  │
│                                              继续对话修改                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## 数据模型设计

### 1. 新建 `template_categories` 表

```sql
CREATE TABLE public.template_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL UNIQUE,        -- 'resume', 'cover-letter'
  name          TEXT NOT NULL,               -- '简历'
  name_en       TEXT,                        -- 'Resume'
  description   TEXT,                        -- 类型描述（用于 AI 匹配）
  system_prompt TEXT NOT NULL,               -- AI 生成的 system prompt
  icon          TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_template_categories_active
  ON public.template_categories(is_active) WHERE is_active = true;
```

### 2. 关联关系

```
template_categories.category  ←→  templates.category
```

### 3. 数据迁移

将现有 `PROMPT_TEMPLATES`（20 种文档类型）迁移到 `template_categories` 表。

## API 设计

### 1. 改造 `/api/ai/generate`

**Request:**
```json
{
  "prompt": "帮我写一份简历",
  "category": "resume" | null
}
```

**Response (意图明确):**
```json
{
  "type": "ready_to_generate",
  "conversationId": "uuid",
  "category": "resume",
  "templateId": "uuid"
}
```

**Response (意图不明确):**
```json
{
  "type": "clarification_needed",
  "conversationId": "uuid",
  "message": "你想创建什么类型的文档？",
  "quickReplies": ["简历", "求职信", "报告", "商业计划"]
}
```

### 2. 新建 `/api/templates/match`

**Request:**
```json
{
  "category": "resume",
  "userPrompt": "我是前端工程师，5年经验"
}
```

**Response:**
```json
{
  "template": {
    "id": "uuid",
    "name": "简约简历",
    "category": "resume",
    "subcategory": "技术岗",
    "tags": ["简洁", "专业", "技术"],
    "html_url": "https://...",
    "thumbnail_url": "https://..."
  },
  "score": 0.92
}
```

### 3. 改造 `/api/ai/clarify`

多轮对话，直到意图明确后返回 `ready_to_generate`。

### 4. 改造 `/api/ai/chat`

支持 `autoGenerate` 参数，首次生成时注入模版样式到 system prompt。

## 核心流程

### 意图判断逻辑

```typescript
interface IntentClassificationResult {
  readyToGenerate: boolean;
  category?: string;
  confidence: number;
  reason?: 'unclear_intent' | 'insufficient_content' | 'unknown_type';
  suggestedQuestion?: string;
  quickReplies?: string[];
}
```

**判断规则:**

| 场景 | category | prompt 示例 | 结果 |
|------|----------|-------------|------|
| 明确意图 + 有类型 | resume | "写一份前端工程师简历" | ✅ 直接生成 |
| 明确意图 + 无类型 | null | "写一份前端工程师简历" | ✅ AI 推断类型后生成 |
| 模糊意图 + 有类型 | resume | "hello" | ❌ 需要对话引导 |
| 模糊意图 + 无类型 | null | "帮我写个东西" | ❌ 需要对话引导 |

### 完整流程图

```
用户输入 { prompt, category? }
        │
        ▼
┌─────────────────────────────────────┐
│ 1. 意图判断                          │
│    - 是否想生成文档？                │
│    - 内容是否足够？                  │
│    - 类型是否明确？                  │
└─────────────────────────────────────┘
        │
        ├─ 意图明确 ────────────────────────┐
        │                                   ▼
        │                   ┌─────────────────────────────────┐
        │                   │ 2. 确定最终 category             │
        │                   │ 3. 模版匹配                      │
        │                   │ 4. 创建 conversation             │
        │                   └─────────────────────────────────┘
        │                                   │
        │                                   ▼
        │                   ┌─────────────────────────────────┐
        │                   │ 返回 ready_to_generate          │
        │                   │ + conversationId + templateId   │
        │                   └─────────────────────────────────┘
        │                                   │
        │                                   ▼
        │                   ┌─────────────────────────────────┐
        │                   │ 跳转编辑器 + 自动流式生成        │
        │                   └─────────────────────────────────┘
        │
        └─ 意图不明确 ──────────────────────┐
                                            ▼
                            ┌─────────────────────────────────┐
                            │ 创建 conversation                │
                            │ 返回 clarification_needed        │
                            └─────────────────────────────────┘
                                            │
                                            ▼
                            ┌─────────────────────────────────┐
                            │ 跳转 /dashboard/create          │
                            │ 多轮对话引导                    │
                            └─────────────────────────────────┘
                                            │
                                            ▼
                            ┌─────────────────────────────────┐
                            │ 意图明确后                       │
                            │ → 返回 ready_to_generate        │
                            │ → 跳转编辑器 + 自动生成         │
                            └─────────────────────────────────┘
```

## 前端页面

### 1. `/dashboard/create` 页面（新建）

```
┌─────────────────────────────────────────────────┐
│  创建文档                                        │
├─────────────────────────────────────────────────┤
│  用户: 帮我写一份简历      ← 第一条是 dashboard 输入│
│                                                 │
│  AI: 你想创建什么类型的文档？                     │
│      [简历] [求职信] [报告] [商业计划]           │
│                                                 │
│  用户: 简历                                      │
│                                                 │
│  → 确认类型后自动跳转编辑器                       │
└─────────────────────────────────────────────────┘
```

### 2. 编辑器页面改造

| 优化项 | 改动点 |
|--------|--------|
| 对话历史继承 | `useChatStore` 支持初始化已有 conversationId + messages |
| 模版样式注入 | 匹配模版后，将模版 HTML 注入 system prompt |
| 首次生成触发 | 从 create 跳转时携带 `generate=1`，自动触发生成 |
| 生成状态标识 | 完善 `isGenerating` 状态的 UI 展示 |

### 3. 跳转参数设计

```
/dashboard/editor?generate=1&conversationId=xxx&category=resume&templateId=xxx
```

| 参数 | 说明 |
|------|------|
| `generate=1` | 是否自动触发生成 |
| `conversationId` | 从 create 页面带入的对话 ID |
| `category` | 确认的文档类型 |
| `templateId` | 匹配到的模版 ID |

## 模版匹配策略

**匹配依据:** category + subcategory + name + tags（组合判断）

**匹配流程:**
1. 查询 `templates` 表，获取该 category 下所有 `is_active=true` 的模版
2. 构建候选信息：name + subcategory + tags
3. LLM 综合用户 prompt，选择最匹配的模版
4. 返回单个最佳匹配

**tags 来源:** 预先生成，存储在数据库中

## 代码改动清单

### 删除文件

| 文件 | 说明 |
|------|------|
| `src/config/prompt-templates.ts` | 硬编码的 prompt，迁移到数据库后删除 |

### 新建文件

| 文件 | 说明 |
|------|------|
| `supabase/migrations/xxx_template_categories.sql` | 新表 migration |
| `src/app/[locale]/dashboard/create/page.tsx` | 类型确认对话页面 |
| `src/app/api/templates/match/route.ts` | 模版匹配 API |
| `src/types/template.ts` | 模版相关类型定义 |

### 改造文件

| 文件 | 改动说明 |
|------|----------|
| `src/lib/ai/intent-classifier.ts` | 增强意图判断能力 |
| `src/lib/ai/prompt-builder.ts` | 从数据库获取 system_prompt，增加模版样式注入 |
| `src/app/api/ai/generate/route.ts` | 增加意图判断分支 |
| `src/app/api/ai/clarify/route.ts` | 支持多轮对话直到意图明确 |
| `src/app/api/ai/chat/route.ts` | 支持 autoGenerate + 模版样式注入 |
| `src/stores/useChatStore.ts` | 支持初始化已有对话 |
| `src/components/dashboard/AIChatSidebar.tsx` | 支持 autoGenerate + 完善状态 UI |
| `src/components/dashboard/EditorShell.tsx` | 读取 URL 参数，初始化对话历史，自动触发生成 |

## 实现步骤

### Phase 1: 数据库层

1. 创建 `template_categories` 表的 migration
2. 编写数据迁移脚本，将 `PROMPT_TEMPLATES` 迁移到数据库
3. 验证迁移数据完整性

### Phase 2: API 层

1. 改造 `intent-classifier.ts`，增强意图判断能力
2. 新建 `/api/templates/match` 模版匹配 API
3. 改造 `/api/ai/generate`，增加意图判断分支
4. 改造 `/api/ai/clarify`，支持多轮对话流程
5. 改造 `/api/ai/chat`，支持 autoGenerate + 模版样式注入
6. 改造 `prompt-builder.ts`，从数据库获取 system_prompt

### Phase 3: 前端页面

1. 新建 `/dashboard/create` 页面及组件
2. 改造 Dashboard，处理 generate API 返回并跳转
3. 改造 `useChatStore`，支持初始化已有对话
4. 改造 `EditorShell`，读取 URL 参数并自动触发生成
5. 改造 `AIChatSidebar`，支持 autoGenerate + 完善状态 UI

### Phase 4: 收尾

1. 删除 `src/config/prompt-templates.ts`
2. 端到端测试完整流程
3. 修复 bug
