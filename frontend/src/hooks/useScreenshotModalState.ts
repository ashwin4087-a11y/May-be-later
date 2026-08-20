import { useEffect, useState } from 'react';
import { Screenshot } from '../components/ScreenshotGrid';

/**
 * Keeps modal selection in sync with the current view list.
 * If the selected screenshot leaves the list (delete, reclassify, etc.),
 * clears or advances to the first remaining item instead of showing a stale modal.
 */
export function useScreenshotModalState(screenshots: Screenshot[]) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  useEffect(() => {
    if (!selectedScreenshot) return;
    if (screenshots.some((s) => s.id === selectedScreenshot.id)) return;

    setSelectedScreenshot(screenshots[0] ?? null);
  }, [screenshots, selectedScreenshot]);

  return { selectedScreenshot, setSelectedScreenshot };
}
