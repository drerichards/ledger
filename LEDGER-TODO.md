# Ledger UX TODO

Issues raised by the user that must be resolved before calling any phase complete.
Check off each item after visually verifying against mock.html.

---

## Outstanding Issues

### Snapshots tab

- [x] Fix sister divs having the same color (olive/rust semantic, navy/gold alternating neutral)
- [x] Add hover popup/popover to trend stat with more detail (CSS-only tooltip with arrow)
- [ ] **Tooltip clipped by nav** — tooltip opens downward now; verify `overflow: visible` on `.trendBar` and `.container` propagate correctly so tooltip isn't cut off

### Home tab

- [x] Accounts container scroll
- [ ] **Cash flow: balance column** — add running "balance after" column to each transaction row
- [ ] **Cash flow: collapsible weeks** — weeks collapse/expand using same acc table component pattern as Bills + Income tabs
- [ ] **Stat cards swap positions with Next Due cards** — solid-fill StatCards move to top row; Next Due pill cards stack below. Universal pattern: solid stat cards always at top of each tab

### Bills tab

- [x] Est. Surplus font color → `var(--color-navy)`
- [x] **Accounts panel interaction fixes (2026-04-20)**:
  - [x] Comment out table background fills for both groups so page background shows through.
  - [x] Fix no-op click when Kia is collapsed and Other is clicked.
  - [x] Fix janky both-collapse animation when clicking from both-expanded.
  - [x] Fix no-op click when Other is collapsed and Kia is clicked.
  - [x] From one-open state, clicking either header reopens both at half-height.
  - [x] Remove white-gap behavior tied to the old fill-mode class (`groupFill` removed).
- [ ] **Bento layout** — two-column bento:
  - Left col (static): Income & Reconciliation section — cannot collapse
  - Right col (accordion): "Kia's Pay" and "Other Income" sections stack vertically
    - Both can expand independently, neither can be fully collapsed (one always open)
    - Single open: takes full right-col height; other collapses to header only (above or below based on click order)
    - Both open: 50/50 split of right-col height
  - Bento container height is fixed — does NOT grow
  - Only the acc tables inside each section scroll individually

### Income tab

- [ ] Match mockups (to be specified)

### Debt tab

- [ ] Match mockups (to be specified)

### Goals tab — Goals subtab

- [x] Remove `<details>` accordion from Savings log; render always-visible below colored stat cards
- [ ] **Savings Goals + Savings Log side by side** — two-column layout within Goals subtab; Goals on left, Log on right

### Goals tab — Strategy subtab

- [x] Enforce min font size 13px
- [x] Decrease opacity on "Where to Put It" divs
- [x] Add beginner stocks tip
- [ ] Clarify who maintains / edits tips (static vs. dynamic)

### Goals tab — Debt subtab

- [ ] Affirm payoff timeline graph — "Debt timeline" view (per-plan) + "Total view" (aggregate)
- [ ] No new npm packages — SVG/CSS only

### Goals tab — Projection subtab

- [x] Add explicit CTA + annotation

### Nav bar

- [x] Fix dropdown z-index
- [x] Fix seed data button
- [x] Add time-based greeting
- [ ] **FAB → nav bar** — remove floating FAB; move message icon into nav bar to the left of "Good [time], Adriane"
  - **Hover**: shows a mini panel (like a mini acc table, not collapsible) of messages from the last 24 hrs
  - **Click**: routes to Activity tab; Activity tab gets an "Inbox" section for all uncleared messages
  - **The icon is permanent** — it cannot be closed, dismissed, or hidden. Messages inside it can be cleared individually or all-at-once, but the icon itself always stays in the nav
  - **Badge** — uncleared message count shown as a badge on the icon; disappears when count reaches 0 but icon remains
- [ ] **Login toasts (milestone messages)** — new messages since last login appear as floating cards positioned between the Activity tab label and "April 2026" in the nav
  - Show for 10 seconds each, then scroll upward to reveal the next one
  - Only messages from the last 24 hrs appear in the hover mini panel
  - Messages stay in the Activity inbox until the user explicitly clears them

### Global

- [ ] "Add X" buttons across the app need a color (design decision needed)
- [ ] **Table color-system handoff** — current pass only adds row depth/shadow; a separate LLM should do the full table-shell color/contrast pass for Accounts, Home, and Income

---

## Completed

- [x] Tab renames (Home/Bills/Income/Debt/Goals/Snapshots/Activity)
- [x] Goals tab layout — full-width column, stat row, GoalSetter, savings log accordion
- [x] Home tab glass stat cards
- [x] **Stat cards — full solid colored backgrounds** — `StatCard.module.css` rewritten with solid navy/olive/rust/gold fills + white text
- [x] **Snapshots tab — card grid layout** — `SnapshotsTab.tsx` + `.module.css` rewritten with card grid, colored header bands, body rows, net pill, paid progress bar
- [x] **Remove bell notification icon from nav header** — `Header.tsx` rewritten removing NotificationBell; `AppShell.tsx` cleaned of notification props
- [x] **Toast position — above the message FAB** — `MilestoneToast.module.css` set to `bottom: calc(96px + 48px + 16px)`
- [x] **Bills tab viewport overflow** — `globals.css` adds `height: 100%; overflow: hidden` to html + body
- [x] **Date changer position consistency** — `PaycheckTab.tsx` moves DateToggle to left side of header, matching Bills tab
- [x] **Bank accounts feature** — multi-account list on Home tab replacing single Checking card; `BankAccount` type, CRUD actions, hover-reveal edit/delete, inline `AccountForm`
- [x] **Home accounts scroll** — `align-items: flex-start` + `max-height: 200px; overflow-y: auto` on `.accountsCol`
- [x] **Bills tab Est. Surplus color** — `var(--color-navy)` token in StatCard gold variant
- [x] **Savings log accordion removed** — replaced `<details>` with always-visible `<div className={styles.logSection}>`
- [x] **Snapshots trend tooltips** — CSS-only hover popover with navy background + arrow on all trend stat pills
- [x] **Snapshots card color collision** — reserve olive/rust for semantic, alternate navy/gold for neutral
- [x] **Strategy subtab font floor** — bumped `.sectionLabel` and `.accountLabel` from 10px to 13px
- [x] **Strategy subtab opacity** — `.accountCard` at 0.82 opacity, reveals to 1 on hover
- [x] **Strategy stocks tip** — Step 4 + index funds card added
- [x] **Projection subtab CTA** — "What this chart is telling you" callout with remainder explanation + transfer action
- [x] **Nav dropdown z-index** — removed `.stickyTop` from combined selector in AppShell.module.css
- [x] **Seed button unblocked** — removed `NODE_ENV === "development"` gate in AppShell.tsx
- [x] **Time-based greeting** — `timeGreeting()` shows "Good morning/afternoon/evening/night, {name}"
