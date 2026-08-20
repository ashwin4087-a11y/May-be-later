import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBatchScreenshotUrls } from '../lib/storage';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import { useScreenshotModalState } from '../hooks/useScreenshotModalState';
import ScreenshotModal from '../components/ScreenshotModal';
import PageShell from '../components/PageShell';
import PageHeader from '../components/PageHeader';

export default function NeedsReview() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedScreenshot, setSelectedScreenshot } = useScreenshotModalState(screenshots);
  const [otherCollectionId, setOtherCollectionId] = useState<string | null>(null);

  const fetchNeedsReview = useCallback(async () => {
    setLoading(true);

    const { data: otherCol } = await supabase
      .from('collections')
      .select('id')
      .eq('name', 'Other')
      .limit(1)
      .single();

    if (!otherCol) {
      setOtherCollectionId(null);
      setScreenshots([]);
      setLoading(false);
      return;
    }

    setOtherCollectionId(otherCol.id);

    const { data, error } = await supabase
      .from('screenshots')
      .select('id, title, notes, image_path, created_at, is_favorite, screenshot_collections!inner(collection_id)')
      .eq('is_duplicate', false)
      .eq('screenshot_collections.collection_id', otherCol.id)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setScreenshots([]);
      setLoading(false);
      return;
    }

    setScreenshots(data);
    setLoading(false);

    const paths = data.map((s: { image_path: string }) => s.image_path).filter(Boolean);
    const urlMap = await getBatchScreenshotUrls(paths);

    setScreenshots(
      data.map((s) => ({ ...s, signedUrl: urlMap.get(s.image_path) }))
    );
  }, []);

  useEffect(() => {
    fetchNeedsReview();
  }, [fetchNeedsReview]);

  const handleScreenshotDeleted = (deletedId: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== deletedId));
  };

  const handleRemovedFromView = (id: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleScreenshotUpdated = (updated: { id: string; title: string; notes: string | null; is_favorite?: boolean }) => {
    setScreenshots((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
    setSelectedScreenshot((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev
    );
  };

  return (
    <PageShell>
      {selectedScreenshot && (
        <ScreenshotModal
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
          onDeleted={handleScreenshotDeleted}
          onUpdated={handleScreenshotUpdated}
          screenshots={screenshots}
          onNavigate={setSelectedScreenshot}
          onRemovedFromView={handleRemovedFromView}
          reviewCollectionId={otherCollectionId ?? undefined}
        />
      )}

      <PageHeader
        title="Needs Review"
        description="Screenshots classified as “Other” — open one, assign a collection, then use Next to continue reviewing."
        count={!loading ? screenshots.length : undefined}
      />

      <ScreenshotGrid
        screenshots={screenshots}
        loading={loading}
        onScreenshotClick={setSelectedScreenshot}
        emptyStateTitle="All caught up!"
        emptyStateMessage="No screenshots currently need manual review."
        emptyStateActionText=""
      />
    </PageShell>
  );
}
