"use client";

import { fmtMoney } from "@/lib/money";
import styles from "./DayDetail.module.css";

/**
 * Selected-day detail tile (bento #5). Reflects the day picked in the week
 * rail: a paycheck row when income lands, the day's bills (AUTO/PAY badge,
 * amount, and a Mark paid button on manual ones), or a quiet-day empty state,
 * plus a "Balance after this day" footer. The list scrolls internally so the
 * tile never grows the page.
 */

export type DayItem = {
  id: string;
  name: string;
  kind: "pay" | "auto";
  amt: number; // cents — always integer, never float
};

export type DayDetailData = {
  name: string;
  date: string;
  payday: boolean;
  paycheck: number; // cents
  items: DayItem[];
  endBalance: number; // cents
};

type Props = {
  day: DayDetailData;
  onMarkPaid: (id: string) => void;
};

export function DayDetail({ day, onMarkPaid }: Props) {
  const total = day.items.reduce((a, b) => a + b.amt, 0);

  return (
    <div className={styles.detail}>
      <div className={styles.head}>
        <span className={styles.title}>
          {day.name} · {day.date}
        </span>
        <span className={styles.summary}>
          {day.items.length === 0 && !day.payday && "Nothing due"}
          {day.items.length === 1 && "1 bill"}
          {day.items.length > 1 && `${day.items.length} bills · ${fmtMoney(total)}`}
        </span>
      </div>

      {day.payday && (
        <div className={styles.paycheck}>
          <span className={styles.paycheckLabel}>Paycheck lands</span>
          <span className={styles.paycheckAmt}>+{fmtMoney(day.paycheck)}</span>
        </div>
      )}

      {day.items.length === 0 ? (
        <p className={styles.empty}>
          {day.payday ? "Just the paycheck today." : "No bills, no paycheck — a quiet day."}
        </p>
      ) : (
        <div className={styles.list}>
          {day.items.map((b) => (
            <div key={b.id} className={styles.bill}>
              <span className={styles.billName}>{b.name}</span>
              <span className={`${styles.pill} ${b.kind === "auto" ? styles.pillAuto : styles.pillPay}`}>
                {b.kind === "auto" ? "AUTO" : "PAY"}
              </span>
              <span className={styles.billAmt}>−{fmtMoney(b.amt)}</span>
              {b.kind === "pay" && (
                <button type="button" className={styles.action} onClick={() => onMarkPaid(b.id)}>
                  Mark paid
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.foot}>
        <span className={styles.footLabel}>Balance after this day</span>
        <span className={styles.footNum}>{fmtMoney(day.endBalance)}</span>
      </div>
    </div>
  );
}
