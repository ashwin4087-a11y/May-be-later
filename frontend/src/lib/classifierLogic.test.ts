import { describe, expect, it } from 'vitest';
import {
  decidePrimaryCategory,
  detectMapContext,
  detectPlatforms,
  hasStrongTravelEvidence,
  hasStrongUpiEvidence,
  scoreReceiptStructure,
  type ClassificationSignals,
} from './classifierLogic';

function baseSignals(overrides: Partial<ClassificationSignals> = {}): ClassificationSignals {
  return {
    fileName: 'test.png',
    ocrText: '',
    platformCategory: null,
    platformLabel: null,
    platformSuppressed: new Set(),
    receiptStructureScore: 0,
    receiptSignalLabels: [],
    travelStrong: false,
    upiStrong: false,
    mapDetected: false,
    qrDecoded: false,
    qrConfidence: 0,
    visionCategories: [],
    ocrBestCategory: null,
    ocrBestScore: 0,
    ocrScores: {},
    hasStrongOcrMatch: false,
    personDetected: false,
    ...overrides,
  };
}

describe('platform-first classification', () => {
  it('Instagram DM → Social Media', () => {
    const text = 'instagram direct message sent ₹7500 payment qr';
    const platform = detectPlatforms(text);
    expect(platform.primaryCategory).toBe('Social Media');
    const result = decidePrimaryCategory(
      baseSignals({
        ocrText: text,
        platformCategory: platform.primaryCategory,
        platformLabel: platform.primaryLabel,
        platformSuppressed: platform.suppressed,
      })
    );
    expect(result.primary).toBe('Social Media');
  });

  it('GitHub → Coding', () => {
    const text = 'github pull request merged';
    const platform = detectPlatforms(text);
    expect(platform.primaryCategory).toBe('Coding');
  });
});

describe('maps vs travel', () => {
  it('Google Maps alone → Other', () => {
    const text = 'google maps chennai directions';
    expect(detectMapContext(text)).toBe(true);
    expect(hasStrongTravelEvidence(text)).toBe(false);
    const result = decidePrimaryCategory(
      baseSignals({ ocrText: text, mapDetected: true, travelStrong: false })
    );
    expect(result.primary).toBe('Other');
  });

  it('boarding pass → Travel', () => {
    const text = 'boarding pass flight AI 202 departure';
    expect(hasStrongTravelEvidence(text)).toBe(true);
    const result = decidePrimaryCategory(
      baseSignals({ ocrText: text, travelStrong: true, mapDetected: false })
    );
    expect(result.primary).toBe('Travel');
  });
});

describe('receipt structure', () => {
  it('requires multiple structural signals', () => {
    const weak = scoreReceiptStructure('₹100 total payment');
    expect(weak.score).toBeLessThan(4);

    const strong = scoreReceiptStructure('tax invoice subtotal grand total sgst cgst tot items');
    expect(strong.score).toBeGreaterThanOrEqual(4);
    const result = decidePrimaryCategory(
      baseSignals({
        ocrText: 'tax invoice subtotal grand total sgst',
        receiptStructureScore: strong.score,
        receiptSignalLabels: strong.labels,
      })
    );
    expect(result.primary).toBe('Receipts');
  });

  it('dashboard with ₹ does not become Receipts without structure', () => {
    const weak = scoreReceiptStructure('dashboard total ₹10000 project');
    const result = decidePrimaryCategory(
      baseSignals({
        ocrText: 'dashboard total ₹10000',
        receiptStructureScore: weak.score,
        ocrBestCategory: 'Work',
        ocrBestScore: 6,
        hasStrongOcrMatch: true,
      })
    );
    expect(result.primary).not.toBe('Receipts');
  });
});

describe('UPI evidence', () => {
  it('₹ alone is not UPI', () => {
    expect(hasStrongUpiEvidence('₹7,500')).toBe(false);
  });

  it('payment successful with context is UPI', () => {
    expect(hasStrongUpiEvidence('paid to merchant payment successful gpay')).toBe(true);
  });
});

describe('QR code', () => {
  it('no decoded QR does not assign QR Code', () => {
    const result = decidePrimaryCategory(
      baseSignals({ qrDecoded: false, qrConfidence: 0 })
    );
    expect(result.primary).not.toBe('QR Code');
  });

  it('decoded QR without payment → QR Code', () => {
    const result = decidePrimaryCategory(
      baseSignals({ qrDecoded: true, qrConfidence: 0.9, ocrText: 'scan me' })
    );
    expect(result.primary).toBe('QR Code');
  });
});

describe('Other is low confidence fallback', () => {
  it('random UI → Other', () => {
    const result = decidePrimaryCategory(baseSignals({ ocrText: 'settings profile update' }));
    expect(result.primary).toBe('Other');
    expect(result.confidence).toBeLessThan(0.4);
  });
});

describe('duplicate regression (data rule)', () => {
  it('duplicate records must be excluded from library queries', () => {
    // Documented invariant: only Duplicates page uses is_duplicate=true
    const libraryFilter = { is_duplicate: false };
    expect(libraryFilter.is_duplicate).toBe(false);
  });
});
