"use client";

import type { BillCategory } from "@/types";
import { fmtMoney } from "@/lib/money";
import styles from "./SpendingDonut.module.css";

/**
 * "Where your money goes" — a donut ring of this month's bills grouped by
 * category, with a 2-column legend so every category stays visible. Pure
 * presentation: HomeTab derives the totals and passes them in.
 *
 * SVG geometry mirrors the design handoff: radius 70, stroke-width 22, ring
 * rotated −90° so the first segment starts at top. Segment colors come from
 * the --cat-* tokens via a className map (no inline color).
 */

export type DonutSegment = {
  category: BillCategory;
  cents: number;
};

type Props = {
  segments: DonutSegment[];
  subtitle: string;
};

const RADIUS = 70;
const STROKE = 22;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 1.5; // px gap between segments

// BillCategory → its --cat-* segment class.
const CAT_CLASS: Record<BillCategory, string> = {
  Housing: styles.catHousing,
  Utilities: styles.catUtilities,
  Insurance: styles.catInsurance,
  Transfers: styles.catTransfers,
  Subscriptions: styles.catSubscriptions,
  "Credit Cards": styles.catCreditCards,
  Loans: styles.catLoans,
  Savings: styles.catSavings,
  Other: styles.catOther,
};

export function SpendingDonut({ segments, subtitle }: Props) {
  const totalCents = segments.reduce((a, s) => a + s.cents, 0);
  const ordered = [...segments].filter((s) => s.cents > 0).sort((a, b) => b.cents - a.cents);

  // Build cumulative dash offsets for each arc — reduce keeps the running
  // offset internal (no outer `let` reassigned during render).
  const arcs = ordered.reduce<
    { offset: number; items: Array<DonutSegment & { dashArray: string; dashOffset: number }> }
  >(
    (acc, seg) => {
      const frac = totalCents > 0 ? seg.cents / totalCents : 0;
      const len = Math.max(0, frac * CIRC - GAP);
      acc.items.push({ ...seg, dashArray: `${len} ${CIRC - len}`, dashOffset: -acc.offset });
      return { offset: acc.offset + frac * CIRC, items: acc.items };
    },
    { offset: 0, items: [] },
  ).items;

  return (
    <div className={styles.donut}>
      <div className={styles.head}>
        <p className={styles.title}>Where your money goes</p>
        <p className={styles.meta}>{subtitle}</p>
      </div>

      <div className={styles.body}>
        <div className={styles.ringWrap}>
          <svg viewBox="0 0 180 180" className={styles.ring} role="img" aria-label="Spending by category">
            <g transform="rotate(-90 90 90)">
              <circle cx="90" cy="90" r={RADIUS} className={styles.track} strokeWidth={STROKE} fill="none" />
              {arcs.map((a) => (
                <circle
                  key={a.category}
                  cx="90"
                  cy="90"
                  r={RADIUS}
                  className={`${styles.seg} ${CAT_CLASS[a.category]}`}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={a.dashArray}
                  strokeDashoffset={a.dashOffset}
                />
              ))}
            </g>
            <text x="90" y="84" className={styles.centerNum} textAnchor="middle">
              {fmtMoney(totalCents)}
            </text>
            <text x="90" y="104" className={styles.centerSub} textAnchor="middle">
              this month
            </text>
          </svg>
        </div>

        <ul className={styles.legend}>
          {arcs.map((a) => (
            <li key={a.category} className={styles.legendItem}>
              <span className={`${styles.swatch} ${CAT_CLASS[a.category]}`} aria-hidden="true" />
              <span className={styles.legendLabel}>{a.category}</span>
              <span className={styles.legendAmt}>{fmtMoney(a.cents)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
