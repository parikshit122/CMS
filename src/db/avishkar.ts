import bcrypt from "bcryptjs";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "./index.ts";
import {
  campusQrSpots,
  complaintActivities,
  complaintCounters,
  complaints,
  notifications,
  users,
} from "./schema.ts";
import { computeSlaDueAt } from "./sla.ts";
import { toNumericId } from "./users.ts";
import {
  computeDepartmentLeaderboard,
  computeNaacAuditMetrics,
  evaluateSlaEscalation,
  maskComplaintForPublic,
  normalizeSpotCode,
} from "../lib/avishkar-logic.ts";
import { maskInstitutionText } from "../lib/campus-navigation.ts";
import {
  DEFAULT_CAMPUS_QR_SPOTS,
  ensureDefaultQrSpotsSeeded,
  getInstitutionBranding,
  seedOrResetCampusNavigationAndAcademics,
} from "./campus.ts";

// ── QR Campus Spots CRUD ──────────────────────────────────

export async function listQrSpots() {
  await ensureDefaultQrSpotsSeeded();
  return db
    .select()
    .from(campusQrSpots)
    .orderBy(desc(campusQrSpots.createdAt));
}

export async function findQrSpotByCode(rawCode: string, incrementScan = false) {
  const spotCode = normalizeSpotCode(rawCode);
  if (!spotCode) return null;

  await ensureDefaultQrSpotsSeeded();

  const rows = await db
    .select()
    .from(campusQrSpots)
    .where(eq(campusQrSpots.spotCode, spotCode))
    .limit(1);

  const spot = rows[0];
  if (!spot || !spot.isActive) return null;

  if (incrementScan) {
    const updated = await db
      .update(campusQrSpots)
      .set({
        scanCount: sql`${campusQrSpots.scanCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campusQrSpots.id, spot.id))
      .returning();
    return updated[0] || spot;
  }

  return spot;
}

export async function incrementQrSpotComplaintCount(rawCode: string) {
  const spotCode = normalizeSpotCode(rawCode);
  if (!spotCode) return;
  await db
    .update(campusQrSpots)
    .set({
      complaintCount: sql`${campusQrSpots.complaintCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(campusQrSpots.spotCode, spotCode));
}

export async function createQrSpot(data: {
  spotCode: string;
  label: string;
  building: string;
  floor?: string;
  locationId: string;
  defaultCategory?: string;
  createdById?: unknown;
  isDemoRecord?: boolean;
}) {
  const spotCode = normalizeSpotCode(data.spotCode);
  if (!spotCode || spotCode.length < 3) {
    throw new Error("Spot code must be at least 3 alphanumeric characters.");
  }
  const rows = await db
    .insert(campusQrSpots)
    .values({
      spotCode,
      label: data.label.trim(),
      building: data.building.trim(),
      floor: (data.floor || "Ground Floor").trim(),
      locationId: data.locationId.trim(),
      defaultCategory: (data.defaultCategory || "infrastructure").toLowerCase().trim(),
      createdById: toNumericId(data.createdById),
      isDemoRecord: Boolean(data.isDemoRecord),
    })
    .returning();
  return rows[0];
}

export async function updateQrSpotById(
  id: unknown,
  updates: {
    label?: string;
    building?: string;
    floor?: string;
    locationId?: string;
    defaultCategory?: string;
    isActive?: boolean;
  }
) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const rows = await db
    .update(campusQrSpots)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(campusQrSpots.id, numId))
    .returning();
  return rows[0] || null;
}

export async function deleteQrSpotById(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const rows = await db
    .delete(campusQrSpots)
    .where(eq(campusQrSpots.id, numId))
    .returning();
  return rows[0] || null;
}

// ── Open Complaints for AI Semantic Duplicate Context ─────

export async function getRecentOpenComplaintsForMatching(limit = 40) {
  return db
    .select({
      id: complaints.id,
      complaintId: complaints.complaintId,
      title: complaints.title,
      description: complaints.description,
      category: complaints.category,
      location: complaints.location,
      status: complaints.status,
      endorsementCount: complaints.endorsementCount,
      createdAt: complaints.createdAt,
    })
    .from(complaints)
    .where(inArray(complaints.status, ["pending", "in-progress"]))
    .orderBy(desc(complaints.createdAt))
    .limit(limit);
}

// ── Duplicate Endorsement ("I Have This Issue Too +1") ────

export async function endorseExistingComplaint(
  complaintDbId: unknown,
  userId: unknown,
  userName: string
) {
  const numComplaintId = toNumericId(complaintDbId);
  const numUserId = toNumericId(userId);
  if (!numComplaintId || !numUserId) {
    throw new Error("Invalid complaint or user ID.");
  }

  const rows = await db
    .select()
    .from(complaints)
    .where(eq(complaints.id, numComplaintId))
    .limit(1);

  const existing = rows[0];
  if (!existing) return { found: false as const };
  if (!["pending", "in-progress"].includes(existing.status)) {
    return { found: true as const, closed: true as const, complaint: existing };
  }

  const currentIds = Array.isArray(existing.endorsedByUserIds)
    ? existing.endorsedByUserIds.map((v) => Number(v))
    : [];

  if (existing.studentId === numUserId || currentIds.includes(numUserId)) {
    return {
      found: true as const,
      alreadyEndorsed: true as const,
      complaint: existing,
    };
  }

  const nextIds = [...currentIds, numUserId];
  const nextCount = Math.max(Number(existing.endorsementCount || 1) + 1, nextIds.length);

  // Escalate priority if 5+ students report the same active issue
  let nextPriority = existing.priority;
  if (nextCount >= 5 && existing.priority === "medium") {
    nextPriority = "high";
  } else if (nextCount >= 8 && existing.priority === "high") {
    nextPriority = "urgent";
  }

  const updated = await db
    .update(complaints)
    .set({
      endorsementCount: nextCount,
      endorsedByUserIds: nextIds,
      priority: nextPriority,
      updatedAt: new Date(),
    })
    .where(eq(complaints.id, numComplaintId))
    .returning();

  await db.insert(complaintActivities).values({
    complaintId: numComplaintId,
    authorId: numUserId,
    authorName: userName || "Student",
    authorRole: "user",
    kind: "endorsement",
    body: `${userName || "A student"} confirmed being affected by this issue (duplicate prevented · ${nextCount} affected).`,
    meta: { endorsementCount: nextCount, upgradedPriority: nextPriority !== existing.priority },
  });

  return {
    found: true as const,
    alreadyEndorsed: false as const,
    complaint: updated[0] || existing,
  };
}

// ── Public Transparency & SLA Leaderboard ─────────────────

export async function getPublicTransparencyStats() {
  const [allComplaints, activeQrSpots] = await Promise.all([
    db
      .select({
        category: complaints.category,
        status: complaints.status,
        priority: complaints.priority,
        createdAt: complaints.createdAt,
        resolvedAt: complaints.resolvedAt,
        updatedAt: complaints.updatedAt,
        slaDueAt: complaints.slaDueAt,
        rating: complaints.rating,
        escalationLevel: complaints.escalationLevel,
        endorsementCount: complaints.endorsementCount,
        sourceChannel: complaints.sourceChannel,
      })
      .from(complaints),
    db
      .select({
        id: campusQrSpots.id,
        scanCount: campusQrSpots.scanCount,
      })
      .from(campusQrSpots)
      .where(eq(campusQrSpots.isActive, true)),
  ]);

  const metrics = computeNaacAuditMetrics(allComplaints);
  const totalQrScans = activeQrSpots.reduce((acc, s) => acc + Number(s.scanCount || 0), 0);

  return {
    ...metrics,
    activeQrSpotCount: activeQrSpots.length,
    totalQrScans,
    generatedAt: new Date().toISOString(),
  };
}

export async function trackComplaintPublicly(complaintCode: string) {
  const code = String(complaintCode || "").trim().toUpperCase();
  if (!code) return null;

  const rows = await db
    .select()
    .from(complaints)
    .where(eq(complaints.complaintId, code))
    .limit(1);

  const complaint = rows[0];
  if (!complaint) return null;

  const activities = await db
    .select()
    .from(complaintActivities)
    .where(eq(complaintActivities.complaintId, complaint.id))
    .orderBy(complaintActivities.createdAt);

  return maskComplaintForPublic(complaint, activities);
}

// ── NAAC Institutional Audit Report Data ──────────────────

export async function getNaacAuditReportData(range: "30d" | "semester" | "all" = "all") {
  const now = new Date();
  let fromDate: Date | null = null;
  if (range === "30d") {
    fromDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  } else if (range === "semester") {
    fromDate = new Date(now.getTime() - 180 * 24 * 3600 * 1000);
  }

  const whereClause = fromDate ? gte(complaints.createdAt, fromDate) : undefined;

  const [rows, qrSpots] = await Promise.all([
    db
      .select()
      .from(complaints)
      .where(whereClause)
      .orderBy(desc(complaints.createdAt)),
    db.select().from(campusQrSpots).orderBy(desc(campusQrSpots.scanCount)),
  ]);

  const summary = computeNaacAuditMetrics(rows, now);

  const escalatedLog = rows
    .filter((r) => Number(r.escalationLevel || 0) >= 1)
    .slice(0, 20)
    .map((r) => ({
      complaintId: r.complaintId,
      title: r.title,
      category: r.category,
      priority: r.priority,
      status: r.status,
      escalationLevel: r.escalationLevel,
      escalatedAt: r.escalatedAt,
      escalationReason: r.escalationReason,
      createdAt: r.createdAt,
    }));

  const branding = await getInstitutionBranding();
  const blind = branding.blindEvaluationMode;

  return {
    institution: branding.institutionName,
    platform: `${branding.platformName} — ${branding.headerSubtitle}`,
    blindEvaluationMode: blind,
    range,
    periodStart: fromDate ? fromDate.toISOString() : rows.at(-1)?.createdAt?.toISOString() || now.toISOString(),
    periodEnd: now.toISOString(),
    generatedAt: now.toISOString(),
    summary,
    escalatedLog: escalatedLog.map((e) => ({
      ...e,
      title: maskInstitutionText(e.title, blind),
    })),
    qrSummary: {
      totalSpots: qrSpots.length,
      totalScans: qrSpots.reduce((s, q) => s + Number(q.scanCount || 0), 0),
      totalFiledViaQr: qrSpots.reduce((s, q) => s + Number(q.complaintCount || 0), 0),
      topSpots: qrSpots.slice(0, 5).map((q) => ({
        spotCode: maskInstitutionText(q.spotCode, blind),
        label: maskInstitutionText(q.label, blind),
        building: q.building,
        scanCount: q.scanCount,
        complaintCount: q.complaintCount,
      })),
    },
  };
}

// ── SLA Escalation Database Sweep ─────────────────────────

export async function findAndUpdateSlaEscalations(now: Date = new Date()) {
  const openComplaints = await db
    .select()
    .from(complaints)
    .where(inArray(complaints.status, ["pending", "in-progress"]));

  const escalated: Array<{
    complaint: typeof complaints.$inferSelect;
    previousLevel: number;
    newLevel: 1 | 2;
    reason: string;
  }> = [];

  for (const c of openComplaints) {
    const evalResult = evaluateSlaEscalation(
      {
        status: c.status,
        priority: c.priority,
        createdAt: c.createdAt,
        slaDueAt: c.slaDueAt,
        currentEscalationLevel: c.escalationLevel,
      },
      now
    );

    if (evalResult.shouldEscalate && (evalResult.targetLevel === 1 || evalResult.targetLevel === 2)) {
      const updatedRows = await db
        .update(complaints)
        .set({
          escalationLevel: evalResult.targetLevel,
          escalatedAt: now,
          escalationReason: evalResult.reason,
          updatedAt: now,
        })
        .where(eq(complaints.id, c.id))
        .returning();

      const updated = updatedRows[0] || c;

      await db.insert(complaintActivities).values({
        complaintId: c.id,
        authorId: null,
        authorName: "SLA Escalation Engine",
        authorRole: "system",
        kind: "escalation",
        body: evalResult.reason,
        meta: {
          previousLevel: c.escalationLevel,
          newLevel: evalResult.targetLevel,
          elapsedRatio: evalResult.elapsedRatio,
        },
      });

      escalated.push({
        complaint: updated,
        previousLevel: c.escalationLevel,
        newLevel: evalResult.targetLevel,
        reason: evalResult.reason,
      });
    }
  }

  return {
    scannedCount: openComplaints.length,
    escalatedCount: escalated.length,
    escalated,
  };
}

// ── Extended Admin Intelligence Telemetry ─────────────────

export async function getAvishkarAdminExtras() {
  const rows = await db
    .select({
      escalationLevel: complaints.escalationLevel,
      status: complaints.status,
      sourceChannel: complaints.sourceChannel,
      endorsementCount: complaints.endorsementCount,
      aiSummary: complaints.aiSummary,
      originalLanguage: complaints.originalLanguage,
    })
    .from(complaints);

  let escalatedL1Count = 0;
  let escalatedL2Count = 0;
  let qrComplaintCount = 0;
  let voiceComplaintCount = 0;
  let aiTriagedCount = 0;
  let duplicateEndorsementsSaved = 0;
  let regionalLanguageCount = 0;

  for (const r of rows) {
    const active = r.status === "pending" || r.status === "in-progress";
    if (active && Number(r.escalationLevel || 0) === 1) escalatedL1Count += 1;
    if (active && Number(r.escalationLevel || 0) >= 2) escalatedL2Count += 1;
    if (r.sourceChannel === "qr") qrComplaintCount += 1;
    if (r.sourceChannel === "voice") voiceComplaintCount += 1;
    if (r.aiSummary) aiTriagedCount += 1;
    if (r.originalLanguage && r.originalLanguage !== "en") regionalLanguageCount += 1;
    const end = Math.max(1, Number(r.endorsementCount || 1));
    if (end > 1) duplicateEndorsementsSaved += end - 1;
  }

  return {
    escalatedL1Count,
    escalatedL2Count,
    qrComplaintCount,
    voiceComplaintCount,
    aiTriagedCount,
    duplicateEndorsementsSaved,
    regionalLanguageCount,
  };
}

// ── Judge Demo Accounts & Smart Campus Dataset Seeder ─────

export const DEMO_ACCOUNTS = {
  student: {
    email: "demo.student@campus.edu",
    name: "Aarav Kulkarni (Demo Student)",
    role: "user",
    course: "B.Tech Computer Engineering",
    year: "Third Year (TE)",
    bio: "Avishkar Judge Demo — Student Representative",
  },
  staff: {
    email: "demo.staff@campus.edu",
    name: "Prof. Rajesh Deshmukh (Demo Staff)",
    role: "staff",
    category: "it",
    bio: "Avishkar Judge Demo — Campus IT & Infrastructure Lead",
  },
  admin: {
    email: "demo.admin@campus.edu",
    name: "Dr. Meera Joshi (Demo Admin)",
    role: "admin",
    bio: "Avishkar Judge Demo — NAAC & Governance Administrator",
  },
} as const;

export async function ensureDemoAccounts() {
  const passwordHash = await bcrypt.hash("Avishkar@2026!", 10);
  const result: Record<"student" | "staff" | "admin", typeof users.$inferSelect> = {} as any;

  for (const key of ["student", "staff", "admin"] as const) {
    const spec = DEMO_ACCOUNTS[key];
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, spec.email))
      .limit(1);

    if (existing[0]) {
      result[key] = existing[0];
      continue;
    }

    const inserted = await db
      .insert(users)
      .values({
        name: spec.name,
        email: spec.email,
        password: passwordHash,
        role: spec.role,
        provider: "local",
        course: "course" in spec ? spec.course : "",
        year: "year" in spec ? spec.year : "",
        category: "category" in spec ? spec.category : null,
        bio: spec.bio,
        isActive: true,
        isEmailVerified: true,
        isDemo: true,
      })
      .returning();

    result[key] = inserted[0];
  }

  return result;
}

async function nextDemoComplaintCode(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `complaint_${year}`;
  const res = await db
    .insert(complaintCounters)
    .values({ id: counterId, seq: 1 })
    .onConflictDoUpdate({
      target: complaintCounters.id,
      set: { seq: sql`${complaintCounters.seq} + 1` },
    })
    .returning();
  return `CMP-${year}-${String(res[0]?.seq || 1).padStart(4, "0")}`;
}

export async function seedOrResetDemoCampusData(forceReset = false) {
  const demoUsers = await ensureDemoAccounts();

  const existingDemoCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(complaints)
    .where(eq(complaints.isDemoRecord, true));

  if (!forceReset && Number(existingDemoCount[0]?.c || 0) >= 6) {
    await seedOrResetCampusNavigationAndAcademics(demoUsers, false);
    return { seeded: false, message: "Demo campus dataset already active.", demoUsers };
  }

  if (forceReset) {
    await db.delete(complaints).where(eq(complaints.isDemoRecord, true));
    await db.delete(campusQrSpots).where(eq(campusQrSpots.isDemoRecord, true));
  }

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);

  // 1. Seed 5 physical Smart Campus QR Spots
  const qrSeedSpecs = DEFAULT_CAMPUS_QR_SPOTS;

  for (const spot of qrSeedSpecs) {
    await db
      .insert(campusQrSpots)
      .values({
        ...spot,
        isActive: true,
        isDemoRecord: true,
        createdById: demoUsers.admin.id,
      })
      .onConflictDoUpdate({
        target: campusQrSpots.spotCode,
        set: {
          label: spot.label,
          building: spot.building,
          floor: spot.floor,
          scanCount: spot.scanCount,
          complaintCount: spot.complaintCount,
          isActive: true,
          updatedAt: now,
        },
      });
  }

  // 2. Seed 12 realistic smart campus complaints covering all Avishkar modules
  const complaintSpecs = [
    {
      title: "Overhead projector HDMI port dead in Computer Lab 2",
      description:
        "The ceiling projector in Computer Lab 2 shows 'No Signal' with multiple HDMI cables during practical sessions.",
      category: "it",
      priority: "high",
      location: "lab-cs",
      status: "in-progress",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "qr",
      qrSpotCode: "CAMPUS-CSLAB-02",
      originalLanguage: "en",
      aiCategory: "it",
      aiPriority: "high",
      aiSummary: "Projector HDMI input malfunction disrupting lab practicals.",
      aiConfidence: 95,
      endorsementCount: 6,
      createdAt: hoursAgo(20),
      escalationLevel: 1,
      escalatedAt: hoursAgo(1),
      escalationReason: "83% of high SLA window elapsed — Department Head alert triggered (Level 1).",
    },
    {
      title: "RO Drinking Water Cooler Leaking in Hostel Block A",
      description:
        "RO water cooler near staircase on 1st floor is leaking continuously and water is pooling near the electrical switchboard.",
      category: "plumbing",
      priority: "urgent",
      location: "hostel-a",
      status: "pending",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "voice",
      qrSpotCode: "CAMPUS-HOSTELA-WC",
      originalLanguage: "mr",
      originalTranscript:
        "हॉस्टेल ब्लॉक ए च्या पहिल्या मजल्यावर पाण्याचा कूलर सतत गळत आहे आणि स्विचबोर्डजवळ पाणी साचले आहे.",
      aiCategory: "plumbing",
      aiPriority: "urgent",
      aiSummary: "Water cooler leak adjacent to live switchboard — urgent safety & plumbing dispatch required.",
      aiConfidence: 97,
      endorsementCount: 5,
      createdAt: hoursAgo(7), // Past 4h urgent SLA -> ready for live L2 escalation demo!
      escalationLevel: 0, // Intentionally 0 so Judge clicking "Run SLA Escalation Check" sees it escalate to L2 live!
    },
    {
      title: "Main Parking Floodlights Off After 7 PM",
      description:
        "Two LED floodlight poles near the two-wheeler parking exit are fused, making evening departure unsafe for students.",
      category: "safety",
      priority: "urgent",
      location: "parking",
      status: "pending",
      assignedToId: null,
      sourceChannel: "qr",
      qrSpotCode: "CAMPUS-PARKING-GATE",
      originalLanguage: "hi",
      originalTranscript:
        "मुख्य पार्किंग गेट के पास शाम 7 बजे के बाद दो एलईडी लाइट बंद रहती हैं, अंधेरे के कारण छात्रों को परेशानी होती है।",
      aiCategory: "safety",
      aiPriority: "urgent",
      aiSummary: "Evening visibility hazard at main parking exit due to two non-functional LED floodlights.",
      aiConfidence: 94,
      endorsementCount: 4,
      createdAt: hoursAgo(6),
      escalationLevel: 2,
      escalatedAt: hoursAgo(1.5),
      escalationReason: "SLA breached (urgent window exceeded by ~2h) — escalated to Principal/Admin (Level 2).",
    },
    {
      title: "Central Library Reading Hall Wi-Fi Access Point Drops",
      description:
        "Eduroam / Campus Wi-Fi disconnects every 10 minutes on the east wing tables of Central Library.",
      category: "it",
      priority: "medium",
      location: "library",
      status: "resolved",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "qr",
      qrSpotCode: "CAMPUS-LIB-HALL",
      originalLanguage: "en",
      aiCategory: "it",
      aiPriority: "medium",
      aiSummary: "Intermittent AP dropouts in Central Library east wing.",
      aiConfidence: 92,
      endorsementCount: 4,
      createdAt: hoursAgo(64),
      resolvedAt: hoursAgo(52),
      rating: 5,
      ratingFeedback: "Replaced faulty PoE switch within 12 hours. Wi-Fi is stable now.",
    },
    {
      title: "Canteen Handwash Basin Drain Blocked",
      description:
        "Water overflows from the right-side handwash basin during lunch break rush.",
      category: "cleanliness",
      priority: "high",
      location: "canteen",
      status: "resolved",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "qr",
      qrSpotCode: "CAMPUS-CANTEEN-01",
      originalLanguage: "mr",
      originalTranscript: "कॅन्टीनच्या हात धुण्याच्या बेसिनचा पाईप तुंबला आहे आणि दुपारी पाणी बाहेर येत आहे.",
      aiCategory: "cleanliness",
      aiPriority: "high",
      aiSummary: "Canteen basin drain blockage causing lunch-hour overflow.",
      aiConfidence: 91,
      endorsementCount: 3,
      createdAt: hoursAgo(90),
      resolvedAt: hoursAgo(78),
      rating: 5,
      ratingFeedback: "Cleaned and sanitized the same afternoon.",
    },
    {
      title: "Broken Benches in CSE Seminar Room 304",
      description:
        "Three dual-desks in the back row have loose bolts and cracked wooden tops.",
      category: "infrastructure",
      priority: "medium",
      location: "eng-cse",
      status: "resolved",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "web",
      originalLanguage: "en",
      aiCategory: "infrastructure",
      aiPriority: "medium",
      aiSummary: "Three damaged student benches requiring carpentry repair in CSE 304.",
      aiConfidence: 93,
      endorsementCount: 2,
      createdAt: hoursAgo(140),
      resolvedAt: hoursAgo(116),
      rating: 4,
      ratingFeedback: "Benches bolted and replaced cleanly.",
    },
    {
      title: "Flickering Tube Lights in Physics Laboratory",
      description:
        "Two ceiling fixtures near the optics workbench flicker continuously during afternoon practicals.",
      category: "electrical",
      priority: "high",
      location: "lab-phy",
      status: "resolved",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "voice",
      originalLanguage: "en",
      aiCategory: "electrical",
      aiPriority: "high",
      aiSummary: "Flickering LED fixtures impairing visibility at Physics Lab optics bench.",
      aiConfidence: 90,
      endorsementCount: 2,
      createdAt: hoursAgo(110),
      resolvedAt: hoursAgo(96),
      rating: 5,
      ratingFeedback: "Electrician replaced both LED battens quickly.",
    },
    {
      title: "Exam Timetable Clash for Open Elective Batch B",
      description:
        "Internal assessment schedule overlaps between IoT Lab and Engineering Economics on Thursday.",
      category: "academic",
      priority: "high",
      location: "eng-ece",
      status: "resolved",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "web",
      originalLanguage: "en",
      aiCategory: "academic",
      aiPriority: "high",
      aiSummary: "Internal assessment slot conflict for ECE Batch B elective.",
      aiConfidence: 96,
      endorsementCount: 7,
      createdAt: hoursAgo(160),
      resolvedAt: hoursAgo(146),
      rating: 5,
      ratingFeedback: "Revised timetable circulated within 14 hours.",
    },
    {
      title: "Air Conditioner Compressor Noise in Auditorium",
      description:
        "Left-side split AC unit rattles loudly during guest lectures and technical seminars.",
      category: "electrical",
      priority: "medium",
      location: "auditorium",
      status: "in-progress",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "web",
      originalLanguage: "en",
      aiCategory: "electrical",
      aiPriority: "medium",
      aiSummary: "Mechanical vibration noise in Auditorium left AC unit.",
      aiConfidence: 88,
      endorsementCount: 2,
      createdAt: hoursAgo(18),
      escalationLevel: 0,
    },
    {
      title: "Chemistry Lab Exhaust Fan Not Spinning",
      description:
        "Ventilation exhaust fan near fume hood #2 is unresponsive when switched on.",
      category: "safety",
      priority: "high",
      location: "lab-chem",
      status: "resolved",
      assignedToId: demoUsers.staff.id,
      sourceChannel: "web",
      originalLanguage: "en",
      aiCategory: "safety",
      aiPriority: "high",
      aiSummary: "Fume hood exhaust ventilation failure in Chemistry Lab.",
      aiConfidence: 97,
      endorsementCount: 3,
      createdAt: hoursAgo(50),
      resolvedAt: hoursAgo(42),
      rating: 5,
      ratingFeedback: "Priority safety fix completed in 8 hours.",
    },
  ];

  const insertedComplaints = [];
  for (const spec of complaintSpecs) {
    const code = await nextDemoComplaintCode();
    const slaDueAt = computeSlaDueAt(spec.priority, spec.createdAt);
    const [row] = await db
      .insert(complaints)
      .values({
        complaintId: code,
        title: spec.title,
        description: spec.description,
        category: spec.category,
        priority: spec.priority,
        location: spec.location,
        status: spec.status,
        studentId: demoUsers.student.id,
        assignedToId: spec.assignedToId,
        slaDueAt,
        resolvedAt: spec.resolvedAt || null,
        rating: spec.rating || null,
        ratingFeedback: spec.ratingFeedback || null,
        ratedAt: spec.rating ? spec.resolvedAt || now : null,
        sourceChannel: spec.sourceChannel,
        qrSpotCode: spec.qrSpotCode || null,
        originalLanguage: spec.originalLanguage || "en",
        originalTranscript: spec.originalTranscript || null,
        aiCategory: spec.aiCategory || null,
        aiPriority: spec.aiPriority || null,
        aiSummary: spec.aiSummary || null,
        aiConfidence: spec.aiConfidence || null,
        endorsementCount: spec.endorsementCount || 1,
        endorsedByUserIds: [demoUsers.student.id],
        escalationLevel: spec.escalationLevel || 0,
        escalatedAt: spec.escalatedAt || null,
        escalationReason: spec.escalationReason || null,
        isDemoRecord: true,
        createdAt: spec.createdAt,
        updatedAt: spec.resolvedAt || spec.escalatedAt || spec.createdAt,
      })
      .returning();

    insertedComplaints.push(row);

    await db.insert(complaintActivities).values({
      complaintId: row.id,
      authorId: demoUsers.student.id,
      authorName: demoUsers.student.name,
      authorRole: "user",
      kind: "submitted",
      body: `Complaint filed via ${spec.sourceChannel.toUpperCase()} (${spec.category}, ${spec.priority} priority).`,
      meta: { sourceChannel: spec.sourceChannel, qrSpotCode: spec.qrSpotCode || null },
      createdAt: spec.createdAt,
    });

    if (spec.status === "resolved" && spec.resolvedAt) {
      await db.insert(complaintActivities).values({
        complaintId: row.id,
        authorId: demoUsers.staff.id,
        authorName: demoUsers.staff.name,
        authorRole: "staff",
        kind: "status_change",
        body: "Issue resolved and verified on-site.",
        meta: { status: "resolved" },
        createdAt: spec.resolvedAt,
      });
    } else if (spec.escalationLevel && spec.escalationLevel >= 1) {
      await db.insert(complaintActivities).values({
        complaintId: row.id,
        authorId: null,
        authorName: "SLA Escalation Engine",
        authorRole: "system",
        kind: "escalation",
        body: spec.escalationReason || `Escalated to Level ${spec.escalationLevel}.`,
        meta: { newLevel: spec.escalationLevel },
        createdAt: spec.escalatedAt || now,
      });
    }
  }

  await seedOrResetCampusNavigationAndAcademics(demoUsers, forceReset);

  return {
    seeded: true,
    count: insertedComplaints.length,
    qrSpotCount: qrSeedSpecs.length,
    demoUsers,
  };
}
