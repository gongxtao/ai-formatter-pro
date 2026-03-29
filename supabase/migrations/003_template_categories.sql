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
