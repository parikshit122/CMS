const User = require("../models/User");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const { sendStaffWelcomeEmail } = require("../services/email.service");
const {
  notifyComplaintAssigned,
  notifyComplaintReassigned,
} = require("../services/notification.service");

// ── Password generator ───────────────────────────────────
const generatePassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const symbols = "!@#$%&*";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  return password;
};

// ── Get all students (aggregation — no N+1) ──────────────
const getAllStudents = async (req, res) => {
  try {
    const now = new Date();

    const students = await User.aggregate([
      { $match: { role: "user" } },
      {
        $lookup: {
          from: "complaints",
          localField: "_id",
          foreignField: "student",
          as: "complaints",
        },
      },
      {
        $addFields: {
          totalComplaints: { $size: "$complaints" },
          isSuspended: {
            $and: [
              { $ne: ["$suspendedUntil", null] },
              { $gt: ["$suspendedUntil", now] },
            ],
          },
        },
      },
      {
        $project: {
          password: 0,
          complaints: 0,
          passwordResetOTP: 0,
          passwordResetToken: 0,
          emailVerificationOTP: 0,
          loginAttempts: 0,
          __v: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const enriched = students.map((s) => ({
      ...s,
      status: s.isSuspended
        ? "suspended"
        : s.isActive === false
          ? "inactive"
          : "active",
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const staff = await User.aggregate([
      { $match: { role: "staff" } },
      {
        $lookup: {
          from: "complaints",
          localField: "_id",
          foreignField: "assignedTo",
          as: "allComplaints",
        },
      },
      {
        $addFields: {
          assignedCount: { $size: "$allComplaints" },
          resolvedCount: {
            $size: {
              $filter: {
                input: "$allComplaints",
                as: "c",
                cond: { $eq: ["$$c.status", "resolved"] },
              },
            },
          },
        },
      },
      {
        $project: {
          password: 0,
          allComplaints: 0,
          passwordResetOTP: 0,
          passwordResetToken: 0,
          emailVerificationOTP: 0,
          loginAttempts: 0,
          __v: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Add staff ────────────────────────────────────────────
const addStaff = async (req, res) => {
  try {
    const { name, email, phone, category, passwordMode, password } = req.body;

    if (!name || !email || !phone || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and category are required",
      });
    }

    const exists = await User.findOne({ email });
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

    const staff = await User.create({
      name,
      email,
      phone,
      password: finalPassword,
      role: "staff",
      category,
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
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, category } = req.body;

    const staff = await User.findById(id);
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

    if (name) staff.name = name;
    if (phone) staff.phone = phone;
    if (category) staff.category = category;

    await staff.save();

    res.json({
      success: true,
      message: "Staff updated successfully",
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        category: staff.category,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete staff (with cleanup) ──────────────────────────
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await User.findById(id);
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const [activeCount, totalAssigned, notifReceived, notifSent] =
      await Promise.all([
        Complaint.countDocuments({
          assignedTo: id,
          status: { $in: ["pending", "in-progress"] },
        }),
        Complaint.countDocuments({ assignedTo: id }),
        Notification.countDocuments({ recipient: id }),
        Notification.countDocuments({ sender: id }),
      ]);

    // Unassign active complaints → reset to pending
    if (activeCount > 0) {
      await Complaint.updateMany(
        { assignedTo: id, status: { $in: ["pending", "in-progress"] } },
        { $unset: { assignedTo: "" }, $set: { status: "pending" } },
      );
    }

    // Remove staff reference from closed complaints
    await Complaint.updateMany(
      { assignedTo: id, status: { $in: ["resolved", "rejected"] } },
      { $unset: { assignedTo: "" } },
    );

    // Delete all notifications
    const notifResult = await Notification.deleteMany({
      $or: [{ recipient: id }, { sender: id }],
    });

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Staff member "${staff.name}" deleted successfully`,
      data: {
        reassignedComplaints: activeCount,
        totalComplaintsAffected: totalAssigned,
        deletedNotifications: notifResult.deletedCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete complaint ─────────────────────────────────────
const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // ── Delete attachments from Cloudinary ────────────────
    if (complaint.attachments && complaint.attachments.length > 0) {
      const { deleteMultipleFiles } = require("../services/cloudinary.service");
      const publicIds = complaint.attachments.map((a) => a.publicId);
      await deleteMultipleFiles(publicIds);
    }

    await Promise.all([
      Complaint.findByIdAndDelete(id),
      Notification.deleteMany({ complaint: id }),
    ]);

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

    if (!days || days < 1) {
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

    const student = await User.findById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + parseInt(days));

    student.suspendedUntil = suspendedUntil;
    student.suspensionReason = reason || "";
    await student.save();

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

    const student = await User.findById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    student.suspendedUntil = undefined;
    student.suspensionReason = undefined;
    student.isActive = true;
    await student.save();

    res.json({ success: true, message: "Student reactivated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get staff by category (fixed N+1) ────────────────────
const getStaffByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const staff = await User.aggregate([
      { $match: { role: "staff", category } },
      {
        $lookup: {
          from: "complaints",
          localField: "_id",
          foreignField: "assignedTo",
          as: "activeComplaints",
          pipeline: [
            {
              $match: {
                status: { $in: ["pending", "in-progress"] },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          activeCount: { $size: "$activeComplaints" },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          category: 1,
          activeCount: 1,
        },
      },
    ]);

    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Assign staff to complaint ────────────────────────────
const assignStaffToComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const complaint = await Complaint.findById(id).populate(
      "student",
      "name email",
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const newStaff = await User.findById(staffId);
    if (!newStaff || newStaff.role !== "staff") {
      return res.status(400).json({
        success: false,
        message: "Invalid staff member",
      });
    }

    const oldStaffId = complaint.assignedTo;
    const oldStaff = oldStaffId ? await User.findById(oldStaffId) : null;

    const isReassignment =
      oldStaffId && oldStaffId.toString() !== staffId.toString();

    // Update complaint
    complaint.assignedTo = staffId;
    if (complaint.status === "pending") {
      complaint.status = "in-progress";
    }
    await complaint.save();

    // Fetch fully populated for response + notifications
    const updated = await Complaint.findById(id)
      .populate("student", "name email")
      .populate("assignedTo", "name email category");

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

    const student = await User.findById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const [complaintsCount, notificationsReceived, notificationsSent] =
      await Promise.all([
        Complaint.countDocuments({ student: id }),
        Notification.countDocuments({ recipient: id }),
        Notification.countDocuments({ sender: id }),
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

    const student = await User.findById(id);
    if (!student || student.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const [complaintsResult, notifResult] = await Promise.all([
      Complaint.deleteMany({ student: id }),
      Notification.deleteMany({
        $or: [{ recipient: id }, { sender: id }],
      }),
    ]);

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Student ${student.name} deleted successfully`,
      data: {
        deletedComplaints: complaintsResult.deletedCount,
        deletedNotifications: notifResult.deletedCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStaffDeletePreview = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await User.findById(id);
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
      Complaint.countDocuments({
        assignedTo: id,
        status: { $in: ["pending", "in-progress"] },
      }),
      Complaint.countDocuments({ assignedTo: id, status: "resolved" }),
      Complaint.countDocuments({ assignedTo: id, status: "rejected" }),
      Notification.countDocuments({ recipient: id }),
      Notification.countDocuments({ sender: id }),
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
