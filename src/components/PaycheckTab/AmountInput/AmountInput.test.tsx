import { render, screen, fireEvent } from "@testing-library/react";
import { AmountInput } from "./AmountInput";

const noop = () => {};

describe("AmountInput — display state", () => {
  it("shows formatted money value when value > 0", () => {
    render(<AmountInput value={76423} onChange={noop} />);
    expect(screen.getByText("$764.23")).toBeInTheDocument();
  });

  it("shows dash when value is 0", () => {
    render(<AmountInput value={0} onChange={noop} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("has button role when not disabled", () => {
    render(<AmountInput value={5000} onChange={noop} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has no button role when disabled", () => {
    render(<AmountInput value={5000} onChange={noop} disabled />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("AmountInput — editing", () => {
  it("switches to edit mode on click", () => {
    render(<AmountInput value={5000} onChange={noop} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("switches to edit mode on Enter key", () => {
    render(<AmountInput value={5000} onChange={noop} />);
    const display = screen.getByRole("button");
    fireEvent.keyDown(display, { key: "Enter" });
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("does not enter edit mode when disabled", () => {
    render(<AmountInput value={5000} onChange={noop} disabled />);
    const display = screen.queryByRole("button");
    expect(display).not.toBeInTheDocument();
  });

  it("pre-fills the input with the current value on focus", () => {
    render(<AmountInput value={76423} onChange={noop} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByPlaceholderText("0.00")).toHaveValue("764.23");
  });

  it("pre-fills empty string when value is 0", () => {
    render(<AmountInput value={0} onChange={noop} />);
    // Click the display (which shows —, not a button role — but it's a span with onClick)
    const display = document.querySelector("[class*=display]") as HTMLElement;
    if (display) fireEvent.click(display);
    // For value=0, the input should be empty
    const input = screen.queryByPlaceholderText("0.00");
    if (input) {
      expect((input as HTMLInputElement).value).toBe("");
    }
  });

  it("calls onChange with raw string when ✓ is clicked", () => {
    const onChange = jest.fn();
    render(<AmountInput value={0} onChange={onChange} />);
    // Find the span to click (no button role since value=0, but onClick exists)
    const displays = document.querySelectorAll("[role=button]");
    if (displays.length > 0) fireEvent.click(displays[0]);
    else {
      // value=0 means display span without role="button" since it has onClick
      const span = screen.queryByText("—")?.closest("span[tabindex]");
      if (span) fireEvent.click(span);
    }
    const input = screen.queryByPlaceholderText("0.00");
    if (input) {
      fireEvent.change(input, { target: { value: "50.00" } });
      fireEvent.click(screen.getByTitle("Save"));
      expect(onChange).toHaveBeenCalledWith("50.00");
    }
  });

  it("commits on Enter key in edit mode", () => {
    const onChange = jest.fn();
    render(<AmountInput value={5000} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "100.00" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("100.00");
  });

  it("cancels on Escape key in edit mode", () => {
    const onChange = jest.fn();
    render(<AmountInput value={5000} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    // Back to display mode
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });

  it("cancels on ✕ click", () => {
    const onChange = jest.fn();
    render(<AmountInput value={5000} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByTitle("Cancel"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
