const crypto = require("crypto");
const {
  isValidId,
  findUserById,
  findUserByEmail,
  createUser,
  updateUserById,
  deleteUserById,
  getAllStudentsWithStats,
  getAllStaffWithStats,
  getStaffByCategoryWithActiveCount,
} = require("../../src/db/users.ts");
const {
  findComplaintById,
  updateComplaintById,
  deleteComplaintById,
  unassignStaffComplaints,
  getStudentComplaintAttachments,
  deleteComplaintsByStudent,
  countComplaints,
} = require("../../src/db/complaints.ts");
const {
  countNotifications,
  deleteNotificationsByUserInvolvement,
  deleteNotificationsByComplaint,
} = require("../../src/db/notifications.ts");
const { sendStaffWelcomeEmail } = require("../services/email.service");
const {
  notifyComplaintAssigned,
  notifyComplaintReassigned,
} = require("../services/notification.service");

const generatePassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const symbols = "!@#$%&*";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }
  password += symbols.charAt(crypto.randomInt(0, symbols.length));
  return password;
};

const getAllStudents = async (req, res) => {
  try {
    const students = await getAllStudentsWithStats();
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const staff = await getAllStaffWithStats();
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addStaff = async (req, res) => {
  try {
    const { name, email, phone, category, passwordMode, password } = req.body;

    if (!name || !email || !phone || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and category are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await findUserByEmail(normalizedEmail);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    let finalPassword;
    if (passwordMode === "auto") {
      finalPassword = generatePassword();
    } else {
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }
      finalPassword = password;
    }

    const staff = await createUser({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      password: finalPassword,
      role: "staff",
      category: String(category).trim().toLowerCase(),
      isEmailVerified: true,
    });

    let emailResult = { success: false, skipped: true };
    try {
      emailResult = await sendStaffWelcomeEmail(staff, finalPassword);
    } catch (e) {
      console.error("Staff welcome email failed:", e.message);
    }

    res.status(201).json({
      success: true,
      message: "Staff added successfully",
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        category: staff.category,
        password: passwordMode === "auto" ? finalPassword : undefined,
        emailSent: emailResult.success,
      },
    });
  } catch (err) {
    if (err.code === "UNIQUE_VIOLATION") {
      return res.status(400).json({
        success: false,
        message: `This ${err.field || "field"} is already registered`,
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, category } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff ID" });
    }

    const staff = await findUserById(id);
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    const updated = await updateUserById(id, {
      ...(name ? { name: String(name).trim() } : {}),
      ...(phone ? { phone: String(phone).trim() } : {}),
      ...(category ? { category: String(category).trim().toLowerCase() } : {}),
    });

    res.json({
      success: true,
      message: "Staff updated successfully",
      data: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        category: updated.category,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff ID" });
    }

    const staff = await findUserById(id);
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const { activeCount, totalAssigned } = await unassignStaffComplaints(id);
    const deletedNotifications = await deleteNotificationsByUserInvolvement(id);
    await deleteUserById(id);

    res.json({
      success: true,
      message: `Staff member "${staff.name}" deleted successfully`,
      data: {
        reassignedComplaints: activeCount,
        totalComplaintsAffected: totalAssigned,
        deletedNotifications,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID" });
    }

    const complaint = await findComplaintById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.attachments && complaint.attachments.length > 0) {
      const { deleteMultipleFiles } = require("../services/cloudinary.service");
      const publicIds = complaint.attachments.map((a) => a.publicId).filter(Boolean);
      if (publicIds.length > 0) {
        await deleteMultipleFiles(publicIds);
      }
    }

    await deleteNotificationsByComplaint(id);
    await deleteComplaintById(id);

    res.json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const suspendStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { days, reason } = req.body;

    if (!days || Number(days) < 1) {
      return res.status(400).json({
        success: false,
        message: "Days must be at least 1",
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Reason is required (minimum 10 characters)",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const student = await findUserById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + parseInt(days, 10));

    await updateUserById(id, {
      suspendedUntil,
      suspensionReason: reason.trim(),
    });

    res.json({
      success: true,
      message: `Student suspended for ${days} day(s)`,
      data: { suspendedUntil, reason },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const reactivateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const student = await findUserById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await updateUserById(id, {
      suspendedUntil: null,
      suspensionReason: null,
      isActive: true,
    });

    res.json({ success: true, message: "Student reactivated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStaffByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const staff = await getStaffByCategoryWithActiveCount(
      String(category).toLowerCase().trim()
    );
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const assignStaffToComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID" });
    }
    if (!staffId || !isValidId(staffId)) {
      return res.status(400).json({ success: false, message: "Valid staffId is required" });
    }

    const complaint = await findComplaintById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const newStaff = await findUserById(staffId);
    if (!newStaff || newStaff.role !== "staff") {
      return res.status(400).json({
        success: false,
        message: "Invalid staff member",
      });
    }

    const oldStaffId = complaint.assignedToId;
    const oldStaff = oldStaffId ? await findUserById(oldStaffId) : null;
    const isReassignment =
      Boolean(oldStaffId) && String(oldStaffId) !== String(newStaff.id);

    const updated = await updateComplaintById(id, {
      assignedToId: newStaff.id,
      ...(complaint.status === "pending" ? { status: "in-progress" } : {}),
    });

    if (isReassignment) {
      await notifyComplaintReassigned(updated, oldStaff, newStaff, req.app);
    } else {
      await notifyComplaintAssigned(updated, updated.student, newStaff, req.app);
    }

    res.json({
      success: true,
      message: isReassignment
        ? `Complaint reassigned to ${newStaff.name}`
        : `Complaint assigned to ${newStaff.name}`,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStudentDeletePreview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const student = await findUserById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const [complaintsCount, notificationsReceived, notificationsSent] =
      await Promise.all([
        countComplaints({ studentId: id }),
        countNotifications({ recipientId: id }),
        countNotifications({ senderId: id }),
      ]);

    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          email: student.email,
          createdAt: student.createdAt,
        },
        complaints: complaintsCount,
        notificationsReceived,
        notificationsSent,
        total: complaintsCount + notificationsReceived + notificationsSent + 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const student = await findUserById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const attachmentIds = await getStudentComplaintAttachments(id);
    if (attachmentIds.length > 0) {
      const { deleteMultipleFiles } = require("../services/cloudinary.service");
      await deleteMultipleFiles(attachmentIds);
    }

    const deletedNotifications = await deleteNotificationsByUserInvolvement(id);
    const deletedComplaints = await deleteComplaintsByStudent(id);
    await deleteUserById(id);

    res.json({
      success: true,
      message: `Student ${student.name} deleted successfully`,
      data: {
        deletedComplaints,
        deletedNotifications,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStaffDeletePreview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff ID" });
    }

    const staff = await findUserById(id);
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const [
      activeComplaints,
      resolvedComplaints,
      rejectedComplaints,
      notificationsReceived,
      notificationsSent,
    ] = await Promise.all([
      countComplaints({ assignedToId: id, status: ["pending", "in-progress"] }),
      countComplaints({ assignedToId: id, status: "resolved" }),
      countComplaints({ assignedToId: id, status: "rejected" }),
      countNotifications({ recipientId: id }),
      countNotifications({ senderId: id }),
    ]);

    const totalComplaints =
      activeComplaints + resolvedComplaints + rejectedComplaints;

    res.json({
      success: true,
      data: {
        staff: {
          name: staff.name,
          email: staff.email,
          category: staff.category,
          createdAt: staff.createdAt,
        },
        activeComplaints,
        resolvedComplaints,
        rejectedComplaints,
        complaints: totalComplaints,
        notificationsReceived,
        notificationsSent,
        willBeReassigned: activeComplaints,
        total: totalComplaints + notificationsReceived + notificationsSent + 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllStudents,
  getAllStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  suspendStudent,
  reactivateStudent,
  getStaffByCategory,
  assignStaffToComplaint,
  getStudentDeletePreview,
  deleteStudent,
  getStaffDeletePreview,
  deleteComplaint,
};
