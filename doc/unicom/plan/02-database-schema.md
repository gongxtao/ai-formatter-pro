# 02 - 数据库 Schema

## 设计原则

1. **MVP 不做认证**：`user_id` 为匿名 UUID（localStorage 生成），后续加认证时加 FK 即可
2. **扁平化 category**：不建独立类型表，`category` 为 TEXT 字段，任意值：`resume`、`cover-letter`、`social-image`、`youtube-thumbnail` 等
3. **编辑中存 localStorage**：不存数据库，只存用户手动保存的记录
4. **SEO 用 JSON 配置**：不建 SEO 表，用 `messages/en.json` / `messages/zh.json` 配置
5. **极简 4 张表**：templates + user_history + ai_conversations + ai_messages

## ER 关系图

```
templates (模板库，公开只读)
  └── 通过 template_id 关联 user_history

user_history (用户手动保存的历史)
  ├── conversation_id → ai_conversations (二次编辑时恢复对话上下文)
  ├── content_url → R2 存储 (HTML 内容)
  └── overlay_url → R2 存储 (floating_images JSON)

ai_conversations (AI 对话)
  └── 1:N ── ai_messages
```

## 完整 SQL DDL

```sql
-- ========================================
-- 1. templates 模板库（公开只读）
-- ========================================
-- category 字段为扁平 TEXT，不建独立类型表
-- 可为任意值：resume, cover-letter, social-image, youtube-thumbnail, presentation 等
CREATE TABLE public.templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category          TEXT NOT NULL DEFAULT 'resume', -- 扁平分类，灵活扩展
  subcategory       TEXT,                            -- 可选子分类
  name              TEXT NOT NULL,                   -- 模板名称
  description       TEXT,                            -- 模板描述
  slug              TEXT NOT NULL,                   -- URL 标识: 'modern-resume'
  thumbnail_url     TEXT NOT NULL,                   -- 缩略图 R2 URL
  raw_thumbnail_url TEXT,                            -- 原始缩略图
  html_url          TEXT NOT NULL,                   -- 模板 HTML 文件 R2 URL
  tags              TEXT[] DEFAULT '{}',             -- 标签数组
  popularity        INTEGER NOT NULL DEFAULT 0,      -- 热度
  is_premium        BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,      -- 同 category 内排序
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, slug)                               -- 同 category 下 slug 唯一
);

CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_subcategory ON public.templates(subcategory);
CREATE INDEX idx_templates_popularity ON public.templates(popularity DESC);
CREATE INDEX idx_templates_active ON public.templates(is_active) WHERE is_active = true;
CREATE INDEX idx_templates_tags ON public.templates USING GIN(tags);
CREATE INDEX idx_templates_category_sort ON public.templates(category, sort_order);

-- ========================================
-- 2. user_history 用户手动保存的历史记录
-- ========================================
-- 编辑中的内容存 localStorage，此表只存用户主动保存的记录
-- 关联 conversation_id：二次编辑时恢复 AI 对话上下文
-- 内容存 R2：html_content 存为 content_url，floating_images 序列化存为 overlay_url
CREATE TABLE public.user_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,                       -- MVP: 匿名 UUID; 后续: FK → auth.users
  category        TEXT NOT NULL DEFAULT 'resume',
  template_id     UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL, -- 关联 AI 对话
  title           TEXT NOT NULL,                       -- 用户自定义标题
  content_url     TEXT NOT NULL,                       -- R2 URL: 保存时的 HTML 文件
  overlay_url     TEXT,                                -- R2 URL: floating_images 序列化 JSON 文件
  thumbnail_url   TEXT,                                -- 缩略图
  file_url        TEXT,                                -- 导出文件 URL (PDF/Word)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_history_user ON public.user_history(user_id);
CREATE INDEX idx_user_history_category ON public.user_history(category);
CREATE INDEX idx_user_history_template ON public.user_history(template_id);
CREATE INDEX idx_user_history_conversation ON public.user_history(conversation_id);
CREATE INDEX idx_user_history_updated ON public.user_history(user_id, updated_at DESC);

-- ========================================
-- 3. ai_conversations AI 对话
-- ========================================
CREATE TABLE public.ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,                       -- MVP: 匿名 UUID
  category        TEXT,                                -- 关联的内容分类
  title           TEXT NOT NULL DEFAULT 'New Chat',
  model           TEXT NOT NULL DEFAULT 'gpt-4o',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);

-- ========================================
-- 4. ai_messages AI 消息
-- ========================================
CREATE TABLE public.ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content         TEXT NOT NULL DEFAULT '',
  content_type    TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'json')),
  token_count     INTEGER,
  model           TEXT,
  duration_ms     INTEGER,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created ON public.ai_messages(conversation_id, created_at);

-- ========================================
-- 公共触发器
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_templates_updated
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER on_user_history_updated
  BEFORE UPDATE ON public.user_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER on_ai_conversations_updated
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

## 数据流

### 保存流程
1. 用户在编辑器中编辑内容（存 localStorage，实时防抖）
2. 用户点击保存 → HTML + floating_images 上传到 R2
3. 创建/更新 `user_history` 记录（content_url + overlay_url + conversation_id）

### 二次编辑流程
1. 用户从历史记录点击"编辑"
2. 从 R2 加载 HTML（content_url）+ floating_images（overlay_url）
3. 从 DB 加载 AI 对话（conversation_id → ai_messages）回显

## JSONB 结构定义

```typescript
// ai_messages.metadata
interface AIMessageMetadata {
  category?: string
  template_id?: string
  generation_id?: string
  stream_duration_ms?: number
}
```

## 后续加 Auth 时的迁移路径

```sql
-- 添加 FK 约束
ALTER TABLE public.user_history
  ADD CONSTRAINT fk_user_history_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ai_conversations
  ADD CONSTRAINT fk_ai_conversations_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 启用 RLS
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_select" ON public.user_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "history_insert" ON public.user_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "history_update" ON public.user_history
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "history_delete" ON public.user_history
  FOR DELETE USING (auth.uid() = user_id);
-- ai_conversations 类似
```
