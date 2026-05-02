const Complaint = require("../models/Complaint");
const User = require("../models/User");

const submitComplaint = async (req, res) => {
  try {
    const { title, description, category, priority, location } = req.body;

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority,
      location,
      student: req.user.id,
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email");

    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAssignedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ assignedTo: req.user.id })
      .sort({ createdAt: -1 })
      .populate("student", "name email");

    const formatted = complaints.map((c) => ({
      _id:             c._id,
      title:           c.title,
      description:     c.description,
      category:        c.category,
      priority:        c.priority,
      location:        c.location,
      status:          c.status,
      rejectionReason: c.rejectionReason,
      studentName:     c.student?.name || "Unknown",
      studentEmail:    c.student?.email || "",
      createdAt:       c.createdAt,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .populate("student", "name email")
      .populate("assignedTo", "name email");

    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const locked = ["resolved", "rejected"];
    if (locked.includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message: "This complaint is locked and cannot be modified",
      });
    }

    if (status === "rejected" && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    complaint.status = status;
    if (status === "rejected") {
      complaint.rejectionReason = rejectionReason;
    }

    await complaint.save();

    const updated = await Complaint.findById(id)
      .populate("student", "name email");

    const formatted = {
      _id:             updated._id,
      title:           updated.title,
      description:     updated.description,
      category:        updated.category,
      priority:        updated.priority,
      location:        updated.location,
      status:          updated.status,
      rejectionReason: updated.rejectionReason,
      studentName:     updated.student?.name || "Unknown",
      studentEmail:    updated.student?.email || "",
      createdAt:       updated.createdAt,
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "staff") {
      return res.status(400).json({ success: false, message: "Invalid staff member" });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { assignedTo: staffId, status: "in-progress" },
      { new: true }
    )
      .populate("student", "name email")
      .populate("assignedTo", "name email");

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStaffStats = async (req, res) => {
  try {
    const staffId = req.user.id;

    const [
      totalAssigned,
      pending,
      inProgress,
      resolved,
      rejected,
    ] = await Promise.all([
      Complaint.countDocuments({ assignedTo: staffId }),
      Complaint.countDocuments({ assignedTo: staffId, status: "pending" }),
      Complaint.countDocuments({ assignedTo: staffId, status: "in-progress" }),
      Complaint.countDocuments({ assignedTo: staffId, status: "resolved" }),
      Complaint.countDocuments({ assignedTo: staffId, status: "rejected" }),
    ]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    const weeklyTrend = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i));
        const start = new Date(date.setHours(0, 0, 0, 0));
        const end   = new Date(date.setHours(23, 59, 59, 999));

        const [assigned, resolvedDay] = await Promise.all([
          Complaint.countDocuments({
            assignedTo: staffId,
            createdAt: { $gte: start, $lte: end },
          }),
          Complaint.countDocuments({
            assignedTo: staffId,
            status: "resolved",
            updatedAt: { $gte: start, $lte: end },
          }),
        ]);

        return { day: days[start.getDay()], assigned, resolved: resolvedDay };
      })
    );

    const statusBreakdown = [
      { name: "Pending",     value: pending,    color: "#f59e0b" },
      { name: "In Progress", value: inProgress, color: "#3b82f6" },
      { name: "Resolved",    value: resolved,   color: "#10b981" },
      { name: "Rejected",    value: rejected,   color: "#ef4444" },
    ];

    res.json({
      success: true,
      data: {
        totalAssigned,
        pending,
        inProgress,
        resolved,
        rejected,
        weeklyTrend,
        statusBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const [total, pending, resolved, inProgress] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: "resolved" }),
      Complaint.countDocuments({ status: "in-progress" }),
    ]);

    res.json({
      success: true,
      data: { total, pending, resolved, inProgress },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStaffList = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" }).select("name email");
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  submitComplaint,
  getMyComplaints,
  getAssignedComplaints,
  getAllComplaints,
  updateComplaintStatus,
  assignComplaint,
  getStaffStats,
  getAdminStats,
  getStaffList,
};