const Complaint = require("../models/Complaint");
const User = require("../models/User");
const {
  notifyComplaintSubmitted,
  notifyComplaintAssigned,
  notifyComplaintResolved,
  notifyComplaintRejected,
  notifyComplaintInProgress,
} = require("../services/notification.service");

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

    const student = await User.findById(req.user.id);
    await notifyComplaintSubmitted(complaint, student);

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
      _id: c._id,
      complaintId: c.complaintId,
      title: c.title,
      description: c.description,
      category: c.category,
      priority: c.priority,
      location: c.location,
      status: c.status,
      rejectionReason: c.rejectionReason,
      studentName: c.student?.name || "Unknown",
      studentEmail: c.student?.email || "",
      createdAt: c.createdAt,
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
      .populate("student", "name email phone course year")
      .populate("assignedTo", "name email phone category");

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
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
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
      .populate("student", "name email")
      .populate("assignedTo", "name email");

    const staff = await User.findById(req.user.id);
    const student = updated.student;

    if (status === "resolved") {
      await notifyComplaintResolved(updated, student, staff);
    } else if (status === "rejected") {
      await notifyComplaintRejected(updated, student, staff);
    } else if (status === "in-progress") {
      await notifyComplaintInProgress(updated, student, staff);
    }

    const formatted = {
      _id: updated._id,
      complaintId: updated.complaintId,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      priority: updated.priority,
      location: updated.location,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      studentName: updated.student?.name || "Unknown",
      studentEmail: updated.student?.email || "",
      createdAt: updated.createdAt,
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
      return res.status(400).json({
        success: false,
        message: "Invalid staff member",
      });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { assignedTo: staffId, status: "in-progress" },
      { new: true },
    )
      .populate("student", "name email")
      .populate("assignedTo", "name email");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    await notifyComplaintAssigned(complaint, complaint.student, staff);

    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStaffStats = async (req, res) => {
  try {
    const staffId = req.user.id;

    const [totalAssigned, pending, inProgress, resolved, rejected] =
      await Promise.all([
        Complaint.countDocuments({ assignedTo: staffId }),
        Complaint.countDocuments({ assignedTo: staffId, status: "pending" }),
        Complaint.countDocuments({
          assignedTo: staffId,
          status: "in-progress",
        }),
        Complaint.countDocuments({ assignedTo: staffId, status: "resolved" }),
        Complaint.countDocuments({ assignedTo: staffId, status: "rejected" }),
      ]);

    const now = new Date();
    const startThisWeek = new Date(now);
    startThisWeek.setDate(startThisWeek.getDate() - 6);
    startThisWeek.setHours(0, 0, 0, 0);

    const endPrevWeek = new Date(startThisWeek.getTime() - 1);
    const startPrevWeek = new Date(startThisWeek);
    startPrevWeek.setDate(startPrevWeek.getDate() - 7);
    startPrevWeek.setHours(0, 0, 0, 0);

    const [
      assignedThisWeek,
      assignedPrevWeek,
      pendingThisWeek,
      pendingPrevWeek,
      inProgressThisWeek,
      inProgressPrevWeek,
      resolvedThisWeek,
      resolvedPrevWeek,
      rejectedThisWeek,
      rejectedPrevWeek,
    ] = await Promise.all([
      Complaint.countDocuments({
        assignedTo: staffId,
        createdAt: { $gte: startThisWeek, $lte: now },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        createdAt: { $gte: startPrevWeek, $lte: endPrevWeek },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "pending",
        createdAt: { $gte: startThisWeek, $lte: now },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "pending",
        createdAt: { $gte: startPrevWeek, $lte: endPrevWeek },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "in-progress",
        updatedAt: { $gte: startThisWeek, $lte: now },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "in-progress",
        updatedAt: { $gte: startPrevWeek, $lte: endPrevWeek },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "resolved",
        updatedAt: { $gte: startThisWeek, $lte: now },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "resolved",
        updatedAt: { $gte: startPrevWeek, $lte: endPrevWeek },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "rejected",
        updatedAt: { $gte: startThisWeek, $lte: now },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "rejected",
        updatedAt: { $gte: startPrevWeek, $lte: endPrevWeek },
      }),
    ]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    const weeklyTrend = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i));
        const start = new Date(date.setHours(0, 0, 0, 0));
        const end = new Date(date.setHours(23, 59, 59, 999));

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
      }),
    );

    const statusBreakdown = [
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "In Progress", value: inProgress, color: "#3b82f6" },
      { name: "Resolved", value: resolved, color: "#10b981" },
      { name: "Rejected", value: rejected, color: "#ef4444" },
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
        trendMeta: {
          totalAssigned: {
            current: assignedThisWeek,
            previous: assignedPrevWeek,
          },
          pending: { current: pendingThisWeek, previous: pendingPrevWeek },
          inProgress: {
            current: inProgressThisWeek,
            previous: inProgressPrevWeek,
          },
          resolved: { current: resolvedThisWeek, previous: resolvedPrevWeek },
          rejected: { current: rejectedThisWeek, previous: rejectedPrevWeek },
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const now = new Date();

    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrevMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const [
      totalComplaints,
      pending,
      resolved,
      inProgress,
      totalThisMonth,
      totalPrevMonth,
      pendingThisMonth,
      pendingPrevMonth,
      resolvedThisMonth,
      resolvedPrevMonth,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: "resolved" }),
      Complaint.countDocuments({ status: "in-progress" }),
      Complaint.countDocuments({
        createdAt: { $gte: startThisMonth, $lte: now },
      }),
      Complaint.countDocuments({
        createdAt: { $gte: startPrevMonth, $lte: endPrevMonth },
      }),
      Complaint.countDocuments({
        status: "pending",
        createdAt: { $gte: startThisMonth, $lte: now },
      }),
      Complaint.countDocuments({
        status: "pending",
        createdAt: { $gte: startPrevMonth, $lte: endPrevMonth },
      }),
      Complaint.countDocuments({
        status: "resolved",
        updatedAt: { $gte: startThisMonth, $lte: now },
      }),
      Complaint.countDocuments({
        status: "resolved",
        updatedAt: { $gte: startPrevMonth, $lte: endPrevMonth },
      }),
    ]);

    const avgResponseThisMonth = await Complaint.aggregate([
      {
        $match: {
          status: "resolved",
          updatedAt: { $gte: startThisMonth, $lte: now },
        },
      },
      {
        $project: { responseTime: { $subtract: ["$updatedAt", "$createdAt"] } },
      },
      { $group: { _id: null, avg: { $avg: "$responseTime" } } },
    ]);

    const avgResponsePrevMonth = await Complaint.aggregate([
      {
        $match: {
          status: "resolved",
          updatedAt: { $gte: startPrevMonth, $lte: endPrevMonth },
        },
      },
      {
        $project: { responseTime: { $subtract: ["$updatedAt", "$createdAt"] } },
      },
      { $group: { _id: null, avg: { $avg: "$responseTime" } } },
    ]);

    const avgResponseAll = await Complaint.aggregate([
      {
        $match: { status: "resolved" },
      },
      {
        $project: { responseTime: { $subtract: ["$updatedAt", "$createdAt"] } },
      },
      { $group: { _id: null, avg: { $avg: "$responseTime" } } },
    ]);

    const toHours = (ms) =>
      ms ? Number((ms / (1000 * 60 * 60)).toFixed(1)) : 0;

    const avgResponseTime = toHours(avgResponseAll[0]?.avg);
    const avgResponseThis = toHours(avgResponseThisMonth[0]?.avg);
    const avgResponsePrev = toHours(avgResponsePrevMonth[0]?.avg);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const weeklyData = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - i));
        const start = new Date(date.setHours(0, 0, 0, 0));
        const end = new Date(date.setHours(23, 59, 59, 999));

        const [submitted, resolvedCount] = await Promise.all([
          Complaint.countDocuments({ createdAt: { $gte: start, $lte: end } }),
          Complaint.countDocuments({
            status: "resolved",
            updatedAt: { $gte: start, $lte: end },
          }),
        ]);

        return {
          day: days[start.getDay()],
          submitted,
          resolved: resolvedCount,
        };
      }),
    );

    const monthlyData = await Promise.all(
      Array.from({ length: 6 }).map(async (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        const value = await Complaint.countDocuments({
          createdAt: { $gte: start, $lte: end },
        });

        return {
          month: start.toLocaleString("default", { month: "short" }),
          value,
        };
      }),
    );

    const categoryResult = await Complaint.aggregate([
      { $group: { _id: "$category", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]);

    const iconMap = {
      // Technical & IT
      technical: "bx bx-cog",
      it: "bx bx-laptop",
      software: "bx bx-code-alt",
      hardware: "bx bx-chip",
      network: "bx bx-wifi",
      internet: "bx bx-globe",

      // Facilities
      infrastructure: "bx bx-buildings",
      electrical: "bx bxs-bolt",
      plumbing: "bx bx-droplet",
      cleanliness: "bx bxs-spray-can",
      maintenance: "bx bx-wrench",

      // Living
      hostel: "bx bxs-home-heart",
      accommodation: "bx bxs-bed",
      food: "bx bxs-bowl-rice",
      mess: "bx bxs-dish",

      // Academic
      academic: "bx bxs-graduation",
      exam: "bx bxs-edit",
      faculty: "bx bxs-user-voice",
      library: "bx bxs-book-reader",

      // Services
      service: "bx bxs-bell",
      billing: "bx bxs-credit-card",
      payment: "bx bxs-wallet",
      transport: "bx bxs-bus",
      parking: "bx bxs-car",

      // Safety & Security
      safety: "bx bxs-shield",
      security: "bx bxs-lock-alt",
      medical: "bx bxs-first-aid",
      emergency: "bx bxs-error-circle",

      // Misc
      noise: "bx bxs-volume-full",
      harassment: "bx bxs-user-x",
      feedback: "bx bxs-message-rounded-dots",
      other: "bx bxs-category",
    };

    const categoryBreakdown = categoryResult.map((item) => ({
      label: item._id || "Other",
      value: item.value,
      icon: iconMap[(item._id || "other").toLowerCase()] || "bx bxs-category",
    }));

    res.json({
      success: true,
      data: {
        totalComplaints,
        pending,
        resolved,
        inProgress,
        avgResponseTime,
        weeklyData,
        monthlyData,
        categoryBreakdown,
        trendMeta: {
          totalComplaints: {
            current: totalThisMonth,
            previous: totalPrevMonth,
          },
          pending: { current: pendingThisMonth, previous: pendingPrevMonth },
          resolved: { current: resolvedThisMonth, previous: resolvedPrevMonth },
          avgResponseTime: {
            current: avgResponseThis,
            previous: avgResponsePrev,
          },
        },
        lastUpdated: now,
      },
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
