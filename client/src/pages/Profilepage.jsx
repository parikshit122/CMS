import { useState, useEffect, useRef } from "react";
import { useAlert } from "../components/common/Alert";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "../styles/Profilepage.css";

const Profile = () => {
  const fileInputRef = useRef(null);
  const alert = useAlert();
  const { updateUser } = useAuth();

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popupClosed, setPopupClosed] = useState(false);

  const buildFormData = (u) => ({
    firstName: u.name?.split(" ")[0] || "",
    lastName: u.name?.split(" ")[1] || "",
    email: u.email,
    phone: u.phone || "",
    course: u.course || "",
    year: u.year || "",
    bio: u.bio || "",
    avatar: u.avatar || null,
    avatarFile: null,
  });

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

  useEffect(() => {
    if (!formData || !originalData) return;
    const cleanForm = { ...formData };
    const cleanOrig = { ...originalData };
    delete cleanForm.avatarFile;
    delete cleanForm.avatar;
    delete cleanOrig.avatarFile;
    delete cleanOrig.avatar;
    const hasFieldChanges = JSON.stringify(cleanForm) !== JSON.stringify(cleanOrig);
    const hasNewAvatar = !!formData.avatarFile;
    setIsDirty(hasFieldChanges || hasNewAvatar);
  }, [formData, originalData]);

  if (!formData || !user) return null;

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

  const handleSave = async () => {
    try {
      setSaving(true);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      let avatarUrl = formData.avatar;

      if (formData.avatarFile) {
        const uploadForm = new FormData();
        uploadForm.append("avatar", formData.avatarFile);

        const uploadRes = await API.post("/users/upload-avatar", uploadForm);

        if (uploadRes.data.success) {
          avatarUrl = uploadRes.data.avatar;
        } else {
          alert.error("Avatar upload failed");
          setSaving(false);
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
        alert.error("Failed to update profile");
        setSaving(false);
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
      console.error("Update failed:", err);
      alert.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="student-profile-page">
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

      <div className="profile-card">
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
          </div>
        </div>

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
              onChange={(e) => handleChange("phone", e.target.value)}
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
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
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
    </div>
  );
};

export default Profile;