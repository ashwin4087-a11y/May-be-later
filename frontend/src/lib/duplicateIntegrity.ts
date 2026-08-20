import { supabase } from './supabase';

/**
 * Removes collection links from duplicate screenshot records.
 * Duplicates must only appear in the Duplicates view — never in collections.
 */
export async function removeDuplicateCollectionLinks(): Promise<number> {
  const { data: duplicates, error } = await supabase
    .from('screenshots')
    .select('id')
    .eq('is_duplicate', true);

  if (error || !duplicates?.length) return 0;

  const ids = duplicates.map((d) => d.id);
  const { error: delErr, count } = await supabase
    .from('screenshot_collections')
    .delete({ count: 'exact' })
    .in('screenshot_id', ids);

  if (delErr) throw new Error(delErr.message);
  return count ?? 0;
}
