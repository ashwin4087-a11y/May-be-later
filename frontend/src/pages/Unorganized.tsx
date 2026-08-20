import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBatchScreenshotUrls } from '../lib/storage';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import { useScreenshotModalState } from '../hooks/useScreenshotModalState';
import ScreenshotModal from '../components/ScreenshotModal';
import PageShell from '../components/PageShell';
import PageHeader from '../components/PageHeader';

export default function Unorganized() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedScreenshot, setSelectedScreenshot } = useScreenshotModalState(screenshots);

  const fetchUnorganized = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('screenshots')
      .select('id, title, notes, image_path, created_at, screenshot_collections(collection_id)')
      .eq('is_duplicate', false)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Filter where screenshot_collections array is empty (no collection assigned)
    const unorganized = data.filter((s: any) => !s.screenshot_collections || s.screenshot_collections.length === 0);

    setScreenshots(unorganized);
    setLoading(false);

    const paths = unorganized.map((s: any) => s.image_path).filter(Boolean);
    const urlMap = await getBatchScreenshotUrls(paths);

    setScreenshots(
      unorganized.map((s: any) => ({ ...s, signedUrl: urlMap.get(s.image_path) }))
    );
  }, []);

  useEffect(() => {
    fetchUnorganized();
  }, [fetchUnorganized]);

  const handleScreenshotDeleted = (deletedId: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== deletedId));
  };

  const handleScreenshotUpdated = (updated: { id: string; title: string; notes: string | null }) => {
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
          onRemovedFromView={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))}
          removeWhenOrganized
        />
      )}

      <PageHeader
        title="Unorganized"
        description="Screenshots that don't belong to any collection."
        count={!loading ? screenshots.length : undefined}
      />

      <ScreenshotGrid
        screenshots={screenshots}
        loading={loading}
        onScreenshotClick={setSelectedScreenshot}
        emptyStateTitle="Nothing unorganized!"
        emptyStateMessage="All your screenshots belong to at least one collection."
        emptyStateActionText=""
      />
    </PageShell>
  );
}
