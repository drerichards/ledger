"use client";

import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckWeek,
  SavingsEntry,
  SavingsGoal,
} from "@/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/StatCard";
import { sumCents, fmtMoney } from "@/lib/money";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import { currentMonth, advanceMonth, fmtMonthLabel } from "@/lib/dates";
import { SavingsTracker } from "./SavingsTracker";
import { SavingsProjection } from "./SavingsProjection";
import { PayeeReductionPlanner } from "./PayeeReductionPlanner";
import { GoalSetter } from "./GoalSetter";
import { StrategySection } from "./StrategySection/StrategySection";
import styles from "./SavingsTab.module.css";

type Props = {
  plans: InstallmentPlan[];
  checking: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  paycheck: PaycheckWeek[];
  goals: SavingsGoal[];
  onAddSavings: (entry: SavingsEntry) => void;
  onUpdateSavings: (entry: SavingsEntry) => void;
  onDeleteSavings: (id: string) => void;
  onAddGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (id: string) => void;
};

export function SavingsTab({
  plans,
  checking,
  savingsLog,
  paycheck,
  goals,
  onAddSavings,
  onUpdateSavings,
  onDeleteSavings,
  onAddGoal,
  onDeleteGoal,
}: Props) {
  // ── Goals stat row ─────────────────────────────────────────────────────────
  const thisMonth = currentMonth();
  const totalSaved = sumCents(savingsLog.map((e) => e.amount));

  // Monthly surplus from paycheck: average weekly net × 4.33 – monthly Affirm
  const recentWeeks = paycheck
    .filter((w) => w.weekOf >= advanceMonth(thisMonth, -2))
    .slice(-8);
  const weeklyNet =
    recentWeeks.length > 0
      ? recentWeeks.reduce(
          (s, w) =>
            s +
            w.kiasPay -
            w.storage -
            w.rent -
            w.jazmin -
            w.dre -
            w.paypalCC -
            w.deductions,
          0,
        ) / recentWeeks.length
      : 0;
  const monthlyAffirm = getAffirmTotalForMonth(plans, thisMonth);
  const monthlySurplus = Math.round(weeklyNet * 4.33) - monthlyAffirm;

  // Affirm clearance: first future month where all plans are done
  const affirmNow = getAffirmTotalForMonth(plans, thisMonth);
  const futureMonths = Array.from({ length: 36 }, (_, i) =>
    advanceMonth(thisMonth, i + 1),
  );
  const clearanceMonth =
    affirmNow > 0
      ? (futureMonths.find((m) => getAffirmTotalForMonth(plans, m) === 0) ??
        null)
      : null;
  const affirmFreedUpCents = plans
    .filter((p) => p.end >= thisMonth)
    .reduce((sum, p) => sum + p.mc, 0);

  return (
    <div className={styles.container}>
      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="debt">Debt</TabsTrigger>
          <TabsTrigger value="projection">Projection</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          {/* ── Stat row ───────────────────────────────────────────── */}
          <div className={styles.statsRow}>
            <StatCard
              label="Total Saved"
              value={fmtMoney(totalSaved)}
              color="olive"
            />
            <StatCard
              label="Monthly Surplus"
              value={monthlySurplus > 0 ? fmtMoney(monthlySurplus) : "—"}
              color={monthlySurplus > 0 ? "gold" : "rust"}
            />
            <StatCard
              label="Affirm Clears"
              value={
                clearanceMonth
                  ? fmtMonthLabel(clearanceMonth)
                  : affirmNow === 0
                    ? "Clear ✓"
                    : "36 mo+"
              }
              color="navy"
              subRows={
                affirmFreedUpCents > 0
                  ? [
                      {
                        label: "Frees up monthly",
                        value: fmtMoney(affirmFreedUpCents),
                      },
                    ]
                  : undefined
              }
            />
          </div>

          {/* ── Affirm projection callout ───────────────────────── */}
          {clearanceMonth && affirmFreedUpCents > 0 && (
            <div className={styles.callout}>
              🎯&nbsp; After Affirm clears ({fmtMonthLabel(clearanceMonth)}),
              redirect <strong>{fmtMoney(affirmFreedUpCents)}/mo</strong>{" "}
              straight to your goals.
            </div>
          )}

          {/* ── Goals + Savings Log side by side ─────────────── */}
          <div className={styles.goalsGrid}>
            <GoalSetter
              goals={goals}
              savingsLog={savingsLog}
              onAdd={onAddGoal}
              onDelete={onDeleteGoal}
            />
            <div className={styles.logSection}>
              <p className={styles.logSectionLabel}>Savings Log</p>
              <SavingsTracker
                log={savingsLog}
                onAdd={onAddSavings}
                onUpdate={onUpdateSavings}
                onDelete={onDeleteSavings}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="strategy">
          <StrategySection />
        </TabsContent>

        <TabsContent value="debt">
          <PayeeReductionPlanner plans={plans} />
        </TabsContent>

        <TabsContent value="projection">
          <SavingsProjection
            plans={plans}
            checkLog={checking}
            paycheck={paycheck}
            goals={goals}
            savingsLog={savingsLog}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
