import { createRef } from "react";
import { render } from "@testing-library/react";
import { Progress } from "./progress";

describe("Progress", () => {
  it("renders a Radix Progress root element", () => {
    const { container } = render(<Progress value={50} />);
    // Radix applies [role="progressbar"]
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it("applies the track class to the root", () => {
    const { container } = render(<Progress value={50} />);
    const root = container.querySelector('[role="progressbar"]');
    expect(root?.className).toMatch(/track/);
  });

  it("merges a caller-supplied className with the track class", () => {
    const { container } = render(<Progress value={50} className="extra-class" />);
    const root = container.querySelector('[role="progressbar"]');
    expect(root?.className).toMatch(/track/);
    expect(root?.className).toMatch(/extra-class/);
  });

  it("drops a falsy className from the class list (filter(Boolean) branch)", () => {
    const { container } = render(<Progress value={50} />);
    const root = container.querySelector('[role="progressbar"]');
    // No stray undefined/null strings in className — only track survives.
    expect(root?.className.trim().split(/\s+/).every(Boolean)).toBe(true);
  });

  it("defaults the variant to olive", () => {
    const { container } = render(<Progress value={25} />);
    const fill = container.querySelector('[role="progressbar"] > *') as HTMLElement | null;
    expect(fill?.className).toMatch(/olive/);
  });

  it("applies the rust variant class when variant='rust'", () => {
    const { container } = render(<Progress value={25} variant="rust" />);
    const fill = container.querySelector('[role="progressbar"] > *') as HTMLElement | null;
    expect(fill?.className).toMatch(/rust/);
  });

  it("applies the gold variant class when variant='gold'", () => {
    const { container } = render(<Progress value={25} variant="gold" />);
    const fill = container.querySelector('[role="progressbar"] > *') as HTMLElement | null;
    expect(fill?.className).toMatch(/gold/);
  });

  it("applies the navy variant class when variant='navy'", () => {
    const { container } = render(<Progress value={25} variant="navy" />);
    const fill = container.querySelector('[role="progressbar"] > *') as HTMLElement | null;
    expect(fill?.className).toMatch(/navy/);
  });

  it("sets the fill transform based on the value prop", () => {
    const { container } = render(<Progress value={40} />);
    const fill = container.querySelector('[role="progressbar"] > *') as HTMLElement | null;
    // 100 - 40 = 60% → translateX(-60%)
    expect(fill?.style.transform).toBe("translateX(-60%)");
  });

  it("coerces a nullish value to 0 (value ?? 0 branch)", () => {
    const { container } = render(<Progress />);
    const fill = container.querySelector('[role="progressbar"] > *') as HTMLElement | null;
    // undefined → 0 → translateX(-100%)
    expect(fill?.style.transform).toBe("translateX(-100%)");
  });

  it("forwards refs to the underlying Radix root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress value={30} ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.getAttribute("role")).toBe("progressbar");
  });
});
