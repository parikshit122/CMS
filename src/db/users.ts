import bcrypt from "bcryptjs";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "./index.ts";
import { complaints, users } from "./schema.ts";
import {
  canLinkSocialAccount,
  normalizeSocialProvider,
  sanitizeAvatarUrl,
} from "../lib/auth-helpers.ts";

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export const isValidId = (value: unknown): boolean => {
  if (typeof value === "number") return Number.isInteger(value) && value > 0;
  if (typeof value === "string") return /^\d+$/.test(value.trim()) && Number(value) > 0;
  return false;
};

export const toNumericId = (value: unknown): number | null => {
  if (!isValidId(value)) return null;
  return Number(value);
};

export const serializeUser = (
  user: UserRow | null | undefined,
  options: { includeSensitive?: boolean } = {}
) => {
  if (!user) return null;
  const base: Record<string, unknown> = {
    _id: String(user.id),
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    provider: user.provider,
    avatar: user.avatar || "",
    bio: user.bio || "",
    course: user.course || "",
    year: user.year || "",
    category: user.category ?? undefined,
    isActive: user.isActive,
    suspendedUntil: user.suspendedUntil ?? undefined,
    suspensionReason: user.suspensionReason ?? undefined,
    lastLoginAt: user.lastLoginAt ?? undefined,
    lastLoginIP: user.lastLoginIP ?? undefined,
    isEmailVerified: user.isEmailVerified,
    isDemo: Boolean(user.isDemo),
    lastOTPSentAt: user.lastOTPSentAt ?? undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (options.includeSensitive) {
    base.password = user.password;
    base.loginAttempts = user.loginAttempts;
    base.lockUntil = user.lockUntil;
    base.passwordResetOTP = user.passwordResetOTP;
    base.passwordResetOTPExpiry = user.passwordResetOTPExpiry;
    base.passwordResetToken = user.passwordResetToken;
    base.passwordResetTokenExpiry = user.passwordResetTokenExpiry;
    base.emailVerificationOTP = user.emailVerificationOTP;
    base.emailVerificationOTPExpiry = user.emailVerificationOTPExpiry;
    base.emailVerificationAttempts = user.emailVerificationAttempts;
  }

  return base;
};

const wrapDbError = (action: string, error: unknown): Error => {
  const pgErr = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const pgCode = pgErr?.code || pgErr?.cause?.code;
  const constraint = pgErr?.constraint || pgErr?.cause?.constraint || "";
  if (pgCode === "23505") {
    const duplicateErr = new Error("Duplicate record already exists.", { cause: error }) as Error & {
      code?: string;
      field?: string;
    };
    duplicateErr.code = "UNIQUE_VIOLATION";
    if (constraint.includes("email")) duplicateErr.field = "email";
    else if (constraint.includes("phone")) duplicateErr.field = "phone";
    else if (constraint.includes("uid")) duplicateErr.field = "uid";
    else duplicateErr.field = "field";
    return duplicateErr;
  }
  console.error(`[db/users] ${action} failed:`, error);
  return new Error("Database query failed. Please try again later.", { cause: error });
};

export async function hashPassword(plainPassword: string): Promise<string> {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10) || 12;
  return bcrypt.hash(plainPassword, rounds);
}

export async function comparePassword(plainPassword: string, hashedPassword?: string | null): Promise<boolean> {
  if (!hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

export async function findUserById(id: unknown, options: { includeSensitive?: boolean } = {}) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const rows = await db.select().from(users).where(eq(users.id, numId)).limit(1);
    return serializeUser(rows[0], options);
  } catch (error) {
    throw wrapDbError("findUserById", error);
  }
}

export async function findUserByEmail(email: string, options: { includeSensitive?: boolean } = {}) {
  try {
    const normalized = email.toLowerCase().trim();
    const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    return serializeUser(rows[0], options);
  } catch (error) {
    throw wrapDbError("findUserByEmail", error);
  }
}

export async function findUserByUid(uid: string, options: { includeSensitive?: boolean } = {}) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return serializeUser(rows[0], options);
  } catch (error) {
    throw wrapDbError("findUserByUid", error);
  }
}

export async function findUserByPhone(phone: string, excludeId?: unknown) {
  try {
    const excludeNumId = excludeId ? toNumericId(excludeId) : null;
    const condition = excludeNumId
      ? and(eq(users.phone, String(phone)), ne(users.id, excludeNumId))
      : eq(users.phone, String(phone));
    const rows = await db.select().from(users).where(condition).limit(1);
    return serializeUser(rows[0]);
  } catch (error) {
    throw wrapDbError("findUserByPhone", error);
  }
}

const INITIAL_ADMIN_EMAIL = (
  process.env.INITIAL_ADMIN_EMAIL || "parikshitwadkar96@gmail.com"
)
  .toLowerCase()
  .trim();

export async function createUser(data: {
  uid?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  password?: string | null;
  role?: string;
  provider?: string;
  avatar?: string;
  category?: string | null;
  isEmailVerified?: boolean;
  isActive?: boolean;
}) {
  try {
    const normalizedEmail = data.email.toLowerCase().trim();
    const isInitialAdmin = normalizedEmail === INITIAL_ADMIN_EMAIL;
    const assignedRole = data.role || (isInitialAdmin ? "admin" : "user");
    const hashed = data.password ? await hashPassword(data.password) : null;
    const rows = await db
      .insert(users)
      .values({
        uid: data.uid || null,
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone && data.phone.trim() !== "" ? data.phone.trim() : null,
        password: hashed,
        role: assignedRole,
        provider: data.provider || "local",
        avatar: data.avatar || "",
        category: data.category ? data.category.toLowerCase().trim() : null,
        isEmailVerified: data.isEmailVerified ?? isInitialAdmin,
        isActive: data.isActive ?? true,
      })
      .returning();

    return serializeUser(rows[0], { includeSensitive: true });
  } catch (error) {
    throw wrapDbError("createUser", error);
  }
}

export async function getOrCreateFirebaseUser(params: {
  uid: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
  emailVerified?: boolean;
}) {
  try {
    const normalizedEmail = params.email.toLowerCase().trim();
    const displayName = (params.name || normalizedEmail.split("@")[0] || "User").trim();
    const provider = normalizeSocialProvider(params.provider);
    const safeAvatar = sanitizeAvatarUrl(params.avatar);
    const emailVerified = Boolean(params.emailVerified);
    const isInitialAdmin = normalizedEmail === INITIAL_ADMIN_EMAIL && emailVerified;

    // 1. Check by Firebase UID first so returning users never report created=true
    if (params.uid) {
      const existingByUid = await db
        .select()
        .from(users)
        .where(eq(users.uid, params.uid))
        .limit(1);

      if (existingByUid[0]) {
        const existing = existingByUid[0];
        let nextEmail = existing.email;

        if (normalizedEmail && normalizedEmail !== existing.email && emailVerified) {
          const emailOwner = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.email, normalizedEmail), ne(users.id, existing.id)))
            .limit(1);
          if (!emailOwner[0]) {
            nextEmail = normalizedEmail;
          }
        }

        const nextRole =
          nextEmail === INITIAL_ADMIN_EMAIL && emailVerified ? "admin" : existing.role;

        const updated = await db
          .update(users)
          .set({
            email: nextEmail,
            role: nextRole,
            isEmailVerified: existing.isEmailVerified || emailVerified,
            avatar: existing.avatar || safeAvatar,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning();

        return {
          user: serializeUser(updated[0], { includeSensitive: true }),
          created: false,
        };
      }
    }

    // 2. Check if an existing account with this email exists (e.g. pre-created admin/staff/local)
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingByEmail[0]) {
      const existing = existingByEmail[0];
      const linkDecision = canLinkSocialAccount({
        existingUid: existing.uid,
        incomingUid: params.uid,
        emailVerified,
      });

      if (!linkDecision.allowed) {
        const linkError = new Error(linkDecision.reason) as Error & { code?: string };
        linkError.code = "UNVERIFIED_SOCIAL_EMAIL";
        throw linkError;
      }

      const nextRole = isInitialAdmin ? "admin" : existing.role;
      const updated = await db
        .update(users)
        .set({
          uid: existing.uid || params.uid,
          role: nextRole,
          isEmailVerified: true,
          avatar: existing.avatar || safeAvatar,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();

      return {
        user: serializeUser(updated[0], { includeSensitive: true }),
        created: false,
      };
    }

    // 3. Concurrency-safe insert keyed on Firebase Auth UID
    const rows = await db
      .insert(users)
      .values({
        uid: params.uid,
        name: displayName,
        email: normalizedEmail,
        role: isInitialAdmin ? "admin" : "user",
        provider,
        avatar: safeAvatar,
        isEmailVerified: emailVerified,
        isActive: true,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    const row = rows[0];
    const wasJustCreated =
      row && Math.abs(row.createdAt.getTime() - row.updatedAt.getTime()) < 2000;

    return {
      user: serializeUser(row, { includeSensitive: true }),
      created: Boolean(wasJustCreated),
    };
  } catch (error) {
    if ((error as { code?: string })?.code === "UNVERIFIED_SOCIAL_EMAIL") {
      throw error;
    }
    throw wrapDbError("getOrCreateFirebaseUser", error);
  }
}

export async function updateUserById(
  id: unknown,
  updates: Partial<NewUserRow>,
  options: { includeSensitive?: boolean } = {}
) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const payload: Partial<NewUserRow> = { ...updates, updatedAt: new Date() };
    if (typeof payload.password === "string" && payload.password.length > 0 && !payload.password.startsWith("$2")) {
      payload.password = await hashPassword(payload.password);
    }
    if (payload.phone === "") {
      payload.phone = null;
    }
    const rows = await db
      .update(users)
      .set(payload)
      .where(eq(users.id, numId))
      .returning();
    return serializeUser(rows[0], options);
  } catch (error) {
    throw wrapDbError("updateUserById", error);
  }
}

export async function incrementLoginAttempts(id: unknown, maxAttempts = 5) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const existing = await db.select().from(users).where(eq(users.id, numId)).limit(1);
    if (!existing[0]) return null;
    const nextAttempts = (existing[0].loginAttempts || 0) + 1;
    const isNowLocked = nextAttempts >= maxAttempts;
    const rows = await db
      .update(users)
      .set({
        loginAttempts: isNowLocked ? 0 : nextAttempts,
        lockUntil: isNowLocked ? new Date(Date.now() + 30 * 60 * 1000) : existing[0].lockUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, numId))
      .returning();
    return serializeUser(rows[0], { includeSensitive: true });
  } catch (error) {
    throw wrapDbError("incrementLoginAttempts", error);
  }
}

export async function resetLoginAttempts(id: unknown, ip?: string) {
  return updateUserById(
    id,
    {
      loginAttempts: 0,
      lockUntil: null,
      lastLoginAt: new Date(),
      lastLoginIP: ip || "",
    },
    { includeSensitive: true }
  );
}

export async function deleteUserById(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const rows = await db.delete(users).where(eq(users.id, numId)).returning();
    return serializeUser(rows[0]);
  } catch (error) {
    throw wrapDbError("deleteUserById", error);
  }
}

export async function findUsersByRole(role: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(desc(users.createdAt));
    return rows.map((row) => serializeUser(row));
  } catch (error) {
    throw wrapDbError("findUsersByRole", error);
  }
}

export async function getAllStudentsWithStats() {
  try {
    const now = new Date();
    const rows = await db
      .select({
        user: users,
        totalComplaints: sql<number>`count(${complaints.id})::int`,
      })
      .from(users)
      .leftJoin(complaints, eq(complaints.studentId, users.id))
      .where(eq(users.role, "user"))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return rows.map(({ user, totalComplaints }) => {
      const serialized = serializeUser(user) as Record<string, unknown>;
      const isSuspended = Boolean(user.suspendedUntil && user.suspendedUntil > now);
      return {
        ...serialized,
        totalComplaints,
        isSuspended,
        status: isSuspended
          ? "suspended"
          : user.isActive === false
            ? "inactive"
            : "active",
      };
    });
  } catch (error) {
    throw wrapDbError("getAllStudentsWithStats", error);
  }
}

export async function getAllStaffWithStats() {
  try {
    const rows = await db
      .select({
        user: users,
        assignedCount: sql<number>`count(${complaints.id})::int`,
        resolvedCount: sql<number>`count(*) filter (where ${complaints.status} = 'resolved')::int`,
      })
      .from(users)
      .leftJoin(complaints, eq(complaints.assignedToId, users.id))
      .where(eq(users.role, "staff"))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return rows.map(({ user, assignedCount, resolvedCount }) => ({
      ...(serializeUser(user) as Record<string, unknown>),
      assignedCount,
      resolvedCount,
    }));
  } catch (error) {
    throw wrapDbError("getAllStaffWithStats", error);
  }
}

export async function getStaffByCategoryWithActiveCount(category: string) {
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        category: users.category,
        activeCount: sql<number>`count(*) filter (where ${complaints.status} in ('pending', 'in-progress'))::int`,
      })
      .from(users)
      .leftJoin(complaints, eq(complaints.assignedToId, users.id))
      .where(and(eq(users.role, "staff"), eq(users.category, category)))
      .groupBy(users.id);

    return rows.map((row) => ({
      _id: String(row.id),
      id: row.id,
      name: row.name,
      email: row.email,
      category: row.category,
      activeCount: row.activeCount,
    }));
  } catch (error) {
    throw wrapDbError("getStaffByCategoryWithActiveCount", error);
  }
}

export async function countUsers(role?: string): Promise<number> {
  try {
    const query = role
      ? db.select({ value: count() }).from(users).where(eq(users.role, role))
      : db.select({ value: count() }).from(users);
    const result = await query;
    return Number(result[0]?.value || 0);
  } catch (error) {
    throw wrapDbError("countUsers", error);
  }
}
