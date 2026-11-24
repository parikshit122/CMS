export const OPEN_COMMAND_PALETTE_EVENT = "complaintsync:open-command-palette";
export const OPEN_SHORTCUTS_HELP_EVENT = "complaintsync:open-shortcuts-help";

/**
 * Returns true if the event target is an editable field where single-key
 * shortcuts (like `?`, `/`, or `g` chords) should NOT hijack user typing.
 */
export function isEditableTarget(target) {
  if (!target || typeof target !== "object") return false;
  const tag = String(target.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable) return true;
  if (typeof target.closest === "function") {
    const editableAncestor = target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""]'
    );
    if (editableAncestor) return true;
  }
  return false;
}

export function isMacPlatform(platform = "") {
  const value =
    platform ||
    (typeof navigator !== "undefined"
      ? navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || ""
      : "");
  return /mac|iphone|ipad|ipod/i.test(String(value));
}

export function formatShortcutKeys(keys = [], mac = false) {
  return keys.map((k) => {
    if (k === "Mod") return mac ? "⌘" : "Ctrl";
    if (k === "Alt") return mac ? "⌥" : "Alt";
    if (k === "Shift") return mac ? "⇧" : "Shift";
    return k;
  });
}

export function getRoleDashboardPath(role) {
  const normalized = String(role || "user").toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "staff") return "/staff";
  return "/dashboard";
}

export function getRoleNotificationsPath(role) {
  const normalized = String(role || "user").toLowerCase();
  if (normalized === "admin") return "/admin/notifications";
  if (normalized === "staff") return "/staff/notifications";
  return "/notifications";
}

export function getRoleComplaintsPath(role) {
  const normalized = String(role || "user").toLowerCase();
  if (normalized === "admin") return "/admin/reports";
  if (normalized === "staff") return "/staff/complaints";
  return "/complaints";
}

/**
 * Returns the complete role-aware list of keyboard commands for the
 * Command Palette and Shortcuts Reference modal.
 */
export function getShortcutsForRole(role = "user") {
  const normalized = String(role || "user").toLowerCase();

  const commands = [
    {
      id: "open-palette",
      label: "Quick Search & Command Palette",
      description: "Jump to any page or run quick actions",
      section: "Quick Actions",
      icon: "bx-search",
      keys: ["Mod", "K"],
      actionType: "palette",
      keywords: ["search", "find", "command", "jump", "palette", "filter"],
    },
    {
      id: "focus-page-search",
      label: "Focus Page Search Bar",
      description: "Jump directly to the search input on the current page",
      section: "Quick Actions",
      icon: "bx-filter-alt",
      keys: ["/"],
      actionType: "focus-search",
      keywords: ["search", "filter", "table", "find"],
    },
  ];

  if (normalized === "user") {
    commands.push({
      id: "new-complaint",
      label: "New Complaint",
      description: "Open the complaint submission form",
      section: "Quick Actions",
      icon: "bx-plus-circle",
      keys: ["Mod", "N"],
      altKeys: ["Alt", "N"],
      route: "/submit",
      actionType: "navigate",
      keywords: ["new", "create", "submit", "report", "issue", "complaint"],
    });
  }

  // Navigation shortcuts (G + key chords)
  commands.push({
    id: "go-dashboard",
    label: "Go to Dashboard",
    description:
      normalized === "admin"
        ? "Open System Intelligence overview"
        : normalized === "staff"
          ? "Open Staff Dashboard"
          : "Open Student Hub",
    section: "Navigation",
    icon: "bx-grid-alt",
    keys: ["G", "D"],
    chord: "d",
    route: getRoleDashboardPath(normalized),
    actionType: "navigate",
    keywords: ["home", "overview", "dashboard", "stats", "hub"],
  });

  commands.push({
    id: "go-complaints",
    label:
      normalized === "admin"
        ? "Reports & Complaints"
        : normalized === "staff"
          ? "Assigned Complaints"
          : "My Complaints",
    description:
      normalized === "admin"
        ? "Search, assign, and export all complaints"
        : normalized === "staff"
          ? "View and update assigned tickets"
          : "Track your submitted complaints",
    section: "Navigation",
    icon: normalized === "admin" ? "bx-bar-chart-alt-2" : "bx-file",
    keys: normalized === "admin" ? ["G", "R"] : ["G", "C"],
    chord: normalized === "admin" ? "r" : "c",
    altChord: normalized === "admin" ? "c" : undefined,
    route: getRoleComplaintsPath(normalized),
    actionType: "navigate",
    keywords: ["complaints", "tickets", "reports", "history", "tasks", "csv", "sla"],
  });

  if (normalized === "admin") {
    commands.push(
      {
        id: "go-users",
        label: "Manage Users",
        description: "Manage students and staff accounts",
        section: "Navigation",
        icon: "bx-group",
        keys: ["G", "U"],
        chord: "u",
        route: "/admin/users",
        actionType: "navigate",
        keywords: ["users", "students", "staff", "accounts", "directory"],
      },
      {
        id: "go-settings",
        label: "System Settings",
        description: "Configure categories, email alerts, and policies",
        section: "Navigation",
        icon: "bx-cog",
        keys: ["G", "S"],
        chord: "s",
        route: "/admin/settings",
        actionType: "navigate",
        keywords: ["settings", "preferences", "config", "maintenance"],
      }
    );
  }

  commands.push(
    {
      id: "go-lost-found",
      label: "Campus Lost & Found",
      description: "Browse found items, verify ownership, or post a found item",
      section: "Navigation",
      icon: "bx-search-alt-2",
      keys: ["G", "L"],
      chord: "l",
      route: "/lost-found",
      actionType: "navigate",
      keywords: ["lost", "found", "missing", "claim", "campus", "item", "handover"],
    },
    {
      id: "go-notifications",
      label: "Notifications",
      description: "View recent complaint alerts and updates",
      section: "Navigation",
      icon: "bx-bell",
      keys: ["G", "N"],
      chord: "n",
      route: getRoleNotificationsPath(normalized),
      actionType: "navigate",
      keywords: ["notifications", "alerts", "inbox", "updates"],
    },
    {
      id: "go-profile",
      label: "Profile & Account",
      description: "Edit your profile details and password",
      section: "Navigation",
      icon: "bx-user",
      keys: ["G", "P"],
      chord: "p",
      route: "/profile",
      actionType: "navigate",
      keywords: ["profile", "account", "avatar", "password"],
    },
    {
      id: "toggle-theme",
      label: "Toggle Dark / Light Mode",
      description: "Switch between Ember Forge Dark and Light themes",
      section: "Preferences",
      icon: "bx-adjust",
      keys: ["Mod", "Shift", "L"],
      actionType: "toggle-theme",
      keywords: ["theme", "dark", "light", "appearance", "mode"],
    },
    {
      id: "show-shortcuts",
      label: "Keyboard Shortcuts Guide",
      description: "View all available keyboard shortcuts",
      section: "Preferences",
      icon: "bx-command",
      keys: ["?"],
      actionType: "help",
      keywords: ["help", "shortcuts", "hotkeys", "keys", "cheatsheet"],
    }
  );

  return commands;
}

/**
 * Filters command list by query against label, description, section, and keywords.
 */
export function filterCommands(commands = [], query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return commands;

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const scored = [];

  commands.forEach((cmd, originalIndex) => {
    const label = String(cmd.label || "").toLowerCase();
    const haystack = [
      label,
      cmd.description,
      cmd.section,
      ...(cmd.keywords || []),
    ]
      .join(" ")
      .toLowerCase();

    if (!terms.every((term) => haystack.includes(term))) {
      return;
    }

    let score = 0;
    if (label === normalizedQuery) score += 100;
    else if (label.startsWith(normalizedQuery)) score += 60;
    else if (label.includes(normalizedQuery)) score += 40;
    else if (terms.every((term) => label.includes(term))) score += 25;

    scored.push({ cmd, score, originalIndex });
  });

  scored.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
  return scored.map((entry) => entry.cmd);
}

/**
 * Matches single-press modifier or global keydown events into a normalized command ID.
 * Returns null if no shortcut matched.
 */
export function matchDirectShortcut(event, role = "user") {
  if (!event) return null;
  const key = String(event.key || "");
  const lowerKey = key.toLowerCase();
  const hasMod = Boolean(event.ctrlKey || event.metaKey);
  const editable = isEditableTarget(event.target);
  const normalizedRole = String(role || "user").toLowerCase();

  // Ctrl+K / Cmd+K always toggles Command Palette (even inside inputs)
  if (hasMod && !event.altKey && !event.shiftKey && lowerKey === "k") {
    return "open-palette";
  }

  // Ctrl+N / Cmd+N or Alt+N opens New Complaint for students
  if (
    normalizedRole === "user" &&
    ((hasMod && !event.altKey && !event.shiftKey && lowerKey === "n") ||
      (event.altKey && !hasMod && !event.shiftKey && lowerKey === "n"))
  ) {
    return "new-complaint";
  }

  // Ctrl+Shift+L / Cmd+Shift+L toggles dark/light theme
  if (hasMod && event.shiftKey && !event.altKey && lowerKey === "l") {
    return "toggle-theme";
  }

  // Non-modifier shortcuts are ignored while typing in form inputs
  if (editable || hasMod || event.altKey) {
    return null;
  }

  if (key === "?") {
    return "show-shortcuts";
  }

  if (key === "/") {
    return "focus-page-search";
  }

  return null;
}

/**
 * Matches the second key of a "G + <key>" navigation chord for the given role.
 */
export function matchChordShortcut(secondKey, role = "user") {
  const lower = String(secondKey || "").toLowerCase();
  const commands = getShortcutsForRole(role);
  return (
    commands.find(
      (cmd) => cmd.chord === lower || (cmd.altChord && cmd.altChord === lower)
    ) || null
  );
}
