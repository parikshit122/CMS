import { asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "./index.ts";
import {
  academicCourses,
  academicDepartments,
  campusBuildings,
  campusFloors,
  campusMapEdges,
  campusMapNodes,
  campusQrSpots,
  complaints,
  complaintCounters,
  lostFoundItems,
  settings,
} from "./schema.ts";
import { getSettingsSingleton, updateSettingsSingleton } from "./settings.ts";
import { toNumericId } from "./users.ts";
import {
  applyCampusAccessPolicies,
  computeEuclideanMeters,
  maskInstitutionText,
  normalizeAccessTier,
  resolveInstitutionBranding,
  resolveViewerAccessTier,
} from "../lib/campus-navigation.ts";

// ── Default Physical Campus QR Spots (Auto-seeded on fresh DB) ─

export const DEFAULT_CAMPUS_QR_SPOTS = [
  {
    spotCode: "CAMPUS-CSLAB-02",
    label: "Computer Lab 2 — Projection & LAN Desk",
    building: "Engineering Block B",
    floor: "2nd Floor",
    locationId: "lab-cs",
    defaultCategory: "it",
    scanCount: 42,
    complaintCount: 5,
  },
  {
    spotCode: "CAMPUS-HOSTELA-WC",
    label: "Hostel Block A — RO Water Cooler",
    building: "Boys Hostel Block A",
    floor: "1st Floor",
    locationId: "hostel-a",
    defaultCategory: "plumbing",
    scanCount: 31,
    complaintCount: 4,
  },
  {
    spotCode: "CAMPUS-LIB-HALL",
    label: "Central Library — Reading Hall AC & Wi-Fi",
    building: "Central Academic Block",
    floor: "1st Floor",
    locationId: "library",
    defaultCategory: "electrical",
    scanCount: 27,
    complaintCount: 3,
  },
  {
    spotCode: "CAMPUS-CANTEEN-01",
    label: "Campus Canteen — Hygiene & Seating Area",
    building: "Student Amenities Center",
    floor: "Ground Floor",
    locationId: "canteen",
    defaultCategory: "cleanliness",
    scanCount: 19,
    complaintCount: 2,
  },
  {
    spotCode: "CAMPUS-PARKING-GATE",
    label: "Main Gate & Two-Wheeler Parking Lights",
    building: "Campus Entrance",
    floor: "Outdoor",
    locationId: "parking",
    defaultCategory: "safety",
    scanCount: 15,
    complaintCount: 2,
  },
];

let defaultQrSeedPromise: Promise<void> | null = null;

export async function ensureDefaultQrSpotsSeeded() {
  const existing = await db
    .select({ id: campusQrSpots.id })
    .from(campusQrSpots)
    .limit(1);
  if (existing.length > 0) return;

  if (!defaultQrSeedPromise) {
    defaultQrSeedPromise = (async () => {
      for (const spot of DEFAULT_CAMPUS_QR_SPOTS) {
        await db
          .insert(campusQrSpots)
          .values({
            ...spot,
            isActive: true,
            isDemoRecord: true,
          })
          .onConflictDoNothing({ target: campusQrSpots.spotCode });
      }
    })().finally(() => {
      defaultQrSeedPromise = null;
    });
  }

  await defaultQrSeedPromise;
}

// ── Institution Branding & Avishkar Blind-Evaluation Mode ──

export async function getInstitutionBranding() {
  const s = await getSettingsSingleton();
  return resolveInstitutionBranding({
    siteName: s.siteName,
    siteTagline: s.siteTagline,
    institutionCode: s.institutionCode,
    allowedDomain: s.allowedDomain,
    blindEvaluationMode: s.blindEvaluationMode,
  });
}

export async function updateInstitutionBranding(input: {
  blindEvaluationMode?: boolean;
  siteName?: string;
  siteTagline?: string;
  institutionCode?: string;
  allowedDomain?: string;
}) {
  const updates: Record<string, unknown> = {};
  if (typeof input.blindEvaluationMode === "boolean") {
    updates.blindEvaluationMode = input.blindEvaluationMode;
  }
  if (typeof input.siteName === "string" && input.siteName.trim()) {
    updates.siteName = input.siteName.trim().slice(0, 80);
  }
  if (typeof input.siteTagline === "string" && input.siteTagline.trim()) {
    updates.siteTagline = input.siteTagline.trim().slice(0, 140);
  }
  if (typeof input.institutionCode === "string" && input.institutionCode.trim()) {
    updates.institutionCode = input.institutionCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 16);
  }
  if (typeof input.allowedDomain === "string" && input.allowedDomain.trim()) {
    updates.allowedDomain = input.allowedDomain.trim().toLowerCase().slice(0, 80);
  }

  const saved = await updateSettingsSingleton(updates);
  return resolveInstitutionBranding({
    siteName: saved.siteName,
    siteTagline: saved.siteTagline,
    institutionCode: saved.institutionCode,
    allowedDomain: saved.allowedDomain,
    blindEvaluationMode: saved.blindEvaluationMode,
  });
}

// ── Seeder for Campus Maps, Academic Tree & Lost & Found ──

async function nextDemoLostFoundCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `lost_found_${year}`;
  const rows = await db
    .insert(complaintCounters)
    .values({ id: key, seq: 1 })
    .onConflictDoUpdate({
      target: complaintCounters.id,
      set: { seq: sql`${complaintCounters.seq} + 1` },
    })
    .returning({ seq: complaintCounters.seq });
  return `LF-${year}-${String(rows[0]?.seq || 1).padStart(4, "0")}`;
}

export async function seedOrResetCampusNavigationAndAcademics(
  demoUsers?: {
    student?: { id: number };
    staff?: { id: number };
    admin?: { id: number };
  },
  forceReset = false
) {
  const existingBuildings = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(campusBuildings);
  const existingDepts = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(academicDepartments);
  const existingLf = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(lostFoundItems)
    .where(eq(lostFoundItems.isDemoRecord, true));

  const needsMapSeed = forceReset || Number(existingBuildings[0]?.c || 0) === 0;
  const needsDeptSeed = forceReset || Number(existingDepts[0]?.c || 0) === 0;
  const needsLfSeed = forceReset || Number(existingLf[0]?.c || 0) === 0;

  if (!needsMapSeed && !needsDeptSeed && !needsLfSeed) {
    return { seeded: false };
  }

  if (forceReset) {
    await db.delete(campusMapEdges).where(eq(campusMapEdges.isDemoRecord, true));
    await db.delete(campusMapNodes).where(eq(campusMapNodes.isDemoRecord, true));
    await db.delete(campusFloors).where(eq(campusFloors.isDemoRecord, true));
    await db.delete(academicCourses).where(eq(academicCourses.isDemoRecord, true));
    await db.delete(academicDepartments).where(eq(academicDepartments.isDemoRecord, true));
    await db.delete(campusBuildings).where(eq(campusBuildings.isDemoRecord, true));
    await db.delete(lostFoundItems).where(eq(lostFoundItems.isDemoRecord, true));
  }

  const buildingByCode = new Map<string, typeof campusBuildings.$inferSelect>();
  const nodeByCode = new Map<string, typeof campusMapNodes.$inferSelect>();

  // 1. Seed Campus Buildings + 3 Architectural Floor Plans + Navigable Graph
  if (needsMapSeed) {
    const buildingSpecs = [
      {
        code: "BLK-B",
        name: "Engineering Block B",
        shortLabel: "Block B",
        category: "academic",
        siteX: 34,
        siteY: 42,
        description: "Computer Science, AI/ML Labs, Electronics Lab, Seminar Hall & R&D Cell.",
      },
      {
        code: "LIB-MAIN",
        name: "Central Academic & Library Block",
        shortLabel: "Library",
        category: "library",
        siteX: 66,
        siteY: 38,
        description: "Central Reading Hall, Digital Archives, Exam Cell & Management Wing.",
      },
      {
        code: "AMEN-01",
        name: "Student Amenities & Canteen",
        shortLabel: "Canteen",
        category: "amenities",
        siteX: 68,
        siteY: 72,
        description: "Campus Cafeteria, Student Commons & Drinking Water Station.",
      },
      {
        code: "HST-A",
        name: "Hostel Block A",
        shortLabel: "Hostel A",
        category: "hostel",
        siteX: 24,
        siteY: 22,
        description: "Residential Wing A with RO Water Coolers & Common Study Lounge.",
      },
      {
        code: "SEC-DESK",
        name: "Security & Lost-Found Custody Desk",
        shortLabel: "Security Desk",
        category: "admin",
        siteX: 26,
        siteY: 78,
        description: "24x7 Campus Security, Visitor Entry & Official Lost & Found Custody Counter.",
      },
    ];

    for (const spec of buildingSpecs) {
      const inserted = await db
        .insert(campusBuildings)
        .values({ ...spec, isDemoRecord: true })
        .onConflictDoUpdate({
          target: campusBuildings.code,
          set: {
            name: spec.name,
            shortLabel: spec.shortLabel,
            category: spec.category,
            siteX: spec.siteX,
            siteY: spec.siteY,
            description: spec.description,
            updatedAt: new Date(),
          },
        })
        .returning();
      buildingByCode.set(spec.code, inserted[0]);
    }

    const blkB = buildingByCode.get("BLK-B")!;
    const lib = buildingByCode.get("LIB-MAIN")!;
    const amen = buildingByCode.get("AMEN-01")!;
    const hstA = buildingByCode.get("HST-A")!;
    const sec = buildingByCode.get("SEC-DESK")!;

    // Insert 3 architectural map layers (1 Outdoor + 2 Indoor Floors for Engineering Block B)
    const [outdoorFloor] = await db
      .insert(campusFloors)
      .values({
        buildingId: null,
        floorNumber: -1,
        floorLabel: "Outdoor Campus Site Plan",
        mapImageUrl: "/maps/campus-outdoor.svg",
        widthMeters: 220,
        heightMeters: 154,
        isOutdoor: true,
        isDemoRecord: true,
      })
      .returning();

    const [groundFloor] = await db
      .insert(campusFloors)
      .values({
        buildingId: blkB.id,
        floorNumber: 0,
        floorLabel: "Block B — Ground Floor",
        mapImageUrl: "/maps/block-b-ground.svg",
        widthMeters: 60,
        heightMeters: 42,
        isOutdoor: false,
        isDemoRecord: true,
      })
      .returning();

    const [secondFloor] = await db
      .insert(campusFloors)
      .values({
        buildingId: blkB.id,
        floorNumber: 2,
        floorLabel: "Block B — 2nd Floor",
        mapImageUrl: "/maps/block-b-floor2.svg",
        widthMeters: 60,
        heightMeters: 42,
        isOutdoor: false,
        isDemoRecord: true,
      })
      .returning();

    // Insert Outdoor + Ground Floor + 2nd Floor Nodes (aligned with SVG artwork!)
    const nodeSpecs: Array<{
      code: string;
      label: string;
      floorId: number;
      buildingId: number | null;
      nodeType: string;
      x: number;
      y: number;
      isAccessible: boolean;
      qrSpotCode?: string;
      description?: string;
    }> = [
      // Outdoor Campus Nodes
      { code: "OUT-GATE", label: "Main Campus Gate", floorId: outdoorFloor.id, buildingId: null, nodeType: "entrance", x: 12, y: 86, isAccessible: true, description: "Primary accessible campus entry gate." },
      { code: "OUT-PARK", label: "Two-Wheeler Parking Bay P1", floorId: outdoorFloor.id, buildingId: null, nodeType: "qr_anchor", x: 14, y: 68, isAccessible: true, qrSpotCode: "CAMPUS-PARKING-GATE", description: "Student two-wheeler parking & perimeter lights." },
      { code: "OUT-SEC", label: "Security & Lost-Found Desk", floorId: outdoorFloor.id, buildingId: sec.id, nodeType: "desk", x: 26, y: 78, isAccessible: true, description: "Official Lost & Found verification & pickup counter." },
      { code: "OUT-BLKB", label: "Engineering Block B Entry Plaza", floorId: outdoorFloor.id, buildingId: blkB.id, nodeType: "entrance", x: 34, y: 42, isAccessible: true, description: "Main ramp & lobby entrance for Engineering Block B." },
      { code: "OUT-HSTA", label: "Hostel Block A — RO Water Wing", floorId: outdoorFloor.id, buildingId: hstA.id, nodeType: "qr_anchor", x: 24, y: 22, isAccessible: true, qrSpotCode: "CAMPUS-HOSTELA-WC", description: "Hostel residential block & RO drinking water station." },
      { code: "OUT-LIB", label: "Central Library & Reading Hall", floorId: outdoorFloor.id, buildingId: lib.id, nodeType: "qr_anchor", x: 66, y: 38, isAccessible: true, qrSpotCode: "CAMPUS-LIB-HALL", description: "Main reading hall, digital archives & exam cell." },
      { code: "OUT-CANT", label: "Campus Canteen & Amenities", floorId: outdoorFloor.id, buildingId: amen.id, nodeType: "qr_anchor", x: 68, y: 72, isAccessible: true, qrSpotCode: "CAMPUS-CANTEEN-01", description: "Student dining hall & common amenities center." },

      // Block B — Ground Floor Nodes
      { code: "BG-ENT", label: "Block B Main Entrance & Ramp", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "entrance", x: 18, y: 76, isAccessible: true, description: "Step-free Divyangjan ramp entry to Block B." },
      { code: "BG-LOBBY", label: "Ground Floor Central Junction", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "corridor", x: 35, y: 50, isAccessible: true, description: "Central corridor intersection near reception." },
      { code: "BG-DESK", label: "Block B Reception & Help Desk", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "desk", x: 54, y: 76, isAccessible: true, description: "Information desk & indoor QR map directory." },
      { code: "BG-SEMINAR", label: "Seminar Hall (G-101)", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "room", x: 20, y: 26, isAccessible: true, description: "180-seat auditorium for guest lectures & presentations." },
      { code: "BG-STAIRS", label: "Staircase B (Ground Floor)", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "stairs", x: 37, y: 31, isAccessible: false, description: "Central stairwell connecting Ground to 2nd Floor." },
      { code: "BG-CORR-E", label: "East Corridor Junction (Ground)", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "corridor", x: 66, y: 50, isAccessible: true, description: "Accessible hallway leading to Elevator 1 & Dean Office." },
      { code: "BG-LIFT", label: "Wheelchair Elevator 1 (Ground)", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "elevator", x: 66, y: 31, isAccessible: true, description: "Divyangjan accessible elevator serving all floors." },
      { code: "BG-DEAN", label: "Dean & Admin Office (G-104)", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "room", x: 82, y: 26, isAccessible: true, description: "Academic Dean & Institutional Governance office." },
      { code: "BG-WORK", label: "Robotics Workshop (G-108)", floorId: groundFloor.id, buildingId: blkB.id, nodeType: "lab", x: 80, y: 76, isAccessible: true, description: "Mechanical fabrication & robotics prototyping workshop." },

      // Block B — 2nd Floor Nodes
      { code: "B2-STAIRS", label: "Staircase B (2nd Floor)", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "stairs", x: 36, y: 31, isAccessible: false, description: "2nd floor stairwell landing." },
      { code: "B2-CORR-W", label: "2nd Floor West Lab Corridor", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "corridor", x: 36, y: 50, isAccessible: true, description: "Corridor serving Computer Lab 1, Lab 2 & CSE HOD." },
      { code: "B2-CORR-E", label: "2nd Floor East Lab Corridor", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "corridor", x: 66, y: 50, isAccessible: true, description: "Accessible corridor outside Elevator 1 & Innovation Cell." },
      { code: "B2-LIFT", label: "Wheelchair Elevator 1 (2nd Floor)", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "elevator", x: 66, y: 31, isAccessible: true, description: "Accessible lift landing on 2nd Floor." },
      { code: "B2-LAB1", label: "Computer Lab 1 — AI & ML (201)", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "lab", x: 19, y: 25, isAccessible: true, description: "GPU workstations & AI/ML practical laboratory." },
      { code: "B2-LAB2", label: "Computer Lab 2 — Projection & LAN (202)", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "lab", x: 51, y: 25, isAccessible: true, qrSpotCode: "CAMPUS-CSLAB-02", description: "Core programming lab equipped with ceiling projector & LAN." },
      { code: "B2-IOT", label: "IoT & VLSI Lab (203)", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "lab", x: 82, y: 25, isAccessible: true, description: "Embedded microcontrollers, sensors & VLSI workbench." },
      { code: "B2-HOD", label: "CSE Dept & HOD Cabin (204)", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "room", x: 21, y: 74, isAccessible: true, description: "Head of Department & CSE faculty office." },
      { code: "B2-CLASS", label: "Smart Classroom 205", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "room", x: 49, y: 74, isAccessible: true, description: "Interactive smart board lecture hall (90 seats)." },
      { code: "B2-RD", label: "Innovation & R&D Cell (206)", floorId: secondFloor.id, buildingId: blkB.id, nodeType: "lab", x: 78, y: 74, isAccessible: true, description: "Student research & Avishkar prototyping hub." },
    ];

    for (const spec of nodeSpecs) {
      const [inserted] = await db
        .insert(campusMapNodes)
        .values({ ...spec, isDemoRecord: true })
        .returning();
      nodeByCode.set(spec.code, inserted);

      // Link matching QR spot row to this mapNodeId
      if (spec.qrSpotCode) {
        await db
          .update(campusQrSpots)
          .set({ mapNodeId: inserted.id, updatedAt: new Date() })
          .where(eq(campusQrSpots.spotCode, spec.qrSpotCode));
      }
    }

    // Build Walkable Edges (Outdoor + Indoor + Cross-Floor Stairs & Elevator)
    const floorDims = new Map<number, { w: number; h: number }>([
      [outdoorFloor.id, { w: 220, h: 154 }],
      [groundFloor.id, { w: 60, h: 42 }],
      [secondFloor.id, { w: 60, h: 42 }],
    ]);

    const edgeSpecs: Array<[string, string, string, boolean, number?]> = [
      // Outdoor campus walkways
      ["OUT-GATE", "OUT-PARK", "walkway", true],
      ["OUT-GATE", "OUT-SEC", "walkway", true],
      ["OUT-PARK", "OUT-SEC", "walkway", true],
      ["OUT-SEC", "OUT-BLKB", "walkway", true],
      ["OUT-SEC", "OUT-CANT", "walkway", true],
      ["OUT-BLKB", "OUT-HSTA", "walkway", true],
      ["OUT-BLKB", "OUT-LIB", "walkway", true],
      ["OUT-LIB", "OUT-CANT", "walkway", true],

      // Outdoor-to-Indoor Building Entry Handoff (Block B Plaza -> Block B Main Entrance)
      ["OUT-BLKB", "BG-ENT", "ramp", true, 8],

      // Block B Ground Floor Corridors
      ["BG-ENT", "BG-LOBBY", "ramp", true],
      ["BG-LOBBY", "BG-DESK", "corridor", true],
      ["BG-LOBBY", "BG-SEMINAR", "corridor", true],
      ["BG-LOBBY", "BG-STAIRS", "corridor", true],
      ["BG-LOBBY", "BG-CORR-E", "corridor", true],
      ["BG-CORR-E", "BG-LIFT", "corridor", true],
      ["BG-CORR-E", "BG-DEAN", "corridor", true],
      ["BG-CORR-E", "BG-WORK", "corridor", true],
      ["BG-DESK", "BG-CORR-E", "corridor", true],

      // Vertical Multi-Floor Connectors (Stairs = NOT wheelchair accessible; Elevator = accessible!)
      ["BG-STAIRS", "B2-STAIRS", "stairs", false, 9],
      ["BG-LIFT", "B2-LIFT", "elevator", true, 9],

      // Block B 2nd Floor Corridors
      ["B2-STAIRS", "B2-CORR-W", "corridor", true],
      ["B2-CORR-W", "B2-LAB1", "corridor", true],
      ["B2-CORR-W", "B2-LAB2", "corridor", true],
      ["B2-CORR-W", "B2-HOD", "corridor", true],
      ["B2-CORR-W", "B2-CLASS", "corridor", true],
      ["B2-CORR-W", "B2-CORR-E", "corridor", true],
      ["B2-CORR-E", "B2-LIFT", "corridor", true],
      ["B2-CORR-E", "B2-LAB2", "corridor", true],
      ["B2-CORR-E", "B2-IOT", "corridor", true],
      ["B2-CORR-E", "B2-CLASS", "corridor", true],
      ["B2-CORR-E", "B2-RD", "corridor", true],
    ];

    for (const [fromCode, toCode, edgeType, isAccessible, overrideMeters] of edgeSpecs) {
      const a = nodeByCode.get(fromCode);
      const b = nodeByCode.get(toCode);
      if (!a || !b) continue;
      const dims = floorDims.get(a.floorId) || { w: 60, h: 42 };
      const dist =
        overrideMeters ??
        computeEuclideanMeters({ x: a.x, y: a.y }, { x: b.x, y: b.y }, dims.w, dims.h);
      await db.insert(campusMapEdges).values({
        fromNodeId: a.id,
        toNodeId: b.id,
        distanceMeters: dist,
        edgeType,
        isAccessible,
        isDemoRecord: true,
      });
    }
  } else {
    const allB = await db.select().from(campusBuildings);
    for (const b of allB) buildingByCode.set(b.code, b);
    const allN = await db.select().from(campusMapNodes);
    for (const n of allN) nodeByCode.set(n.code, n);
  }

  // 2. Seed Multi-University Academic Hierarchy (4 Departments + 8 Courses)
  if (needsDeptSeed) {
    const blkB = buildingByCode.get("BLK-B");
    const lib = buildingByCode.get("LIB-MAIN");

    const deptSpecs = [
      {
        code: "CSE",
        name: "Computer Science & Engineering",
        buildingId: blkB?.id ?? null,
        hodName: "Head of Dept — Computer Science",
        hodEmail: "hod.cse@campus.edu",
        courses: [
          { code: "BTECH-CSE", name: "B.Tech Computer Engineering", degreeLevel: "UG", durationYears: 4, divisions: ["A", "B"], intakeCapacity: 120 },
          { code: "MTECH-AI", name: "M.Tech Artificial Intelligence & Data Science", degreeLevel: "PG", durationYears: 2, divisions: ["A"], intakeCapacity: 30 },
        ],
      },
      {
        code: "EXTC",
        name: "Electronics & Telecommunication",
        buildingId: blkB?.id ?? null,
        hodName: "Head of Dept — Electronics & IoT",
        hodEmail: "hod.extc@campus.edu",
        courses: [
          { code: "BTECH-EXTC", name: "B.Tech Electronics & IoT Engineering", degreeLevel: "UG", durationYears: 4, divisions: ["A", "B"], intakeCapacity: 90 },
          { code: "DIP-EMB", name: "Diploma in Embedded Systems", degreeLevel: "Diploma", durationYears: 3, divisions: ["A"], intakeCapacity: 60 },
        ],
      },
      {
        code: "MECH",
        name: "Mechanical & Robotics Engineering",
        buildingId: blkB?.id ?? null,
        hodName: "Head of Dept — Mechanical & Robotics",
        hodEmail: "hod.mech@campus.edu",
        courses: [
          { code: "BTECH-MECH", name: "B.Tech Mechanical Engineering", degreeLevel: "UG", durationYears: 4, divisions: ["A", "B"], intakeCapacity: 120 },
          { code: "BTECH-ROBO", name: "B.Tech Robotics & Automation", degreeLevel: "UG", durationYears: 4, divisions: ["A"], intakeCapacity: 60 },
        ],
      },
      {
        code: "MGMT",
        name: "School of Management & Applied Sciences",
        buildingId: lib?.id ?? null,
        hodName: "Dean — Management & Sciences",
        hodEmail: "dean.mgmt@campus.edu",
        courses: [
          { code: "MBA-TECH", name: "MBA Technology & Operations Management", degreeLevel: "PG", durationYears: 2, divisions: ["A", "B"], intakeCapacity: 60 },
          { code: "BSC-DS", name: "B.Sc Applied Data Science", degreeLevel: "UG", durationYears: 3, divisions: ["A"], intakeCapacity: 60 },
        ],
      },
    ];

    for (const d of deptSpecs) {
      const [deptRow] = await db
        .insert(academicDepartments)
        .values({
          code: d.code,
          name: d.name,
          buildingId: d.buildingId,
          hodName: d.hodName,
          hodEmail: d.hodEmail,
          isActive: true,
          isDemoRecord: true,
        })
        .onConflictDoUpdate({
          target: academicDepartments.code,
          set: {
            name: d.name,
            buildingId: d.buildingId,
            hodName: d.hodName,
            hodEmail: d.hodEmail,
            updatedAt: new Date(),
          },
        })
        .returning();

      for (const c of d.courses) {
        await db
          .insert(academicCourses)
          .values({
            departmentId: deptRow.id,
            code: c.code,
            name: c.name,
            degreeLevel: c.degreeLevel,
            durationYears: c.durationYears,
            divisions: c.divisions,
            intakeCapacity: c.intakeCapacity,
            isActive: true,
            isDemoRecord: true,
          })
          .onConflictDoUpdate({
            target: academicCourses.code,
            set: {
              name: c.name,
              degreeLevel: c.degreeLevel,
              durationYears: c.durationYears,
              divisions: c.divisions,
              intakeCapacity: c.intakeCapacity,
              updatedAt: new Date(),
            },
          });
      }
    }
  }

  // 3. Seed 4 Realistic Lost & Found Demo Items Pinned Directly to Campus Map Nodes
  if (needsLfSeed && demoUsers?.staff?.id && demoUsers?.student?.id) {
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);

    const lfSpecs = [
      {
        title: "Casio fx-991EX Scientific Calculator",
        description: "Found left on workstation desk #14 after morning practical session. Protective slide cover has a small sticker mark.",
        category: "electronics",
        foundLocation: "Computer Lab 2 — 2nd Floor, Engineering Block B",
        foundAt: hoursAgo(4),
        custodyType: "security_desk",
        custodyLocation: "Security & Lost-Found Desk (Main Gate Plaza)",
        verificationQuestion: "What colored sticker or initials are written inside the slide cover?",
        verificationAnswerSecret: "blue sticker CS",
        status: "open",
        finderId: demoUsers.staff.id,
        nodeCode: "B2-LAB2",
      },
      {
        title: "Wireless Earbuds Charging Case (Matte Black)",
        description: "Recovered near the 3rd row seating in Seminar Hall G-101 after the technical seminar.",
        category: "electronics",
        foundLocation: "Seminar Hall (G-101) — Ground Floor, Block B",
        foundAt: hoursAgo(9),
        custodyType: "security_desk",
        custodyLocation: "Security & Lost-Found Desk (Main Gate Plaza)",
        contactPhone: "9876543210",
        verificationQuestion: "What brand name and case sleeve color is on the charging case?",
        verificationAnswerSecret: "OnePlus black silicone",
        status: "open",
        finderId: demoUsers.student.id,
        nodeCode: "BG-SEMINAR",
      },
      {
        title: "Engineering Drawing Folder & Steel Scale Set",
        description: "Zippered A3 drafting folder found on Reading Hall table near the reference section.",
        category: "books_notes",
        foundLocation: "Central Library — Reading Hall",
        foundAt: hoursAgo(18),
        custodyType: "admin_office",
        custodyLocation: "Central Library Circulation Desk",
        contactPhone: "9876501234",
        verificationQuestion: "Which subject notebook and pen brand are inside the front pocket?",
        verificationAnswerSecret: "Engineering Graphics Parker",
        status: "open",
        finderId: demoUsers.staff.id,
        nodeCode: "OUT-LIB",
      },
      {
        title: "Keychain with Hostel Locker Key & RFID Tag",
        description: "Found near the Block B Reception Desk walkway. Has two brass keys and a blue RFID fob.",
        category: "wallet_keys",
        foundLocation: "Block B Reception & Help Desk — Ground Floor",
        foundAt: hoursAgo(2),
        custodyType: "security_desk",
        custodyLocation: "Security & Lost-Found Desk (Main Gate Plaza)",
        contactPhone: "9876543210",
        verificationQuestion: "What room number tag or charm is attached to the keyring?",
        verificationAnswerSecret: "Room 204 guitar charm",
        status: "open",
        finderId: demoUsers.staff.id,
        nodeCode: "BG-DESK",
      },
    ];

    for (const item of lfSpecs) {
      const code = await nextDemoLostFoundCode();
      const mapNode = nodeByCode.get(item.nodeCode);
      await db.insert(lostFoundItems).values({
        itemCode: code,
        title: item.title,
        description: item.description,
        category: item.category,
        foundLocation: item.foundLocation,
        foundAt: item.foundAt,
        custodyType: item.custodyType,
        custodyLocation: item.custodyLocation,
        contactPhone: item.contactPhone || "9876543210",
        blurImagePublicly: true,
        verificationQuestion: item.verificationQuestion,
        verificationAnswerSecret: item.verificationAnswerSecret,
        status: item.status,
        finderId: item.finderId,
        mapNodeId: mapNode?.id ?? null,
        isDemoRecord: true,
      });
    }
  }

  return { seeded: true };
}

let sensitiveSeedPromise: Promise<void> | null = null;

/**
 * Ensures realistic institution-neutral sample sensitive places exist once on starter demo maps
 * so visitors and admins immediately experience locked restricted zones across all 4 tiers.
 */
async function ensureSampleSensitiveZonesSeeded() {
  const existingSensitive = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(campusMapNodes)
    .where(eq(campusMapNodes.isSensitive, true));

  if (Number(existingSensitive[0]?.c || 0) > 0) return;

  if (!sensitiveSeedPromise) {
    sensitiveSeedPromise = (async () => {
      const allNodes = await db.select().from(campusMapNodes);
      const byCode = new Map(allNodes.map((n) => [n.code, n]));

      const dean = byCode.get("BG-DEAN");
      if (dean) {
        await db
          .update(campusMapNodes)
          .set({
            accessLevel: "staff",
            isSensitive: true,
            restrictedNotice:
              "Authorized Staff & Faculty Only — Institutional Governance & Records Office.",
            updatedAt: new Date(),
          })
          .where(eq(campusMapNodes.id, dean.id));
      }

      const rd = byCode.get("B2-RD");
      if (rd) {
        await db
          .update(campusMapNodes)
          .set({
            accessLevel: "student",
            isSensitive: true,
            restrictedNotice:
              "Verified Student ID Required — Research & Prototyping Laboratory.",
            updatedAt: new Date(),
          })
          .where(eq(campusMapNodes.id, rd.id));
      }

      const groundCorr = byCode.get("BG-CORR-E");
      if (groundCorr && !byCode.has("BG-EXAM")) {
        const [examNode] = await db
          .insert(campusMapNodes)
          .values({
            floorId: groundCorr.floorId,
            buildingId: groundCorr.buildingId,
            code: "BG-EXAM",
            label: "Examination Control Vault (G-105)",
            nodeType: "room",
            x: 82,
            y: 48,
            isAccessible: true,
            description: "Confidential examination paper vault and assessment control cell.",
            accessLevel: "staff",
            isSensitive: true,
            restrictedNotice:
              "Restricted Examination Cell — Authorized Staff Clearance Required.",
            isDemoRecord: true,
          })
          .returning();

        if (examNode) {
          await db.insert(campusMapEdges).values({
            fromNodeId: groundCorr.id,
            toNodeId: examNode.id,
            distanceMeters: 10,
            edgeType: "corridor",
            isAccessible: true,
            accessLevel: "staff",
            isSensitive: true,
            isDemoRecord: true,
          });
        }
      }

      const floor2Corr = byCode.get("B2-CORR-E");
      if (floor2Corr && !byCode.has("B2-SERVER")) {
        const [serverNode] = await db
          .insert(campusMapNodes)
          .values({
            floorId: floor2Corr.floorId,
            buildingId: floor2Corr.buildingId,
            code: "B2-SERVER",
            label: "Core Network & Server Vault (207)",
            nodeType: "lab",
            x: 84,
            y: 50,
            isAccessible: true,
            description: "Campus backbone fiber switching, identity servers, and CCTV storage.",
            accessLevel: "admin",
            isSensitive: true,
            restrictedNotice:
              "High-Security Infrastructure — Campus Admin Clearance Required.",
            isDemoRecord: true,
          })
          .returning();

        if (serverNode) {
          await db.insert(campusMapEdges).values({
            fromNodeId: floor2Corr.id,
            toNodeId: serverNode.id,
            distanceMeters: 11,
            edgeType: "corridor",
            isAccessible: true,
            accessLevel: "admin",
            isSensitive: true,
            isDemoRecord: true,
          });
        }
      }
    })().finally(() => {
      sensitiveSeedPromise = null;
    });
  }

  await sensitiveSeedPromise;
}

// ── Public & Role-Aware Campus Navigation Bundle ──────────

export async function getCampusNavigationBundle(
  options: {
    viewerUser?: {
      role?: string | null;
      isVerified?: boolean | null;
      emailVerified?: boolean | null;
      isActive?: boolean | null;
    } | null;
    includeUnredacted?: boolean;
  } = {}
) {
  // Ensure starter maps & courses exist so public/judge views are never bare
  const [existingBuildings, existingDepts] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(campusBuildings),
    db.select({ c: sql<number>`count(*)::int` }).from(academicDepartments),
  ]);
  if (
    Number(existingBuildings[0]?.c || 0) === 0 ||
    Number(existingDepts[0]?.c || 0) === 0
  ) {
    await seedOrResetCampusNavigationAndAcademics(undefined, false);
  }
  await Promise.all([ensureDefaultQrSpotsSeeded(), ensureSampleSensitiveZonesSeeded()]);

  const [branding, buildings, floors, nodes, edges, departments, courses, openComplaints, qrSpots, lfItems] =
    await Promise.all([
      getInstitutionBranding(),
      db.select().from(campusBuildings).orderBy(asc(campusBuildings.name)),
      db.select().from(campusFloors).orderBy(asc(campusFloors.floorNumber), asc(campusFloors.id)),
      db.select().from(campusMapNodes).orderBy(asc(campusMapNodes.id)),
      db.select().from(campusMapEdges).orderBy(asc(campusMapEdges.id)),
      db.select().from(academicDepartments).where(eq(academicDepartments.isActive, true)).orderBy(asc(academicDepartments.name)),
      db.select().from(academicCourses).where(eq(academicCourses.isActive, true)).orderBy(asc(academicCourses.name)),
      db
        .select({
          id: complaints.id,
          complaintId: complaints.complaintId,
          title: complaints.title,
          category: complaints.category,
          priority: complaints.priority,
          status: complaints.status,
          location: complaints.location,
          qrSpotCode: complaints.qrSpotCode,
          escalationLevel: complaints.escalationLevel,
          endorsementCount: complaints.endorsementCount,
        })
        .from(complaints)
        .where(inArray(complaints.status, ["pending", "in-progress"]))
        .orderBy(desc(complaints.createdAt))
        .limit(40),
      db
        .select()
        .from(campusQrSpots)
        .where(eq(campusQrSpots.isActive, true))
        .orderBy(desc(campusQrSpots.scanCount)),
      db
        .select({
          id: lostFoundItems.id,
          itemCode: lostFoundItems.itemCode,
          title: lostFoundItems.title,
          category: lostFoundItems.category,
          foundLocation: lostFoundItems.foundLocation,
          custodyLocation: lostFoundItems.custodyLocation,
          status: lostFoundItems.status,
          mapNodeId: lostFoundItems.mapNodeId,
          foundAt: lostFoundItems.foundAt,
        })
        .from(lostFoundItems)
        .where(ne(lostFoundItems.status, "archived"))
        .orderBy(desc(lostFoundItems.createdAt))
        .limit(30),
    ]);

  const blind = branding.blindEvaluationMode;
  const nodeByQr = new Map<string, number>();
  for (const n of nodes) {
    if (n.qrSpotCode) nodeByQr.set(n.qrSpotCode.toUpperCase(), n.id);
  }
  for (const q of qrSpots) {
    if (q.mapNodeId && q.spotCode) nodeByQr.set(q.spotCode.toUpperCase(), q.mapNodeId);
  }

  // Match open complaints to map nodes via QR spot code or location heuristic
  const lab2Node = nodes.find((n) => n.code === "B2-LAB2") || nodes[0];
  const hostelNode = nodes.find((n) => n.code === "OUT-HSTA");
  const libNode = nodes.find((n) => n.code === "OUT-LIB");
  const canteenNode = nodes.find((n) => n.code === "OUT-CANT");
  const parkingNode = nodes.find((n) => n.code === "OUT-PARK");

  const mappedComplaints = openComplaints.map((c) => {
    let mapNodeId: number | null = c.qrSpotCode
      ? nodeByQr.get(c.qrSpotCode.toUpperCase()) ?? null
      : null;
    if (!mapNodeId) {
      const loc = `${c.location || ""} ${c.title || ""}`.toLowerCase();
      if (loc.includes("lab")) mapNodeId = lab2Node?.id ?? null;
      else if (loc.includes("hostel") || loc.includes("water")) mapNodeId = hostelNode?.id ?? null;
      else if (loc.includes("library")) mapNodeId = libNode?.id ?? null;
      else if (loc.includes("canteen")) mapNodeId = canteenNode?.id ?? null;
      else if (loc.includes("parking") || loc.includes("gate")) mapNodeId = parkingNode?.id ?? null;
    }
    return {
      ...c,
      title: maskInstitutionText(c.title, blind),
      qrSpotCode: c.qrSpotCode ? maskInstitutionText(c.qrSpotCode, blind) : null,
      rawQrSpotCode: c.qrSpotCode || null,
      mapNodeId,
    };
  });

  const mappedQrSpots = qrSpots.map((q) => ({
    ...q,
    displaySpotCode: maskInstitutionText(q.spotCode, blind),
    label: maskInstitutionText(q.label, blind),
    mapNodeId: q.mapNodeId ?? nodeByQr.get(q.spotCode.toUpperCase()) ?? null,
  }));

  const mappedLostFound = lfItems
    .filter((i) => i.status !== "returned")
    .map((i) => ({
      ...i,
      title: maskInstitutionText(i.title, blind),
      foundLocation: maskInstitutionText(i.foundLocation, blind),
      custodyLocation: maskInstitutionText(i.custodyLocation || "", blind),
    }));

  const deptWithCourses = departments.map((d) => ({
    ...d,
    hodEmail: maskInstitutionText(d.hodEmail || "", blind),
    courses: courses.filter((c) => c.departmentId === d.id),
  }));

  const rawBundle = {
    branding,
    buildings,
    floors,
    nodes: nodes.map((n) => ({
      ...n,
      displayQrSpotCode: n.qrSpotCode ? maskInstitutionText(n.qrSpotCode, blind) : null,
    })),
    edges,
    departments: deptWithCourses,
    livePins: {
      complaints: mappedComplaints,
      qrSpots: mappedQrSpots,
      lostFound: mappedLostFound,
    },
  };

  if (options.includeUnredacted) {
    return applyCampusAccessPolicies(rawBundle, "admin");
  }

  const viewerTier = resolveViewerAccessTier(options.viewerUser);
  return applyCampusAccessPolicies(rawBundle, viewerTier);
}

export async function getAcademicStructure() {
  const existingDepts = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(academicDepartments);
  if (Number(existingDepts[0]?.c || 0) === 0) {
    await seedOrResetCampusNavigationAndAcademics(undefined, false);
  }

  const [branding, departments, courses, buildings] = await Promise.all([
    getInstitutionBranding(),
    db.select().from(academicDepartments).orderBy(asc(academicDepartments.name)),
    db.select().from(academicCourses).orderBy(asc(academicCourses.name)),
    db.select().from(campusBuildings).orderBy(asc(campusBuildings.name)),
  ]);

  const bMap = new Map(buildings.map((b) => [b.id, b]));
  const blind = branding.blindEvaluationMode;

  return {
    branding,
    departments: departments.map((d) => ({
      ...d,
      hodEmail: maskInstitutionText(d.hodEmail || "", blind),
      buildingName: d.buildingId ? bMap.get(d.buildingId)?.name || "" : "",
      courses: courses.filter((c) => c.departmentId === d.id),
    })),
    courses,
  };
}

// ── Admin CRUD: Buildings, Floors, Nodes, Edges ───────────

export async function createCampusBuilding(input: {
  code: string;
  name: string;
  shortLabel?: string;
  category?: string;
  siteX?: number;
  siteY?: number;
  description?: string;
}) {
  const code = String(input.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .slice(0, 20);
  if (!code || !input.name?.trim()) {
    throw new Error("Building code and name are required.");
  }
  const [row] = await db
    .insert(campusBuildings)
    .values({
      code,
      name: input.name.trim(),
      shortLabel: (input.shortLabel || input.name).trim().slice(0, 28),
      category: (input.category || "academic").toLowerCase().trim(),
      siteX: Math.min(96, Math.max(4, Number(input.siteX ?? 50))),
      siteY: Math.min(96, Math.max(4, Number(input.siteY ?? 50))),
      description: (input.description || "").trim(),
      isDemoRecord: false,
    })
    .returning();
  return row;
}

export async function deleteCampusBuilding(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const [deleted] = await db
    .delete(campusBuildings)
    .where(eq(campusBuildings.id, numId))
    .returning();
  return deleted || null;
}

export async function createCampusFloor(input: {
  buildingId?: number | null;
  floorNumber?: number;
  floorLabel: string;
  mapImageUrl: string;
  widthMeters?: number;
  heightMeters?: number;
  isOutdoor?: boolean;
  accessLevel?: string;
  isSensitive?: boolean;
  restrictedNotice?: string;
}) {
  if (!input.floorLabel?.trim()) throw new Error("Floor label is required.");
  if (!input.mapImageUrl?.trim()) throw new Error("Blueprint image upload is required.");

  const accessLevel = normalizeAccessTier(input.accessLevel);
  const isSensitive = Boolean(input.isSensitive || accessLevel !== "public");

  const [row] = await db
    .insert(campusFloors)
    .values({
      buildingId: input.isOutdoor ? null : toNumericId(input.buildingId),
      floorNumber: input.isOutdoor ? -1 : Number(input.floorNumber ?? 0),
      floorLabel: input.floorLabel.trim(),
      mapImageUrl: input.mapImageUrl.trim(),
      widthMeters: Math.max(10, Number(input.widthMeters ?? 60)),
      heightMeters: Math.max(10, Number(input.heightMeters ?? 42)),
      isOutdoor: Boolean(input.isOutdoor),
      accessLevel,
      isSensitive,
      restrictedNotice: String(input.restrictedNotice || "").trim().slice(0, 260),
      blueprintUpdatedAt: new Date(),
      isDemoRecord: false,
    })
    .returning();
  return row;
}

export async function updateCampusFloor(
  id: unknown,
  updates: {
    floorLabel?: string;
    mapImageUrl?: string;
    clearMapImage?: boolean;
    widthMeters?: number;
    heightMeters?: number;
    accessLevel?: string;
    isSensitive?: boolean;
    restrictedNotice?: string;
  }
) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof updates.floorLabel === "string" && updates.floorLabel.trim()) {
    patch.floorLabel = updates.floorLabel.trim();
  }
  if (updates.clearMapImage) {
    patch.mapImageUrl = "";
    patch.blueprintUpdatedAt = new Date();
  } else if (typeof updates.mapImageUrl === "string" && updates.mapImageUrl.trim()) {
    patch.mapImageUrl = updates.mapImageUrl.trim();
    patch.blueprintUpdatedAt = new Date();
  }
  if (updates.widthMeters !== undefined && Number.isFinite(Number(updates.widthMeters))) {
    patch.widthMeters = Math.max(10, Number(updates.widthMeters));
  }
  if (updates.heightMeters !== undefined && Number.isFinite(Number(updates.heightMeters))) {
    patch.heightMeters = Math.max(10, Number(updates.heightMeters));
  }
  if (updates.accessLevel !== undefined) {
    const normalized = normalizeAccessTier(updates.accessLevel);
    patch.accessLevel = normalized;
    patch.isSensitive =
      updates.isSensitive !== undefined
        ? Boolean(updates.isSensitive || normalized !== "public")
        : normalized !== "public";
  } else if (typeof updates.isSensitive === "boolean") {
    patch.isSensitive = updates.isSensitive;
  }
  if (typeof updates.restrictedNotice === "string") {
    patch.restrictedNotice = updates.restrictedNotice.trim().slice(0, 260);
  }
  const [updated] = await db
    .update(campusFloors)
    .set(patch)
    .where(eq(campusFloors.id, numId))
    .returning();
  return updated || null;
}

export async function deleteCampusFloor(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const [deleted] = await db
    .delete(campusFloors)
    .where(eq(campusFloors.id, numId))
    .returning();
  return deleted || null;
}

export async function createCampusNode(input: {
  floorId: unknown;
  buildingId?: unknown;
  code?: string;
  label: string;
  nodeType?: string;
  x: number;
  y: number;
  isAccessible?: boolean;
  qrSpotCode?: string | null;
  description?: string;
  accessLevel?: string;
  isSensitive?: boolean;
  restrictedNotice?: string;
}) {
  const floorId = toNumericId(input.floorId);
  if (!floorId) throw new Error("Valid floorId is required.");
  if (!input.label?.trim()) throw new Error("Node label is required.");

  const floorRows = await db.select().from(campusFloors).where(eq(campusFloors.id, floorId)).limit(1);
  if (!floorRows[0]) throw new Error("Target floor not found.");

  const nodeType = String(input.nodeType || "room").toLowerCase().trim();
  const autoCode =
    (input.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "-")
      .slice(0, 20) ||
    `N-${floorId}-${Math.floor(100 + Math.random() * 899)}`;

  const accessLevel = normalizeAccessTier(input.accessLevel);
  const isSensitive = Boolean(input.isSensitive || accessLevel !== "public");

  const [row] = await db
    .insert(campusMapNodes)
    .values({
      floorId,
      buildingId: toNumericId(input.buildingId) ?? floorRows[0].buildingId ?? null,
      code: autoCode,
      label: input.label.trim(),
      nodeType,
      x: Math.min(98, Math.max(2, Number(input.x))),
      y: Math.min(98, Math.max(2, Number(input.y))),
      isAccessible: nodeType === "stairs" ? false : input.isAccessible !== false,
      qrSpotCode: input.qrSpotCode ? String(input.qrSpotCode).trim().toUpperCase() : null,
      description: (input.description || "").trim(),
      accessLevel,
      isSensitive,
      restrictedNotice: String(input.restrictedNotice || "").trim().slice(0, 260),
      isDemoRecord: false,
    })
    .returning();

  if (row.qrSpotCode) {
    await db
      .update(campusQrSpots)
      .set({ mapNodeId: row.id, updatedAt: new Date() })
      .where(eq(campusQrSpots.spotCode, row.qrSpotCode));
  }

  return row;
}

export async function updateCampusNode(
  id: unknown,
  updates: {
    label?: string;
    nodeType?: string;
    isAccessible?: boolean;
    qrSpotCode?: string | null;
    description?: string;
    accessLevel?: string;
    isSensitive?: boolean;
    restrictedNotice?: string;
  }
) {
  const numId = toNumericId(id);
  if (!numId) return null;

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof updates.label === "string" && updates.label.trim()) {
    patch.label = updates.label.trim().slice(0, 120);
  }
  if (typeof updates.nodeType === "string" && updates.nodeType.trim()) {
    patch.nodeType = updates.nodeType.toLowerCase().trim();
  }
  if (typeof updates.isAccessible === "boolean") {
    patch.isAccessible = updates.isAccessible;
  }
  if (updates.qrSpotCode !== undefined) {
    patch.qrSpotCode = updates.qrSpotCode
      ? String(updates.qrSpotCode).trim().toUpperCase()
      : null;
  }
  if (typeof updates.description === "string") {
    patch.description = updates.description.trim().slice(0, 400);
  }
  if (updates.accessLevel !== undefined) {
    const normalized = normalizeAccessTier(updates.accessLevel);
    patch.accessLevel = normalized;
    patch.isSensitive =
      updates.isSensitive !== undefined
        ? Boolean(updates.isSensitive || normalized !== "public")
        : normalized !== "public";
  } else if (typeof updates.isSensitive === "boolean") {
    patch.isSensitive = updates.isSensitive;
  }
  if (typeof updates.restrictedNotice === "string") {
    patch.restrictedNotice = updates.restrictedNotice.trim().slice(0, 260);
  }

  const [updated] = await db
    .update(campusMapNodes)
    .set(patch)
    .where(eq(campusMapNodes.id, numId))
    .returning();
  return updated || null;
}

export async function deleteCampusNode(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const [deleted] = await db
    .delete(campusMapNodes)
    .where(eq(campusMapNodes.id, numId))
    .returning();
  return deleted || null;
}

export async function createCampusEdge(input: {
  fromNodeId: unknown;
  toNodeId: unknown;
  edgeType?: string;
  isAccessible?: boolean;
  distanceMeters?: number;
  accessLevel?: string;
  isSensitive?: boolean;
}) {
  const fromId = toNumericId(input.fromNodeId);
  const toId = toNumericId(input.toNodeId);
  if (!fromId || !toId || fromId === toId) {
    throw new Error("Two distinct valid nodes are required to create a walkway connection.");
  }

  const foundNodes = await db
    .select()
    .from(campusMapNodes)
    .where(inArray(campusMapNodes.id, [fromId, toId]));
  if (foundNodes.length < 2) {
    throw new Error("One or both campus map nodes were not found.");
  }

  const nodeA = foundNodes.find((n) => n.id === fromId)!;
  const nodeB = foundNodes.find((n) => n.id === toId)!;

  let distance = Number(input.distanceMeters || 0);
  if (!distance || distance <= 0) {
    if (nodeA.floorId === nodeB.floorId) {
      const fl = await db.select().from(campusFloors).where(eq(campusFloors.id, nodeA.floorId)).limit(1);
      distance = computeEuclideanMeters(
        { x: nodeA.x, y: nodeA.y },
        { x: nodeB.x, y: nodeB.y },
        fl[0]?.widthMeters || 60,
        fl[0]?.heightMeters || 42
      );
    } else {
      distance = 9;
    }
  }

  const edgeType = String(input.edgeType || (nodeA.floorId !== nodeB.floorId ? "elevator" : "corridor")).toLowerCase();
  const isAccessible = edgeType === "stairs" ? false : input.isAccessible !== false;
  const accessLevel = normalizeAccessTier(input.accessLevel);
  const isSensitive = Boolean(input.isSensitive || accessLevel !== "public");

  const [row] = await db
    .insert(campusMapEdges)
    .values({
      fromNodeId: fromId,
      toNodeId: toId,
      distanceMeters: Math.max(1, Math.round(distance * 10) / 10),
      edgeType,
      isAccessible,
      accessLevel,
      isSensitive,
      isDemoRecord: false,
    })
    .returning();
  return row;
}

export async function updateCampusEdge(
  id: unknown,
  updates: {
    edgeType?: string;
    isAccessible?: boolean;
    distanceMeters?: number;
    accessLevel?: string;
    isSensitive?: boolean;
  }
) {
  const numId = toNumericId(id);
  if (!numId) return null;

  const patch: Record<string, unknown> = {};
  if (typeof updates.edgeType === "string" && updates.edgeType.trim()) {
    patch.edgeType = updates.edgeType.toLowerCase().trim();
  }
  if (typeof updates.isAccessible === "boolean") {
    patch.isAccessible = updates.isAccessible;
  }
  if (updates.distanceMeters !== undefined && Number(updates.distanceMeters) > 0) {
    patch.distanceMeters = Math.max(1, Math.round(Number(updates.distanceMeters) * 10) / 10);
  }
  if (updates.accessLevel !== undefined) {
    const normalized = normalizeAccessTier(updates.accessLevel);
    patch.accessLevel = normalized;
    patch.isSensitive =
      updates.isSensitive !== undefined
        ? Boolean(updates.isSensitive || normalized !== "public")
        : normalized !== "public";
  } else if (typeof updates.isSensitive === "boolean") {
    patch.isSensitive = updates.isSensitive;
  }

  if (Object.keys(patch).length === 0) return null;

  const [updated] = await db
    .update(campusMapEdges)
    .set(patch)
    .where(eq(campusMapEdges.id, numId))
    .returning();
  return updated || null;
}

export async function deleteCampusEdge(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const [deleted] = await db
    .delete(campusMapEdges)
    .where(eq(campusMapEdges.id, numId))
    .returning();
  return deleted || null;
}

// ── Admin CRUD: Academic Departments & Courses ────────────

export async function createAcademicDepartment(input: {
  code: string;
  name: string;
  buildingId?: unknown;
  hodName?: string;
  hodEmail?: string;
}) {
  const code = String(input.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16);
  if (!code || !input.name?.trim()) {
    throw new Error("Department code and name are required.");
  }
  const [row] = await db
    .insert(academicDepartments)
    .values({
      code,
      name: input.name.trim(),
      buildingId: toNumericId(input.buildingId),
      hodName: (input.hodName || "").trim(),
      hodEmail: (input.hodEmail || "").trim().toLowerCase(),
      isActive: true,
      isDemoRecord: false,
    })
    .returning();
  return row;
}

export async function deleteAcademicDepartment(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const [deleted] = await db
    .delete(academicDepartments)
    .where(eq(academicDepartments.id, numId))
    .returning();
  return deleted || null;
}

export async function createAcademicCourse(input: {
  departmentId: unknown;
  code: string;
  name: string;
  degreeLevel?: string;
  durationYears?: number;
  divisions?: string[];
  intakeCapacity?: number;
}) {
  const deptId = toNumericId(input.departmentId);
  const code = String(input.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .slice(0, 20);
  if (!deptId || !code || !input.name?.trim()) {
    throw new Error("Department, course code, and course name are required.");
  }
  const cleanDivs = Array.isArray(input.divisions) && input.divisions.length > 0
    ? input.divisions.map((d) => String(d).trim().toUpperCase()).filter(Boolean).slice(0, 8)
    : ["A"];

  const [row] = await db
    .insert(academicCourses)
    .values({
      departmentId: deptId,
      code,
      name: input.name.trim(),
      degreeLevel: ["UG", "PG", "Diploma", "PhD"].includes(String(input.degreeLevel))
        ? String(input.degreeLevel)
        : "UG",
      durationYears: Math.min(6, Math.max(1, Number(input.durationYears || 4))),
      divisions: cleanDivs,
      intakeCapacity: Math.min(1000, Math.max(10, Number(input.intakeCapacity || 60))),
      isActive: true,
      isDemoRecord: false,
    })
    .returning();
  return row;
}

export async function deleteAcademicCourse(id: unknown) {
  const numId = toNumericId(id);
  if (!numId) return null;
  const [deleted] = await db
    .delete(academicCourses)
    .where(eq(academicCourses.id, numId))
    .returning();
  return deleted || null;
}
