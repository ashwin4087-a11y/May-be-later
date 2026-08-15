import { supabase } from './supabase';

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
 * Deletes a screenshot from storage.
 *
 * @param storagePath - The path to delete (user_id/filename)
 */
export async function deleteScreenshot(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('screenshots')
    .remove([storagePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
