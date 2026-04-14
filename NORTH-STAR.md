# North Star — Ledger

> This document is the soul of the app. Read it before designing any feature.
> Last updated: 2026-04-14

---

## The Person We're Building For

Her name is Adriane. She's Andre's mother. Her husband is Kia. She's not bad with money — she was never taught how to be good with it.
She learned about money the wrong way: from life, from survival, from watching the account drain
and saying *"it's always something"* because that was the only explanation that made sense.

She's not looking for charts. She's looking for relief.
She wants to open an app and feel — for the first time — like she has it handled.
Not overwhelmed. Not judged. **Handled.**

---

## What This App Is

**Ledger is a financial confidence app, not a financial tracking app.**

The difference:
- Tracking apps (Rocket Money, Monarch) show you what's happening to your money. They're mirrors.
- Ledger shows you what to *do* — and teaches you why as you go. It's a coach.

Three things Ledger does that mirrors don't:

1. **See** — Know exactly where you stand. No surprises. Cash flow, bills, balances, all in one place.
2. **Cut** — Minimize waste. Find the subscriptions that quietly drain you. Understand what your spending actually costs per year.
3. **Build** — Set goals with strategy. Pay down debt deliberately. Grow savings intentionally. Celebrate the wins.

The app should feel like a sigh of relief after years of feeling none.

---

## The Experience We're Building

Every screen should answer one of these questions:
- **Where am I?** (Home tab — cash flow, balances, what's due)
- **Where is it going?** (Activity / Debt — spending patterns, subscriptions bleeding you)
- **Where do I want to be?** (Goals / Savings — goals with strategy, not just piggy banks)
- **What do I do next?** (Strategy / Paycheck — actionable steps based on actual state)

And throughout: **plain language. No finance-degree vocabulary.** If someone who never had a savings account can't understand it, rewrite it.

---

## Full Feature Vision

### Home Tab
- Equal-weight stat cards (Checking, Savings, Total Liquid)
- Cash flow table showing the week ahead — what hits, what's left
- Next Due pills so nothing sneaks up on her
- Covered/shortfall band — simple yes/no: are you covered this week?

### Accounts Tab (Bills)
- All bills grouped by account/type
- Autopay vs manual — she knows what needs her attention
- Mark paid / unpaid
- Amount history — track when bills change

### Paycheck Tab
- Weekly allocation: where does each paycheck go?
- Visual breakdown: bills, savings, Affirm, discretionary
- "After everything, you have $X left" — the number that matters

### Activity Tab
- Timeline of bill amount changes — see what's creeping up on you
- Pattern recognition: this bill jumped $20 three months ago

### Income Tab *(needs mockup — untouched)*
- Log income sources
- Irregular income tracking (hourly/tips workers)
- Income baseline for projections

### Debt Tab *(needs mockup — untouched)*
- All debt in one place: credit cards, loans, Affirm
- Annual cost of current debt
- Payoff strategy recommendations:
  - Avalanche (highest interest first) — saves the most money
  - Snowball (smallest balance first) — builds momentum
  - "If you add $50/month to this card, you're out in X months"
- Plain-language explanation of each strategy

### Savings Tab
- **Goals — independent tracking (pending redesign)**
  - Each goal tracks its own balance separately — separate from total savings
  - Goal types the user can choose:
    - Car savings
    - Emergency fund
    - Vacation
    - Debt payoff (goal = zero)
    - General savings
    - Investment / brokerage contribution
    - Other (custom)
  - Choose which fund tracks this goal (savings account, investment account, etc.)
    - NOT pooled with vacation money or other goals
  - Per-goal strategy tips based on financial state:
    - "With your current surplus, you could hit this in X months if you set aside $Y"
    - "Tip: High-yield savings accounts pay 4–5% interest — your money grows while it sits"
    - "Your Affirm payoff frees up $Z/mo — redirecting it here gets you there faster"
  - Progress bar tied to the goal's own balance (not total saved)
  - Milestone celebrations — small wins matter when you're building from scratch

- **Savings Projection**
  - 12-month runway based on income baseline
  - Conservative / Average / Optimistic scenarios
  - Plain-language callouts — no "HYSA", no jargon

- **Strategy subtab — expanded beyond savings accounts**
  - Covers all building strategies: emergency fund, debt payoff, goal funding, investment basics
  - Actionable steps for Kia's specific financial state
  - Context-aware: different tips when Affirm is active vs. cleared
  - Frugality tips: not "be cheap" but "be intentional"

### Subscription Tracker *(to be built)*
- Log all recurring subscriptions (Netflix, Spotify, gym, etc.)
- Last used / still using toggle
- Annual cost calculation: "$847/year on subscriptions — $312 of that you haven't used this month"
- "Cut these 2 and save $X/year" recommendation
- Integrates with Goals: "freeing up subscription money = X months faster to your car goal"

---

## What Makes This Different

| Feature | Rocket Money | Monarch | Ledger |
|---|---|---|---|
| Bill tracking | ✅ | ✅ | ✅ |
| Cash flow projection | ❌ | Partial | ✅ |
| Goal tracking | Basic | Basic | Independent, typed, with strategy |
| Debt strategy | ❌ | ❌ | ✅ (planned) |
| Subscription audit | ✅ (paid) | ❌ | ✅ (planned) |
| Financial literacy layer | ❌ | ❌ | ✅ — built in everywhere |
| Personal tone | ❌ | ❌ | ✅ — uses her name, knows her situation |
| Plain language | ❌ | ❌ | ✅ — written for someone who learned from life, not school |

---

## Language Rules

The app speaks to Kia, not at her. Every callout, tip, and label should pass this test:
**"Could someone who never had a savings account understand this in 5 seconds?"**

- Say **"money left over"**, not "Est. Remainder"
- Say **"bills paid off"**, not "Affirm clearance"
- Say **"set aside before you spend it"**, not "transfer to HYSA"
- Say **"the habit"** or **"the move"**, not "recommended action"
- When something is good: celebrate it — "You're covered this week ✅"
- When something is tight: be honest but not scary — "A little short this week — let's look at what's due"

---

## The Feeling

She opens the app.
She sees her money — all of it, clearly.
She knows what's due.
She knows she's covered.
She sees her car goal getting closer.
She remembers she hasn't used that gym membership in 4 months.
She reads one plain sentence about why paying off the Affirm first makes sense.
She closes the app feeling like she's in control of something, maybe for the first time.

That's the app.
