import { render, screen } from "@testing-library/react";
import { FinanceTooltip } from "./FinanceTooltip";

describe("FinanceTooltip", () => {
  it("returns null when inactive", () => {
    const { container } = render(
      <FinanceTooltip active={false} payload={[{ name: "Owed", value: 100 }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when active is undefined (falsy branch)", () => {
    const { container } = render(<FinanceTooltip payload={[{ name: "Owed", value: 100 }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when payload is empty", () => {
    const { container } = render(<FinanceTooltip active={true} payload={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when payload is undefined", () => {
    const { container } = render(<FinanceTooltip active={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the label when provided", () => {
    render(
      <FinanceTooltip
        active={true}
        label="April 2026"
        payload={[{ name: "Owed", value: 37652, color: "#C4522A" }]}
      />,
    );
    expect(screen.getByText("April 2026")).toBeInTheDocument();
  });

  it("falls back to empty string when label is absent (nullish branch)", () => {
    const { container } = render(
      <FinanceTooltip active={true} payload={[{ name: "Owed", value: 100 }]} />,
    );
    // No label text renders — the month <p> exists but is empty
    const month = container.querySelector("p");
    expect(month).toBeInTheDocument();
    expect(month?.textContent).toBe("");
  });

  it("renders each payload entry's name", () => {
    render(
      <FinanceTooltip
        active={true}
        payload={[
          { name: "Owed", value: 37652 },
          { name: "Relief", value: 12652 },
        ]}
      />,
    );
    expect(screen.getByText("Owed")).toBeInTheDocument();
    expect(screen.getByText("Relief")).toBeInTheDocument();
  });

  it("uses default String formatter when fmtValue is not provided", () => {
    render(
      <FinanceTooltip
        active={true}
        payload={[{ name: "Owed", value: 37652 }]}
      />,
    );
    // Default fmtValue = String → "37652"
    expect(screen.getByText("37652")).toBeInTheDocument();
  });

  it("uses custom fmtValue when provided", () => {
    render(
      <FinanceTooltip
        active={true}
        payload={[{ name: "Owed", value: 37652 }]}
        fmtValue={(v) => `$${(v / 100).toFixed(2)}`}
      />,
    );
    expect(screen.getByText("$376.52")).toBeInTheDocument();
  });

  it("coerces undefined value to 0", () => {
    render(
      <FinanceTooltip
        active={true}
        payload={[{ name: "Empty", color: "#000" }]}
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("uses index as key fallback when entry.name is missing", () => {
    // Two entries without name — the map uses `key={entry.name ?? i}` so index keeps React happy.
    // The component must not crash and must render both rows.
    const { container } = render(
      <FinanceTooltip
        active={true}
        payload={[
          { value: 100, color: "#111" },
          { value: 200, color: "#222" },
        ]}
      />,
    );
    // Two row divs rendered inside the tooltip wrapper
    const tooltip = container.firstChild as HTMLElement;
    const rows = tooltip.querySelectorAll(":scope > div");
    expect(rows.length).toBe(2);
  });

  it("applies color from each entry to the dot indicator", () => {
    const { container } = render(
      <FinanceTooltip
        active={true}
        payload={[{ name: "Owed", value: 100, color: "#C4522A" }]}
      />,
    );
    const dot = container.querySelector("span[style]");
    expect(dot).toHaveStyle({ background: "#C4522A" });
  });
});
