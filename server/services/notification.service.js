const { createNotificationRow } = require("../../src/db/notifications.ts");
const { getSettingsSingleton } = require("../../src/db/settings.ts");
const { findUsersByRole, findUserById } = require("../../src/db/users.ts");
const { getAllActiveUserIds } = require("../../src/db/lostFound.ts");

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
    const notification = await createNotificationRow({
      recipientId: recipient,
      senderId: sender,
      type,
      title,
      message,
      complaintId: complaint,
    });

    if (!notification) return null;

    // ── Emit real-time socket event ───────────────────────
    if (app) {
      const { emitToUser } = require("../utils/socketEmitter");
      emitToUser(app, String(recipient), "new_notification", {
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
    return await getSettingsSingleton();
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

  const admins = await findUsersByRole("admin");

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

  const { sendComplaintAssignedEmail } = require("./email.service");

  const tasks = [];

  if (student?._id) {
    tasks.push(
      createNotification({
        recipient: student._id,
        sender:    null,
        type:      "complaint_assigned",
        title:     "Complaint Assigned",
        message:   `Your complaint "${complaint.title}" has been assigned to ${staff?.name || "a staff member"}.`,
        complaint: complaint._id,
        app,
      })
    );
  }

  if (staff?._id) {
    tasks.push(
      createNotification({
        recipient: staff._id,
        sender:    null,
        type:      "complaint_assigned",
        title:     "New Complaint Assigned",
        message:   `You have been assigned: "${complaint.title}"`,
        complaint: complaint._id,
        app,
      })
    );
  }

  if (settings.emailEnabled && staff?.email) {
    tasks.push(
      trySendEmail(
        sendComplaintAssignedEmail,
        staff,
        complaint,
        settings.emailSenderName
      )
    );
  }

  await Promise.all(tasks);
};

// ── Notify student + admins when resolved ─────────────────
const notifyComplaintResolved = async (complaint, student, staff, app = null, note = "") => {
  const settings = await getSettings();
  if (!settings.notifyOnResolve) return;

  const { sendComplaintResolvedEmail } = require("./email.service");
  const admins = await findUsersByRole("admin");

  const tasks = [
    ...admins.map((admin) =>
      createNotification({
        recipient: admin._id,
        sender:    staff?._id || null,
        type:      "complaint_resolved",
        title:     "Complaint Resolved",
        message:   `${staff?.name || "Staff"} resolved: "${complaint.title}"`,
        complaint: complaint._id,
        app,
      })
    ),
  ];

  if (student?._id) {
    tasks.push(
      createNotification({
        recipient: student._id,
        sender:    staff?._id || null,
        type:      "complaint_resolved",
        title:     "Complaint Resolved",
        message:   `Your complaint "${complaint.title}" has been resolved.`,
        complaint: complaint._id,
        app,
      })
    );
  }

  if (settings.emailEnabled && student?.email) {
    tasks.push(
      trySendEmail(
        sendComplaintResolvedEmail,
        student,
        complaint,
        typeof note === "string" ? note : "",
        settings.emailSenderName
      )
    );
  }

  await Promise.all(tasks);
};

// ── Notify student when rejected ──────────────────────────
// Always notify on rejection — student must know
const notifyComplaintRejected = async (complaint, student, rejectedBy, app = null) => {
  const settings = await getSettings();
  const { sendComplaintRejectedEmail } = require("./email.service");
  const admins = await findUsersByRole("admin");

  const tasks = [
    ...admins.map((admin) =>
      createNotification({
        recipient: admin._id,
        sender:    rejectedBy?._id || null,
        type:      "complaint_rejected",
        title:     "Complaint Rejected",
        message:   `${rejectedBy?.name || "Staff"} rejected: "${complaint.title}"`,
        complaint: complaint._id,
        app,
      })
    ),
  ];

  if (student?._id) {
    tasks.push(
      createNotification({
        recipient: student._id,
        sender:    rejectedBy?._id || null,
        type:      "complaint_rejected",
        title:     "Complaint Rejected",
        message:   `Your complaint "${complaint.title}" was rejected. Reason: ${
          complaint.rejectionReason || "No reason provided"
        }`,
        complaint: complaint._id,
        app,
      })
    );
  }

  if (settings.emailEnabled && student?.email) {
    tasks.push(
      trySendEmail(
        sendComplaintRejectedEmail,
        student,
        complaint,
        complaint.rejectionReason || "",
        settings.emailSenderName
      )
    );
  }

  await Promise.all(tasks);
};

// ── Notify student when in-progress ──────────────────────
const notifyComplaintInProgress = async (complaint, student, staff, app = null) => {
  const settings = await getSettings();
  if (!settings.notifyOnAssign || !student?._id) return;

  await createNotification({
    recipient: student._id,
    sender:    staff?._id || null,
    type:      "complaint_inprogress",
    title:     "Complaint In Progress",
    message:   `Your complaint "${complaint.title}" is now being worked on by ${staff?.name || "staff"}.`,
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

// ── Notify relevant participants on new comment ───────────
const notifyComplaintComment = async (complaint, author, body, app = null) => {
  const snippet = String(body || "").trim().slice(0, 110);
  const recipients = new Set();

  const studentId = complaint.student?._id || (complaint.studentId ? String(complaint.studentId) : null);
  const staffId = complaint.assignedTo?._id || (complaint.assignedToId ? String(complaint.assignedToId) : null);
  const authorId = String(author?._id || author?.id || "");

  if (studentId && studentId !== authorId) {
    recipients.add(studentId);
  }
  if (staffId && staffId !== authorId) {
    recipients.add(staffId);
  }

  if (author?.role === "user" || !staffId) {
    const admins = await findUsersByRole("admin");
    for (const admin of admins) {
      if (String(admin._id) !== authorId) {
        recipients.add(String(admin._id));
      }
    }
  }

  await Promise.all(
    Array.from(recipients).map((recipientId) =>
      createNotification({
        recipient: recipientId,
        sender:    author?._id || null,
        type:      "complaint_comment",
        title:     `New Comment on ${complaint.complaintId || "Complaint"}`,
        message:   `${author?.name || "Someone"}: "${snippet}"`,
        complaint: complaint._id,
        app,
      })
    )
  );
};

// ── Notify staff & admins when student submits a rating ───
const notifyComplaintRated = async (complaint, student, rating, app = null) => {
  const recipients = new Set();
  const staffId = complaint.assignedTo?._id || (complaint.assignedToId ? String(complaint.assignedToId) : null);
  if (staffId) recipients.add(staffId);

  const admins = await findUsersByRole("admin");
  for (const admin of admins) {
    recipients.add(String(admin._id));
  }

  await Promise.all(
    Array.from(recipients).map((recipientId) =>
      createNotification({
        recipient: recipientId,
        sender:    student?._id || null,
        type:      "complaint_rated",
        title:     `Feedback Received (${rating}/5 ★)`,
        message:   `${student?.name || "Student"} rated "${complaint.title}" ${rating}/5 stars.`,
        complaint: complaint._id,
        app,
      })
    )
  );
};

// ── Campus-Wide Broadcast: Found Item Posted ──────────────
const notifyCampusFoundItemPosted = async (item, finder, app = null) => {
  const finderId = Number(finder?.id || finder?._id || 0);
  const recipientIds = await getAllActiveUserIds(finderId || undefined);
  if (!recipientIds.length) return 0;

  const title = `Found Item Posted: ${item.title}`;
  const message = `${finder?.name || "A campus member"} found "${item.title}" near ${item.foundLocation} (${item.itemCode}). If it's yours, verify ownership in Lost & Found.`;

  // Create notifications in bounded chunks so large campuses stay fast
  const CHUNK_SIZE = 25;
  for (let i = 0; i < recipientIds.length; i += CHUNK_SIZE) {
    const chunk = recipientIds.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((recipientId) =>
        createNotification({
          recipient: recipientId,
          sender: finderId || null,
          type: "lost_found_posted",
          title,
          message,
          app,
        })
      )
    );
  }

  return recipientIds.length;
};

// ── Notify Finder (+ Admins if Desk Custody) on Claim ─────
const notifyLostFoundClaimSubmitted = async (item, claimant, app = null) => {
  const recipients = new Set([String(item.finderId)]);
  if (item.custodyType === "security_desk" || item.custodyType === "admin_office") {
    const admins = await findUsersByRole("admin");
    admins.forEach((a) => recipients.add(String(a._id)));
  }

  const claimantId = String(claimant?.id || claimant?._id || "");
  recipients.delete(claimantId);

  await Promise.all(
    Array.from(recipients).map((recipientId) =>
      createNotification({
        recipient: recipientId,
        sender: claimantId || null,
        type: "lost_found_claim_submitted",
        title: `New Claim Appeal (${item.itemCode})`,
        message: `${claimant?.name || "A user"} submitted an ownership verification appeal for "${item.title}". Review their answer before approving.`,
        app,
      })
    )
  );
};

// ── Notify Claimant & Escalate Fraud Strikes to Admins ────
const notifyLostFoundClaimDecision = async ({
  decision,
  item,
  claim,
  reviewer,
  handoverCode,
  claimantFraudStrikes = 0,
  reviewNote = "",
  app = null,
}) => {
  const reviewerId = reviewer?.id || reviewer?._id || null;

  if (decision === "approve") {
    await createNotification({
      recipient: claim.claimantId,
      sender: reviewerId,
      type: "lost_found_claim_approved",
      title: `Ownership Verified (${item.itemCode})`,
      message: `Your claim for "${item.title}" was approved! Open Lost & Found to view your private Handover Pickup Code (${handoverCode}) and collect your item.`,
      app,
    });
    return;
  }

  if (decision === "flag_fraud") {
    const claimant = await findUserById(claim.claimantId);
    const admins = await findUsersByRole("admin");

    await Promise.all([
      createNotification({
        recipient: claim.claimantId,
        sender: reviewerId,
        type: "lost_found_fraud_alert",
        title: `Claim Flagged as False Appeal (${item.itemCode})`,
        message: `Your claim for "${item.title}" was flagged as fraudulent (Strike ${claimantFraudStrikes}/2). Reason: ${reviewNote || "Failed ownership verification."}`,
        app,
      }),
      ...admins.map((admin) =>
        createNotification({
          recipient: admin._id,
          sender: reviewerId,
          type: "lost_found_fraud_alert",
          title: `Fraudulent Claim Flagged (${item.itemCode})`,
          message: `${claimant?.name || "A user"} (${claimant?.email || "N/A"}) was flagged for a false claim on "${item.title}" (Total Strikes: ${claimantFraudStrikes}). Note: ${reviewNote || "No note"}`,
          app,
        })
      ),
    ]);
    return;
  }

  await createNotification({
    recipient: claim.claimantId,
    sender: reviewerId,
    type: "lost_found_claim_rejected",
    title: `Claim Not Approved (${item.itemCode})`,
    message: `Your claim for "${item.title}" was not approved. Reason: ${reviewNote || "Verification details did not match."}`,
    app,
  });
};

// ── Notify Both Parties on Verified Physical Handover ─────
const notifyLostFoundHandoverCompleted = async (item, approvedClaim, verifier, app = null) => {
  const verifierId = verifier?.id || verifier?._id || null;
  const tasks = [];

  if (approvedClaim?.claimantId) {
    tasks.push(
      createNotification({
        recipient: approvedClaim.claimantId,
        sender: verifierId,
        type: "lost_found_handover_completed",
        title: `Item Returned (${item.itemCode})`,
        message: `Physical handover of "${item.title}" was confirmed via pickup code. Thank you for using Campus Lost & Found!`,
        app,
      })
    );
  }

  if (item.finderId && String(item.finderId) !== String(verifierId)) {
    tasks.push(
      createNotification({
        recipient: item.finderId,
        sender: verifierId,
        type: "lost_found_handover_completed",
        title: `Handover Confirmed (${item.itemCode})`,
        message: `"${item.title}" has been verified and returned to its rightful owner.`,
        app,
      })
    );
  }

  await Promise.all(tasks);
};

module.exports = {
  createNotification,
  notifyComplaintSubmitted,
  notifyComplaintAssigned,
  notifyComplaintResolved,
  notifyComplaintRejected,
  notifyComplaintInProgress,
  notifyComplaintReassigned,
  notifyComplaintComment,
  notifyComplaintRated,
  notifyCampusFoundItemPosted,
  notifyLostFoundClaimSubmitted,
  notifyLostFoundClaimDecision,
  notifyLostFoundHandoverCompleted,
};