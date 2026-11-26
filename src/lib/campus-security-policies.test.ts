import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCampusAccessPolicies,
  canAccessTier,
  findShortestCampusRoute,
  getEffectiveAccessLevel,
  resolveViewerAccessTier,
  type NavBuilding,
  type NavEdge,
  type NavFloor,
  type NavNode,
} from "./campus-navigation";
import {
  MAX_BLUEPRINT_BYTES,
  validateBlueprintBuffer,
  validateBlueprintUrl,
} from "./blueprint-media";

const BUILDINGS: NavBuilding[] = [
  { id: 1, code: "BLK-B", name: "Engineering Block B", shortLabel: "Block B", category: "academic", siteX: 34, siteY: 42 },
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
  {
    id: 20,
    buildingId: 1,
    floorNumber: 3,
    floorLabel: "Executive Records Wing",
    mapImageUrl: "https://cdn.example.com/secret-floor.png",
    widthMeters: 50,
    heightMeters: 40,
    isOutdoor: false,
    accessLevel: "staff",
    isSensitive: true,
    restrictedNotice: "Staff Badge Required for Floor 3.",
  },
];

const NODES: NavNode[] = [
  { id: 1, floorId: 10, buildingId: 1, code: "ENT", label: "Main Lobby", nodeType: "entrance", x: 10, y: 50, isAccessible: true, accessLevel: "public" },
  { id: 2, floorId: 10, buildingId: 1, code: "SHORT-SEC", label: "Security Checkpoint Corridor", nodeType: "corridor", x: 45, y: 30, isAccessible: true, accessLevel: "staff", isSensitive: true, restrictedNotice: "Staff corridor only." },
  { id: 3, floorId: 10, buildingId: 1, code: "LONG-PUB", label: "Public Hallway", nodeType: "corridor", x: 45, y: 75, isAccessible: true, accessLevel: "public" },
  { id: 4, floorId: 10, buildingId: 1, code: "LAB-1", label: "Open Computer Lab", nodeType: "lab", x: 80, y: 50, isAccessible: true, accessLevel: "public", qrSpotCode: "CAMPUS-LAB-1" },
  { id: 5, floorId: 10, buildingId: 1, code: "VAULT", label: "Core Server Vault", nodeType: "lab", x: 92, y: 20, isAccessible: true, accessLevel: "admin", isSensitive: true, qrSpotCode: "SECRET-QR-01", description: "Main fiber rack & credentials" },
  { id: 6, floorId: 20, buildingId: 1, code: "F3-OFFICE", label: "Registrar Archive", nodeType: "room", x: 50, y: 50, isAccessible: true, accessLevel: "public" },
];

const EDGES: NavEdge[] = [
  // Short path via staff-only corridor (total 10m)
  { id: 101, fromNodeId: 1, toNodeId: 2, distanceMeters: 5, edgeType: "corridor", isAccessible: true, accessLevel: "public" },
  { id: 102, fromNodeId: 2, toNodeId: 4, distanceMeters: 5, edgeType: "corridor", isAccessible: true, accessLevel: "public" },
  // Longer public detour (total 24m)
  { id: 103, fromNodeId: 1, toNodeId: 3, distanceMeters: 12, edgeType: "corridor", isAccessible: true, accessLevel: "public" },
  { id: 104, fromNodeId: 3, toNodeId: 4, distanceMeters: 12, edgeType: "corridor", isAccessible: true, accessLevel: "public" },
  // Link to admin server vault
  { id: 105, fromNodeId: 4, toNodeId: 5, distanceMeters: 6, edgeType: "corridor", isAccessible: true, accessLevel: "admin", isSensitive: true },
  // Elevator to staff-only Floor 3
  { id: 106, fromNodeId: 4, toNodeId: 6, distanceMeters: 9, edgeType: "elevator", isAccessible: true, accessLevel: "public" },
];

test("resolveViewerAccessTier maps user roles and verification status accurately", () => {
  assert.equal(resolveViewerAccessTier(null), "public");
  assert.equal(resolveViewerAccessTier({ role: "student", isVerified: false }), "public");
  assert.equal(resolveViewerAccessTier({ role: "student", isVerified: true }), "student");
  assert.equal(resolveViewerAccessTier({ role: "staff", isVerified: true }), "staff");
  assert.equal(resolveViewerAccessTier({ role: "admin", isVerified: true }), "admin");
  assert.equal(resolveViewerAccessTier({ role: "user", isEmailVerified: true }), "student");
  assert.equal(resolveViewerAccessTier({ role: "user", isEmailVerified: false }), "public");
  assert.equal(resolveViewerAccessTier({ role: "admin", isActive: false }), "public");
});

test("tier hierarchy and floor inheritance work strictly", () => {
  assert.equal(canAccessTier("public", "public"), true);
  assert.equal(canAccessTier("public", "student"), false);
  assert.equal(canAccessTier("student", "staff"), false);
  assert.equal(canAccessTier("staff", "student"), true);
  assert.equal(canAccessTier("admin", "admin"), true);
  assert.equal(getEffectiveAccessLevel("public", "staff"), "staff");
  assert.equal(getEffectiveAccessLevel("admin", "staff"), "admin");
});

test("applyCampusAccessPolicies redacts locked floors, nodes, QR codes, and live pins for public viewers", () => {
  const projected = applyCampusAccessPolicies(
    {
      floors: FLOORS,
      nodes: NODES,
      edges: EDGES,
      livePins: {
        complaints: [
          { id: 1, mapNodeId: 4, title: "Projector issue" },
          { id: 2, mapNodeId: 5, title: "Server rack overheat" },
        ],
        qrSpots: [
          { id: 1, mapNodeId: 4, spotCode: "CAMPUS-LAB-1" },
          { id: 2, mapNodeId: 5, spotCode: "SECRET-QR-01" },
        ],
        lostFound: [],
      },
    },
    "public"
  );

  // Staff-only floor 20 must be locked and blueprint stripped
  const f3 = projected.floors.find((f) => f.id === 20)!;
  assert.equal(f3.isLocked, true);
  assert.equal(f3.mapImageUrl, "");

  // Child node on locked floor inherits floor lock
  const f3Node = projected.nodes.find((n) => n.id === 6)!;
  assert.equal(f3Node.isLocked, true);
  assert.equal(f3Node.effectiveAccessLevel, "staff");

  // Admin vault node must mask label, description, and QR spot
  const vault = projected.nodes.find((n) => n.id === 5)!;
  assert.equal(vault.isLocked, true);
  assert.equal(vault.description, "");
  assert.equal(vault.qrSpotCode, null);
  assert.match(vault.label, /Restricted Area/i);

  // Live pins inside locked nodes must be excluded
  assert.equal(projected.livePins?.complaints?.length, 1);
  assert.equal(projected.livePins?.qrSpots?.length, 1);
});

test("applyCampusAccessPolicies unlocks staff zones for staff while keeping admin vault locked", () => {
  const projected = applyCampusAccessPolicies(
    { floors: FLOORS, nodes: NODES, edges: EDGES },
    "staff"
  );
  const f3 = projected.floors.find((f) => f.id === 20)!;
  const vault = projected.nodes.find((n) => n.id === 5)!;
  assert.equal(f3.isLocked, false);
  assert.equal(f3.mapImageUrl, "https://cdn.example.com/secret-floor.png");
  assert.equal(vault.isLocked, true);
});

test("Dijkstra blocks entry to locked destinations and automatically detours around restricted corridors", () => {
  // 1. Public viewer routing Lobby (1) -> Open Lab (4) must detour via Public Hallway (3) instead of Staff Corridor (2)
  const publicRoute = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 4, {
    viewerAccessTier: "public",
  });
  assert.equal(publicRoute.found, true);
  assert.deepEqual(publicRoute.nodeIds, [1, 3, 4]);
  assert.equal(publicRoute.totalMeters, 24);
  assert.equal(publicRoute.detouredAroundRestricted, true);

  // 2. Staff viewer can take the shorter Staff Corridor (2)
  const staffRoute = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 4, {
    viewerAccessTier: "staff",
  });
  assert.equal(staffRoute.found, true);
  assert.deepEqual(staffRoute.nodeIds, [1, 2, 4]);
  assert.equal(staffRoute.totalMeters, 10);
  assert.equal(staffRoute.detouredAroundRestricted, false);

  // 3. Public & Staff viewers are blocked from routing into Admin Server Vault (5)
  const blockedVault = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 5, {
    viewerAccessTier: "staff",
  });
  assert.equal(blockedVault.found, false);
  assert.equal(blockedVault.blockedByPolicy, true);
  assert.equal(blockedVault.requiredTier, "admin");

  // 4. Admin viewer can reach Admin Server Vault (5)
  const adminVault = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 5, {
    viewerAccessTier: "admin",
  });
  assert.equal(adminVault.found, true);
  assert.equal(adminVault.nodeIds[adminVault.nodeIds.length - 1], 5);

  // 5. Public viewer is blocked from entering Staff-only Floor 3 node (6)
  const blockedFloor = findShortestCampusRoute(NODES, EDGES, FLOORS, BUILDINGS, 1, 6, {
    viewerAccessTier: "student",
  });
  assert.equal(blockedFloor.found, false);
  assert.equal(blockedFloor.blockedByPolicy, true);
  assert.equal(blockedFloor.requiredTier, "staff");
});

test("validateBlueprintBuffer accepts PNG/JPEG/WebP magic bytes and rejects SVG/corrupt/oversized files", () => {
  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  assert.equal(validateBlueprintBuffer(validPng, "image/png").valid, true);

  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert.equal(validateBlueprintBuffer(validJpeg, "image/jpeg").valid, true);

  const validWebp = Buffer.from("RIFF\x24\x00\x00\x00WEBPVP8 ", "binary");
  assert.equal(validateBlueprintBuffer(validWebp, "image/webp").valid, true);

  const svgBytes = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
  assert.equal(validateBlueprintBuffer(svgBytes, "image/svg+xml").valid, false);
  assert.equal(validateBlueprintBuffer(svgBytes, "image/png").valid, false);

  const oversized = Buffer.alloc(MAX_BLUEPRINT_BYTES + 1, 0);
  validPng.copy(oversized);
  assert.equal(validateBlueprintBuffer(oversized, "image/png").valid, false);
});

test("validateBlueprintUrl permits safe local /maps/, HTTPS, and raster data URIs while blocking unsafe URIs", () => {
  assert.equal(validateBlueprintUrl("/maps/block-b-ground.svg").valid, true);
  assert.equal(validateBlueprintUrl("https://res.cloudinary.com/demo/image/upload/floor1.png").valid, true);
  assert.equal(validateBlueprintUrl("data:image/png;base64,iVBORw0KGgo=").valid, true);
  assert.equal(validateBlueprintUrl("data:image/svg+xml;base64,PHN2Zz4=").valid, false);
  assert.equal(validateBlueprintUrl("javascript:alert(1)").valid, false);
  assert.equal(validateBlueprintUrl("http://insecure.example.com/map.png").valid, false);
  assert.equal(validateBlueprintUrl("/maps/../../etc/passwd").valid, false);
});
