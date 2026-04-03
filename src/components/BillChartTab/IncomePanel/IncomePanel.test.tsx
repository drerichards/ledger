import { render, screen, fireEvent } from "@testing-library/react";
import { IncomePanel } from "../IncomePanel";
import type { MonthlyIncome } from "@/types";

const DEFAULT_INCOME: MonthlyIncome = {
  month: "2026-04",
  kias_pay: 0,
  military_pay: 124190,
  retirement: 33437,
  social_security: 77500,
};

function setup(overrides: {
  income?: MonthlyIncome;
  kiasPayCents?: number;
  totalBillsCents?: number;
  onUpdate?: jest.Mock;
} = {}) {
  const onUpdate = overrides.onUpdate ?? jest.fn();
  render(
    <IncomePanel
      month="2026-04"
      income={overrides.income ?? DEFAULT_INCOME}
      kiasPayCents={overrides.kiasPayCents ?? 0}
      totalBillsCents={overrides.totalBillsCents ?? 0}
      onUpdate={onUpdate}
    />
  );
  return { onUpdate };
}

describe("IncomePanel", () => {
  describe("reconciliation display", () => {
    it("shows 'Short' when total bills exceed total income", () => {
      // bills: $3000 · income: $2351.27 (defaults) → short
      setup({ totalBillsCents: 300000 });
      expect(screen.getByText("Short")).toBeInTheDocument();
    });

    it("shows 'Surplus' when total income exceeds total bills", () => {
      // bills: $1 · income: $2351.27 (defaults) → surplus
      setup({ totalBillsCents: 100 });
      expect(screen.getByText("Surplus")).toBeInTheDocument();
    });

    it("shows 'Surplus' when bills equal income (no shortfall)", () => {
      // Total default income = 124190 + 33437 + 77500 = 235127 cents
      setup({ totalBillsCents: 235127 });
      // calcShortfall returns 0 → isShort is false → "Surplus"
      expect(screen.getByText("Surplus")).toBeInTheDocument();
    });

    it("renders the total bills amount", () => {
      setup({ totalBillsCents: 259863 }); // $2,598.63
      expect(screen.getByText("$2,598.63")).toBeInTheDocument();
    });

    it("renders Military Pay line", () => {
      setup();
      expect(screen.getByText("Military Pay")).toBeInTheDocument();
    });

    it("renders Retirement line", () => {
      setup();
      expect(screen.getByText("Retirement")).toBeInTheDocument();
    });

    it("renders Social Security line", () => {
      setup();
      expect(screen.getByText("Social Security")).toBeInTheDocument();
    });

    it("renders Kia's Pay line when kiasPayCents > 0", () => {
      setup({ kiasPayCents: 50000 });
      expect(screen.getByText(/kia/i)).toBeInTheDocument();
    });

    it("does not render Kia's Pay line when kiasPayCents is 0", () => {
      setup({ kiasPayCents: 0 });
      expect(screen.queryByText(/kia/i)).not.toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    it("shows edit form when 'Edit Income' is clicked", () => {
      setup();
      fireEvent.click(screen.getByRole("button", { name: /edit income/i }));
      expect(screen.getByLabelText(/military pay/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/retirement/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/social security/i)).toBeInTheDocument();
    });

    it("calls onUpdate with correct cents when saved", () => {
      const { onUpdate } = setup();
      fireEvent.click(screen.getByRole("button", { name: /edit income/i }));

      // Clear and type new value into Military Pay
      const militaryInput = screen.getByLabelText(/military pay/i);
      fireEvent.change(militaryInput, { target: { value: "1500" } });

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      expect(onUpdate).toHaveBeenCalledTimes(1);
      const updated: MonthlyIncome = onUpdate.mock.calls[0][0];
      expect(updated.military_pay).toBe(150000); // $1500 → 150000 cents
      expect(updated.month).toBe("2026-04");
    });

    it("hides edit form and returns to view when Cancel clicked", () => {
      setup();
      fireEvent.click(screen.getByRole("button", { name: /edit income/i }));
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      // Should be back to view mode — Edit Income button visible again
      expect(screen.getByRole("button", { name: /edit income/i })).toBeInTheDocument();
    });
  });

  describe("with undefined income (uses defaults)", () => {
    it("still renders without crashing when income is undefined", () => {
      render(
        <IncomePanel
          month="2026-04"
          income={undefined}
          kiasPayCents={0}
          // Default income total = 124190 + 33437 + 77500 = 235127 cents ($2,351.27)
          // Bills at $3000 → short
          totalBillsCents={300000}
          onUpdate={jest.fn()}
        />
      );
      expect(screen.getByText("Short")).toBeInTheDocument();
    });
  });
});
