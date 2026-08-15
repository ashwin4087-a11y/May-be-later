import Tesseract from 'tesseract.js';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// The requested predefined categories
const CATEGORIES = [
  'Shopping',
  'Travel',
  'Food',
  'College',
  'Work',
  'UPI',
  'Social Media',
  'Messages',
  'Entertainment',
  'Movies & TV',
  'Sports',
  'Coding',
  'People',
  'Reading',
  'Events',
  'Receipts',
  'Documents',
  'Certificates',
  'Health & Fitness',
  'QR Code',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];

// â”€â”€â”€ Platform-First Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// These are checked BEFORE any OCR keyword scoring.
// If a platform brand is present in the raw OCR text, its category is locked in
// immediately and the listed categories can never override it, regardless of score.
//
// This ensures WhatsApp â†’ Social Media even if the screenshot shows a shopping promo.
// Content words (â‚¹, order, delivery, playlist, etc.) belong to the CONTENT inside
// the platform, not to the screenshot category itself.

type PlatformRule = {
  detect: RegExp;       // Regex to search for the platform brand
  category: Category;  // The category to lock in when detected
  suppress: Category[]; // Categories that content words cannot override
};

// All categories that represent the *content* of a conversation rather than the platform itself.
// These must never win when a social/messaging platform is detected.
const CONVERSATION_CONTENT: Category[] = ['Shopping', 'Food', 'Travel', 'UPI', 'Entertainment', 'Movies & TV', 'Sports', 'Work', 'College', 'Coding', 'Reading', 'Events', 'Receipts', 'Documents', 'Certificates', 'Health & Fitness', 'QR Code', 'Other'];

const PLATFORM_FIRST_RULES: PlatformRule[] = [
  // â”€â”€ Social Media / Messaging platforms (brand name visible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { detect: /instagram/i,            category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /whatsapp/i,             category: 'Social Media', suppress: CONVERSATION_CONTENT },
  { detect: /\bfacebook\b/i,         category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /snapchat/i,             category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /twitter|\bx\.com\b/i,   category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /tiktok/i,               category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /\btelegram\b/i,         category: 'Social Media', suppress: CONVERSATION_CONTENT },
  { detect: /\blinkedin\b/i,         category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  // â”€â”€ WhatsApp UI fingerprints (brand name not always visible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // "Type a message" is WhatsApp's unique composer placeholder
  { detect: /type a message/i,       category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // "Forwarded" label unique to WhatsApp message forwarding
  { detect: /\bforwarded\b/i,        category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // "click here for contact info" is WhatsApp's desktop subtitle
  { detect: /click here for contact info/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // WhatsApp Business chat header
  { detect: /business account/i,     category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // WhatsApp Meta security notice (appears in every WhatsApp Business chat)
  { detect: /secure service from meta/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // â”€â”€ Shopping platforms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { detect: /\bamazon\b/i,           category: 'Shopping',    suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  { detect: /flipkart/i,             category: 'Shopping',    suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  { detect: /myntra/i,               category: 'Shopping',    suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  // Google Shopping search results page
  { detect: /popular products/i,     category: 'Shopping',    suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  // â”€â”€ Entertainment platforms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { detect: /\byoutube\b/i,          category: 'Entertainment', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'College', 'Other'] },
  { detect: /\bspotify\b/i,          category: 'Entertainment', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'College', 'Other'] },
  { detect: /\bnetflix\b/i,          category: 'Movies & TV', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  { detect: /prime video/i,          category: 'Movies & TV', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  { detect: /disney\+/i,             category: 'Movies & TV', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  // â”€â”€ Admin/Dev platforms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { detect: /supabase/i,             category: 'Other',       suppress: ['Social Media', 'Messages', 'Shopping', 'Entertainment', 'Coding', 'Work', 'College'] },
  // â”€â”€ Receipt / Bill fingerprints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // These fire before keyword scoring so address words like "College Road"
  // can never override a clearly-detected bill/receipt.
  { detect: /cash bill/i,            category: 'Receipts',    suppress: ['College', 'Work', 'Shopping', 'Food', 'Social Media', 'UPI', 'Documents', 'Other'] },
  { detect: /tax invoice/i,          category: 'Receipts',    suppress: ['College', 'Work', 'Shopping', 'Social Media', 'UPI', 'Documents', 'Other'] },
  { detect: /take.?out|takeaway/i,   category: 'Receipts',    suppress: ['College', 'Work', 'Shopping', 'Social Media', 'Documents', 'Other'] },
  { detect: /sgst|cgst/i,            category: 'Receipts',    suppress: ['College', 'Work', 'Social Media', 'Other'] },
  { detect: /\bfssai\b/i,            category: 'Receipts',    suppress: ['College', 'Work', 'Social Media', 'Other'] },
  { detect: /thank you.*visit|visit again/i, category: 'Receipts', suppress: ['College', 'Work', 'Social Media', 'Other'] },
  { detect: /net amt|tot items|tot qty/i, category: 'Receipts', suppress: ['College', 'Work', 'Social Media', 'Other'] },
];

// â”€â”€â”€ Keyword heuristics (content-based scoring, runs AFTER platform check) â”€â”€â”€â”€
// These only decide the category when no platform brand was detected.
type Rule = { regex: RegExp; weight: number };

const CATEGORY_RULES: Record<Category, Rule[]> = {
  Shopping: [
    { regex: /add to cart|buy now|checkout|add to bag/i, weight: 3 },
    { regex: /â‚¹\s?\d+|\$\d+/i, weight: 1 },
    { regex: /delivery by|order total|out of stock|buy at|selected color|product details|customer reviews|in stock|\bratings?\b|\bcart\b/i, weight: 1 }
  ],
  Travel: [
    { regex: /boarding pass|\bflight\b|airbnb/i, weight: 3 },
    { regex: /booking|ticket|\bhotel\b|itinerary|check-in/i, weight: 2 },
    { regex: /\bdepart\b|\barrive\b|\btrain\b|\bterminal\b|\bpassenger\b/i, weight: 1 }
  ],
  Food: [
    // Note: Zomato/Swiggy/UberEats only â€” Zepto removed (also sells non-food)
    { regex: /zomato|swiggy|uber eats/i, weight: 3 },
    { regex: /restaurant|recipe/i, weight: 2 },
    { regex: /\bmenu\b|\bfood\b|ingredients/i, weight: 1 }
  ],
  UPI: [
    { regex: /\b(?:upi|bhim|google pay|gpay|phonepe|paytm|bharatpe|upi id|vpa)\b/i, weight: 5 },
    { regex: /(?:pay again|retry payment|make payment|payment successful|payment completed|transaction successful)/i, weight: 5 },
    { regex: /(?:paid to|sent to|received from|paying to|debited from|credited to|transferred to)/i, weight: 5 },
    { regex: /(?:completed|successfully completed)\b/i, weight: 3 },
    { regex: /(?:transaction(?:\s+(?:id|details|date|time))?|txn(?:\s+id)?|ref(?:erence)?\s*no?\.?|bank reference)/i, weight: 3 },
    { regex: /â‚¹\s?\d[\d,]*(?:\.\d{2})?/i, weight: 2 },
    { regex: /(?:upi|gpay|phonepe|paytm|paid to|sent to|received from|pay again|payment successful|transaction|completed)[\s\S]{0,60}â‚¹\s?\d[\d,]*(?:\.\d{2})?|â‚¹\s?\d[\d,]*(?:\.\d{2})?[\s\S]{0,60}(?:upi|gpay|phonepe|paytm|paid to|sent to|received from|pay again|payment successful|transaction|completed)/i, weight: 8 }
  ],
  College: [
    // Require actual academic platforms/terms, not just the word 'college' in an address
    { regex: /canvas|blackboard|syllabus|university portal/i, weight: 4 },
    { regex: /\bassignment\b|\bsemester\b|\bexam\b|\bgpa\b/i, weight: 3 },
    // 'college' or 'university' alone is weight 1 â€” needs other signals to win
    { regex: /\bcollege\b|\buniversity\b/i, weight: 1 },
    { regex: /\bgrade\b|\blecture\b|\bcourse\b/i, weight: 1 }
  ],
  Work: [
    { regex: /\bzoom\b|teams|slack|jira|trello/i, weight: 3 },
    { regex: /standup|agenda/i, weight: 2 },
    { regex: /meeting|deadline|sync/i, weight: 1 }
  ],
  'Social Media': [
    { regex: /followers|following|retweet|\blikes\b/i, weight: 2 },
    { regex: /\bdm\b|direct message|\breels?\b|\bstories\b/i, weight: 2 },
    { regex: /\bpost\b|\bseen\b/i, weight: 1 }
  ],
  Messages: [
    { regex: /type a message|last seen/i, weight: 3 },
    { regex: /\bchat\b|\bonline\b/i, weight: 1 }
  ],
  Entertainment: [
    { regex: /playlist|podcast|gaming/i, weight: 2 }
  ],
  'Movies & TV': [
    { regex: /episode|season|watch now/i, weight: 2 }
  ],
  Sports: [
    { regex: /espn|cricbuzz/i, weight: 3 },
    { regex: /tournament|league/i, weight: 2 },
    { regex: /\bscore\b|\bmatch\b|\bteam\b/i, weight: 1 }
  ],
  Coding: [
    { regex: /console\.log|import\s+.*from|export\s+(const|default|function|class)|public\s+class/i, weight: 3 },
    { regex: /function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|def\s+\w+\(|=>|<div.*>/i, weight: 2 },
    { regex: /SyntaxError:|TypeError:|Exception:|return\s+/i, weight: 2 }
  ],
  People: [], // Dedicated to visual detection
  Reading: [
    { regex: /substack|medium|kindle/i, weight: 3 },
    { regex: /article|\bblog\b|chapter/i, weight: 1 }
  ],
  Events: [
    { regex: /eventbrite|concert/i, weight: 3 },
    { regex: /rsvp|venue/i, weight: 2 },
    { regex: /ticket|invite/i, weight: 1 }
  ],
  Receipts: [
    // Physical bills, cash memos, takeaway receipts
    { regex: /cash bill|take.?out|takeaway|tax invoice/i, weight: 5 },
    { regex: /net amt|round.?off|tot items|tot qty|total qty/i, weight: 4 },
    { regex: /\breceipt\b|\binvoice\b/i, weight: 3 },
    // Indian tax receipt signals
    { regex: /sgst|cgst|\bgst\b|fssai/i, weight: 4 },
    // Common receipt fields
    { regex: /sales.?man|b\.no|bill.?no|sl\.no|particulars/i, weight: 3 },
    { regex: /thank you.*visit|visit again/i, weight: 4 },
    { regex: /rs:\s*\d+|net amt|amount due/i, weight: 3 }
  ],
  Documents: [
    // General documents â€” NOT receipts or certificates
    { regex: /admit card|hall ticket|marksheet/i, weight: 4 },
    { regex: /\.pdf|fillable form|application form/i, weight: 3 },
    { regex: /\bdoc\b|\bform\b|agreement|contract/i, weight: 1 }
  ],
  Certificates: [
    { regex: /certificate of completion|completion certificate/i, weight: 8 },
    { regex: /certificate of participation|participation certificate/i, weight: 8 },
    { regex: /certificate of achievement|achievement certificate/i, weight: 8 },
    { regex: /certificate of appreciation|appreciation certificate/i, weight: 8 },
    { regex: /internship certificate|course certificate|training certificate|volunteering certificate|workshop certificate|competition certificate/i, weight: 8 },
    { regex: /this is to certify/i, weight: 7 },
    { regex: /has successfully completed|successfully completed/i, weight: 6 },
    { regex: /awarded to/i, weight: 5 },
    { regex: /presented to/i, weight: 5 },
    { regex: /in recognition of/i, weight: 5 },
    { regex: /\bcertificate\b|\bcertify\b/i, weight: 3 }
  ],
  'Health & Fitness': [
    { regex: /strava|apple watch/i, weight: 3 },
    { regex: /workout|calories|heart rate/i, weight: 2 },
    { regex: /steps|sleep|\bgym\b/i, weight: 1 }
  ],
  'QR Code': [], // Strictly visual detection only â€” OCR keywords never score for QR Code
  Other: [
    // Admin, technical, and generic UI dashboards fall here.
    { regex: /supabase|magic\s?link|rls|postgrest/i, weight: 4 },
    { regex: /authentication|\bauth\b|provider information|mfa factors|ban user|delete user|reset password/i, weight: 3 },
    { regex: /confirmation email|database|\bapi\b|dashboard|project settings|\buid\b/i, weight: 2 }
  ]
};

// Global model instance
let cocoModel: cocoSsd.ObjectDetection | null = null;
let ocrWorker: Tesseract.Worker | null = null;
// Stores the last OCR text so platform suppression can access it outside the OCR try-block
let _lastOcrText = '';

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

export interface QRDetectionResult {
  detected: boolean;
  confidence: number;
  score: number;
}

/**
 * Detects if an image contains an actual QR code visually.
 * Uses browser native BarcodeDetector API if available, or 1:1:3:1:1 finder pattern scanline analysis.
 * Solid backgrounds, dark wallpapers (e.g. "aa.loveffort"), text, or decorative shapes return detected: false.
 */
async function detectQRCodeVisually(img: HTMLImageElement): Promise<QRDetectionResult> {
  // 1. Native BarcodeDetector API check
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(img);
      if (barcodes && barcodes.length > 0) {
        return { detected: true, confidence: 1.0, score: 10 };
      }
    } catch (e) {
      // Fallback to pattern analysis below
    }
  }

  // 2. Pattern & Ratio Analysis
  try {
    const canvas = document.createElement('canvas');
    const maxDim = 600;
    const scale = Math.max(img.width, img.height) > maxDim ? maxDim / Math.max(img.width, img.height) : 1;
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { detected: false, confidence: 0, score: 0 };

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    const binary: boolean[] = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      binary[i / 4] = lum < 128;
    }

    let finderPatternHits = 0;
    const step = 4;

    for (let y = 15; y < height - 15; y += step) {
      let currentState = 0;
      let runLengths = [0, 0, 0, 0, 0];

      for (let x = 15; x < width - 15; x++) {
        const pixelIsBlack = binary[y * width + x];

        if (pixelIsBlack) {
          if (currentState % 2 === 1) {
            currentState++;
          }
          if (currentState < 5) {
            runLengths[currentState]++;
          } else {
            if (checkRatio(runLengths)) {
              finderPatternHits++;
            }
            runLengths[0] = runLengths[2];
            runLengths[1] = runLengths[3];
            runLengths[2] = runLengths[4];
            runLengths[3] = 1;
            runLengths[4] = 0;
            currentState = 3;
          }
        } else {
          if (currentState % 2 === 0) {
            if (currentState === 4) {
              if (checkRatio(runLengths)) {
                finderPatternHits++;
              }
              runLengths = [0, 0, 0, 0, 0];
              currentState = 0;
            } else {
              currentState++;
              runLengths[currentState]++;
            }
          } else {
            runLengths[currentState]++;
          }
        }
      }
    }

    function checkRatio(runs: number[]): boolean {
      const total = runs.reduce((a, b) => a + b, 0);
      if (total < 7) return false;
      const moduleSize = total / 7;
      const maxVariance = moduleSize * 0.65;
      return (
        Math.abs(runs[0] - moduleSize) < maxVariance &&
        Math.abs(runs[1] - moduleSize) < maxVariance &&
        Math.abs(runs[2] - 3 * moduleSize) < maxVariance &&
        Math.abs(runs[3] - moduleSize) < maxVariance &&
        Math.abs(runs[4] - moduleSize) < maxVariance
      );
    }

    if (finderPatternHits >= 3) {
      return { detected: true, confidence: 0.85, score: 9 };
    }
  } catch (err) {
    console.warn('[Vision] QR pattern detection failed:', err);
  }

  return { detected: false, confidence: 0, score: 0 };
}

export interface ClassificationOptions {
  personAreaThresholdPercent?: number; // E.g., 5 means 5% of the image area
  isTarget?: boolean; // Used to output specific debug logs requested by the user
}

/**
 * Runs OCR and Vision detection on a screenshot to return an array of meaningful categories.
 * Vision (person) and OCR are independent â€” failure of one does NOT suppress the other.
 */
export async function classifyScreenshot(
  file: File,
  options: ClassificationOptions = {}
): Promise<Category[]> {
  const { personAreaThresholdPercent = 5 } = options;

  // Intermediate state â€” populated by vision and OCR phases
  const visionCategories = new Set<Category>();
  const scores: Record<string, number> = {};

  // Platform suppression state â€” hoisted so priority resolution can read it
  const platformSuppressed = new Set<Category>();
  let platformLocked = false;

  // â”â”â” 1. VISUAL DETECTION (Objects & People) â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  try {
    if (!cocoModel) {
      await preLoadVisionModel();
    }

    if (cocoModel) {
      const img = await createImageElement(file);
      const totalArea = img.width * img.height;
      const predictions = await cocoModel.detect(img);

      console.log(`[Vision] ${predictions.length} object(s) detected in "${file.name}"`);

      const VISION_MAPPINGS: Record<string, Category> = {
        person: 'People',
        handbag: 'Shopping',
        backpack: 'Shopping',
        suitcase: 'Travel',
        airplane: 'Travel',
        train: 'Travel',
        bus: 'Travel',
        // laptop removed â€” causes false Work classifications on product/promo images
        tv: 'Entertainment',
        sports_ball: 'Sports',
        bottle: 'Food',
        wine_glass: 'Food',
        cup: 'Food',
        fork: 'Food',
        knife: 'Food',
        spoon: 'Food',
        bowl: 'Food',
        banana: 'Food',
        apple: 'Food',
        sandwich: 'Food',
        orange: 'Food',
        pizza: 'Food',
        cake: 'Food'
      };

      for (const pred of predictions) {
        const mappedCategory = VISION_MAPPINGS[pred.class];
        if (mappedCategory) {
          const [_x, _y, width, height] = pred.bbox;
          const bboxArea = width * height;
          const areaPercent = (bboxArea / totalArea) * 100;

          if (areaPercent >= personAreaThresholdPercent) {
            visionCategories.add(mappedCategory);
            console.log(`[Vision] âœ… Meaningful ${pred.class}: ${areaPercent.toFixed(1)}% area â†’ Classified as ${mappedCategory}`);
          } else {
            console.log(`[Vision] âš  Incidental ${pred.class} ignored: ${areaPercent.toFixed(1)}% area < ${personAreaThresholdPercent}% threshold`);
          }
        }
      }

      // â”â”â” QR Code detection (visual pattern analysis) â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
      // NOTE: We record the QR detection result but do NOT add 'QR Code' to
      // visionCategories here.  Adding it here would bypass the priority gate.
      // Instead we add it to the candidate set only inside the priority resolution
      // block, where it can be properly gated against stronger context.
      const qrResult = await detectQRCodeVisually(img);
      console.log(`[QR] Actual QR detected: ${qrResult.detected}`);
      console.log(`[QR] QR confidence: ${qrResult.confidence.toFixed(2)}`);
      console.log(`[QR] Final QR score: ${qrResult.score}`);

      if (qrResult.detected) {
        // Store in scores so priority resolution can gate it correctly.
        // Use a sentinel score (100) to mark visual confirmation.
        scores['QR Code'] = 100;
        console.log(`[QR] âœ… Visual QR code confirmed â€” queued for priority resolution`);

        if (visionCategories.has('People')) {
          visionCategories.delete('People');
          console.log(`[Vision] ðŸ”„ QR Code is primary subject; People classification suppressed`);
        }
      }
    } else {
      console.warn('[Vision] COCO-SSD model unavailable â€” skipping visual detection');
    }
  } catch (visionErr) {
    // Vision failure is non-fatal â€” OCR still runs
    console.error('[Vision] Error during person detection (non-fatal, proceeding with OCR):', visionErr);
  }

  // â”â”â” 2. OCR TEXT DETECTION â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  try {
    console.log(`[OCR] Starting text extraction for "${file.name}"...`);
    const worker = await getOcrWorker();
    const { data: { text } } = await worker.recognize(file);
    // DO NOT terminate worker so it can be reused for the next file

    const lowerText = text.toLowerCase();
    _lastOcrText = lowerText; // persist for post-OCR platform suppression

    // VERBOSE LOGGING
    console.log(`\n\n[OCR DEBUG] ========================================`);
    console.log(`[OCR DEBUG] Extracted text from "${file.name}":\n"${lowerText}"`);
    console.log(`[OCR DEBUG] ========================================\n\n`);

    // â”â”â” STEP 1: Platform-first detection â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
    // Check for explicit platform brands BEFORE any keyword scoring.
    // If a platform is found, its category is locked in immediately.
    // The suppress list prevents content words inside the platform from overriding it.
    for (const rule of PLATFORM_FIRST_RULES) {
      if (rule.detect.test(lowerText)) {
        console.log(`[Classifier] ðŸ”’ Platform detected: "${rule.detect.source}" â†’ locking "${rule.category}"`);
        visionCategories.add(rule.category);
        for (const sup of rule.suppress) {
          platformSuppressed.add(sup);
        }
        platformLocked = true;
        // Don't break â€” multiple platform rules may match (e.g. instagram + youtube url)
      }
    }

    if (platformLocked) {
      console.log(`[Classifier] Platform lock active. Suppressed categories: ${[...platformSuppressed].join(', ')}`);
    }

    // â”â”â” STEP 2: Content-based keyword scoring (for non-platform screenshots) â”
    for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
      if (category === 'People') continue;     // Vision-only
      if (category === 'QR Code') continue;    // Visual-only â€” never score via OCR keywords
      if (platformSuppressed.has(category as Category)) continue; // Platform already won this slot

      let score = 0;
      for (const rule of rules as Rule[]) {
        const matches = lowerText.match(new RegExp(rule.regex.source, 'gi'));
        if (matches) {
          score += matches.length * rule.weight;
          console.log(`[OCR] Match in ${category}: "${rule.regex.source}" x${matches.length} (weight ${rule.weight})`);
        }
      }

      if (score > 0) {
        scores[category] = (scores[category] ?? 0) + score;
        console.log(`[OCR] Category "${category}" total score: ${scores[category]}`);
      }
    }

  } catch (ocrErr) {
    // OCR failure is non-fatal if vision already found something
    console.error('[OCR] Error during text extraction (non-fatal if vision succeeded):', ocrErr);
  }

  // â”â”â” 3. PRIORITY-BASED SINGLE-WINNER RESOLUTION â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  // We collected candidate categories from vision (QR, People, Food, etc.) and
  // OCR keyword scoring above. Now we resolve to exactly ONE final category
  // using a strict priority chain so that a QR code embedded inside a receipt
  // does NOT cause the screenshot to be placed in both Receipts and QR Code.
  //
  // Priority (highest â†’ lowest):
  //   Certificates â†’ UPI â†’ Receipts â†’ Shopping â†’ Food â†’ College â†’ Work â†’
  //   Travel â†’ Entertainment â†’ Movies & TV â†’ Sports â†’ Coding â†’ Reading â†’
  //   Events â†’ Health & Fitness â†’ Documents â†’ Messages â†’ Social Media â†’
  //   People â†’ QR Code â†’ Other
  //
  // QR Code only wins when NO higher-priority category reached its score
  // threshold. A visual QR inside a bill/receipt â†’ Receipts wins.

  // Log all candidate scores
  console.log(`[CLASSIFY] Candidate scores: ${JSON.stringify(scores)}`);
  console.log(`[CLASSIFY] Vision-added categories: ${[...visionCategories].join(', ') || 'none'}`);

  const PRIORITY_ORDER: Category[] = [
    'Certificates',
    'UPI',
    'Receipts',
    'Shopping',
    'Food',
    'College',
    'Work',
    'Travel',
    'Entertainment',
    'Movies & TV',
    'Sports',
    'Coding',
    'Reading',
    'Events',
    'Health & Fitness',
    'Documents',
    'Messages',
    'Social Media',
    'People',
    'QR Code',
    'Other',
  ];

  let finalCategory: Category | null = null;

  if (platformLocked) {
    // Platform screenshots: remove all suppressed categories from vision set,
    // then pick the first remaining platform category.
    for (const suppressed of platformSuppressed) {
      visionCategories.delete(suppressed);
    }
    finalCategory = [...visionCategories].find(c => !platformSuppressed.has(c)) ?? null;
    if (finalCategory) {
      console.log(`[CLASSIFY] Priority override: Platform lock â€” final category: "${finalCategory}"`);
    }
  } else {
    // Non-platform screenshot: merge OCR scoring + vision into the priority chain.
    // Build the candidate set:
    //   â€¢ everything added by vision (People, Food, Shopping, etc.)
    //   â€¢ every OCR-scored category that met its minimum threshold
    const candidates = new Set<Category>(visionCategories);
    for (const [cat, score] of Object.entries(scores)) {
      const minRequired = cat === 'Certificates' ? 5 : 2;
      if (score >= minRequired && !platformSuppressed.has(cat as Category)) {
        candidates.add(cat as Category);
      }
    }

    // Walk priority order â€” first candidate that appears wins.
    for (const cat of PRIORITY_ORDER) {
      if (!candidates.has(cat)) continue;

      // â”€â”€ QR Code gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // QR Code is a fallback category. If ANY higher-priority category is a
      // confirmed candidate (via OCR score OR via vision), suppress QR Code so
      // that a QR embedded in a receipt/bill/certificate/UPI screenshot does not
      // win the classification.
      if (cat === 'QR Code') {
        const higherPriorityCats = PRIORITY_ORDER.slice(0, PRIORITY_ORDER.indexOf('QR Code'));
        const strongerExists = higherPriorityCats.some(prior => candidates.has(prior));
        if (strongerExists) {
          console.log(`[CLASSIFY] Priority override: QR Code suppressed â€” a stronger context category is present.`);
          continue; // skip QR Code, keep looking
        }
        // QR Code with UPI payment context â†’ route to UPI
        const paymentKeywords = /\b(?:upi|bhim|google pay|gpay|phonepe|paytm|bharatpe|scan.*pay|paid to|pay to|accepted here|credited|debited|transaction)\b/i;
        if (paymentKeywords.test(_lastOcrText)) {
          console.log(`[CLASSIFY] Priority override: QR Code + payment context â†’ routing to UPI instead.`);
          finalCategory = 'UPI';
          break;
        }
      }
      // â”€â”€ End QR Code gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

      finalCategory = cat;
      break;
    }

    if (finalCategory) {
      console.log(`[CLASSIFY] Priority resolution â†’ "${finalCategory}"`);
    }
  }

  // â”â”â” 4. FALLBACK â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  if (!finalCategory) {
    const isAestheticOrQuote =
      _lastOcrText.length > 0 &&
      _lastOcrText.length < 150 &&
      !/\b(?:invoice|bill|gst|tax|total|amount|receipt|payment)\b/i.test(_lastOcrText);
    if (isAestheticOrQuote) {
      finalCategory = 'Entertainment';
      console.log('[CLASSIFY] Aesthetic quote/graphic detected â†’ Entertainment');
    } else {
      finalCategory = 'Other';
      console.log('[CLASSIFY] No category detected â€” defaulting to Other');
    }
  }

  console.log(`[CLASSIFY] Final category for "${file.name}": "${finalCategory}"`);
  return [finalCategory];
}

