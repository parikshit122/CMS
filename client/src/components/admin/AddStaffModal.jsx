import React, { useState } from "react";

const CATEGORIES = [
  "infrastructure",
  "cleanliness",
  "electrical",
  "plumbing",
  "safety",
  "it",
  "academic",
  "other",
];

const AddStaffModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    passwordMode: "auto",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [step, setStep] = useState("form");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    form.name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.category &&
    (form.passwordMode === "auto" || form.password.length >= 6);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      const result = await onSubmit(form);
      if (result?.password) {
        setGeneratedPassword(result.password);
        setStep("success");
      } else {
        onClose();
      }
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="bx bx-user-plus"></i>
            {step === "form" ? "Add New Staff" : "Staff Created"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="bx bx-x"></i>
          </button>
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="modal-body">
            <div className="form-row">
              <label>Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-row">
              <label>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="john@staff.com"
                required
              />
            </div>

            <div className="form-row">
              <label>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  update("phone", value);
                }}
                placeholder="Enter 10-digit number"
                maxLength="10"
                required
              />
            </div>

            <div className="form-row">
              <label>Specialization Category *</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                required
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>Password Mode</label>
              <div className="form-toggle">
                <button
                  type="button"
                  className={`form-toggle-btn ${form.passwordMode === "auto" ? "active" : ""}`}
                  onClick={() => update("passwordMode", "auto")}
                >
                  <i className="bx bx-bot"></i>
                  Auto Generate
                </button>
                <button
                  type="button"
                  className={`form-toggle-btn ${form.passwordMode === "manual" ? "active" : ""}`}
                  onClick={() => update("passwordMode", "manual")}
                >
                  <i className="bx bx-edit"></i>
                  Manual
                </button>
              </div>
            </div>

            {form.passwordMode === "manual" && (
              <div className="form-row">
                <label>Password * (min 6 characters)</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="users-btn users-btn--outline"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="users-btn users-btn--primary"
                disabled={!isValid || submitting}
              >
                {submitting ? "Creating..." : "Create Staff"}
              </button>
            </div>
          </form>
        ) : (
          <div className="modal-body">
            <div className="success-box">
              <div className="success-icon">
                <i className="bx bx-check-circle"></i>
              </div>
              <h4>Staff account created!</h4>
              <p>Share these credentials with the staff member:</p>

              <div className="cred-box">
                <div className="cred-row">
                  <span>Email:</span>
                  <strong>{form.email}</strong>
                </div>
                <div className="cred-row">
                  <span>Password:</span>
                  <div className="cred-password">
                    <code>{generatedPassword}</code>
                    <button onClick={copyPassword} title="Copy">
                      <i className="bx bx-copy"></i>
                    </button>
                  </div>
                </div>
              </div>

              <p className="success-note">
                <i className="bx bx-info-circle"></i>
                Email with credentials has been sent (if email is configured).
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="users-btn users-btn--primary"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddStaffModal;