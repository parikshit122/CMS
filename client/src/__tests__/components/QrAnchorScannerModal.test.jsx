import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QrAnchorScannerModal from "../../components/campus/QrAnchorScannerModal";

const NODES = [
  {
    id: 11,
    floorId: 2,
    code: "B2-LAB2",
    label: "Computer Lab 2 — First Floor",
    nodeType: "lab",
    qrSpotCode: "CAMPUS-CSLAB-02",
    displayQrSpotCode: "CAMPUS-CSLAB-02",
  },
  {
    id: 12,
    floorId: 1,
    code: "OUT-GATE",
    label: "Main Campus Gate",
    nodeType: "entrance",
    qrSpotCode: "CAMPUS-GATE-01",
    displayQrSpotCode: "CAMPUS-GATE-01",
  },
];

describe("QrAnchorScannerModal", () => {
  it("resolves a pasted campus QR URL via manual entry and calls onAnchorResolved", () => {
    const onResolved = vi.fn();
    const onClose = vi.fn();

    render(
      <QrAnchorScannerModal
        isOpen={true}
        onClose={onClose}
        nodes={NODES}
        qrAnchors={NODES}
        onAnchorResolved={onResolved}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /Enter Code \/ URL/i }));

    const input = screen.getByLabelText(/Campus QR Spot Code/i);
    fireEvent.change(input, {
      target: { value: "https://demo.campus.edu/campus-map?qr=CAMPUS-CSLAB-02" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Lock Position on Map/i }));

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved.mock.calls[0][0].id).toBe(11);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an accessible error alert when an unknown code is entered", () => {
    const onResolved = vi.fn();
    render(
      <QrAnchorScannerModal
        isOpen={true}
        onClose={() => {}}
        nodes={NODES}
        qrAnchors={NODES}
        onAnchorResolved={onResolved}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /Enter Code \/ URL/i }));
    fireEvent.change(screen.getByLabelText(/Campus QR Spot Code/i), {
      target: { value: "INVALID-SPOT-99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Lock Position on Map/i }));

    expect(onResolved).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/No campus location matched/i);
  });
});
