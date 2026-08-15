import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getScreenshotUrl } from '../lib/storage';
import { Screenshot } from '../components/ScreenshotGrid';

export interface DuplicateGroup {
  originalId: string;
  original: Screenshot;
  duplicates: Screenshot[];
  totalCount: number;
  duplicateCount: number;
}

export default function Duplicates() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group Detail Modal/Sheet state
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);

  // Delete Confirmation Modal state
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<DuplicateGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Fetch all duplicate screenshots for this user
      const { data: dupsData, error: dupsError } = await supabase
        .from('screenshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_duplicate', true)
        .order('created_at', { ascending: false });

      if (dupsError) throw new Error(dupsError.message);

      if (!dupsData || dupsData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // 2. Collect distinct original IDs (duplicate_of)
      const originalIds = Array.from(
        new Set(dupsData.map((d: any) => d.duplicate_of).filter(Boolean))
      ) as string[];

      if (originalIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // 3. Fetch original screenshots
      const { data: originalsData, error: originalsError } = await supabase
        .from('screenshots')
        .select('*')
        .in('id', originalIds);

      if (originalsError) throw new Error(originalsError.message);

      // 4. Get signed URLs for all original screenshots
      const originalsMap: Record<string, Screenshot> = {};
      await Promise.all(
        (originalsData || []).map(async (orig: any) => {
          let signedUrl: string | undefined;
          try {
            if (orig.image_path) {
              signedUrl = await getScreenshotUrl(orig.image_path);
            }
          } catch (e) {
            console.error(`Failed to get signed URL for screenshot ${orig.id}`, e);
          }
          originalsMap[orig.id] = { ...orig, signedUrl };
        })
      );

      // 5. Build group objects
      const groupMap: Record<string, Screenshot[]> = {};
      dupsData.forEach((dup: any) => {
        const origId = dup.duplicate_of;
        if (origId) {
          if (!groupMap[origId]) groupMap[origId] = [];
          // Copy signedUrl from original for display
          groupMap[origId].push({
            ...dup,
            signedUrl: originalsMap[origId]?.signedUrl,
          });
        }
      });

      const builtGroups: DuplicateGroup[] = [];
      Object.keys(groupMap).forEach((origId) => {
        const original = originalsMap[origId];
        if (original) {
          const duplicates = groupMap[origId];
          builtGroups.push({
            originalId: origId,
            original,
            duplicates,
            totalCount: 1 + duplicates.length,
            duplicateCount: duplicates.length,
          });
        }
      });

      // Sort groups by original screenshot date (newest first)
      builtGroups.sort(
        (a, b) =>
          new Date(b.original.created_at).getTime() -
          new Date(a.original.created_at).getTime()
      );

      setGroups(builtGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load duplicates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDeleteDuplicates = async (group: DuplicateGroup) => {
    setDeleting(true);
    setError(null);
    try {
      const dupIds = group.duplicates.map((d) => d.id);
      const { error: delErr } = await supabase
        .from('screenshots')
        .delete()
        .in('id', dupIds);

      if (delErr) throw new Error(delErr.message);

      // Successfully deleted duplicates
      setConfirmDeleteGroup(null);
      setSelectedGroup(null);
      await fetchDuplicates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete duplicates.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-8 overflow-y-auto min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-end border-b border-subtle pb-6">
        <div>
          <h1 className="font-display-lg text-[32px] text-primary tracking-tight">Duplicates</h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Identical screenshots detected during upload.
          </p>
        </div>
        {groups.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full font-label-technical text-xs border border-subtle">
              {groups.length} Group{groups.length !== 1 ? 's' : ''} Found
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-error-container/60 text-on-error-container rounded-lg px-4 py-3">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p className="font-body-md">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-surface-container animate-pulse rounded-xl border border-subtle" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        /* Empty State */
        <div className="bg-card-background rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[380px] border border-subtle shadow-subtle relative overflow-hidden group">
          <div className="w-28 h-28 mb-6 relative flex items-center justify-center">
            <div className="absolute w-16 h-16 border border-tertiary/40 rounded-lg transform -translate-x-3 -translate-y-2 opacity-60 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500" />
            <div className="absolute w-16 h-16 border border-tertiary/40 rounded-lg transform translate-x-3 translate-y-2 opacity-60 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500" />
            <span className="material-symbols-outlined text-4xl text-tertiary z-10">
              check_circle
            </span>
          </div>
          <h3 className="font-headline-sm text-[22px] text-primary mb-2">No duplicates found</h3>
          <p className="font-body-md text-on-surface-variant max-w-[260px]">
            New uploads will be checked automatically.
          </p>
          <div className="w-12 h-1 bg-tertiary/40 mt-8 rounded-full" />
        </div>
      ) : (
        /* Groups Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {groups.map((group, idx) => (
            <article
              key={group.originalId}
              className="bg-card-background rounded-xl p-6 border border-subtle shadow-subtle hover:border-secondary transition-all duration-300 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-subtle pb-3">
                <h2 className="font-label-caps text-xs text-primary font-semibold tracking-wider uppercase">
                  Duplicate Group #{idx + 1}
                </h2>
                <span className="font-label-technical text-xs bg-tertiary/20 text-tertiary-container dark:text-tertiary-fixed rounded px-2.5 py-1 font-medium">
                  {group.totalCount} identical screenshots
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Thumbnail Preview */}
                <div className="w-32 h-32 rounded-lg border border-subtle overflow-hidden bg-surface-container flex-shrink-0 relative group/thumb">
                  {group.original.signedUrl ? (
                    <img
                      src={group.original.signedUrl}
                      alt={group.original.title}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl">image</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <h3 className="font-headline-sm text-[16px] text-primary truncate">
                    {group.original.title}
                  </h3>
                  <p className="font-label-technical text-xs text-on-surface-variant">
                    Original added: {formatDate(group.original.created_at)}
                  </p>
                  <p className="font-label-technical text-xs text-secondary font-medium">
                    Original + {group.duplicateCount} duplicate copy{group.duplicateCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-subtle mt-auto">
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-body-md text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  View group
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Group Detail Modal ───────────────────────────────────────────────── */}
      {selectedGroup && (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-[50] flex items-center justify-center p-4 md:p-8"
        >
          <div
            className="absolute inset-0 bg-primary/50 backdrop-blur-[6px]"
            onClick={() => setSelectedGroup(null)}
          />

          <div
            className="relative z-10 w-full max-w-3xl bg-card-background rounded-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl animate-[fadeIn_0.15s_ease]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-subtle flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">content_copy</span>
                  <h2 className="font-headline-sm text-[20px] text-primary">
                    {selectedGroup.totalCount} Identical Screenshots
                  </h2>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                  Original + {selectedGroup.duplicateCount} duplicate copy{selectedGroup.duplicateCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Original Card */}
              <div className="bg-surface-container-lowest rounded-xl p-5 border-2 border-primary/30 flex flex-col sm:flex-row gap-5 items-start relative">
                <span className="absolute top-4 right-4 bg-primary text-on-primary font-label-caps text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded">
                  Original
                </span>
                
                <div className="w-28 h-28 rounded-lg border border-subtle overflow-hidden bg-surface-container shrink-0">
                  {selectedGroup.original.signedUrl ? (
                    <img
                      src={selectedGroup.original.signedUrl}
                      alt={selectedGroup.original.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-2xl">image</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-16">
                  <h3 className="font-headline-sm text-[16px] text-primary truncate">
                    {selectedGroup.original.title}
                  </h3>
                  <p className="font-label-technical text-xs text-on-surface-variant">
                    Added: {formatDateTime(selectedGroup.original.created_at)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-secondary-container/40 text-on-secondary-container font-label-technical text-[11px] px-2.5 py-0.5 rounded-full">
                      Stored in Gallery & Collections
                    </span>
                  </div>
                </div>
              </div>

              {/* Duplicates Section */}
              <div className="flex flex-col gap-3">
                <h4 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                  Duplicate Copies ({selectedGroup.duplicateCount})
                </h4>

                <div className="flex flex-col gap-3">
                  {selectedGroup.duplicates.map((dup, dIdx) => (
                    <div
                      key={dup.id}
                      className="bg-card-background rounded-xl p-4 border border-subtle flex flex-col sm:flex-row gap-4 items-start sm:items-center relative hover:border-outline-variant transition-colors"
                    >
                      <span className="bg-surface-variant text-on-surface-variant font-label-caps text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded">
                        Duplicate #{dIdx + 1}
                      </span>

                      <div className="w-16 h-16 rounded border border-subtle overflow-hidden bg-surface-container shrink-0">
                        {dup.signedUrl ? (
                          <img
                            src={dup.signedUrl}
                            alt={dup.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-xl">image</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <h5 className="font-body-md text-sm text-primary font-medium truncate">
                          {dup.title}
                        </h5>
                        <p className="font-label-technical text-xs text-on-surface-variant">
                          Uploaded: {formatDateTime(dup.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-tertiary/15 text-tertiary-container dark:text-tertiary-fixed font-label-technical text-[11px] px-2.5 py-1 rounded flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">tag</span>
                          SHA-256 Identical
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-subtle flex justify-end items-center gap-3 shrink-0">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-5 py-2.5 rounded-lg border border-outline-variant font-body-md text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Keep original
              </button>
              <button
                onClick={() => setConfirmDeleteGroup(selectedGroup)}
                className="px-5 py-2.5 rounded-lg bg-error text-on-error font-body-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete duplicates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Centered Confirmation Modal ──────────────────────────────────────── */}
      {confirmDeleteGroup && (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10"
        >
          <div
            className="absolute inset-0 bg-primary/50 backdrop-blur-[6px]"
            onClick={() => !deleting && setConfirmDeleteGroup(null)}
          />

          <div
            className="relative z-10 w-full max-w-md bg-card-background rounded-2xl overflow-hidden animate-[fadeIn_0.15s_ease]"
            style={{ boxShadow: '0 32px 80px rgba(44,57,71,0.28), 0 2px 8px rgba(44,57,71,0.08)' }}
          >
            <div className="px-6 pt-6 pb-4 border-b border-outline-variant/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-error text-[24px]">warning</span>
              <h2 className="font-headline-sm text-[20px] text-primary leading-tight">
                Delete {confirmDeleteGroup.duplicateCount} duplicate copy{confirmDeleteGroup.duplicateCount !== 1 ? 's' : ''}?
              </h2>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">
                This action will permanently delete {confirmDeleteGroup.duplicateCount} duplicate copy{confirmDeleteGroup.duplicateCount !== 1 ? 's' : ''} from your archive.
              </p>
              <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface">The original screenshot added on {formatDate(confirmDeleteGroup.original.created_at)} will remain untouched in your collection.</strong>
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
                onClick={() => setConfirmDeleteGroup(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant font-body-md text-[14px] text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDuplicates(confirmDeleteGroup)}
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
                    Delete {confirmDeleteGroup.duplicateCount} Duplicate{confirmDeleteGroup.duplicateCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
