import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import "../../styles/Alert.css";
import 'boxicons/css/boxicons.min.css';

const icons = {
  success: "bx bx-check-circle",
  error:   "bx bx-x-circle",
  warning: "bx bx-error",
  info:    "bx bx-info-circle",
};

const titles = {
  success: "Success",
  error:   "Error",
  warning: "Warning",
  info:    "Info",
};

const AlertContext = createContext(null);

const Toast = ({ message, type, onClose }) => {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 350);
  }, [onClose]);

  useEffect(() => {
    timerRef.current = setTimeout(handleClose, 3000);
    return () => clearTimeout(timerRef.current);
  }, [handleClose]);

  return (
    <div className={`global-toast-label ${type} ${closing ? "slide-out" : "slide-in"}`}>
      <div className="global-toast-label-icon">
        <i className={icons[type]}></i>
      </div>
      <div className="global-toast-label-body">
        <span className="global-toast-label-title">{titles[type]}</span>
        <span className="global-toast-label-message">{message}</span>
      </div>
      <button className="global-toast-label-close" onClick={handleClose}>
        <i className="bx bx-x"></i>
      </button>
      <div className="global-toast-label-progress" style={{ animationDuration: "3000ms" }} />
    </div>
  );
};

export const AlertProvider = ({ children }) => {
  const [alertData, setAlertData] = useState(null);

  const removeAlert = useCallback(() => setAlertData(null), []);

  const showAlert = useCallback((message, type = "info") => {
    setAlertData({ message, type });
  }, []);

  const alert = {
    show:    (msg, type) => showAlert(msg, type),
    success: (msg)       => showAlert(msg, "success"),
    error:   (msg)       => showAlert(msg, "error"),
    warning: (msg)       => showAlert(msg, "warning"),
    info:    (msg)       => showAlert(msg, "info"),
  };

  return (
    <AlertContext.Provider value={alert}>
      {children}
      {alertData && (
        <div className="global-toast-container">
          <Toast
            message={alertData.message}
            type={alertData.type}
            onClose={removeAlert}
          />
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used within <AlertProvider>");
  return context;
};