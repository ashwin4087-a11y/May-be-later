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

// ─── Platform-First Rules ─────────────────────────────────────────────────────
// These are checked BEFORE any OCR keyword scoring.
// If a platform brand is present in the raw OCR text, its category is locked in
// immediately and the listed categories can never override it, regardless of score.
//
// This ensures WhatsApp → Social Media even if the screenshot shows a shopping promo.
// Content words (₹, order, delivery, playlist, etc.) belong to the CONTENT inside
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
  // ── Social Media / Messaging platforms (brand name visible) ────────────
  { detect: /instagram/i, category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /whatsapp/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  { detect: /\bfacebook\b/i, category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /snapchat/i, category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /twitter|\bx\.com\b/i, category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /tiktok/i, category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /\btelegram\b/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  { detect: /\blinkedin\b/i, category: 'Social Media', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  // ── WhatsApp UI fingerprints (brand name not always visible) ───────────
  // "Type a message" is WhatsApp's unique composer placeholder
  { detect: /type a message/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // "Forwarded" label unique to WhatsApp message forwarding
  { detect: /\bforwarded\b/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // "click here for contact info" is WhatsApp's desktop subtitle
  { detect: /click here for contact info/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // WhatsApp Business chat header
  { detect: /business account/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // WhatsApp Meta security notice (appears in every WhatsApp Business chat)
  { detect: /secure service from meta/i, category: 'Social Media', suppress: CONVERSATION_CONTENT },
  // ── Shopping platforms ─────────────────────────────────────────────────
  { detect: /\bamazon\b/i, category: 'Shopping', suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  { detect: /flipkart/i, category: 'Shopping', suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  { detect: /myntra/i, category: 'Shopping', suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  // Google Shopping search results page
  { detect: /popular products/i, category: 'Shopping', suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  // ── Entertainment platforms ────────────────────────────────────────────
  { detect: /\byoutube\b/i, category: 'Entertainment', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'College', 'Other'] },
  { detect: /\bspotify\b/i, category: 'Entertainment', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'College', 'Other'] },
  { detect: /\bnetflix\b/i, category: 'Movies & TV', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  { detect: /prime video/i, category: 'Movies & TV', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  { detect: /disney\+/i, category: 'Movies & TV', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  // ── Admin/Dev platforms ────────────────────────────────────────────────
  { detect: /supabase/i, category: 'Other', suppress: ['Social Media', 'Messages', 'Shopping', 'Entertainment', 'Coding', 'Work', 'College'] },
  // ── Receipt / Bill fingerprints ───────────────────────────────────────
  // These fire before keyword scoring so address words like "College Road"
  // can never override a clearly-detected bill/receipt.
  { detect: /cash bill/i, category: 'Receipts', suppress: ['College', 'Work', 'Shopping', 'Food', 'Social Media', 'UPI', 'Documents', 'Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other'] },
  { detect: /tax invoice/i, category: 'Receipts', suppress: ['College', 'Work', 'Shopping', 'Social Media', 'UPI', 'Documents', 'Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other'] },
  { detect: /take.?out|takeaway/i, category: 'Receipts', suppress: ['College', 'Work', 'Shopping', 'Social Media', 'Documents', 'Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other'] },
  { detect: /sgst|cgst/i, category: 'Receipts', suppress: ['College', 'Work', 'Social Media', 'Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other'] },
  { detect: /\bfssai\b/i, category: 'Receipts', suppress: ['College', 'Work', 'Social Media', 'Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other'] },
  { detect: /thank you.*visit|visit again/i, category: 'Receipts', suppress: ['College', 'Work', 'Social Media', 'Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other'] },
  { detect: /net amt|tot items|tot qty/i, category: 'Receipts', suppress: ['College', 'Work', 'Social Media', 'Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other'] },
];

// ─── Keyword heuristics (content-based scoring, runs AFTER platform check) ────
// These only decide the category when no platform brand was detected.
type Rule = { regex: RegExp; weight: number };

const CATEGORY_RULES: Record<Category, Rule[]> = {
  Shopping: [
    { regex: /add to cart|buy now|checkout|add to bag/i, weight: 3 },
    { regex: /₹\s?\d+|\$\d+/i, weight: 1 },
    { regex: /delivery by|order total|out of stock|buy at|selected color|product details|customer reviews|in stock|\bratings?\b|\bcart\b/i, weight: 1 }
  ],
  Travel: [
    { regex: /\b(?:pnr|boarding pass|flight|airline|train|railway|irctc|bus|departure|arrival|airport|terminal|platform|coach)\b/i, weight: 5 },
    { regex: /\b(?:hotel|airbnb|itinerary)\b/i, weight: 4 },
    { regex: /\b(?:check-in|passenger|ticket|booking|seat)\b/i, weight: 2 }
  ],
  Food: [
    // Note: Zomato/Swiggy/UberEats only — Zepto removed (also sells non-food)
    { regex: /zomato|swiggy|uber eats/i, weight: 3 },
    { regex: /restaurant|recipe/i, weight: 2 },
    { regex: /\bmenu\b|\bfood\b|ingredients/i, weight: 1 }
  ],
  UPI: [
    { regex: /(?:paid to|sent to|payment successful|received from|paying to|debited from|credited to|transferred to|pay again|retry payment|make payment|payment completed|transaction successful)/i, weight: 8 },
    { regex: /(?:transaction(?:\s+(?:id|details|date|time))?|txn(?:\s+id)?|ref(?:erence)?\s*no?\.?|bank reference|upi id|vpa)\b/i, weight: 5 },
    { regex: /\b(?:gpay|google pay|phonepe|paytm|upi|bhim|bharatpe)\b/i, weight: 3 },
    { regex: /(?:completed|successfully completed)\b/i, weight: 2 },
    { regex: /₹\s?\d[\d,]*(?:\.\d{2})?/i, weight: 2 },
    { regex: /(?:upi|gpay|google pay|phonepe|paytm|paid to|sent to|received from|pay again|payment successful|transaction|completed|paying to|debited from|credited to)[\s\S]*₹\s?\d[\d,]*(?:\.\d{2})?|₹\s?\d[\d,]*(?:\.\d{2})?[\s\S]*(?:upi|gpay|google pay|phonepe|paytm|paid to|sent to|received from|pay again|payment successful|transaction|completed|paying to|debited from|credited to)/i, weight: 10 }
  ],
  College: [
    // Require actual academic platforms/terms, not just the word 'college' in an address
    { regex: /canvas|blackboard|syllabus|university portal/i, weight: 4 },
    { regex: /\bassignment\b|\bsemester\b|\bexam\b|\bgpa\b/i, weight: 3 },
    // 'college' or 'university' alone is weight 1 — needs other signals to win
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
    { regex: /\b(?:multiplex|cinema|theatre|screen no|movie|show time|concert|event|live show|standup)\b/i, weight: 4 },
    { regex: /\b(?:admission|class|seat|ticket|booking)\b/i, weight: 1 },
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
    { regex: /cash bill|tax invoice|takeaway|take.?out/i, weight: 6 },
    { regex: /sgst|cgst|grand total|subtotal|net amt|round.?off|tot items|tot qty|total qty|\bgst\b|fssai/i, weight: 5 },
    { regex: /\breceipt\b|\binvoice\b/i, weight: 3 },
    { regex: /sales.?man|b\.no|bill.?no|sl\.no|particulars/i, weight: 3 },
    { regex: /thank you.*visit|visit again/i, weight: 4 },
    { regex: /rs:\s*\d+|amount due/i, weight: 3 }
  ],
  Documents: [
    // General documents — NOT receipts or certificates
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
  'QR Code': [], // Strictly visual detection only — OCR keywords never score for QR Code
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
      let foundFirstBlack = false;

      for (let x = 15; x < width - 15; x++) {
        const pixelIsBlack = binary[y * width + x];

        if (pixelIsBlack) {
          foundFirstBlack = true;
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
          if (!foundFirstBlack) continue;
          if (currentState % 2 === 0) {
            if (currentState === 4) {
              if (checkRatio(runLengths)) {
                finderPatternHits++;
              }
              runLengths = [0, 0, 0, 0, 0];
              currentState = 0;
              foundFirstBlack = false;
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
 * Vision (person) and OCR are independent — failure of one does NOT suppress the other.
 */
export async function classifyScreenshot(
  file: File,
  options: ClassificationOptions = {}
): Promise<Category[]> {
  const { personAreaThresholdPercent = 5 } = options;
  const categories = new Set<Category>();
  let visualQrDetected = false; // deferred until OCR text is available

  // ── 1. VISUAL DETECTION (Objects & People) ────────────────────────────────
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
        // laptop removed — causes false Work classifications on product/promo images
        // tv removed — causes false Entertainment classifications on phones/screens
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
            categories.add(mappedCategory);
            console.log(`[Vision] ✅ Meaningful ${pred.class}: ${areaPercent.toFixed(1)}% area → Classified as ${mappedCategory}`);
          } else {
            console.log(`[Vision] ⬛ Incidental ${pred.class} ignored: ${areaPercent.toFixed(1)}% area < ${personAreaThresholdPercent}% threshold`);
          }
        }
      }

      // ── QR Code detection (visual pattern analysis) ─────────────────────
      const qrResult = await detectQRCodeVisually(img);
      console.log(`[QR] Actual QR detected: ${qrResult.detected}`);
      console.log(`[QR] QR confidence: ${qrResult.confidence.toFixed(2)}`);
      console.log(`[QR] Final QR score: ${qrResult.score}`);

      if (qrResult.detected) {
        // Defer payment vs. plain-QR routing to post-OCR (OCR hasn't run yet here)
        visualQrDetected = true;
        console.log(`[QR] 🔲 Visual QR confirmed — routing deferred until OCR text is available`);

        if (categories.has('People')) {
          categories.delete('People');
          console.log(`[Vision] 🔲 QR Code is primary subject; People classification suppressed`);
        }
      }
    } else {
      console.warn('[Vision] COCO-SSD model unavailable — skipping visual detection');
    }
  } catch (visionErr) {
    // Vision failure is non-fatal — OCR still runs
    console.error('[Vision] Error during person detection (non-fatal, proceeding with OCR):', visionErr);
  }

  // ── 2. OCR TEXT DETECTION ─────────────────────────────────────────────────
  const scores: Record<string, number> = {};
  // Hoisted so post-OCR blocks (QR routing, debug logging) can access it even if OCR fails
  let ocrText = '';
  let platformLocked = false;

  try {
    console.log(`[OCR] Starting text extraction for "${file.name}"...`);
    const worker = await getOcrWorker();
    const { data: { text } } = await worker.recognize(file);
    // DO NOT terminate worker so it can be reused for the next file

    const lowerText = text.toLowerCase();
    ocrText = lowerText; // make available to post-OCR blocks outside this try

    // VERBOSE LOGGING REQUESTED BY USER
    console.log(`\n\n[OCR DEBUG] ========================================`);
    console.log(`[OCR DEBUG] Extracted text from "${file.name}":\n"${lowerText}"`);
    console.log(`[OCR DEBUG] ========================================\n\n`);

    // ── STEP 1: Platform-first detection ──────────────────────────────────
    // Check for explicit platform brands BEFORE any keyword scoring.
    // If a platform is found, its category is locked in immediately.
    // The suppress list prevents content words inside the platform from overriding it.
    const platformSuppressed = new Set<Category>();
    // platformLocked is hoisted above — set it here so QR routing can read it outside this try block

    for (const rule of PLATFORM_FIRST_RULES) {
      if (rule.detect.test(lowerText)) {
        console.log(`[Classifier] 🔒 Platform detected: "${rule.detect.source}" → locking "${rule.category}"`);
        categories.add(rule.category);
        for (const sup of rule.suppress) {
          platformSuppressed.add(sup);
        }
        platformLocked = true;
        // Don't break — multiple platform rules may match (e.g. instagram + youtube url)
      }
    }

    if (platformLocked) {
      console.log(`[Classifier] Platform lock active. Suppressed categories: ${[...platformSuppressed].join(', ')}`);
    }

    // ── STEP 2: Content-based keyword scoring (for non-platform screenshots) ─
    const hasStrongMatch: Record<string, boolean> = {};

    for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
      if (category === 'People') continue; // Vision-only
      if (platformSuppressed.has(category as Category)) continue; // Platform already won this slot

      let score = 0;
      for (const rule of rules as Rule[]) {
        const matches = lowerText.match(new RegExp(rule.regex.source, 'gi'));
        if (matches) {
          score += matches.length * rule.weight;
          console.log(`[OCR] Match in ${category}: "${rule.regex.source}" x${matches.length} (weight ${rule.weight})`);
          if (rule.weight >= 3) {
            hasStrongMatch[category] = true;
          }
        }
      }

      if (score > 0) {
        scores[category] = score;
        console.log(`[OCR] Category "${category}" total score: ${score}`);
      }
    }

    // ─── STEP 2.5: Cross-category exclusion rules ──────────────────────────────
    // If strong cinema evidence is present, exclude Travel
    if (/\b(?:multiplex|cinema|theatre|screen no|movie|show time)\b/i.test(lowerText)) {
      if (scores['Travel'] > 0) {
        console.log(`[Classifier] Cross-category exclusion: Strong cinema evidence found. Suppressing Travel classification.`);
        delete scores['Travel'];
      }
    }

    // Pick the highest scoring non-platform, non-suppressed category
    let bestOcrCategory: Category | null = null;
    let maxScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      // Require higher minimums for certain categories
      let minRequired = 2;
      if (category === 'Certificates') minRequired = 5;
      if (category === 'UPI') minRequired = 5;

      if (score > maxScore && score >= minRequired && !platformSuppressed.has(category as Category)) {
        if (hasStrongMatch[category] !== true) {
          console.log(`[Classifier] Skipped category "${category}" (score: ${score}) because it lacked a strong match (weight >= 3)`);
          continue;
        }
        maxScore = score;
        bestOcrCategory = category as Category;
      }
    }

    // ── SPECIAL ROUTING: QR Code with payment context → UPI ──────────────
    // If QR Code wins but strong payment signals are present, route to UPI instead
    if (bestOcrCategory === 'QR Code') {
      const paymentKeywords = /\b(?:upi|bhim|google pay|gpay|phonepe|paytm|bharatpe|scan.*pay|accepted here)\b/i;
      if (paymentKeywords.test(lowerText)) {
        console.log(`[OCR] 🔄 QR Code detected with payment context → routing to UPI instead`);
        bestOcrCategory = 'UPI';
      }
    }

    if (bestOcrCategory) {
      console.log(`[OCR] ✅ Best content match: "${bestOcrCategory}" (score: ${maxScore})`);
      categories.add(bestOcrCategory);
    } else if (!platformLocked) {
      console.log('[OCR] No category met the minimum score threshold (2) from text.');
    }

    // ── 3. PLATFORM SUPPRESSION ───────────────────────────────────────────────
    // Vision runs before OCR, so we must evict suppressed categories now.
    if (platformLocked) {
      for (const suppressed of platformSuppressed) {
        if (categories.has(suppressed)) {
          categories.delete(suppressed);
          console.log(`[Classifier] Platform lock suppressed vision-added category: ${suppressed}`);
        }
      }
    }



  } catch (ocrErr) {
    // OCR failure is non-fatal if vision already found something
    console.error('[OCR] Error during text extraction (non-fatal if vision succeeded):', ocrErr);
  }

  // ── 4. QR CODE CONTEXTUAL PRIORITY RESOLUTION ────────────────────────
  // QR detection is an ADDITIONAL signal, not an automatic override.
  // Now that OCR text is available, apply the full routing:
  //   a) Payment keywords present → UPI (never Entertainment/Other/People)
  //   b) Strong receipt evidence → Receipts + QR Code (multi-tag). Receipt always survives.
  //   c) Entertainment/cinema OCR evidence → Entertainment + QR Code (multi-tag)
  //   d) Travel OCR evidence → Travel + QR Code (multi-tag)
  //   e) No strong context → standalone QR Code
  //   f) Vision-added Entertainment WITHOUT genuine entertainment OCR evidence → suppress it

  // --- DEBUG: Receipt + QR summary ---
  const receiptOcrEvidence = /cash bill|tax invoice|take.?out|takeaway|\bfssai\b|sgst|cgst|\bgst\b|grand total|net amt|\bsubtotal\b|tot items|tot qty|total qty|thank you.*visit|visit again|\breceipt\b|\binvoice\b|rs:\s*\d+|amount due/i;
  const receiptDetected = categories.has('Receipts');
  const receiptOcrMatched = receiptOcrEvidence.test(ocrText);
  console.log(`[QR DEBUG] visualQrDetected=${visualQrDetected}`);
  console.log(`[QR DEBUG] categories before QR routing: ${[...categories].join(', ') || 'none'}`);
  console.log(`[QR DEBUG] ocrText length: ${ocrText.length}`);
  console.log(`[QR DEBUG] receipt in categories: ${receiptDetected}`);
  console.log(`[QR DEBUG] receipt OCR evidence matched: ${receiptOcrMatched}`);
  console.log(`[QR DEBUG] ocrText snippet: "${ocrText.slice(0, 200)}"`);

  if (visualQrDetected) {
    const paymentKeywords = /\b(?:upi|bhim|google pay|gpay|phonepe|paytm|bharatpe|scan.*pay|paid to|pay to|accepted here|credited|debited|transaction)\b/i;
    const entertainmentOcrEvidence = /\b(?:multiplex|cinema|theatre|movie|show time|now showing|screen no|admission|ticket|booking)\b/i;
    const travelOcrEvidence = /\b(?:pnr|boarding pass|flight|airline|train|railway|irctc|bus|departure|arrival|airport|terminal|coach)\b/i;

    if (paymentKeywords.test(ocrText)) {
      // Payment QR → UPI, suppress generic fallbacks
      categories.add('UPI');
      categories.delete('QR Code');
      (['Entertainment', 'Other', 'People'] as Category[]).forEach(cat => {
        if (categories.has(cat)) { categories.delete(cat); }
      });
      console.log(`[QR] 💳 Payment QR → routed to UPI`);

    } else if (receiptDetected || receiptOcrMatched) {
      // Strong receipt evidence is present
      categories.add('Receipts');
      categories.delete('QR Code');
      (['Entertainment', 'Travel', 'Events', 'Movies & TV', 'Sports', 'Other', 'People'] as Category[]).forEach(cat => {
        if (categories.has(cat)) {
          categories.delete(cat);
        }
      });
      console.log(`[QR] 🧾 Receipt+QR: strong receipt evidence — routed to Receipts`);

    } else if (categories.has('Travel') || travelOcrEvidence.test(ocrText)) {
      categories.add('Travel');
      categories.delete('QR Code');
      console.log(`[QR] ✈️ Travel+QR: routed to Travel`);

    } else if (categories.has('Entertainment') || entertainmentOcrEvidence.test(ocrText)) {
      categories.add('Entertainment');
      categories.delete('QR Code');
      console.log(`[QR] 🎟️ Entertainment+QR: routed to Entertainment`);

    } else if (categories.has('Certificates') || categories.has('Documents') || categories.has('Shopping') || platformLocked) {
      categories.delete('QR Code');
      console.log(`[QR] 🔲 QR Code suppressed by stronger contextual category or platform lock`);

    } else {
      categories.add('QR Code');
      console.log(`[QR] 🔲 QR Code retained as primary category`);
    }
  } else if (categories.has('UPI')) {
    // UPI from OCR keywords (not visual QR) — also suppress generic fallbacks
    (['Entertainment', 'Other', 'People'] as Category[]).forEach(cat => {
      if (categories.has(cat)) {
        categories.delete(cat);
        console.log(`[Classifier] 💳 UPI/payment context removes generic vision category: ${cat}`);
      }
    });
  }

  if (categories.size === 0) {
    console.log('[Classifier] No categories detected — defaulting to Other');
    categories.add('Other');
  }

  const result = Array.from(categories);

  // --- [CLASSIFY] EXPLICIT LOGGING REQUESTED BY USER ---
  if (options.isTarget) {
    console.log(`[OCR] Extracted text:\n${ocrText}`);
    console.log(`[SCORE] UPI: ${scores['UPI'] || 0}`);
    console.log(`[SCORE] Shopping: ${scores['Shopping'] || 0}`);
    console.log(`[SCORE] Other: ${scores['Other'] || 0}`);
    console.log(`[CLASSIFY] Final categories: ${result.join(', ')}`);
  }
  // -----------------------------------------------------

  console.log(`[CLASSIFY] Final returned categories for "${file.name}":`, result);
  return result;
}