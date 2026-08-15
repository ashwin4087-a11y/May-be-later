-- ============================================================
-- Maybe Later — Duplicate Detection Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add image_hash column to screenshots table (SHA-256 of image bytes)
ALTER TABLE public.screenshots ADD COLUMN image_hash TEXT;

-- 2. Add duplicate_of column to track duplicate relationships
-- If NULL, it's an original; if not NULL, it points to the original screenshot's ID
ALTER TABLE public.screenshots ADD COLUMN duplicate_of UUID REFERENCES public.screenshots(id) ON DELETE CASCADE;

-- 3. Create index on image_hash for fast duplicate lookups
CREATE INDEX idx_screenshots_user_hash ON public.screenshots(user_id, image_hash);

-- 4. Create index on duplicate_of for finding all duplicates of a screenshot
CREATE INDEX idx_screenshots_duplicate_of ON public.screenshots(duplicate_of);

-- 5. Add a constraint to ensure only originals can be duplicated of
-- (i.e., if A is a duplicate of B, then B cannot be a duplicate of anything)
-- Note: This is enforced at the application level for simplicity

-- Optional: Add is_duplicate flag for faster filtering (redundant but useful for queries)
ALTER TABLE public.screenshots ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE;
