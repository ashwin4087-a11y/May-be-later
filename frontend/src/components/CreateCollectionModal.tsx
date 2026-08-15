import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Collection } from '../types/collections';

interface Props {
  onClose: () => void;
  onCreated?: (collection: Collection) => void;
  onUpdated?: (collection: Collection) => void;
  existingCollection?: Collection; // If provided, modal acts as "Edit" instead of "Create"
}

export default function CreateCollectionModal({ onClose, onCreated, onUpdated, existingCollection }: Props) {
  const [name, setName] = useState(existingCollection?.name ?? '');
  const [description, setDescription] = useState(existingCollection?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto focus
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Collection name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in.');

      if (existingCollection) {
        // Edit mode
        const { data, error: updateError } = await supabase
          .from('collections')
          .update({
            name: trimmedName,
            description: description.trim() || null,
          })
          .eq('id', existingCollection.id)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        
        onUpdated?.(data as Collection);
      } else {
        // Create mode
        const { data, error: insertError } = await supabase
          .from('collections')
          .insert({
            user_id: user.id,
            name: trimmedName,
            description: description.trim() || null,
          })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);

        // Explicitly set screenshot_count to 0 for newly created collections
        const newCollection = { ...data, screenshot_count: 0 } as Collection;
        onCreated?.(newCollection);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setSaving(false);
    }
  };

  const isEdit = !!existingCollection;

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10"
    >
      <div
        className="absolute inset-0 bg-primary/50 backdrop-blur-[6px]"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-md bg-card-background rounded-2xl overflow-hidden animate-[fadeIn_0.15s_ease]"
        style={{ boxShadow: '0 32px 80px rgba(44,57,71,0.28), 0 2px 8px rgba(44,57,71,0.08)' }}
      >
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/30 flex items-center justify-between">
          <h2 className="font-headline-sm text-[20px] text-primary">
            {isEdit ? 'Edit Collection' : 'New Collection'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-technical text-on-surface-variant uppercase tracking-wider text-[11px]">
              Name
            </label>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="w-full font-body-md text-[14px] text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
              placeholder="e.g. Design Inspiration"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-technical text-on-surface-variant uppercase tracking-wider text-[11px]">
              Description <span className="opacity-60 lowercase font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full font-body-md text-[14px] text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
              placeholder="What's this collection about?"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error-container/60 text-on-error-container rounded-lg px-3 py-2 mt-2">
              <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
              <p className="font-label-technical text-[12px]">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-5 bg-surface-container-lowest border-t border-outline-variant/30 flex gap-3">
          <button
            onClick={onClose}
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
                {isEdit ? 'Save Changes' : 'Create'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
