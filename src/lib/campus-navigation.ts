/**
 * Pure Multi-Floor Campus Wayfinding Engine & Avishkar Blind-Evaluation Logic.
 * Shared across Server (Node/Express) and Client (React/Vite) — zero external dependencies.
 */

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
  departmentId?: number | null;
  description?: string | null;
}

export interface NavEdge {
  id: number;
  fromNodeId: number;
  toNodeId: number;
  distanceMeters: number;
  edgeType: CampusEdgeType | string;
  isAccessible: boolean;
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
}

export interface RouteResult {
  found: boolean;
  reason?: string;
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

/**
 * Multi-floor weighted Dijkstra shortest-path solver with Divyangjan (wheelchair-accessible) constraints.
 */
export function findShortestCampusRoute(
  nodes: NavNode[],
  edges: NavEdge[],
  floors: NavFloor[],
  buildings: NavBuilding[],
  startNodeId: number,
  endNodeId: number,
  options: { accessibleOnly?: boolean } = {}
): RouteResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const accessibleOnly = Boolean(options.accessibleOnly);

  const nodeMap = new Map<number, NavNode>(nodes.map((n) => [Number(n.id), n]));
  const floorMap = new Map<number, NavFloor>(floors.map((f) => [Number(f.id), f]));
  const buildingMap = new Map<number, NavBuilding>(buildings.map((b) => [Number(b.id), b]));

  const startId = Number(startNodeId);
  const endId = Number(endNodeId);

  const buildEmpty = (reason: string, visitedCount = 0): RouteResult => {
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      found: false,
      reason,
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
      },
    };
  };

  if (!nodeMap.has(startId) || !nodeMap.has(endId)) {
    return buildEmpty("Select both a valid starting point and destination on the campus map.");
  }

  if (startId === endId) {
    const single = nodeMap.get(startId)!;
    const floor = floorMap.get(single.floorId);
    const bldg = single.buildingId ? buildingMap.get(single.buildingId) : null;
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      found: true,
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
      },
    };
  }

  // Build bidirectional adjacency list
  const adj = new Map<number, Array<{ to: number; edge: NavEdge; weight: number }>>();
  for (const n of nodes) {
    adj.set(Number(n.id), []);
  }

  for (const edge of edges) {
    const u = Number(edge.fromNodeId);
    const v = Number(edge.toNodeId);
    const nodeU = nodeMap.get(u);
    const nodeV = nodeMap.get(v);
    if (!nodeU || !nodeV) continue;

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

  const walkSpeedMps = accessibleOnly ? 0.95 : 1.25;
  const estimatedSeconds = Math.max(
    10,
    Math.round(totalMeters / walkSpeedMps + floorTransitions * (accessibleOnly ? 22 : 12))
  );

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    found: true,
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
