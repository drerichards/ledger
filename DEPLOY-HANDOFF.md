# Ledger — Deploy Handoff

**Written 2026-06-12. For the next agent taking Ledger from "code-complete" to "live for Adriane."**
**Read this top-to-bottom before touching anything. All state below is verified `[VV]` against git + files this session unless tagged `[NV]`.**

---

## Mode State
Execution mode (shipping Ledger). Not plan mode. No unapproved plan pending. Next agent: act on §4 step sequence directly.

## Open Decisions
- Coverage fix path (§3): add ~2 tests (preferred) vs lower thresholds — Andre to approve if lowering.
- Commit `RUBRIX-AUDIT.md` to Ledger or keep out — recommend keep out; Andre decides.
- Rubrix hook reword ("re-emit"→"append only") to stop duplicate re-emits — awaiting Andre's explicit go (separate thread, §7).

## Immediate Next Steps
1. Close coverage gap (§3) — branches →90%, functions →94%.
2. Commit src/ only, gate-green (§4 step 2).
3. Andre runs `.scratch/RESET-adriane-june.sql` in Supabase (§4 step 3).
4. Verify migration history, set Vercel prod env (NO `DEV_AUTH_BYPASS`), deploy (§4 steps 4-5).
5. Live smoke test as Adriane (§4 step 6).

## Locked Decisions
- Reset is per-user (Adriane's `user_id` only); Andre's account untouched.
- Seed VALUES for bills/plans/income never edited; savings/goals were dummy → emptied.
- Bank accounts on hold until Plaid.
- `DEV_AUTH_BYPASS` never set in production.
- Agent never runs destructive DB ops — Andre runs the reset SQL.

## 0. What Ledger is (one paragraph)

Household bill-tracker for Andre's non-technical mother **Adriane**. Next.js 14 App Router, TypeScript, CSS Modules (NO Tailwind), Supabase (Auth + Postgres, per-user via `user_id` + RLS). Money in integer cents. 4 tabs: Home (bento dashboard), Accounts (bill chart, two groups: Kia's Pay / Other Income), Income, Payoff (Affirm plans). Full domain context: `ctx/LEDGER.md` + `CLAUDE.md` at repo root — READ THOSE FIRST.

---

## 1. DONE-STATE — what "deployed" means (the finish line)

Deployment is COMPLETE when ALL of these are true:
1. ☐ All current uncommitted work is committed to `feat/security-allowlist` (or merged to `main`), gate-green.
2. ☐ `pnpm jest --coverage` passes — **branches ≥90%, functions ≥94%** (the two failing thresholds, see §3).
3. ☐ Adriane's Supabase data reset for June (she starts fresh) — `.scratch/RESET-adriane-june.sql` executed.
4. ☐ App deployed to Vercel production with correct env vars (`DEV_AUTH_BYPASS` NOT set in prod).
5. ☐ Supabase migration history matches remote (no drift) — verified before/at deploy.
6. ☐ Adriane can log in (email allowlist gate passes for her email) and sees her real bills, zero dummy savings/goals.

---

## 2. CURRENT GIT STATE `[VV git status this session]`

**Branch:** `feat/security-allowlist`
**Last commit:** `4a571f2 feat(accounts): coupled bill-group accordion + glass hover on stat boxes`
**Uncommitted (this session's work, all gate-green except coverage):**

| File | What changed |
|---|---|
| `src/components/AccountsTab/AccountsTab.tsx` | Accordion JS layout effect: 50/50 split when both groups open, each subtotal always visible; auto-fill empty month from prior recurring |
| `src/components/AccountsTab/AccountsTab.test.tsx` | Tests updated for accordion behavior |
| `src/components/ui/CollapsibleTable/CollapsibleTable.tsx` | `data-acc-*` attrs; `split` prop removed; footer always renders subtotal |
| `src/components/ui/CollapsibleTable/CollapsibleTable.module.css` | Group height set by JS, `transition: height .34s`, 16px radius + overflow clip |
| `src/components/AccountsTab/IncomePanel/IncomePanel.module.css` | `.statusCardWarn` = solid rust, `.statusCardOk` = solid olive-green (matches Home verdict card); white text both |
| `src/components/HomeTab/DayDetail/DayDetail.module.css` | `.list` got `padding-right: var(--space-2)` + `scrollbar-gutter: stable` (text no longer touches scrollbar) |
| `src/lib/seed/seed.ts` | Dummy `savingsLog` + `goals` → `[]` (bills/plans/income KEPT) |
| `src/lib/storage/storage.ts` | One-time migration (flag `ledger-dummy-reset-v1`) empties dummy savings/goals/bankAccounts once per device, keeps income |
| `src/lib/storage/storage.test.ts` | Tests for the migration |

**Untracked — do NOT commit these:** `screenshot.png`, `supabase/.temp/`, `.claude/settings.local.json`, and decide on `RUBRIX-AUDIT.md` (unrelated to Ledger ship — recommend leave untracked or move to `.scratch/`).

---

## 3. BLOCKER #1 — Test coverage (must fix before commit) `[VV ran jest --coverage this session]`

Husky pre-commit runs `jest --bail --ci` AND the coverage threshold gate. Current numbers:
- **Branches: 89.28% — need 90% (gap 0.72%)**
- **Functions: 92.98% — need 94% (gap 1.02%)**
- Tests themselves: **1038 pass / 3 skip — all green.**
- Threshold config: `jest.config.js:73-76` (`branches: 90, functions: 94`).

**Known uncovered lines** `[VV from coverage report]`: `src/lib/storage/storage.ts:86,90-91` · `src/lib/milestones/milestones.ts:21` (branch). Start there.

**Path to pass — pick ONE:**
- **(a) Add ~2 tests** covering the storage.ts migration branches (86, 90-91) + milestones.ts:21. Most likely closes both gaps. Use `jest-rtl-composer` skill for test structure. PREFERRED.
- **(b) Lower thresholds** in `jest.config.js:75-76` to `branches: 89, functions: 92`. Fast but weakens the bar — only if Andre approves. NOT recommended.

**Verify:** `./node_modules/.bin/jest --coverage` shows no threshold failure.

---

## 4. STEP-BY-STEP TO DEPLOY (do in this order)

### Step 1 — Close coverage (§3). Gate must be green.

### Step 2 — Commit the work
- Stage ONLY source files (exclude the 3 untracked artifacts in §2 + settings.local.json):
  - `git add src/`
  - Decide on `RUBRIX-AUDIT.md` (recommend: don't commit to Ledger).
- Use the `commit-message-generator` skill. Conventional format. Suggested:
  - `feat(accounts): 50/50 accordion split + solid status cards + begin-from-June reset`
- Husky runs eslint (`--max-warnings=0`) + tsc + jest on commit. If coverage still fails, commit is blocked — go back to §3.

### Step 3 — Adriane's Supabase reset `[USER/Andre action — agent must NOT run destructive DB ops]`
- File: `.scratch/RESET-adriane-june.sql`. Scoped to Adriane's `user_id` ONLY — Andre's account untouched.
- HOW: Supabase dashboard → SQL Editor. Get Adriane's UUID (Authentication → Users → copy her id). Replace every `:UID` with that UUID. Run all.
- What it does `[VV read the SQL]`: June bills → unpaid (keeps name+amount); June `income.kias_pay` → 0; deletes June `paycheck_weeks`, June `check_log`, June `snapshots`, ALL `savings_log`, ALL `bank_accounts` — all `where user_id = ':UID'`.
- KEPT untouched: bills (payees+amounts), installment_plans, income military/retirement/SS.
- Supabase project ref: `htonsvjolkcehzwmqgpa` `[VV .scratch/STATE.md]`.

### Step 4 — Resolve Supabase migration mismatch `[NV — flagged in prior logs, not re-verified this session]`
- Local migrations `[VV]`: `supabase/migrations/0000_create_tables.sql`, `0001_enable_rls.sql`.
- Before deploy: run `supabase migration list` (or dashboard → Database → Migrations) and confirm local == remote. If drift, reconcile (repair/push) BEFORE deploy. **Do not deploy with unverified migration state.**

### Step 5 — Vercel production deploy
- Set prod env vars in Vercel dashboard. **CRITICAL: `DEV_AUTH_BYPASS` must NOT be set in production** (it bypasses login — security hole; it's only for local dev via `.env.local`).
- Required prod env `[NV — confirm full list against .env.local keys]`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus any Supabase service/allowlist keys the app reads. Read `.env.local` for the exact key names; copy the non-dev ones to Vercel.
- Email allowlist: commit `d5e633d` added an email-allowlist gate. Confirm Adriane's email is on the allowlist so she can log in. `[NV — find the allowlist source: grep for the allowlist env/const]`.
- Deploy (push to the branch Vercel watches, or `vercel --prod`).

### Step 6 — Live smoke test (Done-State #6)
- Adriane logs in with her email → allowlist passes.
- Home/Accounts show her real bills; savings + goals empty (fresh start); June bills unpaid.
- No dummy data. No console auth-bypass.

---

## 5. CRITICAL CONSTRAINTS (verbatim from Andre — do NOT violate)

- **"Do not edit seed data VALUES for bills/plans/income"** — those feed tracking mechanisms. (savings/goals were dummy and sanctioned to empty — already done.)
- **"Bank accounts are on hold til we integrate Plaid API."** Don't build bank-account features.
- **"The acct info for my acct should be unchanged."** The reset is scoped to Adriane's `user_id`; never touch Andre's rows.
- **No destructive git/DB/file ops without explicit approval.** Agent does NOT run the reset SQL — Andre does.
- **Per-component rules** (`CLAUDE.md`): one React component per file; named-function components; hooks in `src/hooks/` WITH co-located test; CSS Modules only (no inline styles, no Tailwind); money in cents; no `new Date(string)` for month math.
- **Each tab must fit ONE viewport — no scrolling. This is a SHIP requirement** `[VV .scratch/STATE.md]`. Any change that introduces page scroll on a tab fails the bar.

---

## 6. FUTURE PHASES (after deploy — not blockers) `[VV from .scratch/TODO.md]`

- **Style the Income tab** — not yet designed/polished.
- **Style the Payoff tab** — same.
- **Optional one-time wipe of ~240 stale Supabase plan dupes** — HYDRATE already dedupes plans on load (`useAppState.ts`, by `label|mc|start|end|dueDay`), so they won't balloon; a dashboard cleanup is cosmetic, low priority.
- **Plaid integration** → unlocks the on-hold bank-accounts feature.
- **Snapshots tab, Messages, Dark mode, nav ticker** — built but hidden for v1 (`ab84a77`); re-enable in a later phase if wanted.
- **Home bento polish** `[VV .scratch/STATE.md]`: frosted header, header account chips, `prefers-reduced-motion` gating of gauge/pulse animations. Cosmetic, deferred.
- **Dead CSS cleanup**: `HomeTab.module.css` has unused `.month*`, `.answerRow`, `.weekBand` classes — harmless, prune later.

---

## 7. SEPARATE THREAD — not part of Ledger deploy

This session also produced **`RUBRIX-AUDIT.md`** (repo root) — an audit of Andre's rubrix behavioral-hook system (26 weak spots + full rule inventory). It is UNRELATED to shipping Ledger. Andre is taking it to an external LLM + council. Do not fold it into Ledger work. Open rubrix item: a hook-message reword ("re-emit" → "append only") to stop duplicate re-emits on Stop-block — denied by the self-modify classifier, awaiting Andre's explicit go.

---

## 8. KEY PATHS QUICK-REF

| Need | Path |
|---|---|
| Domain context | `ctx/LEDGER.md`, `AGENTS.md`, `CLAUDE.md` (root) |
| State management | `src/hooks/useAppState/useAppState.ts` (dispatch only) |
| Reset SQL | `.scratch/RESET-adriane-june.sql` |
| Coverage config | `jest.config.js:73-76` |
| Migrations | `supabase/migrations/` |
| Session memory | `.scratch/` (HANDOFF, STATE, LOG, TODO) |
| Accordion prototype | `.scratch/accordion-lab.html` |
| Env (local) | `.env.local` |

---

_Verified against git + files 2026-06-12. Items tagged `[NV]` need re-confirmation by the next agent before action: Supabase ref, migration drift state, full prod env-var list, allowlist source. Everything else is `[VV]`._
