import { render, screen } from "@testing-library/react";
import { InsightCard } from "./InsightCard";

describe("InsightCard", () => {
  it("renders the headline", () => {
    render(<InsightCard headline="You saved $500 this month" sentiment="positive" />);
    expect(screen.getByText("You saved $500 this month")).toBeInTheDocument();
  });

  it("renders optional icon when provided", () => {
    render(<InsightCard icon="🎉" headline="Debt-free" sentiment="positive" />);
    expect(screen.getByText("🎉")).toBeInTheDocument();
  });

  it("does not render icon element when icon is omitted (falsy branch)", () => {
    const { container } = render(<InsightCard headline="No icon here" sentiment="neutral" />);
    // No span.icon should be present
    expect(container.querySelector("span")).toBeNull();
  });

  it("renders optional context when provided", () => {
    render(
      <InsightCard
        headline="On track"
        context="3 months until you're debt-free"
        sentiment="positive"
      />,
    );
    expect(screen.getByText("3 months until you're debt-free")).toBeInTheDocument();
  });

  it("renders optional teachingNote when provided", () => {
    render(
      <InsightCard
        headline="Snowball progress"
        teachingNote="Smallest balance first. Psychology first, math second."
        sentiment="neutral"
      />,
    );
    expect(
      screen.getByText("Smallest balance first. Psychology first, math second."),
    ).toBeInTheDocument();
  });

  it("omits context paragraph when context is falsy", () => {
    render(<InsightCard headline="Only headline" sentiment="neutral" />);
    // Only the headline paragraph should exist
    expect(screen.queryByText(/debt-free/)).not.toBeInTheDocument();
  });

  it("omits teaching paragraph when teachingNote is falsy", () => {
    render(<InsightCard headline="Only headline" sentiment="warning" />);
    expect(screen.queryByText(/Psychology/)).not.toBeInTheDocument();
  });

  it("applies the positive sentiment class", () => {
    const { container } = render(<InsightCard headline="x" sentiment="positive" />);
    expect(container.firstChild).toHaveClass("positive");
  });

  it("applies the neutral sentiment class", () => {
    const { container } = render(<InsightCard headline="x" sentiment="neutral" />);
    expect(container.firstChild).toHaveClass("neutral");
  });

  it("applies the warning sentiment class", () => {
    const { container } = render(<InsightCard headline="x" sentiment="warning" />);
    expect(container.firstChild).toHaveClass("warning");
  });

  it("applies the critical sentiment class", () => {
    const { container } = render(<InsightCard headline="x" sentiment="critical" />);
    expect(container.firstChild).toHaveClass("critical");
  });

  it("renders all optional props together", () => {
    render(
      <InsightCard
        icon="📉"
        headline="$126.52/mo freed up"
        context="From $376.52 to $250.00"
        teachingNote="This is the snowball at work."
        sentiment="positive"
      />,
    );
    expect(screen.getByText("📉")).toBeInTheDocument();
    expect(screen.getByText("$126.52/mo freed up")).toBeInTheDocument();
    expect(screen.getByText("From $376.52 to $250.00")).toBeInTheDocument();
    expect(screen.getByText("This is the snowball at work.")).toBeInTheDocument();
  });
});
