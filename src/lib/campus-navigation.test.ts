import test from "node:test";
import assert from "node:assert/strict";
import {
  computeEuclideanMeters,
  findShortestCampusRoute,
  maskInstitutionText,
  resolveInstitutionBranding,
  type NavBuilding,
  type NavEdge,
  type NavFloor,
  type NavNode,
} from "./campus-navigation.ts";

const BUILDINGS: NavBuilding[] = [
  {
    id: 1,
    code: "BLK-B",
    name: "Engineering Block B",
    shortLabel: "Block B",
    category: "academic",
    siteX: 50,
    siteY: 45,
  },
];

const FLOORS: NavFloor[] = [
  {
    id: 10,
    buildingId: null,
    floorNumber: -1,
    floorLabel: "Outdoor Campus",
    mapImageUrl: "/outdoor.svg",
    widthMeters: 200,
    heightMeters: 140,
    isOutdoor: true,
  },
  {
    id: 11,
    buildingId: 1,
    floorNumber: 0,
    floorLabel: "Ground Floor",
    mapImageUrl: "/b-g.svg",
    widthMeters: 60,
    heightMeters: 40,
    isOutdoor: false,
  },
  {
    id: 12,
    buildingId: 1,
    floorNumber: 2,
    floorLabel: "2nd Floor",
    mapImageUrl: "/b-2.svg",
    widthMeters: 60,
    heightMeters: 40,
    isOutdoor: false,
  },
];

const NODES: NavNode[] = [
  { id: 1, floorId: 10, buildingId: null, code: "GATE", label: "Main Campus Gate", nodeType: "entrance", x: 10, y: 80, isAccessible: true },
  { id: 2, floorId: 11, buildingId: 1, code: "B-ENT", label: "Block B Entrance", nodeType: "entrance", x: 15, y: 80, isAccessible: true },
  { id: 3, floorId: 11, buildingId: 1, code: "B-STAIR-G", label: "Staircase B (Ground)", nodeType: "stairs", x: 35, y: 50, isAccessible: false },
  { id: 4, floorId: 11, buildingId: 1, code: "B-LIFT-G", label: "Elevator 1 (Ground)", nodeType: "elevator", x: 70, y: 50, isAccessible: true },
  { id: 5, floorId: 12, buildingId: 1, code: "B-STAIR-2", label: "Staircase B (2nd Floor)", nodeType: "stairs", x: 35, y: 50, isAccessible: false },
  { id: 6, floorId: 12, buildingId: 1, code: "B-LIFT-2", label: "Elevator 1 (2nd Floor)", nodeType: "elevator", x: 70, y: 50, isAccessible: true },
  { id: 7, floorId: 12, buildingId: 1, code: "CS-LAB-2", label: "Computer Lab 2", nodeType: "lab", x: 40, y: 20, isAccessible: true },
  { id: 8, floorId: 12, buildingId: 1, code: "ISOLATED", label: "Locked Roof Store", nodeType: "room", x: 90, y: 10, isAccessible: true },
];

const EDGES: NavEdge[] = [
  { id: 1, fromNodeId: 1, toNodeId: 2, distanceMeters: 45, edgeType: "walkway", isAccessible: true },
  { id: 2, fromNodeId: 2, toNodeId: 3, distanceMeters: 12, edgeType: "corridor", isAccessible: true },
  { id: 3, fromNodeId: 2, toNodeId: 4, distanceMeters: 28, edgeType: "ramp", isAccessible: true },
  { id: 4, fromNodeId: 3, toNodeId: 5, distanceMeters: 8, edgeType: "stairs", isAccessible: false },
  { id: 5, fromNodeId: 4, toNodeId: 6, distanceMeters: 8, edgeType: "elevator", isAccessible: true },
  { id: 6, fromNodeId: 5, toNodeId: 7, distanceMeters: 10, edgeType: "corridor", isAccessible: true },
  { id: 7, fromNodeId: 6, toNodeId: 7, distanceMeters: 18, edgeType: "corridor", isAccessible: true },
];

test("computeEuclideanMeters scales normalized coordinates by physical floor dimensions", () => {
  const meters = computeEuclideanMeters({ x: 0, y: 0 }, { x: 50, y: 0 }, 80, 40);
  assert.equal(meters, 40);
});

test("findShortestCampusRoute chooses shorter staircase path in standard mode", () => {
  const res = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 7, { accessibleOnly: false });
  assert.equal(res.found, true);
  assert.deepEqual(res.nodeIds, [1, 2, 3, 5, 7]);
  assert.equal(res.totalMeters, 75); // 45 + 12 + 8 + 10
  assert.equal(res.solverMetrics.floorTransitions, 2); // Outdoor->Ground + Ground->2nd
  assert.equal(res.solverMetrics.accessibleConstraintApplied, false);
  assert.ok(res.steps.some((s) => s.isFloorChange && /Staircase B/i.test(s.instruction)));
});

test("findShortestCampusRoute reroutes strictly via ramp + elevator in Divyangjan accessible mode", () => {
  const res = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 7, { accessibleOnly: true });
  assert.equal(res.found, true);
  assert.deepEqual(res.nodeIds, [1, 2, 4, 6, 7]);
  assert.equal(res.totalMeters, 99); // 45 + 28 + 8 + 18
  assert.equal(res.solverMetrics.accessibleConstraintApplied, true);
  assert.ok(!res.edges.some((e) => e.edgeType === "stairs"));
  assert.ok(res.steps.some((s) => /Elevator 1/i.test(s.instruction)));
});

test("findShortestCampusRoute gracefully reports disconnected destination", () => {
  const res = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 8, { accessibleOnly: false });
  assert.equal(res.found, false);
  assert.match(res.reason || "", /not yet connected/i);
});

test("resolveInstitutionBranding & maskInstitutionText enforce Avishkar Blind-Evaluation anonymity", () => {
  const blind = resolveInstitutionBranding({
    siteTagline: "State Engineering University",
    institutionCode: "SEU",
    allowedDomain: "seu.edu",
    blindEvaluationMode: true,
  });
  assert.equal(blind.blindEvaluationMode, true);
  assert.equal(blind.institutionCode, "CAMPUS");
  assert.ok(!blind.institutionName.includes("SEU"));
  assert.equal(
    maskInstitutionText(
      "State Engineering University (SEU-CSLAB-02)",
      true,
      "State Engineering University",
      "SEU"
    ),
    "Smart Campus Institution (CAMPUS-CSLAB-02)"
  );

  const branded = resolveInstitutionBranding({
    siteTagline: "State Engineering University",
    institutionCode: "SEU",
    allowedDomain: "seu.edu",
    blindEvaluationMode: false,
  });
  assert.equal(branded.blindEvaluationMode, false);
  assert.equal(branded.institutionCode, "SEU");
  assert.equal(branded.institutionName, "State Engineering University");
});
