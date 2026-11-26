/**
 * Pure Multi-Floor Weighted Dijkstra Campus Pathfinding Engine (Client).
 * Matches src/lib/campus-navigation.ts for instant zero-latency interactive routing.
 */

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

  const nodeMap = new Map(nodes.map((n) => [Number(n.id), n]));
  const floorMap = new Map(floors.map((f) => [Number(f.id), f]));
  const buildingMap = new Map(buildings.map((b) => [Number(b.id), b]));

  const startId = Number(startNodeId);
  const endId = Number(endNodeId);

  const buildEmpty = (reason, visitedCount = 0) => {
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
    return buildEmpty("Select both a starting point and destination on the campus map.");
  }

  if (startId === endId) {
    const single = nodeMap.get(startId);
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

  const adj = new Map();
  for (const n of nodes) adj.set(Number(n.id), []);

  for (const edge of edges) {
    const u = Number(edge.fromNodeId);
    const v = Number(edge.toNodeId);
    const nodeU = nodeMap.get(u);
    const nodeV = nodeMap.get(v);
    if (!nodeU || !nodeV) continue;

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

export function formatWalkingEta(seconds) {
  const s = Math.max(0, Math.round(Number(seconds || 0)));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}
