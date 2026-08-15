-- ============================================================
-- Maybe Later — Storage Bucket Policies for "screenshots"
-- Run this AFTER creating the bucket manually in the dashboard.
-- Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Storage path convention: {user_id}/{filename}
-- This ensures every user's files are namespaced under their own UUID folder.

-- SELECT (download): users can only read files in their own folder
CREATE POLICY "Users can read their own screenshots"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- INSERT (upload): users can only upload into their own folder
CREATE POLICY "Users can upload their own screenshots"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: users can update metadata for their own files
CREATE POLICY "Users can update their own screenshots"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: users can delete their own files
CREATE POLICY "Users can delete their own screenshots"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
