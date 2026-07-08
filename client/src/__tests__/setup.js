import "@testing-library/jest-dom";
import { vi } from "vitest";

// ── Mock localStorage ─────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key)        => store[key] ?? null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ── Mock matchMedia ───────────────────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches:            false,
    media:              query,
    onchange:           null,
    addListener:        vi.fn(),
    removeListener:     vi.fn(),
    addEventListener:   vi.fn(),
    removeEventListener:vi.fn(),
    dispatchEvent:      vi.fn(),
  })),
});

// ── Mock socket.io-client ─────────────────────────────────
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on:         vi.fn(),
    off:        vi.fn(),
    emit:       vi.fn(),
    disconnect: vi.fn(),
    connected:  false,
  })),
}));

// ── Mock API ──────────────────────────────────────────────
vi.mock("../services/api", () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

// ── Silence console errors in tests ──────────────────────
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});