/**
 * Pure classification decision logic (no OCR/vision I/O).
 * Used by classifier.ts and unit tests.
 */

export const CATEGORIES = [
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
  'Other',
] as const;

export type Category = typeof CATEGORIES[number];

export const AUTO_CLASSIFICATION_NAMES: readonly Category[] = CATEGORIES;

export interface ClassificationResult {
  primary: Category;
  confidence: number;
  reason: string;
  categories: Category[];
}

export interface ClassificationSignals {
  fileName: string;
  ocrText: string;
  platformCategory: Category | null;
  platformLabel: string | null;
  platformSuppressed: Set<Category>;
  receiptStructureScore: number;
  receiptSignalLabels: string[];
  travelStrong: boolean;
  upiStrong: boolean;
  mapDetected: boolean;
  qrDecoded: boolean;
  qrConfidence: number;
  visionCategories: Category[];
  ocrBestCategory: Category | null;
  ocrBestScore: number;
  ocrScores: Record<string, number>;
  hasStrongOcrMatch: boolean;
  personDetected: boolean;
}

const CONVERSATION_CONTENT: Category[] = [
  'Shopping', 'Food', 'Travel', 'UPI', 'Entertainment', 'Movies & TV', 'Sports',
  'Work', 'College', 'Coding', 'Reading', 'Events', 'Receipts', 'Documents',
  'Certificates', 'Health & Fitness', 'QR Code', 'Other',
];

type PlatformRule = {
  detect: RegExp;
  category: Category;
  label: string;
  suppress: Category[];
};

export const PLATFORM_FIRST_RULES: PlatformRule[] = [
  { detect: /instagram/i, category: 'Social Media', label: 'Instagram', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /whatsapp/i, category: 'Social Media', label: 'WhatsApp', suppress: CONVERSATION_CONTENT },
  { detect: /\bfacebook\b/i, category: 'Social Media', label: 'Facebook', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /snapchat/i, category: 'Social Media', label: 'Snapchat', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /twitter|\bx\.com\b/i, category: 'Social Media', label: 'Twitter/X', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /tiktok/i, category: 'Social Media', label: 'TikTok', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /\btelegram\b/i, category: 'Social Media', label: 'Telegram', suppress: CONVERSATION_CONTENT },
  { detect: /\blinkedin\b/i, category: 'Social Media', label: 'LinkedIn', suppress: [...CONVERSATION_CONTENT, 'Messages'] },
  { detect: /type a message/i, category: 'Social Media', label: 'WhatsApp UI', suppress: CONVERSATION_CONTENT },
  { detect: /\bforwarded\b/i, category: 'Social Media', label: 'WhatsApp forwarded', suppress: CONVERSATION_CONTENT },
  { detect: /click here for contact info/i, category: 'Social Media', label: 'WhatsApp desktop', suppress: CONVERSATION_CONTENT },
  { detect: /business account/i, category: 'Social Media', label: 'WhatsApp Business', suppress: CONVERSATION_CONTENT },
  { detect: /secure service from meta/i, category: 'Social Media', label: 'Meta/WhatsApp', suppress: CONVERSATION_CONTENT },
  { detect: /\bgithub\b/i, category: 'Coding', label: 'GitHub', suppress: ['Social Media', 'Receipts', 'UPI', 'QR Code', 'Other'] },
  { detect: /visual studio code|\bvscode\b/i, category: 'Coding', label: 'VS Code', suppress: ['Social Media', 'Receipts', 'Work', 'Other'] },
  { detect: /\bamazon\b/i, category: 'Shopping', label: 'Amazon', suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  { detect: /flipkart/i, category: 'Shopping', label: 'Flipkart', suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  { detect: /myntra/i, category: 'Shopping', label: 'Myntra', suppress: ['Social Media', 'Entertainment', 'Travel', 'Work', 'Food', 'UPI', 'College', 'Other'] },
  { detect: /\byoutube\b/i, category: 'Entertainment', label: 'YouTube', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'College', 'Other'] },
  { detect: /\bspotify\b/i, category: 'Entertainment', label: 'Spotify', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'College', 'Other'] },
  { detect: /\bnetflix\b/i, category: 'Movies & TV', label: 'Netflix', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  { detect: /prime video/i, category: 'Movies & TV', label: 'Prime Video', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  { detect: /disney\+/i, category: 'Movies & TV', label: 'Disney+', suppress: ['Social Media', 'Shopping', 'Travel', 'Work', 'Entertainment', 'College', 'Other'] },
  { detect: /google maps|maps\.google/i, category: 'Other', label: 'Google Maps', suppress: ['Travel', 'Shopping', 'Food', 'UPI', 'Receipts', 'QR Code'] },
];

export function detectPlatforms(ocrText: string): {
  primaryCategory: Category | null;
  primaryLabel: string | null;
  suppressed: Set<Category>;
} {
  let primaryCategory: Category | null = null;
  let primaryLabel: string | null = null;
  const suppressed = new Set<Category>();

  for (const rule of PLATFORM_FIRST_RULES) {
    if (rule.detect.test(ocrText)) {
      if (!primaryCategory) {
        primaryCategory = rule.category;
        primaryLabel = rule.label;
      }
      for (const s of rule.suppress) suppressed.add(s);
    }
  }
  return { primaryCategory, primaryLabel, suppressed };
}

export function detectMapContext(ocrText: string): boolean {
  return /google maps|maps\.google|openstreetmap/i.test(ocrText);
}

export function scoreReceiptStructure(ocrText: string): { score: number; labels: string[] } {
  const checks: Array<{ re: RegExp; label: string; weight: number }> = [
    { re: /subtotal|grand total|net amt|amount due/i, label: 'totals', weight: 2 },
    { re: /\bsgst\b|\bcgst\b|\bgst\b|tax invoice|cash bill/i, label: 'tax_invoice', weight: 2 },
    { re: /\breceipt\b|\binvoice\b/i, label: 'document_type', weight: 1 },
    { re: /tot items|tot qty|total qty|qty\s*@|particulars/i, label: 'line_items', weight: 2 },
    { re: /\bfssai\b|thank you.*visit|visit again/i, label: 'merchant_footer', weight: 1 },
  ];

  let score = 0;
  const labels: string[] = [];
  for (const c of checks) {
    if (c.re.test(ocrText)) {
      score += c.weight;
      labels.push(c.label);
    }
  }
  return { score, labels };
}

export function hasStrongTravelEvidence(ocrText: string): boolean {
  return /\b(?:pnr|boarding pass|flight|airline|train|railway|irctc|departure|arrival|airport terminal|check-in|passenger name|hotel booking|itinerary)\b/i.test(ocrText);
}

export function hasStrongUpiEvidence(ocrText: string): boolean {
  const strong = /(?:paid to|sent to|payment successful|received from|paying to|transaction id|upi id|vpa|\bgpay\b|google pay|phonepe|paytm|bhim)/i;
  const amountWithContext = /(?:upi|gpay|google pay|phonepe|paytm|paid to|payment successful)[\s\S]{0,80}₹|₹[\s\S]{0,80}(?:upi|gpay|paid to|payment successful)/i;
  return strong.test(ocrText) || amountWithContext.test(ocrText);
}

export function decidePrimaryCategory(signals: ClassificationSignals): ClassificationResult {
  const text = signals.ocrText;

  if (signals.platformCategory) {
    return finalize(signals.platformCategory, 0.94, `${signals.platformLabel ?? 'Platform'} detected`);
  }

  if (signals.mapDetected && !signals.travelStrong) {
    return finalize('Other', 0.55, 'map UI without travel evidence');
  }

  if (signals.qrDecoded && signals.qrConfidence >= 0.7) {
    if (hasStrongUpiEvidence(text) || /\b(?:scan.*pay|paytm|phonepe|gpay|upi)\b/i.test(text)) {
      return finalize('UPI', 0.9, 'decodable QR with payment context');
    }
    if (signals.receiptStructureScore >= 4) {
      return finalize('Receipts', 0.88, 'decodable QR on receipt document');
    }
    return finalize('QR Code', 0.85, 'decodable QR code');
  }

  if (signals.receiptStructureScore >= 4 && !signals.platformSuppressed.has('Receipts')) {
    return finalize('Receipts', 0.9, `strong receipt structure (${signals.receiptSignalLabels.join(', ')})`);
  }

  if (signals.upiStrong && !signals.platformSuppressed.has('UPI')) {
    return finalize('UPI', 0.88, 'strong UPI/payment evidence');
  }

  if (signals.travelStrong && !signals.mapDetected) {
    return finalize('Travel', 0.86, 'strong travel ticket/booking evidence');
  }

  if (signals.ocrBestCategory && signals.hasStrongOcrMatch && signals.ocrBestScore >= 3) {
    if (!signals.platformSuppressed.has(signals.ocrBestCategory)) {
      const conf = Math.min(0.84, 0.45 + signals.ocrBestScore * 0.03);
      return finalize(signals.ocrBestCategory, conf, `OCR semantic match (score ${signals.ocrBestScore})`);
    }
  }

  const visionWithoutWeak = signals.visionCategories.filter(
    (c) => c !== 'Travel' && !signals.platformSuppressed.has(c)
  );
  if (visionWithoutWeak.length === 1) {
    const cat = visionWithoutWeak[0];
    if (cat === 'People' && signals.personDetected) {
      return finalize('People', 0.62, 'person detected visually');
    }
    if (cat === 'Food') {
      return finalize('Food', 0.55, 'food detected visually');
    }
  }

  if (signals.ocrBestCategory && signals.hasStrongOcrMatch && signals.ocrBestScore >= 5) {
    if (!signals.platformSuppressed.has(signals.ocrBestCategory)) {
      return finalize(signals.ocrBestCategory, 0.5, `moderate OCR evidence (score ${signals.ocrBestScore})`);
    }
  }

  return finalize('Other', 0.25, 'no strong semantic evidence');
}

function finalize(primary: Category, confidence: number, reason: string): ClassificationResult {
  return {
    primary,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    categories: [primary],
  };
}

export function logClassificationDebug(
  fileName: string,
  signals: ClassificationSignals,
  result: ClassificationResult
): void {
  console.log(`[CLASSIFIER] file="${fileName}"`);
  console.log(`[CLASSIFIER] platform=${signals.platformLabel ?? 'none'}`);
  console.log(`[CLASSIFIER] map=${signals.mapDetected} travelStrong=${signals.travelStrong}`);
  console.log(`[CLASSIFIER] receiptStructure=${signals.receiptStructureScore} (${signals.receiptSignalLabels.join(', ')})`);
  console.log(`[CLASSIFIER] qrDecoded=${signals.qrDecoded} qrConfidence=${signals.qrConfidence.toFixed(2)}`);
  console.log(`[CLASSIFIER] ocrBest=${signals.ocrBestCategory ?? 'none'} score=${signals.ocrBestScore}`);
  console.log(`[CLASSIFIER] primary=${result.primary} confidence=${result.confidence} reason=${result.reason}`);
}
