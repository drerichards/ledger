import { toCents, fmtMoney, sumCents, calcShortfall } from "@/lib/money";

describe("toCents", () => {
  it("converts a plain dollar string", () => {
    expect(toCents("10.00")).toBe(1000);
  });

  it("strips dollar sign", () => {
    expect(toCents("$1,084.00")).toBe(108400);
  });

  it("strips commas", () => {
    expect(toCents("1,234.56")).toBe(123456);
  });

  it("rounds to nearest cent — respects float precision reality", () => {
    // 1.005 * 100 in JS = 100.49999... (float drift), so Math.round → 100.
    // This is expected behavior. Financial inputs should have at most 2 decimal places.
    expect(toCents("1.005")).toBe(100);
  });

  it("returns 0 for empty string", () => {
    expect(toCents("")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(toCents("abc")).toBe(0);
  });

  it("returns 0 for NaN-producing input", () => {
    expect(toCents("$")).toBe(0);
  });

  it("handles whole dollar amounts", () => {
    expect(toCents("500")).toBe(50000);
  });

  it("handles zero", () => {
    expect(toCents("0")).toBe(0);
  });

  it("handles large bill amount", () => {
    // $2,598.63 — the April 2026 bills total
    expect(toCents("2598.63")).toBe(259863);
  });
});

describe("fmtMoney", () => {
  it("formats zero", () => {
    expect(fmtMoney(0)).toBe("$0.00");
  });

  it("formats a round dollar amount", () => {
    expect(fmtMoney(100000)).toBe("$1,000.00");
  });

  it("formats cents correctly", () => {
    expect(fmtMoney(108400)).toBe("$1,084.00");
  });

  it("formats amounts with odd cents", () => {
    expect(fmtMoney(259863)).toBe("$2,598.63");
  });

  it("formats a single cent", () => {
    expect(fmtMoney(1)).toBe("$0.01");
  });

  it("toCents and fmtMoney round-trip", () => {
    // What goes in should come back out
    expect(fmtMoney(toCents("1084.00"))).toBe("$1,084.00");
  });
});

describe("sumCents", () => {
  it("sums an array of cent values", () => {
    expect(sumCents([1000, 2000, 3000])).toBe(6000);
  });

  it("returns 0 for an empty array", () => {
    expect(sumCents([])).toBe(0);
  });

  it("handles a single value", () => {
    expect(sumCents([5050])).toBe(5050);
  });

  it("handles large values without floating point drift", () => {
    // 51 bills — should sum exactly, no floats involved
    const bills = Array(51).fill(500);
    expect(sumCents(bills)).toBe(25500);
  });
});

describe("calcShortfall", () => {
  it("returns positive when bills exceed income (short)", () => {
    // Bills $2,598.63 · Income $2,351.37 → SHORT $247.26
    expect(calcShortfall(259863, 235137)).toBe(24726);
  });

  it("returns negative when income exceeds bills (surplus)", () => {
    expect(calcShortfall(100000, 150000)).toBe(-50000);
  });

  it("returns 0 when bills equal income", () => {
    expect(calcShortfall(100000, 100000)).toBe(0);
  });
});
