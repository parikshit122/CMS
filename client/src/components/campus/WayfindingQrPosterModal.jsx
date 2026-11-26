import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildWayfindingQrUrl } from "../../utils/qrNavigation";

/**
 * Generates a high-contrast scannable Wayfinding QR modal for any campus node
 * so judges can scan straight off the screen with their phone or download a
 * ready-to-print A5 wall poster PNG without leaving the app.
 */
export default function WayfindingQrPosterModal({
  isOpen,
  onClose,
  node,
  floorLabel = "",
  institutionName = "Smart Campus Navigator",
  onSimulateScan,
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState(false);

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://campus.local";

  const deepLinkUrl = buildWayfindingQrUrl(origin, node);
  const spotLabel = node?.displayQrSpotCode || node?.qrSpotCode || node?.code || "";

  useEffect(() => {
    if (!isOpen || !node) return undefined;
    let active = true;

    QRCode.toDataURL(deepLinkUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });

    return () => {
      active = false;
    };
  }, [isOpen, node, deepLinkUrl]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(deepLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !node) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `campus-qr-${(spotLabel || node.code || node.id).toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPosterPng = async () => {
    if (!qrDataUrl || !node) return;
    setDownloadingPoster(true);
    try {
      const qrImg = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = qrDataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 840;
      canvas.height = 1120;
      const ctx = canvas.getContext("2d");

      // Clean high-contrast A5 poster layout
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header bar
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, 168);

      ctx.fillStyle = "#fb923c";
      ctx.font = "700 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("INDOOR WAYFINDING & YOU-ARE-HERE QR ANCHOR", canvas.width / 2, 62);

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 34px system-ui, sans-serif";
      ctx.fillText(institutionName.slice(0, 38), canvas.width / 2, 118);

      // Location title
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 32px system-ui, sans-serif";
      ctx.fillText(String(node.label || node.code).slice(0, 40), canvas.width / 2, 240);

      ctx.fillStyle = "#475569";
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(
        `${floorLabel || "Campus Map"}  ·  Anchor: ${spotLabel}`,
        canvas.width / 2,
        282
      );

      // QR frame
      const qrSize = 480;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 330;
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 8;
      ctx.strokeRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Scan instructions
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.fillText("Scan with any phone camera or in-app QR scanner", canvas.width / 2, 886);

      ctx.fillStyle = "#475569";
      ctx.font = "500 20px system-ui, sans-serif";
      ctx.fillText(
        "Locks your indoor location automatically — zero Bluetooth beacons required.",
        canvas.width / 2,
        926
      );
      ctx.fillText(
        "Supports multi-floor Dijkstra routing & Divyangjan wheelchair-accessible paths.",
        canvas.width / 2,
        960
      );

      // Footer strip
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(48, 1004, canvas.width - 96, 72);
      ctx.fillStyle = "#0f172a";
      ctx.font = "600 17px monospace";
      ctx.fillText(deepLinkUrl.slice(0, 68), canvas.width / 2, 1047);

      const posterUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = posterUrl;
      link.download = `wayfinding-poster-${(spotLabel || node.code || node.id).toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingPoster(false);
    }
  };

  if (!isOpen || !node) return null;

  return (
    <div
      className="cn-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="cn-modal cn-modal--poster"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cn-qr-poster-title"
      >
        <div className="cn-modal__header">
          <div>
            <p className="cn-modal__kicker">Scannable Indoor Wayfinding Anchor</p>
            <h2 id="cn-qr-poster-title" className="cn-modal__title">
              {node.label}
            </h2>
          </div>
          <button
            type="button"
            className="cn-modal__close"
            onClick={onClose}
            aria-label="Close wayfinding QR poster"
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </div>

        <div className="cn-modal__body">
          <div className="cn-poster-card">
            <div className="cn-poster-card__meta">
              <span className="av-mono" style={{ fontWeight: 700, color: "#ea580c" }}>
                {spotLabel}
              </span>
              {floorLabel && <span> · {floorLabel}</span>}
            </div>

            <div className="cn-poster-card__qr">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Wayfinding QR code for ${node.label}`}
                  width={220}
                  height={220}
                />
              ) : (
                <div style={{ padding: "48px 0", color: "#64748b" }}>Generating QR...</div>
              )}
            </div>

            <p className="cn-poster-card__caption">
              Scan this code with any smartphone camera to immediately open the Campus Navigator locked at{" "}
              <strong>{node.label}</strong>.
            </p>

            <div className="cn-poster-card__url">
              <code>{deepLinkUrl}</code>
              <button
                type="button"
                className="cn-poster-copy-btn"
                onClick={handleCopyUrl}
              >
                <i className={`bx ${copied ? "bx-check" : "bx-copy"}`} aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="cn-poster-actions">
            <button
              type="button"
              className="av-btn av-btn--primary av-btn--compact"
              onClick={() => {
                if (onSimulateScan) onSimulateScan(node);
                onClose();
              }}
            >
              <i className="bx bx-current-location" aria-hidden="true" />
              Lock as "You Are Here"
            </button>
            <button
              type="button"
              className="av-btn av-btn--secondary av-btn--compact"
              onClick={handleDownloadPosterPng}
              disabled={!qrDataUrl || downloadingPoster}
            >
              <i className="bx bx-printer" aria-hidden="true" />
              {downloadingPoster ? "Preparing..." : "Download Wall Poster"}
            </button>
            <button
              type="button"
              className="av-btn av-btn--ghost av-btn--compact"
              onClick={handleDownloadQrPng}
              disabled={!qrDataUrl}
            >
              <i className="bx bx-download" aria-hidden="true" />
              Save QR PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
