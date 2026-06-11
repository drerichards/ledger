import React from "react";
import type { Bill } from "@/types";
import { fmtMoney, sumCents } from "@/lib/money";
import { BillRow } from "../BillRow";
import { SortableHeader } from "./SortableHeader/SortableHeader";
import { CollapsibleTable } from "@/components/ui/CollapsibleTable";
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

export const BillGroup = React.memo(function BillGroup({
  label,
  variant,
  footerLabel,
  bills,
  sortKey,
  sortDir,
  isCollapsed,
  onToggle,
  onSort,
  onEdit,
  onDelete,
  onTogglePaid,
}: Props) {
  const sorted = sortBills(bills, sortKey, sortDir);
  const total = sumCents(bills.map((b) => b.cents));

  return (
    <CollapsibleTable
      label={label}
      variant={variant}
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      collapsedSubtotal={fmtMoney(total)}
      footerLabel={sorted.length > 0 ? footerLabel : undefined}
      footerValue={sorted.length > 0 ? fmtMoney(total) : undefined}
    >
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
    </CollapsibleTable>
  );
});
