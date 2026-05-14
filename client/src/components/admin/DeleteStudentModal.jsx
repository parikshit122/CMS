import { useEffect, useState } from "react";
import API from "../../services/api";
import "../../styles/ManageUsers.css";
import "boxicons/css/boxicons.min.css";

export default function DeleteStudentModal({ student, onClose, onConfirm }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const res = await API.get(
        `/admin/users/students/${student._id}/delete-preview`,
      );
      if (res.data.success) {
        setPreview(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    try {
      await onConfirm(student._id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="delete-overlay" onClick={onClose}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <i className="bx bx-trash" />
          </div>
          <h2>Delete Student Account</h2>
          <p>This action is permanent and cannot be undone.</p>
        </div>

        <div className="delete-modal-body">
          <div className="delete-student-info">
            <div className="delete-student-avatar">
              {student.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4>{student.name}</h4>
              <p>{student.email}</p>
            </div>
          </div>

          {loading ? (
            <div className="delete-loading">
              <i className="bx bx-loader-alt bx-spin" />
              <p>Calculating impact...</p>
            </div>
          ) : preview ? (
            <>
              <div className="delete-impact">
                <h5>This will permanently delete:</h5>
                <ul>
                  <li>
                    <i className="bx bx-user-x" />
                    <span>The user account</span>
                    <strong>1</strong>
                  </li>
                  <li>
                    <i className="bx bx-file" />
                    <span>Complaints submitted by this student</span>
                    <strong>{preview.complaints}</strong>
                  </li>
                  <li>
                    <i className="bx bx-bell" />
                    <span>Notifications received by this student</span>
                    <strong>{preview.notificationsReceived}</strong>
                  </li>
                  <li>
                    <i className="bx bx-send" />
                    <span>Notifications sent by this student</span>
                    <strong>{preview.notificationsSent}</strong>
                  </li>
                </ul>
                <div className="delete-impact-total">
                  <span>Total records to be removed</span>
                  <strong>{preview.total}</strong>
                </div>
              </div>

              <div className="delete-warning">
                <i className="bx bx-info-circle" />
                <div>
                  <strong>After deletion:</strong>
                  <ul>
                    <li>The student must register again to use the system</li>
                    <li>Social login with the same email will be rejected</li>
                    <li>All their data will be unrecoverable</li>
                  </ul>
                </div>
              </div>

              <div className="delete-confirm-input">
                <label>
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  autoFocus
                  className={isConfirmed ? "confirmed" : ""}
                />
              </div>
            </>
          ) : (
            <p className="delete-error">Failed to load impact preview.</p>
          )}
        </div>

        <div className="delete-modal-actions">
          <button
            className="delete-btn-cancel"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="delete-btn-confirm"
            onClick={handleDelete}
            disabled={!isConfirmed || deleting || loading}
          >
            {deleting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Deleting...
              </>
            ) : (
              <>
                <i className="bx bx-trash" />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}