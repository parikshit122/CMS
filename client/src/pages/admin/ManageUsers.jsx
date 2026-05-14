import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useAlert } from "../../components/common/Alert";
import ConfirmModal from "../../components/common/ConfirmModal";
import StudentsTab from "../admin/StudentsTab";
import StaffTab from "../admin/StaffTab";
import AddStaffModal from "../../components/admin/AddStaffModal";
import SuspendStudentModal from "../../components/admin/SuspendStudentModal";
import "../../styles/ManageUsers.css";

const ManageUsers = () => {
  const alert    = useAlert();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]                       = useState("students");
  const [students, setStudents]                         = useState([]);
  const [staff, setStaff]                               = useState([]);
  const [loading, setLoading]                           = useState(false);
  const [showAddStaff, setShowAddStaff]                 = useState(false);
  const [suspendTarget, setSuspendTarget]               = useState(null);
  const [confirmAction, setConfirmAction]               = useState(null);
  const [confirmLoading, setConfirmLoading]             = useState(false);
  const [deletePreview, setDeletePreview]               = useState(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText]       = useState("");

  const getCurrentUserId = () => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw)?._id ?? null;
    } catch {
      return null;
    }
  };

  const forceLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/users/students");
      if (res.data.success) setStudents(res.data.data);
    } catch {
      alert.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [alert]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/users/staff");
      if (res.data.success) setStaff(res.data.data);
    } catch {
      alert.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    if (activeTab === "students") fetchStudents();
    else fetchStaff();
  }, [activeTab, fetchStudents, fetchStaff]);

  const handleSuspend = async (userId, days, reason) => {
    try {
      const res = await API.patch(`/admin/users/students/${userId}/suspend`, {
        days,
        reason,
      });
      if (res.data.success) {
        alert.success(`Student suspended for ${days} day(s)`);
        setSuspendTarget(null);
        fetchStudents();
      }
    } catch (err) {
      alert.error(err.response?.data?.message || "Failed to suspend student");
    }
  };

  const handleReactivate = (student) => {
    setConfirmAction({
      type: "reactivate",
      target: student,
      title: "Reactivate Student?",
      message: `Are you sure you want to reactivate ${student.name}? They will regain immediate access.`,
      confirmText: "Yes, Reactivate",
      modalType: "success",
      icon: "bx-check-circle",
    });
  };

  const openDeletePreview = async (user, type, previewEndpoint) => {
    setDeletePreview(null);
    setDeleteConfirmText("");
    setDeletePreviewLoading(true);

    setConfirmAction({
      type,
      target: user,
      title: type === "delete" ? "Delete Staff Member?" : "Delete Student?",
      confirmText: "Delete",
      modalType: "danger",
      icon: "bx-trash",
    });

    try {
      const res = await API.get(previewEndpoint);
      if (res.data.success) setDeletePreview(res.data.data);
    } catch {
      setDeletePreview({ complaints: 0, notificationsReceived: 0, notificationsSent: 0 });
    } finally {
      setDeletePreviewLoading(false);
    }
  };

  const handleDeleteStaff = (staffMember) =>
    openDeletePreview(
      staffMember,
      "delete",
      `/admin/users/staff/${staffMember._id}/delete-preview`
    );

  const handleDeleteStudent = (student) =>
    openDeletePreview(
      student,
      "delete-student",
      `/admin/users/students/${student._id}/delete-preview`
    );

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);

    try {
      if (confirmAction.type === "reactivate") {
        const res = await API.patch(
          `/admin/users/students/${confirmAction.target._id}/reactivate`
        );
        if (res.data.success) {
          alert.success("Student reactivated successfully");
          fetchStudents();
        }
      } else if (confirmAction.type === "delete") {
        const res = await API.delete(
          `/admin/users/staff/${confirmAction.target._id}`
        );
        if (res.data.success) {
          alert.success("Staff member and all associated data deleted");
          const deletedId = confirmAction.target._id;
          fetchStaff();
          if (getCurrentUserId() === deletedId) forceLogout();
        }
      } else if (confirmAction.type === "delete-student") {
        const res = await API.delete(
          `/admin/users/students/${confirmAction.target._id}`
        );
        if (res.data.success) {
          alert.success("Student and all associated data deleted");
          const deletedId = confirmAction.target._id;
          fetchStudents();
          if (getCurrentUserId() === deletedId) forceLogout();
        }
      }

      setConfirmAction(null);
      setDeletePreview(null);
      setDeleteConfirmText("");
    } catch (err) {
      alert.error(err.response?.data?.message || "Action failed");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleAddStaff = async (formData) => {
    try {
      const res = await API.post("/admin/users/staff", formData);
      if (res.data.success) {
        alert.success("Staff added successfully");
        fetchStaff();
        return res.data.data;
      }
    } catch (err) {
      alert.error(err.response?.data?.message || "Failed to add staff");
      throw err;
    }
  };

  const handleCloseConfirm = () => {
    if (confirmLoading) return;
    setConfirmAction(null);
    setDeletePreview(null);
    setDeleteConfirmText("");
  };

  const buildDeleteMessage = () => {
    if (
      confirmAction?.type !== "delete" &&
      confirmAction?.type !== "delete-student"
    ) {
      return confirmAction?.message;
    }

    const name = confirmAction.target?.name;

    if (deletePreviewLoading) {
      return (
        <span className="delete-preview">
          <span className="delete-preview__intro">
            Checking records for <strong>{name}</strong>…
          </span>
          <span className="delete-preview__loading">
            <i className="bx bx-loader-alt bx-spin" />
            <span>Loading preview…</span>
          </span>
        </span>
      );
    }

    return (
      <span className="delete-preview">
        <span className="delete-preview__intro">
          The following will be <strong>permanently deleted</strong>:
        </span>

        <span className="delete-preview__list">
          <span className="delete-preview__list-item">
            <i className="bx bx-user-x" />
            The account for <strong>{name}</strong>
          </span>
          <span className="delete-preview__list-item">
            <i className="bx bx-file" />
            <strong>{deletePreview?.complaints ?? 0}</strong> complaint
            {deletePreview?.complaints !== 1 ? "s" : ""} submitted by them
          </span>
          <span className="delete-preview__list-item">
            <i className="bx bx-bell" />
            <strong>{deletePreview?.notificationsReceived ?? 0}</strong>{" "}
            notification
            {deletePreview?.notificationsReceived !== 1 ? "s" : ""} received by
            them
          </span>
          <span className="delete-preview__list-item">
            <i className="bx bx-send" />
            <strong>{deletePreview?.notificationsSent ?? 0}</strong>{" "}
            notification
            {deletePreview?.notificationsSent !== 1 ? "s" : ""} they sent
          </span>
        </span>

        <span className="delete-preview__warning">
          <i className="bx bx-error-circle" />
          This action is <strong>irreversible</strong>. The user will not be
          able to log in again.
        </span>

        <span className="delete-preview__confirm-input">
          <label htmlFor="delete-confirm-field">
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            id="delete-confirm-field"
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            spellCheck={false}
          />
        </span>
      </span>
    );
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <span className="users-eyebrow">
            <i className="bx bx-group" aria-hidden="true" />
            Admin Portal
          </span>
          <h1 className="users-title">Manage Users</h1>
          <p className="users-sub">View and manage all students and staff</p>
        </div>

        {activeTab === "staff" && (
          <button
            className="users-btn users-btn--primary"
            onClick={() => setShowAddStaff(true)}
            aria-label="Add new staff member"
          >
            <i className="bx bx-plus" aria-hidden="true" />
            <span>Add Staff</span>
          </button>
        )}
      </div>

      <div
        className="users-tabs"
        role="tablist"
        aria-label="User management tabs"
      >
        <button
          className={`users-tab ${activeTab === "students" ? "active" : ""}`}
          onClick={() => setActiveTab("students")}
          role="tab"
          aria-selected={activeTab === "students"}
          aria-controls="tab-panel-students"
          id="tab-students"
        >
          <i className="bx bx-user" aria-hidden="true" />
          <span>Students</span>
          <span
            className="users-tab__count"
            aria-label={`${students.length} students`}
          >
            {students.length}
          </span>
        </button>

        <button
          className={`users-tab ${activeTab === "staff" ? "active" : ""}`}
          onClick={() => setActiveTab("staff")}
          role="tab"
          aria-selected={activeTab === "staff"}
          aria-controls="tab-panel-staff"
          id="tab-staff"
        >
          <i className="bx bx-shield-quarter" aria-hidden="true" />
          <span>Staff</span>
          <span
            className="users-tab__count"
            aria-label={`${staff.length} staff members`}
          >
            {staff.length}
          </span>
        </button>
      </div>

      <div
        className="users-content"
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "students" ? (
          <StudentsTab
            students={students}
            loading={loading}
            onSuspend={(student) => setSuspendTarget(student)}
            onReactivate={handleReactivate}
            onDelete={handleDeleteStudent}
            onRefresh={fetchStudents}
          />
        ) : (
          <StaffTab
            staff={staff}
            loading={loading}
            onDelete={handleDeleteStaff}
            onRefresh={fetchStaff}
          />
        )}
      </div>

      {showAddStaff && (
        <AddStaffModal
          onClose={() => setShowAddStaff(false)}
          onSubmit={handleAddStaff}
        />
      )}

      {suspendTarget && (
        <SuspendStudentModal
          student={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onSubmit={handleSuspend}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={handleCloseConfirm}
        onConfirm={executeConfirmedAction}
        title={confirmAction?.title}
        message={buildDeleteMessage()}
        confirmText={confirmAction?.confirmText}
        type={confirmAction?.modalType}
        icon={confirmAction?.icon}
        loading={confirmLoading}
        confirmDisabled={
          confirmAction?.type === "delete" ||
          confirmAction?.type === "delete-student"
            ? deleteConfirmText !== "DELETE"
            : false
        }
      />
    </div>
  );
};

export default ManageUsers;