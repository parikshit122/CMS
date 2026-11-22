import { and, count, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index.ts";
import { complaints, notifications, users } from "./schema.ts";
import { toNumericId } from "./users.ts";

const senderAlias = alias(users, "notif_sender");

const formatNotification = (
  row: typeof notifications.$inferSelect,
  sender?: { id: number; name: string; avatar: string | null } | null,
  complaint?: { id: number; title: string; status: string } | null
) => ({
  _id: String(row.id),
  id: row.id,
  recipient: String(row.recipientId),
  sender: sender
    ? {
        _id: String(sender.id),
        id: sender.id,
        name: sender.name,
        avatar: sender.avatar || "",
      }
    : row.senderId
      ? String(row.senderId)
      : null,
  type: row.type,
  title: row.title,
  message: row.message,
  complaint: complaint
    ? {
        _id: String(complaint.id),
        id: complaint.id,
        title: complaint.title,
        status: complaint.status,
      }
    : row.complaintId
      ? String(row.complaintId)
      : null,
  isRead: row.isRead,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const wrapDbError = (action: string, error: unknown): Error => {
  console.error(`[db/notifications] ${action} failed:`, error);
  return new Error("Database query failed. Please try again later.", { cause: error });
};

export async function createNotificationRow(data: {
  recipientId: unknown;
  senderId?: unknown;
  type: string;
  title: string;
  message: string;
  complaintId?: unknown;
}) {
  const numRecipient = toNumericId(data.recipientId);
  if (!numRecipient) return null;
  try {
    const rows = await db
      .insert(notifications)
      .values({
        recipientId: numRecipient,
        senderId: data.senderId ? toNumericId(data.senderId) : null,
        type: data.type,
        title: data.title,
        message: data.message,
        complaintId: data.complaintId ? toNumericId(data.complaintId) : null,
        isRead: false,
      })
      .returning();

    return formatNotification(rows[0], null, null);
  } catch (error) {
    throw wrapDbError("createNotificationRow", error);
  }
}

export async function getNotificationsForUser(recipientId: unknown, page = 1, limit = 20) {
  const numId = toNumericId(recipientId);
  if (!numId) {
    return { notifications: [], total: 0, unreadCount: 0 };
  }
  try {
    const offset = (page - 1) * limit;
    const [rows, totalRes, unreadRes] = await Promise.all([
      db
        .select({
          notification: notifications,
          sender: {
            id: senderAlias.id,
            name: senderAlias.name,
            avatar: senderAlias.avatar,
          },
          complaint: {
            id: complaints.id,
            title: complaints.title,
            status: complaints.status,
          },
        })
        .from(notifications)
        .leftJoin(senderAlias, eq(notifications.senderId, senderAlias.id))
        .leftJoin(complaints, eq(notifications.complaintId, complaints.id))
        .where(eq(notifications.recipientId, numId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(notifications)
        .where(eq(notifications.recipientId, numId)),
      db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(eq(notifications.recipientId, numId), eq(notifications.isRead, false))
        ),
    ]);

    return {
      notifications: rows.map(({ notification, sender, complaint }) =>
        formatNotification(
          notification,
          sender?.id ? sender : null,
          complaint?.id ? complaint : null
        )
      ),
      total: Number(totalRes[0]?.value || 0),
      unreadCount: Number(unreadRes[0]?.value || 0),
    };
  } catch (error) {
    throw wrapDbError("getNotificationsForUser", error);
  }
}

export async function countNotifications(filter?: {
  recipientId?: unknown;
  senderId?: unknown;
  isRead?: boolean;
}): Promise<number> {
  try {
    const conditions = [];
    if (filter?.recipientId !== undefined) {
      const numId = toNumericId(filter.recipientId);
      if (!numId) return 0;
      conditions.push(eq(notifications.recipientId, numId));
    }
    if (filter?.senderId !== undefined) {
      const numId = toNumericId(filter.senderId);
      if (!numId) return 0;
      conditions.push(eq(notifications.senderId, numId));
    }
    if (filter?.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, filter.isRead));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const res = await db
      .select({ value: count() })
      .from(notifications)
      .where(whereClause);
    return Number(res[0]?.value || 0);
  } catch (error) {
    throw wrapDbError("countNotifications", error);
  }
}

export async function markNotificationRead(id: unknown, recipientId: unknown) {
  const numId = toNumericId(id);
  const numRecipient = toNumericId(recipientId);
  if (!numId || !numRecipient) return null;
  try {
    const rows = await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(eq(notifications.id, numId), eq(notifications.recipientId, numRecipient))
      )
      .returning();
    return rows[0] ? formatNotification(rows[0], null, null) : null;
  } catch (error) {
    throw wrapDbError("markNotificationRead", error);
  }
}

export async function markAllNotificationsRead(recipientId: unknown): Promise<void> {
  const numRecipient = toNumericId(recipientId);
  if (!numRecipient) return;
  try {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(eq(notifications.recipientId, numRecipient), eq(notifications.isRead, false))
      );
  } catch (error) {
    throw wrapDbError("markAllNotificationsRead", error);
  }
}

export async function deleteNotificationForUser(id: unknown, recipientId: unknown) {
  const numId = toNumericId(id);
  const numRecipient = toNumericId(recipientId);
  if (!numId || !numRecipient) return null;
  try {
    const rows = await db
      .delete(notifications)
      .where(
        and(eq(notifications.id, numId), eq(notifications.recipientId, numRecipient))
      )
      .returning();
    return rows[0] ? formatNotification(rows[0], null, null) : null;
  } catch (error) {
    throw wrapDbError("deleteNotificationForUser", error);
  }
}

export async function deleteAllNotificationsForUser(recipientId: unknown): Promise<number> {
  const numRecipient = toNumericId(recipientId);
  if (!numRecipient) return 0;
  try {
    const rows = await db
      .delete(notifications)
      .where(eq(notifications.recipientId, numRecipient))
      .returning({ id: notifications.id });
    return rows.length;
  } catch (error) {
    throw wrapDbError("deleteAllNotificationsForUser", error);
  }
}

export async function deleteNotificationsByUserInvolvement(userId: unknown): Promise<number> {
  const numId = toNumericId(userId);
  if (!numId) return 0;
  try {
    const rows = await db
      .delete(notifications)
      .where(
        or(eq(notifications.recipientId, numId), eq(notifications.senderId, numId))
      )
      .returning({ id: notifications.id });
    return rows.length;
  } catch (error) {
    throw wrapDbError("deleteNotificationsByUserInvolvement", error);
  }
}

export async function deleteNotificationsByComplaint(complaintId: unknown): Promise<number> {
  const numId = toNumericId(complaintId);
  if (!numId) return 0;
  try {
    const rows = await db
      .delete(notifications)
      .where(eq(notifications.complaintId, numId))
      .returning({ id: notifications.id });
    return rows.length;
  } catch (error) {
    throw wrapDbError("deleteNotificationsByComplaint", error);
  }
}

export async function deleteAllNotificationsGlobal(): Promise<number> {
  try {
    const rows = await db
      .delete(notifications)
      .returning({ id: notifications.id });
    return rows.length;
  } catch (error) {
    throw wrapDbError("deleteAllNotificationsGlobal", error);
  }
}
