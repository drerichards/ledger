import { render, screen, fireEvent } from "@testing-library/react";
import { HeaderMenu } from "./HeaderMenu";

const noop = () => {};

describe("HeaderMenu — button", () => {
  it("renders the trigger button", () => {
    render(<HeaderMenu onSignOut={noop} />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("dropdown is closed initially", () => {
    render(<HeaderMenu onSignOut={noop} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens menu on trigger click", () => {
    render(<HeaderMenu onSignOut={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("toggles menu closed on second click", () => {
    render(<HeaderMenu onSignOut={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("HeaderMenu — menu items", () => {
  beforeEach(() => {
    render(<HeaderMenu onSignOut={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
  });

  it("shows 'Sign out' item", () => {
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });

  it("does not show Reset item when onResetToSeed is not provided", () => {
    expect(screen.queryByRole("menuitem", { name: /Reset/ })).not.toBeInTheDocument();
  });
});

describe("HeaderMenu — onResetToSeed", () => {
  it("shows Reset item when onResetToSeed is provided", () => {
    render(<HeaderMenu onSignOut={noop} onResetToSeed={noop} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByRole("menuitem", { name: /Reset to Seed Data/ })).toBeInTheDocument();
  });

  it("calls onResetToSeed and closes menu", () => {
    const onResetToSeed = jest.fn();
    render(<HeaderMenu onSignOut={noop} onResetToSeed={onResetToSeed} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Reset to Seed Data/ }));
    expect(onResetToSeed).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("HeaderMenu — callbacks", () => {
  it("calls onSignOut and closes menu", () => {
    const onSignOut = jest.fn();
    render(<HeaderMenu onSignOut={onSignOut} />);
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
        <HeaderMenu onSignOut={noop} />
        <button data-testid="outside">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
