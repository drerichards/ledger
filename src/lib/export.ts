import type { Bill } from "@/types";
import { fmtMoney } from "./money";

/**
 * Triggers a browser download of the bill list as a CSV file.
 * Amounts are exported as formatted dollar strings for human readability.
 */
export function exportBillsCSV(bills: Bill[]): void {
  const header = [
    "Name",
    "Due Day",
    "Amount",
    "Paid",
    "Method",
    "Group",
    "Recurring",
    "Flagged",
    "Notes",
  ].join(",");

  const rows = bills.map((bill) =>
    [
      bill.name,
      bill.due,
      fmtMoney(bill.cents),
      bill.paid ? "Yes" : "No",
      bill.method === "autopay" ? "Autopay" : "Transfer",
      bill.group === "kias_pay" ? "Kia's Pay" : "Other Income",
      bill.entry === "recurring" ? "Recurring" : "Manual",
      bill.flagged ? "Yes" : "No",
      `"${bill.notes.replace(/"/g, '""')}"`,
    ].join(","),
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `ledger-bills-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
