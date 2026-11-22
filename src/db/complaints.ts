import { and, count, desc, eq, gte, inArray, lt, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index.ts";
import {
  complaintCounters,
  complaints,
  users,
  type ComplaintAttachment,
} from "./schema.ts";
import { toNumericId } from "./users.ts";

export type ComplaintRow = typeof complaints.$inferSelect;

const studentAlias = alias(users, "student_user");
const staffAlias = alias(users, "staff_user");

const formatPopulatedComplaint = (
  row: ComplaintRow,
  student?: { id: number; name: string; email: string; phone?: string | null; course?: string | null; year?: string | null } | null,
  assignedTo?: { id: number; name: string; email: string; phone?: string | null; category?: string | null } | null
) => ({
  _id: String(row.id),
  id: row.id,
  complaintId: row.complaintId,
  title: row.title,
  description: row.description,
  category: row.category,
  priority: row.priority,
  location: row.location ?? undefined,
  status: row.status,
  student: student
    ? {
        _id: String(student.id),
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone ?? undefined,
        course: student.course ?? undefined,
        year: student.year ?? undefined,
      }
    : String(row.studentId),
  studentId: row.studentId,
  assignedTo: assignedTo
    ? {
        _id: String(assignedTo.id),
        id: assignedTo.id,
        name: assignedTo.name,
        email: assignedTo.email,
        phone: assignedTo.phone ?? undefined,
        category: assignedTo.category ?? undefined,
      }
    : row.assignedToId
      ? String(row.assignedToId)
      : null,
  assignedToId: row.assignedToId,
  rejectionReason: row.rejectionReason ?? undefined,
  resolvedAt: row.resolvedAt ?? null,
  attachments: Array.isArray(row.attachments) ? row.attachments : [],
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const wrapDbError = (action: string, error: unknown): Error => {
  console.error(`[db/complaints] ${action} failed:`, error);
  return new Error("Database query failed. Please try again later.", { cause: error });
};

async function generateNextComplaintId(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `complaint_${year}`;
  const result = await db
    .insert(complaintCounters)
    .values({ id: counterId, seq: 1 })
    .onConflictDoUpdate({
      target: complaintCounters.id,
      set: { seq: sql`${complaintCounters.seq} + 1` },
    })
    .returning();
  const seq = result[0]?.seq || 1;
  return `CMP-${year}-${String(seq).padStart(4, "0")}`;
}

export async function createComplaint(data: {
  title: string;
  description: string;
  category: string;
  priority?: string;
  location?: string | null;
  studentId: unknown;
  attachments?: ComplaintAttachment[];
}) {
  const numStudentId = toNumericId(data.studentId);
  if (!numStudentId) throw new Error("Invalid student ID.");
  try {
    const complaintId = await generateNextComplaintId();
    const rows = await db
      .insert(complaints)
      .values({
        complaintId,
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category.toLowerCase().trim(),
        priority: data.priority || "medium",
        location: data.location?.trim() || null,
        status: "pending",
        studentId: numStudentId,
        attachments: data.attachments || [],
      })
      .returning();

    return formatPopulatedComplaint(rows[0], null, null);
  } catch (error) {
    throw wrapDbError("createComplaint", error);
  }
}

export async function findComplaintById(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const rows = await db
      .select({
        complaint: complaints,
        student: {
          id: studentAlias.id,
          name: studentAlias.name,
          email: studentAlias.email,
          phone: studentAlias.phone,
          course: studentAlias.course,
          year: studentAlias.year,
        },
        assignedTo: {
          id: staffAlias.id,
          name: staffAlias.name,
          email: staffAlias.email,
          phone: staffAlias.phone,
          category: staffAlias.category,
        },
      })
      .from(complaints)
      .leftJoin(studentAlias, eq(complaints.studentId, studentAlias.id))
      .leftJoin(staffAlias, eq(complaints.assignedToId, staffAlias.id))
      .where(eq(complaints.id, numId))
      .limit(1);

    if (!rows[0]) return null;
    const { complaint, student, assignedTo } = rows[0];
    return formatPopulatedComplaint(
      complaint,
      student?.id ? student : null,
      assignedTo?.id ? assignedTo : null
    );
  } catch (error) {
    throw wrapDbError("findComplaintById", error);
  }
}

export async function findComplaintsByStudent(studentId: unknown) {
  const numId = toNumericId(studentId);
  if (!numId) return [];
  try {
    const rows = await db
      .select({
        complaint: complaints,
        assignedTo: {
          id: staffAlias.id,
          name: staffAlias.name,
          email: staffAlias.email,
          phone: staffAlias.phone,
          category: staffAlias.category,
        },
      })
      .from(complaints)
      .leftJoin(staffAlias, eq(complaints.assignedToId, staffAlias.id))
      .where(eq(complaints.studentId, numId))
      .orderBy(desc(complaints.createdAt));

    return rows.map(({ complaint, assignedTo }) =>
      formatPopulatedComplaint(complaint, null, assignedTo?.id ? assignedTo : null)
    );
  } catch (error) {
    throw wrapDbError("findComplaintsByStudent", error);
  }
}

export async function findComplaintsByStaff(staffId: unknown) {
  const numId = toNumericId(staffId);
  if (!numId) return [];
  try {
    const rows = await db
      .select({
        complaint: complaints,
        student: {
          id: studentAlias.id,
          name: studentAlias.name,
          email: studentAlias.email,
        },
      })
      .from(complaints)
      .leftJoin(studentAlias, eq(complaints.studentId, studentAlias.id))
      .where(eq(complaints.assignedToId, numId))
      .orderBy(desc(complaints.createdAt));

    return rows.map(({ complaint, student }) => ({
      _id: String(complaint.id),
      id: complaint.id,
      complaintId: complaint.complaintId,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      location: complaint.location ?? undefined,
      status: complaint.status,
      rejectionReason: complaint.rejectionReason ?? undefined,
      attachments: Array.isArray(complaint.attachments) ? complaint.attachments : [],
      studentName: student?.name || "Unknown",
      studentEmail: student?.email || "",
      createdAt: complaint.createdAt,
    }));
  } catch (error) {
    throw wrapDbError("findComplaintsByStaff", error);
  }
}

export async function findAllComplaints(params: {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  category?: string;
  from?: Date;
  to?: Date;
}) {
  try {
    const conditions: SQL[] = [];
    if (params.status && params.status !== "all") {
      conditions.push(eq(complaints.status, params.status));
    }
    if (params.priority && params.priority !== "all") {
      conditions.push(eq(complaints.priority, params.priority));
    }
    if (params.category && params.category !== "all") {
      conditions.push(eq(complaints.category, params.category));
    }
    if (params.from) {
      conditions.push(gte(complaints.createdAt, params.from));
    }
    if (params.to) {
      conditions.push(lte(complaints.createdAt, params.to));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          complaint: complaints,
          student: {
            id: studentAlias.id,
            name: studentAlias.name,
            email: studentAlias.email,
            phone: studentAlias.phone,
            course: studentAlias.course,
            year: studentAlias.year,
          },
          assignedTo: {
            id: staffAlias.id,
            name: staffAlias.name,
            email: staffAlias.email,
            phone: staffAlias.phone,
            category: staffAlias.category,
          },
        })
        .from(complaints)
        .leftJoin(studentAlias, eq(complaints.studentId, studentAlias.id))
        .leftJoin(staffAlias, eq(complaints.assignedToId, staffAlias.id))
        .where(whereClause)
        .orderBy(desc(complaints.createdAt))
        .limit(params.limit)
        .offset(offset),
      db.select({ value: count() }).from(complaints).where(whereClause),
    ]);

    return {
      complaints: rows.map(({ complaint, student, assignedTo }) =>
        formatPopulatedComplaint(
          complaint,
          student?.id ? student : null,
          assignedTo?.id ? assignedTo : null
        )
      ),
      total: Number(totalResult[0]?.value || 0),
    };
  } catch (error) {
    throw wrapDbError("findAllComplaints", error);
  }
}

export async function updateComplaintById(
  id: unknown,
  updates: {
    status?: string;
    rejectionReason?: string | null;
    assignedToId?: number | null;
    resolvedAt?: Date | null;
  }
) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.status !== undefined) {
      if (updates.status === "resolved") {
        payload.resolvedAt = updates.resolvedAt ?? new Date();
      } else {
        payload.resolvedAt = null;
      }
    }

    await db.update(complaints).set(payload).where(eq(complaints.id, numId));
    return findComplaintById(numId);
  } catch (error) {
    throw wrapDbError("updateComplaintById", error);
  }
}

export async function deleteComplaintById(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const rows = await db
      .delete(complaints)
      .where(eq(complaints.id, numId))
      .returning();
    return rows[0] ? formatPopulatedComplaint(rows[0], null, null) : null;
  } catch (error) {
    throw wrapDbError("deleteComplaintById", error);
  }
}

export async function unassignStaffComplaints(staffId: unknown) {
  const numId = toNumericId(staffId);
  if (!numId) return { activeCount: 0, totalAssigned: 0 };
  try {
    const [activeRes, totalRes] = await Promise.all([
      db
        .select({ value: count() })
        .from(complaints)
        .where(
          and(
            eq(complaints.assignedToId, numId),
            inArray(complaints.status, ["pending", "in-progress"])
          )
        ),
      db
        .select({ value: count() })
        .from(complaints)
        .where(eq(complaints.assignedToId, numId)),
    ]);

    const activeCount = Number(activeRes[0]?.value || 0);
    const totalAssigned = Number(totalRes[0]?.value || 0);

    if (activeCount > 0) {
      await db
        .update(complaints)
        .set({ assignedToId: null, status: "pending", updatedAt: new Date() })
        .where(
          and(
            eq(complaints.assignedToId, numId),
            inArray(complaints.status, ["pending", "in-progress"])
          )
        );
    }

    await db
      .update(complaints)
      .set({ assignedToId: null, updatedAt: new Date() })
      .where(
        and(
          eq(complaints.assignedToId, numId),
          inArray(complaints.status, ["resolved", "rejected"])
        )
      );

    return { activeCount, totalAssigned };
  } catch (error) {
    throw wrapDbError("unassignStaffComplaints", error);
  }
}

export async function getStudentComplaintAttachments(studentId: unknown): Promise<string[]> {
  const numId = toNumericId(studentId);
  if (!numId) return [];
  try {
    const rows = await db
      .select({ attachments: complaints.attachments })
      .from(complaints)
      .where(eq(complaints.studentId, numId));
    return rows.flatMap((r) =>
      (Array.isArray(r.attachments) ? r.attachments : [])
        .map((a) => a.publicId)
        .filter(Boolean)
    );
  } catch (error) {
    throw wrapDbError("getStudentComplaintAttachments", error);
  }
}

export async function deleteComplaintsByStudent(studentId: unknown): Promise<number> {
  const numId = toNumericId(studentId);
  if (!numId) return 0;
  try {
    const rows = await db
      .delete(complaints)
      .where(eq(complaints.studentId, numId))
      .returning({ id: complaints.id });
    return rows.length;
  } catch (error) {
    throw wrapDbError("deleteComplaintsByStudent", error);
  }
}

export async function deleteOldResolvedComplaints(cutoffDate: Date): Promise<number> {
  try {
    const rows = await db
      .delete(complaints)
      .where(
        and(eq(complaints.status, "resolved"), lt(complaints.updatedAt, cutoffDate))
      )
      .returning({ id: complaints.id });
    return rows.length;
  } catch (error) {
    throw wrapDbError("deleteOldResolvedComplaints", error);
  }
}

export async function countComplaints(filter?: {
  studentId?: unknown;
  assignedToId?: unknown;
  status?: string | string[];
  category?: string;
  createdFrom?: Date;
  createdTo?: Date;
  updatedFrom?: Date;
  updatedTo?: Date;
}): Promise<number> {
  try {
    const conditions: SQL[] = [];
    if (filter?.studentId !== undefined) {
      const numId = toNumericId(filter.studentId);
      if (!numId) return 0;
      conditions.push(eq(complaints.studentId, numId));
    }
    if (filter?.assignedToId !== undefined) {
      const numId = toNumericId(filter.assignedToId);
      if (!numId) return 0;
      conditions.push(eq(complaints.assignedToId, numId));
    }
    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        conditions.push(inArray(complaints.status, filter.status));
      } else {
        conditions.push(eq(complaints.status, filter.status));
      }
    }
    if (filter?.category) {
      conditions.push(eq(complaints.category, filter.category));
    }
    if (filter?.createdFrom) {
      conditions.push(gte(complaints.createdAt, filter.createdFrom));
    }
    if (filter?.createdTo) {
      conditions.push(lte(complaints.createdAt, filter.createdTo));
    }
    if (filter?.updatedFrom) {
      conditions.push(gte(complaints.updatedAt, filter.updatedFrom));
    }
    if (filter?.updatedTo) {
      conditions.push(lte(complaints.updatedAt, filter.updatedTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const res = await db.select({ value: count() }).from(complaints).where(whereClause);
    return Number(res[0]?.value || 0);
  } catch (error) {
    throw wrapDbError("countComplaints", error);
  }
}

export async function getAverageResolutionHours(range?: { from: Date; to: Date }): Promise<number> {
  try {
    const conditions: SQL[] = [eq(complaints.status, "resolved")];
    if (range) {
      conditions.push(gte(complaints.updatedAt, range.from));
      conditions.push(lte(complaints.updatedAt, range.to));
    }

    const res = await db
      .select({
        avgSeconds: sql<number | null>`avg(extract(epoch from (${complaints.updatedAt} - ${complaints.createdAt})))`,
      })
      .from(complaints)
      .where(and(...conditions));

    const avgSeconds = Number(res[0]?.avgSeconds || 0);
    return avgSeconds ? Number((avgSeconds / 3600).toFixed(1)) : 0;
  } catch (error) {
    throw wrapDbError("getAverageResolutionHours", error);
  }
}

export async function getCategoryBreakdown() {
  try {
    const rows = await db
      .select({
        category: complaints.category,
        value: sql<number>`count(*)::int`,
      })
      .from(complaints)
      .groupBy(complaints.category)
      .orderBy(desc(sql`count(*)`));

    return rows;
  } catch (error) {
    throw wrapDbError("getCategoryBreakdown", error);
  }
}
