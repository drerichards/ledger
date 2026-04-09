import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MilestoneToast } from "./MilestoneToast";
import type { Milestone } from "@/types";

jest.useFakeTimers();

const AFFIRM_MILESTONE: Milestone = {
  id: "affirm_payoff:plan-1",
  type: "affirm_payoff",
  payload: { label: "Samsung TV", mc: 15000, month: "2026-03" },
  achievedAt: "2026-04-01T00:00:00Z",
  seen: false,
};

const THRESHOLD_MILESTONE: Milestone = {
  id: "savings_threshold:50000",
  type: "savings_threshold",
  payload: { threshold: 50000, totalSaved: 55000 },
  achievedAt: "2026-04-01T00:00:00Z",
  seen: false,
};

describe("MilestoneToast", () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it("renders nothing when milestones list is empty", () => {
    const { container } = render(
      <MilestoneToast milestones={[]} onDismiss={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders toast when milestones present", () => {
    render(
      <MilestoneToast milestones={[AFFIRM_MILESTONE]} onDismiss={jest.fn()} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the milestone label text", () => {
    render(
      <MilestoneToast milestones={[AFFIRM_MILESTONE]} onDismiss={jest.fn()} />,
    );
    expect(screen.getByText("Samsung TV is paid off")).toBeInTheDocument();
  });

  it("shows the dismiss button", () => {
    render(
      <MilestoneToast milestones={[AFFIRM_MILESTONE]} onDismiss={jest.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Dismiss notification" }),
    ).toBeInTheDocument();
  });

  it("calls onDismiss after close button click and animation delay", () => {
    const onDismiss = jest.fn();
    render(
      <MilestoneToast milestones={[AFFIRM_MILESTONE]} onDismiss={onDismiss} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    act(() => jest.advanceTimersByTime(400));
    expect(onDismiss).toHaveBeenCalledWith("affirm_payoff:plan-1");
  });

  it("calls onDismiss after auto-dismiss timeout", () => {
    const onDismiss = jest.fn();
    render(
      <MilestoneToast milestones={[AFFIRM_MILESTONE]} onDismiss={onDismiss} />,
    );
    act(() => jest.advanceTimersByTime(7000));
    expect(onDismiss).toHaveBeenCalledWith("affirm_payoff:plan-1");
  });

  it("renders savings threshold label correctly", () => {
    render(
      <MilestoneToast milestones={[THRESHOLD_MILESTONE]} onDismiss={jest.fn()} />,
    );
    expect(screen.getByText("Saved $500!")).toBeInTheDocument();
  });

  it("renders emoji for affirm_payoff type", () => {
    render(
      <MilestoneToast milestones={[AFFIRM_MILESTONE]} onDismiss={jest.fn()} />,
    );
    // Check that some emoji-like character is present in the toast
    expect(screen.getByRole("status").textContent).toMatch(/🎉/);
  });
});
