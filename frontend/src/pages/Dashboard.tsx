import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadScreenshot, getScreenshotUrl, getBatchScreenshotUrls, computeImageHash, findDuplicate, toggleScreenshotFavorite } from '../lib/storage';
import ScreenshotModal from '../components/ScreenshotModal';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import BulkDeleteBar from '../components/BulkDeleteBar';
import { classifyScreenshot, preLoadVisionModel } from '../lib/classifier';

interface UploadStatus {
  file: string;
  status: 'pending' | 'uploading' | 'analyzing' | 'done' | 'error';
  error?: string;
  label?: string; // Human-readable classification result e.g. "→ Shopping"
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good morning');

  // ── Selection / Bulk Delete ────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleted = (deletedIds: string[]) => {
    setScreenshots((prev) => prev.filter((s) => !deletedIds.includes(s.id)));
    setSelectedIds(new Set());
  };

  const handleExitSelect = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Dynamic greeting and pre-load ML model
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    // Pre-load TensorFlow model in background
    preLoadVisionModel();
  }, []);

  // ── Fetch gallery & stats ──────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    const [totalRes, dupRes] = await Promise.all([
      supabase.from('screenshots').select('*', { count: 'exact', head: true }).eq('is_duplicate', false),
      supabase.from('screenshots').select('*', { count: 'exact', head: true }).eq('is_duplicate', true)
    ]);

    if (!totalRes.error && totalRes.count !== null) setTotalCount(totalRes.count);
    if (!dupRes.error && dupRes.count !== null) setDuplicateCount(dupRes.count);
  }, []);

  const fetchScreenshots = useCallback(async () => {
    setLoadingGallery(true);
    // 1. Fetch original screenshots (non-duplicates); select only needed columns
    const { data, error } = await supabase
      .from('screenshots')
      .select('id, title, notes, image_path, created_at, is_favorite')
      .eq('is_duplicate', false)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoadingGallery(false);
      return;
    }

    // Render cards immediately — signedUrls arrive in a single follow-up batch request
    setScreenshots(data);
    setLoadingGallery(false);

    // 2. Fetch ALL signed URLs in a single HTTP request (batch API)
    const paths = data.map((s: any) => s.image_path).filter(Boolean);
    const urlMap = await getBatchScreenshotUrls(paths);

    // 3. Merge URLs back into the screenshot list
    setScreenshots(
      data.map((s: any) => ({ ...s, signedUrl: urlMap.get(s.image_path) }))
    );
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchStats(), fetchScreenshots()]);
  }, [fetchStats, fetchScreenshots]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── Upload handler ─────────────────────────────────────────────────────────

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (fileArray.length === 0) {
      setUploadError('Please select image files only (PNG, JPG, WEBP, etc.).');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadStatuses(
      fileArray.map((f) => ({ file: f.name, status: 'pending' }))
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadError('You must be logged in to upload.');
      setUploading(false);
      return;
    }

    let anyError = false;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      setUploadStatuses((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'uploading' } : s))
      );

      try {
        // 0. Compute image hash for duplicate detection
        console.log(`[Upload] Computing SHA-256 hash for "${file.name}"...`);
        const imageHash = await computeImageHash(file);
        console.log(`[Upload] Hash: ${imageHash}`);

        // 0a. Check for duplicates
        const existingScreenshot = await findDuplicate(imageHash, user.id);
        if (existingScreenshot) {
          console.log(`[Upload] ⚠️ DUPLICATE DETECTED: Image hash matches screenshot ${existingScreenshot.id}`);
          
          // Insert as a duplicate without classification
          const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          const { data: dupData, error: dupError } = await supabase
            .from('screenshots')
            .insert({
              user_id: user.id,
              title: `${title} (duplicate)`,
              notes: null,
              image_path: '', // No need to upload duplicate file
              image_hash: imageHash,
              duplicate_of: existingScreenshot.id,
              is_duplicate: true,
            })
            .select('id')
            .single();

          if (dupError) throw new Error(`Failed to record duplicate: ${dupError.message}`);
          console.log(`[Upload] ✅ Recorded as duplicate (id: ${dupData.id})`);

          setUploadStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: 'done', label: '→ Duplicates' } : s
            )
          );
          continue; // Skip to next file
        }

        // 1. Upload file to storage, get back the storage path
        const imagePath = await uploadScreenshot(file);

        // 2. Insert row into public.screenshots and get its ID (with image hash)
        const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        const { data: insertedData, error: dbError } = await supabase
          .from('screenshots')
          .insert({
            user_id: user.id,
            title,
            notes: null,
            image_path: imagePath,
            image_hash: imageHash,
            duplicate_of: null,
            is_duplicate: false,
          })
          .select('id')
          .single();

        if (dbError) throw new Error(dbError.message);
        const screenshotId = insertedData.id;

        // 3. Classification (OCR)
        setUploadStatuses((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: 'analyzing' } : s))
        );

        const categories = await classifyScreenshot(file);
        console.log(`[Upload] File "${file.name}" classified as:`, categories);

        // Track whether any category link succeeded for UI feedback
        const linkedCategories: string[] = [];
        const classifyErrors: string[] = [];

        for (const category of categories) {
          try {
            // Check if a collection with this name already exists for this user
            const { data: existingCols, error: colFindError } = await supabase
              .from('collections')
              .select('id')
              .eq('name', category)
              .limit(1);

            if (colFindError) {
              console.error(`[Upload] Failed to query collection "${category}":`, colFindError.message);
              classifyErrors.push(`Find "${category}": ${colFindError.message}`);
              continue; // Non-fatal: try the next category
            }

            let collectionId = existingCols?.[0]?.id;

            if (!collectionId) {
              // Collection doesn't exist — create it automatically
              const { data: newCol, error: colCreateError } = await supabase
                .from('collections')
                .insert({ user_id: user.id, name: category })
                .select('id')
                .single();

              if (colCreateError) {
                console.error(`[Upload] Failed to create collection "${category}":`, colCreateError.message);
                classifyErrors.push(`Create "${category}": ${colCreateError.message}`);
                continue; // Non-fatal: try the next category
              }

              collectionId = newCol.id;
              console.log(`[Upload] Auto-created collection "${category}" (id: ${collectionId})`);
            } else {
              console.log(`[Upload] Found existing collection "${category}" (id: ${collectionId})`);
            }

            if (!screenshotId) {
              console.error(`[CLASSIFY] Missing screenshot ID for ${file.name}`);
              throw new Error("Missing screenshot ID for linking");
            }
            if (!collectionId) {
              console.error(`[CLASSIFY] Missing collection ID for category ${category}`);
              throw new Error("Missing collection ID for linking");
            }

            console.log(`[LINK] Linking screenshot ${screenshotId} → collection ${collectionId} (${category})`);

            // Insert the junction row safely (ignoring duplicates)
            const { error: linkError } = await supabase
              .from('screenshot_collections')
              .insert({ screenshot_id: screenshotId, collection_id: collectionId });

            // 23505 is PostgreSQL unique_violation
            if (linkError && linkError.code !== '23505') {
              console.error(`[Upload] Failed to link screenshot "${screenshotId}" to collection "${category}":`, linkError.message);
              classifyErrors.push(`Link "${category}": ${linkError.message}`);
              continue; // Non-fatal
            }

            console.log(`[SUCCESS] ✅ Screenshot organized into collection "${category}"`);
            linkedCategories.push(category);

          } catch (categoryErr) {
            const msg = categoryErr instanceof Error ? categoryErr.message : String(categoryErr);
            console.error(`[Upload] Unexpected error for category "${category}":`, msg);
            classifyErrors.push(`"${category}": ${msg}`);
            // Continue to next category — don't abort
          }
        }

        // Build a human-readable label for the status row
        const classifyLabel = linkedCategories.length > 0
          ? `→ ${linkedCategories.join(', ')}`
          : categories.length === 0
            ? '(no category detected)'
            : classifyErrors.length > 0
              ? `(link error: ${classifyErrors[0]})`
              : '→ Other';

        setUploadStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: 'done', label: classifyLabel } : s
          )
        );

      } catch (err) {
        anyError = true;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setUploadStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: 'error', error: msg } : s
          )
        );
      }
    }

    if (anyError) {
      setUploadError('Some files failed to upload. See details below.');
    }

    setUploading(false);
    // Reset the file input so the same files can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Refresh gallery and stats
    await refreshData();
    // Clear statuses after a short delay so the user can read them
    setTimeout(() => setUploadStatuses([]), 4000);
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Reclassify All (Temporary Utility) ──────────────────────────────────
  const [reclassifying, setReclassifying] = useState(false);

  const handleReclassifyAll = async () => {
    if (!window.confirm("This will run the updated classifier on all existing screenshots and organize them into new collections. This might take a minute. Continue?")) return;
    
    setReclassifying(true);
    setUploadError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Fetch all screenshots
      const { data: allScreenshots, error: fetchErr } = await supabase
        .from('screenshots')
        .select('*');
        
      if (fetchErr) throw new Error(fetchErr.message);

      for (const s of allScreenshots) {
        try {
          // SKIP duplicates during reclassification
          if (s.is_duplicate) {
            console.log(`[RECLASSIFY] Skipping duplicate ${s.id} (duplicate_of: ${s.duplicate_of})`);
            continue;
          }

          const isTarget = s.title.includes('173553') || s.title.includes('1786709180987');
          if (isTarget) {
            console.log(`\n\n----------------------------------------`);
            console.log(`[RECLASSIFY] Screenshot ID: ${s.id} (${s.title})`);
          }
          
          // 1. Download image as File
          const url = await getScreenshotUrl(s.image_path);
          const response = await fetch(url);
          const blob = await response.blob();
          const file = new File([blob], `${s.title}.png`, { type: blob.type });

          // 2. Classify using latest logic
          const categories = await classifyScreenshot(file, { isTarget });

          // 3. Remove existing relationships
          const { error: delErr } = await supabase
            .from('screenshot_collections')
            .delete()
            .eq('screenshot_id', s.id);
            
          if (isTarget) {
            console.log(`[DB] Old collection links removed: ${delErr ? 'FAILED' : 'SUCCESS'}`);
          }
          
          if (delErr) {
            console.error(`[RECLASSIFY] Error deleting old links for ${s.id}:`, delErr.message);
            continue;
          }

          // 4. Create new links
          const addedCategories: string[] = [];
          for (const category of categories) {
            let collectionId;
            const { data: existingCols } = await supabase
              .from('collections')
              .select('id')
              .eq('name', category)
              .limit(1);

            if (existingCols && existingCols.length > 0) {
              collectionId = existingCols[0].id;
            } else {
              const { data: newCol, error: createErr } = await supabase
                .from('collections')
                .insert({ user_id: user.id, name: category })
                .select('id')
                .single();
              if (createErr) throw new Error(createErr.message);
              collectionId = newCol.id;
            }

            const { error: linkErr } = await supabase
              .from('screenshot_collections')
              .insert({ screenshot_id: s.id, collection_id: collectionId });
              
            if (linkErr && linkErr.code !== '23505') {
              console.error(`[RECLASSIFY] Error linking to ${category}:`, linkErr.message);
            } else {
              addedCategories.push(category);
            }
          }
          if (isTarget) {
            console.log(`[DB] New collection links added: ${addedCategories.join(', ')}`);
            console.log(`----------------------------------------\n\n`);
          }
        } catch (err) {
          console.error(`[RECLASSIFY] Failed for screenshot ${s.id}:`, err);
        }
      }
      
      console.log(`[RECLASSIFY] 🎉 All screenshots reclassified!`);
      alert("Reclassification complete. Check console for details.");
      
      // Refresh the gallery to force re-fetches
      await refreshData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setReclassifying(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const handleDeleted = (id: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdated = (updated: { id: string; title: string; notes: string | null; is_favorite?: boolean }) => {
    setScreenshots((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
    // Keep the selected screenshot in sync so the modal header reflects the new title
    setSelectedScreenshot((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev
    );
  };

  const handleToggleFavorite = async (id: string, nextState: boolean) => {
    setScreenshots((prev) => prev.map(s => s.id === id ? { ...s, is_favorite: nextState } : s));
    const success = await toggleScreenshotFavorite(id, nextState);
    if (!success) {
      setScreenshots((prev) => prev.map(s => s.id === id ? { ...s, is_favorite: !nextState } : s));
    }
  };

  return (
    <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-16 overflow-y-auto min-h-screen">

      {/* Screenshot detail modal */}
      {selectedScreenshot && (
        <ScreenshotModal
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
          screenshots={screenshots}
          onNavigate={setSelectedScreenshot}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            className="w-full bg-card-background border border-outline-variant rounded-md py-2 pl-10 pr-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-colors"
            placeholder="Search archive..."
            type="text"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectionMode((m) => {
                if (m) { setSelectedIds(new Set()); }
                return !m;
              });
            }}
            disabled={uploading || reclassifying}
            className={`border px-4 py-2 rounded-md font-body-md text-body-md font-medium transition-colors shadow-sm flex-shrink-0 disabled:opacity-50 flex items-center gap-1.5 ${
              selectionMode
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container border-outline-variant text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">checklist</span>
            {selectionMode ? 'Cancel' : 'Select'}
          </button>
          <button
            onClick={handleReclassifyAll}
            disabled={reclassifying || uploading}
            className="bg-surface-container border border-outline-variant text-on-surface px-4 py-2 rounded-md font-body-md text-body-md font-medium hover:bg-surface-container-high transition-colors shadow-sm flex-shrink-0 disabled:opacity-50"
          >
            {reclassifying ? 'Reclassifying...' : 'Reclassify All'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || reclassifying}
            className="bg-primary text-on-primary px-6 py-2 rounded-md font-body-md text-body-md font-medium hover:opacity-90 transition-opacity shadow-sm flex-shrink-0 disabled:opacity-50"
          >
            {uploading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>

      {/* Welcome */}
      <section className="flex flex-col gap-stack-md pt-4">
        <h1 className="font-display-lg text-display-lg text-primary tracking-tight">
          {greeting}, Archivist.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Your personal library is calm and ready. Here is an overview of your recent captures and areas needing attention.
        </p>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter py-stack-lg border-y border-subtle">
        <div className="flex flex-col gap-stack-sm">
          <span className="font-display-md text-display-md text-primary">{totalCount}</span>
          <span className="font-label-technical text-label-technical text-on-surface-variant uppercase tracking-wider">Total Screenshots</span>
        </div>
        <div className="flex flex-col gap-stack-sm">
          <span className="font-display-md text-display-md text-tertiary">0</span>
          <span className="font-label-technical text-label-technical text-on-surface-variant uppercase tracking-wider">Forgotten Items</span>
        </div>
        <div className="flex flex-col gap-stack-sm">
          <span className="font-display-md text-display-md text-on-surface-variant">{duplicateCount}</span>
          <span className="font-label-technical text-label-technical text-on-surface-variant uppercase tracking-wider">Duplicates Detected</span>
        </div>
      </section>

      {/* Upload Progress */}
      {uploadStatuses.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Upload Progress</h2>
          {uploadError && (
            <p className="text-sm text-on-error-container bg-error-container rounded px-3 py-2">{uploadError}</p>
          )}
          <div className="flex flex-col gap-2">
            {uploadStatuses.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-card-background border border-subtle rounded-lg px-4 py-3">
                <span className={`material-symbols-outlined text-[20px] ${
                  s.status === 'done' ? 'text-secondary' :
                  s.status === 'error' ? 'text-error' :
                  s.status === 'analyzing' ? 'text-secondary animate-pulse' :
                  s.status === 'uploading' ? 'text-tertiary animate-pulse' :
                  'text-on-surface-variant'
                }`}>
                  {s.status === 'done' ? 'check_circle' :
                   s.status === 'error' ? 'error' :
                   s.status === 'analyzing' ? 'document_scanner' :
                   s.status === 'uploading' ? 'upload' : 'schedule'}
                </span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-body-md text-on-surface truncate">{s.file}</span>
                  {s.label && s.status === 'done' && (
                    <span className="font-label-technical text-secondary text-xs">{s.label}</span>
                  )}
                  {s.error && <span className="font-label-technical text-error text-xs">{s.error}</span>}
                </div>
                <span className="font-label-technical text-label-technical text-on-surface-variant capitalize">{s.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left: Gallery */}
        <div className="lg:col-span-8 flex flex-col gap-stack-lg">
          <div className="flex justify-between items-end border-b border-subtle pb-4">
            <h2 className="font-headline-sm text-headline-sm text-primary">Gallery</h2>
            <span className="font-label-technical text-label-technical text-on-surface-variant uppercase tracking-wider">
              {screenshots.length} item{screenshots.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Bulk select toolbar */}
          {selectionMode && (
            <BulkDeleteBar
              allScreenshots={screenshots}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onDeleted={handleBulkDeleted}
              onExitSelect={handleExitSelect}
            />
          )}

          <ScreenshotGrid
            screenshots={screenshots}
            loading={loadingGallery}
            onScreenshotClick={setSelectedScreenshot}
            onEmptyStateAction={() => fileInputRef.current?.click()}
            onToggleFavorite={handleToggleFavorite}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </div>

        {/* Right: Needs Attention */}
        <div className="lg:col-span-4 flex flex-col gap-stack-lg">
          <div className="flex justify-between items-end border-b border-subtle pb-4">
            <h2 className="font-headline-sm text-headline-sm text-tertiary-container flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              Needs Attention
            </h2>
          </div>
          <div className="bg-card-background rounded-lg p-6 text-center shadow-subtle border border-subtle flex flex-col items-center justify-center gap-4">
            <p className="font-body-md text-on-surface-variant">No items need your attention right now.</p>
          </div>
        </div>
      </div>

      {/* Import CTA / Drop Zone */}
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center py-stack-lg mt-8 rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200 cursor-pointer ${
          dragging
            ? 'border-tertiary bg-tertiary/5 scale-[1.01]'
            : 'border-subtle bg-page-background hover:border-tertiary/50'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <span className="material-symbols-outlined text-[40px] text-tertiary mb-4">upload_file</span>
        <h2 className="font-display-md text-display-md text-primary mb-4">
          {dragging ? 'Drop to import' : 'Ready to add more?'}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-8">
          Drag and drop screenshots here or click to select files from your device.
        </p>
        <button
          disabled={uploading}
          className="bg-primary text-on-primary px-8 py-4 rounded font-body-lg text-body-lg font-medium hover:opacity-90 transition-opacity shadow-subtle flex items-center gap-3 disabled:opacity-50 pointer-events-none"
        >
          <span className="material-symbols-outlined text-tertiary">upload</span>
          {uploading ? 'Importing...' : 'Import Screenshots'}
        </button>
      </section>
    </main>
  );
}
