import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmModal from "../../components/common/ConfirmModal";

describe("ConfirmModal", () => {
  const defaultProps = {
    isOpen:      true,
    onClose:     vi.fn(),
    onConfirm:   vi.fn(),
    title:       "Delete Item?",
    message:     "This cannot be undone.",
    confirmText: "Delete",
    type:        "danger",
  };

  it("renders when open", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Delete Item?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Delete Item?")).not.toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button clicked", () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables confirm button when loading", () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);
    const confirmBtn = screen.getByText("Processing...");
    expect(confirmBtn.closest("button")).toBeDisabled();
  });

  it("disables confirm button when confirmDisabled", () => {
    render(<ConfirmModal {...defaultProps} confirmDisabled={true} />);
    expect(screen.getByText("Delete").closest("button")).toBeDisabled();
  });
});