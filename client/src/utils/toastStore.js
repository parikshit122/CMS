export const MAX_VISIBLE_TOASTS = 4;
export const DEDUPE_WINDOW_MS = 1200;

export const DEFAULT_DURATIONS = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

export const DEFAULT_TITLES = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Notice",
};

const VALID_TYPES = new Set(["success", "error", "warning", "info"]);

let sequence = 0;

export function normalizeToastType(type) {
  return VALID_TYPES.has(type) ? type : "info";
}

export function createToastRecord(message, typeOrOptions = "info", maybeOptions = {}) {
  let type = "info";
  let options = {};

  if (typeof typeOrOptions === "string") {
    type = normalizeToastType(typeOrOptions);
    options = maybeOptions && typeof maybeOptions === "object" ? maybeOptions : {};
  } else if (typeOrOptions && typeof typeOrOptions === "object") {
    type = normalizeToastType(typeOrOptions.type);
    options = typeOrOptions;
  }

  const text = typeof message === "string" ? message.trim() : String(message ?? "").trim();
  const resolvedDuration =
    typeof options.duration === "number" && options.duration >= 0
      ? options.duration
      : DEFAULT_DURATIONS[type];

  sequence += 1;

  return {
    id: options.id || `toast-${Date.now()}-${sequence}`,
    type,
    title: options.title || DEFAULT_TITLES[type],
    message: text || DEFAULT_TITLES[type],
    duration: resolvedDuration,
    action:
      options.action && typeof options.action.onClick === "function" && options.action.label
        ? { label: String(options.action.label), onClick: options.action.onClick }
        : null,
    createdAt: typeof options.createdAt === "number" ? options.createdAt : Date.now(),
  };
}

export function enqueueToast(
  currentList,
  record,
  maxVisible = MAX_VISIBLE_TOASTS,
  dedupeWindowMs = DEDUPE_WINDOW_MS
) {
  const list = Array.isArray(currentList) ? currentList : [];

  // Deduplicate rapid identical toasts (same type + message within dedupeWindowMs)
  const duplicateIndex = list.findIndex(
    (item) =>
      item.type === record.type &&
      item.message === record.message &&
      record.createdAt - item.createdAt <= dedupeWindowMs
  );

  if (duplicateIndex !== -1) {
    const next = list.slice();
    next[duplicateIndex] = { ...record };
    return next;
  }

  // Replace if explicit matching id already exists
  const existingIdIndex = list.findIndex((item) => item.id === record.id);
  if (existingIdIndex !== -1) {
    const next = list.slice();
    next[existingIdIndex] = record;
    return next;
  }

  // Newest toast at the top; evict oldest beyond maxVisible
  const next = [record, ...list];
  return next.length > maxVisible ? next.slice(0, maxVisible) : next;
}

export function removeToastById(currentList, id) {
  if (!Array.isArray(currentList)) return [];
  return currentList.filter((item) => item.id !== id);
}

// ── Global Pub/Sub Store ──────────────────────────────────
let toasts = [];
const listeners = new Set();

const emitChange = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore subscriber errors
    }
  });
};

const show = (message, typeOrOptions = "info", maybeOptions = {}) => {
  const record = createToastRecord(message, typeOrOptions, maybeOptions);
  toasts = enqueueToast(toasts, record);
  emitChange();
  return record.id;
};

const dismiss = (id) => {
  if (!id) return;
  const next = removeToastById(toasts, id);
  if (next.length !== toasts.length) {
    toasts = next;
    emitChange();
  }
};

const clear = () => {
  if (toasts.length === 0) return;
  toasts = [];
  emitChange();
};

const promiseToast = async (promiseOrFn, messages = {}) => {
  const pendingId = show(messages.loading || "Working...", "info", {
    title: messages.loadingTitle || "Please wait",
    duration: 0,
  });

  try {
    const result = typeof promiseOrFn === "function" ? await promiseOrFn() : await promiseOrFn;
    dismiss(pendingId);
    const successMsg =
      typeof messages.success === "function"
        ? messages.success(result)
        : messages.success || "Action completed successfully.";
    show(successMsg, "success", messages.successOptions);
    return result;
  } catch (err) {
    dismiss(pendingId);
    const errorMsg =
      typeof messages.error === "function"
        ? messages.error(err)
        : messages.error || err?.response?.data?.message || err?.message || "Something went wrong.";
    show(errorMsg, "error", messages.errorOptions);
    throw err;
  }
};

export const toast = {
  show,
  success: (message, options) => show(message, "success", options),
  error: (message, options) => show(message, "error", options),
  warning: (message, options) => show(message, "warning", options),
  info: (message, options) => show(message, "info", options),
  dismiss,
  clear,
  promise: promiseToast,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => toasts,
};

export default toast;
