import Tesseract from 'tesseract.js';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import jsQR from 'jsqr';
import {
  type Category,
  type ClassificationResult,
  type ClassificationSignals,
  decidePrimaryCategory,
  detectMapContext,
  detectPlatforms,
  hasStrongTravelEvidence,
  hasStrongUpiEvidence,
  logClassificationDebug,
  scoreReceiptStructure,
} from './classifierLogic';

export type { Category, ClassificationResult } from './classifierLogic';
export { CATEGORIES, AUTO_CLASSIFICATION_NAMES } from './classifierLogic';

// Re-export for tests
export {
  decidePrimaryCategory,
  detectPlatforms,
  detectMapContext,
  scoreReceiptStructure,
  hasStrongTravelEvidence,
  hasStrongUpiEvidence,
} from './classifierLogic';

type Rule = { regex: RegExp; weight: number };

const CATEGORY_RULES: Record<Category, Rule[]> = {
  Shopping: [
    { regex: /add to cart|buy now|checkout|add to bag/i, weight: 4 },
    { regex: /delivery by|order total|out of stock|customer reviews/i, weight: 2 },
  ],
  Travel: [
    { regex: /\b(?:pnr|boarding pass|flight|airline|train|railway|irctc|departure|arrival|airport terminal)\b/i, weight: 6 },
    { regex: /\b(?:hotel booking|itinerary|passenger name|check-in)\b/i, weight: 4 },
  ],
  Food: [
    { regex: /zomato|swiggy|uber eats|restaurant menu/i, weight: 4 },
    { regex: /\bmenu\b|\brecipe\b/i, weight: 2 },
  ],
  UPI: [
    { regex: /(?:paid to|sent to|payment successful|received from|transaction id|upi id|vpa)/i, weight: 6 },
    { regex: /\b(?:gpay|google pay|phonepe|paytm|bhim|bharatpe)\b/i, weight: 4 },
  ],
  College: [
    { regex: /canvas|blackboard|syllabus|university portal|lms/i, weight: 4 },
    { regex: /\bassignment\b|\bsemester\b|\bexam\b|\bmarksheet\b/i, weight: 3 },
  ],
  Work: [
    { regex: /\bzoom\b|teams|slack|jira|trello|asana/i, weight: 4 },
    { regex: /standup|deadline|sync meeting|project dashboard/i, weight: 2 },
  ],
  'Social Media': [
    { regex: /\bdm\b|direct message|\breels?\b|\bstories\b|followers|following/i, weight: 3 },
  ],
  Messages: [
    { regex: /type a message|last seen/i, weight: 3 },
  ],
  Entertainment: [
    { regex: /\b(?:multiplex|cinema|theatre|movie|show time|concert)\b/i, weight: 4 },
    { regex: /\bnetflix\b|\byoutube\b|\bspotify\b/i, weight: 3 },
  ],
  'Movies & TV': [
    { regex: /episode|season|watch now|prime video/i, weight: 3 },
  ],
  Sports: [
    { regex: /espn|cricbuzz|tournament|league/i, weight: 3 },
  ],
  Coding: [
    { regex: /console\.log|import\s+.*from|SyntaxError|TypeError|git commit/i, weight: 4 },
    { regex: /function\s+\w+|const\s+\w+\s*=|def\s+\w+\(/i, weight: 3 },
  ],
  People: [],
  Reading: [
    { regex: /substack|medium|kindle|chapter/i, weight: 3 },
  ],
  Events: [
    { regex: /eventbrite|rsvp|venue/i, weight: 3 },
  ],
  Receipts: [],
  Documents: [
    { regex: /admit card|hall ticket|application form|\.pdf/i, weight: 4 },
  ],
  Certificates: [
    { regex: /certificate of completion|this is to certify|awarded to|presented to/i, weight: 6 },
    { regex: /\bcertificate\b/i, weight: 3 },
  ],
  'Health & Fitness': [
    { regex: /strava|workout|calories|heart rate/i, weight: 3 },
  ],
  'QR Code': [],
  Other: [
    { regex: /dashboard|project settings|\bapi\b|authentication/i, weight: 2 },
  ],
};

let cocoModel: cocoSsd.ObjectDetection | null = null;
let ocrWorker: Tesseract.Worker | null = null;

async function getOcrWorker() {
  if (!ocrWorker) {
    ocrWorker = await Tesseract.createWorker('eng');
  }
  return ocrWorker;
}

export async function preLoadVisionModel() {
  if (!cocoModel) {
    try {
      await tf.ready();
      cocoModel = await cocoSsd.load();
      console.log('[Vision] COCO-SSD model pre-loaded successfully.');
    } catch (err) {
      console.error('[Vision] Failed to pre-load COCO-SSD model:', err);
    }
  }
}

function createImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function decodeQRCode(img: HTMLImageElement): Promise<{ decoded: boolean; confidence: number }> {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect: (img: HTMLImageElement) => Promise<unknown[]> } }).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(img);
      if (barcodes?.length > 0) return { decoded: true, confidence: 1.0 };
    } catch {
      // fall through to jsQR
    }
  }

  try {
    const canvas = document.createElement('canvas');
    const maxDim = 800;
    const scale = Math.max(img.width, img.height) > maxDim ? maxDim / Math.max(img.width, img.height) : 1;
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { decoded: false, confidence: 0 };

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    if (code) return { decoded: true, confidence: 0.92 };
  } catch (err) {
    console.warn('[QR] jsQR decode failed:', err);
  }

  return { decoded: false, confidence: 0 };
}

function scoreOcrCategories(
  lowerText: string,
  platformSuppressed: Set<Category>
): { scores: Record<string, number>; best: Category | null; bestScore: number; hasStrong: boolean } {
  const scores: Record<string, number> = {};
  let best: Category | null = null;
  let bestScore = 0;
  let hasStrong = false;

  for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
    if (category === 'People' || category === 'QR Code' || category === 'Receipts') continue;
    if (platformSuppressed.has(category as Category)) continue;

    let score = 0;
    for (const rule of rules) {
      const matches = lowerText.match(new RegExp(rule.regex.source, 'gi'));
      if (matches) {
        score += matches.length * rule.weight;
        if (rule.weight >= 3) hasStrong = true;
      }
    }
    if (score > 0) scores[category] = score;
    if (score > bestScore) {
      bestScore = score;
      best = category as Category;
    }
  }

  if (detectMapContext(lowerText) && !hasStrongTravelEvidence(lowerText)) {
    delete scores['Travel'];
    if (best === 'Travel') {
      best = null;
      bestScore = 0;
      for (const [cat, sc] of Object.entries(scores)) {
        if (sc > bestScore) {
          bestScore = sc;
          best = cat as Category;
        }
      }
    }
  }

  return { scores, best, bestScore, hasStrong };
}

export interface ClassificationOptions {
  personAreaThresholdPercent?: number;
  isTarget?: boolean;
}

/**
 * Classify a screenshot into a single primary category with confidence and reason.
 */
export async function classifyScreenshot(
  file: File,
  options: ClassificationOptions = {}
): Promise<ClassificationResult> {
  const { personAreaThresholdPercent = 5 } = options;
  let ocrText = '';
  const visionCategories: Category[] = [];
  let personDetected = false;
  let qrDecoded = false;
  let qrConfidence = 0;

  try {
    const img = await createImageElement(file);
    const qr = await decodeQRCode(img);
    qrDecoded = qr.decoded;
    qrConfidence = qr.confidence;

    if (!cocoModel) await preLoadVisionModel();
    if (cocoModel) {
      const totalArea = img.width * img.height;
      const predictions = await cocoModel.detect(img);
      const VISION_MAPPINGS: Record<string, Category> = {
        person: 'People',
        handbag: 'Shopping',
        backpack: 'Shopping',
        sports_ball: 'Sports',
        bottle: 'Food',
        wine_glass: 'Food',
        cup: 'Food',
        fork: 'Food',
        knife: 'Food',
        spoon: 'Food',
        bowl: 'Food',
      };

      for (const pred of predictions) {
        const mapped = VISION_MAPPINGS[pred.class];
        if (!mapped) continue;
        const [_x, _y, w, h] = pred.bbox;
        const areaPercent = ((w * h) / totalArea) * 100;
        if (areaPercent >= personAreaThresholdPercent) {
          if (!visionCategories.includes(mapped)) visionCategories.push(mapped);
          if (mapped === 'People') personDetected = true;
        }
      }
    }
  } catch (err) {
    console.warn('[Vision] Non-fatal vision error:', err);
  }

  try {
    const worker = await getOcrWorker();
    const { data: { text } } = await worker.recognize(file);
    ocrText = text.toLowerCase();
  } catch (err) {
    console.error('[OCR] Text extraction failed:', err);
  }

  const platform = detectPlatforms(ocrText);
  const receipt = scoreReceiptStructure(ocrText);
  const ocr = scoreOcrCategories(ocrText, platform.suppressed);

  const signals: ClassificationSignals = {
    fileName: file.name,
    ocrText,
    platformCategory: platform.primaryCategory,
    platformLabel: platform.primaryLabel,
    platformSuppressed: platform.suppressed,
    receiptStructureScore: receipt.score,
    receiptSignalLabels: receipt.labels,
    travelStrong: hasStrongTravelEvidence(ocrText),
    upiStrong: hasStrongUpiEvidence(ocrText),
    mapDetected: detectMapContext(ocrText),
    qrDecoded,
    qrConfidence,
    visionCategories,
    ocrBestCategory: ocr.best,
    ocrBestScore: ocr.bestScore,
    ocrScores: ocr.scores,
    hasStrongOcrMatch: ocr.hasStrong,
    personDetected,
  };

  const result = decidePrimaryCategory(signals);
  logClassificationDebug(file.name, signals, result);

  if (options.isTarget) {
    console.log(`[CLASSIFY] Final: ${result.primary} (${result.confidence}) — ${result.reason}`);
  }

  return result;
}

/** Link categories for upload pipeline — always single primary */
export function categoriesForLinking(result: ClassificationResult): Category[] {
  return result.categories;
}
