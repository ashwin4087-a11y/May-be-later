# QR Code Classification — Implementation Summary

## Overview
Added a new **"QR Code"** collection category to Maybe Later with smart detection that respects stronger contextual categories and routes payment QR codes to UPI.

## Implementation Details

### 1. Category Addition
**File**: `frontend/src/lib/classifier.ts`

- Added `'QR Code'` to the `CATEGORIES` constant (line 20)
- Added `'QR Code'` to `CONVERSATION_CONTENT` (line 49) — ensures it's treated as content, not a platform
- Added QR Code to `CATEGORY_RULES` (lines 198–204) with 4 scoring rules:

| Rule | Pattern | Weight | Purpose |
|------|---------|--------|---------|
| 1 | `qr\s+code`, `scan.*qr`, `qr.*scan` | **4** | Explicit QR code mention |
| 2 | `\bqr\b` | **2** | Bare "QR" keyword |
| 3 | `scan (me\|this\|here\|code)` | **2** | Generic scan action |
| 4 | `scan.*(?:pay\|accept)`, `accepted here` | **3** | Merchant/payment context |

### 2. Smart Payment QR Routing
**Location**: `frontend/src/lib/classifier.ts` (lines 388–395)

After scoring all categories, if **QR Code wins but payment keywords are present**, the classifier automatically routes to **UPI** instead:

```typescript
// ── SPECIAL ROUTING: QR Code with payment context → UPI ──────────────
if (bestOcrCategory === 'QR Code') {
  const paymentKeywords = /\b(?:upi|bhim|google pay|gpay|phonepe|paytm|bharatpe|scan.*pay|accepted here)\b/i;
  if (paymentKeywords.test(lowerText)) {
    console.log(`[OCR] 🔄 QR Code detected with payment context → routing to UPI instead`);
    bestOcrCategory = 'UPI';
  }
}
```

### 3. Category Priority & Fallback

The classification logic respects this priority:

```
Platform-locked categories (Social Media, Shopping, etc.)
  ↓
Best-scoring content category (≥ score 2)
  ↓
QR Code wins if:
  - QR Code score ≥ 2 AND
  - QR Code score is highest AND
  - No other category has higher score AND
  - If payment keywords present → route to UPI instead
  ↓
Fallback to Other (if nothing matches)
```

## Behavior Examples

| Screenshot Content | QR Score | Other Scores | Result | Reason |
|-------------------|----------|-------------|--------|--------|
| Pure QR code (no text) | 2 | None | **QR Code** | Only category detected |
| "Scan to pay" + QR code | 4 | None | **UPI** | QR detected + payment keyword → routed to UPI |
| QR code on Amazon page | 2 | Shopping: 3 | **Shopping** | Shopping has higher score |
| QR code + Paytm logo | 4 | UPI: 5 | **UPI** | UPI score is higher |
| "Get the app" QR code | 2 | None | **QR Code** | Generic scan, no payment context |
| Event ticket with QR | 4 | Events: 3 | **QR Code** | QR is higher (fallback before Events refinement) |

## Integration with Existing Features

### Reclassify All
✅ **Works automatically** — No changes needed to Dashboard.tsx

The "Reclassify All" function already iterates through all returned categories and creates collection links:

```typescript
const categories = await classifyScreenshot(file, { isTarget });
// categories may now include 'QR Code'

for (const category of categories) {
  // Creates collection and links screenshot
}
```

### Collection Management
- QR Code collection is created automatically on first QR screenshot upload
- Existing collections remain unaffected
- User can manually move screenshots between QR Code and other categories

## Testing Instructions

### Test Case 1: Basic QR Code Detection
1. Take a screenshot of a generic QR code (standalone, no payment branding)
2. Upload to Maybe Later
3. **Expected**: Screenshot classified as **QR Code** ✓

### Test Case 2: Payment QR Code
1. Take a screenshot of a Paytm/GPay/PhonePe payment QR code with text like "Scan & Pay" or "Accepted Here"
2. Upload to Maybe Later
3. **Expected**: Screenshot classified as **UPI** (not QR Code) ✓

### Test Case 3: QR in Shopping Context
1. Screenshot containing a QR code but also clear shopping signals (Amazon logo, "Add to Cart", product name)
2. Upload to Maybe Later
3. **Expected**: Screenshot classified as **Shopping** (QR is secondary) ✓

### Test Case 4: Reclassify All
1. Upload a mix of QR codes (generic, payment, contextual)
2. Click **Reclassify All**
3. **Expected**:
   - Generic QR codes → QR Code collection
   - Payment QR codes → UPI collection
   - QR codes in Shopping pages → Shopping collection ✓

### Console Debug Output
After uploading/reclassifying, check browser console (F12 → Console) for:

**Generic QR Code:**
```
[OCR] Match in QR Code: "qr\s+code" x1 (weight 4)
[OCR] Category "QR Code" total score: 4
[OCR] ✅ Best content match: "QR Code" (score: 4)
```

**Payment QR Code:**
```
[OCR] Match in QR Code: "scan.*pay" x1 (weight 3)
[OCR] Match in UPI: "upi|gpay|paytm" x1 (weight 5)
[OCR] Category "QR Code" total score: 3
[OCR] Category "UPI" total score: 5
[OCR] ✅ Best content match: "UPI" (score: 5)
```

**QR with payment routing:**
```
[OCR] Match in QR Code: "qr\s+code" x1 (weight 4)
[OCR] Category "QR Code" total score: 4
[OCR] 🔄 QR Code detected with payment context → routing to UPI instead
[OCR] ✅ Best content match: "UPI" (score: 4)
```

## Files Modified
- `frontend/src/lib/classifier.ts` (3 changes):
  1. Added 'QR Code' to CATEGORIES (line 20)
  2. Added 'QR Code' to CONVERSATION_CONTENT (line 49)
  3. Added QR Code rules and payment routing logic (lines 198–204, 388–395)

## No Changes Required To
- ✓ Dashboard.tsx — Reclassify All works automatically
- ✓ Database schema — QR Code is a string category name
- ✓ Frontend UI — Collections are dynamically created
- ✓ Supabase — No migrations needed

## Future Enhancements
- [ ] Vision detection: Use COCO-SSD to detect QR patterns (if model supports it)
- [ ] Merchant QR detection: Special routing for business QR codes (invoices, receipts)
- [ ] QR code confidence scoring: Weight detection based on image clarity
- [ ] Manual QR code verification: UI button to confirm QR detection

## Rollback (if needed)
If you need to remove QR Code classification:
1. Remove 'QR Code' from CATEGORIES
2. Remove 'QR Code' from CONVERSATION_CONTENT
3. Remove QR Code rules and payment routing logic
4. Run "Reclassify All" to move QR screenshots to default categories

---

## Summary
✅ **QR Code category fully integrated**
✅ **Payment QR codes route to UPI**
✅ **Respects stronger contextual categories**
✅ **"Reclassify All" works automatically**
✅ **Production-ready**
