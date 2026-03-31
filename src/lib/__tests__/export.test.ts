import { exportBillsCSV } from "@/lib/export";
import type { Bill } from "@/types";

// jsdom does not implement Blob.text() or URL.createObjectURL/revokeObjectURL.
// Strategy: mock Blob to capture the CSV string at construction time,
// then assert on the captured string directly.

let capturedCSV = "";
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
const mockRevokeObjectURL = jest.fn();

beforeEach(() => {
  capturedCSV = "";
  mockClick.mockReset();
  mockCreateObjectURL.mockReset().mockReturnValue("blob:mock-url");
  mockRevokeObjectURL.mockReset();

  // Capture whatever string content is passed to new Blob([content])
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
    // Fall back to real implementation for any other tag
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
    ...overrides,
  };
}

describe("exportBillsCSV", () => {
  it("calls URL.createObjectURL with a Blob", () => {
    exportBillsCSV([makeBill()]);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Object));
  });

  it("triggers a download click", () => {
    exportBillsCSV([makeBill()]);
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it("revokes the object URL after download", () => {
    exportBillsCSV([makeBill()]);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("includes CSV header row", () => {
    exportBillsCSV([makeBill()]);
    expect(capturedCSV).toMatch(
      /^Name,Due Day,Amount,Paid,Method,Group,Recurring,Flagged,Notes/
    );
  });

  it("formats autopay method correctly", () => {
    exportBillsCSV([makeBill({ method: "autopay" })]);
    expect(capturedCSV).toContain("Autopay");
  });

  it("formats transfer method correctly", () => {
    exportBillsCSV([makeBill({ method: "transfer" })]);
    expect(capturedCSV).toContain("Transfer");
  });

  it("escapes double quotes in notes", () => {
    exportBillsCSV([makeBill({ notes: 'has "quotes" inside' })]);
    // CSV spec: double quotes escaped by doubling them
    expect(capturedCSV).toContain('has ""quotes"" inside');
  });

  it("exports correct amount formatting", () => {
    exportBillsCSV([makeBill({ cents: 108400 })]);
    expect(capturedCSV).toContain("$1,084.00");
  });

  it("handles an empty bill list — header only", () => {
    exportBillsCSV([]);
    const lines = capturedCSV.trim().split("\n");
    expect(lines).toHaveLength(1);
  });

  it("marks paid bills as Yes", () => {
    exportBillsCSV([makeBill({ paid: true })]);
    expect(capturedCSV).toContain("Yes");
  });

  it("marks flagged bills as Yes", () => {
    exportBillsCSV([makeBill({ flagged: true })]);
    expect(capturedCSV).toContain("Yes");
  });

  it("labels kias_pay group correctly", () => {
    exportBillsCSV([makeBill({ group: "kias_pay" })]);
    expect(capturedCSV).toContain("Kia's Pay");
  });

  it("labels other_income group correctly", () => {
    exportBillsCSV([makeBill({ group: "other_income" })]);
    expect(capturedCSV).toContain("Other Income");
  });
});
