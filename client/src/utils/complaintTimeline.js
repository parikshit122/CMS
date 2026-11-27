const STATUS_LABELS = {
  pending: "Pending",
  "in-progress": "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

export function formatStatusLabel(status) {
  if (!status) return "Unknown";
  return STATUS_LABELS[status] || String(status).replace(/-/g, " ");
}

export function formatTimelineTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value, nowMs = Date.now()) {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

export function classifyEventType(event) {
  const kind = event?.kind || "comment";
  if (kind === "status_change") {
    return {
      category: "status",
      label: "Status Change",
      icon: "bx bx-transfer-alt",
      tone: "status",
    };
  }
  if (kind === "assignment") {
    return {
      category: "status",
      label: "Assigned",
      icon: "bx bx-user-check",
      tone: "assignment",
    };
  }
  if (kind === "submitted") {
    return {
      category: "status",
      label: "Submitted",
      icon: "bx bx-file-blank",
      tone: "submitted",
    };
  }
  if (kind === "rating") {
    return {
      category: "notes",
      label: "Student Rating",
      icon: "bx bxs-star",
      tone: "rating",
    };
  }
  const role = (event?.authorRole || "").toLowerCase();
  if (role === "system") {
    return {
      category: "status",
      label: "System Update",
      icon: "bx bx-shield-quarter",
      tone: "system",
    };
  }
  const isStaffSide = role === "staff" || role === "admin";
  return {
    category: "notes",
    label: isStaffSide ? "Staff Note" : "Student Note",
    icon: isStaffSide ? "bx bx-notepad" : "bx bx-message-dots",
    tone: isStaffSide ? "staff-note" : "comment",
  };
}

export function normalizeTimelineEvents(activities = [], complaint = null) {
  const list = Array.isArray(activities) ? [...activities] : [];

  if (list.length === 0 && complaint) {
    list.push({
      _id: `submitted-${complaint._id || complaint.id || "0"}`,
      kind: "submitted",
      authorName: complaint.studentName || complaint.student?.name || "Student",
      authorRole: "user",
      body: `Complaint filed under ${complaint.category || "general"} (${complaint.priority || "medium"} priority).`,
      meta: {},
      createdAt: complaint.createdAt || new Date().toISOString(),
    });
  }

  return list
    .map((item, idx) => {
      const classification = classifyEventType(item);
      const fromStatus = item?.meta?.from || null;
      const toStatus = item?.meta?.to || null;
      return {
        id: item._id || item.id || `${item.kind || "evt"}-${idx}`,
        kind: item.kind || "comment",
        category: classification.category,
        label: classification.label,
        icon: classification.icon,
        tone: classification.tone,
        authorName: item.authorName || "System",
        authorRole: item.authorRole || "system",
        body: item.body || "",
        fromStatus,
        toStatus,
        createdAt: item.createdAt || null,
      };
    })
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
}

export function filterTimelineEvents(events = [], filterKey = "all") {
  if (filterKey === "all") return events;
  if (filterKey === "status") {
    return events.filter((e) => e.category === "status");
  }
  if (filterKey === "notes") {
    return events.filter((e) => e.category === "notes");
  }
  return events;
}
