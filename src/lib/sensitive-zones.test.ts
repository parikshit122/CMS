import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCampusAccessPolicies,
  findShortestCampusRoute,
  type NavBuilding,
  type NavEdge,
  type NavFloor,
  type NavNode,
} from "./campus-navigation.ts";
import {
  doesSegmentIntersectZone,
  isPointInSensitiveZone,
  normalizeZoneBounds,
  projectSensitiveZone,
  type CampusSensitiveZone,
} from "./sensitive-zones.ts";

const BUILDINGS: NavBuilding[] = [
  { id: 1, code: "BLK-B", name: "Block B", shortLabel: "Block B", category: "academic", siteX: 35, siteY: 45 },
];

const FLOORS: NavFloor[] = [
  {
    id: 10,
    buildingId: 1,
    floorNumber: 0,
    floorLabel: "Ground Floor",
    mapImageUrl: "/maps/block-b-ground.svg",
    widthMeters: 60,
    heightMeters: 42,
    isOutdoor: false,
    accessLevel: "public",
    isSensitive: false,
  },
];

test("normalizeZoneBounds clamps rectangular bounds and extracts polygon bounding boxes", () => {
  const rect = normalizeZoneBounds({
    shapeType: "rect",
    boundsX: -10,
    boundsY: 95,
    boundsWidth: 150,
    boundsHeight: 2,
  });
  assert.equal(rect.shapeType, "rect");
  assert.equal(rect.boundsX, 0);
  assert.equal(rect.boundsY, 95);
  assert.equal(rect.boundsWidth, 100);
  assert.equal(rect.boundsHeight, 4);

  const poly = normalizeZoneBounds({
    shapeType: "polygon",
    polygonPoints: [
      { x: 20, y: 20 },
      { x: 60, y: 20 },
      { x: 60, y: 50 },
      { x: 20, y: 50 },
    ],
  });
  assert.equal(poly.shapeType, "polygon");
  assert.equal(poly.boundsX, 20);
  assert.equal(poly.boundsY, 20);
  assert.equal(poly.boundsWidth, 40);
  assert.equal(poly.boundsHeight, 30);
});

test("isPointInSensitiveZone and doesSegmentIntersectZone work for both rectangles and polygons", () => {
  const rectZone: CampusSensitiveZone = {
    id: 1,
    floorId: 10,
    buildingId: 1,
    code: "ZONE-RECT",
    name: "Server Cage",
    zoneCategory: "infrastructure",
    accessLevel: "admin",
    shapeType: "rect",
    boundsX: 40,
    boundsY: 30,
    boundsWidth: 20,
    boundsHeight: 20,
    polygonPoints: [],
    blockRouting: true,
    restrictedNotice: "Admin only.",
    isActive: true,
  };

  assert.equal(isPointInSensitiveZone({ x: 50, y: 40 }, rectZone), true);
  assert.equal(isPointInSensitiveZone({ x: 35, y: 40 }, rectZone), false);
  // Corridor crossing horizontally right through [40..60, 30..50]
  assert.equal(doesSegmentIntersectZone({ x: 20, y: 40 }, { x: 80, y: 40 }, rectZone), true);
  // Detour corridor safely above the zone (y = 15)
  assert.equal(doesSegmentIntersectZone({ x: 20, y: 15 }, { x: 80, y: 15 }, rectZone), false);

  const triZone: CampusSensitiveZone = {
    ...rectZone,
    id: 2,
    code: "ZONE-POLY",
    shapeType: "polygon",
    polygonPoints: [
      { x: 50, y: 10 },
      { x: 80, y: 50 },
      { x: 20, y: 50 },
    ],
  };

  assert.equal(isPointInSensitiveZone({ x: 50, y: 35 }, triZone), true);
  assert.equal(isPointInSensitiveZone({ x: 25, y: 15 }, triZone), false);
  assert.equal(doesSegmentIntersectZone({ x: 10, y: 30 }, { x: 90, y: 30 }, triZone), true);
});

test("projectSensitiveZone enforces Public, Student, Staff, Admin hierarchy and masks locked names", () => {
  const staffZone: CampusSensitiveZone = {
    id: 3,
    floorId: 10,
    buildingId: 1,
    code: "ZONE-EXAM",
    name: "Confidential Exam Vault",
    zoneCategory: "exam",
    accessLevel: "staff",
    shapeType: "rect",
    boundsX: 70,
    boundsY: 15,
    boundsWidth: 20,
    boundsHeight: 35,
    polygonPoints: [],
    blockRouting: true,
    restrictedNotice: "Staff clearance required.",
    isActive: true,
  };

  const asPublic = projectSensitiveZone(staffZone, "public");
  assert.equal(asPublic.isLocked, true);
  assert.equal(asPublic.name, "Restricted Zone (Staff Only)");

  const asStudent = projectSensitiveZone(staffZone, "student");
  assert.equal(asStudent.isLocked, true);

  const asStaff = projectSensitiveZone(staffZone, "staff");
  assert.equal(asStaff.isLocked, false);
  assert.equal(asStaff.name, "Confidential Exam Vault");

  const asAdmin = projectSensitiveZone(staffZone, "admin");
  assert.equal(asAdmin.isLocked, false);

  // Floor tier inheritance: a 'student' zone on an 'admin' floor becomes effectively 'admin'
  const inherited = projectSensitiveZone({ ...staffZone, accessLevel: "student" }, "staff", "admin");
  assert.equal(inherited.effectiveAccessLevel, "admin");
  assert.equal(inherited.isLocked, true);
});

test("applyCampusAccessPolicies enforces spatial zone containment on nodes and forces Dijkstra detours", () => {
  const nodes: NavNode[] = [
    { id: 1, floorId: 10, buildingId: 1, code: "WEST", label: "West Hall", nodeType: "entrance", x: 15, y: 50, isAccessible: true, accessLevel: "public" },
    { id: 2, floorId: 10, buildingId: 1, code: "EAST", label: "East Hall", nodeType: "room", x: 85, y: 50, isAccessible: true, accessLevel: "public" },
    { id: 3, floorId: 10, buildingId: 1, code: "NORTH", label: "North Bypass", nodeType: "corridor", x: 50, y: 15, isAccessible: true, accessLevel: "public" },
    // Public node physically located INSIDE the Admin security zone [40..60, 40..60]
    { id: 4, floorId: 10, buildingId: 1, code: "RACK-1", label: "Fiber Patch Rack", nodeType: "lab", x: 50, y: 50, isAccessible: true, accessLevel: "public" },
  ];

  const edges: NavEdge[] = [
    // Direct shortcut crossing straight through the spatial zone [40..60, 40..60]
    { id: 101, fromNodeId: 1, toNodeId: 2, distanceMeters: 25, edgeType: "corridor", isAccessible: true, accessLevel: "public" },
    // Longer bypass around the north side (y = 15)
    { id: 102, fromNodeId: 1, toNodeId: 3, distanceMeters: 24, edgeType: "corridor", isAccessible: true, accessLevel: "public" },
    { id: 103, fromNodeId: 3, toNodeId: 2, distanceMeters: 24, edgeType: "corridor", isAccessible: true, accessLevel: "public" },
  ];

  const sensitiveZones: CampusSensitiveZone[] = [
    {
      id: 9,
      floorId: 10,
      buildingId: 1,
      code: "ZONE-SEC-CORE",
      name: "Core Server Perimeter",
      zoneCategory: "infrastructure",
      accessLevel: "admin",
      shapeType: "rect",
      boundsX: 40,
      boundsY: 40,
      boundsWidth: 20,
      boundsHeight: 20,
      polygonPoints: [],
      blockRouting: true,
      restrictedNotice: "Admin infrastructure perimeter.",
      isActive: true,
    },
  ];

  // For a student viewer, RACK-1 must inherit 'admin' lock and direct edge 101 must be locked
  const studentBundle = applyCampusAccessPolicies(
    { floors: FLOORS, nodes, edges, sensitiveZones },
    "student"
  );
  const rackForStudent = studentBundle.nodes.find((n) => n.id === 4)!;
  assert.equal(rackForStudent.isLocked, true);
  assert.equal(rackForStudent.effectiveAccessLevel, "admin");
  assert.equal(rackForStudent.label, "Restricted Area (Admin Only)");

  const directEdgeForStudent = studentBundle.edges.find((e) => e.id === 101)!;
  assert.equal(directEdgeForStudent.isLocked, true);

  // Student route from WEST -> EAST must automatically detour via NORTH bypass
  const studentRoute = findShortestCampusRoute(
    studentBundle.nodes,
    studentBundle.edges,
    studentBundle.floors,
    BUILDINGS,
    1,
    2,
    { viewerAccessTier: "student" }
  );
  assert.equal(studentRoute.found, true);
  assert.deepEqual(studentRoute.nodeIds, [1, 3, 2]);
  assert.equal(studentRoute.detouredAroundRestricted, true);

  // Admin viewer can take the direct shortcut through the zone and see RACK-1 unlocked
  const adminBundle = applyCampusAccessPolicies(
    { floors: FLOORS, nodes, edges, sensitiveZones },
    "admin"
  );
  assert.equal(adminBundle.nodes.find((n) => n.id === 4)!.isLocked, false);
  const adminRoute = findShortestCampusRoute(
    adminBundle.nodes,
    adminBundle.edges,
    adminBundle.floors,
    BUILDINGS,
    1,
    2,
    { viewerAccessTier: "admin" }
  );
  assert.equal(adminRoute.found, true);
  assert.deepEqual(adminRoute.nodeIds, [1, 2]);
});
