const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  sender = null,
  type,
  title,
  message,
  complaint = null,
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
    return notification;
  } catch (err) {
    console.error("Notification creation error:", err.message);
    return null;
  }
};

const notifyComplaintSubmitted = async (complaint, student) => {
  const User = require("../models/User");
  const admins = await User.find({ role: "admin" }).select("_id");

  const promises = admins.map((admin) =>
    createNotification({
      recipient: admin._id,
      sender: student._id,
      type: "complaint_submitted",
      title: "New Complaint Submitted",
      message: `${student.name} submitted a new complaint: "${complaint.title}"`,
      complaint: complaint._id,
    }),
  );

  await Promise.all(promises);
};

const notifyComplaintAssigned = async (complaint, student, staff) => {
  await createNotification({
    recipient: student._id,
    sender: null,
    type: "complaint_assigned",
    title: "Complaint Assigned",
    message: `Your complaint "${complaint.title}" has been assigned to ${staff.name}.`,
    complaint: complaint._id,
  });

  await createNotification({
    recipient: staff._id,
    sender: null,
    type: "complaint_assigned",
    title: "New Complaint Assigned",
    message: `You have been assigned a complaint: "${complaint.title}"`,
    complaint: complaint._id,
  });
};

const notifyComplaintResolved = async (complaint, student, staff) => {
  await createNotification({
    recipient: student._id,
    sender: staff._id,
    type: "complaint_resolved",
    title: "Complaint Resolved",
    message: `Your complaint "${complaint.title}" has been marked as resolved.`,
    complaint: complaint._id,
  });

  const User = require("../models/User");
  const admins = await User.find({ role: "admin" }).select("_id");
  const promises = admins.map((admin) =>
    createNotification({
      recipient: admin._id,
      sender: staff._id,
      type: "complaint_resolved",
      title: "Complaint Resolved",
      message: `${staff.name} resolved complaint: "${complaint.title}"`,
      complaint: complaint._id,
    }),
  );
  await Promise.all(promises);
};

const notifyComplaintRejected = async (complaint, student, rejectedBy) => {
  await createNotification({
    recipient: student._id,
    sender: rejectedBy._id,
    type: "complaint_rejected",
    title: "Complaint Rejected",
    message: `Your complaint "${complaint.title}" has been rejected.`,
    complaint: complaint._id,
  });
};

const notifyComplaintInProgress = async (complaint, student, staff) => {
  await createNotification({
    recipient: student._id,
    sender: staff._id,
    type: "complaint_inprogress",
    title: "Complaint In Progress",
    message: `Your complaint "${complaint.title}" is now being worked on.`,
    complaint: complaint._id,
  });
};

const notifyComplaintReassigned = async (complaint, oldStaff, newStaff) => {
  await createNotification({
    recipient: newStaff._id,
    sender: null,
    type: "complaint_reassigned",
    title: "Complaint Reassigned to You",
    message: `Complaint "${complaint.title}" has been reassigned to you.`,
    complaint: complaint._id,
  });

  if (oldStaff) {
    await createNotification({
      recipient: oldStaff._id,
      sender: null,
      type: "complaint_reassigned",
      title: "Complaint Reassigned",
      message: `Complaint "${complaint.title}" has been reassigned to ${newStaff.name}.`,
      complaint: complaint._id,
    });
  }
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