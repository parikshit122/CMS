import { useState } from "react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

export default function PWAInstallButton({ compact = false }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`av-btn av-btn--ghost ${compact ? "av-btn--compact av-pwa-btn--compact" : ""}`}
        aria-label="Install ComplaintSync app"
        title="Install ComplaintSync as an app"
      >
        <i className="bx bx-download" aria-hidden="true" />
        <span className={compact ? "av-pwa-btn__label" : ""}>
          {compact ? "Install" : "Install App"}
        </span>
      </button>

      {showGuide && (
        <div
          className="av-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={() => setShowGuide(false)}
        >
          <div className="av-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="av-modal-head">
              <h3 id="pwa-guide-title">Install ComplaintSync App</h3>
              <button
                type="button"
                className="av-icon-btn"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
              >
                <i className="bx bx-x" />
              </button>
            </div>

            {isIOS ? (
              <ol className="av-guide-list">
                <li>
                  Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and select <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to launch ComplaintSync in full-screen standalone mode.
                </li>
              </ol>
            ) : (
              <ol className="av-guide-list">
                <li>
                  Open your browser&apos;s address bar or menu and select{" "}
                  <strong>Install ComplaintSync</strong> (or <strong>Add to Home Screen</strong>).
                </li>
                <li>
                  ComplaintSync caches core assets via its Service Worker for instant campus launch even on weak Wi-Fi.
                </li>
              </ol>
            )}

            <div className="av-modal-actions">
              <button
                type="button"
                className="av-btn av-btn--primary"
                onClick={() => setShowGuide(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
