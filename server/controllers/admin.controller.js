const User = require("../models/User");
const Complaint = require("../models/Complaint");
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
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  return password;
};

const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      students.map(async (s) => {
        const totalComplaints = await Complaint.countDocuments({ student: s._id });
        const isSuspended = s.suspendedUntil && new Date(s.suspendedUntil) > new Date();

        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          course: s.course,
          year: s.year,
          avatar: s.avatar,
          createdAt: s.createdAt,
          totalComplaints,
          isSuspended,
          suspendedUntil: s.suspendedUntil,
          status: isSuspended
            ? "suspended"
            : s.isActive === false
              ? "inactive"
              : "active",
        };
      }),
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      staff.map(async (s) => {
        const [assigned, resolved] = await Promise.all([
          Complaint.countDocuments({ assignedTo: s._id }),
          Complaint.countDocuments({ assignedTo: s._id, status: "resolved" }),
        ]);

        return { ...s, assignedCount: assigned, resolvedCount: resolved };
      }),
    );

    res.json({ success: true, data: enriched });
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
    });

    let emailResult = { success: false, skipped: true };
    try {
      emailResult = await sendStaffWelcomeEmail(staff, finalPassword);
    } catch (e) {
      console.error("Email failed:", e.message);
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

    const activeAssignments = await Complaint.countDocuments({
      assignedTo: id,
      status: { $in: ["pending", "in-progress"] },
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. Staff has ${activeAssignments} active complaint(s) assigned.`,
      });
    }

    await User.findByIdAndDelete(id);

    res.json({ success: true, message: "Staff deleted successfully" });
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

const getStaffByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const staff = await User.find({ role: "staff", category })
      .select("name email category")
      .lean();

    const enriched = await Promise.all(
      staff.map(async (s) => {
        const activeCount = await Complaint.countDocuments({
          assignedTo: s._id,
          status: { $in: ["pending", "in-progress"] },
        });
        return { ...s, activeCount };
      }),
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const assignStaffToComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const complaint = await Complaint.findById(id).populate("student", "name email");
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
    const oldStaff = oldStaffId
      ? await User.findById(oldStaffId)
      : null;

    const isReassignment = oldStaffId &&
      oldStaffId.toString() !== staffId.toString();

    complaint.assignedTo = staffId;
    if (complaint.status === "pending") {
      complaint.status = "in-progress";
    }
    await complaint.save();

    const updated = await Complaint.findById(id)
      .populate("student", "name email")
      .populate("assignedTo", "name email category");

    if (isReassignment) {
      await notifyComplaintReassigned(complaint, oldStaff, newStaff);
    } else {
      await notifyComplaintAssigned(complaint, complaint.student, newStaff);
    }

    res.json({
      success: true,
      message: "Staff assigned successfully",
      data: updated,
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

    const Notification = require("../models/Notification");

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

    const Notification = require("../models/Notification");

    const [complaintsResult, notifReceivedResult, notifSentResult] =
      await Promise.all([
        Complaint.deleteMany({ student: id }),
        Notification.deleteMany({ recipient: id }),
        Notification.deleteMany({ sender: id }),
      ]);

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Student ${student.name} deleted successfully`,
      data: {
        deletedComplaints: complaintsResult.deletedCount,
        deletedNotifications:
          notifReceivedResult.deletedCount + notifSentResult.deletedCount,
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
};