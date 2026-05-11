import { useEffect, useState } from "react";
import {
  fetchSettings,
  updateSettings,
  fetchSystemStats,
  addCategory,
  deleteCategory,
  sendTestEmail,
  clearOldResolved,
  clearAllNotifications,
} from "../../services/settingsService";
import { useAlert } from "../../components/common/Alert";
import "../../styles/AdminSettings.css";
import "boxicons/css/boxicons.min.css";

const TABS = [
  { key: "general",    label: "General",    icon: "bx-cog" },
  { key: "security",   label: "Security",   icon: "bx-shield-quarter" },
  { key: "email",      label: "Email",      icon: "bx-envelope" },
  { key: "categories", label: "Categories", icon: "bx-category" },
  { key: "danger",     label: "Danger Zone", icon: "bx-error" },
];

export default function AdminSettings() {
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [clearDays, setClearDays] = useState(30);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [s, st] = await Promise.all([
        fetchSettings(),
        fetchSystemStats(),
      ]);
      setSettings(s.data);
      setStats(st.data);
    } catch (err) {
      alert.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await updateSettings(settings);
      if (res.success) {
        alert.success("Settings saved successfully");
        setSettings(res.data);
      }
    } catch (err) {
      alert.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      alert.error("Category name is required");
      return;
    }
    try {
      const res = await addCategory(newCategory);
      if (res.success) {
        setSettings({ ...settings, categories: res.data });
        setNewCategory("");
        alert.success("Category added");
      }
    } catch (err) {
      alert.error(err?.response?.data?.message || "Failed");
    }
  };

  const handleDeleteCategory = async (name) => {
    try {
      const res = await deleteCategory(name);
      if (res.success) {
        setSettings({ ...settings, categories: res.data });
        alert.success("Category deleted");
      }
    } catch (err) {
      alert.error(err?.response?.data?.message || "Failed");
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      alert.error("Enter an email address");
      return;
    }
    try {
      const res = await sendTestEmail(testEmail);
      if (res.success) {
        alert.success(res.message);
        setTestEmail("");
      }
    } catch (err) {
      alert.error(err?.response?.data?.message || "Failed");
    }
  };

  const handleClearOldResolved = async () => {
    try {
      const res = await clearOldResolved(clearDays);
      if (res.success) {
        alert.success(res.message);
        setConfirmAction(null);
        loadAll();
      }
    } catch (err) {
      alert.error(err?.response?.data?.message || "Failed");
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const res = await clearAllNotifications();
      if (res.success) {
        alert.success(res.message);
        setConfirmAction(null);
        loadAll();
      }
    } catch (err) {
      alert.error(err?.response?.data?.message || "Failed");
    }
  };

  if (loading || !settings) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <i className="bx bx-loader-alt bx-spin" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>System Settings</h1>
          <p>Configure your ComplaintSync platform</p>
        </div>
        <button
          className="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <i className="bx bx-loader-alt bx-spin" />
              Saving...
            </>
          ) : (
            <>
              <i className="bx bx-save" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {stats && (
        <div className="settings-stats-row">
          <StatBox icon="bx-user"        label="Total Users"     value={stats.totalUsers}     color="#3b82f6" />
          <StatBox icon="bx-graduation"  label="Students"        value={stats.totalStudents}  color="#8b5cf6" />
          <StatBox icon="bx-id-card"     label="Staff"           value={stats.totalStaff}     color="#f59e0b" />
          <StatBox icon="bx-file"        label="Complaints"      value={stats.totalComplaints} color="#10b981" />
          <StatBox icon="bx-bell"        label="Notifications"   value={stats.totalNotifications} color="#ef4444" />
        </div>
      )}

      <div className="settings-body">
        <div className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`settings-tab ${activeTab === tab.key ? "active" : ""} ${
                tab.key === "danger" ? "danger" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bx ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === "general" && (
            <div className="settings-section">
              <h2>General Settings</h2>
              <p className="section-desc">Basic platform configuration</p>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Site Name</label>
                  <span>The name displayed in the header</span>
                </div>
                <input
                  type="text"
                  className="setting-input"
                  value={settings.siteName}
                  onChange={(e) => handleChange("siteName", e.target.value)}
                />
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Tagline</label>
                  <span>Subtitle shown below the site name</span>
                </div>
                <input
                  type="text"
                  className="setting-input"
                  value={settings.siteTagline}
                  onChange={(e) => handleChange("siteTagline", e.target.value)}
                />
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Default Complaint Priority</label>
                  <span>Priority assigned to new complaints by default</span>
                </div>
                <select
                  className="setting-input"
                  value={settings.defaultPriority}
                  onChange={(e) => handleChange("defaultPriority", e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Auto Close Resolved After (Days)</label>
                  <span>Automatically archive complaints resolved this long ago</span>
                </div>
                <input
                  type="number"
                  className="setting-input"
                  min="7"
                  max="365"
                  value={settings.autoCloseResolvedDays}
                  onChange={(e) =>
                    handleChange("autoCloseResolvedDays", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Maintenance Mode</label>
                  <span>Block all non-admin access to the system</span>
                </div>
                <Toggle
                  checked={settings.maintenanceMode}
                  onChange={(v) => handleChange("maintenanceMode", v)}
                />
              </div>

              {settings.maintenanceMode && (
                <div className="setting-row">
                  <div className="setting-info">
                    <label>Maintenance Message</label>
                    <span>Shown to users during maintenance</span>
                  </div>
                  <textarea
                    className="setting-input"
                    rows="3"
                    value={settings.maintenanceMessage}
                    onChange={(e) =>
                      handleChange("maintenanceMessage", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "security" && (
            <div className="settings-section">
              <h2>Security Settings</h2>
              <p className="section-desc">Password policies and authentication</p>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Minimum Password Length</label>
                  <span>Required minimum characters for passwords</span>
                </div>
                <input
                  type="number"
                  className="setting-input"
                  min="6"
                  max="32"
                  value={settings.passwordMinLength}
                  onChange={(e) =>
                    handleChange("passwordMinLength", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Require Special Character</label>
                  <span>Password must include @ ! # $ etc.</span>
                </div>
                <Toggle
                  checked={settings.passwordRequireSpecial}
                  onChange={(v) => handleChange("passwordRequireSpecial", v)}
                />
              </div>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Require Number</label>
                  <span>Password must include at least one digit</span>
                </div>
                <Toggle
                  checked={settings.passwordRequireNumber}
                  onChange={(v) => handleChange("passwordRequireNumber", v)}
                />
              </div>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Require Uppercase</label>
                  <span>Password must include uppercase letter</span>
                </div>
                <Toggle
                  checked={settings.passwordRequireUppercase}
                  onChange={(v) => handleChange("passwordRequireUppercase", v)}
                />
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Session Timeout (Minutes)</label>
                  <span>How long before user must log in again</span>
                </div>
                <input
                  type="number"
                  className="setting-input"
                  min="5"
                  max="240"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) =>
                    handleChange("sessionTimeoutMinutes", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Max Login Attempts</label>
                  <span>Lock account after this many failed attempts</span>
                </div>
                <input
                  type="number"
                  className="setting-input"
                  min="3"
                  max="20"
                  value={settings.maxLoginAttempts}
                  onChange={(e) =>
                    handleChange("maxLoginAttempts", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label>OTP Expiry (Minutes)</label>
                  <span>How long password reset OTPs remain valid</span>
                </div>
                <input
                  type="number"
                  className="setting-input"
                  min="1"
                  max="60"
                  value={settings.otpExpiryMinutes}
                  onChange={(e) =>
                    handleChange("otpExpiryMinutes", parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <div className="settings-section">
              <h2>Email Settings</h2>
              <p className="section-desc">Configure outgoing email behavior</p>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Email Notifications Enabled</label>
                  <span>Master toggle for all outgoing emails</span>
                </div>
                <Toggle
                  checked={settings.emailEnabled}
                  onChange={(v) => handleChange("emailEnabled", v)}
                />
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label>Sender Name</label>
                  <span>Name shown in the "From" field of emails</span>
                </div>
                <input
                  type="text"
                  className="setting-input"
                  value={settings.emailSenderName}
                  onChange={(e) => handleChange("emailSenderName", e.target.value)}
                />
              </div>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Notify Admin on Submission</label>
                  <span>Send email when new complaint is submitted</span>
                </div>
                <Toggle
                  checked={settings.notifyOnSubmit}
                  onChange={(v) => handleChange("notifyOnSubmit", v)}
                />
              </div>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Notify Student on Assignment</label>
                  <span>Send email when complaint is assigned to staff</span>
                </div>
                <Toggle
                  checked={settings.notifyOnAssign}
                  onChange={(v) => handleChange("notifyOnAssign", v)}
                />
              </div>

              <div className="setting-row toggle-row">
                <div className="setting-info">
                  <label>Notify on Resolution</label>
                  <span>Send email when complaint is resolved</span>
                </div>
                <Toggle
                  checked={settings.notifyOnResolve}
                  onChange={(v) => handleChange("notifyOnResolve", v)}
                />
              </div>

              <div className="setting-test-email">
                <h4>Send Test Email</h4>
                <p>Verify your email configuration is working</p>
                <div className="test-email-row">
                  <input
                    type="email"
                    className="setting-input"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <button
                    className="settings-btn primary"
                    onClick={handleSendTestEmail}
                  >
                    <i className="bx bx-send" />
                    Send Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="settings-section">
              <h2>Complaint Categories</h2>
              <p className="section-desc">Manage available complaint categories</p>

              <div className="add-category-row">
                <input
                  type="text"
                  className="setting-input"
                  placeholder="Enter new category name..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <button
                  className="settings-btn primary"
                  onClick={handleAddCategory}
                >
                  <i className="bx bx-plus" />
                  Add Category
                </button>
              </div>

              <div className="categories-grid">
                {settings.categories.map((cat) => (
                  <div key={cat} className="category-chip">
                    <i className="bx bx-category" />
                    <span>{cat}</span>
                    <button
                      className="chip-delete"
                      onClick={() => handleDeleteCategory(cat)}
                      title="Delete category"
                    >
                      <i className="bx bx-x" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "danger" && (
            <div className="settings-section danger-section">
              <h2>Danger Zone</h2>
              <p className="section-desc">
                Irreversible actions. Use with caution.
              </p>

              <div className="danger-card">
                <div className="danger-info">
                  <h4>Clear Old Resolved Complaints</h4>
                  <p>
                    Permanently delete resolved complaints older than the
                    specified number of days.
                  </p>
                </div>
                <div className="danger-action">
                  <input
                    type="number"
                    className="setting-input small"
                    min="7"
                    value={clearDays}
                    onChange={(e) => setClearDays(parseInt(e.target.value))}
                  />
                  <button
                    className="settings-btn danger"
                    onClick={() => setConfirmAction("clear-resolved")}
                  >
                    <i className="bx bx-trash" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="danger-card">
                <div className="danger-info">
                  <h4>Clear All Notifications</h4>
                  <p>
                    Delete every notification for every user across the entire
                    system.
                  </p>
                </div>
                <div className="danger-action">
                  <button
                    className="settings-btn danger"
                    onClick={() => setConfirmAction("clear-notifications")}
                  >
                    <i className="bx bx-trash" />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmAction && (
        <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <i className="bx bx-error" />
            </div>
            <h3>Are you absolutely sure?</h3>
            <p>
              {confirmAction === "clear-resolved" &&
                `This will permanently delete all resolved complaints older than ${clearDays} days. This cannot be undone.`}
              {confirmAction === "clear-notifications" &&
                "This will delete every notification for every user. This cannot be undone."}
            </p>
            <div className="confirm-actions">
              <button
                className="settings-btn"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                className="settings-btn danger"
                onClick={() => {
                  if (confirmAction === "clear-resolved") handleClearOldResolved();
                  if (confirmAction === "clear-notifications") handleClearAllNotifications();
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatBox = ({ icon, label, value, color }) => (
  <div className="settings-stat-box">
    <div
      className="stat-box-icon"
      style={{ background: `${color}18`, color }}
    >
      <i className={`bx ${icon}`} />
    </div>
    <div>
      <h3>{value}</h3>
      <p>{label}</p>
    </div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    className={`toggle-switch ${checked ? "on" : ""}`}
    onClick={() => onChange(!checked)}
    type="button"
  >
    <span className="toggle-knob" />
  </button>
);