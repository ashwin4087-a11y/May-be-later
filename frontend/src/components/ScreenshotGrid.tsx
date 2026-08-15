export interface Screenshot {
  id: string;
  title: string;
  notes: string | null;
  image_path: string;
  created_at: string;
  signedUrl?: string;
}

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  loading: boolean;
  onScreenshotClick: (screenshot: Screenshot) => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateActionText?: string;
  onEmptyStateAction?: () => void;
  // Selection mode
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function ScreenshotGrid({
  screenshots,
  loading,
  onScreenshotClick,
  emptyStateTitle = 'No screenshots yet.',
  emptyStateMessage,
  emptyStateActionText = 'Import your first screenshot →',
  onEmptyStateAction,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}: ScreenshotGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-gutter">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-video bg-surface-container animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border border-dashed border-outline-variant rounded-lg">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">photo_library</span>
        <p className="font-body-md text-on-surface-variant">{emptyStateTitle}</p>
        {emptyStateMessage && <p className="font-body-sm text-on-surface-variant max-w-sm">{emptyStateMessage}</p>}
        {emptyStateActionText && onEmptyStateAction && (
          <button
            onClick={onEmptyStateAction}
            className="font-label-technical text-label-technical text-secondary hover:text-primary transition-colors uppercase tracking-wider"
          >
            {emptyStateActionText}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-gutter">
      {screenshots.map((s) => {
        const isSelected = selectedIds.has(s.id);

        const handleClick = () => {
          if (selectionMode && onToggleSelect) {
            onToggleSelect(s.id);
          } else {
            onScreenshotClick(s);
          }
        };

        return (
          <div
            key={s.id}
            onClick={handleClick}
            className={`group relative aspect-video bg-surface-container rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer shadow-subtle
              ${selectionMode
                ? isSelected
                  ? 'border-primary ring-2 ring-primary scale-[0.97]'
                  : 'border-subtle hover:border-outline-variant'
                : 'border-subtle hover:border-tertiary duration-300'
              }`}
          >
            {s.signedUrl ? (
              <img
                src={s.signedUrl}
                alt={s.title}
                className={`w-full h-full object-cover transition-transform duration-500 ${
                  selectionMode ? '' : 'group-hover:scale-105'
                } ${isSelected ? 'opacity-75' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">broken_image</span>
              </div>
            )}

            {/* Normal hover overlay */}
            {!selectionMode && (
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <p className="font-label-technical text-on-primary text-xs truncate">{s.title}</p>
              </div>
            )}

            {/* Selection checkbox */}
            {selectionMode && (
              <div className="absolute top-2 left-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-md ${
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-black/40 border-white/70 group-hover:border-white'
                }`}>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[13px] text-white">check</span>
                  )}
                </div>
              </div>
            )}

            {/* Selected overlay tint */}
            {selectionMode && isSelected && (
              <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}
