import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
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

    isDemo: boolean("is_demo").notNull().default(false),

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
    slaDueAt: timestamp("sla_due_at"),
    rating: integer("rating"),
    ratingFeedback: text("rating_feedback"),
    ratedAt: timestamp("rated_at"),
    attachments: jsonb("attachments")
      .$type<ComplaintAttachment[]>()
      .notNull()
      .default([]),

    // Avishkar Engineering & Technology Extensions
    sourceChannel: text("source_channel").notNull().default("web"), // "web" | "qr" | "voice"
    qrSpotCode: text("qr_spot_code"),
    originalLanguage: text("original_language").notNull().default("en"), // "en" | "mr" | "hi"
    originalTranscript: text("original_transcript"),
    aiCategory: text("ai_category"),
    aiPriority: text("ai_priority"),
    aiSummary: text("ai_summary"),
    aiConfidence: integer("ai_confidence"),
    duplicateOfId: integer("duplicate_of_id"),
    endorsementCount: integer("endorsement_count").notNull().default(1),
    endorsedByUserIds: jsonb("endorsed_by_user_ids")
      .$type<number[]>()
      .notNull()
      .default([]),
    escalationLevel: integer("escalation_level").notNull().default(0), // 0 = Standard, 1 = Dept Head Warning, 2 = Principal Breach
    escalatedAt: timestamp("escalated_at"),
    escalationReason: text("escalation_reason"),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("complaints_student_created_idx").on(table.studentId, table.createdAt),
    index("complaints_assigned_status_idx").on(table.assignedToId, table.status),
    index("complaints_status_created_idx").on(table.status, table.createdAt),
    index("complaints_category_idx").on(table.category),
    index("complaints_sla_due_at_idx").on(table.slaDueAt),
    index("complaints_escalation_idx").on(table.escalationLevel, table.status),
    index("complaints_qr_spot_idx").on(table.qrSpotCode),
  ]
);

// ── Campus QR Code Reporting Spots ────────────────────────
export const campusQrSpots = pgTable(
  "campus_qr_spots",
  {
    id: serial("id").primaryKey(),
    spotCode: text("spot_code").notNull().unique(), // e.g. CAMPUS-CSLAB-02
    label: text("label").notNull(),
    building: text("building").notNull(),
    floor: text("floor").notNull().default("Ground Floor"),
    locationId: text("location_id").notNull(), // maps to LOCATION_GROUPS item id
    defaultCategory: text("default_category").notNull().default("infrastructure"),
    scanCount: integer("scan_count").notNull().default(0),
    complaintCount: integer("complaint_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    mapNodeId: integer("map_node_id"),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdById: integer("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("campus_qr_spots_active_idx").on(table.isActive),
    index("campus_qr_spots_location_idx").on(table.locationId),
  ]
);

// ── Complaint Activities & Comments Table ─────────────────
export const complaintActivities = pgTable(
  "complaint_activities",
  {
    id: serial("id").primaryKey(),
    complaintId: integer("complaint_id")
      .notNull()
      .references(() => complaints.id, { onDelete: "cascade" }),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role").notNull(), // "user" | "staff" | "admin" | "system"
    kind: text("kind").notNull(), // "submitted" | "comment" | "status_change" | "assignment" | "rating"
    body: text("body").notNull(),
    meta: jsonb("meta")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("complaint_activities_complaint_created_idx").on(
      table.complaintId,
      table.createdAt
    ),
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
    .default("Smart Campus University"),
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
    .default("ComplaintSync — Smart Campus"),
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

  // Multi-University & Avishkar Blind-Evaluation Anonymity Settings
  blindEvaluationMode: boolean("blind_evaluation_mode").notNull().default(true),
  institutionCode: text("institution_code").notNull().default("CAMPUS"),
  allowedDomain: text("allowed_domain").notNull().default("campus.edu"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Campus Lost & Found Items Table ───────────────────────
export const lostFoundItems = pgTable(
  "lost_found_items",
  {
    id: serial("id").primaryKey(),
    itemCode: text("item_code").notNull().unique(), // LF-YYYY-NNNN
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().default("other"), // electronics | id_card | wallet_keys | books_notes | accessories | clothing | other
    foundLocation: text("found_location").notNull(),
    foundAt: timestamp("found_at").defaultNow().notNull(),
    custodyType: text("custody_type").notNull().default("finder"), // finder | security_desk | admin_office
    custodyLocation: text("custody_location").default(""),
    contactPhone: text("contact_phone").default(""),
    imageUrl: text("image_url").default(""),
    imagePublicId: text("image_public_id").default(""),
    blurImagePublicly: boolean("blur_image_publicly").notNull().default(true),
    verificationQuestion: text("verification_question").notNull(),
    verificationAnswerSecret: text("verification_answer_secret").notNull(),
    privateNotes: text("private_notes").default(""),
    status: text("status").notNull().default("open"), // open | claim_pending | approved | returned | archived
    finderId: integer("finder_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    approvedClaimId: integer("approved_claim_id"),
    returnedToId: integer("returned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),
    returnedAt: timestamp("returned_at"),
    handoverCodeHash: text("handover_code_hash"),
    handoverCodePlain: text("handover_code_plain"),
    mapNodeId: integer("map_node_id"),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("lost_found_items_status_created_idx").on(table.status, table.createdAt),
    index("lost_found_items_finder_idx").on(table.finderId),
    index("lost_found_items_category_idx").on(table.category),
  ]
);

// ── Campus Lost & Found Claims (Anti-Fraud Appeals) ───────
export const lostFoundClaims = pgTable(
  "lost_found_claims",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => lostFoundItems.id, { onDelete: "cascade" }),
    claimantId: integer("claimant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    verificationAnswer: text("verification_answer").notNull(),
    identifyingDetails: text("identifying_details").notNull(),
    lostLocation: text("lost_location").default(""),
    claimantPhone: text("claimant_phone").default(""),
    proofImageUrl: text("proof_image_url").default(""),
    proofImagePublicId: text("proof_image_public_id").default(""),
    honestyPledgeAccepted: boolean("honesty_pledge_accepted").notNull().default(false),
    answerMatchScore: integer("answer_match_score").notNull().default(0),
    answerMatchLevel: text("answer_match_level").notNull().default("low"), // high | partial | low
    status: text("status").notNull().default("pending"), // pending | approved | rejected | fraud_flagged | completed
    isFlaggedFraud: boolean("is_flagged_fraud").notNull().default(false),
    reviewerId: integer("reviewer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note").default(""),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("lost_found_claims_item_status_idx").on(table.itemId, table.status),
    index("lost_found_claims_claimant_idx").on(table.claimantId, table.createdAt),
    index("lost_found_claims_fraud_idx").on(table.claimantId, table.isFlaggedFraud),
  ]
);

// ── Drizzle Relations ─────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  submittedComplaints: many(complaints, { relationName: "studentComplaints" }),
  assignedComplaints: many(complaints, { relationName: "staffComplaints" }),
  complaintActivities: many(complaintActivities),
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
  activities: many(complaintActivities),
  notifications: many(notifications),
}));

export const complaintActivitiesRelations = relations(
  complaintActivities,
  ({ one }) => ({
    complaint: one(complaints, {
      fields: [complaintActivities.complaintId],
      references: [complaints.id],
    }),
    author: one(users, {
      fields: [complaintActivities.authorId],
      references: [users.id],
    }),
  })
);

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

export const lostFoundItemsRelations = relations(lostFoundItems, ({ one, many }) => ({
  finder: one(users, {
    fields: [lostFoundItems.finderId],
    references: [users.id],
  }),
  returnedTo: one(users, {
    fields: [lostFoundItems.returnedToId],
    references: [users.id],
  }),
  claims: many(lostFoundClaims),
}));

export const lostFoundClaimsRelations = relations(lostFoundClaims, ({ one }) => ({
  item: one(lostFoundItems, {
    fields: [lostFoundClaims.itemId],
    references: [lostFoundItems.id],
  }),
  claimant: one(users, {
    fields: [lostFoundClaims.claimantId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [lostFoundClaims.reviewerId],
    references: [users.id],
  }),
}));

export const campusQrSpotsRelations = relations(campusQrSpots, ({ one }) => ({
  createdBy: one(users, {
    fields: [campusQrSpots.createdById],
    references: [users.id],
  }),
}));

// ── Multi-Campus Spatial Navigation Tables ────────────────

export const campusBuildings = pgTable(
  "campus_buildings",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // e.g. BLK-B, LIB-MAIN
    name: text("name").notNull(),
    shortLabel: text("short_label").notNull(),
    category: text("category").notNull().default("academic"), // academic | hostel | library | amenities | admin | sports
    siteX: real("site_x").notNull().default(50),
    siteY: real("site_y").notNull().default(50),
    description: text("description").default(""),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("campus_buildings_category_idx").on(table.category)]
);

export const campusFloors = pgTable(
  "campus_floors",
  {
    id: serial("id").primaryKey(),
    buildingId: integer("building_id").references(() => campusBuildings.id, {
      onDelete: "cascade",
    }),
    floorNumber: integer("floor_number").notNull().default(0), // -1 = outdoor site map, 0 = Ground, 1 = 1st, etc.
    floorLabel: text("floor_label").notNull(),
    mapImageUrl: text("map_image_url").notNull().default(""),
    widthMeters: real("width_meters").notNull().default(60),
    heightMeters: real("height_meters").notNull().default(40),
    isOutdoor: boolean("is_outdoor").notNull().default(false),
    accessLevel: text("access_level").notNull().default("public"), // public | student | staff | admin
    isSensitive: boolean("is_sensitive").notNull().default(false),
    restrictedNotice: text("restricted_notice").default(""),
    blueprintUpdatedAt: timestamp("blueprint_updated_at"),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("campus_floors_building_idx").on(table.buildingId, table.floorNumber)]
);

export const campusMapNodes = pgTable(
  "campus_map_nodes",
  {
    id: serial("id").primaryKey(),
    floorId: integer("floor_id")
      .notNull()
      .references(() => campusFloors.id, { onDelete: "cascade" }),
    buildingId: integer("building_id").references(() => campusBuildings.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    nodeType: text("node_type").notNull().default("room"), // room | lab | corridor | stairs | elevator | ramp | entrance | washroom | desk | qr_anchor
    x: real("x").notNull().default(50), // 0..100 normalized
    y: real("y").notNull().default(50), // 0..100 normalized
    isAccessible: boolean("is_accessible").notNull().default(true),
    qrSpotCode: text("qr_spot_code"),
    departmentId: integer("department_id"),
    description: text("description").default(""),
    accessLevel: text("access_level").notNull().default("public"), // public | student | staff | admin
    isSensitive: boolean("is_sensitive").notNull().default(false),
    restrictedNotice: text("restricted_notice").default(""),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("campus_map_nodes_floor_idx").on(table.floorId),
    index("campus_map_nodes_building_idx").on(table.buildingId),
  ]
);

export const campusMapEdges = pgTable(
  "campus_map_edges",
  {
    id: serial("id").primaryKey(),
    fromNodeId: integer("from_node_id")
      .notNull()
      .references(() => campusMapNodes.id, { onDelete: "cascade" }),
    toNodeId: integer("to_node_id")
      .notNull()
      .references(() => campusMapNodes.id, { onDelete: "cascade" }),
    distanceMeters: real("distance_meters").notNull().default(10),
    edgeType: text("edge_type").notNull().default("corridor"), // corridor | walkway | stairs | elevator | ramp
    isAccessible: boolean("is_accessible").notNull().default(true),
    accessLevel: text("access_level").notNull().default("public"), // public | student | staff | admin
    isSensitive: boolean("is_sensitive").notNull().default(false),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("campus_map_edges_from_idx").on(table.fromNodeId),
    index("campus_map_edges_to_idx").on(table.toNodeId),
  ]
);

// ── University / College Academic & Course Hierarchy ──────

export const academicDepartments = pgTable(
  "academic_departments",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // e.g. CSE, MECH, ECE, MBA
    name: text("name").notNull(),
    buildingId: integer("building_id").references(() => campusBuildings.id, {
      onDelete: "set null",
    }),
    hodName: text("hod_name").default(""),
    hodEmail: text("hod_email").default(""),
    isActive: boolean("is_active").notNull().default(true),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("academic_departments_active_idx").on(table.isActive)]
);

export const academicCourses = pgTable(
  "academic_courses",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => academicDepartments.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(), // e.g. BTECH-CSE, MBA-GEN
    name: text("name").notNull(),
    degreeLevel: text("degree_level").notNull().default("UG"), // UG | PG | Diploma | PhD
    durationYears: integer("duration_years").notNull().default(4),
    divisions: jsonb("divisions").$type<string[]>().notNull().default(["A", "B"]),
    intakeCapacity: integer("intake_capacity").notNull().default(60),
    isActive: boolean("is_active").notNull().default(true),
    isDemoRecord: boolean("is_demo_record").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("academic_courses_department_idx").on(table.departmentId)]
);

