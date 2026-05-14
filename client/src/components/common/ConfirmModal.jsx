import React from "react";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "default",
  icon,
  loading = false,
  confirmDisabled = false,
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    default: { color: "#6366f1", bg: "#eef2ff", iconName: "bx-info-circle" },
    danger:  { color: "#ef4444", bg: "#fef2f2", iconName: "bx-error-circle" },
    warning: { color: "#f59e0b", bg: "#fffbeb", iconName: "bx-error"        },
    success: { color: "#10b981", bg: "#ecfdf5", iconName: "bx-check-circle" },
  };

  const config    = typeConfig[type] || typeConfig.default;
  const finalIcon = icon || config.iconName;

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="confirm-icon"
          style={{ background: config.bg, color: config.color }}
        >
          <i className={`bx ${finalIcon}`}></i>
        </div>

        <h3 className="confirm-title">{title}</h3>

        <div className="confirm-message">{message}</div>

        <div className="confirm-actions">
          <button
            className="confirm-btn confirm-btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-btn confirm-btn--${type}`}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            style={{
              background: loading || confirmDisabled ? "#9ca3af" : config.color,
              cursor: loading || confirmDisabled ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <>
                <span className="confirm-spinner"></span>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;