export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROVIDER_DISPLAY_NAMES = {
  google: "Google",
  github: "GitHub",
  twitter: "Twitter",
  facebook: "Facebook",
};

export const getRoleRedirect = (role) => {
  const r = role?.toLowerCase();
  if (r === "admin") return "/admin";
  if (r === "staff") return "/staff";
  return "/dashboard";
};

export const sanitizeInput = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[<>]/g, "");
};

export const validateLoginInput = ({ email, password }) => {
  const cleanEmail = sanitizeInput(email).toLowerCase();

  if (!cleanEmail) {
    return { valid: false, error: "Please enter your email address." };
  }

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  if (!password) {
    return { valid: false, error: "Please enter your password." };
  }

  return {
    valid: true,
    sanitized: {
      email: cleanEmail,
      password,
    },
  };
};

export const validateRegisterInput = ({ name, email, phone, password }) => {
  const cleanName = sanitizeInput(name);
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanPhone = sanitizeInput(phone).replace(/\D/g, "");

  if (!cleanName || cleanName.length < 3) {
    return { valid: false, error: "Name must be at least 3 characters long." };
  }

  if (cleanName.length > 50) {
    return { valid: false, error: "Name must be 50 characters or fewer." };
  }

  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  if (!cleanPhone || !/^[0-9]{10}$/.test(cleanPhone)) {
    return { valid: false, error: "Phone number must be exactly 10 digits." };
  }

  if (!password) {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password must not exceed 128 characters." };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter.",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter.",
    };
  }

  if (!/\d/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number.",
    };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one special character.",
    };
  }

  return {
    valid: true,
    sanitized: {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password,
    },
  };
};

/**
 * Translates Firebase popup / backend social login errors into clear user-facing copy.
 * Returns null when the user intentionally closed or cancelled the popup.
 */
export const getSocialAuthErrorMessage = (err, providerName = "google", attemptedEmail = "") => {
  const code = err?.code;
  const label = PROVIDER_DISPLAY_NAMES[providerName] || "Social";

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return null;
  }

  if (code === "auth/popup-blocked") {
    return "Popup blocked by your browser. Please allow popups for this site and try again.";
  }

  if (code === "auth/operation-not-allowed") {
    return `${label} sign-in is not enabled yet. Please use Google or email and password.`;
  }

  if (code === "auth/account-exists-with-different-credential") {
    return "An account already exists with this email using a different sign-in provider. Please use your original sign-in method.";
  }

  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized for social sign-in yet. Please use email and password or add this domain in Firebase Authentication settings.";
  }

  if (
    code === "auth/network-request-failed" ||
    code === "ERR_NETWORK" ||
    err?.message === "Network Error"
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.message;

  if (status === 404 && attemptedEmail) {
    return `${attemptedEmail} is not registered. Please register first.`;
  }

  return serverMessage || "Social login failed. Please try again.";
};
