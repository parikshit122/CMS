import React, { useState, useEffect, useCallback } from "react";
import API from "../../services/api";
import { useAlert } from "../../components/common/Alert";
import ConfirmModal from "../../components/common/ConfirmModal";
import StudentsTab from "../admin/StudentsTab";
import StaffTab from "../admin/StaffTab";
import AddStaffModal from "../../components/admin/AddStaffModal";
import SuspendStudentModal from "../../components/admin/SuspendStudentModal";
import "../../styles/ManageUsers.css";

const ManageUsers = () => {
  const alert = useAlert();
  const [activeTab, setActiveTab]       = useState("students");
  const [students, setStudents]         = useState([]);
  const [staff, setStaff]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  const handleDeleteStaff = (staffMember) => {
    setConfirmAction({
      type: "delete",
      target: staffMember,
      title: "Delete Staff Member?",
      message: `This will permanently remove ${staffMember.name} from the system. This action cannot be undone.`,
      confirmText: "Delete",
      modalType: "danger",
      icon: "bx-trash",
    });
  };

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
          alert.success("Staff deleted successfully");
          fetchStaff();
        }
      }
      setConfirmAction(null);
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

  return (
    <div className="users-page">
      {/* ── Page Header ───────────────────────────────────── */}
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

      {/* ── Tabs ──────────────────────────────────────────── */}
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

      {/* ── Tab Panels ────────────────────────────────────── */}
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

      {/* ── Modals ────────────────────────────────────────── */}
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
        onClose={() => !confirmLoading && setConfirmAction(null)}
        onConfirm={executeConfirmedAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmText={confirmAction?.confirmText}
        type={confirmAction?.modalType}
        icon={confirmAction?.icon}
        loading={confirmLoading}
      />
    </div>
  );
};

export default ManageUsers;