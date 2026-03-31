import type { InstallmentPlan } from "@/types";
import { fmtMoney } from "@/lib/money";
import styles from "./AffirmTab.module.css";

type Props = {
  plan: InstallmentPlan;
};

/**
 * Shown at the top of the Affirm tab when a plan hits its final payment this month.
 * Celebrates the win and states the monthly amount freed up.
 */
export function PayoffMilestone({ plan }: Props) {
  return (
    <div className={styles.milestone}>
      <span className={styles.milestoneIcon}>🎉</span>
      <div>
        <strong>{plan.label}</strong> is paid off this month. You freed up{" "}
        <span className={styles.milestoneAmount}>
          {fmtMoney(plan.mc)}/month
        </span>
        .
      </div>
    </div>
  );
}
