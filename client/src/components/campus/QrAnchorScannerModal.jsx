import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { resolveQrAnchorNode } from "../../utils/qrNavigation";

/**
 * In-App Campus QR Anchor Scanner Modal
 * Supports live camera scanning (rear camera preferred), QR image upload decoding,
 * and manual QR URL/spot-code entry so indoor positioning works reliably in any setting.
 */
export default function QrAnchorScannerModal({
  isOpen,
  onClose,
  nodes = [],
  qrAnchors = [],
  onAnchorResolved,
}) {
  const [mode, setMode] = useState("camera"); // "camera" | "upload" | "manual"
  const [cameraStatus, setCameraStatus] = useState("idle"); // "idle" | "starting" | "active" | "error"
  const [cameraError, setCameraError] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [decodingImage, setDecodingImage] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus("idle");
  }, []);

  const handleDecodedPayload = useCallback(
    (rawText, sourceLabel) => {
      const result = resolveQrAnchorNode(rawText, nodes);
      if (result.matched && result.node) {
        stopCamera();
        setFeedbackError("");
        onAnchorResolved(result.node, {
          source: sourceLabel,
          matchedBy: result.matchedBy,
          raw: rawText,
        });
        onClose();
        return true;
      }
      setFeedbackError(result.reason || "QR code did not match a location on this campus map.");
      return false;
    },
    [nodes, onAnchorResolved, onClose, stopCamera]
  );

  // Manage live camera stream when modal is open in "camera" mode
  useEffect(() => {
    if (!isOpen || mode !== "camera") {
      stopCamera();
      return undefined;
    }

    let cancelled = false;

    const startCamera = async () => {
      setCameraError("");
      setFeedbackError("");

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraStatus("error");
        setCameraError(
          "Live camera access is unavailable in this browser context. Use Upload QR Image or Enter Code below."
        );
        return;
      }

      try {
        setCameraStatus("starting");
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch {
          // Fallback to any available webcam (laptops / desktops)
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();

        if (cancelled) return;
        setCameraStatus("active");

        const scanFrame = () => {
          if (cancelled || !videoRef.current || !canvasRef.current) return;
          const v = videoRef.current;
          if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
            const canvas = canvasRef.current;
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });
              if (decoded?.data) {
                const ok = handleDecodedPayload(decoded.data, "Live Camera QR Scan");
                if (ok) return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        if (cancelled) return;
        setCameraStatus("error");
        const msg =
          err?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access or use Upload QR Image / Enter Code."
            : err?.name === "NotFoundError"
              ? "No camera detected on this device. Use Upload QR Image or Enter Code."
              : "Could not start camera preview. Use Upload QR Image or Enter Code below.";
        setCameraError(msg);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, mode, handleDecodedPayload, stopCamera]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        stopCamera();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, stopCamera]);

  // Reset transient errors when reopening
  useEffect(() => {
    if (isOpen) {
      setFeedbackError("");
      setManualValue("");
    }
  }, [isOpen]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedbackError("");
    setDecodingImage(true);

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read image file."));
        reader.readAsDataURL(file);
      });

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unsupported image format."));
        image.src = String(dataUrl);
      });

      const canvas = document.createElement("canvas");
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (!decoded?.data) {
        setFeedbackError(
          "No readable QR code was found in that image. Try a clearer photo or paste the spot code manually."
        );
      } else {
        handleDecodedPayload(decoded.data, "QR Image Decode");
      }
    } catch (err) {
      setFeedbackError(err?.message || "Failed to decode QR image.");
    } finally {
      setDecodingImage(false);
      e.target.value = "";
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleDecodedPayload(manualValue, "Manual QR Code Entry");
  };

  if (!isOpen) return null;

  return (
    <div
      className="cn-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div
        className="cn-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cn-qr-scanner-title"
      >
        <div className="cn-modal__header">
          <div>
            <p className="cn-modal__kicker">Zero-Beacon Indoor Localization</p>
            <h2 id="cn-qr-scanner-title" className="cn-modal__title">
              Scan Campus QR Anchor
            </h2>
          </div>
          <button
            type="button"
            className="cn-modal__close"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close QR scanner"
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </div>

        <div className="cn-modal__body">
          {/* Scanner Mode Tabs */}
          <div className="cn-seg cn-modal__tabs" role="tablist" aria-label="QR input method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "camera"}
              className={`cn-seg__btn ${mode === "camera" ? "is-active" : ""}`}
              onClick={() => {
                setFeedbackError("");
                setMode("camera");
              }}
            >
              <i className="bx bx-camera" aria-hidden="true" />
              Live Camera
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "upload"}
              className={`cn-seg__btn ${mode === "upload" ? "is-active" : ""}`}
              onClick={() => {
                setFeedbackError("");
                setMode("upload");
              }}
            >
              <i className="bx bx-image-add" aria-hidden="true" />
              Upload QR Image
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "manual"}
              className={`cn-seg__btn ${mode === "manual" ? "is-active" : ""}`}
              onClick={() => {
                setFeedbackError("");
                setMode("manual");
              }}
            >
              <i className="bx bx-edit-alt" aria-hidden="true" />
              Enter Code / URL
            </button>
          </div>

          {mode === "camera" && (
            <div className="cn-scanner-stage">
              <div className="cn-scanner-viewport">
                <video
                  ref={videoRef}
                  className="cn-scanner-video"
                  muted
                  playsInline
                  aria-label="Live QR scanner camera feed"
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {cameraStatus === "active" && (
                  <div className="cn-scanner-reticle" aria-hidden="true">
                    <span className="cn-scanner-reticle__line" />
                  </div>
                )}

                {cameraStatus !== "active" && (
                  <div className="cn-scanner-fallback">
                    <i
                      className={`bx ${cameraStatus === "error" ? "bx-video-off" : "bx-loader-alt bx-spin"}`}
                      aria-hidden="true"
                    />
                    <p>
                      {cameraStatus === "error"
                        ? cameraError
                        : "Requesting camera access for live QR scanning..."}
                    </p>
                    {cameraStatus === "error" && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                        <button
                          type="button"
                          className="av-btn av-btn--secondary av-btn--compact"
                          onClick={() => setMode("upload")}
                        >
                          Upload QR Image
                        </button>
                        <button
                          type="button"
                          className="av-btn av-btn--primary av-btn--compact"
                          onClick={() => setMode("manual")}
                        >
                          Enter Spot Code
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="cn-modal__hint">
                Point your camera at any printed campus wall QR poster. Your{" "}
                <strong>You Are Here</strong> pin and active floor lock automatically.
              </p>
            </div>
          )}

          {mode === "upload" && (
            <div className="cn-upload-box">
              <i className="bx bx-qr-scan" aria-hidden="true" />
              <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
                Decode a Saved or Photographed Campus QR
              </p>
              <p className="cn-modal__hint" style={{ marginBottom: "14px" }}>
                Upload any PNG or JPG of a campus wayfinding QR poster to test instant client-side decoding without a camera.
              </p>
              <label className="av-btn av-btn--primary av-btn--compact" style={{ cursor: "pointer" }}>
                <i className="bx bx-upload" aria-hidden="true" />
                {decodingImage ? "Decoding QR..." : "Choose QR Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={decodingImage}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}

          {mode === "manual" && (
            <form onSubmit={handleManualSubmit} className="cn-manual-form">
              <div className="cn-field" style={{ marginBottom: "10px" }}>
                <label htmlFor="cn-qr-manual-input">
                  Campus QR Spot Code, Room Code, or Deep-Link URL
                </label>
                <input
                  id="cn-qr-manual-input"
                  type="text"
                  className="cn-input"
                  placeholder="e.g. CAMPUS-CSLAB-02, OUT-GATE, or /campus-map?qr=..."
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="av-btn av-btn--primary av-btn--compact">
                <i className="bx bx-current-location" aria-hidden="true" />
                Lock Position on Map
              </button>
            </form>
          )}

          {feedbackError && (
            <div className="cn-modal__error" role="alert">
              <i className="bx bx-error-circle" aria-hidden="true" />
              <span>{feedbackError}</span>
            </div>
          )}

          {/* Quick Campus QR Anchors Fallback */}
          {qrAnchors.length > 0 && (
            <div className="cn-modal__quick">
              <div className="cn-modal__quick-label">
                Or tap a verified campus QR anchor directly:
              </div>
              <div className="cn-modal__quick-grid">
                {qrAnchors.slice(0, 6).map((anchor) => (
                  <button
                    key={anchor.id}
                    type="button"
                    className="cn-anchor-chip"
                    onClick={() => {
                      stopCamera();
                      onAnchorResolved(anchor, {
                        source: "Quick QR Anchor",
                        matchedBy: "direct_anchor",
                        raw: anchor.displayQrSpotCode || anchor.qrSpotCode || anchor.code,
                      });
                      onClose();
                    }}
                  >
                    <span className="cn-anchor-chip__code">
                      {anchor.displayQrSpotCode || anchor.qrSpotCode || anchor.code}
                    </span>
                    <span className="cn-anchor-chip__name">{anchor.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
