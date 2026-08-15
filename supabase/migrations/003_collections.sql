-- ============================================================
-- Maybe Later — Collections Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create collections table
CREATE TABLE public.collections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create junction table (screenshot_collections)
CREATE TABLE public.screenshot_collections (
  screenshot_id UUID NOT NULL REFERENCES public.screenshots(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (screenshot_id, collection_id)
);

-- 3. Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshot_collections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for collections
CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- 5. RLS Policies for screenshot_collections
-- For the junction table, we check ownership through the related collections/screenshots.
-- Since the user_id exists on both ends, we can verify via the collection's user_id.

CREATE POLICY "Users can view their own screenshot_collections"
  ON public.screenshot_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own screenshot_collections"
  ON public.screenshot_collections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.screenshots s
      WHERE s.id = screenshot_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own screenshot_collections"
  ON public.screenshot_collections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );
