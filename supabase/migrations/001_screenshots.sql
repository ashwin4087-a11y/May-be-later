-- ============================================================
-- Maybe Later — Screenshot Archive Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create screenshots table
CREATE TABLE public.screenshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT '',
  notes        TEXT,
  image_path   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies — users can only touch their own rows

-- SELECT: user can read their own screenshots
CREATE POLICY "Users can view their own screenshots"
  ON public.screenshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: user can create screenshots owned by themselves
CREATE POLICY "Users can insert their own screenshots"
  ON public.screenshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can update their own screenshots
CREATE POLICY "Users can update their own screenshots"
  ON public.screenshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: user can delete their own screenshots
CREATE POLICY "Users can delete their own screenshots"
  ON public.screenshots
  FOR DELETE
  USING (auth.uid() = user_id);
