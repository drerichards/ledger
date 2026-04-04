"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { AppNotification } from "@/types";
import { loadState } from "@/lib/storage";
import { useAffirmNotifications } from "@/hooks/useAffirmNotifications";
import { fmtMoney } from "@/lib/money";
import { fmtMonthFull } from "@/lib/dates";
import styles from "./notifications.module.css";

/**
 * Full notification history log.
 *
 * Reads plans from localStorage (same source as the main app) and derives
 * all payoff notifications. The user navigates here via the "View all" link
 * in the NotificationBell dropdown.
 */
export default function NotificationsPage() {
  // Read state from localStorage on the client. This page is not wrapped in
  // AppShell — it reads state directly so it can function as a standalone route.
  const plans = useMemo(() => {
    if (typeof window === "undefined") return [];
    return loadState().plans;
  }, []);

  const notifications = useAffirmNotifications(plans);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          ← Back to Ledger
        </Link>
      </div>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Notification History</h1>
          <p className={styles.subtitle}>
            All Affirm plans paid off to date. Each freed-up amount can be
            redirected to savings or another goal.
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <p>No paid-off plans yet. Notifications will appear here as plans reach their final payment month.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Plan</th>
                <th className={`${styles.th} ${styles.thRight}`}>Final Month</th>
                <th className={`${styles.th} ${styles.thRight}`}>Freed Up / Mo</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n: AppNotification) => (
                <tr key={n.id} className={styles.row}>
                  <td className={styles.td}>
                    <span className={styles.planLabel}>{n.planLabel}</span>
                    <span className={styles.planSub}>Paid off</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdRight}`}>
                    {fmtMonthFull(n.month)}
                  </td>
                  <td className={`${styles.td} ${styles.tdRight} ${styles.amount}`}>
                    {fmtMoney(n.mc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
