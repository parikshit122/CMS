import { lazy } from "react";

const RELOAD_GUARD_KEY = "cms_chunk_reload_ts";
const RELOAD_COOLDOWN_MS = 15000;

export function isChunkLoadError(error) {
  const msg = String(error?.message || error || "");
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("error loading dynamically imported module")
  );
}

/**
 * Triggers a single safe hard reload (with cooldown guard) when a browser tab
 * holds an older index.html referencing replaced Vite chunk hashes.
 */
export function recoverFromStaleChunk() {
  if (typeof window === "undefined") return false;
  try {
    const lastReload = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable in restricted contexts — still attempt reload
  }

  const doReload = () => window.location.reload();
  const cleanupTasks = [];

  if ("serviceWorker" in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => {})
    );
  }
  if ("caches" in window) {
    cleanupTasks.push(
      window.caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => window.caches.delete(k))))
        .catch(() => {})
    );
  }

  if (cleanupTasks.length > 0) {
    Promise.all(cleanupTasks).finally(doReload);
  } else {
    doReload();
  }
  return true;
}

/**
 * Drop-in replacement for React.lazy that automatically recovers once from
 * stale dynamic-import chunk errors after a fresh production build/deployment.
 */
export default function lazyWithRetry(importer) {
  return lazy(() =>
    importer().catch((err) => {
      if (isChunkLoadError(err) && recoverFromStaleChunk()) {
        // Keep Suspense fallback visible while the browser reloads fresh assets
        return new Promise(() => {});
      }
      throw err;
    })
  );
}
