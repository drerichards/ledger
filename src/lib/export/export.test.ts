/**
 * export.test.ts — Unit tests for CSV export.
 *
 * WHY MOCKING BLOB AND URL APIs:
 * jsdom (Jest's browser simulation) doesn't implement Blob.text() or
 * URL.createObjectURL/revokeObjectURL — they're browser-native APIs that
 * jsdom doesn't replicate. Rather than try to polyfill them, we mock at the
 * boundary: intercept new Blob([content]) to capture the CSV string at
 * construction time, before it needs to be "read" back out.
 *
 * LEARN: This is the "mock at the boundary" pattern. You mock the point where
 * your code hands off to an external system (browser API, network, database).
 * You don't mock things your code controls — only things it depends on.
 *
 * WHY afterEach(jest.restoreAllMocks()):
 * jest.spyOn() replaces the original implementation. restoreAllMocks() puts it
 * back after each test. Without this, a mock from test 1 bleeds into test 2.
 * resetAllMocks() resets call counts; restoreAllMocks() also restores originals.
 * Use restoreAllMocks() whenever you use jest.spyOn().
 */

import { exportBillsCSV } from "@/lib/export";
import type { Bill } from "@/types";

let capturedCSV = "";
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
const mockRevokeObjectURL = jest.fn();

beforeEach(() => {
  capturedCSV = "";
  mockClick.mockReset();
  mockCreateObjectURL.mockReset().mockReturnValue("blob:mock-url");
  mockRevokeObjectURL.mockReset();

  jest.spyOn(global, "Blob").mockImplementation((parts?: BlobPart[]) => {
    capturedCSV = (parts ?? []).join("");
    return { type: "text/csv;charset=utf-8;" } as Blob;
  });

  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "a") {
      return { href: "", download: "", click: mockClick } as unknown as HTMLAnchorElement;
    }
    return document.createElement.call(document, tag);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "test-1",
    name: "Test Bill",
    due: 1,
    cents: 10000,
    paid: false,
    method: "autopay",
    group: "kias_pay",
    entry: "recurring",
    category: "Utilities",
    flagged: false,
    notes: "",
    month: "2026-04",
    amountHistory: [],
    ...overrides,
  };
}

describe("exportBillsCSV", () => {
  describe("browser API interactions", () => {
    it("calls URL.createObjectURL with a Blob", () => {
      exportBillsCSV([makeBill()]);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Object));
    });

    it("triggers a download click on the anchor element", () => {
      exportBillsCSV([makeBill()]);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it("revokes the object URL after download to free memory", () => {
      // LEARN: revokeObjectURL is important — without it, the browser holds
      // a reference to the Blob in memory indefinitely. For a finance app
      // generating CSVs frequently, this would be a memory leak.
      exportBillsCSV([makeBill()]);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  describe("CSV structure", () => {
    it("starts with the correct header row", () => {
      exportBillsCSV([makeBill()]);
      expect(capturedCSV).toMatch(
        /^Name,Due Day,Amount,Paid,Method,Group,Recurring,Flagged,Notes/
      );
    });

    it("exports only the header row for an empty bill list", () => {
      exportBillsCSV([]);
      const lines = capturedCSV.trim().split("\n");
      expect(lines).toHaveLength(1);
    });

    it("exports one data row per bill", () => {
      exportBillsCSV([makeBill(), makeBill({ id: "test-2", name: "Bill Two" })]);
      const lines = capturedCSV.trim().split("\n");
      expect(lines).toHaveLength(3); // header + 2 bills
    });
  });

  describe("field formatting", () => {
    it("formats autopay method as 'Autopay'", () => {
      exportBillsCSV([makeBill({ method: "autopay" })]);
      expect(capturedCSV).toContain("Autopay");
    });

    it("formats transfer method as 'Transfer'", () => {
      exportBillsCSV([makeBill({ method: "transfer" })]);
      expect(capturedCSV).toContain("Transfer");
    });

    it("formats kias_pay group as \"Kia's Pay\"", () => {
      exportBillsCSV([makeBill({ group: "kias_pay" })]);
      expect(capturedCSV).toContain("Kia's Pay");
    });

    it("formats other_income group as 'Other Income'", () => {
      exportBillsCSV([makeBill({ group: "other_income" })]);
      expect(capturedCSV).toContain("Other Income");
    });

    it("formats amount as a dollar string", () => {
      exportBillsCSV([makeBill({ cents: 108400 })]);
      expect(capturedCSV).toContain("$1,084.00");
    });

    it("marks paid bills as 'Yes'", () => {
      exportBillsCSV([makeBill({ paid: true })]);
      expect(capturedCSV).toContain("Yes");
    });

    it("marks flagged bills as 'Yes'", () => {
      exportBillsCSV([makeBill({ flagged: true })]);
      expect(capturedCSV).toContain("Yes");
    });
  });

  describe("CSV escaping", () => {
    it("escapes double quotes in notes per CSV spec", () => {
      // CSV spec: a double quote inside a quoted field is escaped by doubling it.
      // "has \"quotes\" inside" → has ""quotes"" inside
      exportBillsCSV([makeBill({ notes: 'has "quotes" inside' })]);
      expect(capturedCSV).toContain('has ""quotes"" inside');
    });
  });
});
