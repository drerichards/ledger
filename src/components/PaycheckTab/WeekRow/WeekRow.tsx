import React from "react";
import type { KiasCheckEntry, PaycheckWeek } from "@/types";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import { AmountInput } from "../AmountInput";
import styles from "./WeekRow.module.css";

const CATEGORIES = [
  { key: "storage",    label: "Storage" },
  { key: "rent",       label: "Rent" },
  { key: "jazmin",     label: "Jazmin" },
  { key: "dre",        label: "Dre" },
  { key: "paypalCC",   label: "PayPal CC" },
  { key: "deductions", label: "Deductions" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

type Props = {
  week: PaycheckWeek;
  displayDate: string;
  affirmPerWeek: number;
  savingsForWeek: number;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
};

/**
 * One week row in the paycheck grid (presenter + local edit state).
 * Handles inline editing of Kia's pay and category allocations.
 */
export const WeekRow = React.memo(function WeekRow({
  week,
  displayDate,
  affirmPerWeek,
  savingsForWeek,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
}: Props) {
  const updateField = (key: CategoryKey | "kiasPay", raw: string) => {
    const cents = toCents(raw);
    const updated = { ...week, [key]: cents };
    onUpsertWeek(updated);
    if (key === "kiasPay") {
      onDeleteCheckEntry(week.weekOf);
      if (cents > 0) {
        onAddCheckEntry({ weekOf: week.weekOf, amount: cents });
      }
    }
  };

  const totalAllocated =
    affirmPerWeek +
    savingsForWeek +
    sumCents(CATEGORIES.map((c) => week[c.key]));
  const payLeft = week.kiasPay - totalAllocated;

  const weekLabel = new Date(displayDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { month: "numeric", day: "numeric" },
  );

  return (
    <tr className={`${styles.row} ${week.rentWeek ? styles.rowRentWeek : ""}`}>
      <td className={`${styles.td} ${styles.tdWeek}`}>
        <span className={styles.weekLabel}>{weekLabel}</span>
        {week.rentWeek && <span className={styles.rentTag}>RENT</span>}
      </td>

      <td className={styles.td}>
        <AmountInput
          value={week.kiasPay}
          onChange={(raw) => updateField("kiasPay", raw)}
          highlight
        />
      </td>

      <td className={`${styles.td} ${styles.tdDerived}`}>
        <span className={styles.mono}>{fmtMoney(affirmPerWeek)}</span>
      </td>

      {CATEGORIES.map((c) => (
        <td key={c.key} className={styles.td}>
          <AmountInput
            value={week[c.key]}
            onChange={(raw) => updateField(c.key, raw)}
          />
        </td>
      ))}

      <td className={`${styles.td} ${styles.tdDerived}`}>
        <span className={styles.mono}>
          {savingsForWeek > 0 ? (
            fmtMoney(savingsForWeek)
          ) : (
            <span className={styles.zero}>—</span>
          )}
        </span>
      </td>

      <td
        className={`${styles.td} ${styles.tdPayLeft} ${payLeft < 0 ? styles.negative : styles.positive}`}
      >
        {fmtMoney(payLeft)}
      </td>
    </tr>
  );
});

export { CATEGORIES };
export type { CategoryKey };
