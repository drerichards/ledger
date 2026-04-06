import { render, screen, fireEvent } from "@testing-library/react";
import { HeaderMenu } from "./HeaderMenu";

const noop = () => {};

describe("HeaderMenu — button", () => {
  it("renders the trigger button", () => {
    render(<HeaderMenu onPrintTab={noop} onPrintAll={noop} onSignOut={noop} />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("dropdown is closed initially", () => {
    render(<HeaderMenu onPrintTab={noop} onPrintAll={noop} onSignOut={noop} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens menu on trigger click", () => {
    render(<HeaderMenu onPrintTab={noop} onPrintAll={noop} onSignOut={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("toggles menu closed on second click", () => {
    render(<HeaderMenu onPrintTab={noop} onPrintAll={noop} onSignOut={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("HeaderMenu — menu items", () => {
  beforeEach(() => {
    render(<HeaderMenu
      onPrintTab={noop}
      onPrintAll={noop}
      onSignOut={noop}
    />);
    fireEvent.click(screen.getByLabelText("Open menu"));
  });

  it("shows 'Print This Tab' item", () => {
    expect(screen.getByRole("menuitem", { name: "Print This Tab" })).toBeInTheDocument();
  });

  it("shows 'Print All Tabs' item", () => {
    expect(screen.getByRole("menuitem", { name: "Print All Tabs" })).toBeInTheDocument();
  });

  it("shows 'Sign out' item", () => {
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });
});

describe("HeaderMenu — callbacks", () => {
  it("calls onPrintTab and closes menu", () => {
    const onPrintTab = jest.fn();
    render(<HeaderMenu onPrintTab={onPrintTab} onPrintAll={noop} onSignOut={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Print This Tab" }));
    expect(onPrintTab).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onPrintAll and closes menu", () => {
    const onPrintAll = jest.fn();
    render(<HeaderMenu onPrintTab={noop} onPrintAll={onPrintAll} onSignOut={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Print All Tabs" }));
    expect(onPrintAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onSignOut and closes menu", () => {
    const onSignOut = jest.fn();
    render(<HeaderMenu onPrintTab={noop} onPrintAll={noop} onSignOut={onSignOut} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("HeaderMenu — outside click", () => {
  it("closes menu on outside mousedown", () => {
    render(
      <div>
        <HeaderMenu onPrintTab={noop} onPrintAll={noop} onSignOut={noop} />
        <button data-testid="outside">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
