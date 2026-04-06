import { billSchema } from "@/lib/schemas";

// ─── Valid base input ─────────────────────────────────────────────────────────

const valid = {
  name: "T-Mobile",
  amountStr: "108.00",
  due: "15",
  method: "autopay" as const,
  group: "kias_pay" as const,
  entry: "recurring" as const,
  category: "Utilities" as const,
  flagged: false,
  notes: "",
};

// ─── Valid inputs ─────────────────────────────────────────────────────────────

describe("billSchema — valid inputs", () => {
  it("parses a fully valid bill form payload", () => {
    const result = billSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts all valid category values", () => {
    const categories = [
      "Credit Cards", "Insurance", "Subscriptions", "Utilities",
      "Housing", "Loans", "Transfers", "Savings", "Other",
    ] as const;
    categories.forEach((category) => {
      const result = billSchema.safeParse({ ...valid, category });
      expect(result.success).toBe(true);
    });
  });

  it("accepts flagged: true", () => {
    expect(billSchema.safeParse({ ...valid, flagged: true }).success).toBe(true);
  });

  it("accepts non-empty notes", () => {
    expect(billSchema.safeParse({ ...valid, notes: "Call to confirm" }).success).toBe(true);
  });

  it("accepts due = '1' (minimum boundary)", () => {
    expect(billSchema.safeParse({ ...valid, due: "1" }).success).toBe(true);
  });

  it("accepts due = '31' (maximum boundary)", () => {
    expect(billSchema.safeParse({ ...valid, due: "31" }).success).toBe(true);
  });

  it("accepts transfer as payment method", () => {
    expect(billSchema.safeParse({ ...valid, method: "transfer" }).success).toBe(true);
  });

  it("accepts manual as entry type", () => {
    expect(billSchema.safeParse({ ...valid, entry: "manual" }).success).toBe(true);
  });

  it("accepts other_income as group", () => {
    expect(billSchema.safeParse({ ...valid, group: "other_income" }).success).toBe(true);
  });
});

// ─── Name validation ──────────────────────────────────────────────────────────

describe("billSchema — name validation", () => {
  it("fails when name is empty", () => {
    const result = billSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Name is required");
    }
  });
});

// ─── Amount validation ────────────────────────────────────────────────────────

describe("billSchema — amountStr validation", () => {
  it("fails when amountStr is empty", () => {
    const result = billSchema.safeParse({ ...valid, amountStr: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Amount is required");
    }
  });
});

// ─── Due day validation ───────────────────────────────────────────────────────

describe("billSchema — due validation", () => {
  it("fails when due is empty string", () => {
    const result = billSchema.safeParse({ ...valid, due: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a day (1–31)");
    }
  });

  it("fails when due is 0", () => {
    const result = billSchema.safeParse({ ...valid, due: "0" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a day (1–31)");
    }
  });

  it("fails when due is 32", () => {
    const result = billSchema.safeParse({ ...valid, due: "32" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a day (1–31)");
    }
  });

  it("fails when due is non-numeric", () => {
    const result = billSchema.safeParse({ ...valid, due: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a day (1–31)");
    }
  });
});

// ─── Enum validation ──────────────────────────────────────────────────────────

describe("billSchema — enum validation", () => {
  it("fails when method is invalid", () => {
    expect(billSchema.safeParse({ ...valid, method: "cash" }).success).toBe(false);
  });

  it("fails when group is invalid", () => {
    expect(billSchema.safeParse({ ...valid, group: "both" }).success).toBe(false);
  });

  it("fails when entry is invalid", () => {
    expect(billSchema.safeParse({ ...valid, entry: "auto" }).success).toBe(false);
  });

  it("fails when category is invalid", () => {
    expect(billSchema.safeParse({ ...valid, category: "Food" }).success).toBe(false);
  });
});
