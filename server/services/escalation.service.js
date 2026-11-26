/**
 * Automated SLA Escalation Worker for ComplaintSync — Avishkar Edition.
 * Evaluates active complaints against SLA windows, promotes them to L1/L2,
 * inserts in-app notifications, emits real-time Socket.IO events, and sends email alerts.
 */

const { findAndUpdateSlaEscalations } = require("../../src/db/avishkar.ts");
const { findUsersByRole } = require("../../src/db/users.ts");
const { createNotificationRow } = require("../../src/db/notifications.ts");
const { getSettingsSingleton } = require("../../src/db/settings.ts");
const { sendMail, escapeHtml } = require("./email.service");

let escalationTimer = null;

async function runSlaEscalationSweep(app) {
  const result = await findAndUpdateSlaEscalations(new Date());

  if (result.escalatedCount === 0) {
    return result;
  }

  const io = app?.get ? app.get("io") : null;
  const admins = await findUsersByRole("admin");
  const settings = await getSettingsSingleton().catch(() => ({ emailEnabled: false }));

  for (const item of result.escalated) {
    const { complaint, newLevel, reason } = item;
    const recipientIds = new Set(admins.map((a) => a.id));
    if (complaint.assignedToId) {
      recipientIds.add(complaint.assignedToId);
    }

    const title =
      newLevel === 2
        ? `SLA Breached (Level 2): ${complaint.complaintId}`
        : `SLA Warning (Level 1): ${complaint.complaintId}`;

    const message = `${complaint.title} — ${reason}`;

    // 1. Persist in-app notifications
    if (recipientIds.size > 0) {
      await Promise.all(
        Array.from(recipientIds).map((recipientId) =>
          createNotificationRow({
            recipientId,
            senderId: null,
            type: "escalation",
            title,
            message,
            complaintId: complaint.id,
          }).catch(() => {})
        )
      );
    }

    // 2. Broadcast live Socket.IO escalation event to admin & staff rooms
    if (io) {
      const socketPayload = {
        complaintId: complaint.complaintId,
        id: complaint.id,
        title: complaint.title,
        escalationLevel: newLevel,
        reason,
        escalatedAt: complaint.escalatedAt,
      };
      io.to("role:admin").emit("complaint:escalated", socketPayload);
      io.to("role:staff").emit("complaint:escalated", socketPayload);
      if (complaint.studentId) {
        io.to(`user:${complaint.studentId}`).emit("complaint:escalated", socketPayload);
      }
    }

    // 3. Dispatch Brevo email alert to non-demo admins on Level 2 Critical Breach
    if (newLevel === 2 && settings?.emailEnabled) {
      const realAdmins = admins.filter((a) => a.email && !a.isDemo).slice(0, 2);
      for (const admin of realAdmins) {
        const html = `
          <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
            <h2 style="color:#dc2626;margin:0 0 12px;">Executive SLA Breach Alert (Level 2)</h2>
            <p><strong>Ticket:</strong> ${escapeHtml(complaint.complaintId)}</p>
            <p><strong>Issue:</strong> ${escapeHtml(complaint.title)}</p>
            <p><strong>Category / Priority:</strong> ${escapeHtml(complaint.category)} · ${escapeHtml(String(complaint.priority).toUpperCase())}</p>
            <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
            <p style="color:#475569;font-size:13px;margin-top:20px;">ComplaintSync Automated SLA Governance Engine — Smart Campus</p>
          </div>
        `;
        await sendMail(
          admin.email,
          `[SLA Level 2 Breach] ${complaint.complaintId} — ${complaint.title}`,
          html,
          "SLAEscalation"
        ).catch(() => {});
      }
    }
  }

  return result;
}

function startSlaEscalationScheduler(app, intervalMs = 5 * 60 * 1000) {
  if (escalationTimer) return escalationTimer;

  // Run first check 45 seconds after startup so DB pool warms up cleanly
  setTimeout(() => {
    runSlaEscalationSweep(app).catch((err) => {
      console.warn("[SLA Escalation] Initial sweep skipped:", err.message);
    });
  }, 45 * 1000);

  escalationTimer = setInterval(() => {
    runSlaEscalationSweep(app).catch((err) => {
      console.warn("[SLA Escalation] Periodic sweep failed:", err.message);
    });
  }, intervalMs);

  return escalationTimer;
}

function stopSlaEscalationScheduler() {
  if (escalationTimer) {
    clearInterval(escalationTimer);
    escalationTimer = null;
  }
}

module.exports = {
  runSlaEscalationSweep,
  startSlaEscalationScheduler,
  stopSlaEscalationScheduler,
};
