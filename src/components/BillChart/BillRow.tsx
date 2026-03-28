import type { Bill } from "@/types";
import { fmtMoney } from "@/lib/money";
import styles from "./BillChart.module.css";

type Props = {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
};

export function BillRow({ bill, onEdit, onDelete, onTogglePaid }: Props) {
  return (
    <tr
      className={`
        ${styles.row}
        ${bill.paid ? styles.rowPaid : ""}
        ${bill.flagged ? styles.rowFlagged : ""}
      `}
    >
      {/* Due date */}
      <td className={styles.td}>
        <span className={styles.mono}>{bill.due}</span>
      </td>

      {/* Payment method */}
      <td className={styles.td}>
        <span className={styles.methodBadge}>
          {bill.method === "autopay" ? "A" : "TRF"}
        </span>
      </td>

      {/* Payee name + badges */}
      <td className={styles.td}>
        <span className={bill.paid ? styles.paidName : styles.name}>
          {bill.name}
        </span>
        {bill.entry === "recurring" && (
          <span
            className={styles.recurringBadge}
            title="Recurring — carries forward each month"
          >
            ↻
          </span>
        )}
        {bill.flagged && (
          <span className={styles.flagBadge} title="Flagged for attention">
            !
          </span>
        )}
      </td>

      {/* Amount */}
      <td className={`${styles.td} ${styles.tdRight}`}>
        <span className={`${styles.mono} ${bill.paid ? styles.paidText : ""}`}>
          {fmtMoney(bill.cents)}
        </span>
      </td>

      {/* Paid checkbox */}
      <td className={`${styles.td} ${styles.tdCenter}`}>
        <input
          type="checkbox"
          checked={bill.paid}
          onChange={() => onTogglePaid(bill.id)}
          aria-label={`Mark ${bill.name} as ${bill.paid ? "unpaid" : "paid"}`}
        />
      </td>

      {/* Notes */}
      <td className={`${styles.td} ${styles.notes}`}>{bill.notes}</td>

      {/* Actions */}
      <td className={`${styles.td} ${styles.tdCenter}`}>
        <div className={styles.actions}>
          <button
            className={styles.btnGhost}
            onClick={() => onEdit(bill)}
            aria-label={`Edit ${bill.name}`}
          >
            Edit
          </button>
          <button
            className={styles.btnDanger}
            onClick={() => onDelete(bill.id)}
            aria-label={`Delete ${bill.name}`}
          >
            Del
          </button>
        </div>
      </td>
    </tr>
  );
}
