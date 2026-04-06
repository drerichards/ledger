import { render, screen } from "@testing-library/react";
import { FormField } from "@/components/ui/FormField";

describe("FormField", () => {
  it("renders the label text", () => {
    render(
      <FormField id="bill-name" label="Payee Name">
        <input id="bill-name" />
      </FormField>,
    );
    expect(screen.getByText("Payee Name")).toBeInTheDocument();
  });

  it("associates the label with the child input via htmlFor", () => {
    render(
      <FormField id="due-date" label="Due Date">
        <input id="due-date" />
      </FormField>,
    );
    const label = screen.getByText("Due Date");
    expect(label).toHaveAttribute("for", "due-date");
  });

  it("renders children", () => {
    render(
      <FormField id="amount" label="Amount">
        <input id="amount" placeholder="Enter amount" />
      </FormField>,
    );
    expect(screen.getByPlaceholderText("Enter amount")).toBeInTheDocument();
  });

  it("renders the error message when error prop is provided", () => {
    render(
      <FormField id="amount" label="Amount" error="Amount is required">
        <input id="amount" />
      </FormField>,
    );
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
  });

  it("does not render an error element when error is undefined", () => {
    render(
      <FormField id="amount" label="Amount">
        <input id="amount" />
      </FormField>,
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    // No error span at all
    expect(
      screen.queryByText(/required|invalid|error/i),
    ).not.toBeInTheDocument();
  });

  it("does not render an error element when error is an empty string", () => {
    render(
      <FormField id="amount" label="Amount" error="">
        <input id="amount" />
      </FormField>,
    );
    // Empty string is falsy — no error span should mount
    const errorSpans = document.querySelectorAll("[class*=error]");
    expect(errorSpans).toHaveLength(0);
  });
});
