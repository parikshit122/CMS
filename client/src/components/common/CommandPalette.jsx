import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "./Alert";
import {
  OPEN_COMMAND_PALETTE_EVENT,
  OPEN_SHORTCUTS_HELP_EVENT,
  isEditableTarget,
  isMacPlatform,
  formatShortcutKeys,
  getShortcutsForRole,
  filterCommands,
  matchDirectShortcut,
  matchChordShortcut,
} from "../../utils/shortcuts";
import "../../styles/CommandPalette.css";

const CHORD_TIMEOUT_MS = 1500;

const KeycapGroup = ({ keys, mac }) => {
  if (!keys || !keys.length) return null;
  const formatted = formatShortcutKeys(keys, mac);
  const isChord = keys.length === 2 && keys[0] === "G";

  return (
    <span className="cs-kbd-group" aria-hidden="true">
      {formatted.map((label, index) => (
        <React.Fragment key={`${label}-${index}`}>
          {index > 0 && isChord && <span className="cs-kbd-sep">then</span>}
          <kbd className="cs-kbd">{label}</kbd>
        </React.Fragment>
      ))}
    </span>
  );
};

const CommandPalette = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [chordPending, setChordPending] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const chordTimerRef = useRef(null);
  const chordPendingRef = useRef(false);

  const mac = useMemo(() => isMacPlatform(), []);
  const role = user?.role || "user";

  const allCommands = useMemo(() => getShortcutsForRole(role), [role]);
  const paletteCommands = useMemo(
    () => allCommands.filter((c) => c.id !== "open-palette"),
    [allCommands]
  );
  const filteredCommands = useMemo(
    () => filterCommands(paletteCommands, query),
    [paletteCommands, query]
  );

  // Group filtered commands by section preserving order
  const groupedCommands = useMemo(() => {
    const groups = [];
    const indexMap = new Map();
    filteredCommands.forEach((cmd, flatIndex) => {
      if (!indexMap.has(cmd.section)) {
        indexMap.set(cmd.section, groups.length);
        groups.push({ section: cmd.section, items: [] });
      }
      groups[indexMap.get(cmd.section)].items.push({ ...cmd, flatIndex });
    });
    return groups;
  }, [filteredCommands]);

  // Group all shortcuts for the ? Cheat Sheet modal
  const groupedHelp = useMemo(() => {
    const groups = [];
    const indexMap = new Map();
    allCommands.forEach((cmd) => {
      if (!indexMap.has(cmd.section)) {
        indexMap.set(cmd.section, groups.length);
        groups.push({ section: cmd.section, items: [] });
      }
      groups[indexMap.get(cmd.section)].items.push(cmd);
    });
    return groups;
  }, [allCommands]);

  const clearChord = useCallback(() => {
    chordPendingRef.current = false;
    setChordPending(false);
    if (chordTimerRef.current) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  const focusVisiblePageSearch = useCallback(() => {
    const selectors = [
      ".reports-filters__search input",
      ".ssd-table-search input",
      ".users-search input",
      'input[type="search"]',
      'input[placeholder*="Search" i]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        el.focus();
        if (typeof el.select === "function") el.select();
        return true;
      }
    }
    return false;
  }, []);

  const executeCommand = useCallback(
    (command) => {
      if (!command) return;
      setPaletteOpen(false);
      setQuery("");

      if (command.actionType === "navigate" && command.route) {
        if (location.pathname !== command.route) {
          navigate(command.route);
        }
        if (command.id === "new-complaint") {
          toast.info("New complaint form opened", {
            title: "Shortcut",
            duration: 2200,
          });
        }
        return;
      }

      if (command.actionType === "focus-search") {
        const focused = focusVisiblePageSearch();
        if (!focused) {
          toast.info("No search bar on this page — press Ctrl+K to jump anywhere", {
            duration: 2400,
          });
        }
        return;
      }

      if (command.actionType === "toggle-theme") {
        const nextTheme = theme === "dark" ? "light" : "dark";
        toggleTheme();
        toast.info(`Switched to ${nextTheme === "dark" ? "Dark" : "Light"} mode`, {
          duration: 2000,
        });
        return;
      }

      if (command.actionType === "help") {
        setHelpOpen(true);
        return;
      }

      if (command.actionType === "palette") {
        setHelpOpen(false);
        setPaletteOpen(true);
      }
    },
    [focusVisiblePageSearch, location.pathname, navigate, theme, toast, toggleTheme]
  );

  // Close overlays on route change
  useEffect(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
    clearChord();
  }, [location.pathname, clearChord]);

  // Reset active highlight when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, paletteOpen]);

  // Auto-focus search input when palette opens
  useEffect(() => {
    if (paletteOpen) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [paletteOpen]);

  // Keep active item visible inside scrollable listbox
  useEffect(() => {
    if (!paletteOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, paletteOpen]);

  // Listen to custom UI trigger events (from Dynamic Island search/shortcuts buttons)
  useEffect(() => {
    const onOpenPalette = () => {
      if (!user) return;
      setHelpOpen(false);
      setQuery("");
      setPaletteOpen(true);
    };
    const onOpenHelp = () => {
      if (!user) return;
      setPaletteOpen(false);
      setHelpOpen(true);
    };

    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenPalette);
    window.addEventListener(OPEN_SHORTCUTS_HELP_EVENT, onOpenHelp);
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenPalette);
      window.removeEventListener(OPEN_SHORTCUTS_HELP_EVENT, onOpenHelp);
    };
  }, [user]);

  // Global keyboard listener (active for authenticated users)
  useEffect(() => {
    if (!user) return undefined;

    const handleKeyDown = (event) => {
      // Escape closes open overlays first
      if (event.key === "Escape") {
        if (paletteOpen) {
          event.preventDefault();
          setPaletteOpen(false);
          setQuery("");
          return;
        }
        if (helpOpen) {
          event.preventDefault();
          setHelpOpen(false);
          return;
        }
        if (chordPendingRef.current) {
          clearChord();
        }
        return;
      }

      // Direct / modifier shortcuts (Ctrl+K, Ctrl+N, Ctrl+Shift+L, ?, /)
      const directId = matchDirectShortcut(event, role);
      if (directId) {
        if (directId === "open-palette") {
          event.preventDefault();
          clearChord();
          setHelpOpen(false);
          setPaletteOpen((prev) => {
            if (!prev) setQuery("");
            return !prev;
          });
          return;
        }

        if (directId === "show-shortcuts") {
          if (paletteOpen) return;
          event.preventDefault();
          clearChord();
          setHelpOpen((prev) => !prev);
          return;
        }

        if (directId === "focus-page-search") {
          if (paletteOpen || helpOpen) return;
          event.preventDefault();
          clearChord();
          const focused = focusVisiblePageSearch();
          if (!focused) {
            setQuery("");
            setPaletteOpen(true);
          }
          return;
        }

        const matchedCmd = allCommands.find((c) => c.id === directId);
        if (matchedCmd) {
          event.preventDefault();
          clearChord();
          executeCommand(matchedCmd);
        }
        return;
      }

      // Ignore chord keys while overlays are open or typing in an input
      if (
        paletteOpen ||
        helpOpen ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      const lower = String(event.key || "").toLowerCase();

      if (chordPendingRef.current) {
        const chordCmd = matchChordShortcut(lower, role);
        clearChord();
        if (chordCmd) {
          event.preventDefault();
          executeCommand(chordCmd);
        }
        return;
      }

      if (lower === "g") {
        chordPendingRef.current = true;
        setChordPending(true);
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        chordTimerRef.current = setTimeout(() => {
          chordPendingRef.current = false;
          setChordPending(false);
          chordTimerRef.current = null;
        }, CHORD_TIMEOUT_MS);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    user,
    role,
    allCommands,
    paletteOpen,
    helpOpen,
    clearChord,
    executeCommand,
    focusVisiblePageSearch,
  ]);

  useEffect(() => () => clearChord(), [clearChord]);

  const handlePaletteInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!filteredCommands.length) return;
      setActiveIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!filteredCommands.length) return;
      setActiveIndex(
        (prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredCommands[activeIndex];
      if (target) executeCommand(target);
    }
  };

  if (!user) return null;

  return createPortal(
    <>
      {/* Subtle G-chord indicator when waiting for second key */}
      {chordPending && !paletteOpen && !helpOpen && (
        <div className="cs-chord-hint" role="status" aria-live="polite">
          <kbd className="cs-kbd">G</kbd>
          <span>Press D, {role === "admin" ? "R, U, S," : "C,"} L, N, or P</span>
        </div>
      )}

      {/* Command Palette Overlay (Ctrl+K / Cmd+K) */}
      {paletteOpen && (
        <div
          className="cs-cmd-overlay"
          onClick={() => setPaletteOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Quick Search and Command Palette"
        >
          <div
            className="cs-cmd-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-cmd-search-row">
              <i className="bx bx-search cs-cmd-search-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                className="cs-cmd-input"
                placeholder="Search pages, actions, or shortcuts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handlePaletteInputKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls="cs-cmd-listbox"
                aria-autocomplete="list"
              />
              <button
                type="button"
                className="cs-cmd-esc"
                onClick={() => setPaletteOpen(false)}
                aria-label="Close command palette"
              >
                <kbd className="cs-kbd">Esc</kbd>
              </button>
            </div>

            <div
              id="cs-cmd-listbox"
              ref={listRef}
              className="cs-cmd-list"
              role="listbox"
              aria-label="Available commands"
            >
              {groupedCommands.length === 0 ? (
                <div className="cs-cmd-empty">
                  <i className="bx bx-search-alt" aria-hidden="true" />
                  <p>No commands match “{query}”.</p>
                </div>
              ) : (
                groupedCommands.map((group) => (
                  <div key={group.section} className="cs-cmd-group">
                    <div className="cs-cmd-group-title">{group.section}</div>
                    {group.items.map((cmd) => {
                      const isActive = cmd.flatIndex === activeIndex;
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive ? "true" : "false"}
                          className={`cs-cmd-item ${isActive ? "cs-cmd-item--active" : ""}`}
                          onMouseEnter={() => setActiveIndex(cmd.flatIndex)}
                          onClick={() => executeCommand(cmd)}
                        >
                          <span className="cs-cmd-item__icon" aria-hidden="true">
                            <i className={`bx ${cmd.icon}`} />
                          </span>
                          <span className="cs-cmd-item__copy">
                            <span className="cs-cmd-item__label">{cmd.label}</span>
                            <span className="cs-cmd-item__desc">{cmd.description}</span>
                          </span>
                          <KeycapGroup keys={cmd.keys} mac={mac} />
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="cs-cmd-footer">
              <div className="cs-cmd-footer__hints">
                <span>
                  <kbd className="cs-kbd">↑</kbd>
                  <kbd className="cs-kbd">↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="cs-kbd">↵</kbd> Select
                </span>
                <span>
                  <kbd className="cs-kbd">?</kbd> All Shortcuts
                </span>
              </div>
              <span className="cs-cmd-footer__role">
                {role === "admin" ? "Admin" : role === "staff" ? "Staff" : "Student"} mode
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Reference Modal (?) */}
      {helpOpen && (
        <div
          className="cs-cmd-overlay"
          onClick={() => setHelpOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts Reference"
        >
          <div
            className="cs-cmd-dialog cs-cmd-dialog--help"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-help-header">
              <div>
                <h2 className="cs-help-title">Keyboard Shortcuts</h2>
                <p className="cs-help-sub">
                  Navigate ComplaintSync quickly without lifting your hands from the keyboard.
                </p>
              </div>
              <button
                type="button"
                className="cs-help-close"
                onClick={() => setHelpOpen(false)}
                aria-label="Close keyboard shortcuts"
              >
                <i className="bx bx-x" aria-hidden="true" />
              </button>
            </div>

            <div className="cs-help-body">
              {groupedHelp.map((group) => (
                <div key={group.section} className="cs-help-section">
                  <h3 className="cs-cmd-group-title">{group.section}</h3>
                  <ul className="cs-help-list">
                    {group.items.map((cmd) => (
                      <li key={cmd.id} className="cs-help-row">
                        <div className="cs-help-row__info">
                          <span className="cs-help-row__label">{cmd.label}</span>
                          <span className="cs-help-row__desc">{cmd.description}</span>
                        </div>
                        <div className="cs-help-row__keys">
                          <KeycapGroup keys={cmd.keys} mac={mac} />
                          {cmd.altKeys && (
                            <>
                              <span className="cs-kbd-sep">or</span>
                              <KeycapGroup keys={cmd.altKeys} mac={mac} />
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="cs-cmd-footer">
              <span className="cs-cmd-footer__note">
                Single-key shortcuts pause automatically while typing in inputs.
              </span>
              <button
                type="button"
                className="cs-help-done-btn"
                onClick={() => setHelpOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default CommandPalette;
