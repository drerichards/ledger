import { render, screen } from "@testing-library/react";
import { AffirmBurdenChart } from "./AffirmBurdenChart";

// ─── Recharts mock ──────────────────────────────────────────────────────────
// JSDOM does not provide real SVG dimensioning, so ResponsiveContainer would
// collapse to 0×0 and children would never render. We replace each Recharts
// primitive with a thin div that surfaces the props we care about as data
// attributes, letting us verify behavior without touching real SVG.

type MockProps = {
  children?: React.ReactNode;
  // Recharts forwards arbitrary props; we capture them as needed per test.
  [key: string]: unknown;
};

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: MockProps) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: MockProps & { data: unknown[] }) => (
    // Wrap children in an <svg> so <defs>/<linearGradient> have a valid
    // namespace and React doesn't warn about element casing in JSDOM.
    <div data-testid="area-chart" data-length={data.length}>
      <svg>{children}</svg>
    </div>
  ),
  Area: ({ dataKey, name, type }: MockProps) => (
    <div
      data-testid="area"
      data-key={String(dataKey)}
      data-name={String(name)}
      data-type={String(type)}
    />
  ),
  XAxis: ({ dataKey, tickFormatter }: MockProps & { tickFormatter: (v: string) => string }) => (
    <div
      data-testid="x-axis"
      data-key={String(dataKey)}
      // Sample a few ticks so we can assert formatXTick behavior.
      data-tick-apr={tickFormatter("2026-04")}
      data-tick-jan={tickFormatter("2026-01")}
      data-tick-dec={tickFormatter("2026-12")}
    />
  ),
  YAxis: ({ tickFormatter }: MockProps & { tickFormatter: (v: number) => string }) => (
    <div
      data-testid="y-axis"
      // Verify fmtMoney is the formatter: 37652 cents → "$376.52"
      data-tick-37652={tickFormatter(37652)}
      data-tick-0={tickFormatter(0)}
    />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: MockProps) => (
    // Render content so the nested <FinanceTooltip /> element is instantiated
    // (with no active payload it returns null — that's fine for coverage here).
    <div data-testid="tooltip">{content as React.ReactNode}</div>
  ),
  ReferenceLine: ({ x }: MockProps) => (
    <div data-testid="reference-line" data-x={String(x)} />
  ),
}));

describe("AffirmBurdenChart", () => {
  it("renders without crashing when data is empty", () => {
    render(<AffirmBurdenChart data={[]} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    const chart = screen.getByTestId("area-chart");
    expect(chart).toHaveAttribute("data-length", "0");
    // No step-down months → no reference lines
    expect(screen.queryByTestId("reference-line")).toBeNull();
  });

  it("passes the data array through to AreaChart", () => {
    const data = [
      { month: "2026-04", owed: 37652, isStep: false },
      { month: "2026-05", owed: 25000, isStep: true },
      { month: "2026-06", owed: 0, isStep: true },
    ];
    render(<AffirmBurdenChart data={data} />);
    expect(screen.getByTestId("area-chart")).toHaveAttribute("data-length", "3");
  });

  it("renders one ReferenceLine per step-down month, preserving order", () => {
    const data = [
      { month: "2026-04", owed: 37652, isStep: false },
      { month: "2026-05", owed: 25000, isStep: true },
      { month: "2026-06", owed: 25000, isStep: false },
      { month: "2026-07", owed: 10000, isStep: true },
    ];
    render(<AffirmBurdenChart data={data} />);
    const lines = screen.getAllByTestId("reference-line");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveAttribute("data-x", "2026-05");
    expect(lines[1]).toHaveAttribute("data-x", "2026-07");
  });

  it("renders zero ReferenceLines when no month is a step-down (falsy filter branch)", () => {
    const data = [
      { month: "2026-04", owed: 37652, isStep: false },
      { month: "2026-05", owed: 37652, isStep: false },
    ];
    render(<AffirmBurdenChart data={data} />);
    expect(screen.queryAllByTestId("reference-line")).toHaveLength(0);
  });

  it("formatXTick abbreviates months to \"Mon '26\" style", () => {
    const data = [{ month: "2026-04", owed: 100, isStep: false }];
    render(<AffirmBurdenChart data={data} />);
    const axis = screen.getByTestId("x-axis");
    expect(axis).toHaveAttribute("data-tick-apr", "Apr '26");
    expect(axis).toHaveAttribute("data-tick-jan", "Jan '26");
    expect(axis).toHaveAttribute("data-tick-dec", "Dec '26");
  });

  it("XAxis is keyed on \"month\" field", () => {
    const data = [{ month: "2026-04", owed: 100, isStep: false }];
    render(<AffirmBurdenChart data={data} />);
    expect(screen.getByTestId("x-axis")).toHaveAttribute("data-key", "month");
  });

  it("YAxis tickFormatter uses fmtMoney (cents → dollar string)", () => {
    const data = [{ month: "2026-04", owed: 100, isStep: false }];
    render(<AffirmBurdenChart data={data} />);
    const axis = screen.getByTestId("y-axis");
    expect(axis).toHaveAttribute("data-tick-37652", "$376.52");
    expect(axis).toHaveAttribute("data-tick-0", "$0.00");
  });

  it("Area is configured for monthly-burden series (dataKey + name + type)", () => {
    render(<AffirmBurdenChart data={[]} />);
    const area = screen.getByTestId("area");
    expect(area).toHaveAttribute("data-key", "owed");
    expect(area).toHaveAttribute("data-name", "Monthly burden");
    expect(area).toHaveAttribute("data-type", "stepAfter");
  });

  it("renders CartesianGrid and Tooltip scaffolding", () => {
    render(<AffirmBurdenChart data={[]} />);
    expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
  });
});
