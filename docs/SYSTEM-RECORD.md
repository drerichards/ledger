# Ledger System Record & Development History

This document consolidates Ledger's technical specifications, dashboard bento grid rules, state architecture, Supabase schema, RLS policies, and future development phases.

---

## 1. Bento Dashboard Layout (Home Tab)
The home dashboard operates in a strict, full-viewport 12-column × 12-row grid.
- **Left Column (Rows 1–12):**
  - `VerdictHero` (`.bento-answer`): rows `1 / 5`, columns `1 / 7` (verdict gradient + progress bar).
  - `ActionStrip` (`.bento-stats`): rows `5 / 8`, columns `1 / 7` (compact cards with colored top borders).
  - `SpendingDonut` (`.bento-donut`): rows `8 / 13`, columns `1 / 7` (150px SVG donut on left, 2-column legend on right).
- **Right Column (Rows 1–12):**
  - Week rail (`.bento-week`): rows `1 / 5`, columns `7 / 13` (7-day navy button rail).
  - `DayDetail` (`.bento-detail`): rows `5 / 9`, columns `7 / 13` (selected day's items).
  - `MomentumGauges` (`.bento-mom`): rows `9 / 13`, columns `7 / 13` (3 semicircular gauges).

### Viewport and Responsiveness
- **Desktop (>= 1180px):** `height: 100vh; overflow: hidden`. Parent scrolling is locked; scrolling is internal to tall panels.
- **Tablet (< 1180px):** Releases one-screen lock (`height: auto; overflow: visible`), collapses to a 2-column scrollable layout.
- **Mobile (< 720px):** Collapses to a single-column scrollable layout.

---

## 2. Navigation Ticker
- The ticker is governed by the `SHOW_NAV_TICKER` flag in `AppShell.tsx` (currently set to `false` for initial rollout).
- When active, it displays dynamic user alerts and unseen milestones from the last 24 hours.
- When inactive, the month selector is pushed to the far right of the navigation bar using `margin-left: auto`.

---

## 3. Styling & UX Tokens
- **Palette:** Navy (`#1E3A5F`), Olive (`#5C6B2E`), Rust (`#C4522A`), Cream (`#F5F0E8`).
- **Typography:** **Poppins** for headings and labels, **DM Sans** for body UI, and **DM Mono** for tabular numbers/monetary values. Serif fonts are prohibited.
- **Visuals:** Frosted glassmorphism panels, glowing active day button hover states, animated SVG gauge paths, and scrollbars padded to avoid text collisions.

---

## 4. Goals Calculation & Strategy
- **GoalType:** Union of `"car" | "emergency" | "vacation" | "debt" | "investment" | "general" | "other"`.
- **Derived Balance:** Goal balances are computed dynamically from `savingsLog` entries tagged with `goalId` to prevent data bleed:
  $$\text{goalBalance} = \sum \text{savingsLog.filter(e => e.goalId === id).map(e => e.amount)}$$
- **Strategy Section:** Dynamically advises steps when surplus is positive/negative and when installment plans are active/cleared, replacing "HYSA" with a plain-language explanation of high-yield savings.

---

## 5. Supabase Database Schema & RLS Policies
The database runs 8 financial tables. Every table carries a `user_id` column mapped to `auth.users(id)` with Row-Level Security (RLS) enabled.

### Tables list:
1. `bills` (composite primary key `(user_id, id)`)
2. `installment_plans` (composite primary key `(user_id, id)`)
3. `income` (composite primary key `(user_id, month)`)
4. `snapshots` (composite primary key `(user_id, month)`)
5. `paycheck_weeks` (composite primary key `(user_id, week_of)`)
6. `check_log` (composite primary key `(user_id, week_of)`)
7. `savings_log` (composite primary key `(user_id, week_of)`)
8. `bank_accounts` (composite primary key `(user_id, id)`)

### RLS Policies
Every table enforces:
- **SELECT:** `for select to authenticated using (auth.uid() = user_id)`
- **MODIFY:** `for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)`
Anonymous (`anon`) role access is denied.

---

## 6. Future Phases
- **Tab Styling:** Design and polish style implementations for both the Income and Payoff tabs.
- **Plaid API:** Unify bank accounts under Plaid API integration.
- **Installment Cleanup:** Cosmetic deletion of duplicate plan history.
- **Animation Gating:** Respect `prefers-reduced-motion` for dashboard gauges.
- **Features Re-enablement:** Bring back dark mode, snapshots, and the nav ticker when appropriate.
