import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  const baseProps = {
    title: "Test Modal",
    onClose: jest.fn(),
    children: <p>Modal body content</p>,
    footer: <button>Save</button>,
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders the title", () => {
    render(<Modal {...baseProps} />);
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders children in the body", () => {
    render(<Modal {...baseProps} />);
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
  });

  it("renders footer content", () => {
    render(<Modal {...baseProps} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClose when the × button is clicked", () => {
    render(<Modal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const { container } = render(<Modal {...baseProps} />);
    // The backdrop is the outermost div — clicking directly on it triggers onClose
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside the modal content", () => {
    render(<Modal {...baseProps} />);
    fireEvent.click(screen.getByText("Modal body content"));
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it("renders null footer without crashing", () => {
    render(<Modal {...baseProps} footer={null} />);
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });
});
