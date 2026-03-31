"use client";

import React, { useState } from "react";
import type { InstallmentPlan } from "@/types";
import {
  getAffirmTotalForMonth,
  isFinalMonth,
} from "@/lib/affirm";
import { fmtMoney } from "@/lib/money";
import { fmtMonthLabel } from "@/lib/dates";
import { useAffirmTabState } from "@/hooks/useAffirmTabState";
import { AffirmForm } from "./AffirmForm";
import { PayoffMilestone } from "./PayoffMilestone";
import styles from "./AffirmTab.module.css";

type Props = {
  plans: InstallmentPlan[];
  onAdd: (plan: InstallmentPlan) => void;
  onDelete: (id: string) => void;
};

export function AffirmTab({ plans, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const { now, months, milestonePlans } = useAffirmTabState(plans);

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
                      const activeCount = months.filter(
                        (m) => p.start <= m && p.end >= m,
                      ).length;
                      return sum + p.mc * activeCount;
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

// ─── Plan Row (presenter) ─────────────────────────────────────────────────────

const PlanRow = React.memo(function PlanRow({
  plan,
  months,
  onDelete,
}: {
  plan: InstallmentPlan;
  months: string[];
  onDelete: (id: string) => void;
}) {
  const activeMonths = months.filter((m) => plan.start <= m && plan.end >= m);
  const totalOwed = plan.mc * activeMonths.length;

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
});
