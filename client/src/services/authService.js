import API from "./api";

// ✅ Register
export const registerUser = async (userData) => {
  const response = await API.post("/auth/register", userData);
  return response.data;
};

// ✅ Login
export const loginUser = async (credentials) => {
  const response = await API.post("/auth/login", credentials);
  return response.data;
};

// ✅ Get Current User
export const getMe = async () => {
  const response = await API.get("/auth/me");
  return response.data;
};

// ✅ Logout
export const logoutUser = async () => {
  try {
    const response = await API.post("/auth/logout");
    return response.data;
  } catch (err) {
    throw err;
  }
};

// ══════════════════════════════════════════
// ✅ EMAIL VERIFICATION (NEW - was missing)
// ══════════════════════════════════════════

export const verifyEmailOTP = async (email, otp) => {
  try {
    const response = await API.post("/auth/verify-email", { email, otp });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const resendEmailVerificationOTP = async (email) => {
  try {
    const response = await API.post("/auth/resend-verification", { email });
    return response.data;
  } catch (err) {
    throw err;
  }
};

// ══════════════════════════════════════════
// ✅ PASSWORD RESET (already existed)
// ══════════════════════════════════════════

export const requestPasswordReset = async (email) => {
  try {
    const response = await API.post("/auth/forgot-password", { email });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const verifyResetOTP = async (email, otp) => {
  try {
    const response = await API.post("/auth/verify-otp", { email, otp });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const resetUserPassword = async (
  email,
  resetToken,
  newPassword,
  confirmPassword,
) => {
  try {
    const response = await API.post("/auth/reset-password", {
      email,
      resetToken,
      newPassword,
      confirmPassword,
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};