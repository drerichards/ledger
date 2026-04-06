import { render, screen, fireEvent } from "@testing-library/react";
import { SortableHeader } from "./SortableHeader";
import type { SortKey, SortDir } from "../BillGroup";

const noop = () => {};

function renderHeader(props: Partial<Parameters<typeof SortableHeader>[0]> = {}) {
  const defaults = {
    label: "Date",
    sortKey: "due" as SortKey,
    activeSortKey: "due" as SortKey,
    sortDir: "asc" as SortDir,
    onSort: noop,
  };
  return render(
    <table><thead><tr>
      <SortableHeader {...defaults} {...props} />
    </tr></thead></table>,
  );
}

describe("SortableHeader", () => {
  it("renders the label text", () => {
    renderHeader({ label: "Payee" });
    expect(screen.getByText(/Payee/)).toBeInTheDocument();
  });

  it("shows ascending arrow when active and sortDir is 'asc'", () => {
    renderHeader({ label: "Date", sortKey: "due", activeSortKey: "due", sortDir: "asc" });
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it("shows descending arrow when active and sortDir is 'desc'", () => {
    renderHeader({ label: "Date", sortKey: "due", activeSortKey: "due", sortDir: "desc" });
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it("shows no arrow when this column is not the active sort key", () => {
    renderHeader({ label: "Payee", sortKey: "name", activeSortKey: "due", sortDir: "asc" });
    expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
  });

  it("sets aria-sort to 'ascending' when active asc", () => {
    renderHeader({ sortKey: "due", activeSortKey: "due", sortDir: "asc" });
    const th = screen.getByRole("columnheader");
    expect(th).toHaveAttribute("aria-sort", "ascending");
  });

  it("sets aria-sort to 'descending' when active desc", () => {
    renderHeader({ sortKey: "due", activeSortKey: "due", sortDir: "desc" });
    const th = screen.getByRole("columnheader");
    expect(th).toHaveAttribute("aria-sort", "descending");
  });

  it("has no aria-sort when not the active column", () => {
    renderHeader({ sortKey: "name", activeSortKey: "due" });
    const th = screen.getByRole("columnheader");
    expect(th).not.toHaveAttribute("aria-sort");
  });

  it("calls onSort with the sortKey on click", () => {
    const onSort = jest.fn();
    renderHeader({ sortKey: "cents", onSort });
    fireEvent.click(screen.getByRole("columnheader"));
    expect(onSort).toHaveBeenCalledWith("cents");
  });
});
