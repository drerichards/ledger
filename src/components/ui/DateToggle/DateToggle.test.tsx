import { render, screen, fireEvent } from "@testing-library/react";
import { DateToggle } from "./DateToggle";

describe("DateToggle", () => {
  const baseProps = {
    label: "April 2026",
    onPrev: () => {},
    onNext: () => {},
    onToday: () => {},
  };

  it("renders the label text", () => {
    render(<DateToggle {...baseProps} />);
    expect(screen.getByText("April 2026")).toBeInTheDocument();
  });

  it("renders the Today button", () => {
    render(<DateToggle {...baseProps} />);
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
  });

  it("falls back to default prev/next aria labels when not supplied (default branches)", () => {
    render(<DateToggle {...baseProps} />);
    expect(screen.getByRole("button", { name: "Previous period" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next period" })).toBeInTheDocument();
  });

  it("uses custom prev/next aria labels when supplied", () => {
    render(
      <DateToggle
        {...baseProps}
        prevAriaLabel="Previous month"
        nextAriaLabel="Next month"
      />,
    );
    expect(screen.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
    // Defaults must NOT render when custom labels win
    expect(screen.queryByRole("button", { name: "Previous period" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next period" })).not.toBeInTheDocument();
  });

  it("fires onPrev when the previous button is clicked", () => {
    let called = 0;
    render(<DateToggle {...baseProps} onPrev={() => (called += 1)} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous period" }));
    expect(called).toBe(1);
  });

  it("fires onNext when the next button is clicked", () => {
    let called = 0;
    render(<DateToggle {...baseProps} onNext={() => (called += 1)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next period" }));
    expect(called).toBe(1);
  });

  it("fires onToday when the Today button is clicked", () => {
    let called = 0;
    render(<DateToggle {...baseProps} onToday={() => (called += 1)} />);
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(called).toBe(1);
  });

  it("disables the previous button when canPrev=false", () => {
    render(<DateToggle {...baseProps} canPrev={false} />);
    expect(screen.getByRole("button", { name: "Previous period" })).toBeDisabled();
  });

  it("disables the next button when canNext=false", () => {
    render(<DateToggle {...baseProps} canNext={false} />);
    expect(screen.getByRole("button", { name: "Next period" })).toBeDisabled();
  });

  it("enables both prev and next by default (canPrev/canNext default branches)", () => {
    render(<DateToggle {...baseProps} />);
    expect(screen.getByRole("button", { name: "Previous period" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next period" })).not.toBeDisabled();
  });
});
