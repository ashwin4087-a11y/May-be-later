---
name: Maybe Later
colors:
  surface: '#f8f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#44474c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
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
  background: '#E8EDF2'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
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
  label-technical:
    fontFamily: IBM Plex Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 17px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 280px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is crafted for a premium, editorial-style personal archive. It rejects the frantic aesthetic of typical productivity tools in favor of a calm, sophisticated library experience. The visual language bridges the gap between high-end publishing and modern utility, evoking the feeling of a curated digital museum.

The style is **Premium Editorial**, characterized by:
- **Refined Contrast:** High-contrast serif headings paired with technical, functional sans-serif elements.
- **Spaciousness:** Generous margins and deep whitespace that allow archived content to breathe.
- **Cataloging Aesthetic:** Monospaced accents provide a sense of organization and archival precision without feeling industrial.
- **Soft Layering:** A palette of misty neutrals and slate tones creates a tactile, paper-like depth.

## Colors
The color palette is deliberately receding to ensure that archived imagery and screenshots remain the focal point of the interface.

- **Primary (Navy):** Used for foundational structural elements, site headers, and main action titles.
- **Secondary (Slate Blue):** Applied to interactive cues, iconography, and supporting navigation.
- **Tertiary/Accent (Gold):** Reserved for high-value states, such as favorited items or important highlights.
- **Surface (Near-White):** Used for cards, panels, and interactive components to create a layered effect against the background.
- **Background (Mist):** The base environment color, providing a soft, non-white canvas for the entire application.

## Typography
The typographic hierarchy reinforces the archival nature of the product through intentional contrast between serif elegance and monospaced utility.

- **Headings:** Use Fraunces with tight line heights and slightly negative letter spacing for a compact "ink-on-paper" aesthetic.
- **Body & UI:** IBM Plex Sans provides a neutral, highly legible framework for all functional interface elements.
- **Metadata:** Use IBM Plex Mono for timestamps, file sizes, and technical labels to add a "cataloging" aesthetic.

## Layout & Spacing
The layout utilizes a persistent left sidebar and a structured grid to maintain an organized, editorial feel.

- **Sidebar:** A fixed 280px left sidebar contains primary navigation and category filters.
- **Grid:** A 12-column grid for desktop with a maximum width of 1280px. Outside margins of 64px create a focused central column.
- **Rhythm:** Elements follow a "stacking" logic: 8px for metadata clusters, 16px for standard UI components, and 32px for major section breaks.
- **Masonry:** The main archive view uses a flexible masonry layout with 24px gutters to handle varying image aspect ratios gracefully.

## Elevation & Depth
Depth is conveyed through tonal layering and subtle strokes rather than heavy shadows, maintaining a flat, sophisticated paper-like quality.

- **Surface Tiers:** The Mist background (#E8EDF2) serves as the base. Content cards and panels sit on top using the Near-White (#F6F8FA) surface color.
- **Shadows:** Only used for floating elements (modals/dropdowns). Use a soft, tinted shadow: `0 4px 20px rgba(44, 57, 71, 0.05)`.
- **Outlines:** Define edges using 1px strokes of the Primary Navy color at 10% opacity for a delicate, restrained look.

## Shapes
Shapes are soft but maintain structural integrity. 

- **Interactive Elements:** Buttons and inputs use a standard 8px (0.5rem) radius.
- **Containers:** Large cards and screenshot containers use a more pronounced 16px (1rem) radius to feel more approachable.
- **Mini Browser Detail:** Screenshot containers must feature a header bar mimicking a browser window, using three muted dots at 40% opacity.

## Components
- **Buttons:** Primary buttons use the Navy background with white IBM Plex Sans text. Secondary buttons use a Slate Blue stroke with no fill.
- **Archive Cards:** Must include the "Mini Browser" header. Metadata (date/source) is positioned below the card in 12px IBM Plex Mono.
- **Navigation:** The persistent sidebar features high-contrast Fraunces headers for sections and IBM Plex Sans for links. Active states should be indicated by a subtle Slate Blue background highlight.
- **Chips/Tags:** Rendered in Slate Blue at 10% opacity for backgrounds with 100% opacity text. No border, 4px radius.
- **Input Fields:** Use a minimalist bottom-only border (Primary at 20%). Focus state transitions the border to 100% opacity Primary.
- **Status Indicators:** Use the Gold accent for "New" or "Unorganized" items to draw attention without signaling an error.