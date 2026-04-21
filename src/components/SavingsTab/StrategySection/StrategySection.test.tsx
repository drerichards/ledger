import { render, screen } from "@testing-library/react";
import { StrategySection } from "./StrategySection";

describe("StrategySection", () => {
  it("renders the two section labels", () => {
    render(<StrategySection />);
    expect(screen.getByText("Savings Strategy")).toBeInTheDocument();
    expect(screen.getByText("Where to Put It")).toBeInTheDocument();
  });

  it("renders all four numbered strategy steps in order", () => {
    const { container } = render(<StrategySection />);
    const stepNums = container.querySelectorAll('[class*="stepNum"]');
    // Each step has an outer + variant class — query by the numeric text instead.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    // Confirms STEPS.map ran 4 times — exercises the step map branch.
    expect(stepNums.length).toBeGreaterThanOrEqual(4);
  });

  it("renders each strategy step's title", () => {
    render(<StrategySection />);
    expect(screen.getByText("Pay yourself first — before bills")).toBeInTheDocument();
    expect(
      screen.getByText("Don't wait — route $50 of that surplus right now"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Redirect Affirm payments the day they clear"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Once your emergency fund is full, try index funds"),
    ).toBeInTheDocument();
  });

  it("renders each strategy step's body copy", () => {
    render(<StrategySection />);
    expect(
      screen.getByText(/Even \$20\/week compounds to \$1,040\/year/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Move \$50 of it to Emergency Fund today/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Set a calendar reminder now/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Index funds \(like VOO or VTI\)/),
    ).toBeInTheDocument();
  });

  it("renders all five account cards (exercises ACCOUNTS.map)", () => {
    render(<StrategySection />);
    expect(screen.getByText("✦ High-Yield Savings (HYSA)")).toBeInTheDocument();
    expect(screen.getByText("Regular Savings")).toBeInTheDocument();
    expect(screen.getByText("CDs (Certificates of Deposit)")).toBeInTheDocument();
    expect(screen.getByText("⚠ Checking Account")).toBeInTheDocument();
    expect(screen.getByText("📈 Index Funds (Brokerage)")).toBeInTheDocument();
  });

  it("renders each account card's body copy", () => {
    render(<StrategySection />);
    expect(screen.getByText(/4–5% APY/)).toBeInTheDocument();
    expect(screen.getByText(/Earns ~0.01% APY/)).toBeInTheDocument();
    expect(screen.getByText(/Lock money for 6–12 months/)).toBeInTheDocument();
    expect(screen.getByText(/Too easy to spend/)).toBeInTheDocument();
    expect(
      screen.getByText(/Best long-term growth \(~10%\/yr avg\)/),
    ).toBeInTheDocument();
  });

  it("renders the 'Ask Ledger' AI teaser card with Coming Soon badge", () => {
    render(<StrategySection />);
    expect(screen.getByText("Ask Ledger")).toBeInTheDocument();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(
      screen.getByText(/AI that reads your actual numbers/),
    ).toBeInTheDocument();
  });

  it("applies a variant class to each step number element", () => {
    const { container } = render(<StrategySection />);
    // Two olive + two navy variants — at least one of each class must be present.
    const oliveNums = container.querySelectorAll('[class*="stepNum_olive"]');
    const navyNums = container.querySelectorAll('[class*="stepNum_navy"]');
    expect(oliveNums.length).toBe(2);
    expect(navyNums.length).toBe(2);
  });

  it("applies a variant class to each account card element", () => {
    const { container } = render(<StrategySection />);
    // olive × 1, navy × 2, gold × 1, rust × 1 — all four branches must render.
    expect(container.querySelectorAll('[class*="account_olive"]').length).toBe(1);
    expect(container.querySelectorAll('[class*="account_navy"]').length).toBe(2);
    expect(container.querySelectorAll('[class*="account_gold"]').length).toBe(1);
    expect(container.querySelectorAll('[class*="account_rust"]').length).toBe(1);
  });
});
