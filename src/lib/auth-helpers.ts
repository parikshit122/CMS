export type SupportedSocialProvider =
  | "google"
  | "github"
  | "twitter"
  | "facebook"
  | "apple"
  | "microsoft"
  | "social";

export interface PasswordPolicy {
  passwordMinLength?: number;
  passwordRequireUppercase?: boolean;
  passwordRequireNumber?: boolean;
  passwordRequireSpecial?: boolean;
}

const PROVIDER_MAP: Record<string, SupportedSocialProvider> = {
  "google.com": "google",
  google: "google",
  "github.com": "github",
  github: "github",
  "twitter.com": "twitter",
  twitter: "twitter",
  "facebook.com": "facebook",
  facebook: "facebook",
  "apple.com": "apple",
  apple: "apple",
  "microsoft.com": "microsoft",
  microsoft: "microsoft",
};

/**
 * Normalizes a Firebase token's `firebase.sign_in_provider` claim into a known provider slug.
 * Never falls back to untrusted client-submitted provider names.
 */
export function normalizeSocialProvider(
  signInProvider?: unknown
): SupportedSocialProvider {
  if (typeof signInProvider !== "string") return "social";
  const key = signInProvider.trim().toLowerCase();
  return PROVIDER_MAP[key] || "social";
}

/**
 * Only allows valid HTTPS avatar URLs (prevents javascript:, data:, or malformed URLs).
 */
export function sanitizeAvatarUrl(url?: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 500) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

/**
 * Guards against linking an unverified social identity onto an existing account.
 * Returning users who already share the exact Firebase UID are always allowed.
 */
export function canLinkSocialAccount(params: {
  existingUid?: string | null;
  incomingUid: string;
  emailVerified: boolean;
}): { allowed: boolean; reason?: string } {
  if (params.existingUid && params.existingUid === params.incomingUid) {
    return { allowed: true };
  }

  if (!params.emailVerified) {
    return {
      allowed: false,
      reason:
        "Your social account email is not verified. Please verify your email with the provider or log in with your email and password.",
    };
  }

  return { allowed: true };
}

/**
 * Validates a plain password against admin-configured security settings.
 */
export function validatePasswordAgainstPolicy(
  password: unknown,
  policy: PasswordPolicy = {}
): { valid: boolean; message?: string } {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, message: "Password is required." };
  }

  const minLength =
    typeof policy.passwordMinLength === "number" && policy.passwordMinLength >= 6
      ? policy.passwordMinLength
      : 8;
  const requireUppercase = policy.passwordRequireUppercase ?? true;
  const requireNumber = policy.passwordRequireNumber ?? true;
  const requireSpecial = policy.passwordRequireSpecial ?? true;

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters long.`,
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message: "Password must not exceed 128 characters.",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter.",
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter.",
    };
  }

  if (requireNumber && !/\d/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number.",
    };
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one special character.",
    };
  }

  return { valid: true };
}

/**
 * Returns true only when email notifications are enabled in settings AND Brevo credentials exist.
 */
export function isEmailServiceReady(
  settings?: { emailEnabled?: boolean } | null,
  env: Record<string, string | undefined> = process.env
): boolean {
  return Boolean(
    settings?.emailEnabled &&
      env?.BREVO_API_KEY &&
      env?.BREVO_API_KEY.trim() &&
      env?.EMAIL_FROM &&
      env?.EMAIL_FROM.trim()
  );
}
