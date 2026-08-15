# UPI Classifier Fix — Summary

## Problem
UPI/payment screenshots were being incorrectly classified as "Other" instead of "UPI". Example:
- ₹1,292
- "Pay again"
- "Completed"
- Recipient/phone number
- Transaction date/time

The old classifier only had 4 weak rules and scored a bare rupee symbol (₹) at weight 1, which was insufficient to compete with the minimum score threshold of 2.

## Solution
Strengthened UPI keyword scoring with 7 targeted rules:

### New UPI Scoring Rules (frontend/src/lib/classifier.ts, lines 117-124)

| Rule | Pattern | Weight | Purpose |
|------|---------|--------|---------|
| **1** | `upi\|bhim\|google pay\|gpay\|phonepe\|paytm\|bharatpe\|upi id\|vpa` | **5** | UPI platform brands/identifiers |
| **2** | `pay again\|retry payment\|make payment\|payment successful\|payment completed\|transaction successful` | **5** | Payment completion phrases |
| **3** | `paid to\|sent to\|received from\|paying to\|debited from\|credited to\|transferred to` | **5** | Transfer action phrases |
| **4** | `completed\|successfully completed` | **3** | Status indicators |
| **5** | `transaction(...)\|txn(...)\|ref(...) no?\|bank reference` | **3** | Transaction identifiers |
| **6** | `₹\s?\d[\d,]*(?:\.\d{2})?` | **2** | Rupee amount alone (not enough by itself) |
| **7** | **Proximity rule**: UPI keyword within 60 chars of rupee amount OR rupee amount within 60 chars of UPI keyword | **8** | Context-aware: amount + payment keyword together |

### Key Differences from Old Rules
- **Old**: 4 rules, rupee symbol weighted at 1 (too weak alone)
- **New**: 7 rules with contextual scoring
  - Platform brands: weight 5
  - Payment phrases: weight 5
  - Transfer actions: weight 5
  - Proximity bonus (amount + keyword): weight 8
  - Rupee amount alone: weight 2 (won't trigger UPI by itself)

### Minimum Score Threshold
Screenshots need a total score of **≥ 2** to qualify for a category. This means:
- **Just "₹1,292"** → Score 2 = Won't win (only matches proximity rule if payment keyword is nearby)
- **"Pay again" + "₹1,292"** → Score ~10–15 = Wins UPI (multiple high-weight rules match)
- **"GPay" + "Completed" + "₹1,292"** → Score ~15+ = Strongly wins UPI

### Shopping/Food Protection
- Rupee amount in Shopping category still has weight 1 (unchanged)
- Food category doesn't check currency symbols
- The new UPI rules require **multiple contextual signals**, not just "₹"
- Example: "₹500 shoes on Amazon" won't be reclassified as UPI because:
  - UPI score from amount: 2
  - Shopping score from "amazon": 3 (platform rule locks Shopping immediately)
  - Shopping platform rule suppresses UPI entirely

## Testing Instructions

### Step 1: Re-run the Classifier
Since the app loads the classifier logic into memory at runtime, you need to:
1. **Hard refresh the app** (or restart the dev server if running locally)
2. Go to Dashboard
3. Click the **"Reclassify All"** button (bottom of upload panel)
4. Confirm the dialog

### Step 2: Verify UPI Classification
After reclassification completes:

#### Method A: Check Collections
1. Navigate to the **Collections** page
2. Look for the **"UPI"** collection
3. Verify the previously-misclassified payment screenshot(s) now appear in UPI (not Other)

#### Method B: Console Logs (Detailed Debug)
The reclassifier will output detailed scoring logs. Open browser DevTools (F12 → Console) and search for:
```
[RECLASSIFY] Screenshot ID: <id> (payment_screenshot_filename)
[OCR] Category "UPI" total score: <number>
[SCORE] UPI: <score>
```

**Expected output for a UPI screenshot:**
```
[OCR] Match in UPI: "₹\s?\d[\d,]*(?:\.\d{2})?" x1 (weight 2)
[OCR] Match in UPI: "pay again" x1 (weight 5)
[OCR] Match in UPI: "completed" x1 (weight 3)
[OCR] Match in UPI: "<context proximity>" x1 (weight 8)
[OCR] Category "UPI" total score: 18
[SCORE] UPI: 18
[OCR] ✅ Best content match: "UPI" (score: 18)
```

### Step 3: Test Edge Cases
Manually upload these test screenshots and verify:

| Screenshot Content | Expected Category | Why |
|-------------------|------------------|-----|
| ₹500 shoes on Amazon | Shopping | Platform rule locks Shopping; suppresses UPI |
| ₹300 Zomato order | Food | Platform rule locks Food; UPI context not present |
| ₹1,292 transaction completed Pay again | UPI | Multiple weight-3+ UPI keywords without platform lock |
| WhatsApp "Sent ₹500" | Social Media | Platform rule locks Social Media; suppresses UPI |
| Bank statement with transaction | UPI | "transaction id" + "₹" triggers UPI |

### Step 4: Check That Other Categories Still Work
Verify that existing categories were not broken:
- Upload a shopping screenshot (Amazon product page) → Should be **Shopping** (not Other)
- Upload a social media screenshot (Instagram post) → Should be **Social Media** (not Other)
- Upload a food/restaurant screenshot (Zomato menu) → Should be **Food** (not Other)
- Upload a generic screenshot (e.g., notes app) → Should be **Other** (if no strong signals match)

## Files Modified
- **frontend/src/lib/classifier.ts** (lines 117–124)
  - Replaced 4 weak UPI rules with 7 contextual rules
  - Moved `scores` variable outside try-catch for proper scoping (lines 316–318)
  - Removed duplicate `scores` declaration (was on line 356)

## Database & Collection Changes
**No changes to schema or database migrations needed.** The fix:
- Reuses existing "UPI" collection (already in CATEGORIES constant)
- Uses existing `screenshot_collections` junction table for links
- "Reclassify All" deletes old links and creates new ones atomically per screenshot

## Future Improvements
- Add more Indian payment app keywords (WhatsApp Pay, BharatQR, etc.)
- Train a small ML model specifically for payment detection
- Add OCR confidence scoring to weight text extraction accuracy
- Allow manual collection override without triggering re-classification

## Deployment Notes
- **Frontend change only** — no backend changes needed
- Browser cache may need clearing: `Ctrl+Shift+R` or `Cmd+Shift+R` on Mac
- If using a dev server, restart with `npm run dev`
- Running "Reclassify All" re-processes all existing screenshots instantly
