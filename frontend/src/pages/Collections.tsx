import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Collection } from '../types/collections';
import CreateCollectionModal from '../components/CreateCollectionModal';

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
          .select('*, screenshot_collections(count)')
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const mapped = data.map((c: any) => ({
          ...c,
          screenshot_count: c.screenshot_collections?.[0]?.count ?? 0,
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
    <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-8 overflow-y-auto min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-subtle pb-6">
        <div>
          <h1 className="font-display-lg text-[32px] text-primary tracking-tight">Collections</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Organize your archive into focused groups.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-body-md text-[14px] font-medium hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Collection
        </button>
      </div>

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
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border border-dashed border-outline-variant/60 rounded-2xl bg-surface-container-lowest/50">
          <div className="w-16 h-16 rounded-full bg-secondary-container/30 flex items-center justify-center text-primary mb-2">
            <span className="material-symbols-outlined text-[32px]">folder_special</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm text-primary">No collections yet.</h2>
          <p className="font-body-md text-on-surface-variant max-w-sm mb-2">
            Create your first collection to organize your screenshots.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="font-label-technical text-label-technical text-secondary hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1.5"
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
              className="group bg-card-background rounded-xl p-6 border border-subtle hover:border-secondary transition-all duration-300 shadow-subtle hover:-translate-y-1 flex flex-col gap-3"
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
    </main>
  );
}
