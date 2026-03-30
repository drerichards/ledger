# Projection Scenario Spec

## Why Three Scenarios

Kia's checks range from $441.27 to $1,421.12 — nearly 3x swing.
Planning against the average is dangerous. Default to Conservative.

| Scenario     | Baseline | Weekly Amount |
| ------------ | -------- | ------------- |
| Conservative | Low      | $441.27       |
| Average      | Mean     | $984.95       |
| Optimistic   | High     | $1,421.12     |

---

## File 1 — `src/lib/projection.ts`

Add these — do not remove existing functions:

```typescript
export type ProjectionScenario = "conservative" | "average" | "optimistic";

export function getWeeklyBaseline(
  baseline: CheckBaseline,
  scenario: ProjectionScenario,
): number {
  switch (scenario) {
    case "conservative":
      return baseline.low;
    case "average":
      return baseline.average;
    case "optimistic":
      return baseline.high;
  }
}
```

---

## File 2 — `src/components/PaycheckTab/SavingsProjection.tsx`

### Import change

```typescript
import {
  calcCheckBaseline,
  projectMonthlyKiasPay,
  getWeeklyBaseline,
  type ProjectionScenario,
} from "@/lib/projection";
```

### State to add

```typescript
const [scenario, setScenario] = useState<ProjectionScenario>("conservative");
```

### Calculation change

```typescript
// Before:
const projIncome = projectMonthlyKiasPay(baseline.average);

// After:
const weeklyBaseline = getWeeklyBaseline(baseline, scenario);
const projIncome = projectMonthlyKiasPay(weeklyBaseline);
```

### UI to add — above the table

```tsx
<div className={styles.scenarioToggle}>
  {(["conservative", "average", "optimistic"] as ProjectionScenario[]).map(
    (s) => (
      <button
        key={s}
        className={`${styles.scenarioBtn} ${scenario === s ? styles.scenarioBtnActive : ""}`}
        onClick={() => setScenario(s)}
      >
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </button>
    ),
  )}
</div>
```

### Note line — replace static text with dynamic

```tsx
<p className={styles.projectionNote}>
  {scenario === "conservative" &&
    `Conservative: based on Kia's lowest check of ${fmtMoney(baseline.low)}/week.`}
  {scenario === "average" &&
    `Average: based on Kia's mean check of ${fmtMoney(baseline.average)}/week.`}
  {scenario === "optimistic" &&
    `Optimistic: based on Kia's highest check of ${fmtMoney(baseline.high)}/week.`}
</p>
```

### Warning — show when Conservative can't cover bills

```tsx
{
  scenario === "conservative" &&
    baseline.low < affirmMonthlyTotal + monthlyFixed && (
      <div className={styles.warning}>
        ⚠️ On a low week, Kia's check may not cover all allocations.
      </div>
    );
}
```

---

## File 3 — `src/components/PaycheckTab/PaycheckTab.module.css`

Add these styles:

```css
.scenarioToggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  align-self: flex-start;
}

.scenarioBtn {
  padding: 6px 14px;
  font-size: var(--text-xs);
  font-weight: 600;
  border: none;
  border-right: 1px solid var(--color-border);
  background: var(--color-white);
  color: var(--color-text-mid);
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 0.12s;
}

.scenarioBtn:last-child {
  border-right: none;
}

.scenarioBtnActive {
  background: var(--color-navy);
  color: var(--color-white);
}

.warning {
  padding: 8px 12px;
  background: var(--color-rust-light);
  border: 1px solid var(--color-rust);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--color-rust);
  font-weight: 500;
}
```

---

## Only 3 files change

- `src/lib/projection.ts`
- `src/components/PaycheckTab/SavingsProjection.tsx`
- `src/components/PaycheckTab/PaycheckTab.module.css`

Do not touch anything else.

## Verification

- Conservative: ~$441 × 4 = ~$1,765/month income in projection
- Average: ~$985 × 4 = ~$3,940/month
- Optimistic: ~$1,421 × 4 = ~$5,684/month
- Switching scenarios updates all 12 rows simultaneously

```

Then add one line to `CLAUDE.md` under Key Files:
```

PROJECTION_SPEC.md — spec for three-scenario savings projection
