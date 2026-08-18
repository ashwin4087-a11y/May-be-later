import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBatchScreenshotUrls } from '../lib/storage';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import ScreenshotModal from '../components/ScreenshotModal';

export default function NeedsReview() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  const fetchNeedsReview = useCallback(async () => {
    setLoading(true);

    // Get the "Other" collection which is our classification fallback
    const { data: otherCol } = await supabase
      .from('collections')
      .select('id')
      .eq('name', 'Other')
      .limit(1)
      .single();

    if (!otherCol) {
      setScreenshots([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('screenshots')
      .select('id, title, notes, image_path, created_at, screenshot_collections!inner(collection_id)')
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

    const paths = data.map((s: any) => s.image_path).filter(Boolean);
    const urlMap = await getBatchScreenshotUrls(paths);

    setScreenshots(
      data.map((s: any) => ({ ...s, signedUrl: urlMap.get(s.image_path) }))
    );
  }, []);

  useEffect(() => {
    fetchNeedsReview();
  }, [fetchNeedsReview]);

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
            fetchNeedsReview();
          }}
          onDeleted={handleScreenshotDeleted}
          onUpdated={handleScreenshotUpdated}
          screenshots={screenshots}
          onNavigate={setSelectedScreenshot}
        />
      )}

      <div className="flex flex-col gap-2 border-b border-subtle pb-6">
        <h1 className="font-display-lg text-[32px] text-primary tracking-tight">Needs Review</h1>
        <p className="font-body-md text-on-surface-variant leading-relaxed">
          Screenshots the classifier wasn't sure about.
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
        emptyStateTitle="All caught up!"
        emptyStateMessage="No screenshots currently need manual review."
        emptyStateActionText=""
      />
    </main>
  );
}
