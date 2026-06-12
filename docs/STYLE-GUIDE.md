# Ledger Design System

**Status:** Phase 2 — Color System Overhaul & Educational UI
**Owner:** Andre Richards
**Last Updated:** 2026-04-04

---

## Purpose & Philosophy

Ledger is a **financial empowerment tool** disguised as a bill tracker. Built for Diane, a non-technical user managing household finances across variable income streams. The interface must feel **empowering, not overwhelming** — teaching financial literacy implicitly through data visualization and progressive disclosure.

### Design Principles

1. **Implicit Education** — Show financial progress without lectures. Data teaches.
2. **Ultra-Minimalist** — Information revealed progressively, not dashboard-heavy.
3. **Warmth Through Color** — Strategic accents (navy/olive/rust) on clean white space.
4. **Hierarchy Through Typography** — Font weight and size, not boxes or borders.
5. **Depth Through Subtlety** — Frosted glass, colored shadows, soft elevation.

---

## Visual Language

### Atmosphere
**Ultra-Minimalist · Warm · Confident · Progressive**

Clean data presentation with purposeful chart elements. NOT a dashboard full of graphs. Information surfaces when needed, contextually. Think Apple Health meets personal finance — approachable, not clinical.

### Platform
- **Target:** Next.js web app (desktop-first, mobile-responsive in Phase 2)
- **CSS Strategy:** CSS Modules only (NO Tailwind, NO inline styles)
- **Accessibility:** WCAG 2.1 AA compliant (via shadcn/ui components)

---

## Color System

### Light Mode (Default)

| Token | Hex | Role | Usage |
|-------|-----|------|-------|
| **Navy** | `#274058` | Authority, Primary Actions | Headers, key data points, primary CTAs, active states (Yale Blue — slate with gray undertones) |
| **Navy Deep** | `#102F40` | Dark Backgrounds | Dark mode primary canvas, strong emphasis |
| **Olive** | `#898B5E` | Positive Progress | Savings growth, goals met, confirmations, success states (Pale Olive — muted sage) |
| **Olive Dark** | `#41521F` | Emphasis | Deep olive for strong emphasis, borders, active states (Olive Leaf) |
| **Olive Darker** | `#63652C` | Strong Emphasis | Darkest olive for high-contrast emphasis |
| **Rust** | `#C4522A` | Urgent/Important | Final payments, warnings, deadlines, attention states (Red Ochre) |
| **Brown** | `#835225` | Earthy Accent | Secondary accent, warm tones (Saddle Brown) |
| **Gold** | `#FDB833` | Celebrations | Achievements, milestones, savings goals hit (Sunflower Gold) |
| **Gold Muted** | `#CAA632` | Subtle Accent | Muted gold for borders, secondary highlights (Soft Fawn) |
| **Cream** | `#F5F0E8` | Subtle Background | Inactive states only, NOT interactive elements |
| **White** | `#FFFFFF` | Clean Space | Primary background, let content breathe |

**Semantic Palette (Light):**

| Semantic Token | Value | Purpose |
|----------------|-------|---------|
| `--color-surface` | `#FAFAF8` | Alternating table rows, subtle cards |
| `--color-border` | `#E0D9CE` | Dividers, outlines |
| `--color-text` | `#1A1A1A` | Primary text |
| `--color-text-mid` | `#666666` | Secondary text, labels |

### Dark Mode

**Inspiration:** Dark mode from `ctx/images/darkmode.jpg` — NO pink, NO neon, use navy/olive/rust accents only.

| Token | Hex | Role | Usage |
|-------|-----|------|-------|
| **Navy (bright)** | `#4A7AB8` | Authority, Primary Actions | 30% brighter for dark mode contrast |
| **Olive (bright)** | `#A8AA7E` | Positive Progress | Brighter pale olive for dark mode contrast |
| **Rust (bright)** | `#E8744A` | Urgent/Important | 25% brighter for dark mode contrast |
| **Gold (bright)** | `#FFC654` | Celebrations | Brighter gold for dark mode contrast |
| **Deep Navy** | `#102F40` | Primary Canvas | Dark background with slate undertones |
| **Navy Surface** | `#1C3D52` | Cards, Panels | Elevated surfaces in dark mode |

**Semantic Palette (Dark):**

| Semantic Token | Value | Purpose |
|----------------|-------|---------|
| `--color-surface-dark` | `#1A2028` | Cards, elevated panels |
| `--color-border-dark` | `#2A3340` | Dividers, outlines |
| `--color-text-dark` | `#E8EDF2` | Primary text |
| `--color-text-mid-dark` | `#9BA3AC` | Secondary text, labels |

### Dark Mode Implementation

```css
:root {
  /* Light mode (default) */
  --color-bg: var(--color-white);
  --color-surface: #FAFAF8;
  --color-border: #E0D9CE;
  --color-text: #1A1A1A;
  --color-text-secondary: #666666;
}

:root[data-theme="dark"] {
  /* Dark mode overrides */
  --color-bg: #0F1419;
  --color-surface: #1A2028;
  --color-border: #2A3340;
  --color-text: #E8EDF2;
  --color-text-secondary: #9BA3AC;

  /* Brighter accents for dark mode */
  --color-navy: #4A7AB8;
  --color-olive: #8FA857;
  --color-rust: #E8744A;
}

/* Detect system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Apply dark mode if no explicit theme set */
  }
}
```

### Theme Toggle Component

**Location:** User menu in Header
**State:** `localStorage.getItem('theme')` → `'light' | 'dark' | 'system'`
**Icon:** Sun (light) / Moon (dark) / Auto (system)

**Behavior:**
- Default: System preference (`prefers-color-scheme`)
- Click toggles: System → Light → Dark → System
- Persist choice to `localStorage`
- Apply `data-theme` attribute to `:root`

### Color Mixing (Alpha Overlays)

```css
--color-navy-alpha-6: color-mix(in srgb, var(--color-navy) 6%, transparent);
--color-rust-alpha-25: color-mix(in srgb, var(--color-rust) 25%, transparent);
```

**Use alpha overlays for:**
- Hover states (6% navy)
- Warning backgrounds (7-8% rust)
- Final payment cells (25% rust)

### Phase 2 Color Strategy

**Problem:** Too much cream everywhere. Highlights/hovers blend together. Lacks visual hierarchy.

**Solution:**
- **Navy** → Primary buttons, active tabs, key metrics (income, bills total)
- **Olive** → Savings cards, positive deltas, confirmation modals
- **Rust** → Urgent actions, shortfall warnings, final payment badges
- **Cream** → Background accent only (inactive grid cells, disabled states)
- **White** → Primary canvas (80%+ of screen)

**Colored Shadows** for depth:
```css
/* Navy shadow on primary cards */
box-shadow: 0 2px 8px rgba(30, 58, 95, 0.12);

/* Olive shadow on savings progress */
box-shadow: 0 2px 8px rgba(92, 107, 46, 0.12);

/* Rust shadow on warning modals */
box-shadow: 0 4px 16px rgba(196, 82, 42, 0.15);
```

---

## Typography

### Font Families

| Family | Usage | Variable |
|--------|-------|----------|
| **Poppins** (sans-serif) | Headings, body text, UI labels | `--font-primary` |
| **DM Mono** (monospace) | Currency, numbers in tables (alignment) | `--font-mono` |

**Removed:** Playfair Display (serif) - replaced with Poppins for cleaner, modern look matching inspo3/4 vibe.

### Type Scale

| Token | Size | Font | Usage |
|-------|------|------|-------|
| `--text-3xl` | 32px | Poppins Bold | Large stat values (total bills, savings balance) |
| `--text-2xl` | 28px | Poppins Bold | Section headings |
| `--text-xl` | 24px | Poppins SemiBold | Card headings |
| `--text-lg` | 20px | Poppins SemiBold | Subheadings |
| `--text-md` | 16px | Poppins Medium | Emphasis body text |
| `--text-base` | 15px | Poppins Regular | Default body text |
| `--text-sm` | 14px | Poppins Regular | Secondary labels |
| `--text-xs` | 13px | Poppins Regular | Table headers (non-numeric) |
| `--text-mini` | 10px | Poppins Medium | Badges, flags |

**Numbers/Currency:** All use DM Mono at same size as surrounding text for perfect column alignment.

### Hierarchy Through Weight

Poppins has excellent weight range:
- **700 (Bold)** → Primary headings, large stat values
- **600 (SemiBold)** → Subheadings, card titles, active states
- **500 (Medium)** → Emphasis text, badges, button labels
- **400 (Regular)** → Body text, secondary labels

**Never use:** 300 (Light) or 800+ (too extreme for financial data)

---

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing (icon-text gap) |
| `--space-2` | 8px | Compact spacing (button padding) |
| `--space-3` | 12px | Default spacing (card padding) |
| `--space-4` | 16px | Comfortable spacing (section gaps) |
| `--space-5` | 20px | Generous spacing (between cards) |
| `--space-6` | 24px | Large spacing (section margins) |
| `--space-8` | 32px | Extra-large spacing (page margins) |

---

## Elevation & Depth

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | Default card elevation |
| `--shadow-hover` | `0 2px 8px rgba(0,0,0,0.12)` | Interactive hover states |
| `--shadow-dropdown` | `0 4px 16px rgba(0,0,0,0.15)` | Dropdowns, popovers |
| `--shadow-modal` | `0 20px 60px rgba(0,0,0,0.25)` | Modal dialogs |
| `--shadow-overlay` | `0 8px 32px rgba(0,0,0,0.30)` | Overlays, drawers |

### Frosted Glass Effect

**Light Mode:**
```css
.frosted {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

**Dark Mode:**
```css
:root[data-theme="dark"] .frosted {
  background: rgba(26, 32, 40, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(42, 51, 64, 0.5);
}
```

**Use for:** Modals, popovers, floating panels that overlay content.

### Rounded Corners

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 3px | Tight elements (badges) |
| `--radius-md` | 4px | Default UI elements (buttons, inputs) |
| `--radius-lg` | 6px | Cards, containers |
| `--radius-xl` | 8px | Large cards, modals |
| `--radius-2xl` | 12px | Feature cards, charts |

---

## Component Patterns

### Cards

**Default Card:**
```css
background: var(--color-white);
border-radius: var(--radius-lg);
padding: var(--space-4);
box-shadow: var(--shadow-card);
transition: box-shadow 0.2s ease;

&:hover {
  box-shadow: var(--shadow-hover);
}
```

**Savings Card (Olive accent):**
```css
background: linear-gradient(135deg, #FFFFFF 0%, #F5F9ED 100%);
border-left: 4px solid var(--color-olive);
box-shadow: 0 2px 8px rgba(92, 107, 46, 0.12);
```

**Warning Card (Rust accent):**
```css
background: var(--color-rust-light);
border-left: 4px solid var(--color-rust);
box-shadow: 0 2px 8px rgba(196, 82, 42, 0.12);
```

### Buttons

**Primary (Navy):**
```css
background: var(--color-navy);
color: var(--color-white);
font-weight: 600;
padding: var(--space-2) var(--space-4);
border-radius: var(--radius-md);
box-shadow: 0 1px 3px rgba(30, 58, 95, 0.15);

&:hover {
  background: var(--color-navy-dark);
  box-shadow: 0 2px 6px rgba(30, 58, 95, 0.25);
}
```

**Success (Olive):**
```css
background: var(--color-olive);
color: var(--color-white);
/* ... similar pattern */
```

**Danger (Rust):**
```css
background: var(--color-rust);
color: var(--color-white);
/* ... similar pattern */
```

### Charts & Visualizations

**Ultra-Minimalist Style (inspo3/4 vibe):**
- Clean axis lines (1px, `--color-border`)
- NO grid lines
- Data points as 6px circles with colored shadows
- Labels in `--font-mono` at `--text-xs`
- Strategic color: Navy for income, Olive for savings, Rust for bills
- White background, generous padding

**Chart Types:**
- **Line charts** → Income variability over time
- **Bar charts** → Spending per category
- **Progress bars** → Debt payoff countdown
- **Donut charts** → Spending breakdown (necessary vs discretionary)

---

## Layout Patterns

### Progressive Disclosure

Information revealed in layers:

1. **Layer 1 (Always visible):** Current month totals, shortfall/surplus
2. **Layer 2 (Expandable sections):** Monthly detail tables
3. **Layer 3 (Click to reveal):** Historical data, edit history
4. **Layer 4 (Modals/popovers):** Educational context, impact explanations

### Grid System

**12-column grid** for responsive layouts:
- Desktop: 3-4 column layouts for cards
- Tablet: 2 column layouts
- Mobile: Single column stacked

### Spacing Rhythm

Consistent vertical rhythm using `--space-*` tokens:
- Cards: `--space-4` padding, `--space-5` gap
- Sections: `--space-6` margin-bottom
- Page margins: `--space-8`

---

## Educational UI Patterns

### Implicit Financial Literacy

**DON'T:**
- "You're X weeks away from breathing room" (too explicit)
- "Good job!" messages (condescending)
- Preachy tooltips explaining finance 101

**DO:**
- Show debt countdown with clean progress bar (she'll see progress herself)
- Visualize income variability with trend line (she'll understand stability)
- Display savings growth with olive accent (she'll feel the win)
- Connect edits to downstream impacts (she'll learn data relationships)

### Data Connection Patterns

**When she edits Kia's check amount:**
```
┌─────────────────────────────────────┐
│ What else changes:                  │
│                                     │
│ Average paycheck: $984 → $1,021    │
│ 12-month savings: $3,200 → $3,644  │
└─────────────────────────────────────┘
```

**When Affirm plan hits final month:**
```
┌─────────────────────────────────────┐
│ Living Room TV — Paid Off           │
│                                     │
│ Monthly commitment: -$55            │
│ Starting June, you'll have this     │
│ amount available for other goals.   │
└─────────────────────────────────────┘
```

### Celebration Moments (Olive Treatment)

- First time savings balance hits $1,000 → Subtle olive glow animation
- Affirm plan payoff → Olive badge with confetti animation (one-time)
- Three consecutive months with surplus → Olive border on reconciliation panel

---

## Icon System

**3-dot menu (⋯)** for row actions (inspired by inspo1)
**Chevrons (›, ∨)** for collapsible sections
**Olive dot (•)** for edit history indicator
**Checkmark (✓)** for confirmations
**Flag (⚑)** for red-flagged bills

**Source:** Lucide Icons (already in Next.js ecosystem)
**Size:** 16px default, 20px for emphasis
**Color:** Inherits from parent or semantic color

---

## Accessibility

- **Color contrast:** All text meets WCAG AA (4.5:1 minimum)
- **Touch targets:** Minimum 44px (`--min-touch`)
- **Keyboard navigation:** All interactive elements focusable
- **Screen readers:** Semantic HTML, ARIA labels on icons
- **Focus indicators:** 2px navy outline with 2px offset

---

## Animation & Motion

### Micro-interactions

**Hover states:** 200ms ease
**Button press:** 100ms cubic-bezier(0.4, 0, 0.2, 1)
**Modal enter:** 250ms ease-out slide-up + fade-in
**Toast notifications:** 300ms spring animation

**Celebration animations (Olive moments):**
- Confetti burst: 800ms, plays once
- Glow pulse: 1200ms, 2 iterations
- Scale bounce: 400ms cubic-bezier(0.68, -0.55, 0.27, 1.55)

### Reduced Motion

Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Notes

### CSS Modules Structure

```
src/components/
  BillChart/
    BillChart.tsx
    BillChart.module.css
  ui/
    Card/
      Card.tsx
      Card.module.css
```

**Each component gets its own CSS module.** NO global styles except tokens.

### shadcn/ui Integration

**Phase 2:** Migrate to shadcn/ui for:
- Buttons, Inputs, Selects (form elements)
- Dialog, Sheet, Popover (overlays)
- Accordion, Tabs, Dropdown Menu (navigation)

**Customize with our tokens:**
```tsx
// tailwind.config.ts override (even though we don't use Tailwind classes)
theme: {
  colors: {
    navy: '#1E3A5F',
    olive: '#5C6B2E',
    rust: '#C4522A',
    // ...
  }
}
```

### Chart Library

**Recommended:** Recharts (React + composable)

**Alternative:** Chart.js via react-chartjs-2

**Custom wrapper:** `<MinimalChart>` component enforcing our visual style:
- No grid lines
- Clean axes
- Colored shadows on data points
- Monospace labels

---

## Phase 2 Feature Additions

### Spending Per Category
**Visual:** Horizontal bar chart, navy bars, category labels in DM Sans
**Educational moment:** Shows necessary vs discretionary split implicitly

### Bill Debit Calendar
**Visual:** Month grid, cells with colored dots (navy = autopay, rust = manual)
**Educational moment:** See bill clustering, plan cash flow

### Weekly Debit Summary
**Visual:** Collapsible card, "This week: 3 bills, $247.18" with list below
**Educational moment:** Awareness of immediate obligations

### Next Payday Countdown
**Visual:** Small widget, "5 days until next check", olive progress ring
**Educational moment:** Time-based awareness of income cycle

### Spending vs Saving Chart
**Visual:** Dual-line chart, 6-month trend, navy (spending) vs olive (saving)
**Educational moment:** Visual proof of progress over time

---

## Quality Checklist

Before shipping any Phase 2 feature:

- [ ] Uses design tokens (NO hardcoded colors/spacing)
- [ ] Meets WCAG AA contrast ratios
- [ ] Has hover/focus states
- [ ] Works with keyboard navigation
- [ ] Respects reduced motion preference
- [ ] Frosted glass on modals (if applicable)
- [ ] Colored shadows on cards (if applicable)
- [ ] Typography hierarchy clear (weight, not boxes)
- [ ] Educational moment implicit (not preachy)
- [ ] CSS Module co-located with component

---

**Next Steps:**
1. Update PRD.md with Phase 2 vision
2. Audit existing components for color overuse (cream → white)
3. Build chart components with ultra-minimalist style
4. Integrate shadcn/ui with custom theming
5. Add celebration animations for Olive moments
