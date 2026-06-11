import { render, screen, fireEvent } from "@testing-library/react";
import { QuickMathCalculator } from "./QuickMathCalculator";

/**
 * Verifies the four-function calculator math + display behavior, since the
 * logic is ported from the design spec and a regression would be silent.
 */

const press = (label: string) => fireEvent.click(screen.getByRole("button", { name: label }));
const display = () => screen.getByRole("status").textContent;

describe("QuickMathCalculator", () => {
  it("starts at 0", () => {
    render(<QuickMathCalculator />);
    expect(display()).toBe("0");
  });

  it("enters multi-digit numbers", () => {
    render(<QuickMathCalculator />);
    press("4");
    press("2");
    expect(display()).toBe("42");
  });

  it("adds two numbers", () => {
    render(<QuickMathCalculator />);
    press("7");
    press("+");
    press("8");
    press("=");
    expect(display()).toBe("15");
  });

  it("chains operators (12 − 4 × 2 evaluates left-to-right = 16)", () => {
    render(<QuickMathCalculator />);
    press("1");
    press("2");
    press("−");
    press("4");
    press("×");
    press("2");
    press("=");
    expect(display()).toBe("16");
  });

  it("divides, and guards divide-by-zero to 0", () => {
    render(<QuickMathCalculator />);
    press("9");
    press("÷");
    press("0");
    press("=");
    expect(display()).toBe("0");
  });

  it("clears with C", () => {
    render(<QuickMathCalculator />);
    press("5");
    press("C");
    expect(display()).toBe("0");
  });

  it("negates and percents", () => {
    render(<QuickMathCalculator />);
    press("5");
    press("±");
    expect(display()).toBe("-5");
    press("C");
    press("5");
    press("0");
    press("%");
    expect(display()).toBe("0.5");
  });

  it("adds a single decimal point", () => {
    render(<QuickMathCalculator />);
    press("1");
    press(".");
    press(".");
    press("5");
    expect(display()).toBe("1.5");
  });
});
