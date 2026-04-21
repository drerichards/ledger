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
  variant: "navy" | "olive";
  footerLabel: string;
  bills: Bill[];
  sortKey: SortKey;
  sortDir: SortDir;
  isCollapsed: boolean;
  split: boolean;
  onToggle: () => void;
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
 * Renders one section of the Bill Chart table — either "Fixed Bills"
 * or "Affirm Payments". Receives sorted/filtered data via props.
 */
export const BillGroup = React.memo(function BillGroup({
  label,
  variant,
  footerLabel,
  bills,
  sortKey,
  sortDir,
  isCollapsed,
  split,
  onToggle,
  onSort,
  onEdit,
  onDelete,
  onTogglePaid,
}: Props) {
  const sorted = sortBills(bills, sortKey, sortDir);
  const headerClass = variant === "olive" ? styles.groupHeaderOlive : styles.groupHeaderNavy;
  const groupVariantClass = variant === "olive" ? styles.groupOlive : styles.groupNavy;

  return (
    <div
      className={`${styles.group} ${groupVariantClass} ${split ? styles.groupSplit : ""} ${isCollapsed ? styles.groupCollapsed : ""}`}
    >
      <button
        type="button"
        className={`${styles.groupHeader} ${headerClass}`}
        onClick={onToggle}
      >
        <span className={styles.collapseIcon}>{isCollapsed ? "►" : "▼"}</span>
        <span className={styles.groupLabel}>{label}</span>
        {isCollapsed && (
          <span className={styles.groupTotal}>
            {fmtMoney(sumCents(bills.map((b) => b.cents)))}
          </span>
        )}
      </button>

      <div
        className={`${styles.tableWrapper} ${isCollapsed ? styles.tableWrapperCollapsed : ""}`}
      >
        <div className={styles.tableWrapperInner}>
          <div className={styles.tableViewport}>
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colPayee} />
                <col className={styles.colDue} />
                <col className={styles.colMethod} />
                <col className={styles.colAmount} />
                <col className={styles.colStatus} />
                <col className={styles.colActions} />
              </colgroup>
              <thead>
                <tr>
                  <SortableHeader label="Payee"  sortKey="name"   activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Due"    sortKey="due"    activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Method" sortKey="method" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Amount" sortKey="cents"  activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} alignRight />
                  <th scope="col" className={`${styles.th} ${styles.thCenter}`}>Status</th>
                  <th scope="col" className={`${styles.th} ${styles.thCenter}`} aria-label="Actions" />
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
                    <td colSpan={6} className={styles.emptyState}>
                      No bills yet — click + Add Bill to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {sorted.length > 0 && !isCollapsed && (
        <div className={`${styles.totalBar} ${variant === "olive" ? styles.totalBarOlive : ""}`}>
          <div className={styles.totalLabel}>{footerLabel}</div>
          <div className={styles.totalValue}>{fmtMoney(sumCents(bills.map((b) => b.cents)))}</div>
        </div>
      )}
    </div>
  );
});
