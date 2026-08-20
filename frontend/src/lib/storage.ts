import { supabase } from './supabase';

export async function toggleScreenshotFavorite(id: string, isFavorite: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('screenshots')
    .update({ is_favorite: isFavorite })
    .eq('id', id);

  if (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
  return true;
}

/**
 * Computes SHA-256 hash of a File's bytes.
 * Used for reliable duplicate detection (not filename-based).
 */
export async function computeImageHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Checks if an identical image (same SHA-256 hash) already exists for the current user.
 * Returns the screenshot ID of the original if found, null otherwise.
 */
export async function findDuplicate(
  imageHash: string,
  userId: string
): Promise<{ id: string; isDuplicate: boolean } | null> {
  const { data, error } = await supabase
    .from('screenshots')
    .select('id, is_duplicate, duplicate_of')
    .eq('user_id', userId)
    .eq('image_hash', imageHash)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  const match = data[0];
  const originalId = (match.is_duplicate && match.duplicate_of) ? match.duplicate_of : match.id;

  return {
    id: originalId,
    isDuplicate: true
  };
}

/**
 * Uploads a file to the Supabase "screenshots" storage bucket.
 * Files are stored at the path: {user_id}/{filename}
 * This matches the Storage RLS policies which restrict access
 * to files under each user's own UUID-prefixed folder.
 *
 * @param file - The File object to upload
 * @returns The storage path (user_id/filename) on success
 * @throws Error if the user is not authenticated or the upload fails
 */
export async function uploadScreenshot(file: File): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to upload screenshots.');
  }

  // Sanitize the filename: strip unsafe characters, preserve extension
  const sanitized = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();

  // Ensure uniqueness by prefixing with a timestamp
  const uniqueName = `${Date.now()}_${sanitized}`;

  // Final path: {user_id}/{unique_filename}
  // This matches the Storage RLS policy: storage.foldername(name)[1] = auth.uid()
  const storagePath = `${user.id}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from('screenshots')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  return storagePath;
}

/**
 * Returns a public-style signed URL for a stored screenshot.
 * Since the bucket is private, we generate a short-lived signed URL.
 *
 * @param storagePath - The path returned by uploadScreenshot (user_id/filename)
 * @param expiresIn   - Signed URL lifetime in seconds (default: 1 hour)
 */
export async function getScreenshotUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('screenshots')
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Could not generate URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Batch-generates signed URLs for multiple screenshots in a single HTTP request.
 * Dramatically faster than calling getScreenshotUrl() per image when loading a gallery.
 *
 * @param storagePaths - Array of storage paths (user_id/filename)
 * @param expiresIn    - Signed URL lifetime in seconds (default: 1 hour)
 * @returns A Map from storagePath → signedUrl (omits paths that failed)
 */
export async function getBatchScreenshotUrls(
  storagePaths: string[],
  expiresIn = 3600
): Promise<Map<string, string>> {
  if (storagePaths.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from('screenshots')
    .createSignedUrls(storagePaths, expiresIn);

  const result = new Map<string, string>();
  if (error || !data) return result;

  for (const item of data) {
    if (item.signedUrl && item.path) {
      result.set(item.path, item.signedUrl);
    }
  }
  return result;
}

/**
 * Deletes a file from the screenshots storage bucket.
 * No-op when path is empty (e.g. duplicate records without stored files).
 */
export async function deleteScreenshot(storagePath: string): Promise<void> {
  if (!storagePath) return;

  const { error } = await supabase.storage
    .from('screenshots')
    .remove([storagePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Deletes a screenshot record then removes its storage file.
 * DB is deleted first so a failed storage cleanup does not leave a ghost record.
 */
export async function deleteScreenshotFully(id: string, imagePath: string): Promise<void> {
  const { error } = await supabase.from('screenshots').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (imagePath) {
    try {
      await deleteScreenshot(imagePath);
    } catch (err) {
      console.error('[deleteScreenshotFully] Storage cleanup failed:', err);
    }
  }
}

/**
 * Deletes multiple screenshots: DB first, then storage (best-effort).
 */
export async function deleteScreenshotsFully(
  items: Array<{ id: string; image_path: string }>
): Promise<void> {
  const ids = items.map((i) => i.id);
  const { error } = await supabase.from('screenshots').delete().in('id', ids);
  if (error) throw new Error(error.message);

  const paths = items.map((i) => i.image_path).filter(Boolean);
  if (paths.length > 0) {
    try {
      await supabase.storage.from('screenshots').remove(paths);
    } catch (err) {
      console.error('[deleteScreenshotsFully] Storage cleanup failed:', err);
    }
  }
}
