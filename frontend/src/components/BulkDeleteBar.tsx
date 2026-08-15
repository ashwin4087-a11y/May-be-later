import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface BulkDeleteBarProps {
  allScreenshots: { id: string; image_path: string }[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDeleted: (deletedIds: string[]) => void;
  onExitSelect: () => void;
}

interface CollectionOption {
  id: string;
  name: string;
}

export default function BulkDeleteBar({
  allScreenshots,
  selectedIds,
  onSelectionChange,
  onDeleted,
  onExitSelect,
}: BulkDeleteBarProps) {
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [undoData, setUndoData] = useState<{ ids: string[]; paths: string[] } | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = selectedIds.size;
  const allSelected = allScreenshots.length > 0 && selectedIds.size === allScreenshots.length;

  // Fetch collections for the "Select by collection" picker
  useEffect(() => {
    supabase
      .from('collections')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setCollections(data);
      });
  }, []);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allScreenshots.map((s) => s.id)));
    }
  };

  const handleSelectByCollection = async (collectionId: string) => {
    const { data } = await supabase
      .from('screenshot_collections')
      .select('screenshot_id')
      .eq('collection_id', collectionId);

    if (data) {
      const ids = new Set(data.map((r: { screenshot_id: string }) => r.screenshot_id));
      onSelectionChange(ids);
    }
    setShowCollectionPicker(false);
  };

  const handleSelectUnorganized = async () => {
    // Screenshots not in any collection
    const { data: linked } = await supabase
      .from('screenshot_collections')
      .select('screenshot_id');

    const linkedIds = new Set((linked || []).map((r: { screenshot_id: string }) => r.screenshot_id));
    const unorganized = new Set(
      allScreenshots.filter((s) => !linkedIds.has(s.id)).map((s) => s.id)
    );
    onSelectionChange(unorganized);
    setShowCollectionPicker(false);
  };

  const handleDelete = async () => {
    if (count === 0) return;
    setDeleting(true);
    setShowConfirm(false);

    const ids = Array.from(selectedIds);
    const paths = allScreenshots
      .filter((s) => selectedIds.has(s.id))
      .map((s) => s.image_path);

    // Delete from DB (cascade handles screenshot_collections)
    const { error } = await supabase.from('screenshots').delete().in('id', ids);

    if (error) {
      console.error('[BulkDelete] DB error:', error.message);
      setDeleting(false);
      return;
    }

    // Delete storage files
    await supabase.storage.from('screenshots').remove(paths);

    // Notify parent to remove from UI immediately
    onDeleted(ids);
    onSelectionChange(new Set());
    setDeleting(false);

    // Start undo window (5 seconds — undo not truly possible after storage delete,
    // but we keep references so UI shows the toast. A real undo would need soft-delete.)
    setUndoData({ ids, paths });
    setUndoCountdown(5);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setUndoData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <>
      {/* ── Selection toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Select all toggle */}
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-2 text-sm font-medium text-on-surface hover:text-primary transition-colors"
        >
          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            allSelected
              ? 'bg-primary border-primary'
              : count > 0
              ? 'bg-primary/30 border-primary'
              : 'border-outline-variant'
          }`}>
            {(allSelected || count > 0) && (
              <span className="material-symbols-outlined text-[14px] text-white">
                {allSelected ? 'check' : 'remove'}
              </span>
            )}
          </span>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>

        {/* Select by collection */}
        <div className="relative">
          <button
            onClick={() => setShowCollectionPicker((p) => !p)}
            className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[16px]">folder</span>
            By collection
            <span className="material-symbols-outlined text-[14px]">expand_more</span>
          </button>

          {showCollectionPicker && (
            <div className="absolute top-full left-0 mt-1 bg-card-background border border-outline-variant rounded-xl shadow-lg z-50 py-2 min-w-[200px]">
              <button
                onClick={handleSelectUnorganized}
                className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">help</span>
                Unorganized
              </button>
              {collections.length > 0 && (
                <div className="border-t border-subtle my-1" />
              )}
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectByCollection(c.id)}
                  className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">folder</span>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count badge */}
        {count > 0 && (
          <span className="ml-auto text-sm font-semibold text-primary">
            {count} selected
          </span>
        )}

        {/* Exit select */}
        <button
          onClick={onExitSelect}
          className="text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* ── Floating delete bar ───────────────────────────────────────── */}
      {count > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-surface-container border border-outline-variant shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-4">
            <span className="text-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">{count}</span> screenshot{count !== 1 ? 's' : ''} selected
            </span>
            <div className="w-px h-4 bg-outline-variant" />
            <button
              onClick={() => setShowConfirm(true)}
              disabled={deleting}
              className="flex items-center gap-2 bg-error text-on-error px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete {count}
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm dialog ────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-background border border-outline-variant rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error text-[20px]">delete_forever</span>
              </div>
              <div>
                <h2 className="font-semibold text-on-surface text-base">Delete {count} screenshot{count !== 1 ? 's' : ''}?</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">These will be permanently removed from your library.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-error text-on-error hover:opacity-90 transition-opacity"
              >
                Delete {count}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo toast ────────────────────────────────────────────────── */}
      {undoData && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-on-surface text-surface px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 text-sm">
            <span className="material-symbols-outlined text-[18px] text-green-400">check_circle</span>
            <span className="font-medium">{undoData.ids.length} screenshot{undoData.ids.length !== 1 ? 's' : ''} deleted</span>
            <span className="text-surface/50">·</span>
            <span className="text-surface/60 text-xs">{undoCountdown}s</span>
          </div>
        </div>
      )}
    </>
  );
}
