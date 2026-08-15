import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { deleteScreenshot } from '../lib/storage';
import { Collection } from '../types/collections';
import CreateCollectionModal from './CreateCollectionModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Screenshot {
  id: string;
  title: string;
  notes: string | null;
  image_path: string;
  created_at: string;
  signedUrl?: string;
}

interface Props {
  screenshot: Screenshot;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (updated: Pick<Screenshot, 'id' | 'title' | 'notes'>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScreenshotModal({ screenshot, onClose, onDeleted, onUpdated }: Props) {
  // Edit state
  const [editing, setEditing]     = useState(false);
  const [editTitle, setEditTitle] = useState(screenshot.title);
  const [editNotes, setEditNotes] = useState(screenshot.notes ?? '');
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [togglingCollectionId, setTogglingCollectionId] = useState<string | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  // Sync fields if parent screenshot prop changes (e.g. after save propagates back)
  useEffect(() => {
    setEditTitle(screenshot.title);
    setEditNotes(screenshot.notes ?? '');
  }, [screenshot.id, screenshot.title, screenshot.notes]);

  // Auto-focus title input when edit mode opens
  useEffect(() => {
    if (editing) titleInputRef.current?.focus();
  }, [editing]);

  // Fetch collections
  const fetchCollectionsData = useCallback(async () => {
    setLoadingCollections(true);
    setCollectionError(null);
    try {
      // 1. Fetch all user collections
      const { data: cols, error: colsError } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (colsError) throw new Error(colsError.message);

      // 2. Fetch screenshot's current collections
      const { data: ssCols, error: ssColsError } = await supabase
        .from('screenshot_collections')
        .select('collection_id')
        .eq('screenshot_id', screenshot.id);

      if (ssColsError) throw new Error(ssColsError.message);

      setCollections(cols);
      setSelectedCollections(new Set(ssCols.map((sc: any) => sc.collection_id)));
    } catch (err) {
      setCollectionError(err instanceof Error ? err.message : 'Failed to load collections.');
    } finally {
      setLoadingCollections(false);
    }
  }, [screenshot.id]);

  useEffect(() => {
    fetchCollectionsData();
  }, [fetchCollectionsData]);

  const handleToggleCollection = async (collectionId: string) => {
    setTogglingCollectionId(collectionId);
    setCollectionError(null);
    const isSelected = selectedCollections.has(collectionId);

    try {
      if (isSelected) {
        const { error } = await supabase
          .from('screenshot_collections')
          .delete()
          .match({ screenshot_id: screenshot.id, collection_id: collectionId });
        
        if (error) throw new Error(error.message);
        
        setSelectedCollections(prev => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('screenshot_collections')
          .insert({ screenshot_id: screenshot.id, collection_id: collectionId });
        
        if (error) throw new Error(error.message);
        
        setSelectedCollections(prev => {
          const next = new Set(prev);
          next.add(collectionId);
          return next;
        });
      }
    } catch (err) {
      setCollectionError(err instanceof Error ? err.message : 'Failed to update collection.');
    } finally {
      setTogglingCollectionId(null);
    }
  };

  const handleCollectionCreated = (newCol: Collection) => {
    setCollections(prev => [newCol, ...prev]);
    handleToggleCollection(newCol.id); // Auto-add to newly created collection
  };

  // Escape: cancel edit or close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editing) cancelEdit();
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Edit ──────────────────────────────────────────────────────────────────

  const cancelEdit = () => {
    setEditTitle(screenshot.title);
    setEditNotes(screenshot.notes ?? '');
    setSaveError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    const trimTitle = editTitle.trim();
    if (!trimTitle) { setSaveError('Title is required.'); return; }

    setSaving(true);
    setSaveError(null);

    const { error } = await supabase
      .from('screenshots')
      .update({ title: trimTitle, notes: editNotes.trim() || null })
      .eq('id', screenshot.id);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    onUpdated({ id: screenshot.id, title: trimTitle, notes: editNotes.trim() || null });
    setSaving(false);
    setEditing(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteScreenshot(screenshot.image_path);

      const { error } = await supabase
        .from('screenshots')
        .delete()
        .eq('id', screenshot.id);

      if (error) throw new Error(error.message);

      onDeleted(screenshot.id);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const { date, time } = formatDate(screenshot.created_at);
  const filename = screenshot.image_path.split('/').pop() ?? screenshot.image_path;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary/50 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Modal shell */}
      <div
        className="relative z-10 flex flex-col md:flex-row w-full max-w-[1080px] max-h-[90dvh] bg-card-background rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(44,57,71,0.28), 0 2px 8px rgba(44,57,71,0.08)' }}
      >

        {/* ══ LEFT — Image ═══════════════════════════════════════════════════ */}
        <div className="relative flex-1 bg-[#1a2229] flex items-center justify-center overflow-hidden min-h-[220px] md:min-h-0">
          {screenshot.signedUrl ? (
            <img
              src={screenshot.signedUrl}
              alt={screenshot.title || 'Screenshot'}
              className="w-full h-full object-contain select-none"
              style={{ maxHeight: '90dvh' }}
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/30 py-20">
              <span className="material-symbols-outlined text-[56px]">hide_image</span>
              <p className="font-label-technical text-sm tracking-wider uppercase">Preview unavailable</p>
            </div>
          )}

          {/* Subtle top-left filename chip */}
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 max-w-[calc(100%-2rem)]">
            <span className="material-symbols-outlined text-white/60 text-[14px]">image</span>
            <span
              className="font-label-technical text-white/70 truncate"
              style={{ fontSize: '11px', letterSpacing: '0.02em' }}
            >
              {filename}
            </span>
          </div>
        </div>

        {/* ══ RIGHT — Sidebar ════════════════════════════════════════════════ */}
        <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-outline-variant/40 overflow-hidden">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="px-7 pt-7 pb-5 border-b border-outline-variant/30">
            <div className="flex items-start gap-3">
              {editing ? (
                <input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  className="flex-1 font-display-md text-[22px] leading-snug text-primary bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
                  placeholder="Screenshot title"
                />
              ) : (
                <h2 className="flex-1 font-display-md text-[22px] leading-snug text-primary break-words">
                  {screenshot.title || <span className="text-on-surface-variant italic font-normal">Untitled</span>}
                </h2>
              )}
              <button
                onClick={editing ? cancelEdit : onClose}
                title={editing ? 'Cancel' : 'Close'}
                className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* ── Metadata / Edit fields ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-6">

            {/* Added date */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.1em]">Added</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-label-technical text-[13px] text-primary">{date}</span>
                <span className="font-label-technical text-[12px] text-on-surface-variant">{time}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-outline-variant/30" />

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.1em]">Notes</span>
                {!editing && (
                  <button
                    onClick={() => { setEditing(true); setConfirmDelete(false); setDeleteError(null); }}
                    className="font-label-technical text-[11px] text-secondary hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={6}
                  placeholder="Add notes about this screenshot…"
                  className="w-full font-body-md text-[14px] text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all placeholder:text-on-surface-variant/40 leading-relaxed"
                />
              ) : screenshot.notes ? (
                <p className="font-body-md text-[14px] text-on-surface leading-relaxed whitespace-pre-wrap">
                  {screenshot.notes}
                </p>
              ) : (
                <p className="font-body-md text-[14px] text-on-surface-variant italic">
                  No notes yet.
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-outline-variant/30" />

            {/* Collections Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.1em]">Collections</span>
                <button
                  onClick={() => setShowCreateCollection(true)}
                  className="font-label-technical text-[11px] text-secondary hover:text-primary transition-colors flex items-center gap-0.5 uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  New
                </button>
              </div>
              
              {loadingCollections ? (
                <div className="flex flex-col gap-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-8 bg-surface-container-lowest animate-pulse rounded border border-outline-variant/30" />
                  ))}
                </div>
              ) : collections.length === 0 ? (
                <p className="font-body-md text-[13px] text-on-surface-variant italic">No collections yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {collections.map(col => {
                    const isSelected = selectedCollections.has(col.id);
                    const isToggling = togglingCollectionId === col.id;
                    return (
                      <button
                        key={col.id}
                        onClick={() => !isToggling && handleToggleCollection(col.id)}
                        disabled={isToggling}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded border transition-colors text-left
                          ${isSelected 
                            ? 'bg-secondary/5 border-secondary/30 text-primary' 
                            : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant hover:border-outline-variant'}
                          ${isToggling ? 'opacity-50 cursor-wait' : ''}
                        `}
                      >
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors
                          ${isSelected ? 'bg-secondary border-secondary text-on-secondary' : 'border-outline-variant/60 bg-card-background'}`}
                        >
                          {isSelected && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                        </div>
                        <span className="font-body-md text-[13px] truncate flex-1">{col.name}</span>
                        {isToggling && (
                          <span className="material-symbols-outlined text-[14px] animate-spin text-secondary shrink-0">progress_activity</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {collectionError && (
                <p className="font-label-technical text-[11px] text-error mt-1">{collectionError}</p>
              )}
            </div>

          </div>

          {/* ── Footer — Actions ─────────────────────────────────────────── */}
          <div className="px-7 py-5 border-t border-outline-variant/30 flex flex-col gap-3">

            {/* Save error */}
            {saveError && (
              <div className="flex items-center gap-2 bg-error-container/60 text-on-error-container rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
                <p className="font-label-technical text-[12px]">{saveError}</p>
              </div>
            )}

            {/* Edit mode buttons */}
            {editing ? (
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant font-body-md text-[14px] text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-body-md text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                      Saving
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">check</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {/* Delete section */}
            {!editing && (
              <>
                {deleteError && (
                  <div className="flex items-center gap-2 bg-error-container/60 text-on-error-container rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
                    <p className="font-label-technical text-[12px]">{deleteError}</p>
                  </div>
                )}

                {confirmDelete ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="font-label-technical text-[12px] text-on-surface-variant text-center leading-relaxed">
                      This permanently removes the file and cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2 rounded-lg border border-outline-variant font-body-md text-[14px] text-on-surface-variant hover:bg-surface-container transition-colors"
                      >
                        Keep it
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-lg bg-error text-on-error font-body-md text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="w-full py-2.5 rounded-lg border border-error/30 text-error font-body-md text-[14px] hover:bg-error/5 transition-colors flex items-center justify-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-[17px] group-hover:scale-110 transition-transform">delete_outline</span>
                    Delete Screenshot
                  </button>
                )}
              </>
            )}

          </div>
        </div>
      </div>
      {showCreateCollection && (
        <CreateCollectionModal
          onClose={() => setShowCreateCollection(false)}
          onCreated={handleCollectionCreated}
        />
      )}
    </div>
  );
}
