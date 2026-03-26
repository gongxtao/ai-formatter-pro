-- ========================================
-- AI Formatter V2 - Initial Schema
-- MVP: No Auth, flat category, 4 tables
-- ========================================

-- ========================================
-- 1. templates (public read-only)
-- ========================================
-- category is flat TEXT, supports: resume, cover-letter, social-image, youtube-thumbnail, etc.
CREATE TABLE public.templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category          TEXT NOT NULL DEFAULT 'resume',
  subcategory       TEXT,
  name              TEXT NOT NULL,
  description       TEXT,
  slug              TEXT NOT NULL,
  thumbnail_url     TEXT NOT NULL,
  raw_thumbnail_url TEXT,
  html_url          TEXT NOT NULL,
  tags              TEXT[] DEFAULT '{}',
  popularity        INTEGER NOT NULL DEFAULT 0,
  is_premium        BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, slug)
);

CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_subcategory ON public.templates(subcategory);
CREATE INDEX idx_templates_popularity ON public.templates(popularity DESC);
CREATE INDEX idx_templates_active ON public.templates(is_active) WHERE is_active = true;
CREATE INDEX idx_templates_tags ON public.templates USING GIN(tags);
CREATE INDEX idx_templates_category_sort ON public.templates(category, sort_order);

-- ========================================
-- 2. user_history (manual saves only)
-- ========================================
-- Editing content stored in localStorage, this table only stores user-initiated saves
-- conversation_id links to AI conversation for re-edit context restoration
CREATE TABLE public.user_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  category        TEXT NOT NULL DEFAULT 'resume',
  template_id     UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  content_url     TEXT NOT NULL,
  overlay_url     TEXT,
  thumbnail_url   TEXT,
  file_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_history_user ON public.user_history(user_id);
CREATE INDEX idx_user_history_category ON public.user_history(category);
CREATE INDEX idx_user_history_template ON public.user_history(template_id);
CREATE INDEX idx_user_history_conversation ON public.user_history(conversation_id);
CREATE INDEX idx_user_history_updated ON public.user_history(user_id, updated_at DESC);

-- ========================================
-- 3. ai_conversations
-- ========================================
CREATE TABLE public.ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  category        TEXT,
  title           TEXT NOT NULL DEFAULT 'New Chat',
  model           TEXT NOT NULL DEFAULT 'gpt-4o',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);

-- ========================================
-- 4. ai_messages
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
-- Triggers
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
