import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast, toast } from "../../components/common/Alert";

const TriggerPanel = () => {
  const notify = useToast();
  return (
    <div>
      <button onClick={() => notify.success("Complaint submitted!")}>Trigger Success</button>
      <button onClick={() => notify.error("Unable to save settings")}>Trigger Error</button>
    </div>
  );
};

describe("Global ToastProvider", () => {
  beforeEach(() => {
    toast.clear();
    vi.useRealTimers();
  });

  it("renders stacked toasts from hook actions and dismisses on close button click", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TriggerPanel />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Success"));
    fireEvent.click(screen.getByText("Trigger Error"));

    const items = screen.getAllByTestId("global-toast-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("Complaint submitted!")).toBeInTheDocument();
    expect(screen.getByText("Unable to save settings")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", { name: /dismiss notification/i });
    fireEvent.click(closeButtons[0]);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getAllByTestId("global-toast-item")).toHaveLength(1);
    vi.useRealTimers();
  });

  it("dismisses topmost toast on Escape key and auto-dismisses after duration", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>
    );

    act(() => {
      toast.info("Settings updated", { duration: 1500 });
    });
    expect(screen.getByText("Settings updated")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Settings updated")).not.toBeInTheDocument();

    act(() => {
      toast.success("Auto close test", { duration: 1000 });
    });
    expect(screen.getByText("Auto close test")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(screen.queryByText("Auto close test")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
