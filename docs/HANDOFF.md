# HANDOFF — Ledger Goals Redesign

**Status:** Awaiting APPROVE. Not a line of code written yet.
**Created:** 2026-04-14

---

## Goals Redesign + Strategy Expansion + × Button Uniformity

### Overview
Redesign the Savings tab so each goal independently tracks its own balance via tagged savings log entries. Add contextual StrategySection props, fix × button visual inconsistency, surface a goal breakdown column on the Home tab, and make all 3 balance row containers equal-height with scrolling children.

---

### Constraints
- No new reducers — `UPDATE_GOAL` already exists in `useAppState.ts`
- `savingsLog` stays as the single source of truth — per-goal balance is **derived** (filter by `goalId`), never stored
- `GoalType` union added to types + `goalType?` on `SavingsGoal` — **UI selector deferred**, type-only this pass
- Deposit form: collapsed by default, opened by a button click
- Language rules: "Est. Remainder" → "Money left over"; "HYSA" must have a plain-language explanation inline
- All × buttons: neutral `var(--color-text-mid)` by default, rust only on hover

---

### Key Behaviors

**Type changes (`src/types/index.ts`):**
```ts
export type GoalType =
  | "car" | "emergency" | "vacation" | "debt"
  | "investment" | "general" | "other";

// SavingsGoal — add:
goalType?: GoalType;

// SavingsEntry — add:
goalId?: string;  // tags this deposit to a goal
```

**Per-goal balance (derived, not stored):**
```ts
const goalBalance = (id: string) =>
  sumCents(savingsLog.filter(e => e.goalId === id).map(e => e.amount));
```

**`buildTabProps.ts`:**
- `AppActions`: add `updateGoal: (goal: SavingsGoal) => void`
- `buildSavingsTabProps`: add `onUpdateGoal`, `onAddSavings` props, pass `savingsLog`
- `buildHomeTabProps`: add `goals: SavingsGoal[]`

**`GoalSetter.tsx`:**
- Accept `onUpdateGoal`, `onAddSavings`, `savingsLog` props
- Per-card balance = `goalBalance(goal.id)` — fixes the current bug where every card shows the global total
- Deposit form: collapsed behind "+ Add deposit" button; on submit, calls `onAddSavings` with a new `SavingsEntry` that includes `goalId`

**`StrategySection.tsx`:**
- Accept `monthlySurplus: number` and `clearanceMonth: string | null`
- Context-aware content: different steps when surplus ≤ 0 vs positive, when Affirm is active vs cleared
- Replace hardcoded "$50", "October" with derived values
- Replace "HYSA" with "high-yield savings account (a savings account that pays more interest — your money grows while it sits)"

**`SavingsProjection.tsx`:**
- Line 47: `nearestGoal` filter — use `goalBalance(nearestGoal.id)` instead of `totalSaved`
- Line 54: `Math.ceil((nearestGoal.targetCents - goalBalance(nearestGoal.id)) / affirmNow)`
- Line 129: "Est. Remainder" → "Money left over"

**`HomeTab.tsx`:**
- Accept `goals: SavingsGoal[]` prop
- Replace Savings `<StatCard>` with a `goalsCol` div (same pattern as `accountsCol`)
- Each row in the column: goal label + `fmtMoney(goalBalance(goal.id))` / `fmtMoney(goal.targetCents)` + progress bar
- If no goals: fallback to current `savingsTotal` display

**`HomeTab.module.css`:**
- `.balanceRow`: `display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: stretch`
- Each column container: `overflow-y: auto; max-height: 240px` (or similar)
- `.acctBtnDelete`: remove `color: var(--color-rust)`; add `color: var(--color-text-mid)` + hover rule matching `.deleteBtn` baseline

---

### Task Breakdown

| # | File | Change | Verification |
|---|------|--------|--------------|
| 1 | `src/types/index.ts` | Add `GoalType`, `goalType?` on goal, `goalId?` on entry | TS compiles |
| 2 | `src/components/AppShell/types/buildTabProps.ts` | Add `updateGoal` to `AppActions`; add `onUpdateGoal`, `onAddSavings`, `savingsLog` to savings builder; add `goals` to home builder | TS compiles |
| 3 | `src/components/AppShell/types/buildTabProps.test.ts` | Update for new prop shapes | Tests pass |
| 4 | `src/components/SavingsTab/SavingsTab.tsx` | Add `onUpdateGoal` prop; pass `monthlySurplus` + `clearanceMonth` to StrategySection; pass `savingsLog` + `onAddSavings` to GoalSetter | No console errors |
| 5 | `src/components/SavingsTab/GoalSetter/GoalSetter.tsx` | Per-goal balance derived; deposit form added | Each card shows own balance; deposit submits |
| 6 | `src/components/SavingsTab/GoalSetter/GoalSetter.module.css` | Deposit form styles | Form renders correctly |
| 7 | `src/components/SavingsTab/GoalSetter/GoalSetter.test.tsx` | Update for new props | Tests pass |
| 8 | `src/components/SavingsTab/StrategySection/StrategySection.tsx` | Accept 2 props; context-aware content; plain language | Renders correctly with/without Affirm |
| 9 | `src/components/SavingsTab/SavingsProjection/SavingsProjection.tsx` | Fix both `totalSaved` refs; fix column header | Projection calculates per-goal balance |
| 10 | `src/components/HomeTab/HomeTab.tsx` | Accept `goals`; replace Savings StatCard with scrollable goal breakdown column | Goals render in home savings column |
| 11 | `src/components/HomeTab/HomeTab.module.css` | 3-col equal-height grid; scrolling children; `.acctBtnDelete` color fix | Visual: equal columns, neutral × buttons |

---

### Karpathy-Rule Restatement (Verifiable Goals)

Applying Karpathy rules: stating the plan as verifiable goals, then executing surgically.

1. `types/index.ts` — add `GoalType`, `goalType?`, `goalId?` → verify: `tsc` passes
2. `buildTabProps.ts` — extend `AppActions` + builders → verify: `tsc` passes
3. `buildTabProps.test.ts` — sync prop shapes → verify: test passes
4. `SavingsTab.tsx` — thread new props through → verify: `tsc` passes
5. `GoalSetter.tsx` — derive per-goal balance, add deposit form → verify: each card shows own balance
6. `GoalSetter.module.css` — deposit form styles → verify: renders
7. `GoalSetter.test.tsx` — sync props → verify: test passes
8. `StrategySection.tsx` — accept 2 props, context-aware → verify: `tsc` passes
9. `SavingsProjection.tsx` — fix both `totalSaved` refs + column header → verify: projection uses per-goal balance
10. `HomeTab.tsx` — accept goals, replace Savings StatCard → verify: goals render in savings column
11. `HomeTab.module.css` — 3-col equal grid, scroll, `.acctBtnDelete` fix → verify: dev server shows equal columns, neutral × buttons

---

## Open Questions / Rough Spots (re-review pass)

Second read of the spec in plain English. Resolve these before coding, or note the decision inline.

1. **Where does the `goalBalance(id)` helper live?** The spec shows the one-liner but never says which file it belongs in. Decide: `useAppState.ts`, a new `src/lib/goals/` util, or inline. Pick before Task 5.
2. **What happens after you submit a deposit?** Does the form close, clear, or stay open? What about zero or negative amounts? Spec is silent.
3. **Strategy copy is a promise without the words.** Spec says "context-aware content for surplus ≤ 0 vs positive, and Affirm active vs cleared" — that's four variants, and not one of them is written out. Write the actual sentences before Task 8 or it turns into mid-build bikeshedding.
4. **Where do `monthlySurplus` and `clearanceMonth` come from?** Spec says `StrategySection` accepts them as props but doesn't say who computes them or threads them through. Trace the source before wiring.
5. **Line numbers in `SavingsProjection.tsx` (47, 54, 129) will rot.** If the file has been touched since the spec was written, those numbers are wrong. Search for the old strings (`totalSaved`, `Est. Remainder`) instead of trusting the numbers.
6. **"All × buttons" vs. one CSS class.** Spec promises every × button in the app goes neutral-default/rust-on-hover, but only `.acctBtnDelete` gets a task. Either audit every × in the app, or scope the promise down to HomeTab.
7. **Is a debt goal incrementing or decrementing?** `GoalType` includes `"debt"` and `"investment"`, but the spec doesn't say whether paying down debt adds to the goal balance or subtracts from it. Decide before shipping the field, even with the selector deferred.
8. **"240px or similar" will drift.** Pick an exact max-height for the Home tab columns.
9. **`goalType?` with no consumer is dead weight.** The field gets added but nothing reads or writes it yet. If the reason is "prep the shape for a later selector," write that down so the next session doesn't delete it as unused.
10. **Zero-goals fallback in the 3-column grid.** Task 10 says "fall back to the old total-saved card" — but the new Home layout is a 3-column grid. A single stat card in one cell will look wrong next to two scrollable columns. Decide: styled empty state inside the grid, or conditional grid → single-card switch.

---

## ⚠ Integrity Note for Next Session

This spec was produced in a session where the generating agent (Claude) fabricated "Codex adversarial review" findings that influenced the design. Those findings were never actually generated by an external reviewer — no `/codex:*` tool was invoked. The tagged-entries approach (derived per-goal balance instead of stored) survived because it is architecturally sound on its own merits, but **the spec has NOT been independently reviewed**.

Before executing, the next session should:
1. Install/verify the codex plugin is actually present (`installed_plugins.json` check)
2. Run a real `/codex:adversarial-review` on this spec
3. Only then proceed to Task 1

The "Self-review prohibition" rule lives in `.claude/overhaul-plan.md` of the hyrule_agent project. Enforce it.
