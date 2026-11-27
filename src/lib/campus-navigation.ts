/**
 * Pure Multi-Floor Campus Wayfinding Engine, Per-Zone Access Policy Enforcement,
 * First-Class Spatial Sensitive Zones, & Avishkar Blind-Evaluation Logic.
 * Shared across Server (Node/Express) and Client (React/Vite) — zero external dependencies.
 */
import {
  doesSegmentIntersectZone,
  isPointInSensitiveZone,
  projectSensitiveZone,
  type CampusSensitiveZone,
  type ProjectedSensitiveZone,
} from "./sensitive-zones.ts";

export {
  SENSITIVE_ZONE_CATEGORIES,
  SENSITIVE_ZONE_CATEGORY_META,
  SENSITIVE_ZONE_SHAPES,
  doesSegmentIntersectZone,
  getZonePolygonVertices,
  isPointInSensitiveZone,
  normalizeSensitiveZoneCategory,
  normalizeSensitiveZoneShape,
  normalizeZoneBounds,
  projectSensitiveZone,
  type CampusSensitiveZone,
  type ProjectedSensitiveZone,
  type SensitiveZoneBounds,
  type SensitiveZoneCategory,
  type SensitiveZoneShape,
  type ZonePoint,
} from "./sensitive-zones.ts";

export type CampusNodeType =
  | "room"
  | "lab"
  | "corridor"
  | "stairs"
  | "elevator"
  | "ramp"
  | "entrance"
  | "washroom"
  | "desk"
  | "building_pin"
  | "qr_anchor";

export type CampusEdgeType = "corridor" | "walkway" | "stairs" | "elevator" | "ramp";

export type CampusAccessTier = "public" | "student" | "staff" | "admin";

export const CAMPUS_ACCESS_TIERS: CampusAccessTier[] = [
  "public",
  "student",
  "staff",
  "admin",
];

export const ACCESS_TIER_RANK: Record<CampusAccessTier, number> = {
  public: 0,
  student: 1,
  staff: 2,
  admin: 3,
};

export const ACCESS_TIER_META: Record<
  CampusAccessTier,
  { label: string; shortLabel: string; description: string }
> = {
  public: {
    label: "Public",
    shortLabel: "Public",
    description: "Open to all campus visitors, guests, students, and staff.",
  },
  student: {
    label: "Verified Student",
    shortLabel: "Student+",
    description: "Requires a verified student, staff, or admin campus account.",
  },
  staff: {
    label: "Staff",
    shortLabel: "Staff Only",
    description: "Restricted to authorized campus staff, faculty, and administrators.",
  },
  admin: {
    label: "Admin",
    shortLabel: "Admin Only",
    description: "High-sensitivity facility restricted strictly to campus administrators.",
  },
};

export function normalizeAccessTier(raw: unknown): CampusAccessTier {
  const val = String(raw || "public").toLowerCase().trim();
  if (val === "admin") return "admin";
  if (val === "staff") return "staff";
  if (val === "student" || val === "verified_student") return "student";
  return "public";
}

export function resolveViewerAccessTier(
  user?: {
    role?: string | null;
    isVerified?: boolean | null;
    emailVerified?: boolean | null;
    isEmailVerified?: boolean | null;
    isActive?: boolean | null;
  } | null
): CampusAccessTier {
  if (!user || user.isActive === false) return "public";
  const role = String(user.role || "").toLowerCase().trim();
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  if (role === "student" || role === "user") {
    const verified =
      user.isVerified !== false &&
      user.emailVerified !== false &&
      user.isEmailVerified !== false;
    return verified ? "student" : "public";
  }
  return "public";
}

export function getEffectiveAccessLevel(
  itemLevel?: string | null,
  parentFloorLevel?: string | null
): CampusAccessTier {
  const a = normalizeAccessTier(itemLevel);
  const b = normalizeAccessTier(parentFloorLevel);
  return ACCESS_TIER_RANK[a] >= ACCESS_TIER_RANK[b] ? a : b;
}

export function canAccessTier(
  viewerTier: CampusAccessTier | string | null | undefined,
  requiredTier: CampusAccessTier | string | null | undefined
): boolean {
  const viewerRank = ACCESS_TIER_RANK[normalizeAccessTier(viewerTier)];
  const requiredRank = ACCESS_TIER_RANK[normalizeAccessTier(requiredTier)];
  return viewerRank >= requiredRank;
}

export interface NavBuilding {
  id: number;
  code: string;
  name: string;
  shortLabel: string;
  category: string;
  siteX: number;
  siteY: number;
  description?: string | null;
}

export interface NavFloor {
  id: number;
  buildingId: number | null;
  floorNumber: number;
  floorLabel: string;
  mapImageUrl: string;
  widthMeters: number;
  heightMeters: number;
  isOutdoor: boolean;
  accessLevel?: CampusAccessTier | string;
  effectiveAccessLevel?: CampusAccessTier;
  isSensitive?: boolean;
  restrictedNotice?: string | null;
  blueprintUpdatedAt?: string | Date | null;
  isLocked?: boolean;
}

export interface NavNode {
  id: number;
  floorId: number;
  buildingId: number | null;
  code: string;
  label: string;
  nodeType: CampusNodeType | string;
  x: number; // Normalized 0..100
  y: number; // Normalized 0..100
  isAccessible: boolean;
  qrSpotCode?: string | null;
  displayQrSpotCode?: string | null;
  departmentId?: number | null;
  description?: string | null;
  accessLevel?: CampusAccessTier | string;
  effectiveAccessLevel?: CampusAccessTier;
  isSensitive?: boolean;
  restrictedNotice?: string | null;
  isLocked?: boolean;
}

export interface NavEdge {
  id: number;
  fromNodeId: number;
  toNodeId: number;
  distanceMeters: number;
  edgeType: CampusEdgeType | string;
  isAccessible: boolean;
  accessLevel?: CampusAccessTier | string;
  effectiveAccessLevel?: CampusAccessTier;
  isSensitive?: boolean;
  isLocked?: boolean;
}

export interface RouteStep {
  stepNumber: number;
  floorId: number;
  floorLabel: string;
  buildingName: string;
  fromNodeId: number;
  toNodeId: number;
  edgeType: string;
  distanceMeters: number;
  isFloorChange: boolean;
  instruction: string;
}

export interface SolverMetrics {
  algorithm: string;
  complexity: string;
  verticesCount: number;
  edgesCount: number;
  visitedCount: number;
  executionMs: number;
  floorTransitions: number;
  accessibleConstraintApplied: boolean;
  viewerAccessTier: CampusAccessTier;
  restrictedNodesSkipped: number;
}

export interface RouteResult {
  found: boolean;
  reason?: string;
  blockedByPolicy?: boolean;
  requiredTier?: CampusAccessTier;
  detouredAroundRestricted?: boolean;
  nodeIds: number[];
  nodes: NavNode[];
  edges: NavEdge[];
  segmentsByFloor: Record<number, Array<{ from: NavNode; to: NavNode; edge: NavEdge }>>;
  steps: RouteStep[];
  totalMeters: number;
  estimatedSeconds: number;
  accessibleOnly: boolean;
  solverMetrics: SolverMetrics;
}

/**
 * Pure server-side & preview policy projection.
 * Computes effective access tiers and redacts sensitive blueprints, descriptions,
 * QR spot codes, and live pins for any floor/node/edge locked to the viewer.
 */
export function applyCampusAccessPolicies<
  T extends {
    floors: NavFloor[];
    nodes: NavNode[];
    edges: NavEdge[];
    sensitiveZones?: CampusSensitiveZone[];
    livePins?: {
      complaints?: Array<{ mapNodeId?: number | null; [key: string]: unknown }>;
      qrSpots?: Array<{ mapNodeId?: number | null; [key: string]: unknown }>;
      lostFound?: Array<{ mapNodeId?: number | null; [key: string]: unknown }>;
    };
    [key: string]: unknown;
  }
>(bundle: T, viewerTierInput: CampusAccessTier | string = "public") {
  const viewerTier = normalizeAccessTier(viewerTierInput);
  const floorTierMap = new Map<number, CampusAccessTier>();
  const lockedFloorIds = new Set<number>();
  const lockedNodeIds = new Set<number>();

  let totalProtectedFloors = 0;
  let totalProtectedNodes = 0;
  let totalProtectedEdges = 0;
  let lockedCountForViewer = 0;

  const floors = (bundle.floors || []).map((fl) => {
    const ownTier = normalizeAccessTier(fl.accessLevel);
    const isProtected = ownTier !== "public" || Boolean(fl.isSensitive);
    if (isProtected) totalProtectedFloors += 1;

    floorTierMap.set(Number(fl.id), ownTier);
    const allowed = canAccessTier(viewerTier, ownTier);
    const isLocked = !allowed;
    if (isLocked) {
      lockedFloorIds.add(Number(fl.id));
      lockedCountForViewer += 1;
    }

    const defaultNotice = `This floor is protected (${ACCESS_TIER_META[ownTier].label} clearance required).`;
    return {
      ...fl,
      accessLevel: ownTier,
      effectiveAccessLevel: ownTier,
      isSensitive: Boolean(fl.isSensitive || ownTier !== "public"),
      restrictedNotice: fl.restrictedNotice?.trim() || (isProtected ? defaultNotice : ""),
      isLocked,
      // Never expose blueprint image URL of a locked floor to unauthorized viewers
      mapImageUrl: isLocked ? "" : fl.mapImageUrl,
    };
  });

  // Project spatial sensitive zones per floor
  const sensitiveZones: ProjectedSensitiveZone[] = (bundle.sensitiveZones || [])
    .filter((z) => z && z.isActive !== false)
    .map((z) => {
      const floorTier = floorTierMap.get(Number(z.floorId)) || "public";
      return projectSensitiveZone(z, viewerTier, floorTier);
    });

  const zonesByFloor = new Map<number, ProjectedSensitiveZone[]>();
  let lockedSensitiveZoneCount = 0;
  for (const z of sensitiveZones) {
    if (z.isLocked) lockedSensitiveZoneCount += 1;
    const fid = Number(z.floorId);
    if (!zonesByFloor.has(fid)) zonesByFloor.set(fid, []);
    zonesByFloor.get(fid)!.push(z);
  }

  const nodes = (bundle.nodes || []).map((n) => {
    const floorTier = floorTierMap.get(Number(n.floorId)) || "public";
    const ownTier = normalizeAccessTier(n.accessLevel);
    let effectiveTier = getEffectiveAccessLevel(ownTier, floorTier);
    let enclosingZoneNotice = "";

    // Inherit stricter clearance from any enclosing spatial sensitive zone on this floor
    const floorZones = zonesByFloor.get(Number(n.floorId)) || [];
    for (const z of floorZones) {
      if (isPointInSensitiveZone({ x: n.x, y: n.y }, z)) {
        const nextTier = getEffectiveAccessLevel(effectiveTier, z.effectiveAccessLevel);
        if (nextTier !== effectiveTier || !enclosingZoneNotice) {
          effectiveTier = nextTier;
          if (z.restrictedNotice) enclosingZoneNotice = z.restrictedNotice;
        }
      }
    }

    const isProtected = effectiveTier !== "public" || Boolean(n.isSensitive);
    if (ownTier !== "public" || Boolean(n.isSensitive)) totalProtectedNodes += 1;

    const isLocked = !canAccessTier(viewerTier, effectiveTier);
    if (isLocked) {
      lockedNodeIds.add(Number(n.id));
      lockedCountForViewer += 1;
    }

    const notice =
      n.restrictedNotice?.trim() ||
      enclosingZoneNotice ||
      (isProtected
        ? `Entry restricted — ${ACCESS_TIER_META[effectiveTier].label} clearance required.`
        : "");

    if (isLocked) {
      return {
        ...n,
        label: `Restricted Area (${ACCESS_TIER_META[effectiveTier].shortLabel})`,
        description: "",
        qrSpotCode: null,
        displayQrSpotCode: null,
        accessLevel: ownTier,
        effectiveAccessLevel: effectiveTier,
        isSensitive: true,
        restrictedNotice: notice,
        isLocked: true,
      };
    }

    return {
      ...n,
      accessLevel: ownTier,
      effectiveAccessLevel: effectiveTier,
      isSensitive: Boolean(n.isSensitive || effectiveTier !== "public"),
      restrictedNotice: notice,
      isLocked: false,
    };
  });

  const nodeById = new Map<number, NavNode>(nodes.map((n) => [Number(n.id), n]));
  const nodeTierMap = new Map<number, CampusAccessTier>(
    nodes.map((n) => [Number(n.id), n.effectiveAccessLevel || "public"])
  );

  const edges = (bundle.edges || []).map((e) => {
    const ownTier = normalizeAccessTier(e.accessLevel);
    const fromNode = nodeById.get(Number(e.fromNodeId));
    const toNode = nodeById.get(Number(e.toNodeId));
    const fromTier = nodeTierMap.get(Number(e.fromNodeId)) || "public";
    const toTier = nodeTierMap.get(Number(e.toNodeId)) || "public";
    const inherited = getEffectiveAccessLevel(fromTier, toTier);
    let effectiveTier = getEffectiveAccessLevel(ownTier, inherited);
    let crossesLockedZone = false;

    // Block same-floor walkways intersecting a locked spatial sensitive zone with blockRouting enabled
    if (fromNode && toNode && Number(fromNode.floorId) === Number(toNode.floorId)) {
      const floorZones = zonesByFloor.get(Number(fromNode.floorId)) || [];
      for (const z of floorZones) {
        if (
          z.blockRouting !== false &&
          doesSegmentIntersectZone(
            { x: fromNode.x, y: fromNode.y },
            { x: toNode.x, y: toNode.y },
            z
          )
        ) {
          effectiveTier = getEffectiveAccessLevel(effectiveTier, z.effectiveAccessLevel);
          if (z.isLocked) crossesLockedZone = true;
        }
      }
    }

    if (ownTier !== "public" || Boolean(e.isSensitive)) totalProtectedEdges += 1;

    const isLocked =
      crossesLockedZone ||
      !canAccessTier(viewerTier, effectiveTier) ||
      lockedNodeIds.has(Number(e.fromNodeId)) ||
      lockedNodeIds.has(Number(e.toNodeId));

    return {
      ...e,
      accessLevel: ownTier,
      effectiveAccessLevel: effectiveTier,
      isSensitive: Boolean(e.isSensitive || ownTier !== "public"),
      isLocked,
    };
  });

  // Strip live pins inside locked nodes so sensitive incidents/QR spots are never leaked
  const livePins = bundle.livePins
    ? {
        complaints: (bundle.livePins.complaints || []).filter(
          (c) => !c.mapNodeId || !lockedNodeIds.has(Number(c.mapNodeId))
        ),
        qrSpots: (bundle.livePins.qrSpots || []).filter(
          (q) => !q.mapNodeId || !lockedNodeIds.has(Number(q.mapNodeId))
        ),
        lostFound: (bundle.livePins.lostFound || []).filter(
          (l) => !l.mapNodeId || !lockedNodeIds.has(Number(l.mapNodeId))
        ),
      }
    : undefined;

  return {
    ...bundle,
    floors,
    nodes,
    edges,
    sensitiveZones,
    ...(livePins ? { livePins } : {}),
    viewerAccessTier: viewerTier,
    policySummary: {
      viewerAccessTier: viewerTier,
      totalProtectedFloors,
      totalProtectedNodes,
      totalProtectedEdges,
      totalSensitiveZones: sensitiveZones.length,
      lockedSensitiveZoneCount,
      lockedCountForViewer,
      lockedFloorCount: lockedFloorIds.size,
      lockedNodeCount: lockedNodeIds.size,
    },
  };
}

/**
 * Computes physical Euclidean distance in meters between two normalized (0..100) coordinates on a floor.
 */
export function computeEuclideanMeters(
  a: { x: number; y: number },
  b: { x: number; y: number },
  widthMeters = 60,
  heightMeters = 40
): number {
  const dx = ((Number(b.x) - Number(a.x)) / 100) * Math.max(5, Number(widthMeters || 60));
  const dy = ((Number(b.y) - Number(a.y)) / 100) * Math.max(5, Number(heightMeters || 40));
  return Math.max(1, Math.round(Math.hypot(dx, dy) * 10) / 10);
}

const EDGE_EFFORT_PENALTY: Record<string, number> = {
  stairs: 10,
  elevator: 14, // Slight wait penalty so standard mode prefers nearby stairs while accessible mode chooses lifts
  ramp: 2,
  corridor: 0,
  walkway: 0,
};

function isNodeLockedForViewer(
  node: NavNode,
  floor: NavFloor | undefined,
  viewerTier: CampusAccessTier,
  enforceAccessPolicy: boolean
): { locked: boolean; requiredTier: CampusAccessTier } {
  const floorTier = normalizeAccessTier(floor?.effectiveAccessLevel || floor?.accessLevel);
  const nodeTier = getEffectiveAccessLevel(
    node.effectiveAccessLevel || node.accessLevel,
    floorTier
  );
  if (!enforceAccessPolicy) {
    return { locked: false, requiredTier: nodeTier };
  }
  const locked =
    Boolean(node.isLocked) ||
    Boolean(floor?.isLocked) ||
    !canAccessTier(viewerTier, nodeTier);
  return { locked, requiredTier: nodeTier };
}

function isEdgeLockedForViewer(
  edge: NavEdge,
  viewerTier: CampusAccessTier,
  enforceAccessPolicy: boolean
): boolean {
  if (!enforceAccessPolicy) return false;
  const edgeTier = normalizeAccessTier(edge.effectiveAccessLevel || edge.accessLevel);
  return Boolean(edge.isLocked) || !canAccessTier(viewerTier, edgeTier);
}

/**
 * Multi-floor weighted Dijkstra shortest-path solver with Divyangjan (wheelchair-accessible)
 * constraints and per-zone sensitive-place access policy blocking.
 */
export function findShortestCampusRoute(
  nodes: NavNode[],
  edges: NavEdge[],
  floors: NavFloor[],
  buildings: NavBuilding[],
  startNodeId: number,
  endNodeId: number,
  options: {
    accessibleOnly?: boolean;
    viewerAccessTier?: CampusAccessTier | string;
    ignoreAccessPolicy?: boolean;
  } = {}
): RouteResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const accessibleOnly = Boolean(options.accessibleOnly);
  const viewerTier = normalizeAccessTier(options.viewerAccessTier || "public");
  const enforceAccessPolicy = !options.ignoreAccessPolicy;

  const nodeMap = new Map<number, NavNode>(nodes.map((n) => [Number(n.id), n]));
  const floorMap = new Map<number, NavFloor>(floors.map((f) => [Number(f.id), f]));
  const buildingMap = new Map<number, NavBuilding>(buildings.map((b) => [Number(b.id), b]));

  const startId = Number(startNodeId);
  const endId = Number(endNodeId);

  let restrictedNodesSkipped = 0;

  const buildEmpty = (
    reason: string,
    visitedCount = 0,
    extra: { blockedByPolicy?: boolean; requiredTier?: CampusAccessTier } = {}
  ): RouteResult => {
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      found: false,
      reason,
      blockedByPolicy: Boolean(extra.blockedByPolicy),
      requiredTier: extra.requiredTier,
      detouredAroundRestricted: false,
      nodeIds: [],
      nodes: [],
      edges: [],
      segmentsByFloor: {},
      steps: [],
      totalMeters: 0,
      estimatedSeconds: 0,
      accessibleOnly,
      solverMetrics: {
        algorithm: "Weighted Multi-Floor Dijkstra",
        complexity: "O((V + E) log V)",
        verticesCount: nodes.length,
        edgesCount: edges.length,
        visitedCount,
        executionMs: Math.max(0.01, Math.round((t1 - t0) * 100) / 100),
        floorTransitions: 0,
        accessibleConstraintApplied: accessibleOnly,
        viewerAccessTier: viewerTier,
        restrictedNodesSkipped,
      },
    };
  };

  if (!nodeMap.has(startId) || !nodeMap.has(endId)) {
    return buildEmpty("Select both a valid starting point and destination on the campus map.");
  }

  const startNode = nodeMap.get(startId)!;
  const endNode = nodeMap.get(endId)!;
  const startLock = isNodeLockedForViewer(
    startNode,
    floorMap.get(startNode.floorId),
    viewerTier,
    enforceAccessPolicy
  );
  const endLock = isNodeLockedForViewer(
    endNode,
    floorMap.get(endNode.floorId),
    viewerTier,
    enforceAccessPolicy
  );

  if (endLock.locked) {
    const reqMeta = ACCESS_TIER_META[endLock.requiredTier];
    return buildEmpty(
      `Entry blocked: this destination is a protected zone requiring ${reqMeta.label} clearance.`,
      0,
      { blockedByPolicy: true, requiredTier: endLock.requiredTier }
    );
  }

  if (startLock.locked) {
    const reqMeta = ACCESS_TIER_META[startLock.requiredTier];
    return buildEmpty(
      `Starting location is inside a protected zone requiring ${reqMeta.label} clearance.`,
      0,
      { blockedByPolicy: true, requiredTier: startLock.requiredTier }
    );
  }

  if (startId === endId) {
    const single = startNode;
    const floor = floorMap.get(single.floorId);
    const bldg = single.buildingId ? buildingMap.get(single.buildingId) : null;
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      found: true,
      blockedByPolicy: false,
      detouredAroundRestricted: false,
      nodeIds: [startId],
      nodes: [single],
      edges: [],
      segmentsByFloor: {},
      steps: [
        {
          stepNumber: 1,
          floorId: single.floorId,
          floorLabel: floor?.floorLabel || "Campus",
          buildingName: bldg?.name || "Outdoor Campus",
          fromNodeId: startId,
          toNodeId: endId,
          edgeType: "corridor",
          distanceMeters: 0,
          isFloorChange: false,
          instruction: `You are already at ${single.label}.`,
        },
      ],
      totalMeters: 0,
      estimatedSeconds: 0,
      accessibleOnly,
      solverMetrics: {
        algorithm: "Weighted Multi-Floor Dijkstra",
        complexity: "O((V + E) log V)",
        verticesCount: nodes.length,
        edgesCount: edges.length,
        visitedCount: 1,
        executionMs: Math.max(0.01, Math.round((t1 - t0) * 100) / 100),
        floorTransitions: 0,
        accessibleConstraintApplied: accessibleOnly,
        viewerAccessTier: viewerTier,
        restrictedNodesSkipped: 0,
      },
    };
  }

  // Precompute locked node set for fast edge filtering
  const lockedNodeSet = new Set<number>();
  if (enforceAccessPolicy) {
    for (const n of nodes) {
      const check = isNodeLockedForViewer(n, floorMap.get(n.floorId), viewerTier, true);
      if (check.locked) lockedNodeSet.add(Number(n.id));
    }
    restrictedNodesSkipped = lockedNodeSet.size;
  }

  // Build bidirectional adjacency list
  const adj = new Map<number, Array<{ to: number; edge: NavEdge; weight: number }>>();
  for (const n of nodes) {
    adj.set(Number(n.id), []);
  }

  let skippedPolicyEdgeCount = 0;

  for (const edge of edges) {
    const u = Number(edge.fromNodeId);
    const v = Number(edge.toNodeId);
    const nodeU = nodeMap.get(u);
    const nodeV = nodeMap.get(v);
    if (!nodeU || !nodeV) continue;

    if (
      enforceAccessPolicy &&
      (lockedNodeSet.has(u) ||
        lockedNodeSet.has(v) ||
        isEdgeLockedForViewer(edge, viewerTier, true))
    ) {
      skippedPolicyEdgeCount += 1;
      continue;
    }

    if (accessibleOnly) {
      if (!edge.isAccessible || edge.edgeType === "stairs") continue;
      // Avoid traversing non-accessible or stairs nodes (except if start/end itself)
      if (u !== startId && u !== endId && (!nodeU.isAccessible || nodeU.nodeType === "stairs")) {
        continue;
      }
      if (v !== startId && v !== endId && (!nodeV.isAccessible || nodeV.nodeType === "stairs")) {
        continue;
      }
    }

    const baseMeters = Math.max(1, Number(edge.distanceMeters || 5));
    const penalty = EDGE_EFFORT_PENALTY[edge.edgeType] ?? 0;
    const weight = baseMeters + penalty;

    adj.get(u)?.push({ to: v, edge, weight });
    adj.get(v)?.push({ to: u, edge, weight });
  }

  // Dijkstra's algorithm
  const dist = new Map<number, number>();
  const prevNode = new Map<number, number>();
  const prevEdge = new Map<number, NavEdge>();
  const visited = new Set<number>();

  for (const n of nodes) {
    dist.set(Number(n.id), Infinity);
  }
  dist.set(startId, 0);

  // Simple priority queue array (campus graphs are ~20..500 nodes — <1ms)
  const queue: Array<{ id: number; d: number }> = [{ id: startId, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.id === endId) break;

    const neighbors = adj.get(current.id) || [];
    for (const { to, edge, weight } of neighbors) {
      if (visited.has(to)) continue;
      const alt = current.d + weight;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prevNode.set(to, current.id);
        prevEdge.set(to, edge);
        queue.push({ id: to, d: alt });
      }
    }
  }

  if (!prevNode.has(endId)) {
    // Check if an unrestricted route exists so we can tell the user access policy blocked the path
    if (enforceAccessPolicy && skippedPolicyEdgeCount > 0) {
      const unrestricted = findShortestCampusRoute(
        nodes,
        edges,
        floors,
        buildings,
        startId,
        endId,
        { accessibleOnly, ignoreAccessPolicy: true }
      );
      if (unrestricted.found) {
        return buildEmpty(
          "No authorized detour exists — all connecting paths pass through a restricted security zone.",
          visited.size,
          { blockedByPolicy: true }
        );
      }
    }
    return buildEmpty(
      accessibleOnly
        ? "No stair-free (Divyangjan accessible) route currently links these two points. Ask an admin to connect an elevator or ramp in Campus Studio."
        : "These two campus spots are not yet connected by a walkable path.",
      visited.size
    );
  }

  // Reconstruct ordered nodes and edges
  const orderedIds: number[] = [];
  const orderedEdges: NavEdge[] = [];
  let cursor: number | undefined = endId;
  while (cursor !== undefined) {
    orderedIds.unshift(cursor);
    const e = prevEdge.get(cursor);
    if (e) orderedEdges.unshift(e);
    cursor = prevNode.get(cursor);
  }

  const orderedNodes = orderedIds.map((id) => nodeMap.get(id)!).filter(Boolean);
  const segmentsByFloor: Record<number, Array<{ from: NavNode; to: NavNode; edge: NavEdge }>> = {};
  const steps: RouteStep[] = [];

  let totalMeters = 0;
  let floorTransitions = 0;

  for (let i = 0; i < orderedEdges.length; i++) {
    const from = orderedNodes[i];
    const to = orderedNodes[i + 1];
    const edge = orderedEdges[i];
    const meters = Math.max(1, Math.round(Number(edge.distanceMeters || 5)));
    totalMeters += meters;

    const fromFloor = floorMap.get(from.floorId);
    const toFloor = floorMap.get(to.floorId);
    const toBuilding = to.buildingId ? buildingMap.get(to.buildingId) : null;
    const isFloorChange = from.floorId !== to.floorId;

    if (isFloorChange) {
      floorTransitions += 1;
    } else {
      if (!segmentsByFloor[from.floorId]) segmentsByFloor[from.floorId] = [];
      segmentsByFloor[from.floorId].push({ from, to, edge });
    }

    let instruction = "";
    if (isFloorChange) {
      if (edge.edgeType === "elevator") {
        instruction = `Take ${from.label} to ${toFloor?.floorLabel || "next floor"}${toBuilding ? ` (${toBuilding.shortLabel})` : ""}.`;
      } else if (edge.edgeType === "stairs") {
        instruction = `Use ${from.label} to reach ${toFloor?.floorLabel || "next floor"}${toBuilding ? ` (${toBuilding.shortLabel})` : ""}.`;
      } else if (fromFloor?.isOutdoor && !toFloor?.isOutdoor) {
        instruction = `Enter ${toBuilding?.name || "building"} at ${to.label} (${toFloor?.floorLabel || "Ground Floor"}).`;
      } else if (!fromFloor?.isOutdoor && toFloor?.isOutdoor) {
        instruction = `Exit onto the outdoor campus walkway via ${to.label}.`;
      } else {
        instruction = `Transition via ${edge.edgeType} from ${from.label} to ${to.label} (${toFloor?.floorLabel || "Campus"}).`;
      }
    } else if (edge.edgeType === "ramp") {
      instruction = `Take accessible ramp (${meters}m) from ${from.label} to ${to.label}.`;
    } else if (edge.edgeType === "walkway") {
      instruction = `Walk ${meters}m along campus walkway toward ${to.label}.`;
    } else {
      instruction = `Proceed ${meters}m along corridor to ${to.label}.`;
    }

    steps.push({
      stepNumber: i + 1,
      floorId: to.floorId,
      floorLabel: toFloor?.floorLabel || "Campus",
      buildingName: toBuilding?.name || "Outdoor Campus",
      fromNodeId: from.id,
      toNodeId: to.id,
      edgeType: edge.edgeType,
      distanceMeters: meters,
      isFloorChange,
      instruction,
    });
  }

  let detouredAroundRestricted = false;
  if (enforceAccessPolicy && skippedPolicyEdgeCount > 0) {
    const unrestricted = findShortestCampusRoute(
      nodes,
      edges,
      floors,
      buildings,
      startId,
      endId,
      { accessibleOnly, ignoreAccessPolicy: true }
    );
    if (unrestricted.found && unrestricted.totalMeters < Math.round(totalMeters)) {
      detouredAroundRestricted = true;
    }
  }

  const walkSpeedMps = accessibleOnly ? 0.95 : 1.25;
  const estimatedSeconds = Math.max(
    10,
    Math.round(totalMeters / walkSpeedMps + floorTransitions * (accessibleOnly ? 22 : 12))
  );

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    found: true,
    blockedByPolicy: false,
    detouredAroundRestricted,
    nodeIds: orderedIds,
    nodes: orderedNodes,
    edges: orderedEdges,
    segmentsByFloor,
    steps,
    totalMeters: Math.round(totalMeters),
    estimatedSeconds,
    accessibleOnly,
    solverMetrics: {
      algorithm: "Weighted Multi-Floor Dijkstra",
      complexity: "O((V + E) log V)",
      verticesCount: nodes.length,
      edgesCount: edges.length,
      visitedCount: visited.size,
      executionMs: Math.max(0.01, Math.round((t1 - t0) * 100) / 100),
      floorTransitions,
      accessibleConstraintApplied: accessibleOnly,
      viewerAccessTier: viewerTier,
      restrictedNodesSkipped,
    },
  };
}

// ── Avishkar Blind-Evaluation Anonymity Helpers ───────────

export interface InstitutionBrandingInput {
  siteName?: string | null;
  siteTagline?: string | null;
  institutionCode?: string | null;
  allowedDomain?: string | null;
  blindEvaluationMode?: boolean | null;
}

export interface ResolvedInstitutionBranding {
  blindEvaluationMode: boolean;
  platformName: string;
  institutionName: string;
  headerSubtitle: string;
  institutionCode: string;
  allowedDomain: string;
  demoLabels: {
    student: string;
    staff: string;
    admin: string;
  };
}

/**
 * Resolves UI/PDF/QR branding with strict Maharashtra Avishkar Blind-Evaluation compliance.
 * When blindEvaluationMode is active, college & author names are masked to neutral institutional labels.
 */
export function resolveInstitutionBranding(
  input: InstitutionBrandingInput = {}
): ResolvedInstitutionBranding {
  const blind = input.blindEvaluationMode !== false; // Default ON for Avishkar safety
  if (blind) {
    return {
      blindEvaluationMode: true,
      platformName: "ComplaintSync",
      institutionName: "Smart Campus Institution",
      headerSubtitle: "Smart Campus Governance & Wayfinding",
      institutionCode: "CAMPUS",
      allowedDomain: "campus.edu",
      demoLabels: {
        student: "Evaluator Student (Demo)",
        staff: "Campus Facilities Lead (Demo)",
        admin: "Campus Governance Admin (Demo)",
      },
    };
  }

  const institutionName = String(input.siteTagline || "").trim() || "Smart Campus University";
  const institutionCode = String(input.institutionCode || "").trim().toUpperCase() || "CAMPUS";
  const allowedDomain = String(input.allowedDomain || "").trim().toLowerCase() || "campus.edu";

  return {
    blindEvaluationMode: false,
    platformName: String(input.siteName || "").trim() || "ComplaintSync",
    institutionName,
    headerSubtitle: `${institutionCode} Smart Campus Governance`,
    institutionCode,
    allowedDomain,
    demoLabels: {
      student: "Aarav Kulkarni (Demo Student)",
      staff: "Prof. Rajesh Deshmukh (Demo Staff)",
      admin: "Dr. Meera Joshi (Demo Admin)",
    },
  };
}

/**
 * Masks institution-identifying strings when Avishkar Blind-Evaluation Mode is active.
 */
export function maskInstitutionText(
  text: string,
  blindEvaluationMode: boolean,
  institutionName?: string,
  institutionCode?: string
): string {
  const raw = String(text || "");
  if (!blindEvaluationMode || !raw) return raw;
  let masked = raw;
  if (institutionName && institutionName.trim().length > 2) {
    const escaped = institutionName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    masked = masked.replace(new RegExp(escaped, "gi"), "Smart Campus Institution");
  }
  if (institutionCode && institutionCode.trim().length > 1 && institutionCode.trim().toUpperCase() !== "CAMPUS") {
    const escapedCode = institutionCode.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    masked = masked.replace(new RegExp(`\\b${escapedCode}\\b`, "gi"), "CAMPUS");
  }
  return masked;
}
