---
name: Curated Archive
colors:
  surface: '#f5faff'
  surface-dim: '#d5dbe0'
  surface-bright: '#f5faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4f9'
  surface-container: '#e9eef3'
  surface-container-high: '#e4e9ee'
  surface-container-highest: '#dee3e8'
  on-surface: '#171c20'
  on-surface-variant: '#44474c'
  inverse-surface: '#2c3135'
  inverse-on-surface: '#ecf1f6'
  outline: '#74777c'
  outline-variant: '#c4c6cc'
  surface-tint: '#52606f'
  primary: '#162431'
  on-primary: '#ffffff'
  primary-container: '#2c3947'
  on-primary-container: '#95a2b3'
  inverse-primary: '#bac8d9'
  secondary: '#3c627c'
  on-secondary: '#ffffff'
  secondary-container: '#b8dffd'
  on-secondary-container: '#3d637d'
  tertiary: '#2f2000'
  on-tertiary: '#ffffff'
  tertiary-container: '#483507'
  on-tertiary-container: '#ba9e66'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e4f6'
  primary-fixed-dim: '#bac8d9'
  on-primary-fixed: '#0f1d2a'
  on-primary-fixed-variant: '#3b4856'
  secondary-fixed: '#c8e6ff'
  secondary-fixed-dim: '#a5cbe9'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#224b64'
  tertiary-fixed: '#ffdea2'
  tertiary-fixed-dim: '#e1c388'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#594415'
  background: '#f5faff'
  on-background: '#171c20'
  surface-variant: '#dee3e8'
  surface-card: '#F6F8FA'
typography:
  display-lg:
    fontFamily: Fraunces
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Fraunces
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 38px
  display-md:
    fontFamily: Fraunces
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 35px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Fraunces
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 29px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 29px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 17px
    letterSpacing: 0.05em
  label-technical:
    fontFamily: IBM Plex Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  max-width: 1280px
---

## Brand & Style
The design system is an editorial-style personal archive, shifting the user experience from frantic productivity to a calm, sophisticated library environment. It blends the authority of high-end publishing with the utility of modern software to evoke a sense of permanence and order.

The style is **Premium Editorial**, characterized by:
- **Refined Contrast:** High-contrast serif headings paired with technical sans-serif and monospaced functional elements.
- **Spacious Layouts:** Generous margins and deep whitespace to allow archived imagery to breathe.
- **Sophisticated Utility:** Catalog-inspired monospaced accents that provide organizational clarity.
- **Tactile Softness:** A layered surface approach using receding tones that evoke high-quality paper and museum-grade displays.

**Logomark:** The standard logomark is a navy rounded square featuring a small gold triangle corner, symbolizing a bookmarked or curated entry.

## Colors
The palette uses specific, non-derived hex codes to maintain an intentional editorial tone. The colors are designed to be receding, ensuring the user's archived content remains the focal point.

- **Primary (#2C3947):** Used for foundational elements—site headers, page titles, and primary action buttons.
- **Secondary (#547A95):** Used for interactive cues, iconography, and supporting navigation links.
- **Tertiary/Accent (#C2A56D):** A warm gold reserved for high-value moments, such as "Favorited" states, primary CTA highlights, and the logomark accent.
- **Background/Surface:** The page environment uses **#E8EDF2**, while interactive components and content cards use **#F6F8FA** to create a subtle layered effect without relying on heavy shadows.

## Typography
The typographic scale reinforces the "Archive" nature of the product through mixed classifications.

- **Display & Headings:** Utilize high-contrast serifs with tight line heights. Large titles use slightly negative letter spacing to create a compact, "ink-on-paper" look.
- **Functional UI:** Neutral sans-serifs provide a highly legible framework for navigation and settings.
- **Metadata:** Monospaced fonts are used for all timestamps, file sizes, and technical labels to reinforce the aesthetic of a curated catalog.

## Layout & Spacing
This design system utilizes a **Fixed Grid** for desktop and a **Fluid Margin** for mobile.

- **Desktop Grid:** A 12-column grid with a maximum width of 1280px. Wide 64px outside margins create a focused editorial column in the center.
- **Mobile Grid:** Fluid 20px margins with a single column layout.
- **Spacing Rhythm:** Content is grouped in vertical "stacks." Small stacks (8px) for metadata, medium stacks (16px) for form elements, and large stacks (32px) for section breaks.
- **Masonry View:** The screenshot archive uses a flexible masonry layout with 24px gutters to accommodate various aspect ratios while maintaining vertical rhythm.

## Elevation & Depth
The system avoids heavy shadows in favor of **Tonal Layering** and **Subtle Outlines**.

- **Surface Levels:** The primary background (#E8EDF2) is the lowest level. Cards and panels sit on the Surface Card color (#F6F8FA).
- **Shadows:** Use a single, ultra-soft shadow for floating elements like modals or active cards: `0 4px 20px rgba(44, 57, 71, 0.05)`.
- **Borders:** Use 1px strokes in the Primary color at 10% opacity to define edges where contrast is low.
- **Mini Browser Effect:** Screenshots are wrapped in a container with a dark primary-colored title bar (8% height) and three muted circular dots (red, yellow, green) at 40% opacity.

## Shapes
Shapes are soft but structured to maintain a premium feel.

- **Standard Radius:** Apply an 8px radius to buttons, input fields, and small cards.
- **Content Cards:** Screenshot containers and larger panels use a 16px (rounded-lg) radius to appear more approachable.
- **Interactive States:** On hover, internal card images subtly scale (1.02x) within their rounded container rather than the card itself growing.

## Components
- **Buttons:** Primary buttons use #2C3947 background with white text (Medium weight). Secondary buttons use a #547A95 outline with no fill.
- **Archive Cards:** Must feature the "Mini Browser" header. Metadata (date/source) is positioned below the card using the monospaced font at 12px.
- **Chips/Tags:** Use #547A95 at 10% opacity for the background and 100% for the text. No border, 4px radius.
- **Input Fields:** Bottom-only border (Primary color at 20% opacity). On focus, the border transitions to 100% opacity with a 2px vertical offset.
- **Navigation:** Vertical sidebar on desktop. Section headers use high-contrast serifs. The navigation group must follow the sequence: **Needs Review**, **Duplicates**, and **Import**.
- **Status Indicators:** Use the Tertiary Gold (#C2A56D) for "Unorganized" or "New" states to catch the eye without signaling an error.