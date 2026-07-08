import { useState, useEffect, useRef } from "react";
import { useAlert } from "../components/common/Alert";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "../styles/Profilepage.css";

// ── Password strength checker ─────────────────────────────
const checkStrength = (pwd) => {
  const checks = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, score: passed };
};

const StrengthBar = ({ password }) => {
  if (!password) return null;
  const { checks, score } = checkStrength(password);

  const colors = ["#ef4444", "#f59e0b", "#f59e0b", "#10b981", "#10b981"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {/* Bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "6px",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i <= score ? colors[score] : "#e2e8f0",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: "0.75rem",
          color: colors[score] || "#94a3b8",
          fontWeight: "600",
          marginBottom: "6px",
        }}
      >
        {labels[score] || ""}
      </div>

      {/* Checklist */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
        }}
      >
        {[
          { key: "length", label: "8+ characters" },
          { key: "uppercase", label: "Uppercase letter" },
          { key: "number", label: "Number" },
          { key: "special", label: "Special character" },
        ].map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.72rem",
              color: checks[key] ? "#10b981" : "#94a3b8",
            }}
          >
            <i
              className={`bx ${checks[key] ? "bx-check-circle" : "bx-circle"}`}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

const Profile = () => {
  const fileInputRef = useRef(null);
  const alert = useAlert();
  const { updateUser } = useAuth();

  // ── Profile state ─────────────────────────────────────
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popupClosed, setPopupClosed] = useState(false);

  // ── Password change state ─────────────────────────────
  const [showPwdSection, setShowPwdSection] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // ── Build form from user object ───────────────────────
  const buildFormData = (u) => {
    const parts = u.name?.trim().split(" ") || [];
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      email: u.email,
      phone: u.phone || "",
      course: u.course || "",
      year: u.year || "",
      bio: u.bio || "",
      avatar: u.avatar || null,
      avatarFile: null,
    };
  };

  // ── Load user from localStorage ───────────────────────
  useEffect(() => {
    const loadUser = () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) {
        setUser(storedUser);
        setFormData(buildFormData(storedUser));
        setOriginalData(buildFormData(storedUser));
      }
    };

    loadUser();
    window.addEventListener("user-updated", loadUser);
    return () => window.removeEventListener("user-updated", loadUser);
  }, []);

  // ── Track dirty state ─────────────────────────────────
  useEffect(() => {
    if (!formData || !originalData) return;
    const cleanForm = { ...formData, avatarFile: undefined, avatar: undefined };
    const cleanOrig = {
      ...originalData,
      avatarFile: undefined,
      avatar: undefined,
    };
    const hasFieldChanges =
      JSON.stringify(cleanForm) !== JSON.stringify(cleanOrig);
    const hasNewAvatar = !!formData.avatarFile;
    setIsDirty(hasFieldChanges || hasNewAvatar);
  }, [formData, originalData]);

  if (!formData || !user) return null;

  // ── Missing fields popup ──────────────────────────────
  const missingFields = [];
  if (!formData.phone) missingFields.push("Phone Number");
  if (user.role === "user") {
    if (!formData.course) missingFields.push("Course");
    if (!formData.year) missingFields.push("Year");
  }
  if (user.role === "staff" && !user.category) {
    missingFields.push("Specialization");
  }

  const showMissingPopup = missingFields.length > 0 && !popupClosed;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = () => {
    setOriginalData(formData);
    setIsEditing(true);
  };
  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  // ── Save profile ──────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      let avatarUrl = formData.avatar;

      // Upload avatar if changed
      if (formData.avatarFile) {
        const uploadForm = new FormData();
        uploadForm.append("avatar", formData.avatarFile);
        const uploadRes = await API.post("/users/upload-avatar", uploadForm);
        if (uploadRes.data.success) {
          avatarUrl = uploadRes.data.avatar;
        } else {
          alert.error("Avatar upload failed");
          return;
        }
      }

      const response = await API.patch("/users/profile", {
        name: fullName,
        phone: formData.phone,
        course: formData.course,
        year: formData.year,
        bio: formData.bio,
      });

      if (!response.data.success) {
        alert.error(response.data.message || "Failed to update profile");
        return;
      }

      const updatedUser = { ...response.data.data, avatar: avatarUrl };
      updateUser(updatedUser);
      setUser(updatedUser);
      setFormData(buildFormData(updatedUser));
      setOriginalData(buildFormData(updatedUser));
      setIsEditing(false);
      alert.success("Profile updated successfully");
    } catch (err) {
      alert.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Save password ─────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = pwdForm;

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert.error("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert.error("New passwords do not match");
      return;
    }

    const { score } = checkStrength(newPassword);
    if (score < 4) {
      alert.error("Password is too weak. Meet all 4 requirements.");
      return;
    }

    setPwdSaving(true);
    try {
      const res = await API.patch("/users/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.data.success) {
        alert.success("Password changed successfully");
        setPwdForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPwdSection(false);
      }
    } catch (err) {
      alert.error(err.response?.data?.message || "Password change failed");
    } finally {
      setPwdSaving(false);
    }
  };

  // ── Avatar upload ─────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert.error("Image must be less than 5MB");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      avatar: URL.createObjectURL(file),
      avatarFile: file,
    }));
  };

  const roleTitle =
    user.role === "admin"
      ? "Admin Profile"
      : user.role === "staff"
        ? "Staff Profile"
        : "Student Profile";

  const isLocalUser = !user.provider || user.provider === "local";

  // ── Render ────────────────────────────────────────────
  return (
    <div className="student-profile-page">
      {/* ── Missing fields popup ── */}
      {showMissingPopup && (
        <div className="profile-missing-overlay">
          <div className="profile-missing-modal">
            <h3>Complete Your Profile</h3>
            <p>The following information is missing:</p>
            <ul>
              {missingFields.map((field, idx) => (
                <li key={idx}>{field}</li>
              ))}
            </ul>
            <p>Please update your profile to continue.</p>
            <div className="profile-missing-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setIsEditing(true);
                  setPopupClosed(true);
                }}
              >
                Edit Profile
              </button>
              <button
                className="btn-cancel"
                onClick={() => setPopupClosed(true)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="profile-header">
        <div>
          <h1>{roleTitle}</h1>
          <p>Manage your account information</p>
        </div>

        {!isEditing ? (
          <button className="btn-primary" onClick={handleEdit}>
            Edit Profile
          </button>
        ) : (
          <div className="action-buttons">
            <button className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={!isDirty || saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* ── Profile card ── */}
      <div className="profile-card">
        {/* Avatar + name */}
        <div className="profile-top">
          <div className="avatar-wrapper">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Profile"
                className="avatar-img"
                key={formData.avatar}
              />
            ) : (
              <div className="avatar-initials">
                {formData.firstName?.[0]}
                {formData.lastName?.[0]}
              </div>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  className="avatar-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="bx bx-camera"></i>
                </button>
                <input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </>
            )}
          </div>

          <div>
            <h2>
              {formData.firstName} {formData.lastName}
            </h2>
            <span className="badge">{user.role.toUpperCase()}</span>
            {user.provider && user.provider !== "local" && (
              <span
                className="badge"
                style={{
                  marginLeft: "8px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  textTransform: "capitalize",
                }}
              >
                <i
                  className={`bx bxl-${user.provider}`}
                  style={{ marginRight: "4px" }}
                />
                {user.provider}
              </span>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="form-grid">
          <div className="form-field">
            <label>First Name</label>
            <input
              disabled={!isEditing}
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Last Name</label>
            <input
              disabled={!isEditing}
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
            />
          </div>

          <div className="form-field full">
            <label>Email</label>
            <input disabled value={formData.email} />
          </div>

          <div className="form-field">
            <label>Phone</label>
            <input
              disabled={!isEditing}
              value={formData.phone}
              maxLength={10}
              onChange={(e) =>
                handleChange("phone", e.target.value.replace(/\D/g, ""))
              }
            />
          </div>

          {user.role === "user" && (
            <>
              <div className="form-field">
                <label>Course</label>
                <input
                  disabled={!isEditing}
                  value={formData.course}
                  onChange={(e) => handleChange("course", e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Year</label>
                <select
                  disabled={!isEditing}
                  value={formData.year}
                  onChange={(e) => handleChange("year", e.target.value)}
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </>
          )}

          {user.role === "staff" && (
            <div className="form-field">
              <label>Specialization</label>
              <input value={user.category || ""} disabled />
            </div>
          )}

          <div className="form-field full">
            <label>Bio</label>
            <textarea
              disabled={!isEditing}
              rows="4"
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Password Change Section (local users only) ── */}
      {isLocalUser && (
        <div className="profile-card" style={{ marginTop: "1.5rem" }}>
          {/* Section header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showPwdSection ? "1.5rem" : "0",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Change Password
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.85rem",
                  color: "#64748b",
                }}
              >
                Update your account password
              </p>
            </div>

            <button
              className={showPwdSection ? "btn-cancel" : "btn-primary"}
              onClick={() => {
                setShowPwdSection((p) => !p);
                setPwdForm({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
            >
              {showPwdSection ? "Cancel" : "Change Password"}
            </button>
          </div>

          {/* Password form */}
          {showPwdSection && (
            <form onSubmit={handlePasswordChange}>
              <div className="form-grid">
                {/* Current password */}
                <div className="form-field full">
                  <label>Current Password</label>
                  <div className="pwd-input-wrap">
                    <input
                      type={showCurrentPwd ? "text" : "password"}
                      value={pwdForm.currentPassword}
                      onChange={(e) =>
                        setPwdForm((p) => ({
                          ...p,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      onClick={() => setShowCurrentPwd((p) => !p)}
                      tabIndex={-1}
                    >
                      <i
                        className={`bx ${showCurrentPwd ? "bx-hide" : "bx-show"}`}
                      />
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="form-field full">
                  <label>New Password</label>
                  <div className="pwd-input-wrap">
                    <input
                      type={showNewPwd ? "text" : "password"}
                      value={pwdForm.newPassword}
                      onChange={(e) =>
                        setPwdForm((p) => ({
                          ...p,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      onClick={() => setShowNewPwd((p) => !p)}
                      tabIndex={-1}
                    >
                      <i
                        className={`bx ${showNewPwd ? "bx-hide" : "bx-show"}`}
                      />
                    </button>
                  </div>

                  {/* Strength indicator */}
                  <StrengthBar password={pwdForm.newPassword} />
                </div>

                {/* Confirm password */}
                <div className="form-field full">
                  <label>Confirm New Password</label>
                  <div className="pwd-input-wrap">
                    <input
                      type={showConfirmPwd ? "text" : "password"}
                      value={pwdForm.confirmPassword}
                      onChange={(e) =>
                        setPwdForm((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      onClick={() => setShowConfirmPwd((p) => !p)}
                      tabIndex={-1}
                    >
                      <i
                        className={`bx ${showConfirmPwd ? "bx-hide" : "bx-show"}`}
                      />
                    </button>
                  </div>

                  {/* Match indicator */}
                  {pwdForm.confirmPassword && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "0.75rem",
                        color:
                          pwdForm.newPassword === pwdForm.confirmPassword
                            ? "#10b981"
                            : "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <i
                        className={`bx ${
                          pwdForm.newPassword === pwdForm.confirmPassword
                            ? "bx-check-circle"
                            : "bx-x-circle"
                        }`}
                      />
                      {pwdForm.newPassword === pwdForm.confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div
                style={{
                  marginTop: "1.25rem",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="submit"
                  className="btn-save"
                  disabled={
                    pwdSaving ||
                    !pwdForm.currentPassword ||
                    !pwdForm.newPassword ||
                    !pwdForm.confirmPassword ||
                    pwdForm.newPassword !== pwdForm.confirmPassword ||
                    checkStrength(pwdForm.newPassword).score < 4
                  }
                >
                  {pwdSaving ? (
                    <>
                      <i
                        className="bx bx-loader-alt bx-spin"
                        style={{ marginRight: "6px" }}
                      />
                      Changing...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Social login users — show info instead */}
      {!isLocalUser && (
        <div
          className="profile-card"
          style={{
            marginTop: "1.5rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <i
              className="bx bx-info-circle"
              style={{ fontSize: "1.25rem", color: "#6366f1" }}
            />
            <div>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>
                Password managed by {user.provider}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                Your account uses {user.provider} login. To change your
                password, visit your {user.provider} account settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
