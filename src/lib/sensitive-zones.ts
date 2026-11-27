import {
  ACCESS_TIER_META,
  canAccessTier,
  getEffectiveAccessLevel,
  normalizeAccessTier,
  type CampusAccessTier,
} from "./campus-navigation.ts";

export const SENSITIVE_ZONE_CATEGORIES = [
  "restricted",
  "security",
  "exam",
  "infrastructure",
  "laboratory",
  "executive",
] as const;

export type SensitiveZoneCategory = (typeof SENSITIVE_ZONE_CATEGORIES)[number];

export const SENSITIVE_ZONE_SHAPES = ["rect", "polygon"] as const;
export type SensitiveZoneShape = (typeof SENSITIVE_ZONE_SHAPES)[number];

export interface ZonePoint {
  x: number; // 0..100 normalized horizontal percent
  y: number; // 0..100 normalized vertical percent
}

export interface SensitiveZoneBounds {
  x: number; // 0..100 normalized left
  y: number; // 0..100 normalized top
  width: number; // 4..100 normalized width
  height: number; // 4..100 normalized height
}

export interface CampusSensitiveZone {
  id: number;
  floorId: number;
  buildingId: number | null;
  code: string;
  name: string;
  zoneCategory: SensitiveZoneCategory | string;
  accessLevel: CampusAccessTier | string;
  shapeType: SensitiveZoneShape | string;
  boundsX: number;
  boundsY: number;
  boundsWidth: number;
  boundsHeight: number;
  polygonPoints?: ZonePoint[] | null;
  blockRouting: boolean;
  restrictedNotice?: string | null;
  isActive: boolean;
}

export interface ProjectedSensitiveZone extends CampusSensitiveZone {
  zoneCategory: SensitiveZoneCategory;
  shapeType: SensitiveZoneShape;
  accessLevel: CampusAccessTier;
  effectiveAccessLevel: CampusAccessTier;
  isLocked: boolean;
  polygonPoints: ZonePoint[];
  restrictedNotice: string;
}

export const SENSITIVE_ZONE_CATEGORY_META: Record<
  SensitiveZoneCategory,
  { label: string; icon: string }
> = {
  restricted: { label: "Restricted Wing", icon: "bx-lock-alt" },
  security: { label: "Security Perimeter", icon: "bx-shield-quarter" },
  exam: { label: "Examination Vault", icon: "bx-file-blank" },
  infrastructure: { label: "Server & Core Infra", icon: "bx-server" },
  laboratory: { label: "Controlled Research Lab", icon: "bx-test-tube" },
  executive: { label: "Executive & Records", icon: "bx-briefcase-alt-2" },
};

export function normalizeSensitiveZoneCategory(raw: unknown): SensitiveZoneCategory {
  const val = String(raw || "restricted").toLowerCase().trim();
  if ((SENSITIVE_ZONE_CATEGORIES as readonly string[]).includes(val)) {
    return val as SensitiveZoneCategory;
  }
  return "restricted";
}

export function normalizeSensitiveZoneShape(raw: unknown): SensitiveZoneShape {
  return String(raw || "rect").toLowerCase().trim() === "polygon" ? "polygon" : "rect";
}

function clampPercent(value: unknown, fallback: number, min = 0, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100));
}

export function normalizeZoneBounds(input: {
  boundsX?: unknown;
  boundsY?: unknown;
  boundsWidth?: unknown;
  boundsHeight?: unknown;
  polygonPoints?: unknown;
  shapeType?: unknown;
}): {
  shapeType: SensitiveZoneShape;
  boundsX: number;
  boundsY: number;
  boundsWidth: number;
  boundsHeight: number;
  polygonPoints: ZonePoint[];
} {
  const shapeType = normalizeSensitiveZoneShape(input.shapeType);

  let polygonPoints: ZonePoint[] = [];
  if (Array.isArray(input.polygonPoints)) {
    polygonPoints = input.polygonPoints
      .map((pt) => {
        if (!pt || typeof pt !== "object") return null;
        const raw = pt as Record<string, unknown>;
        const x = Number(raw.x);
        const y = Number(raw.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return {
          x: clampPercent(x, 0, 0, 100),
          y: clampPercent(y, 0, 0, 100),
        };
      })
      .filter((pt): pt is ZonePoint => pt !== null);
  }

  if (shapeType === "polygon" && polygonPoints.length >= 3) {
    const xs = polygonPoints.map((p) => p.x);
    const ys = polygonPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      shapeType: "polygon",
      boundsX: minX,
      boundsY: minY,
      boundsWidth: Math.max(4, Math.round((maxX - minX) * 100) / 100),
      boundsHeight: Math.max(4, Math.round((maxY - minY) * 100) / 100),
      polygonPoints,
    };
  }

  const boundsX = clampPercent(input.boundsX, 40, 0, 96);
  const boundsY = clampPercent(input.boundsY, 40, 0, 96);
  const maxWidth = Math.max(4, 100 - boundsX);
  const maxHeight = Math.max(4, 100 - boundsY);
  const boundsWidth = clampPercent(input.boundsWidth, 20, 4, maxWidth);
  const boundsHeight = clampPercent(input.boundsHeight, 20, 4, maxHeight);

  return {
    shapeType: "rect",
    boundsX,
    boundsY,
    boundsWidth,
    boundsHeight,
    polygonPoints: [],
  };
}

export function getZonePolygonVertices(zone: Pick<
  CampusSensitiveZone,
  "shapeType" | "boundsX" | "boundsY" | "boundsWidth" | "boundsHeight" | "polygonPoints"
>): ZonePoint[] {
  if (
    normalizeSensitiveZoneShape(zone.shapeType) === "polygon" &&
    Array.isArray(zone.polygonPoints) &&
    zone.polygonPoints.length >= 3
  ) {
    return zone.polygonPoints;
  }
  const x1 = Number(zone.boundsX) || 0;
  const y1 = Number(zone.boundsY) || 0;
  const x2 = x1 + (Number(zone.boundsWidth) || 0);
  const y2 = y1 + (Number(zone.boundsHeight) || 0);
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];
}

export function isPointInSensitiveZone(
  point: ZonePoint,
  zone: Pick<
    CampusSensitiveZone,
    "shapeType" | "boundsX" | "boundsY" | "boundsWidth" | "boundsHeight" | "polygonPoints"
  >
): boolean {
  const px = Number(point.x);
  const py = Number(point.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return false;

  if (
    normalizeSensitiveZoneShape(zone.shapeType) !== "polygon" ||
    !Array.isArray(zone.polygonPoints) ||
    zone.polygonPoints.length < 3
  ) {
    const x1 = Number(zone.boundsX) || 0;
    const y1 = Number(zone.boundsY) || 0;
    const x2 = x1 + (Number(zone.boundsWidth) || 0);
    const y2 = y1 + (Number(zone.boundsHeight) || 0);
    return px >= x1 && px <= x2 && py >= y1 && py <= y2;
  }

  // Ray-casting algorithm for arbitrary simple polygons
  const pts = zone.polygonPoints;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;

    // Check point directly on edge
    const cross = (py - yi) * (xj - xi) - (px - xi) * (yj - yi);
    if (
      Math.abs(cross) < 1e-6 &&
      px >= Math.min(xi, xj) - 1e-6 &&
      px <= Math.max(xi, xj) + 1e-6 &&
      py >= Math.min(yi, yj) - 1e-6 &&
      py <= Math.max(yi, yj) + 1e-6
    ) {
      return true;
    }

    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function orientation(p: ZonePoint, q: ZonePoint, r: ZonePoint): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: ZonePoint, q: ZonePoint, r: ZonePoint): boolean {
  return (
    q.x <= Math.max(p.x, r.x) + 1e-9 &&
    q.x >= Math.min(p.x, r.x) - 1e-9 &&
    q.y <= Math.max(p.y, r.y) + 1e-9 &&
    q.y >= Math.min(p.y, r.y) - 1e-9
  );
}

function segmentsIntersect(p1: ZonePoint, q1: ZonePoint, p2: ZonePoint, q2: ZonePoint): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

export function doesSegmentIntersectZone(
  a: ZonePoint,
  b: ZonePoint,
  zone: Pick<
    CampusSensitiveZone,
    "shapeType" | "boundsX" | "boundsY" | "boundsWidth" | "boundsHeight" | "polygonPoints"
  >
): boolean {
  if (isPointInSensitiveZone(a, zone) || isPointInSensitiveZone(b, zone)) {
    return true;
  }
  const vertices = getZonePolygonVertices(zone);
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];
    if (segmentsIntersect(a, b, v1, v2)) {
      return true;
    }
  }
  return false;
}

export function projectSensitiveZone(
  zone: CampusSensitiveZone,
  viewerTierInput: CampusAccessTier | string,
  parentFloorLevel: CampusAccessTier | string = "public"
): ProjectedSensitiveZone {
  const viewerTier = normalizeAccessTier(viewerTierInput);
  const ownTier = normalizeAccessTier(zone.accessLevel);
  const effectiveAccessLevel = getEffectiveAccessLevel(ownTier, parentFloorLevel);
  const isLocked = zone.isActive !== false && !canAccessTier(viewerTier, effectiveAccessLevel);
  const normalizedBounds = normalizeZoneBounds(zone);
  const category = normalizeSensitiveZoneCategory(zone.zoneCategory);
  const notice =
    zone.restrictedNotice?.trim() ||
    ACCESS_TIER_META[effectiveAccessLevel].description;

  return {
    ...zone,
    zoneCategory: category,
    shapeType: normalizedBounds.shapeType,
    boundsX: normalizedBounds.boundsX,
    boundsY: normalizedBounds.boundsY,
    boundsWidth: normalizedBounds.boundsWidth,
    boundsHeight: normalizedBounds.boundsHeight,
    polygonPoints: normalizedBounds.polygonPoints,
    accessLevel: ownTier,
    effectiveAccessLevel,
    isLocked,
    name: isLocked
      ? `Restricted Zone (${ACCESS_TIER_META[effectiveAccessLevel].shortLabel})`
      : zone.name,
    restrictedNotice: notice,
  };
}
