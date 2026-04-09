import React from "react";
import { render, screen } from "@testing-library/react";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("renders with aria-label showing percent", () => {
    render(<ProgressRing ratio={0.5} label="50%" />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "50%: 50% complete",
    );
  });

  it("renders without label", () => {
    render(<ProgressRing ratio={0.75} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "75% complete",
    );
  });

  it("clamps ratio above 1", () => {
    render(<ProgressRing ratio={1.5} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "100% complete",
    );
  });

  it("clamps ratio below 0", () => {
    render(<ProgressRing ratio={-0.5} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "0% complete",
    );
  });

  it("renders sublabel when provided", () => {
    render(<ProgressRing ratio={0.3} label="30%" sublabel="of goal" />);
    expect(screen.getByText("of goal")).toBeInTheDocument();
  });

  it("renders with custom size and color props without crashing", () => {
    const { container } = render(
      <ProgressRing ratio={0.4} size={120} strokeWidth={12} color="rust" />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders with all color variants", () => {
    const colors = ["olive", "rust", "navy", "gold"] as const;
    colors.forEach((color) => {
      const { container } = render(<ProgressRing ratio={0.5} color={color} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
