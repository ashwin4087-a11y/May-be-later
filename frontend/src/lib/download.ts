import JSZip from 'jszip';
import { supabase } from './supabase';

export interface DownloadScreenshot {
  id: string;
  title: string;
  image_path: string;
}

/**
 * Downloads a list of screenshots as a ZIP file.
 * Uses controlled concurrency to avoid overwhelming the network or backend.
 * 
 * @param screenshots The array of screenshots to download.
 * @param zipFilename The output filename (e.g., "Maybe-Later-Originals.zip").
 * @param onProgress Callback receiving progress percentages (0-100).
 */
export async function downloadScreenshotsAsZip(
  screenshots: DownloadScreenshot[],
  zipFilename: string,
  onProgress: (percent: number) => void
): Promise<void> {
  if (!screenshots || screenshots.length === 0) return;

  onProgress(0);
  const zip = new JSZip();
  const total = screenshots.length;
  let completed = 0;
  
  // To prevent filename collisions
  const usedFilenames = new Set<string>();

  // Controlled concurrency setting
  const CONCURRENCY_LIMIT = 5;

  const downloadTask = async (s: DownloadScreenshot, index: number) => {
    if (!s.image_path) {
      return;
    }

    const { data: blob, error } = await supabase.storage
      .from('screenshots')
      .download(s.image_path);

    if (error || !blob) {
      console.error(`Failed to download ${s.image_path}:`, error);
    } else {
      // Determine filename
      const ext = s.image_path.split('.').pop() || 'png';
      
      // Sanitize title
      let baseName = s.title && s.title.trim() !== '' 
        ? s.title.replace(/[/\\?%*:|"<>]/g, '-') 
        : String(index + 1).padStart(3, '0');
        
      let fileName = `${baseName}.${ext}`;
      
      // Handle collision
      let counter = 1;
      while (usedFilenames.has(fileName.toLowerCase())) {
        fileName = `${baseName} (${counter}).${ext}`;
        counter++;
      }
      usedFilenames.add(fileName.toLowerCase());

      zip.file(fileName, blob);
    }
  };

  // Run with controlled concurrency limit
  for (let i = 0; i < total; i += CONCURRENCY_LIMIT) {
    const chunk = screenshots.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(
      chunk.map(async (s, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        await downloadTask(s, globalIndex);
        
        // Progress update inside the promise so it updates frequently
        completed++;
        onProgress(Math.round((completed / total) * 100));
      })
    );
  }

  // Generate and download the ZIP blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
