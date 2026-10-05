---
name: SUNNAH LENS
description: A quiet reading room for finding hadith by meaning across the six books.
colors:
  masjid-green: "#1B5E20"
  masjid-green-deep: "oklch(39.3% 0.095 152.535)"
  masjid-green-mist: "#E8F5E9"
  focus-green: "oklch(52.7% 0.154 150.069)"
  vellum: "#FFFDF7"
  page-white: "#FFFFFF"
  ink: "#1A1A1A"
  binding-thread: "#E8E0D4"
  stone-ink: "oklch(26.8% 0.007 34.298)"
  stone-text: "oklch(44.4% 0.011 73.639)"
  stone-muted: "oklch(55.3% 0.013 58.071)"
  stone-faint: "oklch(70.9% 0.01 56.259)"
  stone-rule: "oklch(86.9% 0.005 56.366)"
  stone-hairline: "oklch(97% 0.001 106.424)"
typography:
  display:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-arabic:
    fontFamily: "Noto Sans Arabic, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 2
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "24px"
  section: "80px"
  hero: "96px"
components:
  button-primary:
    backgroundColor: "{colors.masjid-green}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.lg}"
    padding: "8px 20px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.masjid-green-deep}"
  button-ghost:
    textColor: "{colors.masjid-green}"
    rounded: "{rounded.lg}"
    padding: "8px 20px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.masjid-green-mist}"
  button-lg:
    rounded: "{rounded.lg}"
    padding: "0 32px"
    height: "48px"
  input-search:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px 8px 40px"
    height: "40px"
  card-hadith:
    backgroundColor: "{colors.page-white}"
    rounded: "{rounded.xl}"
    padding: "24px"
  badge-collection:
    backgroundColor: "{colors.masjid-green}"
    textColor: "{colors.page-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
  badge-book:
    backgroundColor: "{colors.stone-hairline}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
  badge-grade:
    backgroundColor: "{colors.masjid-green-mist}"
    textColor: "{colors.masjid-green}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
  callout-explainer:
    backgroundColor: "{colors.masjid-green-mist}"
    textColor: "{colors.stone-text}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: SUNNAH LENS

## Overview

**Creative North Star: "The Quiet Library"**

SUNNAH LENS is a reading room, not a storefront. The ground is warm vellum, the single voice is a deep Masjid Green, and everything between them is a soft range of warm stone greys. The interface stays out of the way so a narration can be read slowly, in both English and Arabic, with its source plainly in view. Nothing competes with the text.

The mood is calm and reverent. Space is generous. Sections breathe at 80–96px, content sits in a narrow centered column (64rem at most, 48rem for reading), and there is one sticky bar of navigation. Depth is barely there: cards rest on the page with a hairline border and the faintest shadow, and lift slightly only when a hand reaches for them. Motion is limited to colour and shadow transitions. Nothing bounces, slides or announces itself.

Components are soft and unassuming. Gently rounded corners, thin warm borders and quiet fills let them frame the text without ever becoming the subject.

**Key Characteristics:**
- Warm vellum ground with white reading surfaces on top of it.
- One brand colour, Masjid Green, used for the name, headings, icons, primary actions and attribution.
- Warm stone greys for all secondary text; never cool or blue greys.
- Arabic text set as a full peer of the English: right-to-left, Noto Sans Arabic, extra line height.
- Hairline borders and a whisper of shadow; elevation responds to hover, not to importance.

## Colors

A single deep green over warm paper. Restraint is the whole palette.

### Primary
- **Masjid Green** (`--primary`): the one brand colour. Used for the SUNNAH LENS wordmark, page headings, icons, inline emphasis (`<strong>` labels in explainers), links, the active nav item and primary buttons. It is canonical, and every control (buttons, badges, checkboxes) uses this token.
- **Masjid Green Deep** (`--primary-deep`): the hover state of primary buttons. Use it only as a state, never as resting colour.
- **Masjid Green Mist** (`--primary-light`): the single green tint. It appears at full strength behind the grade badge and as the text-selection highlight, at 60% as the hover fill for ghost and outline buttons, and at 50% behind explainer callouts under a 20%-opacity Masjid Green border.
- **Focus Green** (`--ring`): the 2px focus ring on every interactive element, with a 2px offset.

### Neutral
- **Vellum** (`--background`): the page ground behind everything, including the translucent sticky navbar (80% opacity with backdrop blur).
- **Page White**: reading surfaces such as hadith cards, collection cards, inputs and the filter panel. White on vellum is the main layering move.
- **Ink** (`--foreground`): the base text colour.
- **Binding Thread** (`--border`): the warm beige border on cards, panels, the navbar and the footer, and the section dividers.
- **Stone Ink**: English hadith text and card titles.
- **Stone Text**: body copy in explainers and Arabic narration text.
- **Stone Muted**: secondary copy, narrator lines and the hero paragraph. This is the most common text colour on the site.
- **Stone Faint**: metadata such as hadith numbers, % match, counts, search icons and placeholders.
- **Stone Rule**: the border on inputs and outline badges.
- **Stone Hairline**: the in-card divider above the grade row, and the secondary badge fill.

- **Danger** (`--danger`, #B42318): error messages only, never decoration. It is a state colour, not a second accent.

### Named Rules
**The One Voice Rule.** Masjid Green is the only colour with an opinion. Everything else is warm neutral. Never introduce a second accent hue for decoration.

**The Warm Grey Rule.** Neutrals come from the stone family, which has a warm, slightly brown undertone. Cool greys (`slate`, `gray`, `zinc`) never appear.

## Typography

**Body Font:** Public Sans, falling back to Noto Sans Arabic so that ﷺ and ﷻ inside English text render at text size (then system sans-serif)
**Arabic Font:** Noto Sans Arabic (fallback: sans-serif)

**Character:** Public Sans is a plain-spoken, institutional sans. It reads like a well-made public library sign: clear, neutral and trustworthy. Noto Sans Arabic matches its weight and openness so that the two scripts sit side by side as equals.

### Hierarchy
- **Display**: the SUNNAH LENS wordmark in the hero only, in Masjid Green.
- **Headline**: section and page headings in Masjid Green, with tight tracking.
- **Title**: card titles, such as collection names and feature headings.
- **Body**: hadith English text and explanatory prose. Reading measure is kept narrow by `max-w-2xl` / `max-w-3xl` containers (about 65–75 characters).
- **Body Arabic**: Arabic narration, always `dir="rtl"`, one step larger than the English with loose (2.0) leading so diacritics never collide.
- **Label**: badges, counts and metadata.

### Named Rules
**The Equal Scripts Rule.** Arabic is never shrunk, greyed into a footnote or truncated relative to the English. It gets a larger size and looser leading to compensate for script density.

**The Caps Wordmark Rule.** "SUNNAH LENS" is always set in capitals, bold, with tight tracking, in Masjid Green. It is the only all-caps text in the system.

## Layout

There is a single centered column. Page containers cap at 64rem (`max-w-5xl`) with 24px side gutters, and reading and search areas narrow further to 48rem (`max-w-3xl`). The navbar is 64px tall, sticky and translucent. Marketing sections stack vertically, separated by a Binding Thread top border, with 64–96px of vertical padding. The hero is fully centered.

Grids are used only for sets of equal things: the four "Why Learn the Sunnah" features (1 → 2 → 4 columns at `sm` / `lg`) and the collection cards in the directory. Search results are a single vertical list of hadith cards. Spacing inside components follows a 4px base: 8 and 12px gaps between inline items, and 24px card padding.

## Elevation & Depth

The system is nearly flat. Depth comes mainly from tonal layering (white surfaces on vellum, outlined by Binding Thread) and only secondarily from shadow. Resting cards, inputs and buttons carry the smallest shadow, just enough to separate white from vellum. On hover, interactive cards step up one level, and collection cards also rise 2px. Nothing ever floats higher than that.

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): cards, inputs, buttons and the default badge at rest.
- **Reached** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): hover state of hadith and collection cards only.

### Named Rules
**The Hand-Reach Rule.** Elevation is a response to the pointer, never a signal of importance. No surface rests above the Resting shadow.

## Shapes

Corners are gently rounded and consistent by size class. Large reading surfaces (cards) use the xl radius, controls (buttons, inputs, panels, callouts) use lg, and small labels (badges, small buttons) use md. Borders are always 1px. There are no pills, circles or sharp corners on containers, and no decorative shapes, dividers or ornament. The only geometry is the content's own.

## Components

### Buttons
Quiet and dependable: a solid green fill for the one thing to do, a ghost for everything else.
- **Shape:** gently rounded (8px); the small size uses 6px.
- **Primary:** Masjid Green fill, white medium-weight text, 40px tall with 20px side padding, resting shadow. The large size (48px, 32px padding, 16px text) is reserved for the hero's single call to action.
- **Hover / Focus:** hover deepens the fill to Masjid Green Deep with a colour transition. Focus shows a 2px Focus Green ring with a 2px offset. Disabled is 50% opacity with no pointer events.
- **Ghost:** green text, no fill and no shadow, with a 60% Mist fill on hover. Used for inactive nav items.
- **Outline:** 1px green border, transparent fill, 60% Mist on hover.
- **Link:** green text with underline on hover, offset 4px.

### Chips / Badges
- **Collection:** Masjid Green fill, white label text. This is the primary attribution on every hadith card.
- **Book:** Stone Hairline fill, ink text.
- **Chapter:** 1px Stone Rule outline, stone text.
- **Grade:** Mist fill, green text. It sits in the card's footer row and shows the grade exactly as recorded in the source.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Page White on Vellum.
- **Border:** 1px Binding Thread.
- **Shadow Strategy:** Resting at rest, Reached on hover (see Elevation).
- **Internal Padding:** 24px.

### Inputs / Fields
- **Style:** white field, 1px Stone Rule border, 8px radius, 40px tall, resting shadow; Stone Muted placeholder (Stone Faint fails 4.5:1 on white).
- **Search input:** a 16px search icon sits 12px from the left edge in Stone Faint, with the text indented 40px. The submit button sits beside it with a 12px gap, and its label changes to "Searching…" while loading.
- **Focus:** a 2px Focus Green ring with a 2px offset; there is no glow.
- **Disabled:** 50% opacity with a not-allowed cursor.

### Navigation
- A sticky 64px bar on 80% Vellum with backdrop blur and a Binding Thread bottom border. The wordmark sits on the left (lg on mobile, xl from `sm`, bold, Masjid Green). Nav items on the right are links styled as buttons (never a button nested inside a link), small on mobile and default size from `sm`. The current route uses the primary fill with `aria-current="page"`, and the others use ghost.

### Hadith Card (signature component)
This is the heart of the product, and attribution leads everything. The card has four rows:
1. **Badge row:** collection badge, then book, then chapter, with the hadith number right-aligned in Stone Faint.
2. **Narrator line:** "Narrated by …" in italic Stone Muted, shown only when the English text doesn't already name the narrator.
3. **Text:** English text in Stone Ink, followed by the Arabic text (`dir="rtl"`, `lang="ar"`) in Noto Sans Arabic, one step larger.
4. **Footer row:** the grade badge on the left and "% match" (semantic search only) on the right in Stone Faint, separated from the text by a Stone Hairline top rule.

### Explainer Callout
A short "how this search works" note above each search. It uses a Masjid Green Mist tint at 50% with a 20% green border and 8px radius. The lead sentence has a bold green label, and fine print below it is in xs Stone Muted.

### Book Filter
A collapsible panel built on native `<details>`, styled as a white bordered panel. The summary shows a green filter icon, "Filter books" and a muted count, with a chevron that rotates when open. Inside are tri-state collection checkboxes with lazily expanded sub-book lists, indented behind a hairline left rule.

## Do's and Don'ts

### Do:
- **Do** use Masjid Green (`--primary`) for every brand-green need. Point new buttons, badges and focus states at the token instead of Tailwind `green-*`.
- **Do** keep warm stone greys for all secondary text, with Stone Muted as the default.
- **Do** set Arabic with `dir="rtl"`, `font-arabic`, one size step above the English and `leading-loose`.
- **Do** lead every hadith with its collection badge and number, so attribution is visible before the text.
- **Do** put reading surfaces on Page White over Vellum, with a 1px Binding Thread border and 12px corners.
- **Do** keep elevation to the two-step Resting → Reached vocabulary, triggered by hover.

### Don't:
- **Don't** introduce a second accent hue, gradients or decorative colour (The One Voice Rule).
- **Don't** use cool greys (`slate`, `gray`, `zinc`) anywhere (The Warm Grey Rule).
- **Don't** shrink, fade or truncate Arabic text relative to the English (The Equal Scripts Rule).
- **Don't** add shadows above the Reached level, glows or floating elements (The Hand-Reach Rule).
- **Don't** use bouncy, sliding or attention-seeking motion. Transitions are colour, shadow and the 2px lift only.
- **Don't** use Tailwind `green-*` utilities. Use the `primary`, `primary-deep`, `primary-light` and `ring` tokens.
