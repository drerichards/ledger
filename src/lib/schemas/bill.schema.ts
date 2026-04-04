import { z } from "zod";

/**
 * Zod schema for BillForm inputs.
 *
 * All fields are strings in the form (inputs are text) —
 * numeric conversion (toCents, parseInt) happens in the submit handler.
 *
 * Error messages are intentionally matched to the existing test assertions
 * so BillForm.test.tsx continues to pass without modification.
 */
export const billSchema = z.object({
  name: z.string().min(1, "Name is required"),

  // Amount string → validated but kept as string; converted to cents on submit
  amountStr: z.string().min(1, "Amount is required"),

  // Due day: single refine covers empty ("" → NaN), 0, and 32 — all → same message
  due: z.string().refine((val) => {
    const n = parseInt(val, 10);
    return !isNaN(n) && n >= 1 && n <= 31;
  }, "Enter a day (1–31)"),

  method: z.enum(["autopay", "transfer"]),
  group: z.enum(["kias_pay", "other_income"]),
  entry: z.enum(["recurring", "manual"]),
  category: z.enum([
    "Credit Cards",
    "Insurance",
    "Subscriptions",
    "Utilities",
    "Housing",
    "Loans",
    "Transfers",
    "Savings",
    "Other",
  ]),
  // RHF provides defaults via defaultValues — .default() splits Zod's input/output
  // types which causes Resolver<Input> ≠ Resolver<Output> type errors with
  // @hookform/resolvers v5+ and Zod v4.
  flagged: z.boolean(),
  notes: z.string(),
});

export type BillFormValues = z.infer<typeof billSchema>;
