import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export interface ComplaintAttachment {
  url: string;
  publicId: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
}

export const DEFAULT_CATEGORIES = [
  "infrastructure",
  "cleanliness",
  "electrical",
  "plumbing",
  "safety",
  "it",
  "academic",
  "other",
];

// ── Users Table ───────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    uid: text("uid").unique(), // Firebase Auth UID (null for local password accounts)
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").unique(),
    password: text("password"),
    role: text("role").notNull().default("user"), // "user" | "admin" | "staff"
    provider: text("provider").notNull().default("local"), // "local" | "google" | "github" | "twitter" | "facebook"
    avatar: text("avatar").default(""),
    bio: text("bio").default(""),
    course: text("course").default(""),
    year: text("year").default(""),
    category: text("category"),

    isActive: boolean("is_active").notNull().default(true),
    suspendedUntil: timestamp("suspended_until"),
    suspensionReason: text("suspension_reason"),

    loginAttempts: integer("login_attempts").notNull().default(0),
    lockUntil: timestamp("lock_until"),
    lastLoginAt: timestamp("last_login_at"),
    lastLoginIP: text("last_login_ip"),

    passwordResetOTP: text("password_reset_otp"),
    passwordResetOTPExpiry: timestamp("password_reset_otp_expiry"),
    passwordResetToken: text("password_reset_token"),
    passwordResetTokenExpiry: timestamp("password_reset_token_expiry"),

    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    emailVerificationOTP: text("email_verification_otp"),
    emailVerificationOTPExpiry: timestamp("email_verification_otp_expiry"),
    emailVerificationAttempts: integer("email_verification_attempts").notNull().default(0),
    lastOTPSentAt: timestamp("last_otp_sent_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_role_idx").on(table.role),
    index("users_is_active_idx").on(table.isActive),
    index("users_created_at_idx").on(table.createdAt),
  ]
);

// ── Atomic Yearly Counter Table for CMP-YYYY-NNNN ─────────
export const complaintCounters = pgTable("complaint_counters", {
  id: text("id").primaryKey(),
  seq: integer("seq").notNull().default(0),
});

// ── Complaints Table ──────────────────────────────────────
export const complaints = pgTable(
  "complaints",
  {
    id: serial("id").primaryKey(),
    complaintId: text("complaint_id").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    priority: text("priority").notNull().default("medium"), // "low" | "medium" | "high" | "urgent"
    location: text("location"),
    status: text("status").notNull().default("pending"), // "pending" | "in-progress" | "resolved" | "rejected"
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedToId: integer("assigned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    resolvedAt: timestamp("resolved_at"),
    attachments: jsonb("attachments")
      .$type<ComplaintAttachment[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("complaints_student_created_idx").on(table.studentId, table.createdAt),
    index("complaints_assigned_status_idx").on(table.assignedToId, table.status),
    index("complaints_status_created_idx").on(table.status, table.createdAt),
    index("complaints_category_idx").on(table.category),
  ]
);

// ── Notifications Table ───────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderId: integer("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    complaintId: integer("complaint_id").references(() => complaints.id, {
      onDelete: "cascade",
    }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_recipient_read_created_idx").on(
      table.recipientId,
      table.isRead,
      table.createdAt
    ),
  ]
);

// ── Settings Table (Singleton) ────────────────────────────
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  singletonKey: text("singleton_key").notNull().unique().default("default"),
  siteName: text("site_name").notNull().default("ComplaintSync"),
  siteTagline: text("site_tagline")
    .notNull()
    .default("MITM — Jayawanti Babu Foundation"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceMessage: text("maintenance_message")
    .notNull()
    .default("We are performing scheduled maintenance. Please check back soon."),
  defaultPriority: text("default_priority").notNull().default("medium"),

  passwordMinLength: integer("password_min_length").notNull().default(8),
  passwordRequireSpecial: boolean("password_require_special")
    .notNull()
    .default(true),
  passwordRequireNumber: boolean("password_require_number")
    .notNull()
    .default(true),
  passwordRequireUppercase: boolean("password_require_uppercase")
    .notNull()
    .default(true),
  sessionTimeoutMinutes: integer("session_timeout_minutes")
    .notNull()
    .default(15),
  maxLoginAttempts: integer("max_login_attempts").notNull().default(5),
  otpExpiryMinutes: integer("otp_expiry_minutes").notNull().default(10),

  emailEnabled: boolean("email_enabled").notNull().default(true),
  emailSenderName: text("email_sender_name")
    .notNull()
    .default("ComplaintSync — MITM"),
  notifyOnSubmit: boolean("notify_on_submit").notNull().default(true),
  notifyOnAssign: boolean("notify_on_assign").notNull().default(true),
  notifyOnResolve: boolean("notify_on_resolve").notNull().default(true),

  categories: jsonb("categories")
    .$type<string[]>()
    .notNull()
    .default(DEFAULT_CATEGORIES),

  autoCloseResolvedDays: integer("auto_close_resolved_days")
    .notNull()
    .default(30),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Drizzle Relations ─────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  submittedComplaints: many(complaints, { relationName: "studentComplaints" }),
  assignedComplaints: many(complaints, { relationName: "staffComplaints" }),
  receivedNotifications: many(notifications, {
    relationName: "receivedNotifications",
  }),
  sentNotifications: many(notifications, {
    relationName: "sentNotifications",
  }),
}));

export const complaintsRelations = relations(complaints, ({ one, many }) => ({
  student: one(users, {
    fields: [complaints.studentId],
    references: [users.id],
    relationName: "studentComplaints",
  }),
  assignedTo: one(users, {
    fields: [complaints.assignedToId],
    references: [users.id],
    relationName: "staffComplaints",
  }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "receivedNotifications",
  }),
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
    relationName: "sentNotifications",
  }),
  complaint: one(complaints, {
    fields: [notifications.complaintId],
    references: [complaints.id],
  }),
}));
