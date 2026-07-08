const DISPOSABLE_DOMAINS = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "throwaway.email",
  "trashmail.com",
  "yopmail.com",
  "temp-mail.org",
  "getnada.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "spam4.me",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "mailnesia.com",
  "mytemp.email",
  "throwawaymail.com",
  "tempinbox.com",
  "temporarymail.com",
  "0-mail.com",
  "1secmail.com",
  "burnermail.io",
  "getairmail.com",
  "harakirimail.com",
  "mailcatch.com",
  "maildrop.cc",
  "mintemail.com",
  "moakt.com",
  "nowmymail.com",
  "objectmail.com",
  "spamgourmet.com",
  "trbvm.com",
  "wegwerfmail.de",
  "zetmail.com",
];

const SUSPICIOUS_PATTERNS = [
  /^test/i,
  /^demo/i,
  /^fake/i,
  /^sample/i,
  /^example/i,
  /^admin@admin\./i,
  /^user@user\./i,
  /^dummy/i,
  /^abc123/i,
  /^xxx/i,
  /^qwerty/i,
  /^asdf/i,
];

const SUSPICIOUS_DOMAINS = [
  "test.com",
  "example.com",
  "sample.com",
  "demo.com",
  "fake.com",
  "admin.com",
  "user.com",
  "dummy.com",
  "abc.com",
  "xyz.com",
  "invalid.com",
  "staff.com",
];

const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "Email is required" };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Basic format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { valid: false, reason: "Invalid email format" };
  }

  const [localPart, domain] = normalizedEmail.split("@");

  // Local part must be at least 3 characters
  if (localPart.length < 3) {
    return {
      valid: false,
      reason: "Email username must be at least 3 characters",
    };
  }

  // Local part max length
  if (localPart.length > 64) {
    return { valid: false, reason: "Email username is too long" };
  }

  // Check disposable domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return {
      valid: false,
      reason: "Disposable email addresses are not allowed",
    };
  }

  // Check suspicious/fake domains
  if (SUSPICIOUS_DOMAINS.includes(domain)) {
    return {
      valid: false,
      reason: "Please use a real email address (Gmail, Outlook, etc.)",
    };
  }

  // Check suspicious patterns in local part
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(localPart)) {
      return {
        valid: false,
        reason: "This email pattern is not allowed. Use your real email.",
      };
    }
  }

  // Reject purely numeric local part (like 123@gmail.com)
  if (/^\d+$/.test(localPart)) {
    return {
      valid: false,
      reason: "Email cannot be only numbers",
    };
  }

  // Reject if local part is too repetitive (aaa@, xxx@, etc.)
  if (/^(.)\1{2,}$/.test(localPart)) {
    return {
      valid: false,
      reason: "Please enter a valid email address",
    };
  }

  return { valid: true, email: normalizedEmail };
};

const isCommonEmailProvider = (email) => {
  const commonProviders = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "protonmail.com",
    "aol.com",
    "zoho.com",
    "mail.com",
    "yandex.com",
    "gmx.com",
    "live.com",
  ];
  const domain = email.split("@")[1]?.toLowerCase();
  return commonProviders.includes(domain);
};

module.exports = {
  validateEmail,
  isCommonEmailProvider,
  DISPOSABLE_DOMAINS,
  SUSPICIOUS_DOMAINS,
};
