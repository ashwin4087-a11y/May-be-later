import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBatchScreenshotUrls, toggleScreenshotFavorite } from '../lib/storage';
import { downloadScreenshotsAsZip } from '../lib/download';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import { useScreenshotModalState } from '../hooks/useScreenshotModalState';
import ScreenshotModal from '../components/ScreenshotModal';
import PageShell from '../components/PageShell';
import PageHeader from '../components/PageHeader';

export default function AllItems() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedScreenshot, setSelectedScreenshot } = useScreenshotModalState(screenshots);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('screenshots')
      .select('id, title, notes, image_path, created_at, is_favorite')
      .eq('is_duplicate', false)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    setScreenshots(data);
    setLoading(false);

    // Batch-fetch signed URLs
    const paths = data.map((s: any) => s.image_path).filter(Boolean);
    const urlMap = await getBatchScreenshotUrls(paths);

    setScreenshots(
      data.map((s: any) => ({ ...s, signedUrl: urlMap.get(s.image_path) }))
    );
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  const handleToggleFavorite = async (id: string, nextState: boolean) => {
    // Optimistic UI update
    setScreenshots((prev) => prev.map(s => s.id === id ? { ...s, is_favorite: nextState } : s));
    
    const success = await toggleScreenshotFavorite(id, nextState);
    if (!success) {
      // Revert UI on failure
      setScreenshots((prev) => prev.map(s => s.id === id ? { ...s, is_favorite: !nextState } : s));
    }
  };

  const handleDownloadOriginals = async () => {
    if (screenshots.length === 0) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);
    try {
      await downloadScreenshotsAsZip(screenshots, 'Maybe-Later-Originals.zip', setDownloadProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download originals.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
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
        />
      )}

      <PageHeader
        title="All Items"
        description="Every non-duplicate screenshot in your library."
        count={!loading ? screenshots.length : undefined}
        action={
          <button
            onClick={handleDownloadOriginals}
            disabled={isDownloading || screenshots.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-label-technical tracking-wider text-[12px] uppercase transition-colors flex-shrink-0 shadow-subtle
              ${isDownloading
                ? 'bg-secondary/20 text-secondary cursor-wait'
                : 'bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
          >
            {isDownloading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Downloading {Math.round(downloadProgress)}%
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Originals
              </>
            )}
          </button>
        }
        footer={
          error ? (
            <div className="p-3 bg-error-container/50 text-error rounded-lg flex items-center gap-2 text-sm font-medium">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          ) : undefined
        }
      />

      <ScreenshotGrid
        screenshots={screenshots}
        loading={loading}
        onScreenshotClick={setSelectedScreenshot}
        onToggleFavorite={handleToggleFavorite}
        emptyStateTitle="No screenshots yet."
        emptyStateMessage="Import your first screenshot from the Gallery."
      />
    </PageShell>
  );
}
