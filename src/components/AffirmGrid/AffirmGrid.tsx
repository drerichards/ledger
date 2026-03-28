"use client";

import { useState } from "react";
import type { InstallmentPlan } from "@/types";
import {
  getAffirmGridMonths,
  getAffirmTotalForMonth,
  isFinalMonth,
  getPlansEndingInMonth,
} from "@/lib/affirm";
import { fmtMoney } from "@/lib/money";
import { fmtMonthLabel, currentMonth } from "@/lib/dates";
import { AffirmForm } from "./AffirmForm";
import { PayoffMilestone } from "./PayoffMilestone";
import styles from "./AffirmGrid.module.css";

type Props = {
  plans: InstallmentPlan[];
  onAdd: (plan: InstallmentPlan) => void;
  onDelete: (id: string) => void;
};

export function AffirmGrid({ plans, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);

  const months = getAffirmGridMonths(plans);
  const now = currentMonth();
  const milestonePlans = getPlansEndingInMonth(plans, now);

  return (
    <div className={styles.container}>
      {/* ── Payoff Milestones ──────────────────────────────────────── */}
      {milestonePlans.map((plan) => (
        <PayoffMilestone key={plan.id} plan={plan} />
      ))}

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Affirm Plans</h2>
        <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
          + Add Plan
        </button>
      </div>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {plans.length === 0 && !showForm && (
        <div className={styles.emptyState}>
          No installment plans yet.
          <br />
          <span className={styles.emptySubtext}>
            Add an Affirm or layaway plan to track monthly payments and see when
            they end.
          </span>
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={`${styles.th} ${styles.thPlan}`}>
                  Plan
                </th>
                {months.map((m) => (
                  <th
                    key={m}
                    scope="col"
                    className={`${styles.th} ${m === now ? styles.thCurrent : ""}`}
                  >
                    {fmtMonthLabel(m)}
                  </th>
                ))}
                <th scope="col" className={`${styles.th} ${styles.thTotal}`}>
                  Total Owed
                </th>
                <th scope="col" className={`${styles.th} ${styles.thDelete}`} />
              </tr>
            </thead>

            <tbody>
              {plans.map((plan) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  months={months}
                  onDelete={onDelete}
                />
              ))}
            </tbody>

            {/* ── Monthly burden totals row ────────────────────────── */}
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.totalLabel}>Monthly Total</td>
                {months.map((m) => (
                  <td key={m} className={styles.totalCell}>
                    {fmtMoney(getAffirmTotalForMonth(plans, m))}
                  </td>
                ))}
                <td className={`${styles.totalCell} ${styles.totalCellRight}`}>
                  {fmtMoney(
                    plans.reduce((sum, p) => {
                      const planMonths = getAffirmGridMonths([p]);
                      return sum + p.mc * planMonths.length;
                    }, 0),
                  )}
                </td>
                <td className={styles.totalCellEnd} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Add Plan Modal ────────────────────────────────────────── */}
      {showForm && (
        <AffirmForm
          onSave={(plan) => {
            onAdd(plan);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ─── Plan Row ─────────────────────────────────────────────────────────────────

function PlanRow({
  plan,
  months,
  onDelete,
}: {
  plan: InstallmentPlan;
  months: string[];
  onDelete: (id: string) => void;
}) {
  const totalOwed = plan.mc * getAffirmGridMonths([plan]).length;

  return (
    <tr className={styles.row}>
      {/* Plan label */}
      <td className={`${styles.td} ${styles.tdPlan}`}>
        <span className={styles.planLabel}>{plan.label}</span>
        <span className={styles.planRate}>{fmtMoney(plan.mc)}/mo</span>
      </td>

      {/* Monthly cells */}
      {months.map((m) => {
        const isActive = plan.start <= m && plan.end >= m;
        const isFinal = isFinalMonth(plan, m);

        if (!isActive) {
          return <td key={m} className={styles.tdInactive} />;
        }

        return (
          <td
            key={m}
            className={`${styles.tdActive} ${isFinal ? styles.tdFinal : ""}`}
          >
            <span className={styles.cellAmount}>{fmtMoney(plan.mc)}</span>
            {isFinal && (
              <span
                className={styles.finalBadge}
                title="Last scheduled payment"
              >
                FINAL
              </span>
            )}
          </td>
        );
      })}

      {/* Total owed */}
      <td className={`${styles.td} ${styles.tdTotalOwed}`}>
        {fmtMoney(totalOwed)}
      </td>

      {/* Delete */}
      <td className={`${styles.td} ${styles.tdDelete}`}>
        <button
          className={styles.btnDanger}
          onClick={() => onDelete(plan.id)}
          aria-label={`Delete ${plan.label}`}
        >
          Del
        </button>
      </td>
    </tr>
  );
}
