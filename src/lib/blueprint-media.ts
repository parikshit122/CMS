/**
 * Pure Blueprint Image Validation Utilities.
 * Enforces strict raster-only blueprint uploads (PNG, JPEG, WebP) with magic-byte verification
 * and safe URL validation to prevent scriptable SVG or unsafe URI injection.
 */

export const MAX_BLUEPRINT_BYTES = 5 * 1024 * 1024; // 5 MB

export type SafeBlueprintMime = "image/png" | "image/jpeg" | "image/webp";

export interface BlueprintValidationResult {
  valid: boolean;
  mime?: SafeBlueprintMime;
  error?: string;
}

/**
 * Inspects leading binary magic bytes to detect true raster image format.
 */
export function detectRasterImageMime(bytes: Uint8Array | Buffer): SafeBlueprintMime | null {
  if (!bytes || bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validates an uploaded blueprint buffer against allowed raster formats, magic bytes, and size limits.
 */
export function validateBlueprintBuffer(
  buffer: Uint8Array | Buffer | null | undefined,
  declaredMime?: string
): BlueprintValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Blueprint image file is empty." };
  }

  if (buffer.length > MAX_BLUEPRINT_BYTES) {
    return {
      valid: false,
      error: "Blueprint image exceeds the 5 MB limit. Please compress or resize before uploading.",
    };
  }

  const normalizedDeclared = String(declaredMime || "").toLowerCase().trim();
  if (normalizedDeclared === "image/svg+xml" || normalizedDeclared.includes("svg")) {
    return {
      valid: false,
      error: "SVG blueprints are blocked for security. Please upload a PNG, JPG, or WebP architectural blueprint.",
    };
  }

  const detected = detectRasterImageMime(buffer);
  if (!detected) {
    return {
      valid: false,
      error: "Unsupported or corrupted blueprint image. Please upload a valid PNG, JPG, or WebP file.",
    };
  }

  if (
    normalizedDeclared &&
    normalizedDeclared !== "application/octet-stream" &&
    normalizedDeclared !== "image/jpg" &&
    normalizedDeclared !== detected
  ) {
    return {
      valid: false,
      error: `Blueprint file contents (${detected}) do not match the declared file type (${normalizedDeclared}).`,
    };
  }

  return { valid: true, mime: detected };
}

/**
 * Validates a fallback blueprint URL (local /maps/ asset, safe https:// URL, or raster data URI).
 */
export function validateBlueprintUrl(rawUrl: string): { valid: boolean; url: string; error?: string } {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) {
    return { valid: true, url: "" };
  }

  // Allow bundled static campus map assets (/maps/...)
  if (trimmed.startsWith("/maps/") && !trimmed.includes("..") && !/[\s"'<>]/.test(trimmed)) {
    return { valid: true, url: trimmed };
  }

  // Allow safe raster data URIs only (never SVG or HTML)
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return { valid: true, url: trimmed };
  }

  // Allow valid HTTPS URLs (e.g., Cloudinary CDN)
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") {
      return { valid: true, url: parsed.toString() };
    }
  } catch {
    // Invalid URL falls through
  }

  return {
    valid: false,
    url: "",
    error: "Blueprint URL must be a valid HTTPS image URL, bundled /maps/ asset, or PNG/JPG/WebP upload.",
  };
}
