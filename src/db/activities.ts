import { asc, eq } from "drizzle-orm";
import { db } from "./index.ts";
import { complaintActivities } from "./schema.ts";
import { toNumericId } from "./users.ts";

export type ActivityKind =
  | "submitted"
  | "comment"
  | "status_change"
  | "assignment"
  | "rating";

export type ComplaintActivityRow = typeof complaintActivities.$inferSelect;

const formatActivity = (row: ComplaintActivityRow) => ({
  _id: String(row.id),
  id: row.id,
  complaintId: row.complaintId,
  authorId: row.authorId,
  authorName: row.authorName,
  authorRole: row.authorRole,
  kind: row.kind as ActivityKind,
  body: row.body,
  meta: row.meta || {},
  createdAt: row.createdAt,
});

export async function addComplaintActivity(data: {
  complaintId: unknown;
  authorId?: unknown;
  authorName: string;
  authorRole: string;
  kind: ActivityKind;
  body: string;
  meta?: Record<string, unknown>;
}) {
  const numComplaintId = toNumericId(data.complaintId);
  if (!numComplaintId) {
    throw new Error("Invalid complaint ID for activity log.");
  }

  const numAuthorId =
    data.authorId !== undefined && data.authorId !== null
      ? toNumericId(data.authorId)
      : null;

  try {
    const rows = await db
      .insert(complaintActivities)
      .values({
        complaintId: numComplaintId,
        authorId: numAuthorId,
        authorName: String(data.authorName || "System").trim(),
        authorRole: String(data.authorRole || "system").trim(),
        kind: data.kind,
        body: String(data.body || "").trim(),
        meta: data.meta || {},
      })
      .returning();

    return rows[0] ? formatActivity(rows[0]) : null;
  } catch (error) {
    console.error("[db/activities] addComplaintActivity failed:", error);
    throw new Error("Failed to record complaint activity.", { cause: error });
  }
}

export async function getComplaintActivities(complaintId: unknown) {
  const numComplaintId = toNumericId(complaintId);
  if (!numComplaintId) return [];

  try {
    const rows = await db
      .select()
      .from(complaintActivities)
      .where(eq(complaintActivities.complaintId, numComplaintId))
      .orderBy(asc(complaintActivities.createdAt), asc(complaintActivities.id));

    return rows.map(formatActivity);
  } catch (error) {
    console.error("[db/activities] getComplaintActivities failed:", error);
    throw new Error("Failed to load complaint activity timeline.", { cause: error });
  }
}
