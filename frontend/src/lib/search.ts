import { supabase } from './supabase';

/** Escape special characters for PostgREST ilike patterns. */
function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export interface SearchFilters {
  query?: string;
  favoritesOnly?: boolean;
  collectionId?: string;
  since?: string; // ISO date string
}

export interface SearchResult {
  id: string;
  title: string;
  notes: string | null;
  image_path: string;
  created_at: string;
  is_favorite?: boolean;
}

/**
 * Search screenshots by title, notes, and optionally collection membership.
 * OCR text is not stored in the database — search uses metadata fields only.
 */
export async function searchScreenshots(filters: SearchFilters): Promise<SearchResult[]> {
  const trimmed = escapeIlike(filters.query?.trim() ?? '');

  // Collection-scoped search uses an inner join
  if (filters.collectionId) {
    let query = supabase
      .from('screenshots')
      .select('id, title, notes, image_path, created_at, is_favorite, screenshot_collections!inner(collection_id)')
      .eq('is_duplicate', false)
      .eq('screenshot_collections.collection_id', filters.collectionId)
      .order('created_at', { ascending: false });

    if (filters.favoritesOnly) query = query.eq('is_favorite', true);
    if (filters.since) query = query.gte('created_at', filters.since);
    if (trimmed) query = query.or(`title.ilike.%${trimmed}%,notes.ilike.%${trimmed}%`);

    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  }

  let query = supabase
    .from('screenshots')
    .select('id, title, notes, image_path, created_at, is_favorite')
    .eq('is_duplicate', false)
    .order('created_at', { ascending: false });

  if (filters.favoritesOnly) query = query.eq('is_favorite', true);
  if (filters.since) query = query.gte('created_at', filters.since);

  if (trimmed) {
    // Match title/notes directly, plus screenshots in collections whose name matches
    const { data: matchingCols } = await supabase
      .from('collections')
      .select('id')
      .ilike('name', `%${trimmed}%`);

    const colIds = (matchingCols ?? []).map((c) => c.id);

    if (colIds.length > 0) {
      const { data: linked } = await supabase
        .from('screenshot_collections')
        .select('screenshot_id')
        .in('collection_id', colIds);

      const linkedIds = (linked ?? []).map((l) => l.screenshot_id);

      if (linkedIds.length > 0) {
        query = query.or(
          `title.ilike.%${trimmed}%,notes.ilike.%${trimmed}%,id.in.(${linkedIds.join(',')})`
        );
      } else {
        query = query.or(`title.ilike.%${trimmed}%,notes.ilike.%${trimmed}%`);
      }
    } else {
      query = query.or(`title.ilike.%${trimmed}%,notes.ilike.%${trimmed}%`);
    }
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}
