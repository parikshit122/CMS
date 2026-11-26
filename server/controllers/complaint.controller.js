const {
  isValidId,
  findUserById,
  findUsersByRole,
} = require("../../src/db/users.ts");
const {
  createComplaint,
  findComplaintById,
  findComplaintsByStudent,
  findComplaintsByStaff,
  findAllComplaints,
  updateComplaintById,
  countComplaints,
  getAverageResolutionHours,
  getCategoryBreakdown,
  rateComplaintById,
  countOverdueComplaints,
  getSatisfactionMetrics,
} = require("../../src/db/complaints.ts");
const {
  addComplaintActivity,
  getComplaintActivities,
} = require("../../src/db/activities.ts");
const {
  incrementQrSpotComplaintCount,
  getAvishkarAdminExtras,
} = require("../../src/db/avishkar.ts");
const { getSettingsSingleton } = require("../../src/db/settings.ts");
const {
  sendComplaintSubmittedEmail,
  sendComplaintStatusUpdateEmail,
  sendComplaintAssignedEmail,
} = require("../services/email.service");
const {
  notifyComplaintSubmitted,
  notifyComplaintResolved,
  notifyComplaintRejected,
  notifyComplaintInProgress,
  notifyComplaintComment,
  notifyComplaintRated,
} = require("../services/notification.service");

const canAccessComplaint = (user, complaint) => {
  if (!user || !complaint) return false;
  if (user.role === "admin") return true;
  const studentOwnerId = complaint.student?._id ?? String(complaint.studentId);
  const assignedStaffId =
    complaint.assignedTo?._id ??
    (complaint.assignedToId ? String(complaint.assignedToId) : null);

  if (user.role === "user") {
    return String(studentOwnerId) === String(user._id);
  }
  if (user.role === "staff") {
    return assignedStaffId !== null && String(assignedStaffId) === String(user._id);
  }
  return false;
};

const submitComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      location,
      sourceChannel,
      qrSpotCode,
      originalLanguage,
      originalTranscript,
      aiCategory,
      aiPriority,
      aiSummary,
      aiConfidence,
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and category are required.",
      });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      const { uploadToCloudinary } = require("../services/cloudinary.service");
      try {
        const uploaded = await Promise.all(
          req.files.map((file) =>
            uploadToCloudinary(file.buffer, {
              folder: "complaint-sync/complaints",
              public_id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            })
          )
        );
        attachments = uploaded.map((result, i) => ({
          url: result.secure_url,
          publicId: result.public_id,
          originalName: req.files[i].originalname,
          mimeType: req.files[i].mimetype,
          size: req.files[i].size,
        }));
      } catch (uploadErr) {
        console.error("[submitComplaint] Attachment upload failed:", uploadErr.message);
      }
    }

    const normalizedChannel = ["web", "qr", "voice"].includes(sourceChannel)
      ? sourceChannel
      : qrSpotCode
        ? "qr"
        : "web";

    const normalizedLang = ["en", "mr", "hi"].includes(originalLanguage)
      ? originalLanguage
      : "en";

    const parsedConfidence =
      aiConfidence !== undefined && aiConfidence !== "" && !Number.isNaN(Number(aiConfidence))
        ? Math.min(99, Math.max(0, Math.round(Number(aiConfidence))))
        : null;

    const complaint = await createComplaint({
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase().trim(),
      priority: priority || "medium",
      location: location?.trim() || null,
      studentId: req.user.id,
      attachments,
      sourceChannel: normalizedChannel,
      qrSpotCode: qrSpotCode ? String(qrSpotCode).trim().toUpperCase() : null,
      originalLanguage: normalizedLang,
      originalTranscript: originalTranscript ? String(originalTranscript).trim() : null,
      aiCategory: aiCategory ? String(aiCategory).toLowerCase().trim() : null,
      aiPriority: aiPriority ? String(aiPriority).toLowerCase().trim() : null,
      aiSummary: aiSummary ? String(aiSummary).trim() : null,
      aiConfidence: parsedConfidence,
      isDemoRecord: Boolean(req.user?.isDemo),
    });

    if (complaint.qrSpotCode) {
      incrementQrSpotComplaintCount(complaint.qrSpotCode).catch(() => {});
    }

    try {
      await addComplaintActivity({
        complaintId: complaint.id,
        authorId: req.user.id,
        authorName: req.user.name || "Student",
        authorRole: req.user.role || "user",
        kind: "submitted",
        body: `Complaint submitted under ${complaint.category} (${complaint.priority} priority).`,
        meta: {
          category: complaint.category,
          priority: complaint.priority,
          slaDueAt: complaint.slaDueAt,
        },
      });
    } catch (actErr) {
      console.error("[submitComplaint] Activity log failed:", actErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully.",
      data: complaint,
    });

    (async () => {
      try {
        await notifyComplaintSubmitted(complaint, req.user, req.app);
      } catch (notifyErr) {
        console.error("[submitComplaint] Admin notification failed:", notifyErr.message);
      }
      try {
        const settings = await getSettingsSingleton();
        if (settings.emailEnabled && settings.notifyOnSubmit && req.user.email) {
          await sendComplaintSubmittedEmail(req.user, complaint, settings.emailSenderName);
        }
      } catch (emailErr) {
        console.error("[submitComplaint] Email failed:", emailErr.message);
      }
    })();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID." });
    }

    const complaint = await findComplaintById(id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const studentOwnerId = complaint.student?._id ?? String(complaint.studentId);
    const assignedStaffId = complaint.assignedTo?._id ?? (complaint.assignedToId ? String(complaint.assignedToId) : null);

    if (req.user.role === "user" && String(studentOwnerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    if (req.user.role === "staff" && String(assignedStaffId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await findComplaintsByStudent(req.user.id);
    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAssignedComplaints = async (req, res) => {
  try {
    const complaints = await findComplaintsByStaff(req.user.id);
    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 100);

    let fromDate;
    let toDate;
    if (req.query.from) {
      const from = new Date(req.query.from);
      if (!Number.isNaN(from.getTime())) fromDate = from;
    }
    if (req.query.to) {
      const to = new Date(req.query.to);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        toDate = to;
      }
    }

    const overdueFlag =
      req.query.overdue === "true" || req.query.overdue === "1";

    const { complaints, total } = await findAllComplaints({
      page,
      limit,
      status: req.query.status ? String(req.query.status) : undefined,
      priority: req.query.priority ? String(req.query.priority) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      overdue: overdueFlag,
      from: fromDate,
      to: toDate,
    });

    res.json({
      success: true,
      data: complaints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { status, note, rejectionReason } = req.body;

    const validStatuses = ["pending", "in-progress", "resolved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID." });
    }

    const complaint = await findComplaintById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (req.user.role === "staff" && String(complaint.assignedToId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this complaint.",
      });
    }

    if (complaint.status === "resolved") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a resolved complaint (locked).",
      });
    }

    if (status === "rejected" && (!rejectionReason || !String(rejectionReason).trim())) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required.",
      });
    }

    const oldStatus = complaint.status;
    const updated = await updateComplaintById(req.params.id, {
      status,
      ...(rejectionReason ? { rejectionReason: String(rejectionReason).trim() } : {}),
    });

    const app = req.app;
    if (oldStatus !== status) {
      try {
        const reasonSuffix =
          status === "rejected" && rejectionReason
            ? ` — Reason: ${String(rejectionReason).trim()}`
            : note
              ? ` — ${String(note).trim()}`
              : "";
        await addComplaintActivity({
          complaintId: updated.id,
          authorId: req.user.id,
          authorName: req.user.name || "Staff",
          authorRole: req.user.role || "staff",
          kind: "status_change",
          body: `Status changed from ${oldStatus} to ${status}${reasonSuffix}`,
          meta: { from: oldStatus, to: status },
        });
      } catch (actErr) {
        console.error("[updateStatus] Activity log failed:", actErr.message);
      }

      try {
        if (status === "resolved") {
          await notifyComplaintResolved(updated, updated.student, req.user, app, note || "");
        } else if (status === "rejected") {
          await notifyComplaintRejected(updated, updated.student, req.user, app);
        } else if (status === "in-progress") {
          await notifyComplaintInProgress(updated, updated.student, req.user, app);
        }
      } catch (notifyErr) {
        console.error("[updateStatus] Notification failed:", notifyErr.message);
      }
    }

    res.json({
      success: true,
      message: `Complaint status updated to ${status}.`,
      data: updated,
    });

    if (oldStatus === status || status === "resolved" || status === "rejected") return;

    (async () => {
      try {
        const settings = await getSettingsSingleton();
        const student = updated.student;
        if (!settings.emailEnabled || !student?.email) return;
        await sendComplaintStatusUpdateEmail(
          student,
          updated,
          oldStatus,
          note || "",
          settings.emailSenderName
        );
      } catch (emailErr) {
        console.error("[updateStatus] Status email failed:", emailErr.message);
      }
    })();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

const assignComplaint = async (req, res) => {
  try {
    const { staffId } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID." });
    }
    if (!staffId || !isValidId(staffId)) {
      return res.status(400).json({ success: false, message: "Valid staffId is required." });
    }

    const complaint = await findComplaintById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const staff = await findUserById(staffId);
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    const updated = await updateComplaintById(req.params.id, {
      assignedToId: staff.id,
      ...(complaint.status === "pending" ? { status: "in-progress" } : {}),
    });

    try {
      await addComplaintActivity({
        complaintId: updated.id,
        authorId: req.user.id,
        authorName: req.user.name || "Admin",
        authorRole: req.user.role || "admin",
        kind: "assignment",
        body: `Assigned complaint to ${staff.name}.`,
        meta: { staffId: staff.id, staffName: staff.name },
      });
    } catch (actErr) {
      console.error("[assignComplaint] Activity log failed:", actErr.message);
    }

    res.json({
      success: true,
      message: `Complaint assigned to ${staff.name}.`,
      data: updated,
    });

    (async () => {
      try {
        const settings = await getSettingsSingleton();
        if (settings.emailEnabled && settings.notifyOnAssign && staff.email) {
          await sendComplaintAssignedEmail(staff, updated, settings.emailSenderName);
        }
      } catch (emailErr) {
        console.error("[assignComplaint] Email failed:", emailErr.message);
      }
    })();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

const getStaffStats = async (req, res) => {
  try {
    const staffId = req.user.id;

    const [totalAssigned, pending, inProgress, resolved, rejected, overdueCount] =
      await Promise.all([
        countComplaints({ assignedToId: staffId }),
        countComplaints({ assignedToId: staffId, status: "pending" }),
        countComplaints({ assignedToId: staffId, status: "in-progress" }),
        countComplaints({ assignedToId: staffId, status: "resolved" }),
        countComplaints({ assignedToId: staffId, status: "rejected" }),
        countOverdueComplaints(staffId),
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
      countComplaints({ assignedToId: staffId, createdFrom: startThisWeek, createdTo: now }),
      countComplaints({ assignedToId: staffId, createdFrom: startPrevWeek, createdTo: endPrevWeek }),
      countComplaints({ assignedToId: staffId, status: "pending", createdFrom: startThisWeek, createdTo: now }),
      countComplaints({ assignedToId: staffId, status: "pending", createdFrom: startPrevWeek, createdTo: endPrevWeek }),
      countComplaints({ assignedToId: staffId, status: "in-progress", updatedFrom: startThisWeek, updatedTo: now }),
      countComplaints({ assignedToId: staffId, status: "in-progress", updatedFrom: startPrevWeek, updatedTo: endPrevWeek }),
      countComplaints({ assignedToId: staffId, status: "resolved", updatedFrom: startThisWeek, updatedTo: now }),
      countComplaints({ assignedToId: staffId, status: "resolved", updatedFrom: startPrevWeek, updatedTo: endPrevWeek }),
      countComplaints({ assignedToId: staffId, status: "rejected", updatedFrom: startThisWeek, updatedTo: now }),
      countComplaints({ assignedToId: staffId, status: "rejected", updatedFrom: startPrevWeek, updatedTo: endPrevWeek }),
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
          countComplaints({ assignedToId: staffId, createdFrom: start, createdTo: end }),
          countComplaints({ assignedToId: staffId, status: "resolved", updatedFrom: start, updatedTo: end }),
        ]);

        return { day: days[start.getDay()], assigned, resolved: resolvedDay };
      })
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
        overdueCount,
        weeklyTrend,
        statusBreakdown,
        trendMeta: {
          totalAssigned: { current: assignedThisWeek, previous: assignedPrevWeek },
          pending: { current: pendingThisWeek, previous: pendingPrevWeek },
          inProgress: { current: inProgressThisWeek, previous: inProgressPrevWeek },
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
      999
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
      avgResponseTime,
      avgResponseThis,
      avgResponsePrev,
      overdueCount,
      satisfaction,
    ] = await Promise.all([
      countComplaints(),
      countComplaints({ status: "pending" }),
      countComplaints({ status: "resolved" }),
      countComplaints({ status: "in-progress" }),
      countComplaints({ createdFrom: startThisMonth, createdTo: now }),
      countComplaints({ createdFrom: startPrevMonth, createdTo: endPrevMonth }),
      countComplaints({ status: "pending", createdFrom: startThisMonth, createdTo: now }),
      countComplaints({ status: "pending", createdFrom: startPrevMonth, createdTo: endPrevMonth }),
      countComplaints({ status: "resolved", updatedFrom: startThisMonth, updatedTo: now }),
      countComplaints({ status: "resolved", updatedFrom: startPrevMonth, updatedTo: endPrevMonth }),
      getAverageResolutionHours(),
      getAverageResolutionHours({ from: startThisMonth, to: now }),
      getAverageResolutionHours({ from: startPrevMonth, to: endPrevMonth }),
      countOverdueComplaints(),
      getSatisfactionMetrics(),
    ]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const weeklyData = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - i));
        const start = new Date(date.setHours(0, 0, 0, 0));
        const end = new Date(date.setHours(23, 59, 59, 999));

        const [submitted, resolvedCount] = await Promise.all([
          countComplaints({ createdFrom: start, createdTo: end }),
          countComplaints({ status: "resolved", updatedFrom: start, updatedTo: end }),
        ]);

        return {
          day: days[start.getDay()],
          submitted,
          resolved: resolvedCount,
        };
      })
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
          999
        );

        const value = await countComplaints({ createdFrom: start, createdTo: end });

        return {
          month: start.toLocaleString("default", { month: "short" }),
          value,
        };
      })
    );

    const categoryResult = await getCategoryBreakdown();

    const iconMap = {
      technical: "bx bx-cog",
      it: "bx bx-laptop",
      software: "bx bx-code-alt",
      hardware: "bx bx-chip",
      network: "bx bx-wifi",
      internet: "bx bx-globe",
      infrastructure: "bx bx-buildings",
      electrical: "bx bxs-bolt",
      plumbing: "bx bx-droplet",
      cleanliness: "bx bxs-spray-can",
      maintenance: "bx bx-wrench",
      hostel: "bx bxs-home-heart",
      accommodation: "bx bxs-bed",
      food: "bx bxs-bowl-rice",
      mess: "bx bxs-dish",
      academic: "bx bxs-graduation",
      exam: "bx bxs-edit",
      faculty: "bx bxs-user-voice",
      library: "bx bxs-book-reader",
      service: "bx bxs-bell",
      billing: "bx bxs-credit-card",
      payment: "bx bxs-wallet",
      transport: "bx bxs-bus",
      parking: "bx bxs-car",
      safety: "bx bxs-shield",
      security: "bx bxs-lock-alt",
      medical: "bx bxs-first-aid",
      emergency: "bx bxs-error-circle",
      noise: "bx bxs-volume-full",
      harassment: "bx bxs-user-x",
      feedback: "bx bxs-message-rounded-dots",
      other: "bx bxs-category",
    };

    const categoryBreakdown = categoryResult.map((item) => ({
      label: item.category || "Other",
      value: item.value,
      icon: iconMap[(item.category || "other").toLowerCase()] || "bx bxs-category",
    }));

    const avishkarExtras = await getAvishkarAdminExtras();

    res.json({
      success: true,
      data: {
        totalComplaints,
        pending,
        resolved,
        inProgress,
        avgResponseTime,
        overdueCount,
        satisfaction,
        weeklyData,
        monthlyData,
        categoryBreakdown,
        avishkar: avishkarExtras,
        trendMeta: {
          totalComplaints: { current: totalThisMonth, previous: totalPrevMonth },
          pending: { current: pendingThisMonth, previous: pendingPrevMonth },
          resolved: { current: resolvedThisMonth, previous: resolvedPrevMonth },
          avgResponseTime: { current: avgResponseThis, previous: avgResponsePrev },
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
    const staff = await findUsersByRole("staff");
    res.json({
      success: true,
      data: staff.map((s) => ({ _id: s._id, id: s.id, name: s.name, email: s.email })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getComplaintActivitiesController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID." });
    }

    const complaint = await findComplaintById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (!canAccessComplaint(req.user, complaint)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const activities = await getComplaintActivities(complaint.id);
    const hasSubmitted = activities.some((a) => a.kind === "submitted");
    const timeline = hasSubmitted
      ? activities
      : [
          {
            _id: `submitted-${complaint.id}`,
            id: 0,
            complaintId: complaint.id,
            authorId: complaint.studentId,
            authorName: complaint.student?.name || "Student",
            authorRole: "user",
            kind: "submitted",
            body: `Complaint submitted under ${complaint.category} (${complaint.priority} priority).`,
            meta: { synthetic: true },
            createdAt: complaint.createdAt,
          },
          ...activities,
        ];

    res.json({ success: true, data: timeline });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addComplaintCommentController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID." });
    }

    const rawBody = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!rawBody) {
      return res.status(400).json({ success: false, message: "Comment cannot be empty." });
    }
    if (rawBody.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment must be 1000 characters or fewer.",
      });
    }

    const complaint = await findComplaintById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (!canAccessComplaint(req.user, complaint)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const activity = await addComplaintActivity({
      complaintId: complaint.id,
      authorId: req.user.id,
      authorName: req.user.name || "User",
      authorRole: req.user.role || "user",
      kind: "comment",
      body: rawBody,
      meta: {},
    });

    res.status(201).json({
      success: true,
      message: "Comment added.",
      data: activity,
    });

    (async () => {
      try {
        await notifyComplaintComment(complaint, req.user, rawBody, req.app);
      } catch (notifyErr) {
        console.error("[addComment] Notification failed:", notifyErr.message);
      }
    })();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

const rateComplaintController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID." });
    }

    const parsedRating = Number(req.body?.rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5.",
      });
    }

    const feedback =
      typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "";
    if (feedback.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Feedback must be 500 characters or fewer.",
      });
    }

    const complaint = await findComplaintById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const studentOwnerId = complaint.student?._id ?? String(complaint.studentId);
    if (String(studentOwnerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the student who submitted this complaint can rate it.",
      });
    }

    if (complaint.status !== "resolved") {
      return res.status(400).json({
        success: false,
        message: "Only resolved complaints can be rated.",
      });
    }

    const updated = await rateComplaintById(complaint.id, parsedRating, feedback || null);

    try {
      await addComplaintActivity({
        complaintId: complaint.id,
        authorId: req.user.id,
        authorName: req.user.name || "Student",
        authorRole: "user",
        kind: "rating",
        body: feedback
          ? `Rated ${parsedRating}/5 stars — "${feedback}"`
          : `Rated resolution ${parsedRating}/5 stars.`,
        meta: { rating: parsedRating },
      });
    } catch (actErr) {
      console.error("[rateComplaint] Activity log failed:", actErr.message);
    }

    res.json({
      success: true,
      message: "Thank you for your feedback!",
      data: updated,
    });

    (async () => {
      try {
        await notifyComplaintRated(updated, req.user, parsedRating, req.app);
      } catch (notifyErr) {
        console.error("[rateComplaint] Notification failed:", notifyErr.message);
      }
    })();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = {
  submitComplaint,
  getComplaintById,
  getMyComplaints,
  getAssignedComplaints,
  getAllComplaints,
  updateComplaintStatus,
  assignComplaint,
  getStaffStats,
  getAdminStats,
  getStaffList,
  getComplaintActivitiesController,
  addComplaintCommentController,
  rateComplaintController,
};
