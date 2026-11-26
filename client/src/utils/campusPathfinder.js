/**
 * Pure Multi-Floor Weighted Dijkstra Campus Pathfinding & Access Policy Engine (Client).
 * Matches src/lib/campus-navigation.ts for instant zero-latency interactive routing and Studio preview.
 */

export const CAMPUS_ACCESS_TIERS = ["public", "student", "staff", "admin"];

export const ACCESS_TIER_RANK = {
  public: 0,
  student: 1,
  staff: 2,
  admin: 3,
};

export const ACCESS_TIER_META = {
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

export function normalizeAccessTier(raw) {
  const val = String(raw || "public").toLowerCase().trim();
  if (val === "admin") return "admin";
  if (val === "staff") return "staff";
  if (val === "student" || val === "verified_student") return "student";
  return "public";
}

export function resolveViewerAccessTier(user) {
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

export function getEffectiveAccessLevel(itemLevel, parentFloorLevel) {
  const a = normalizeAccessTier(itemLevel);
  const b = normalizeAccessTier(parentFloorLevel);
  return ACCESS_TIER_RANK[a] >= ACCESS_TIER_RANK[b] ? a : b;
}

export function canAccessTier(viewerTier, requiredTier) {
  return (
    ACCESS_TIER_RANK[normalizeAccessTier(viewerTier)] >=
    ACCESS_TIER_RANK[normalizeAccessTier(requiredTier)]
  );
}

export function applyCampusAccessPreview(bundle, viewerTierInput = "public") {
  if (!bundle) return null;
  const viewerTier = normalizeAccessTier(viewerTierInput);
  const floorTierMap = new Map();
  const lockedNodeIds = new Set();

  const floors = (bundle.floors || []).map((fl) => {
    const ownTier = normalizeAccessTier(fl.accessLevel);
    floorTierMap.set(Number(fl.id), ownTier);
    const isLocked = !canAccessTier(viewerTier, ownTier);
    return {
      ...fl,
      accessLevel: ownTier,
      effectiveAccessLevel: ownTier,
      isLocked,
    };
  });

  const nodes = (bundle.nodes || []).map((n) => {
    const floorTier = floorTierMap.get(Number(n.floorId)) || "public";
    const ownTier = normalizeAccessTier(n.accessLevel);
    const effectiveTier = getEffectiveAccessLevel(ownTier, floorTier);
    const isLocked = !canAccessTier(viewerTier, effectiveTier);
    if (isLocked) lockedNodeIds.add(Number(n.id));
    return {
      ...n,
      accessLevel: ownTier,
      effectiveAccessLevel: effectiveTier,
      isLocked,
    };
  });

  const nodeTierMap = new Map(
    nodes.map((n) => [Number(n.id), n.effectiveAccessLevel || "public"])
  );

  const edges = (bundle.edges || []).map((e) => {
    const ownTier = normalizeAccessTier(e.accessLevel);
    const inherited = getEffectiveAccessLevel(
      nodeTierMap.get(Number(e.fromNodeId)) || "public",
      nodeTierMap.get(Number(e.toNodeId)) || "public"
    );
    const effectiveTier = getEffectiveAccessLevel(ownTier, inherited);
    const isLocked =
      !canAccessTier(viewerTier, effectiveTier) ||
      lockedNodeIds.has(Number(e.fromNodeId)) ||
      lockedNodeIds.has(Number(e.toNodeId));
    return {
      ...e,
      accessLevel: ownTier,
      effectiveAccessLevel: effectiveTier,
      isLocked,
    };
  });

  return {
    ...bundle,
    floors,
    nodes,
    edges,
    viewerAccessTier: viewerTier,
  };
}

const EDGE_EFFORT_PENALTY = {
  stairs: 10,
  elevator: 14,
  ramp: 2,
  corridor: 0,
  walkway: 0,
};

export function computeEuclideanMeters(a, b, widthMeters = 60, heightMeters = 42) {
  const dx = ((Number(b.x) - Number(a.x)) / 100) * Math.max(5, Number(widthMeters || 60));
  const dy = ((Number(b.y) - Number(a.y)) / 100) * Math.max(5, Number(heightMeters || 42));
  return Math.max(1, Math.round(Math.hypot(dx, dy) * 10) / 10);
}

function isNodeLockedForViewer(node, floor, viewerTier, enforceAccessPolicy) {
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

function isEdgeLockedForViewer(edge, viewerTier, enforceAccessPolicy) {
  if (!enforceAccessPolicy) return false;
  const edgeTier = normalizeAccessTier(edge.effectiveAccessLevel || edge.accessLevel);
  return Boolean(edge.isLocked) || !canAccessTier(viewerTier, edgeTier);
}

export function findShortestCampusRoute(
  nodes = [],
  edges = [],
  floors = [],
  buildings = [],
  startNodeId,
  endNodeId,
  options = {}
) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const accessibleOnly = Boolean(options.accessibleOnly);
  const viewerTier = normalizeAccessTier(options.viewerAccessTier || "public");
  const enforceAccessPolicy = !options.ignoreAccessPolicy;

  const nodeMap = new Map(nodes.map((n) => [Number(n.id), n]));
  const floorMap = new Map(floors.map((f) => [Number(f.id), f]));
  const buildingMap = new Map(buildings.map((b) => [Number(b.id), b]));

  const startId = Number(startNodeId);
  const endId = Number(endNodeId);
  let restrictedNodesSkipped = 0;

  const buildEmpty = (reason, visitedCount = 0, extra = {}) => {
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
    return buildEmpty("Select both a starting point and destination on the campus map.");
  }

  const startNode = nodeMap.get(startId);
  const endNode = nodeMap.get(endId);

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

  const lockedNodeSet = new Set();
  if (enforceAccessPolicy) {
    for (const n of nodes) {
      const check = isNodeLockedForViewer(n, floorMap.get(n.floorId), viewerTier, true);
      if (check.locked) lockedNodeSet.add(Number(n.id));
    }
    restrictedNodesSkipped = lockedNodeSet.size;
  }

  const adj = new Map();
  for (const n of nodes) adj.set(Number(n.id), []);

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

  const dist = new Map();
  const prevNode = new Map();
  const prevEdge = new Map();
  const visited = new Set();

  for (const n of nodes) dist.set(Number(n.id), Infinity);
  dist.set(startId, 0);

  const queue = [{ id: startId, d: 0 }];
  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const current = queue.shift();
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === endId) break;

    for (const { to, edge, weight } of adj.get(current.id) || []) {
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
        ? "No stair-free (Divyangjan accessible) route currently links these points. Ask an admin to connect an elevator or ramp in Campus Studio."
        : "These two campus locations are not yet connected by a walkable path.",
      visited.size
    );
  }

  const orderedIds = [];
  const orderedEdges = [];
  let cursor = endId;
  while (cursor !== undefined) {
    orderedIds.unshift(cursor);
    const e = prevEdge.get(cursor);
    if (e) orderedEdges.unshift(e);
    cursor = prevNode.get(cursor);
  }

  const orderedNodes = orderedIds.map((id) => nodeMap.get(id)).filter(Boolean);
  const segmentsByFloor = {};
  const steps = [];
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
        instruction = `Enter ${toBuilding?.name || "building"} via ${to.label} (${toFloor?.floorLabel || "Ground Floor"}).`;
      } else if (!fromFloor?.isOutdoor && toFloor?.isOutdoor) {
        instruction = `Exit onto the outdoor campus walkway at ${to.label}.`;
      } else {
        instruction = `Transition via ${edge.edgeType} from ${from.label} to ${to.label}.`;
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

export function formatWalkingEta(seconds) {
  const s = Math.max(0, Math.round(Number(seconds || 0)));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}
