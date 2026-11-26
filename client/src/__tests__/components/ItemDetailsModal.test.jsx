import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ItemDetailsModal from "../../components/lostfound/ItemDetailsModal";

const baseItem = {
  id: 42,
  itemCode: "LF-2026-0042",
  title: "Scientific Calculator (FX-991EX)",
  description: "Found on the second desk in Computer Lab 201 after practical exam.",
  category: "electronics",
  foundLocation: "Computer Lab 201 — 1st Floor",
  foundAt: "2026-11-25T10:30:00.000Z",
  custodyType: "security_desk",
  custodyLocation: "Main Gate Security Desk",
  contactPhone: "9876543210",
  verificationQuestion: "What initials are written on the back cover?",
  status: "open",
  mapNodeId: 7,
  finder: { id: 2, name: "Prof. Rajesh Deshmukh", phone: "9876543210" },
  canReview: false,
  myApprovedClaim: false,
  totalClaimsCount: 0,
};

describe("ItemDetailsModal — Lost & Found Details & Contact on WhatsApp", () => {
  it("renders a Contact on WhatsApp button using the wa.me link with stored phone", () => {
    render(
      <MemoryRouter>
        <ItemDetailsModal
          open={true}
          item={baseItem}
          canClaim={true}
          onClose={vi.fn()}
          onOpenClaim={vi.fn()}
          onOpenReview={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Scientific Calculator (FX-991EX)")).toBeInTheDocument();
    expect(screen.getByText("LF-2026-0042")).toBeInTheDocument();

    const waLink = screen.getByRole("link", { name: /Contact on WhatsApp/i });
    expect(waLink).toBeInTheDocument();
    expect(waLink.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(waLink.getAttribute("target")).toBe("_blank");
    expect(waLink.getAttribute("rel")).toContain("noopener");

    const callLink = screen.getByRole("link", { name: /^Call$/i });
    expect(callLink.getAttribute("href")).toBe("tel:+919876543210");
  });

  it("shows fallback copy without wa.me button when no phone is stored", () => {
    const noPhoneItem = {
      ...baseItem,
      contactPhone: "",
      finder: { id: 2, name: "Prof. Rajesh Deshmukh", phone: "" },
    };

    render(
      <MemoryRouter>
        <ItemDetailsModal
          open={true}
          item={noPhoneItem}
          canClaim={true}
          onClose={vi.fn()}
          onOpenClaim={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: /Contact on WhatsApp/i })).not.toBeInTheDocument();
    expect(screen.getByText(/No phone number is stored/i)).toBeInTheDocument();
  });

  it("triggers Verify & Claim callback from details footer", () => {
    const onClose = vi.fn();
    const onOpenClaim = vi.fn();

    render(
      <MemoryRouter>
        <ItemDetailsModal
          open={true}
          item={baseItem}
          canClaim={true}
          onClose={onClose}
          onOpenClaim={onOpenClaim}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Verify & Claim/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenClaim).toHaveBeenCalledWith(42);
  });

  it("renders distinct visual status badges for Available, In Progress, Pickup Pending, and Claimed", () => {
    const cases = [
      { status: "open", label: "Available", cls: "lf-status-badge--available" },
      { status: "claim_pending", label: "In Progress", cls: "lf-status-badge--progress" },
      { status: "approved", label: "Pickup Pending", cls: "lf-status-badge--approved" },
      { status: "returned", label: "Claimed", cls: "lf-status-badge--claimed" },
    ];

    for (const c of cases) {
      const { unmount } = render(
        <MemoryRouter>
          <ItemDetailsModal
            open={true}
            item={{ ...baseItem, status: c.status }}
            canClaim={c.status === "open"}
            onClose={vi.fn()}
          />
        </MemoryRouter>
      );
      const badge = screen.getByLabelText(`Status: ${c.label}`);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(c.cls);
      unmount();
    }
  });
});

