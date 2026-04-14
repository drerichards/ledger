import React from "react";
import styles from "./LedgerTable.module.css";

export type LedgerColumn = {
  key: string;
  header: string;
  align?: "left" | "right";
};

export type LedgerRow = {
  id: string;
  cells: React.ReactNode[];
  variant?: "default" | "income" | "danger";
};

export type LedgerSection = {
  label: string;
  rows: LedgerRow[];
};

type Props = {
  columns: LedgerColumn[];
  sections: LedgerSection[];
  emptyMessage?: string;
};

export function LedgerTable({ columns, sections, emptyMessage = "No data." }: Props) {
  const allEmpty = sections.every((s) => s.rows.length === 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${col.align === "right" ? styles.thRight : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              if (section.rows.length === 0) return null;
              return (
                <React.Fragment key={section.label}>
                  <tr className={styles.sectionRow}>
                    <td colSpan={columns.length}>{section.label}</td>
                  </tr>
                  {section.rows.map((row) => {
                    const rowClass =
                      row.variant === "income" ? styles.rowIncome
                      : row.variant === "danger" ? styles.rowDanger
                      : styles.row;
                    return (
                      <tr key={row.id} className={rowClass}>
                        {row.cells.map((cell, i) => (
                          <td
                            key={i}
                            className={`${styles.td} ${columns[i]?.align === "right" ? styles.tdRight : ""}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {allEmpty && <p className={styles.empty}>{emptyMessage}</p>}
      </div>
    </div>
  );
}
