import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Collection } from '../types/collections';
import { getScreenshotUrl } from '../lib/storage';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import ScreenshotModal from '../components/ScreenshotModal';
import CreateCollectionModal from '../components/CreateCollectionModal';

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCollection = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch collection details
      const { data: colData, error: colError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', id)
        .single();

      if (colError) throw new Error(colError.message);
      setCollection(colData);

      // 2. Fetch screenshots through junction table
      const { data: ssData, error: ssError } = await supabase
        .from('screenshots')
        .select('*, screenshot_collections!inner(collection_id, created_at)')
        .eq('screenshot_collections.collection_id', id)
        .order('created_at', { ascending: false });

      if (ssError) throw new Error(ssError.message);

      // 3. Get signed URLs
      const withUrls = await Promise.all(
        ssData.map(async (s: any) => {
          try {
            const signedUrl = await getScreenshotUrl(s.image_path);
            return { ...s, signedUrl };
          } catch {
            return { ...s, signedUrl: undefined };
          }
        })
      );

      setScreenshots(withUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleUpdateCollection = (updated: Collection) => {
    setCollection(updated);
  };

  const handleDeleteCollection = async () => {
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      const { error: delError } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);

      if (delError) throw new Error(delError.message);
      
      navigate('/collections');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

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

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && !collection) {
    return (
      <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-8 overflow-y-auto min-h-screen">
        <div className="h-24 bg-surface-container animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-gutter">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-video bg-surface-container animate-pulse rounded-lg" />
          ))}
        </div>
      </main>
    );
  }

  if (error && !collection) {
    return (
      <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined text-[48px] text-error mb-4">error</span>
        <p className="font-body-md text-on-surface-variant mb-6">{error}</p>
        <button onClick={() => navigate('/collections')} className="text-secondary font-medium">
          ← Back to Collections
        </button>
      </main>
    );
  }

  if (!collection) return null;

  return (
    <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-8 overflow-y-auto min-h-screen">
      
      {/* Modals */}
      {selectedScreenshot && (
        <ScreenshotModal
          screenshot={selectedScreenshot}
          onClose={() => {
            setSelectedScreenshot(null);
            // We fetch the collection again to ensure the grid is in sync if it was removed from the collection
            fetchCollection();
          }}
          onDeleted={handleScreenshotDeleted}
          onUpdated={handleScreenshotUpdated}
        />
      )}

      {showEditModal && (
        <CreateCollectionModal
          existingCollection={collection}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleUpdateCollection}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10"
        >
          <div
            className="absolute inset-0 bg-primary/50 backdrop-blur-[6px]"
            onClick={() => !deleting && setConfirmDelete(false)}
          />

          <div
            className="relative z-10 w-full max-w-md bg-card-background rounded-2xl overflow-hidden animate-[fadeIn_0.15s_ease]"
            style={{ boxShadow: '0 32px 80px rgba(44,57,71,0.28), 0 2px 8px rgba(44,57,71,0.08)' }}
          >
            <div className="px-6 pt-6 pb-4 border-b border-outline-variant/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-error text-[24px]">warning</span>
              <h2 className="font-headline-sm text-[20px] text-primary leading-tight">
                Delete "{collection.name}"?
              </h2>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">
                {screenshots.length > 0 
                  ? `This collection contains ${screenshots.length} screenshot${screenshots.length !== 1 ? 's' : ''}. `
                  : ''}
                <strong className="text-on-surface">Your screenshots will NOT be deleted.</strong> Deleting this collection only removes the collection and its organization links; your screenshots remain safely in All Items.
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-error-container/60 text-on-error-container rounded-lg px-3 py-2 mt-2">
                  <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
                  <p className="font-label-technical text-[12px]">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-5 bg-surface-container-lowest border-t border-outline-variant/30 flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant font-body-md text-[14px] text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCollection}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-error text-on-error font-body-md text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    Delete Collection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-subtle pb-6">
        <div className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => navigate('/collections')}
            className="flex items-center gap-1 text-secondary hover:text-primary transition-colors font-label-technical uppercase tracking-wider mb-2 w-fit"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Collections
          </button>
          
          <h1 className="font-display-lg text-[32px] text-primary tracking-tight break-words">
            {collection.name}
          </h1>
          
          {collection.description && (
            <p className="font-body-md text-on-surface-variant leading-relaxed max-w-2xl">
              {collection.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="bg-surface-variant text-on-surface-variant px-2.5 py-1 rounded-full font-label-technical text-[11px]">
              {screenshots.length} item{screenshots.length !== 1 && 's'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 md:flex-col lg:flex-row shrink-0">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 lg:flex-none py-2 px-4 rounded-lg border border-outline-variant font-body-md text-[14px] text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit
          </button>
          
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex-1 lg:flex-none py-2 px-4 rounded-lg border border-error/30 text-error font-body-md text-[14px] hover:bg-error/5 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete
          </button>
        </div>
      </div>

      {error && !confirmDelete && (
        <div className="flex items-center gap-2 bg-error-container/60 text-on-error-container rounded-lg px-4 py-3">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p className="font-body-md">{error}</p>
        </div>
      )}

      {/* Grid */}
      <ScreenshotGrid
        screenshots={screenshots}
        loading={loading}
        onScreenshotClick={setSelectedScreenshot}
        emptyStateTitle="No screenshots in this collection yet."
        emptyStateMessage="Open any screenshot in your gallery and add it to this collection."
        emptyStateActionText="Go to Gallery →"
        onEmptyStateAction={() => navigate('/dashboard')}
      />

    </main>
  );
}
