import { render } from "@testing-library/react";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

describe("GoogleIcon", () => {
  it("renders an svg element", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("is aria-hidden for a11y (decorative icon)", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies a custom className when provided", () => {
    const { container } = render(<GoogleIcon className="my-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("my-icon");
  });

  it("renders without a className when prop is omitted", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    // No class attribute or empty class
    expect(svg?.getAttribute("class")).toBeFalsy();
  });
});
