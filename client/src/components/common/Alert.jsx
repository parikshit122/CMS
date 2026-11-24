import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import toast from "../../utils/toastStore";
import "../../styles/Alert.css";
import "boxicons/css/boxicons.min.css";

const TOAST_ICONS = {
  success: "bx bx-check-circle",
  error: "bx bx-error-circle",
  warning: "bx bx-error",
  info: "bx bx-info-circle",
};

const EXIT_DURATION_MS = 200;

const AlertContext = createContext(null);

const ToastItem = ({ item, onDismiss }) => {
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(item.duration);
  const startedAtRef = useRef(Date.now());
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const closedRef = useRef(false);

  const triggerClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    clearTimeout(timerRef.current);
    setClosing(true);
    exitTimerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, EXIT_DURATION_MS);
  }, [item.id, onDismiss]);

  const scheduleTimer = useCallback(() => {
    if (item.duration <= 0 || closedRef.current) return;
    clearTimeout(timerRef.current);
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(triggerClose, Math.max(0, remainingRef.current));
  }, [item.duration, triggerClose]);

  useEffect(() => {
    remainingRef.current = item.duration;
    closedRef.current = false;
    setClosing(false);
    if (item.duration > 0) {
      scheduleTimer();
    }
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(exitTimerRef.current);
    };
  }, [item.id, item.createdAt, item.duration, scheduleTimer]);

  const handlePause = () => {
    if (item.duration <= 0 || closedRef.current || paused) return;
    clearTimeout(timerRef.current);
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    setPaused(true);
  };

  const handleResume = () => {
    if (item.duration <= 0 || closedRef.current || !paused) return;
    setPaused(false);
    scheduleTimer();
  };

  const handleActionClick = () => {
    if (item.action?.onClick) {
      item.action.onClick();
    }
    triggerClose();
  };

  const isUrgent = item.type === "error" || item.type === "warning";

  return (
    <div
      role={isUrgent ? "alert" : "status"}
      aria-live={isUrgent ? "assertive" : "polite"}
      aria-atomic="true"
      data-testid="global-toast-item"
      data-toast-type={item.type}
      className={`cs-toast cs-toast--${item.type} ${closing ? "is-closing" : "is-entering"} ${
        paused ? "is-paused" : ""
      }`}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocus={handlePause}
      onBlur={handleResume}
    >
      <div className="cs-toast__icon" aria-hidden="true">
        <i className={TOAST_ICONS[item.type] || TOAST_ICONS.info} />
      </div>

      <div className="cs-toast__body">
        <div className="cs-toast__title">{item.title}</div>
        <div className="cs-toast__message">{item.message}</div>
        {item.action && (
          <button
            type="button"
            className="cs-toast__action"
            onClick={handleActionClick}
          >
            {item.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        className="cs-toast__close"
        onClick={triggerClose}
        aria-label="Dismiss notification"
      >
        <i className="bx bx-x" aria-hidden="true" />
      </button>

      {item.duration > 0 && (
        <div
          key={`${item.id}-${item.createdAt}`}
          className="cs-toast__progress"
          style={{ animationDuration: `${item.duration}ms` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const items = useSyncExternalStore(
    toast.subscribe,
    toast.getSnapshot,
    toast.getSnapshot
  );

  useEffect(() => {
    if (items.length === 0) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && items[0]) {
        toast.dismiss(items[0].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items]);

  const api = useMemo(
    () => ({
      show: toast.show,
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      dismiss: toast.dismiss,
      clear: toast.clear,
      promise: toast.promise,
    }),
    []
  );

  return (
    <AlertContext.Provider value={api}>
      {children}

      {typeof document !== "undefined" &&
        createPortal(
          <section
            className="cs-toast-region"
            aria-label="Notifications"
            data-testid="global-toast-region"
          >
            {items.map((item) => (
              <ToastItem key={item.id} item={item} onDismiss={toast.dismiss} />
            ))}
          </section>,
          document.body
        )}
    </AlertContext.Provider>
  );
};

export const AlertProvider = ToastProvider;

export const useToast = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useToast must be used within <ToastProvider> / <AlertProvider>");
  }
  return context;
};

export const useAlert = useToast;
export { toast };