# DIU Smart Medical — Design System

An AI-powered medical dashboard with a ChatGPT-style conversational interface. Users can chat about symptoms, upload images and reports for analysis, find blood donors, and locate nearby hospitals — all from a clean, calm medical UI.

This design system captures the brand's clinical-but-warm voice, soft medical palette (blue + mint), and ChatGPT-inspired layout patterns.

---

## Sources used

| Source | Path / Link | Status |
|---|---|---|
| Brief | Product description provided in chat | ✅ used |
| Logo | `uploads/logo.png` → `assets/logo.png` | ✅ used |
| GitHub repo | `tanvir-hannan-anik/DIU-Smart-Medical` | ⚠️ empty repo (no commits) |
| Attached folder | `Smart Medical/` (local mount) | ⚠️ empty — no files to read |
| Font upload | `uploads/Open_Sans.zip` | ❌ not delivered; substituted with **Open Sans from Google Fonts** |

> **Note:** Because the codebase and Figma were unavailable, this system was built from the brief + logo. Visual decisions are drawn from the logo's clinical blue + mint heart, healthcare-UX conventions, and the ChatGPT-style layout the user specified. **Please share real components, a Figma, or the font files** if you want me to refine toward a production spec.

---

## Product context

**Product:** DIU Smart Medical
**Parent:** DIU (Daffodil International University)
**Category:** Healthcare / AI consumer health assistant
**Primary surface:** Responsive web dashboard (desktop first, works on mobile)

### Core features (from brief)
1. **Dashboard** — overview, recent chats, health tools
2. **Image Analysis** — upload medical images (e.g. X-ray, skin photo) for AI interpretation
3. **Reports** — upload prescription/lab PDFs, get plain-language summaries
4. **Blood Bank** — find blood donors
5. **Nearby Services** — locate hospitals, clinics, pharmacies
6. **Profile** — personal health info

### Key UI patterns
- **ChatGPT-style chat area** — user bubbles right, AI left, composer pinned at bottom with text, image/PDF upload, voice.
- **Left sidebar** — logo, icon-first nav, dark/light toggle at bottom.
- **Top greeting + suggested prompts** — empty-state for a fresh chat.
- **Right panel of "Quick Health Tools"** — Upload Image, Analyze Prescription, Find Blood Donor, Nearby Hospitals.

---

## Index

| File / Folder | Purpose |
|---|---|
| `README.md` | This file — brand, content, visual, iconography foundations |
| `SKILL.md` | Agent SKILL entry point for Claude Code compatibility |
| `colors_and_type.css` | All design tokens: colors, type, spacing, radii, shadows, motion |
| `assets/` | Logo, favicons, raw brand images |
| `fonts/` | Webfont references (Open Sans via Google Fonts CDN) |
| `preview/` | Preview cards shown in the Design System tab |
| `ui_kits/app/` | Web-app UI kit: sidebar, chat, composer, right panel, full click-thru |

---

## CONTENT FUNDAMENTALS

### Voice & tone
**Calm, clear, clinical — never alarmist.** The AI is a knowledgeable friend with medical-adjacent training, not a doctor. It speaks plainly, hedges when it should, and always nudges users toward professional care for anything serious.

- **Warm but not cutesy.** "How can I help with your health today?" — not "Hey bestie, what's up?"
- **Plain language over jargon.** "Your blood pressure is slightly high" beats "Stage 1 hypertension detected."
- **Always caveated.** Medical content pairs with a disclaimer like _"This isn't a diagnosis — please consult a doctor."_

### Person
**Second person ("you").** The product speaks _to_ the user directly.
- ✅ "Upload your report and I'll walk you through it."
- ❌ "The user may upload a report for analysis."

The AI refers to itself as "I" sparingly — mostly sticks to verbs: _"Analyzing..."_, _"Found 3 donors near you."_

### Casing
- **Sentence case** for all UI — labels, buttons, headings, nav items.
  - ✅ "Find blood donor" / ❌ "Find Blood Donor"
- **Title Case** only for proper nouns: "DIU Smart Medical", "O+ Blood Donors".
- **ALL CAPS** reserved for tiny eyebrow labels (0.08em tracking), never buttons.

### Punctuation & length
- Short sentences. One idea each.
- Periods in body copy; buttons usually dropless: "Upload image" not "Upload image."
- Ellipses for system progress: _"Analyzing image…"_, _"Finding donors…"_.

### Emoji & symbols
**No emoji in product UI.** Healthcare context is too serious for 😊. Unicode symbols are allowed for structure only: arrows (→), bullets (•), em-dashes (—). Suggested-prompt chips may use a leading icon but never an emoji.

### Example copy

| Situation | Voice |
|---|---|
| Empty chat greeting | "How can I help with your health today?" |
| Suggested prompt | "Analyze my symptoms" · "Upload a report" · "Find O+ donors nearby" |
| AI response opener | "Based on what you've described…" |
| Medical disclaimer | "This is informational only — please consult a doctor before making medical decisions." |
| Upload progress | "Reading your report…" |
| Empty Blood Bank result | "No donors found within 5 km. Try expanding the radius." |
| Error | "Couldn't read that file. Try a clearer image or a PDF under 10 MB." |

---

## VISUAL FOUNDATIONS

### Palette
Anchored by the logo: a deep clinical blue (medical cross) and a mint seafoam (heart). Warmer than tech-SaaS blues, cooler than hospital teal.

- **Primary blue** `#1F6FB2` — used for primary buttons, user chat bubbles, links, brand marks.
- **Mint accent** `#4FB38A` — success states, donor/availability indicators, secondary CTAs.
- **Danger red** `#E0545B` — blood bank, critical alerts only; used sparingly.
- **Neutrals** — cool-leaning grays with a blue undertone. App background is near-white (`#FAFBFC`), surfaces are pure white.

Avoid purple, magenta, neon, brand-orange. Gradients are used only as subtle clinical halos (see "backgrounds").

### Typography
- **Family:** Open Sans (400 / 500 / 600 / 700 / 800). Single family across the whole system — keeps the interface calm.
- **Body:** 15px, line-height 1.5–1.65.
- **Headings:** 700 weight, `-0.02em` tracking on 30px+.
- **Eyebrow labels:** uppercase, 11px, `0.08em` tracking, brand-blue.
- **No serif.** Keep it humanist-sans throughout.

### Spacing
4px base scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80. Cards are typically 24px padded; chat bubbles 12–16px; sidebar items 8–12px.

### Backgrounds
- **App shell:** `--neutral-025` (warm-cool off-white).
- **Sidebar:** `--neutral-050` (a hair darker than app) — creates layering without shadows.
- **Chat thread:** white, no wallpaper, no pattern.
- **Hero/empty states:** optional _soft radial halo_ echoing the logo's cyan ring — low-alpha (`rgba(184,236,247,.35)`), never a rainbow gradient.
- **No repeating patterns, no grain, no textures, no full-bleed photography in chrome.** Imagery appears _inside_ cards only (e.g. uploaded X-ray, donor avatar).

### Corner radii
Generous but not pill-everywhere.
- Cards & panels: **16px**
- Buttons & inputs: **12px**
- Chat bubbles: **16px** with one "pointed" corner (4px) on the speaker side
- Chips / pills: **999px**
- Avatars: full circle

### Borders
1px, `--border-default` (`#DFE4E9`). Dividers inside cards are `--border-subtle` (`#EDF0F3`). Never rely on border + shadow together — pick one per surface.

### Elevation (shadows)
Soft, blueish shadows (not pure black) so they read as clinical, not heavy:
- `--shadow-sm` — idle cards, sidebar items active state
- `--shadow-md` — menus, hovered cards, composer
- `--shadow-lg` — modals, popovers
- `--shadow-glow` — 6px cyan ring used **only** on the logo and brand hero
- No inner shadows beyond form-field insets.

### Hover, focus, press
- **Hover on tiles / nav:** background swaps to `--bg-hover` (`#F2F8FD`). No scale, no color change on text.
- **Hover on primary button:** background darkens one step (blue-700 → blue-900), shadow gains depth (`sm → md`).
- **Focus:** `--shadow-focus` — 3px blue glow ring, visible for keyboard only (`:focus-visible`).
- **Press:** scale `0.98`, shadow drops to `xs`, 80ms ease-out.
- **Disabled:** opacity `0.45`, no hover change.

### Motion
- **Durations:** 120ms (micro), 200ms (base), 320ms (slow, panels).
- **Easing:** `cubic-bezier(.2,.8,.2,1)` out-curve default; spring curve reserved for chat message entry only.
- **Fades, slides ≤ 8px, scale ≤ 0.02.** No bouncing UI, no parallax.
- Chat messages fade-and-rise 6px on entry. Typing indicator is three 6px dots pulsing 1.1s in sequence.

### Transparency & blur
- Composer at the bottom of the chat uses `backdrop-filter: blur(12px)` on a 90% surface so thread content dissolves under it.
- Modal scrim: `rgba(14, 32, 38, 0.35)`, no blur (keeps it snappy).
- Otherwise, transparency is avoided — clinical contexts demand clear reads.

### Imagery vibe
When imagery appears (uploaded photos, hospital cards, donor avatars): **clean, cool-leaning, natural**. No filters, no grain, no aggressive saturation. Medical imagery (X-rays etc.) is shown as-is on a dark ink background card.

### Layout rules
- **Three-pane max:** sidebar (fixed, 240px) · chat column (flex) · right tools panel (collapsible, 320px).
- Sidebar and composer are `position: fixed` / sticky.
- Main chat column has a max-width of **760px** centered — readable line length.
- Breakpoints: ≥ 1280 shows all three panes; 1024–1279 collapses right panel; < 1024 collapses sidebar to icons; < 720 full overlay sidebar.

### Dark mode
Yes — toggled from the bottom of the sidebar. Dark surfaces are warm-dark (`#0B1116` app, `#141B22` surface) rather than pure black. Primary blue shifts up to `--brand-blue-500` for contrast; mint lightens to `--brand-mint-300`.

---

## ICONOGRAPHY

**System:** **Lucide icons** (CDN: `lucide.dev`). Chosen because they match the clinical, stroke-based look: 1.75px stroke, 24px grid, rounded joins. This is a **substitution** — no icon library was supplied with the brief; if the production app uses a different set, swap it.

### Usage rules
- **Stroke-only, 1.75px.** Never filled icon variants in navigation. Filled is reserved for _active_ / pressed states.
- **24px** in sidebar and composer actions, **20px** inline with text, **16px** in chips.
- **Color inherits `currentColor`.** Nav icons are `--fg-3` idle, `--fg-brand` active. Never multi-colored.
- **Alignment:** icons sit on the text baseline; provide 8px gap to label.

### Specific icon mapping
| Purpose | Lucide name |
|---|---|
| Dashboard | `layout-dashboard` |
| Image analysis | `scan-search` (or `image` as fallback) |
| Reports | `file-text` |
| Blood bank | `droplet` |
| Nearby services | `map-pin` |
| Profile | `user` |
| Dark/light toggle | `sun` / `moon` |
| Upload image | `image-up` |
| Upload PDF | `file-up` |
| Voice input | `mic` |
| Send | `arrow-up` (in filled circle) |
| Copy message | `copy` |
| Regenerate | `refresh-cw` |
| New chat | `square-pen` |

### Emoji
**No.** Medical product; emoji reduces perceived trust. Never in UI, never in AI responses, never in empty states.

### Unicode / symbols
- `→` for prompts and navigation cues
- `•` for metadata separators (e.g. "3 km • Open now")
- `—` em-dash for asides

### Logo
`assets/logo.png` — the canonical brand mark. Use the full halo version on splash / marketing / empty-hero only. For chrome (sidebar top), pair the icon-only crop with the wordmark "DIU Smart Medical" set in Open Sans 600.

---

*This is a living document. Iterate as real assets, Figma, or code arrive.*
