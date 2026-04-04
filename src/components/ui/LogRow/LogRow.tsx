import styles from "./LogRow.module.css";

type Props = {
  /** Displayed in monospace on the left — typically a date string. */
  date: string;
  /** Pre-formatted value string (caller runs fmtMoney before passing in). */
  value: string;
  /**
   * "default"  — neutral monospace amount (CheckLog)
   * "savings"  — olive-coloured bold amount (SavingsTracker)
   */
  variant?: "default" | "savings";
  /** When provided, renders a danger delete button on the right. */
  onDelete?: () => void;
  /** aria-label for the delete button. */
  deleteLabel?: string;
};

/**
 * Shared log entry row: date | formatted value | optional delete.
 * Used by CheckLog (with delete) and SavingsTracker (no delete, savings variant).
 */
export function LogRow({
  date,
  value,
  variant = "default",
  onDelete,
  deleteLabel = "Delete entry",
}: Props) {
  return (
    <div className={styles.logRow}>
      <span className={styles.logDate}>{date}</span>
      <span className={`${styles.value} ${variant === "savings" ? styles.valueSavings : ""}`}>
        {value}
      </span>
      {onDelete && (
        <button
          type="button"
          className={styles.btnDanger}
          onClick={onDelete}
          aria-label={deleteLabel}
        >
          Del
        </button>
      )}
    </div>
  );
}
