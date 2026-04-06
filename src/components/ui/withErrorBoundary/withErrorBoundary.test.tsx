import { render, screen } from "@testing-library/react";
import { withErrorBoundary } from "@/components/ui/withErrorBoundary";

// ─── Components for testing ───────────────────────────────────────────────────

function GoodComponent() {
  return <div>Rendered successfully</div>;
}

function BadComponent(): never {
  throw new Error("Intentional test error");
}

function BadStringThrower(): never {
  throw "raw string error" as never;
}

// Suppress React's console.error output for expected thrown errors
beforeAll(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

describe("withErrorBoundary", () => {
  it("renders the wrapped component when no error occurs", () => {
    const Safe = withErrorBoundary(GoodComponent, "GoodComponent");
    render(<Safe />);
    expect(screen.getByText("Rendered successfully")).toBeInTheDocument();
  });

  it("renders the fallback UI when the component throws", () => {
    const Safe = withErrorBoundary(BadComponent, "BadComponent");
    render(<Safe />);
    expect(screen.getByText(/BadComponent failed to render/)).toBeInTheDocument();
  });

  it("shows the error message in the fallback", () => {
    const Safe = withErrorBoundary(BadComponent, "BadComponent");
    render(<Safe />);
    expect(screen.getByText(/Intentional test error/)).toBeInTheDocument();
  });

  it("sets the correct displayName on the wrapped component", () => {
    const Safe = withErrorBoundary(GoodComponent, "GoodComponent");
    expect(Safe.displayName).toBe("withErrorBoundary(GoodComponent)");
  });

  it("uses String(error) when the thrown value is not an Error instance (line 17 falsy branch)", () => {
    const Safe = withErrorBoundary(BadStringThrower, "BadStringThrower");
    render(<Safe />);
    expect(screen.getByText(/raw string error/)).toBeInTheDocument();
  });
});
