"use client";

import { useAppState } from "@/hooks/useAppState";
import type { Bill } from "@/types";
import { fmtMoney } from "@/lib/money";
import styles from "./ActivityTab.module.css";

type AmountChangeEvent = {
  date: string;      // ISO YYYY-MM-DD
  billId: string;
  billName: string;
  from: number;      // cents — what it was before
  to: number;        // cents — what it changed to
};

/**
 * Reconstructs all bill amount change events from amountHistory.
 *
 * amountHistory stores the OLD value at the moment of change:
 *   history[i] = { date, cents: oldValue }
 *   newValue    = history[i+1]?.cents ?? bill.cents (current)
 *
 * Sorted newest-first for display.
 */
function buildActivityLog(bills: Bill[]): AmountChangeEvent[] {
  const events: AmountChangeEvent[] = [];

  for (const bill of bills) {
    if (!bill.amountHistory || bill.amountHistory.length === 0) continue;

    for (let i = 0; i < bill.amountHistory.length; i++) {
      const entry = bill.amountHistory[i];
      const next = bill.amountHistory[i + 1];
      events.push({
        date: entry.date,
        billId: bill.id,
        billName: bill.name,
        from: entry.cents,
        to: next?.cents ?? bill.cents,
      });
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

function fmtDate(iso: string): string {
  // Pure string arithmetic — no Date constructor (timezone safe)
  const [year, month, day] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

export function ActivityTab() {
  const { state } = useAppState();
  const log = buildActivityLog(state.bills);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Activity</h2>
        <p className={styles.subheading}>
          A record of every bill amount change.
        </p>
      </div>

      {log.length === 0 ? (
        <p className={styles.empty}>
          No amount changes recorded yet. Changes will appear here when you
          edit a bill&apos;s amount.
        </p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Bill</th>
                <th className={`${styles.th} ${styles.right}`}>Was</th>
                <th className={`${styles.th} ${styles.right}`}>Changed To</th>
                <th className={`${styles.th} ${styles.right}`}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {log.map((evt, i) => {
                const diff = evt.to - evt.from;
                const isIncrease = diff > 0;
                return (
                  <tr key={`${evt.billId}-${evt.date}-${i}`} className={styles.row}>
                    <td className={styles.td}>{fmtDate(evt.date)}</td>
                    <td className={styles.td}>{evt.billName}</td>
                    <td className={`${styles.td} ${styles.mono} ${styles.right}`}>
                      {fmtMoney(evt.from)}
                    </td>
                    <td className={`${styles.td} ${styles.mono} ${styles.right}`}>
                      {fmtMoney(evt.to)}
                    </td>
                    <td
                      className={`${styles.td} ${styles.mono} ${styles.right} ${
                        isIncrease ? styles.rust : styles.olive
                      }`}
                    >
                      {isIncrease ? "+" : "−"}
                      {fmtMoney(Math.abs(diff))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
