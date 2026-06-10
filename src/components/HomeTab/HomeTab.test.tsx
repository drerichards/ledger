import { render, screen, fireEvent } from "@testing-library/react";
import { HomeTab } from "@/components/HomeTab/HomeTab";
import type { BankAccount, Bill, InstallmentPlan, SavingsEntry } from "@/types";

// today() drives the week/month math — pin it so cash-flow ranges are deterministic.
jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  today: jest.fn(() => "2026-04-15"),
}));

// ─── Factories ──────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    id: "acct-1",
    name: "Chase Checking",
    balanceCents: 180000,
    updatedDate: "2026-04-10",
    ...overrides,
  };
}

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "b1",
    month: "2026-04",
    name: "Verizon",
    cents: 10800,
    due: 20,
    paid: false,
    method: "autopay",
    group: "kias_pay",
    entry: "recurring",
    category: "Utilities",
    flagged: false,
    notes: "",
    amountHistory: [],
    ...overrides,
  };
}

const noop = () => {};

type RenderOverrides = {
  checkingBalance?: number;
  checkingBalanceDate?: string;
  bankAccounts?: BankAccount[];
  bills?: Bill[];
  plans?: InstallmentPlan[];
  savingsLog?: SavingsEntry[];
  onSetBalance?: (balance: number, date: string) => void;
  onAddBankAccount?: (account: BankAccount) => void;
  onUpdateBankAccount?: (account: BankAccount) => void;
  onDeleteBankAccount?: (id: string) => void;
};

function renderHome(overrides: RenderOverrides = {}) {
  return render(
    <HomeTab
      checkingBalance={overrides.checkingBalance ?? 150000}
      checkingBalanceDate={overrides.checkingBalanceDate ?? "2026-04-10"}
      bankAccounts={overrides.bankAccounts ?? []}
      bills={overrides.bills ?? []}
      income={[]}
      plans={overrides.plans ?? []}
      paycheck={[]}
      checkLog={[]}
      savingsLog={overrides.savingsLog ?? []}
      onSetBalance={overrides.onSetBalance ?? noop}
      onAddBankAccount={overrides.onAddBankAccount ?? noop}
      onUpdateBankAccount={overrides.onUpdateBankAccount ?? noop}
      onDeleteBankAccount={overrides.onDeleteBankAccount ?? noop}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HomeTab — rendering", () => {
  it("renders the Savings and Total Liquid stat cards", () => {
    renderHome();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Total Liquid")).toBeInTheDocument();
  });

  it("renders the legacy checking balance and its updated date when no bank accounts", () => {
    // Savings entry makes Total Liquid ($1,600) differ from checking ($1,500),
    // so the checking value is unique in the DOM.
    renderHome({
      checkingBalance: 150000,
      checkingBalanceDate: "2026-04-10",
      savingsLog: [{ id: "s1", date: "2026-04-01", amount: 10000 }],
    });
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it("shows 'Not set' when the legacy balance date is empty", () => {
    renderHome({ checkingBalanceDate: "" });
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("shows the empty next-due message when there are no upcoming items", () => {
    renderHome();
    expect(
      screen.getByText("No due items remaining this month."),
    ).toBeInTheDocument();
  });
});

describe("HomeTab — legacy balance editing", () => {
  it("saves a new balance with today's date when Update → Save", () => {
    const onSetBalance = jest.fn();
    renderHome({ onSetBalance });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "200.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSetBalance).toHaveBeenCalledWith(20000, "2026-04-15");
  });

  it("does not save a zero/empty balance (guard)", () => {
    const onSetBalance = jest.fn();
    renderHome({ onSetBalance });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSetBalance).not.toHaveBeenCalled();
  });

  it("closes the edit form without saving when Cancel is clicked", () => {
    const onSetBalance = jest.fn();
    renderHome({ onSetBalance });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
    expect(onSetBalance).not.toHaveBeenCalled();
  });
});

describe("HomeTab — adding a first bank account (from legacy card)", () => {
  it("adds an account with name and balance when '+ Add Accounts' → Add", () => {
    const onAddBankAccount = jest.fn();
    renderHome({ onAddBankAccount });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Accounts" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Chase Checking"), {
      target: { value: "Ally Savings" },
    });
    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "500.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAddBankAccount).toHaveBeenCalledTimes(1);
    expect(onAddBankAccount).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ally Savings", balanceCents: 50000 }),
    );
  });

  it("does not add an account with a blank name (guard)", () => {
    const onAddBankAccount = jest.fn();
    renderHome({ onAddBankAccount });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Accounts" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAddBankAccount).not.toHaveBeenCalled();
  });
});

describe("HomeTab — bank accounts mode", () => {
  it("renders each account's name and balance", () => {
    // A savings entry makes Total Liquid ($2,000) differ from the account
    // balance ($1,800), so the balance text is unique to the account card.
    renderHome({
      bankAccounts: [makeAccount()],
      savingsLog: [{ id: "s1", date: "2026-04-01", amount: 20000 }],
    });
    expect(screen.getByText("Chase Checking")).toBeInTheDocument();
    expect(screen.getByText("$1,800.00")).toBeInTheDocument();
  });

  it("edits an account and calls onUpdateBankAccount with the new name", () => {
    const onUpdateBankAccount = jest.fn();
    renderHome({ bankAccounts: [makeAccount()], onUpdateBankAccount });
    fireEvent.click(screen.getByTitle("Edit"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Chase Checking"), {
      target: { value: "Chase Premier" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onUpdateBankAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: "acct-1", name: "Chase Premier" }),
    );
  });

  it("deletes an account when the delete button is clicked", () => {
    const onDeleteBankAccount = jest.fn();
    renderHome({ bankAccounts: [makeAccount()], onDeleteBankAccount });
    fireEvent.click(screen.getByTitle("Delete"));
    expect(onDeleteBankAccount).toHaveBeenCalledWith("acct-1");
  });

  it("opens the add-account form via '+ Add Account'", () => {
    renderHome({ bankAccounts: [makeAccount()] });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Account" }));
    expect(
      screen.getByPlaceholderText("e.g. Chase Checking"),
    ).toBeInTheDocument();
  });
});

describe("HomeTab — cash flow sections", () => {
  it("expands the collapsed 'Next week' section when its header is clicked", () => {
    renderHome();
    const nextWeek = screen.getByRole("button", { name: /Next week/ });
    expect(nextWeek).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(nextWeek);
    expect(nextWeek).toHaveAttribute("aria-expanded", "true");
  });

  it("renders a Next Due pill when a bill is due later this month", () => {
    renderHome({ bills: [makeBill({ due: 25 })] });
    expect(
      screen.queryByText("No due items remaining this month."),
    ).not.toBeInTheDocument();
  });

  it("renders cash-flow rows for bills that fall within the week window", () => {
    // today is mocked to 2026-04-15, so a bill due the 15th lands inside the
    // current-week range; projectCashFlowRows emits a row the table maps.
    renderHome({ checkingBalance: 200000, bills: [makeBill({ due: 15, name: "Verizon" })] });
    expect(screen.getAllByText("Verizon").length).toBeGreaterThan(0);
  });
});

describe("HomeTab — keyboard and cancel interactions", () => {
  it("saves the legacy balance on Enter", () => {
    const onSetBalance = jest.fn();
    renderHome({ onSetBalance });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "300.00" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSetBalance).toHaveBeenCalledWith(30000, "2026-04-15");
  });

  it("cancels the legacy balance edit on Escape", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.keyDown(screen.getByPlaceholderText("0.00"), { key: "Escape" });
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });

  it("submits the add-account form on Enter in the name field", () => {
    const onAddBankAccount = jest.fn();
    renderHome({ onAddBankAccount });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Accounts" }));
    const nameInput = screen.getByPlaceholderText("e.g. Chase Checking");
    fireEvent.change(nameInput, { target: { value: "Wells Fargo" } });
    fireEvent.keyDown(nameInput, { key: "Enter" });
    expect(onAddBankAccount).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Wells Fargo", balanceCents: 0 }),
    );
  });

  it("cancels the add-account form on Escape in the balance field", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "+ Add Accounts" }));
    fireEvent.keyDown(screen.getByPlaceholderText("0.00"), { key: "Escape" });
    expect(
      screen.queryByPlaceholderText("e.g. Chase Checking"),
    ).not.toBeInTheDocument();
  });

  it("closes the legacy add-account form on Cancel", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "+ Add Accounts" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByPlaceholderText("e.g. Chase Checking"),
    ).not.toBeInTheDocument();
  });

  it("adds a second account from bank-accounts mode", () => {
    const onAddBankAccount = jest.fn();
    renderHome({ bankAccounts: [makeAccount()], onAddBankAccount });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Account" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Chase Checking"), {
      target: { value: "BoA Savings" },
    });
    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "750.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAddBankAccount).toHaveBeenCalledWith(
      expect.objectContaining({ name: "BoA Savings", balanceCents: 75000 }),
    );
  });

  it("cancels editing an account without calling onUpdate", () => {
    const onUpdateBankAccount = jest.fn();
    renderHome({ bankAccounts: [makeAccount()], onUpdateBankAccount });
    fireEvent.click(screen.getByTitle("Edit"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onUpdateBankAccount).not.toHaveBeenCalled();
    expect(screen.getByText("Chase Checking")).toBeInTheDocument();
  });
});
