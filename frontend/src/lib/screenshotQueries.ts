/**
 * Shared screenshot query helpers — every "normal library" query must exclude duplicates.
 */

import { supabase } from './supabase';

/** PostgREST filter: only originals / non-duplicate screenshots */
export const NON_DUPLICATE_FILTER = { is_duplicate: false } as const;

export const SCREENSHOT_LIST_COLUMNS =
  'id, title, notes, image_path, created_at, is_favorite';

/**
 * Count screenshots in each collection, excluding duplicate records.
 */
export async function fetchCollectionScreenshotCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('screenshot_collections')
    .select('collection_id, screenshots!inner(is_duplicate)')
    .eq('screenshots.is_duplicate', false);

  const counts = new Map<string, number>();
  if (error || !data) return counts;

  for (const row of data) {
    const cid = row.collection_id as string;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return counts;
}
