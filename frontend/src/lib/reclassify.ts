import { supabase } from './supabase';
import { classifyScreenshot, categoriesForLinking, type Category, AUTO_CLASSIFICATION_NAMES } from './classifier';
import { getScreenshotUrl } from './storage';
import { removeDuplicateCollectionLinks } from './duplicateIntegrity';

export interface ReclassifyPreviewItem {
  id: string;
  title: string;
  oldCategories: string[];
  newCategory: Category;
  confidence: number;
  reason: string;
  changed: boolean;
}

export interface ReclassifyPreview {
  totalScreenshots: number;
  needsReclassification: number;
  items: ReclassifyPreviewItem[];
}

const AUTO_NAMES = new Set<string>(AUTO_CLASSIFICATION_NAMES as readonly string[]);

async function getAutoCollectionLinks(screenshotId: string): Promise<Array<{ collection_id: string; name: string }>> {
  const { data } = await supabase
    .from('screenshot_collections')
    .select('collection_id, collections!inner(name)')
    .eq('screenshot_id', screenshotId);

  return (data ?? []).map((row) => {
    const col = row.collections as { name: string } | { name: string }[];
    const name = Array.isArray(col) ? col[0]?.name : col?.name;
    return { collection_id: row.collection_id as string, name };
  }).filter((l) => l.name && AUTO_NAMES.has(l.name));
}

/**
 * Dry-run: preview reclassification without applying changes.
 */
export async function previewReclassification(limit = 50): Promise<ReclassifyPreview> {
  const { data: screenshots, error } = await supabase
    .from('screenshots')
    .select('id, title, image_path, is_duplicate')
    .eq('is_duplicate', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !screenshots) throw new Error(error?.message ?? 'Failed to fetch screenshots');

  const items: ReclassifyPreviewItem[] = [];

  for (const s of screenshots) {
    try {
      const url = await getScreenshotUrl(s.image_path);
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `${s.title}.png`, { type: blob.type });

      const result = await classifyScreenshot(file);
      const newCategory = result.primary;
      const links = await getAutoCollectionLinks(s.id);
      const oldCategories = links.map((l) => l.name);
      const changed = oldCategories.length !== 1 || oldCategories[0] !== newCategory;

      items.push({
        id: s.id,
        title: s.title,
        oldCategories,
        newCategory,
        confidence: result.confidence,
        reason: result.reason,
        changed,
      });
    } catch (err) {
      console.error(`[Reclassify] Preview failed for ${s.id}:`, err);
    }
  }

  const needsReclassification = items.filter((i) => i.changed).length;

  return {
    totalScreenshots: screenshots.length,
    needsReclassification,
    items,
  };
}

/**
 * Apply reclassification to non-duplicate screenshots.
 * Removes only links to auto-classification collections (predefined category names).
 */
export async function applyReclassification(
  screenshotIds?: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ processed: number; updated: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('screenshots')
    .select('id, title, image_path')
    .eq('is_duplicate', false);

  if (screenshotIds?.length) {
    query = query.in('id', screenshotIds);
  }

  const { data: screenshots, error } = await query;
  if (error || !screenshots) throw new Error(error?.message ?? 'Failed to fetch');

  let processed = 0;
  let updated = 0;

  for (const s of screenshots) {
    processed++;
    onProgress?.(processed, screenshots.length);

    try {
      const url = await getScreenshotUrl(s.image_path);
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `${s.title}.png`, { type: blob.type });
      const result = await classifyScreenshot(file);
      const categories = categoriesForLinking(result);

      const autoLinks = await getAutoCollectionLinks(s.id);
      for (const link of autoLinks) {
        await supabase
          .from('screenshot_collections')
          .delete()
          .match({ screenshot_id: s.id, collection_id: link.collection_id });
      }

      for (const category of categories) {
        const { data: existingCols } = await supabase
          .from('collections')
          .select('id')
          .eq('name', category)
          .limit(1);

        let collectionId = existingCols?.[0]?.id;
        if (!collectionId) {
          const { data: newCol, error: createErr } = await supabase
            .from('collections')
            .insert({ user_id: user.id, name: category })
            .select('id')
            .single();
          if (createErr) throw createErr;
          collectionId = newCol.id;
        }

        await supabase
          .from('screenshot_collections')
          .insert({ screenshot_id: s.id, collection_id: collectionId });
      }
      updated++;
    } catch (err) {
      console.error(`[Reclassify] Failed for ${s.id}:`, err);
    }
  }

  return { processed, updated };
}

/** Clean duplicate collection links — safe one-time integrity repair */
export async function repairDuplicateDataIntegrity(): Promise<{ linksRemoved: number }> {
  const linksRemoved = await removeDuplicateCollectionLinks();
  return { linksRemoved };
}
