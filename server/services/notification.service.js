const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  sender    = null,
  type,
  title,
  message,
  complaint = null,
  app       = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      complaint,
    });

    // ── Emit real-time socket event ───────────────────────
    if (app) {
      const { emitToUser } = require("../utils/socketEmitter");
      emitToUser(app, recipient, "new_notification", {
        _id:       notification._id,
        type,
        title,
        message,
        complaint,
        sender,
        isRead:    false,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    console.error("Notification creation error:", err.message);
    return null;
  }
};

const getSettings = async () => {
  try {
    const Settings = require("../models/Settings");
    return await Settings.getSingleton();
  } catch {
    return {
      notifyOnSubmit:  true,
      notifyOnAssign:  true,
      notifyOnResolve: true,
      emailEnabled:    true,
      emailSenderName: "ComplaintSync",
    };
  }
};

// ── Helper: send email silently ───────────────────────────
const trySendEmail = async (emailFn, ...args) => {
  try {
    await emailFn(...args);
  } catch (err) {
    console.error("Email send failed (non-fatal):", err.message);
  }
};

// ── Notify admins when complaint is submitted ─────────────
const notifyComplaintSubmitted = async (complaint, student, app = null) => {
  const settings = await getSettings();
  if (!settings.notifyOnSubmit) return;

  const User   = require("../models/User");
  const admins = await User.find({ role: "admin" }).select("_id");

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        recipient: admin._id,
        sender:    student._id,
        type:      "complaint_submitted",
        title:     "New Complaint Submitted",
        message:   `${student.name} submitted: "${complaint.title}"`,
        complaint: complaint._id,
        app,
      })
    )
  );
};

const notifyComplaintAssigned = async (complaint, student, staff, app = null) => {
  const settings = await getSettings();
  if (!settings.notifyOnAssign) return;

  const {
    sendComplaintAssignedEmail,
  } = require("./email.service");

  await Promise.all([
    // DB notification — student
    createNotification({
      recipient: student._id,
      sender:    null,
      type:      "complaint_assigned",
      title:     "Complaint Assigned",
      message:   `Your complaint "${complaint.title}" has been assigned to ${staff.name}.`,
      complaint: complaint._id,
      app,
    }),
    // DB notification — staff
    createNotification({
      recipient: staff._id,
      sender:    null,
      type:      "complaint_assigned",
      title:     "New Complaint Assigned",
      message:   `You have been assigned: "${complaint.title}"`,
      complaint: complaint._id,
      app,
    }),
    settings.emailEnabled
      ? trySendEmail(
          sendComplaintAssignedEmail,
          student,
          complaint,
          staff,
          settings.emailSenderName
        )
      : Promise.resolve(),
  ]);
};

// ── Notify student + admins when resolved ─────────────────
const notifyComplaintResolved = async (complaint, student, staff, app = null) => {
  const settings = await getSettings();
  if (!settings.notifyOnResolve) return;

  const {
    sendComplaintResolvedEmail,
  } = require("./email.service");

  const User   = require("../models/User");
  const admins = await User.find({ role: "admin" }).select("_id");

  await Promise.all([
    // DB notification — student
    createNotification({
      recipient: student._id,
      sender:    staff._id,
      type:      "complaint_resolved",
      title:     "Complaint Resolved",
      message:   `Your complaint "${complaint.title}" has been resolved.`,
      complaint: complaint._id,
      app,
    }),
    // DB notifications — all admins
    ...admins.map((admin) =>
      createNotification({
        recipient: admin._id,
        sender:    staff._id,
        type:      "complaint_resolved",
        title:     "Complaint Resolved",
        message:   `${staff.name} resolved: "${complaint.title}"`,
        complaint: complaint._id,
        app,
      })
    ),
    // Email — student only
    settings.emailEnabled
      ? trySendEmail(
          sendComplaintResolvedEmail,
          student,
          complaint,
          staff,
          settings.emailSenderName
        )
      : Promise.resolve(),
  ]);
};

// ── Notify student when rejected ──────────────────────────
// Always notify on rejection — student must know
const notifyComplaintRejected = async (complaint, student, rejectedBy, app = null) => {
  const settings = await getSettings();

  const {
    sendComplaintRejectedEmail,
  } = require("./email.service");

  const User   = require("../models/User");
  const admins = await User.find({ role: "admin" }).select("_id");

  await Promise.all([
    // DB notification — student
    createNotification({
      recipient: student._id,
      sender:    rejectedBy._id,
      type:      "complaint_rejected",
      title:     "Complaint Rejected",
      message:   `Your complaint "${complaint.title}" was rejected. Reason: ${
        complaint.rejectionReason || "No reason provided"
      }`,
      complaint: complaint._id,
      app,
    }),
    // DB notifications — admins
    ...admins.map((admin) =>
      createNotification({
        recipient: admin._id,
        sender:    rejectedBy._id,
        type:      "complaint_rejected",
        title:     "Complaint Rejected",
        message:   `${rejectedBy.name} rejected: "${complaint.title}"`,
        complaint: complaint._id,
        app,
      })
    ),
    // Email — student always (rejection always notified)
    settings.emailEnabled
      ? trySendEmail(
          sendComplaintRejectedEmail,
          student,
          complaint,
          rejectedBy,
          settings.emailSenderName
        )
      : Promise.resolve(),
  ]);
};

// ── Notify student when in-progress ──────────────────────
const notifyComplaintInProgress = async (complaint, student, staff, app = null) => {
  const settings = await getSettings();
  if (!settings.notifyOnAssign) return;

  await createNotification({
    recipient: student._id,
    sender:    staff._id,
    type:      "complaint_inprogress",
    title:     "Complaint In Progress",
    message:   `Your complaint "${complaint.title}" is now being worked on by ${staff.name}.`,
    complaint: complaint._id,
    app,
  });
};

const notifyComplaintReassigned = async (complaint, oldStaff, newStaff, app = null) => {
  const settings = await getSettings();
  if (!settings.notifyOnAssign) return;

  const promises = [
    createNotification({
      recipient: newStaff._id,
      sender:    null,
      type:      "complaint_reassigned",
      title:     "Complaint Reassigned to You",
      message:   `Complaint "${complaint.title}" has been reassigned to you.`,
      complaint: complaint._id,
      app,
    }),
  ];

  if (oldStaff) {
    promises.push(
      createNotification({
        recipient: oldStaff._id,
        sender:    null,
        type:      "complaint_reassigned",
        title:     "Complaint Reassigned",
        message:   `Complaint "${complaint.title}" has been reassigned to ${newStaff.name}.`,
        complaint: complaint._id,
        app,
      })
    );
  }

  await Promise.all(promises);
};

module.exports = {
  createNotification,
  notifyComplaintSubmitted,
  notifyComplaintAssigned,
  notifyComplaintResolved,
  notifyComplaintRejected,
  notifyComplaintInProgress,
  notifyComplaintReassigned,
};