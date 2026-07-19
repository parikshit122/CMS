/**
 * Generic accessible Modal component.
 * Renders children in an overlay portal, traps focus, and closes on
 * Escape key press or clicking the backdrop.
 */
import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * @param {boolean}  isOpen    - Controls visibility
 * @param {function} onClose   - Called when the modal should close
 * @param {string}   title     - Modal heading text
 * @param {ReactNode} children - Modal body content
 * @param {string}   className - Extra CSS classes on the dialog
 */
const Modal = ({ isOpen, onClose, title, children, className = '' }) => {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className="modal-header">
            <h2 id="modal-title" className="modal-title">
              {title}
            </h2>
            <button
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
