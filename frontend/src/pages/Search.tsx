import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getBatchScreenshotUrls, toggleScreenshotFavorite } from '../lib/storage';
import { searchScreenshots } from '../lib/search';
import ScreenshotGrid, { Screenshot } from '../components/ScreenshotGrid';
import { useScreenshotModalState } from '../hooks/useScreenshotModalState';
import ScreenshotModal from '../components/ScreenshotModal';
import PageShell from '../components/PageShell';
import PageHeader from '../components/PageHeader';

const DATE_FILTERS = [
  { label: 'Any time', value: '' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
] as const;

function sinceDate(days: string): string | undefined {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d.toISOString();
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);

  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedScreenshot, setSelectedScreenshot } = useScreenshotModalState(screenshots);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    supabase
      .from('collections')
      .select('id, name')
      .order('name')
      .then(({ data }) => setCollections(data ?? []));
  }, []);

  const runSearch = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    setHasSearched(true);

    const q = searchQuery ?? query;
    const results = await searchScreenshots({
      query: q,
      favoritesOnly,
      collectionId: collectionId || undefined,
      since: sinceDate(dateFilter),
    });

    setScreenshots(results);
    setLoading(false);

    const paths = results.map((s) => s.image_path).filter(Boolean);
    const urlMap = await getBatchScreenshotUrls(paths);
    setScreenshots(
      results.map((s) => ({ ...s, signedUrl: urlMap.get(s.image_path) }))
    );
  }, [query, favoritesOnly, collectionId, dateFilter]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      runSearch(q);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
    runSearch();
  };

  const handleScreenshotDeleted = (deletedId: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== deletedId));
  };

  const handleScreenshotUpdated = (updated: { id: string; title: string; notes: string | null; is_favorite?: boolean }) => {
    setScreenshots((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
    setSelectedScreenshot((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev
    );
  };

  const handleToggleFavorite = async (id: string, nextState: boolean) => {
    setScreenshots((prev) => prev.map((s) => (s.id === id ? { ...s, is_favorite: nextState } : s)));
    const success = await toggleScreenshotFavorite(id, nextState);
    if (!success) {
      setScreenshots((prev) => prev.map((s) => (s.id === id ? { ...s, is_favorite: !nextState } : s)));
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
          onRemovedFromView={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))}
          removeWhenUnfavorited={favoritesOnly}
        />
      )}

      <PageHeader
        title="Search"
        description="Find screenshots by title, notes, or collection name."
        footer={
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl py-3.5 pl-12 pr-4 font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                placeholder="Search titles, notes, collections…"
                type="search"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-2.5 font-label-technical text-[12px] text-on-surface-variant uppercase tracking-wider cursor-pointer px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-low">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="rounded border-outline-variant"
                />
                Favorites only
              </label>

              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/60 rounded-lg px-4 py-2.5 font-body-md text-[13px] text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              >
                <option value="">All collections</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/60 rounded-lg px-4 py-2.5 font-body-md text-[13px] text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              >
                {DATE_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <button
                type="submit"
                className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-body-md text-[14px] font-medium hover:bg-primary/90 transition-colors shadow-subtle ml-auto sm:ml-0"
              >
                Search
              </button>
            </div>
          </form>
        }
      />

      {!hasSearched ? (
        <div className="empty-state-card">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-[36px] text-on-surface-variant/70">search</span>
          </div>
          <p className="font-headline-sm text-[18px] text-primary">Search your archive</p>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-md leading-relaxed">
            Enter a query to search your archive.
          </p>
        </div>
      ) : (
        <>
          {!loading && (
            <p className="font-label-technical text-[12px] text-on-surface-variant uppercase tracking-wider">
              {screenshots.length} result{screenshots.length !== 1 && 's'}
              {query.trim() && ` for "${query.trim()}"`}
            </p>
          )}
          <ScreenshotGrid
            screenshots={screenshots}
            loading={loading}
            onScreenshotClick={setSelectedScreenshot}
            onToggleFavorite={handleToggleFavorite}
            emptyStateTitle="No matches found."
            emptyStateMessage="Try different keywords or broaden your filters."
            emptyStateActionText=""
          />
        </>
      )}
    </PageShell>
  );
}
