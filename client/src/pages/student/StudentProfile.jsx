import { useState, useEffect, useRef } from "react";
import "../../styles/StudentProfile.css";

const Profile = () => {
  const fileInputRef = useRef(null);

  const initialData = {
    firstName: "Parikshit",
    lastName: "Wadkar",
    email: "parikshit@example.com",
    phone: "+91 9876543210",
    rollNo: "CS2023-017",
    department: "Computer Science",
    year: "3rd Year",
    section: "A",
    joinedDate: "August 2023",
    bio: "Computer Science student passionate about building systems.",
    profilePic: null,
  };

  const [formData, setFormData] = useState(initialData);
  const [originalData, setOriginalData] = useState(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);

  /* ================= Dirty Check ================= */
  useEffect(() => {
    const changed =
      JSON.stringify(formData) !== JSON.stringify(originalData);
    setIsDirty(changed);
  }, [formData, originalData]);

  /* ================= Validation ================= */
  const validate = () => {
    let newErrors = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";

    if (!formData.phone.trim())
      newErrors.phone = "Phone number is required";

    if (!formData.email.includes("@"))
      newErrors.email = "Invalid email address";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= Handlers ================= */

  const handleEdit = () => {
    setOriginalData(formData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setErrors({});
    setShowEmailWarning(false);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!validate()) return;

    setOriginalData(formData);
    setIsEditing(false);
    setShowEmailWarning(false);

    console.log("Saved:", formData);
  };

  const handleChange = (field, value) => {
    if (field === "email" && value !== originalData.email) {
      setShowEmailWarning(true);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    setFormData((prev) => ({
      ...prev,
      profilePic: imageUrl,
    }));
  };

  return (
    <div className="student-profile-page">

      {/* ================= HEADER ================= */}
      <div className="profile-header">
        <div>
          <h1>Student Profile</h1>
          <p>Manage your academic & complaint information</p>
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
              disabled={!isDirty}
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* ================= PROFILE CARD ================= */}
      <div className="profile-card">

        {/* ===== Avatar Section ===== */}
        <div className="profile-top">
          <div className="avatar-wrapper">
            {formData.profilePic ? (
              <img
                src={formData.profilePic}
                alt="Profile"
                className="avatar-img"
              />
            ) : (
              <div className="avatar-initials">
                {formData.firstName[0]}
                {formData.lastName[0]}
              </div>
            )}

            {isEditing && (
              <>
                <button
                  className="avatar-upload-btn"
                  onClick={() => fileInputRef.current.click()}
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
            <span className="badge">{formData.rollNo}</span>
          </div>
        </div>

        {/* ===== FORM ===== */}
        <div className="form-grid">

          <div className="form-field">
            <label>First Name</label>
            <input
              disabled={!isEditing}
              value={formData.firstName}
              onChange={(e) =>
                handleChange("firstName", e.target.value)
              }
            />
            {errors.firstName && <span className="error">{errors.firstName}</span>}
          </div>

          <div className="form-field">
            <label>Last Name</label>
            <input
              disabled={!isEditing}
              value={formData.lastName}
              onChange={(e) =>
                handleChange("lastName", e.target.value)
              }
            />
          </div>

          <div className="form-field full">
            <label>Email</label>
            <input
              disabled={!isEditing}
              value={formData.email}
              onChange={(e) =>
                handleChange("email", e.target.value)
              }
            />
            {errors.email && <span className="error">{errors.email}</span>}
            {showEmailWarning && (
              <span className="info">
                Changing email will require verification.
              </span>
            )}
          </div>

          <div className="form-field">
            <label>Phone</label>
            <input
              disabled={!isEditing}
              value={formData.phone}
              onChange={(e) =>
                handleChange("phone", e.target.value)
              }
            />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>

          <div className="form-field full">
            <label>Bio</label>
            <textarea
              disabled={!isEditing}
              rows="4"
              value={formData.bio}
              onChange={(e) =>
                handleChange("bio", e.target.value)
              }
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;