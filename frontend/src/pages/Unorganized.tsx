import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBatchScreenshotUrls } from '../lib/storage';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import ScreenshotModal from '../components/ScreenshotModal';

export default function Unorganized() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

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
    <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-8 overflow-y-auto min-h-screen">
      {selectedScreenshot && (
        <ScreenshotModal
          screenshot={selectedScreenshot}
          onClose={() => {
            setSelectedScreenshot(null);
            fetchUnorganized();
          }}
          onDeleted={handleScreenshotDeleted}
          onUpdated={handleScreenshotUpdated}
        />
      )}

      <div className="flex flex-col gap-2 border-b border-subtle pb-6">
        <h1 className="font-display-lg text-[32px] text-primary tracking-tight">Unorganized</h1>
        <p className="font-body-md text-on-surface-variant leading-relaxed">
          Screenshots that don't belong to any collection.
        </p>
        {!loading && (
          <span className="bg-surface-variant text-on-surface-variant px-2.5 py-1 rounded-full font-label-technical text-[11px] w-fit">
            {screenshots.length} item{screenshots.length !== 1 && 's'}
          </span>
        )}
      </div>

      <ScreenshotGrid
        screenshots={screenshots}
        loading={loading}
        onScreenshotClick={setSelectedScreenshot}
        emptyStateTitle="Nothing unorganized!"
        emptyStateMessage="All your screenshots belong to at least one collection."
        emptyStateActionText=""
      />
    </main>
  );
}
