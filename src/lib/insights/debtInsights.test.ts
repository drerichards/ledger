import { affirmPayoffInsights } from "./debtInsights";

describe("affirmPayoffInsights", () => {
  it("returns an empty array when no rows have relief and none are final", () => {
    const rows = [
      { month: "2026-04", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-05", owed: 37652, relief: 0, isFinal: false },
    ];
    expect(affirmPayoffInsights(rows)).toEqual([]);
  });

  it("returns an empty array when given no rows at all", () => {
    expect(affirmPayoffInsights([])).toEqual([]);
  });

  it("surfaces the next step-down insight when a non-final row has relief", () => {
    const rows = [
      { month: "2026-04", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-05", owed: 25000, relief: 12652, isFinal: false },
    ];
    const result = affirmPayoffInsights(rows);
    expect(result).toHaveLength(1);
    expect(result[0].icon).toBe("📉");
    expect(result[0].sentiment).toBe("positive");
    expect(result[0].headline).toMatch(/\$126\.52\/mo freed up/);
    expect(result[0].context).toMatch(/\$376\.52/);
    expect(result[0].context).toMatch(/\$250\.00/);
    expect(result[0].teachingNote).toMatch(/snowball/);
  });

  it("skips the step-down when the relief row is also the final row", () => {
    const rows = [
      { month: "2026-04", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-05", owed: 0, relief: 37652, isFinal: true },
    ];
    const result = affirmPayoffInsights(rows);
    // Only the payoff insight (no step-down because the relief row is final)
    expect(result).toHaveLength(1);
    expect(result[0].icon).toBe("🎉");
  });

  it("surfaces the payoff insight when a final row exists a few months out", () => {
    const rows = [
      { month: "2026-04", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-05", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-06", owed: 0, relief: 37652, isFinal: true },
    ];
    const result = affirmPayoffInsights(rows);
    const payoff = result.find((r) => r.icon === "🎉");
    expect(payoff).toBeDefined();
    expect(payoff!.sentiment).toBe("positive");
    expect(payoff!.context).toMatch(/2 months until you're completely free/);
  });

  it("uses 'neutral' sentiment when the final row is more than 3 months away", () => {
    const rows = [
      { month: "2026-04", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-05", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-06", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-07", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-08", owed: 0, relief: 37652, isFinal: true },
    ];
    const result = affirmPayoffInsights(rows);
    const payoff = result.find((r) => r.icon === "🎉");
    expect(payoff!.sentiment).toBe("neutral");
    expect(payoff!.context).toMatch(/4 months until you're completely free/);
  });

  it("uses singular 'month' in context when exactly 1 month away", () => {
    const rows = [
      { month: "2026-04", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-05", owed: 0, relief: 37652, isFinal: true },
    ];
    const result = affirmPayoffInsights(rows);
    const payoff = result.find((r) => r.icon === "🎉");
    // rows.indexOf(finalRow) === 1 → "1 month" (singular)
    expect(payoff!.context).toMatch(/^1 month until/);
  });

  it("says 'debt-free this month' when payoff is the current row (index 0)", () => {
    // Only a final row as the first entry, no preceding step-down
    const rows = [
      { month: "2026-04", owed: 0, relief: 37652, isFinal: true },
    ];
    const result = affirmPayoffInsights(rows);
    expect(result).toHaveLength(1);
    expect(result[0].context).toBe("You're debt-free from Affirm this month.");
    expect(result[0].sentiment).toBe("positive");
  });

  it("prefers the payoff insight when payoff is THIS month even though a step-down exists later", () => {
    // Contrived: final row at index 0 AND a step-down in a non-final row.
    // The guard collapses to just the payoff.
    const rows = [
      { month: "2026-04", owed: 0, relief: 37652, isFinal: true },
      { month: "2026-05", owed: 10000, relief: 5000, isFinal: false },
    ];
    const result = affirmPayoffInsights(rows);
    expect(result).toHaveLength(1);
    expect(result[0].icon).toBe("🎉");
  });

  it("returns both a step-down AND a payoff when they are separate months", () => {
    const rows = [
      { month: "2026-04", owed: 37652, relief: 0, isFinal: false },
      { month: "2026-05", owed: 20000, relief: 17652, isFinal: false },
      { month: "2026-06", owed: 0, relief: 20000, isFinal: true },
    ];
    const result = affirmPayoffInsights(rows);
    expect(result).toHaveLength(2);
    expect(result[0].icon).toBe("📉");
    expect(result[1].icon).toBe("🎉");
  });
});
