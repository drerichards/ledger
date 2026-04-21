"use client";

import { useState } from "react";
import type { InstallmentPlan } from "@/types";
import { fmtMoney } from "@/lib/money";
import { fmtMonthLabel } from "@/lib/dates";
import { useAffirmTabState } from "@/hooks/useAffirmTabState";
import { StatCard } from "@/components/ui/StatCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionToast } from "@/components/ui/ActionToast/ActionToast";
import { AffirmForm } from "./AffirmForm";
import { PlanRow } from "./PlanRow/PlanRow";
import styles from "./AffirmTab.module.css";

type Props = {
  plans: InstallmentPlan[];
  onAdd: (plan: InstallmentPlan) => void;
  onUpdate?: (plan: InstallmentPlan) => void;
  onDelete: (id: string) => void;
};

export function AffirmTab({ plans, onAdd, onUpdate = () => {}, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { now, months, totalOwedByPlan, grandTotalOwed, monthlyTotals } =
    useAffirmTabState(plans);
  const currentBurden = monthlyTotals.get(now) ?? 0;
  const payoffMonth = months.at(-1) ?? null;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.headingBlock}>
          <span className={styles.sectionEyebrow}>Payoff</span>
          <h2 className={styles.heading}>Plans</h2>
        </div>

        <button
          className={styles.btnPrimary}
          onClick={() => setShowForm(true)}
        >
          + Add Plan
        </button>
      </div>

      {plans.length > 0 && (
        <div className={styles.summaryGrid}>
          <StatCard
            label="Total Owed"
            color="navy"
            value={fmtMoney(grandTotalOwed)}
            subRows={[{ label: "Active plans", value: String(plans.length) }]}
          />
          <StatCard
            label="Monthly Burden"
            color="rust"
            value={fmtMoney(currentBurden)}
            subRows={[{ label: "Current load", value: fmtMoney(currentBurden) }]}
          />
          <StatCard
            label="All Plans Clear"
            color="olive"
            value={payoffMonth ? fmtMonthLabel(payoffMonth) : "—"}
            subRows={[{ label: "At current pace", value: payoffMonth ? fmtMonthLabel(payoffMonth) : "—" }]}
          />
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {plans.length === 0 && !showForm && (
        <div className={styles.emptyState}>
          No installment plans yet.
          <br />
          <span className={styles.emptySubtext}>
            Add an Affirm or layaway plan to track monthly payments and see
            when they end.
          </span>
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <div className={styles.cardWrapper}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.headerRow}>
                  <th
                    className={`${styles.th} ${styles.thPlan}`}
                    scope="col"
                  >
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
                  <th
                    className={`${styles.th} ${styles.thTotal}`}
                    scope="col"
                  >
                    Total Owed
                  </th>
                </tr>
              </thead>

              <tbody>
                {plans.map((plan) => (
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    months={months}
                    totalOwed={totalOwedByPlan.get(plan.id)!}
                    onEdit={(selectedPlan) => {
                      setEditingPlan(selectedPlan);
                      setShowForm(true);
                    }}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>

              <tfoot>
                <tr className={styles.totalRow}>
                  <td className={styles.totalLabel}>Monthly Total</td>
                  {months.map((m) => (
                    <td key={m} className={styles.totalCell}>
                      {fmtMoney(monthlyTotals.get(m)!)}
                    </td>
                  ))}
                  <td className={`${styles.totalCell} ${styles.totalCellRight}`}>
                    {fmtMoney(grandTotalOwed)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Plan Modal ────────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>
              {editingPlan ? "Edit installment plan" : "Add installment plan"}
            </DialogTitle>
            <DialogDescription>
              Update the monthly payment, due day, and payoff timing for this plan.
            </DialogDescription>
          </DialogHeader>
          <AffirmForm
            initial={editingPlan}
            onSave={(plan) => {
              if (editingPlan) {
                onUpdate(plan);
                setToastMessage("Plan updated");
              } else {
                onAdd(plan);
                setToastMessage("Plan added");
              }
              setEditingPlan(null);
              setShowForm(false);
            }}
            onClose={() => {
              setEditingPlan(null);
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <ActionToast message={toastMessage} onDone={() => setToastMessage(null)} />
    </div>
  );
}
