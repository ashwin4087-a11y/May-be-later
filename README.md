# Maybe Later

A personal screenshot archive that helps you **save, understand, organize, and retrieve everything you screenshot**.

Maybe Later turns a messy screenshot folder into a searchable, structured personal library using OCR, visual detection, automatic classification, collections, favorites, duplicate detection, and original-file downloads.

## What it does

- **Import screenshots** through the web app with drag-and-drop/file selection.
- **Automatically classify screenshots** using OCR, visual detection, platform fingerprints, and contextual rules.
- **Organize into collections** such as UPI, Receipts, Travel, Entertainment, People, Certificates, and more.
- **Detect duplicates** using SHA-256 image hashing so identical files are identified without relying on filenames. fileciteturn21file0L2-L3
- **Favorites** let users manually star screenshots and browse them in a dedicated view.
- **Needs Review / Unorganized** provide safe fallbacks for screenshots that need manual organization.
- **Download originals as ZIP files** from All Items, Favorites, and Collections using the original stored files rather than thumbnails. fileciteturn20file0L2-L2
- **Bulk cleanup** supports selection and deletion while keeping duplicate handling separate from normal library items.
- **Screenshot modal navigation** lets users move through the current view or collection without closing the modal.

## Classification approach

Classification is designed around **strong evidence rather than keyword accumulation**.

The current pipeline combines:

1. Platform-first fingerprints for services such as Instagram, WhatsApp, Amazon, YouTube, Spotify, and others.
2. OCR-based category rules with weighted evidence.
3. Vision signals from TensorFlow/COCO-SSD.
4. Dedicated visual QR-code detection.
5. Contextual resolution between categories such as UPI, Receipts, Travel, Entertainment, and QR Code.
6. A conservative `Other` fallback when the evidence is insufficient.

The classifier currently includes dedicated rules for categories including UPI, Travel, Food, Entertainment, Receipts, Documents, Certificates, People, QR Code, and Other. fileciteturn17file0L2-L2

## Main views

- **Gallery** — recent screenshot dashboard and import entry point.
- **Collections** — category-based organization.
- **All Items** — complete non-duplicate library.
- **Favorites** — manually starred screenshots.
- **Needs Review** — screenshots routed to the review workflow.
- **Unorganized** — screenshots with no collection assignment.
- **Duplicates** — duplicate management and cleanup.
- **Settings** — application preferences and controls.

These routes are protected behind the authenticated layout. fileciteturn16file0L2-L2

## Tech stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- TanStack React Query
- Tailwind CSS
- Framer Motion
- Lucide React

### AI / image processing

- Tesseract.js for OCR
- TensorFlow.js
- COCO-SSD for object detection
- Browser/native image processing for QR detection

### Backend / storage

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase SQL migrations

### Downloads

- JSZip for client-side ZIP generation with controlled download concurrency. fileciteturn20file0L2-L2

## Project structure

```text
May-be-later/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── types/
│   └── package.json
├── supabase/
│   └── migrations/
├── backend/
└── *.md
```

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/ashwin4087-a11y/May-be-later.git
cd May-be-later/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `frontend/.env` using the existing `.env.example` as a template.

Typical variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Never commit real environment secrets. The repository is configured to ignore local environment files.

### 4. Start the development server

```bash
npm run dev
```

The Vite development server will print the local URL, typically `http://localhost:5173/`.

### 5. Verify a production build

```bash
npx tsc --noEmit
npm run build
```

## Supabase setup

The repository contains SQL migrations for screenshots, storage policies, collections, duplicate detection, and favorites.

When setting up a fresh Supabase project, apply the migrations in `supabase/migrations/` in order and configure the required storage/auth policies.

## Duplicate detection

Duplicates are detected using a SHA-256 hash of the image bytes and stored with `image_hash`, `duplicate_of`, and `is_duplicate` metadata. Duplicate uploads can be recorded without uploading another copy of the original file, and reclassification skips duplicate records. fileciteturn21file0L2-L2

## Original downloads

The app can package original files into ZIP archives from:

- Collections
- All Items / Originals
- Favorites

The shared download utility fetches originals directly from Supabase Storage and uses controlled concurrency to reduce network pressure. fileciteturn20file0L2-L2

## Current status

Maybe Later is an active MVP under development. The core archive, classification, organization, favorites, duplicate handling, and original-download workflows are implemented. Classification accuracy and large-library performance are still being refined through real-world testing.

## License

No open-source license has been specified yet.
