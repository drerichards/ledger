import { render, screen } from "@testing-library/react";
import { LedgerTable, type LedgerColumn, type LedgerSection } from "./LedgerTable";

const columns: LedgerColumn[] = [
  { key: "name", header: "Name" },
  { key: "amount", header: "Amount", align: "right" },
];

describe("LedgerTable", () => {
  it("renders all column headers", () => {
    render(<LedgerTable columns={columns} sections={[]} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("shows the default empty message when every section has zero rows", () => {
    render(
      <LedgerTable
        columns={columns}
        sections={[
          { label: "Group A", rows: [] },
          { label: "Group B", rows: [] },
        ]}
      />,
    );
    expect(screen.getByText("No data.")).toBeInTheDocument();
    // Section headers must NOT render when their rows are empty (falsy branch)
    expect(screen.queryByText("Group A")).not.toBeInTheDocument();
    expect(screen.queryByText("Group B")).not.toBeInTheDocument();
  });

  it("uses a custom empty message when supplied", () => {
    render(<LedgerTable columns={columns} sections={[]} emptyMessage="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders a section label when the section has rows", () => {
    const sections: LedgerSection[] = [
      {
        label: "Kia's Pay",
        rows: [{ id: "r1", cells: ["T-Mobile", "$108.00"] }],
      },
    ];
    render(<LedgerTable columns={columns} sections={sections} />);
    expect(screen.getByText("Kia's Pay")).toBeInTheDocument();
    expect(screen.getByText("T-Mobile")).toBeInTheDocument();
    expect(screen.getByText("$108.00")).toBeInTheDocument();
    // Empty message is suppressed when at least one section has rows
    expect(screen.queryByText("No data.")).not.toBeInTheDocument();
  });

  it("skips empty sections while rendering a mixed-populated set", () => {
    const sections: LedgerSection[] = [
      { label: "Empty One", rows: [] },
      {
        label: "Populated",
        rows: [{ id: "r1", cells: ["Rent", "$950.00"] }],
      },
      { label: "Empty Two", rows: [] },
    ];
    render(<LedgerTable columns={columns} sections={sections} />);
    expect(screen.queryByText("Empty One")).not.toBeInTheDocument();
    expect(screen.queryByText("Empty Two")).not.toBeInTheDocument();
    expect(screen.getByText("Populated")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("applies the income variant class to income rows", () => {
    const sections: LedgerSection[] = [
      {
        label: "Income",
        rows: [{ id: "r1", cells: ["Paycheck", "$1,200.00"], variant: "income" }],
      },
    ];
    const { container } = render(<LedgerTable columns={columns} sections={sections} />);
    const incomeRow = container.querySelector('[class*="rowIncome"]');
    expect(incomeRow).not.toBeNull();
  });

  it("applies the danger variant class to danger rows", () => {
    const sections: LedgerSection[] = [
      {
        label: "Overdue",
        rows: [{ id: "r1", cells: ["Past Due", "$45.00"], variant: "danger" }],
      },
    ];
    const { container } = render(<LedgerTable columns={columns} sections={sections} />);
    const dangerRow = container.querySelector('[class*="rowDanger"]');
    expect(dangerRow).not.toBeNull();
  });

  it("applies the default row class when variant is unspecified", () => {
    const sections: LedgerSection[] = [
      {
        label: "Default",
        rows: [{ id: "r1", cells: ["Generic", "$10.00"] }],
      },
    ];
    const { container } = render(<LedgerTable columns={columns} sections={sections} />);
    // className contains styles.row but NOT rowIncome/rowDanger
    const row = container.querySelector('tbody tr[class*="row"]:not([class*="rowIncome"]):not([class*="rowDanger"]):not([class*="sectionRow"])');
    expect(row).not.toBeNull();
  });

  it("applies the right-align class to header cells whose column has align='right'", () => {
    const { container } = render(<LedgerTable columns={columns} sections={[]} />);
    // Amount is right-aligned — its <th> must carry thRight; Name must NOT.
    const ths = container.querySelectorAll("th");
    expect(ths[0].className).not.toMatch(/thRight/);
    expect(ths[1].className).toMatch(/thRight/);
  });

  it("applies the right-align class to body cells whose column has align='right'", () => {
    const sections: LedgerSection[] = [
      {
        label: "Row group",
        rows: [{ id: "r1", cells: ["Item", "$99.00"] }],
      },
    ];
    const { container } = render(<LedgerTable columns={columns} sections={sections} />);
    const tds = container.querySelectorAll("tbody td");
    // First body td under "Row group" is the colspan section header — skip it.
    // The data row cells are tds[1] (name, left) and tds[2] (amount, right).
    expect(tds[1].className).not.toMatch(/tdRight/);
    expect(tds[2].className).toMatch(/tdRight/);
  });

  it("renders multiple rows inside a single section", () => {
    const sections: LedgerSection[] = [
      {
        label: "Multi",
        rows: [
          { id: "r1", cells: ["A", "$1.00"] },
          { id: "r2", cells: ["B", "$2.00"] },
          { id: "r3", cells: ["C", "$3.00"] },
        ],
      },
    ];
    render(<LedgerTable columns={columns} sections={sections} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });
});
