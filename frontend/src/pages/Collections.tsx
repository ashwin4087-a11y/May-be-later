import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchCollectionScreenshotCounts } from '../lib/screenshotQueries';
import { Collection } from '../types/collections';
import CreateCollectionModal from '../components/CreateCollectionModal';
import PageShell from '../components/PageShell';
import PageHeader from '../components/PageHeader';

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function fetchCollections() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const countMap = await fetchCollectionScreenshotCounts();

        const mapped = data.map((c: Collection) => ({
          ...c,
          screenshot_count: countMap.get(c.id) ?? 0,
        }));
        
        setCollections(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collections.');
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, []);

  const handleCreated = (newCollection: Collection) => {
    setCollections((prev) => [newCollection, ...prev]);
  };

  return (
    <PageShell>
      <PageHeader
        title="Collections"
        description="Organize your archive into focused groups."
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-body-md text-[14px] font-medium hover:opacity-90 transition-opacity shadow-subtle flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Collection
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 bg-error-container/60 text-on-error-container rounded-lg px-4 py-3">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p className="font-body-md">{error}</p>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-container animate-pulse rounded-xl border border-subtle" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="empty-state-card">
          <div className="w-16 h-16 rounded-full bg-secondary-container/40 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-[32px] text-secondary">folder_special</span>
          </div>
          <h2 className="font-headline-sm text-[18px] text-primary">No collections yet.</h2>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-md leading-relaxed">
            Create your first collection to organize your screenshots.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 font-label-technical text-[12px] text-secondary hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              to={`/collections/${collection.id}`}
              className="group surface-card p-6 hover:border-secondary/60 transition-all duration-300 hover:-translate-y-0.5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-headline-sm text-[18px] text-primary group-hover:text-secondary transition-colors line-clamp-2">
                  {collection.name}
                </h3>
                <span className="flex-shrink-0 bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-full font-label-technical text-[11px]">
                  {collection.screenshot_count} item{collection.screenshot_count !== 1 && 's'}
                </span>
              </div>
              
              {collection.description ? (
                <p className="font-body-sm text-[13px] text-on-surface-variant line-clamp-2 leading-relaxed">
                  {collection.description}
                </p>
              ) : (
                <p className="font-body-sm text-[13px] text-on-surface-variant/50 italic">
                  No description.
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </PageShell>
  );
}
