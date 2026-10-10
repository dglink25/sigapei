---
name: SIGAPEI Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#3f4941'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#6f7a70'
  outline-variant: '#bec9be'
  surface-tint: '#046d3e'
  primary: '#00502c'
  on-primary: '#ffffff'
  primary-container: '#006b3c'
  on-primary-container: '#90e9ad'
  inverse-primary: '#81d99f'
  secondary: '#7c5800'
  on-secondary: '#ffffff'
  secondary-container: '#fdbb33'
  on-secondary-container: '#6d4d00'
  tertiary: '#4a4534'
  on-tertiary: '#ffffff'
  tertiary-container: '#625d4a'
  on-tertiary-container: '#ded6be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9df6b9'
  primary-fixed-dim: '#81d99f'
  on-primary-fixed: '#00210f'
  on-primary-fixed-variant: '#00522d'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#fdbb33'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ebe2ca'
  tertiary-fixed-dim: '#cec6af'
  on-tertiary-fixed: '#1f1c0d'
  on-tertiary-fixed-variant: '#4b4735'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes the visual and structural standard for official academic administration and pedagogical operations across West African primary, secondary, and high school institutions. The visual personality balances statutory authority, modern administrative efficiency, and rigorous functional clarity.

### Personality & Tone
- **Institutional Reliability:** Robust, formal, and authoritative. Administrative records, evaluation rosters, and tuition balances (FCFA) demand absolute clarity and zero decorative ambiguity.
- **Academic Modernity:** Contemporary digital governance optimized for varied connectivity, high ambient sunlight environments, and rapid mobile-first data entry by academic staff and parents.
- **Approachable Authority:** The signature combination of institutional green, warm gold, and gentle cream balances administrative prestige with welcoming educational stewardship.

### Visual Style
The design style follows an **Institutional / Modern Corporate** movement. It relies on clean, high-contrast typography, strict layout grids, understated borders, and deliberate functional color assignment to guarantee legibility across complex administrative tables, grade registries, and pedagogical dashboards.

## Colors

The color palette reinforces operational order and functional prioritization across administrative portals.

### Primary Palette
- **Primary (`#006B3C`):** Institutional green. Designated for institutional navigation, top navigation app bars, primary section headers, verified badges, and grounding structural framing.
- **Secondary / Accent (`#E9AA20`):** SIGAPEI gold. Used strictly for high-visibility operational triggers, contextual highlights, pending status notifications, and high-priority primary actions.
- **Tertiary / Soft Surface (`#FFF6DD`):** Cream. Serves as a softened surface background for featured metric cards, pedagogical announcements, and high-contrast containers set against deep green headers.
- **Neutral Base (`#111827`):** Deep charcoal-black for authoritative body text, table data, and primary labels, ensuring compliance with strict contrast requirements.

### Functional Neutrals & Accents
- **Canvas Background:** `#F8FAF9` (light sage-tinted paper) and `#FFFFFF` (pure surface for tabular data cards).
- **Subtle Borders & Separators:** `#E5E7EB` for strict, clean cell dividers and card outlines.
- **Secondary Metadata:** `#6B7280` for secondary captions, timestamps, and academic tracking IDs.
- **Status / Critical Alert:** `#DC2626` (brick red) for administrative holds, late payment flags, and disciplinary notices.

## Typography

The typography is built entirely on **Inter** to ensure maximum legibility for administrative ledgers, student registration numbers, and currency values (e.g., `250 000 FCFA`).

### Guidelines
- **Tabular Figures:** Always apply `font-feature-settings: "tnum"` on all monetary listings, student roll numbers, and grade averages to prevent visual jitter across lists.
- **Headings:** Headings use bold (`700`) and semi-bold (`600`) weights with slight negative letter spacing on larger sizes for authoritative presentation.
- **Body Hierarchy:** Standard body text is maintained at `15px` to `16px` with an open line-height (`1.5` ratio) to reduce eye fatigue during prolonged record verification.

## Layout & Spacing

This design system uses an 8pt-based fluid layout system designed mobile-first to support teachers entering notes on smartphones and administrators operating desktop consoles.

### Breakpoints & Grids
- **Mobile (< 768px):** 4-column fluid grid, `margin: 1rem`, `gutter: 1rem`. Bottom action sheets and full-width stacked forms.
- **Tablet (768px - 1024px):** 8-column grid, `margin: 1.5rem`, `gutter: 1rem`. Collapsible navigation rail for classroom listings and schedule views.
- **Desktop (> 1024px):** 12-column grid, `margin: 2.5rem`, `gutter: 1.5rem`. Fixed institutional sidebar (260px) with split pedagogical work panes.

### Rhythm
All spatial distances between structural components adhere to the tokenized spacing scale, maintaining consistent rhythm between academic terms, class cohorts, and operational summary panels.

## Elevation & Depth

Visual hierarchy uses clean surface separation, subtle neutral boundaries, and soft ambient drop shadows to preserve readability under high brightness.

### Tiers
- **Flat Surface (Level 0):** Used for base page canvas (`#F8FAF9`) and nested sub-panels. Zero elevation, delineated by `#E5E7EB` borders.
- **Administrative Card (Level 1):** Standard student profiles, class rosters, and grade tables. Background `#FFFFFF`, 1px solid `#E5E7EB`, shadow: `0 1px 3px rgba(17, 24, 39, 0.05), 0 1px 2px rgba(17, 24, 39, 0.03)`.
- **Featured / Accent Card (Level 2):** Important term notices and fee reminders (`#FFF6DD` surface). Shadow: `0 4px 6px -1px rgba(0, 107, 60, 0.08), 0 2px 4px -2px rgba(0, 107, 60, 0.04)`.
- **Floating Overlays & Modals (Level 3):** Administrative modals, validation drawers, and search palettes. Shadow: `0 10px 15px -3px rgba(17, 24, 39, 0.1), 0 4px 6px -4px rgba(17, 24, 39, 0.05)`.

## Shapes

The shape scale sets a controlled roundedness profile (`roundedness: 2`), projecting institutionality and software durability without rigid harshness.

### Application Rules
- **Base Elements (`rounded: 0.5rem` / `8px`):** Input fields, inline table selects, action buttons, and dropdown menus.
- **Containers & Cards (`rounded-lg: 1rem` / `16px`):** Student record cards, module progress panels, and alert banners.
- **Sheets & Modals (`rounded-xl: 1.5rem` / `24px`):** Bottom interaction sheets on mobile devices and central dialogue cards on desktop.
- **Pill Elements (`rounded-full: 9999px`):** Status badges, avatar counters, and filter tags.

## Components

### Buttons
- **Primary Operational Action:** Background `#E9AA20`, text `#111827`, font-weight `600`. Dedicated to definitive triggers (e.g., "Enregistrer les notes", "Valider l'inscription"). Hover: `#D49615`. Focus: 2px ring `#006B3C` with 2px offset.
- **Institutional / Navigation Action:** Background `#006B3C`, text `#FFFFFF` (or `#FFF6DD`), font-weight `600`. Used for system navigation, data exports, and standard administrative actions. Hover: `#005530`.
- **Secondary / Ghost Action:** Border 1px solid `#E5E7EB`, background `#FFFFFF`, text `#111827`. Hover: `#F8FAF9`.

### Badges & Status Indicators
- **Validé / Conforme:** Background `#E6F3EC`, text `#006B3C`, border 1px solid `#B8E0CC`.
- **En attente / Traitement:** Background `#FEF6E7`, text `#966606`, border 1px solid `#FBDC96`.
- **Retard / Alerte administrative:** Background `#FEE2E2`, text `#DC2626`, border 1px solid `#FCA5A5`.
- **Format:** All badges use `label-sm` or `label-md`, `rounded-full`, with horizontal padding `space-sm` and vertical padding `space-xs`.

### Cards & Panels
- **Standard Card:** Surface `#FFFFFF`, border 1px solid `#E5E7EB`, radius `16px`, internal padding `space-lg`.
- **Featured / Summary Card:** Surface `#FFF6DD`, border 1px solid `#F3E1B1`, radius `16px`, text `#111827`. Used for key quarterly performance indicators and tuition summaries.

### Input Fields & Controls
- **Inputs:** Height 44px (touch-friendly), background `#FFFFFF`, border 1px solid `#E5E7EB`, text `#111827`, radius `8px`. Active focus state triggers a solid border `#006B3C` with a soft box-shadow `0 0 0 3px rgba(0, 107, 60, 0.15)`.
- **Checkboxes & Radios:** Primary accent color `#006B3C` with high-contrast white ticks. Size `18px`, radius `4px` (checkbox) and `50%` (radio).

### Data Tables (Rosters & Grade Books)
- Headers in `#F8FAF9` background with `#006B3C` or `#6B7280` semi-bold text, uppercase `11px`, border bottom 2px solid `#E5E7EB`.
- Alternating row zebra subtle shading (white / `#FAFBFB`) to assist fast horizontal reading across student matricule numbers and coefficients.