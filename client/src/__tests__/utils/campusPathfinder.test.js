import { describe, it, expect } from "vitest";
import {
  computeEuclideanMeters,
  findShortestCampusRoute,
  formatWalkingEta,
} from "../../utils/campusPathfinder";

const FLOORS = [
  { id: 1, floorNumber: 0, floorLabel: "Ground Floor", isOutdoor: false },
  { id: 2, floorNumber: 1, floorLabel: "1st Floor", isOutdoor: false },
];

const BUILDINGS = [{ id: 10, name: "Academic Block B", shortLabel: "Block B" }];

const NODES = [
  { id: 1, floorId: 1, buildingId: 10, label: "Reception", nodeType: "desk", x: 10, y: 50, isAccessible: true },
  { id: 2, floorId: 1, buildingId: 10, label: "Main Stairs", nodeType: "stairs", x: 40, y: 50, isAccessible: false },
  { id: 3, floorId: 2, buildingId: 10, label: "Stairs 1F", nodeType: "stairs", x: 40, y: 50, isAccessible: false },
  { id: 4, floorId: 1, buildingId: 10, label: "Accessible Elevator GF", nodeType: "elevator", x: 70, y: 50, isAccessible: true },
  { id: 5, floorId: 2, buildingId: 10, label: "Accessible Elevator 1F", nodeType: "elevator", x: 70, y: 50, isAccessible: true },
  { id: 6, floorId: 2, buildingId: 10, label: "CS Lab 201", nodeType: "lab", x: 50, y: 20, isAccessible: true },
  { id: 7, floorId: 2, buildingId: 10, label: "Isolated Room", nodeType: "room", x: 90, y: 90, isAccessible: true },
];

const EDGES = [
  { fromNodeId: 1, toNodeId: 2, distanceMeters: 15, edgeType: "corridor", isAccessible: true },
  { fromNodeId: 2, toNodeId: 3, distanceMeters: 10, edgeType: "stairs", isAccessible: false },
  { fromNodeId: 3, toNodeId: 6, distanceMeters: 15, edgeType: "corridor", isAccessible: true },
  { fromNodeId: 1, toNodeId: 4, distanceMeters: 30, edgeType: "ramp", isAccessible: true },
  { fromNodeId: 4, toNodeId: 5, distanceMeters: 12, edgeType: "elevator", isAccessible: true },
  { fromNodeId: 5, toNodeId: 6, distanceMeters: 25, edgeType: "corridor", isAccessible: true },
];

describe("campusPathfinder — multi-floor Dijkstra & Divyangjan accessible routing", () => {
  it("computes scaled Euclidean distance in meters", () => {
    expect(computeEuclideanMeters({ x: 0, y: 0 }, { x: 50, y: 0 }, 100, 50)).toBe(50);
    expect(computeEuclideanMeters({ x: 10, y: 10 }, { x: 10, y: 10 }, 60, 40)).toBe(1);
  });

  it("picks the shorter staircase route in standard mode", () => {
    const res = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 6, {
      accessibleOnly: false,
    });
    expect(res.found).toBe(true);
    expect(res.nodeIds).toEqual([1, 2, 3, 6]);
    expect(res.totalMeters).toBe(40);
    expect(res.solverMetrics.floorTransitions).toBe(1);
    expect(res.steps.some((s) => s.edgeType === "stairs")).toBe(true);
  });

  it("avoids stairs and routes strictly via ramp + elevator in accessible mode", () => {
    const res = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 6, {
      accessibleOnly: true,
    });
    expect(res.found).toBe(true);
    expect(res.nodeIds).toEqual([1, 4, 5, 6]);
    expect(res.totalMeters).toBe(67);
    expect(res.steps.some((s) => s.edgeType === "stairs")).toBe(false);
    expect(res.steps.some((s) => s.edgeType === "elevator")).toBe(true);
  });

  it("handles same-node and disconnected destinations gracefully", () => {
    const same = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 1);
    expect(same.found).toBe(true);
    expect(same.totalMeters).toBe(0);

    const disconnected = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 7);
    expect(disconnected.found).toBe(false);
    expect(disconnected.reason).toContain("not yet connected");
  });

  it("formats walking ETAs cleanly", () => {
    expect(formatWalkingEta(45)).toBe("45s");
    expect(formatWalkingEta(120)).toBe("2m");
    expect(formatWalkingEta(135)).toBe("2m 15s");
  });
});
