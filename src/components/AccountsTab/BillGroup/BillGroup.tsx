import React from "react";
import type { Bill } from "@/types";
import { fmtMoney, sumCents } from "@/lib/money";
import { BillRow } from "../BillRow";
import { SortableHeader } from "./SortableHeader/SortableHeader";
import styles from "./BillGroup.module.css";

export type SortKey = "due" | "name" | "cents" | "method" | "category";
export type SortDir = "asc" | "desc";

type Props = {
  label: string;
  bills: Bill[];
  sortKey: SortKey;
  sortDir: SortDir;
  isCollapsed: boolean;
  isFocused?: boolean;
  onToggle: () => void;
  onExpand?: () => void;
  onSort: (key: SortKey) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
};

const sortBills = (bills: Bill[], key: SortKey, dir: SortDir): Bill[] =>
  [...bills].sort((a, b) => {
    let comparison = 0;
    switch (key) {
      case "due":      comparison = a.due - b.due; break;
      case "name":     comparison = a.name.localeCompare(b.name); break;
      case "cents":    comparison = a.cents - b.cents; break;
      case "method":   comparison = a.method.localeCompare(b.method); break;
      case "category": comparison = a.category.localeCompare(b.category); break;
    }
    return dir === "asc" ? comparison : -comparison;
  });

/**
 * Collapsible, sortable bill group (presenter).
 * Renders one section of the Bill Chart table — either "From Kia's Pay"
 * or "From Other Income". Receives sorted/filtered data via props.
 */
export const BillGroup = React.memo(function BillGroup({
  label,
  bills,
  sortKey,
  sortDir,
  isCollapsed,
  isFocused = false,
  onToggle,
  onExpand,
  onSort,
  onEdit,
  onDelete,
  onTogglePaid,
}: Props) {
  const sorted = sortBills(bills, sortKey, sortDir);

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader} onClick={onToggle}>
        <span className={styles.collapseIcon}>{isCollapsed ? "►" : "▼"}</span>
        {label}
        {onExpand && (
          <button
            type="button"
            className={styles.expandBtn}
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            title={isFocused ? "Restore split view" : "Expand to full width"}
          >
            {isFocused ? "⤡" : "⤢"}
          </button>
        )}
      </div>

      <div
        className={`${styles.tableWrapper} ${isCollapsed ? styles.tableWrapperCollapsed : ""} ${isFocused ? styles.tableWrapperExpanded : ""}`}
      >
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colDue} />
            <col className={styles.colMethod} />
            <col className={styles.colPayee} />
            <col className={styles.colAmount} />
            <col className={styles.colPaid} />
            <col className={styles.colCategory} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <SortableHeader label="Date"   sortKey="due"    activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Method" sortKey="method" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Payee"  sortKey="name"   activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Amount" sortKey="cents"  activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} alignRight />
              <th scope="col" className={`${styles.th} ${styles.thCenter}`}>Paid</th>
              <th scope="col" className={styles.th}>Notes</th>
              <th scope="col" className={`${styles.th} ${styles.thCenter}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePaid={onTogglePaid}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  No bills yet — click + Add Bill to get started.
                </td>
              </tr>
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={3} className={styles.totalLabel}>Group Total</td>
                <td className={`${styles.totalValue} ${styles.thRight}`}>
                  {fmtMoney(sumCents(bills.map((b) => b.cents)))}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
});
