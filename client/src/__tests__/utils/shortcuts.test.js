import { describe, it, expect } from "vitest";
import {
  isEditableTarget,
  isMacPlatform,
  formatShortcutKeys,
  getShortcutsForRole,
  filterCommands,
  matchDirectShortcut,
  matchChordShortcut,
} from "../../utils/shortcuts";

describe("global keyboard shortcuts utility", () => {
  it("detects editable targets so typing never hijacks single-key shortcuts", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isEditableTarget({ tagName: "BUTTON", isContentEditable: false })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });

  it("formats platform modifier keys accurately for macOS vs Windows/Linux", () => {
    expect(isMacPlatform("MacIntel")).toBe(true);
    expect(isMacPlatform("Win32")).toBe(false);
    expect(formatShortcutKeys(["Mod", "K"], true)).toEqual(["⌘", "K"]);
    expect(formatShortcutKeys(["Mod", "K"], false)).toEqual(["Ctrl", "K"]);
    expect(formatShortcutKeys(["Mod", "Shift", "L"], true)).toEqual(["⌘", "⇧", "L"]);
  });

  it("returns role-specific navigation and action shortcuts", () => {
    const studentIds = getShortcutsForRole("user").map((c) => c.id);
    expect(studentIds).toContain("new-complaint");
    expect(studentIds).toContain("go-complaints");
    expect(studentIds).not.toContain("go-users");

    const adminIds = getShortcutsForRole("admin").map((c) => c.id);
    expect(adminIds).toContain("go-users");
    expect(adminIds).toContain("go-settings");
    expect(adminIds).not.toContain("new-complaint");

    const staffIds = getShortcutsForRole("staff").map((c) => c.id);
    expect(staffIds).toContain("go-complaints");
    expect(staffIds).not.toContain("new-complaint");
    expect(staffIds).not.toContain("go-users");
  });

  it("matches direct and modifier shortcuts cleanly", () => {
    const nonEditable = { tagName: "BODY" };
    const inputTarget = { tagName: "INPUT" };

    // Ctrl+K / Cmd+K works everywhere (even inside inputs)
    expect(
      matchDirectShortcut({ key: "k", ctrlKey: true, target: inputTarget }, "admin")
    ).toBe("open-palette");
    expect(
      matchDirectShortcut({ key: "K", metaKey: true, target: nonEditable }, "user")
    ).toBe("open-palette");

    // Ctrl+N / Alt+N opens New Complaint only for students
    expect(
      matchDirectShortcut({ key: "n", ctrlKey: true, target: nonEditable }, "user")
    ).toBe("new-complaint");
    expect(
      matchDirectShortcut({ key: "n", altKey: true, target: nonEditable }, "user")
    ).toBe("new-complaint");
    expect(
      matchDirectShortcut({ key: "n", ctrlKey: true, target: nonEditable }, "admin")
    ).toBe(null);

    // Ctrl+Shift+L toggles theme
    expect(
      matchDirectShortcut({ key: "L", ctrlKey: true, shiftKey: true, target: nonEditable }, "staff")
    ).toBe("toggle-theme");

    // ? and / work outside inputs, ignored inside inputs
    expect(matchDirectShortcut({ key: "?", target: nonEditable }, "admin")).toBe("show-shortcuts");
    expect(matchDirectShortcut({ key: "?", target: inputTarget }, "admin")).toBe(null);
    expect(matchDirectShortcut({ key: "/", target: nonEditable }, "user")).toBe("focus-page-search");
    expect(matchDirectShortcut({ key: "/", target: inputTarget }, "user")).toBe(null);
  });

  it("matches G + key navigation chords per role", () => {
    expect(matchChordShortcut("d", "user")?.route).toBe("/dashboard");
    expect(matchChordShortcut("c", "user")?.route).toBe("/complaints");
    expect(matchChordShortcut("c", "staff")?.route).toBe("/staff/complaints");
    expect(matchChordShortcut("r", "admin")?.route).toBe("/admin/reports");
    expect(matchChordShortcut("u", "admin")?.route).toBe("/admin/users");
    expect(matchChordShortcut("s", "admin")?.route).toBe("/admin/settings");
    expect(matchChordShortcut("l", "user")?.route).toBe("/lost-found");
    expect(matchChordShortcut("l", "admin")?.route).toBe("/lost-found");
    expect(matchChordShortcut("u", "user")).toBe(null);
  });

  it("filters commands by query across labels, descriptions, and keywords", () => {
    const adminCommands = getShortcutsForRole("admin");
    const reportMatches = filterCommands(adminCommands, "csv sla");
    expect(reportMatches.map((c) => c.id)).toContain("go-complaints");

    const themeMatches = filterCommands(adminCommands, "dark mode");
    expect(themeMatches.map((c) => c.id)).toContain("toggle-theme");

    const studentCommands = getShortcutsForRole("user").filter(
      (c) => c.id !== "open-palette"
    );
    const complaintMatches = filterCommands(studentCommands, "complaints");
    expect(complaintMatches[0]?.id).toBe("go-complaints");
  });
});
