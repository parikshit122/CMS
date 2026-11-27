import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ACCESS_TIER_META,
  findShortestCampusRoute,
  formatWalkingEta,
  resolveViewerAccessTier,
} from "../utils/campusPathfinder";
import { buildWalkthroughState } from "../utils/qrNavigation";
import QrAnchorScannerModal from "../components/campus/QrAnchorScannerModal";
import WayfindingQrPosterModal from "../components/campus/WayfindingQrPosterModal";
import "../styles/CampusNavigation.css";

const NODE_ICON = {
  entrance: "bx bx-door-open",
  lab: "bx bx-desktop",
  room: "bx bx-buildings",
  corridor: "bx bx-radio-circle",
  stairs: "bx bx-trending-up",
  elevator: "bx bx-accessibility",
  ramp: "bx bx-accessibility",
  washroom: "bx bx-male-female",
  desk: "bx bx-support",
  qr_anchor: "bx bx-qr",
};

export default function CampusNavigator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFloorId, setActiveFloorId] = useState(null);
  const [startNodeId, setStartNodeId] = useState("");
  const [endNodeId, setEndNodeId] = useState("");
  const [accessibleOnly, setAccessibleOnly] = useState(false);

  const [showComplaints, setShowComplaints] = useState(true);
  const [showQrSpots, setShowQrSpots] = useState(true);
  const [showLostFound, setShowLostFound] = useState(true);
  const [showAlgoProof, setShowAlgoProof] = useState(true);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [zoom, setZoom] = useState(1);

  // QR Anchor Scanner, Wayfinding Poster, and Live Checkpoint Walkthrough state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [posterNode, setPosterNode] = useState(null);
  const [qrLockInfo, setQrLockInfo] = useState(null);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0);
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await API.get("/public/campus-navigation");
        if (!active) return;
        if (res.data?.success && res.data?.data) {
          const data = res.data.data;
          setBundle(data);

          const floors = data.floors || [];
          const nodes = data.nodes || [];

          const paramNode = Number(searchParams.get("node") || 0);
          const paramTo = Number(searchParams.get("to") || 0);
          const paramFrom = Number(searchParams.get("from") || 0);
          const paramQr = String(searchParams.get("qr") || "").trim().toUpperCase();

          const outdoorFloor = floors.find((f) => f.isOutdoor && !f.isLocked) || floors.find((f) => !f.isLocked) || floors[0];
          const openNodes = nodes.filter((n) => !n.isLocked);
          const gateNode = openNodes.find((n) => n.code === "OUT-GATE") || openNodes[0] || nodes[0];
          const lab2Node = openNodes.find((n) => n.code === "B2-LAB2") || openNodes[openNodes.length - 1] || nodes[nodes.length - 1];

          let initialFloor = outdoorFloor?.id ?? null;
          let initialStart = gateNode?.id ? String(gateNode.id) : "";
          let initialEnd = lab2Node?.id ? String(lab2Node.id) : "";

          if (paramQr) {
            const qrNode = nodes.find(
              (n) =>
                !n.isLocked &&
                (String(n.qrSpotCode || "").toUpperCase() === paramQr ||
                  String(n.displayQrSpotCode || "").toUpperCase() === paramQr ||
                  String(n.code || "").toUpperCase() === paramQr)
            );
            if (qrNode) {
              initialStart = String(qrNode.id);
              initialFloor = qrNode.floorId;
              setSelectedNodeId(qrNode.id);
              setQrLockInfo({
                nodeLabel: qrNode.label,
                code: qrNode.displayQrSpotCode || qrNode.qrSpotCode || qrNode.code,
                source: "QR Deep-Link",
              });
            }
          } else if (paramFrom) {
            const fromNode = nodes.find((n) => Number(n.id) === paramFrom && !n.isLocked);
            if (fromNode) {
              initialStart = String(fromNode.id);
              initialFloor = fromNode.floorId;
              setSelectedNodeId(fromNode.id);
              setQrLockInfo({
                nodeLabel: fromNode.label,
                code: fromNode.displayQrSpotCode || fromNode.qrSpotCode || fromNode.code,
                source: "QR Wayfinding Link",
              });
            }
          }

          if (paramNode) {
            const target = nodes.find((n) => Number(n.id) === paramNode);
            if (target) {
              if (!target.isLocked) initialEnd = String(target.id);
              initialFloor = target.floorId;
              setSelectedNodeId(target.id);
            }
          } else if (paramTo) {
            const target = nodes.find((n) => Number(n.id) === paramTo);
            if (target) {
              if (!target.isLocked) initialEnd = String(target.id);
              initialFloor = target.floorId;
            }
          }

          if (initialStart && initialStart === initialEnd && !paramNode && !paramTo) {
            const altDest =
              openNodes.find(
                (n) =>
                  String(n.id) !== initialStart &&
                  (n.code === "OUT-GATE" || n.code === "B2-LAB2")
              ) ||
              openNodes.find(
                (n) => String(n.id) !== initialStart && n.nodeType !== "corridor"
              );
            if (altDest) initialEnd = String(altDest.id);
          }

          setActiveFloorId(initialFloor);
          setStartNodeId(initialStart);
          setEndNodeId(initialEnd);
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || "Could not load campus navigation map.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, user?.id, user?.role]);

  const floors = useMemo(() => bundle?.floors || [], [bundle]);
  const buildings = useMemo(() => bundle?.buildings || [], [bundle]);
  const nodes = useMemo(() => bundle?.nodes || [], [bundle]);
  const edges = useMemo(() => bundle?.edges || [], [bundle]);
  const departments = useMemo(() => bundle?.departments || [], [bundle]);
  const livePins = useMemo(
    () => bundle?.livePins || { complaints: [], qrSpots: [], lostFound: [] },
    [bundle]
  );

  const sensitiveZones = useMemo(() => bundle?.sensitiveZones || [], [bundle]);

  const viewerTier = useMemo(
    () => bundle?.viewerAccessTier || resolveViewerAccessTier(user),
    [bundle, user]
  );

  const lockedZoneCount = useMemo(
    () =>
      nodes.filter((n) => n.isLocked).length +
      floors.filter((f) => f.isLocked).length +
      sensitiveZones.filter((z) => z.isLocked).length,
    [nodes, floors, sensitiveZones]
  );

  const activeFloor = useMemo(
    () => floors.find((f) => Number(f.id) === Number(activeFloorId)) || floors[0] || null,
    [floors, activeFloorId]
  );

  // Compute live shortest path using weighted multi-floor Dijkstra with security policy blocking
  const routeResult = useMemo(() => {
    if (!startNodeId || !endNodeId || nodes.length === 0) return null;
    return findShortestCampusRoute(
      nodes,
      edges,
      floors,
      buildings,
      Number(startNodeId),
      Number(endNodeId),
      { accessibleOnly, viewerAccessTier: viewerTier }
    );
  }, [nodes, edges, floors, buildings, startNodeId, endNodeId, accessibleOnly, viewerTier]);

  // Also compute alternate (standard vs accessible) route so judges can see real meters delta
  const alternateRoute = useMemo(() => {
    if (!startNodeId || !endNodeId || nodes.length === 0) return null;
    return findShortestCampusRoute(
      nodes,
      edges,
      floors,
      buildings,
      Number(startNodeId),
      Number(endNodeId),
      { accessibleOnly: !accessibleOnly, viewerAccessTier: viewerTier }
    );
  }, [nodes, edges, floors, buildings, startNodeId, endNodeId, accessibleOnly, viewerTier]);

  const floorNodes = useMemo(
    () => nodes.filter((n) => Number(n.floorId) === Number(activeFloor?.id)),
    [nodes, activeFloor]
  );

  const floorSensitiveZones = useMemo(
    () => sensitiveZones.filter((z) => Number(z.floorId) === Number(activeFloor?.id)),
    [sensitiveZones, activeFloor]
  );

  const floorNodeIds = useMemo(
    () => new Set(floorNodes.map((n) => Number(n.id))),
    [floorNodes]
  );

  const floorEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          floorNodeIds.has(Number(e.fromNodeId)) &&
          floorNodeIds.has(Number(e.toNodeId))
      ),
    [edges, floorNodeIds]
  );

  const nodeById = useMemo(
    () => new Map(nodes.map((n) => [Number(n.id), n])),
    [nodes]
  );

  const complaintsByNode = useMemo(() => {
    const m = new Map();
    for (const c of livePins.complaints || []) {
      if (!c.mapNodeId) continue;
      if (!m.has(c.mapNodeId)) m.set(c.mapNodeId, []);
      m.get(c.mapNodeId).push(c);
    }
    return m;
  }, [livePins.complaints]);

  const lostFoundByNode = useMemo(() => {
    const m = new Map();
    for (const item of livePins.lostFound || []) {
      if (!item.mapNodeId) continue;
      if (!m.has(item.mapNodeId)) m.set(item.mapNodeId, []);
      m.get(item.mapNodeId).push(item);
    }
    return m;
  }, [livePins.lostFound]);

  const qrAnchors = useMemo(
    () => nodes.filter((n) => !n.isLocked && (Boolean(n.qrSpotCode) || n.nodeType === "entrance")),
    [nodes]
  );

  const groupedSelectableNodes = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    return floors
      .map((fl) => ({
        floor: fl,
        items: nodes.filter((n) => {
          if (Number(n.floorId) !== Number(fl.id) || n.nodeType === "corridor") {
            return false;
          }
          if (!q) return true;
          const isPinnedSelection =
            String(n.id) === String(startNodeId) || String(n.id) === String(endNodeId);
          if (isPinnedSelection) return true;
          return (
            String(n.label || "").toLowerCase().includes(q) ||
            String(n.code || "").toLowerCase().includes(q) ||
            String(n.nodeType || "").toLowerCase().includes(q) ||
            String(n.displayQrSpotCode || n.qrSpotCode || "").toLowerCase().includes(q) ||
            String(fl.floorLabel || "").toLowerCase().includes(q)
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [floors, nodes, locationQuery, startNodeId, endNodeId]);

  const selectedNode = selectedNodeId ? nodeById.get(Number(selectedNodeId)) : null;
  const selectedComplaints = selectedNode ? complaintsByNode.get(selectedNode.id) || [] : [];
  const selectedLostFound = selectedNode ? lostFoundByNode.get(selectedNode.id) || [] : [];

  const selectedBuildingIndoorFloors = useMemo(() => {
    if (!selectedNode?.buildingId || !activeFloor?.isOutdoor) return [];
    return floors
      .filter(
        (fl) => !fl.isOutdoor && Number(fl.buildingId) === Number(selectedNode.buildingId)
      )
      .sort((a, b) => Number(a.floorNumber || 0) - Number(b.floorNumber || 0));
  }, [selectedNode, activeFloor, floors]);

  const activeRouteSegments =
    routeResult?.found && activeFloor
      ? routeResult.segmentsByFloor[activeFloor.id] || []
      : [];

  const routeNodeSet = useMemo(
    () => new Set(routeResult?.nodeIds || []),
    [routeResult]
  );

  const floorById = useMemo(
    () => new Map(floors.map((f) => [Number(f.id), f])),
    [floors]
  );

  const walkthrough = useMemo(
    () => (walkthroughActive ? buildWalkthroughState(routeResult, walkthroughStepIndex) : null),
    [walkthroughActive, routeResult, walkthroughStepIndex]
  );

  // Reset walkthrough index when route endpoints or accessibility mode change
  useEffect(() => {
    setWalkthroughStepIndex(0);
  }, [startNodeId, endNodeId, accessibleOnly]);

  // Auto-sync map floor when live walkthrough advances onto a new floor
  useEffect(() => {
    if (walkthrough?.active && walkthrough.currentFloorId) {
      setActiveFloorId(walkthrough.currentFloorId);
    }
  }, [walkthrough?.active, walkthrough?.currentFloorId, walkthrough?.stepIndex]);

  const handleSwap = () => {
    setStartNodeId(endNodeId);
    setEndNodeId(startNodeId);
    setWalkthroughStepIndex(0);
  };

  const handleQrAnchorLock = (node, meta = null) => {
    if (!node || node.isLocked) return;
    const nextStartId = String(node.id);
    setStartNodeId(nextStartId);
    if (String(endNodeId) === nextStartId) {
      const altDest =
        nodes.find(
          (n) =>
            !n.isLocked &&
            String(n.id) !== nextStartId &&
            (n.code === "OUT-GATE" || n.code === "B2-LAB2")
        ) ||
        nodes.find(
          (n) => !n.isLocked && String(n.id) !== nextStartId && n.nodeType !== "corridor"
        );
      if (altDest) setEndNodeId(String(altDest.id));
    }
    setActiveFloorId(node.floorId);
    setSelectedNodeId(node.id);
    setWalkthroughStepIndex(0);
    setQrLockInfo({
      nodeLabel: node.label,
      code: node.displayQrSpotCode || node.qrSpotCode || node.code,
      source: meta?.source || "QR Indoor Anchor",
    });
  };

  const handleToggleWalkthrough = () => {
    if (!routeResult?.found) return;
    if (walkthroughActive) {
      setWalkthroughActive(false);
      setWalkthroughStepIndex(0);
    } else {
      setWalkthroughActive(true);
      setWalkthroughStepIndex(0);
      const startNode = nodeById.get(Number(startNodeId));
      if (startNode) setActiveFloorId(startNode.floorId);
    }
  };

  if (loading) {
    return (
      <div className="cn-page">
        <div className="cn-panel" style={{ textAlign: "center", padding: "56px 20px" }}>
          <p className="cn-sub" style={{ margin: "0 auto" }}>
            Loading campus maps, walkable corridor graph, and live pins...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cn-page">
        <div className="cn-panel" role="alert">
          <h2 className="cn-panel__title">Campus Map Unavailable</h2>
          <p className="cn-sub">{error}</p>
        </div>
      </div>
    );
  }

  const branding = bundle?.branding;

  return (
    <div className="cn-page">
      {/* ── Page Header ── */}
      <div className="cn-header">
        <div>
          <p className="av-kicker" style={{ marginBottom: "6px" }}>
            {branding?.blindEvaluationMode
              ? "Smart Campus Wayfinding · QR-Anchored Indoor Localization · Zero Beacon Cost"
              : `${branding?.institutionCode || "CAMPUS"} Spatial Navigation · Outdoor & Multi-Floor Routing`}
          </p>
          <h1 className="cn-title">Interactive Campus &amp; Indoor Navigator</h1>
          <p className="cn-sub">
            Navigate seamlessly from the outdoor campus map into multi-floor building blueprints using weighted Dijkstra shortest-path routing, Divyangjan stair-free accessibility, and live Complaint &amp; Lost &amp; Found overlays.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          <span
            className={`cn-tier-badge cn-tier-badge--${viewerTier}`}
            title={`Your active campus map clearance: ${ACCESS_TIER_META[viewerTier]?.label}`}
          >
            <i
              className={`bx ${viewerTier === "public" ? "bx-user" : "bx-shield-quarter"}`}
              aria-hidden="true"
            />
            Clearance: {ACCESS_TIER_META[viewerTier]?.label}
          </span>
          <button
            type="button"
            className="av-btn av-btn--primary av-btn--compact"
            onClick={() => setScannerOpen(true)}
          >
            <i className="bx bx-qr-scan" aria-hidden="true" />
            Scan QR Anchor
          </button>
          <button
            type="button"
            className="av-btn av-btn--secondary av-btn--compact"
            onClick={() => {
              const target =
                (selectedNode && !selectedNode.isLocked ? selectedNode : null) ||
                nodeById.get(Number(startNodeId)) ||
                qrAnchors[0] ||
                nodes.find((n) => !n.isLocked);
              if (target) setPosterNode(target);
            }}
          >
            <i className="bx bx-qr" aria-hidden="true" />
            Show Scannable QR
          </button>
          {user?.role === "admin" && (
            <Link to="/admin/campus-studio" className="av-btn av-btn--ghost av-btn--compact">
              <i className="bx bx-edit-alt" aria-hidden="true" />
              Blueprint Studio
            </Link>
          )}
          <Link to="/lost-found" className="av-btn av-btn--ghost av-btn--compact">
            <i className="bx bx-search-alt-2" aria-hidden="true" />
            Lost &amp; Found ({livePins.lostFound?.length || 0})
          </Link>
        </div>
      </div>

      {/* ── Active QR Anchor Lock Confirmation Banner ── */}
      {qrLockInfo && (
        <div className="cn-qr-banner" role="status" aria-live="polite">
          <div className="cn-qr-banner__left">
            <i className="bx bx-check-shield" aria-hidden="true" />
            <div>
              <strong>Indoor Position Locked via {qrLockInfo.source}:</strong>{" "}
              <span>{qrLockInfo.nodeLabel}</span>{" "}
              <span className="av-mono cn-qr-banner__code">[{qrLockInfo.code}]</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="av-btn av-btn--ghost av-btn--compact"
              onClick={() => setScannerOpen(true)}
            >
              Re-Scan QR
            </button>
            <button
              type="button"
              className="cn-qr-banner__dismiss"
              onClick={() => setQrLockInfo(null)}
              aria-label="Dismiss QR lock banner"
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main Split Workspace ── */}
      <div className="cn-workspace">
        {/* Left Control & Directions Rail */}
        <div>
          <div className="cn-panel">
            <div className="cn-panel__title">
              <span>Multi-Floor Route Planner</span>
              <button
                type="button"
                className="av-btn av-btn--ghost av-btn--compact"
                onClick={handleSwap}
                title="Swap start and destination"
                aria-label="Swap start and destination"
              >
                <i className="bx bx-transfer" aria-hidden="true" />
                Swap
              </button>
            </div>

            <div className="cn-field">
              <label htmlFor="cn-location-search">Filter Campus Rooms, Labs &amp; Landmarks</label>
              <input
                id="cn-location-search"
                type="search"
                className="cn-input"
                placeholder="Search lab, lift, library, gate, or QR code..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>

            <div className="cn-field">
              <label htmlFor="cn-start-select">Start Location (or QR Indoor Anchor)</label>
              <select
                id="cn-start-select"
                className="cn-select"
                value={startNodeId}
                onChange={(e) => {
                  const n = nodeById.get(Number(e.target.value));
                  if (n?.isLocked) return;
                  setStartNodeId(e.target.value);
                  if (n) setActiveFloorId(n.floorId);
                }}
              >
                {groupedSelectableNodes.map(({ floor, items }) => (
                  <optgroup
                    key={floor.id}
                    label={`${floor.floorLabel}${floor.isLocked ? " [Restricted Floor]" : ""}`}
                  >
                    {items.map((n) => (
                      <option key={n.id} value={n.id} disabled={Boolean(n.isLocked)}>
                        {n.isLocked
                          ? `[Locked · ${ACCESS_TIER_META[n.effectiveAccessLevel || "staff"]?.shortLabel}] ${n.code}`
                          : `${n.label}${n.displayQrSpotCode ? ` [QR: ${n.displayQrSpotCode}]` : ""}`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="cn-field">
              <label htmlFor="cn-end-select">Destination (Room, Lab, Desk, Department)</label>
              <select
                id="cn-end-select"
                className="cn-select"
                value={endNodeId}
                onChange={(e) => {
                  const n = nodeById.get(Number(e.target.value));
                  if (n?.isLocked) return;
                  setEndNodeId(e.target.value);
                }}
              >
                {groupedSelectableNodes.map(({ floor, items }) => (
                  <optgroup
                    key={floor.id}
                    label={`${floor.floorLabel}${floor.isLocked ? " [Restricted Floor]" : ""}`}
                  >
                    {items.map((n) => (
                      <option key={n.id} value={n.id} disabled={Boolean(n.isLocked)}>
                        {n.isLocked
                          ? `[Locked · ${ACCESS_TIER_META[n.effectiveAccessLevel || "staff"]?.shortLabel}] ${n.code}`
                          : n.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Quick QR Anchor Simulation & Live Scanner Trigger */}
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "var(--av-ink-muted)" }}>
                  QR Indoor Position Lock:
                </span>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--av-primary, #ea580c)",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <i className="bx bx-camera" aria-hidden="true" />
                  Camera / Code
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {qrAnchors.slice(0, 4).map((anchor) => {
                  const shortName = String(anchor.label || anchor.code)
                    .split("—")[0]
                    .replace(/\([^)]*\)/g, "")
                    .trim()
                    .slice(0, 20);
                  return (
                    <button
                      key={anchor.id}
                      type="button"
                      className={`av-btn av-btn--compact ${
                        Number(startNodeId) === Number(anchor.id)
                          ? "av-btn--primary"
                          : "av-btn--ghost"
                      }`}
                      onClick={() => handleQrAnchorLock(anchor, { source: "Quick QR Anchor" })}
                      title={`Lock 'You Are Here' at ${anchor.label}`}
                    >
                      <i className="bx bx-qr-scan" aria-hidden="true" />
                      {shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divyangjan Accessible Route Toggle */}
            <div className={`cn-switch-row ${accessibleOnly ? "is-on" : ""}`}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.86rem" }}>
                  Divyangjan Accessible Mode
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--av-ink-muted)" }}>
                  Avoids stairs — routes strictly via ramps &amp; elevators
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={accessibleOnly}
                aria-label="Toggle Divyangjan wheelchair-accessible routing"
                className={`cn-switch-btn ${accessibleOnly ? "is-on" : ""}`}
                onClick={() => setAccessibleOnly((v) => !v)}
              />
            </div>

            {/* Live Route Output */}
            {routeResult?.found ? (
              <>
                {routeResult.detouredAroundRestricted && (
                  <div className="cn-detour-banner" role="status">
                    <i className="bx bx-shield-alt-2" aria-hidden="true" />
                    <span>
                      Detour applied: route automatically avoids restricted security zones outside your clearance tier.
                    </span>
                  </div>
                )}

                <div className="cn-route-metrics">
                  <div>
                    <div className="cn-route-metric__val">
                      {walkthrough?.active ? `${walkthrough.remainingMeters}m` : `${routeResult.totalMeters}m`}
                    </div>
                    <div className="cn-route-metric__lbl">
                      {walkthrough?.active ? "Remaining" : "Distance"}
                    </div>
                  </div>
                  <div>
                    <div className="cn-route-metric__val">
                      {formatWalkingEta(
                        walkthrough?.active ? walkthrough.remainingSeconds : routeResult.estimatedSeconds
                      )}
                    </div>
                    <div className="cn-route-metric__lbl">Walk Time</div>
                  </div>
                  <div>
                    <div className="cn-route-metric__val">
                      {routeResult.solverMetrics.floorTransitions}
                    </div>
                    <div className="cn-route-metric__lbl">Floor Shifts</div>
                  </div>
                </div>

                {/* Live Step-by-Step Checkpoint Walkthrough Control */}
                <div className={`cn-walkthrough-card ${walkthrough?.active ? "is-active" : ""}`}>
                  <div className="cn-walkthrough-card__top">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.84rem" }}>
                        {walkthrough?.active
                          ? walkthrough.isArrived
                            ? "Arrived at Destination!"
                            : `Checkpoint ${walkthrough.stepIndex + 1} of ${walkthrough.totalSteps}`
                          : "Step-by-Step Checkpoint Mode"}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--av-ink-muted)" }}>
                        {walkthrough?.active
                          ? walkthrough.isArrived
                            ? "You have reached your selected campus room."
                            : walkthrough.currentStep?.instruction
                          : "Simulate or scan wall QR checkpoints as you walk indoors"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`av-btn av-btn--compact ${
                        walkthrough?.active ? "av-btn--ghost" : "av-btn--primary"
                      }`}
                      onClick={handleToggleWalkthrough}
                    >
                      <i
                        className={`bx ${walkthrough?.active ? "bx-stop-circle" : "bx-walk"}`}
                        aria-hidden="true"
                      />
                      {walkthrough?.active ? "Exit" : "Start Walkthrough"}
                    </button>
                  </div>

                  {walkthrough?.active && (
                    <>
                      <div className="cn-walkthrough-progress" aria-label="Route walkthrough progress">
                        <div
                          className="cn-walkthrough-progress__bar"
                          style={{ width: `${walkthrough.progressPercent}%` }}
                        />
                      </div>
                      <div className="cn-walkthrough-controls">
                        <button
                          type="button"
                          className="av-btn av-btn--ghost av-btn--compact"
                          disabled={walkthrough.stepIndex <= 0}
                          onClick={() => setWalkthroughStepIndex((i) => Math.max(0, i - 1))}
                        >
                          ← Prev
                        </button>
                        <button
                          type="button"
                          className="av-btn av-btn--secondary av-btn--compact"
                          onClick={() => setScannerOpen(true)}
                        >
                          <i className="bx bx-qr-scan" aria-hidden="true" />
                          Scan Checkpoint QR
                        </button>
                        {walkthrough.isArrived ? (
                          <button
                            type="button"
                            className="av-btn av-btn--primary av-btn--compact"
                            onClick={() => setWalkthroughStepIndex(0)}
                          >
                            Restart
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="av-btn av-btn--primary av-btn--compact"
                            onClick={() =>
                              setWalkthroughStepIndex((i) => Math.min(walkthrough.totalSteps, i + 1))
                            }
                          >
                            Next Step →
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {alternateRoute?.found && alternateRoute.totalMeters !== routeResult.totalMeters && (
                  <p style={{ fontSize: "0.78rem", color: "var(--av-ink-muted)", margin: "0 0 10px" }}>
                    {accessibleOnly
                      ? `Stair-free route active (+${Math.max(0, routeResult.totalMeters - alternateRoute.totalMeters)}m vs stairs, 100% ramp & lift accessible).`
                      : `Standard shortest path (${alternateRoute.totalMeters}m via accessible elevator route).`}
                  </p>
                )}

                <ol className="cn-steps">
                  {routeResult.steps.map((step, idx) => {
                    const isCurrentStep =
                      walkthrough?.active && !walkthrough.isArrived && walkthrough.stepIndex === idx;
                    const isDoneStep = walkthrough?.active && idx < walkthrough.stepIndex;
                    return (
                      <li
                        key={`${step.stepNumber}-${step.toNodeId}`}
                        className={`cn-step ${step.isFloorChange ? "cn-step--floor" : ""} ${
                          isCurrentStep ? "is-current" : ""
                        } ${isDoneStep ? "is-done" : ""}`}
                        onClick={() => {
                          setActiveFloorId(step.floorId);
                          if (walkthroughActive) setWalkthroughStepIndex(idx);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <span className="cn-step__num">
                          {isDoneStep ? "✓" : step.stepNumber}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div>{step.instruction}</div>
                          <div
                            style={{
                              fontSize: "0.73rem",
                              color: "var(--av-ink-muted)",
                              marginTop: "3px",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <span>
                              {step.floorLabel} · {step.distanceMeters}m
                            </span>
                            {Number(activeFloor?.id) !== Number(step.floorId) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFloorId(step.floorId);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--av-primary, #ea580c)",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  padding: 0,
                                  fontSize: "0.73rem",
                                }}
                              >
                                View Floor →
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              routeResult && (
                <div
                  role="alert"
                  style={{
                    padding: "12px",
                    borderRadius: "9px",
                    background: "rgba(220, 38, 38, 0.12)",
                    border: "1px solid rgba(220, 38, 38, 0.3)",
                    fontSize: "0.83rem",
                  }}
                >
                  {routeResult.reason}
                </div>
              )
            )}

            {/* Real-Time Dijkstra Solver Proof (Avishkar Technical Defense) */}
            {routeResult && (
              <div className="cn-algo-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "0.79rem" }}>
                    Live Pathfinding Execution Proof
                  </strong>
                  <button
                    type="button"
                    onClick={() => setShowAlgoProof((v) => !v)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--av-ink-muted)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    {showAlgoProof ? "Hide" : "Show"}
                  </button>
                </div>
                {showAlgoProof && (
                  <div className="cn-algo-grid">
                    <div>Algo: Dijkstra</div>
                    <div>Bound: {routeResult.solverMetrics.complexity}</div>
                    <div>Graph: V={routeResult.solverMetrics.verticesCount}, E={routeResult.solverMetrics.edgesCount}</div>
                    <div>Visited: {routeResult.solverMetrics.visitedCount} nodes</div>
                    <div>Latency: {routeResult.solverMetrics.executionMs} ms</div>
                    <div>
                      Filter: {routeResult.solverMetrics.accessibleConstraintApplied ? "Ramp/Lift" : "All"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Interactive Map Canvas */}
        <div className="cn-map-shell">
          <div className="cn-map-toolbar">
            {/* Floor Switcher Tabs */}
            <div className="cn-seg" role="tablist" aria-label="Campus floors and outdoor site map">
              {floors.map((fl) => {
                const hasRouteOnFloor =
                  routeResult?.found &&
                  (routeResult.segmentsByFloor[fl.id]?.length > 0 ||
                    routeResult.nodes.some((n) => Number(n.floorId) === Number(fl.id)));
                return (
                  <button
                    key={fl.id}
                    type="button"
                    role="tab"
                    aria-selected={Number(activeFloor?.id) === Number(fl.id)}
                    className={`cn-seg__btn ${
                      Number(activeFloor?.id) === Number(fl.id) ? "is-active" : ""
                    }`}
                    onClick={() => {
                      setActiveFloorId(fl.id);
                      setZoom(1);
                    }}
                  >
                    <i
                      className={`bx ${
                        fl.isLocked
                          ? "bx-lock-alt"
                          : fl.isOutdoor
                            ? "bx-map-alt"
                            : "bx-layer"
                      }`}
                      aria-hidden="true"
                    />
                    {fl.isOutdoor ? "Outdoor Campus" : fl.floorLabel.replace(/^Block B — /, "")}
                    {hasRouteOnFloor ? " *" : ""}
                  </button>
                );
              })}
            </div>

            {/* Live Overlay Filters + Zoom */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
              <div className="cn-seg" role="group" aria-label="Map data overlays">
                <button
                  type="button"
                  className={`cn-seg__btn ${showComplaints ? "is-active" : ""}`}
                  onClick={() => setShowComplaints((v) => !v)}
                >
                  Issues ({livePins.complaints?.length || 0})
                </button>
                <button
                  type="button"
                  className={`cn-seg__btn ${showQrSpots ? "is-active" : ""}`}
                  onClick={() => setShowQrSpots((v) => !v)}
                >
                  QR ({livePins.qrSpots?.length || 0})
                </button>
                <button
                  type="button"
                  className={`cn-seg__btn ${showLostFound ? "is-active" : ""}`}
                  onClick={() => setShowLostFound((v) => !v)}
                >
                  Lost &amp; Found ({livePins.lostFound?.length || 0})
                </button>
              </div>

              <div className="cn-zoom-controls">
                <button
                  type="button"
                  className="cn-zoom-btn"
                  onClick={() => setZoom((z) => Math.max(0.85, Math.round((z - 0.15) * 100) / 100))}
                  aria-label="Zoom out map"
                >
                  −
                </button>
                <button
                  type="button"
                  className="cn-zoom-btn"
                  onClick={() => setZoom(1)}
                  aria-label="Reset map zoom"
                  style={{ fontSize: "0.74rem", padding: "0 8px" }}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  className="cn-zoom-btn"
                  onClick={() => setZoom((z) => Math.min(1.9, Math.round((z + 0.15) * 100) / 100))}
                  aria-label="Zoom in map"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Blueprint Viewport */}
          <div className="cn-canvas-viewport">
            <div
              className="cn-canvas-stage"
              style={{
                transform: `scale(${zoom})`,
                width: "100%",
                height: "100%",
              }}
            >
              {activeFloor?.isLocked ? (
                <div className="cn-restricted-shield" role="region" aria-label="Restricted Floor">
                  <div className="cn-restricted-shield__icon">
                    <i className="bx bx-lock-alt" aria-hidden="true" />
                  </div>
                  <span
                    className={`cn-tier-badge cn-tier-badge--${activeFloor.effectiveAccessLevel || "staff"}`}
                  >
                    <i className="bx bx-shield-alt-2" aria-hidden="true" />
                    {ACCESS_TIER_META[activeFloor.effectiveAccessLevel || "staff"]?.label} Clearance Required
                  </span>
                  <h3>{activeFloor.floorLabel} — Entry Blocked</h3>
                  <p>
                    {activeFloor.restrictedNotice ||
                      "This floor blueprint is protected by campus security policy. Entry and navigation are restricted to authorized accounts."}
                  </p>
                  {!user && (
                    <Link to="/auth" className="av-btn av-btn--primary av-btn--compact">
                      <i className="bx bx-log-in" aria-hidden="true" />
                      Sign In with Authorized Account
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {activeFloor?.mapImageUrl ? (
                    <img
                      src={activeFloor.mapImageUrl}
                      alt={activeFloor.floorLabel}
                      className="cn-map-img"
                    />
                  ) : (
                    <div className="cn-default-grid">
                      <span className="cn-default-grid__tag">
                        Architectural Grid · {activeFloor?.widthMeters || 60}m × {activeFloor?.heightMeters || 42}m
                      </span>
                    </div>
                  )}

                  {/* SVG Walkable Corridor Graph + Animated Shortest-Path Polyline */}
                  <svg
                    className="cn-svg-overlay"
                    viewBox="0 0 1000 700"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <pattern
                        id="nav-zone-hatch"
                        width="12"
                        height="12"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                      >
                        <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(239, 68, 68, 0.34)" strokeWidth="4" />
                      </pattern>
                    </defs>

                    {/* Spatial Sensitive Zone Perimeters */}
                    {floorSensitiveZones.map((zone) => {
                      const isLockedZ = Boolean(zone.isLocked);
                      const tierColor =
                        zone.effectiveAccessLevel === "admin"
                          ? "#ef4444"
                          : zone.effectiveAccessLevel === "staff"
                            ? "#f59e0b"
                            : zone.effectiveAccessLevel === "student"
                              ? "#3b82f6"
                              : "#22c55e";
                      const zx = (Number(zone.boundsX) || 0) * 10;
                      const zy = (Number(zone.boundsY) || 0) * 7;
                      const zw = (Number(zone.boundsWidth) || 20) * 10;
                      const zh = (Number(zone.boundsHeight) || 20) * 7;
                      return (
                        <g key={`nav-zone-${zone.id}`} className="cn-sensitive-zone-overlay">
                          <rect
                            x={zx}
                            y={zy}
                            width={zw}
                            height={zh}
                            rx="10"
                            fill={isLockedZ ? "url(#nav-zone-hatch)" : `${tierColor}14`}
                            stroke={isLockedZ ? "#ef4444" : tierColor}
                            strokeWidth={isLockedZ ? 2.5 : 1.75}
                            strokeDasharray={isLockedZ ? "8 5" : "6 4"}
                          />
                          <text
                            x={zx + 10}
                            y={zy + 17}
                            fill={isLockedZ ? "#fca5a5" : tierColor}
                            fontSize="11.5"
                            fontWeight="700"
                            fontFamily="ui-monospace, SFMono-Regular, monospace"
                          >
                            {isLockedZ
                              ? `RESTRICTED · ${ACCESS_TIER_META[zone.effectiveAccessLevel]?.shortLabel}`
                              : `${zone.code} · ${ACCESS_TIER_META[zone.effectiveAccessLevel]?.shortLabel}`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Base walkable corridor edges */}
                    {floorEdges.map((edge) => {
                      const a = nodeById.get(Number(edge.fromNodeId));
                      const b = nodeById.get(Number(edge.toNodeId));
                      if (!a || !b) return null;
                      return (
                        <line
                          key={edge.id}
                          x1={a.x * 10}
                          y1={a.y * 7}
                          x2={b.x * 10}
                          y2={b.y * 7}
                          stroke={
                            edge.isLocked
                              ? "rgba(220, 38, 38, 0.72)"
                              : edge.isAccessible
                                ? "rgba(148,163,184,0.34)"
                                : "rgba(245,158,11,0.4)"
                          }
                          strokeWidth={edge.isLocked ? 3.5 : 3}
                          strokeDasharray={edge.isLocked ? "4 5" : "6 6"}
                        />
                      );
                    })}

                    {/* Computed Shortest-Path Highlight */}
                    {activeRouteSegments.map((seg, idx) => (
                      <g key={`route-${idx}`}>
                        <line
                          x1={seg.from.x * 10}
                          y1={seg.from.y * 7}
                          x2={seg.to.x * 10}
                          y2={seg.to.y * 7}
                          stroke={accessibleOnly ? "rgba(22, 163, 74, 0.35)" : "rgba(234, 88, 12, 0.35)"}
                          strokeWidth={14}
                          strokeLinecap="round"
                        />
                        <line
                          className="cn-route-line"
                          x1={seg.from.x * 10}
                          y1={seg.from.y * 7}
                          x2={seg.to.x * 10}
                          y2={seg.to.y * 7}
                          stroke={accessibleOnly ? "#22c55e" : "#fb923c"}
                          strokeWidth={6}
                          strokeDasharray="12 6"
                          strokeLinecap="round"
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Clickable Map Pins */}
                  {floorNodes.map((node) => {
                    const isLocked = Boolean(node.isLocked);
                    const isProtectedUnlocked =
                      !isLocked &&
                      node.effectiveAccessLevel &&
                      node.effectiveAccessLevel !== "public";
                    const isStart = !isLocked && Number(startNodeId) === Number(node.id);
                    const isEnd = !isLocked && Number(endNodeId) === Number(node.id);
                    const isSelected = Number(selectedNodeId) === Number(node.id);
                    const isLiveCheckpoint =
                      !isLocked &&
                      walkthrough?.active &&
                      Number(walkthrough.currentNodeId) === Number(node.id);
                    const onRoute = routeNodeSet.has(Number(node.id));
                    const nodeIssues =
                      !isLocked && showComplaints ? complaintsByNode.get(node.id) || [] : [];
                    const nodeLf =
                      !isLocked && showLostFound ? lostFoundByNode.get(node.id) || [] : [];
                    const hasQr = !isLocked && showQrSpots && Boolean(node.qrSpotCode);

                    let pinClass = "cn-pin";
                    if (isLocked) {
                      pinClass += " cn-pin--locked";
                    } else if (isLiveCheckpoint) {
                      pinClass += " cn-pin--live-you";
                    } else if (node.nodeType === "corridor" && !isStart && !isEnd) {
                      pinClass += " cn-pin--corridor";
                    } else if (isStart) {
                      pinClass += " cn-pin--start";
                    } else if (isEnd) {
                      pinClass += " cn-pin--end";
                    } else if (nodeIssues.length > 0) {
                      pinClass += " cn-pin--complaint";
                    } else if (nodeLf.length > 0) {
                      pinClass += " cn-pin--lostfound";
                    } else if (hasQr) {
                      pinClass += " cn-pin--qr";
                    } else if (node.nodeType === "stairs") {
                      pinClass += " cn-pin--stairs";
                    } else if (node.nodeType === "elevator" || node.nodeType === "ramp") {
                      pinClass += " cn-pin--elevator";
                    }

                    if (isProtectedUnlocked) pinClass += " cn-pin--protected-unlocked";
                    if (isSelected) pinClass += " is-selected";

                    const showTag =
                      isLocked ||
                      isLiveCheckpoint ||
                      isStart ||
                      isEnd ||
                      isSelected ||
                      nodeIssues.length > 0 ||
                      nodeLf.length > 0 ||
                      (onRoute && node.nodeType !== "corridor");

                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={pinClass}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        onClick={() => setSelectedNodeId(node.id)}
                        aria-label={
                          isLocked
                            ? `Locked Restricted Area ${node.code} — ${ACCESS_TIER_META[node.effectiveAccessLevel || "staff"]?.label} clearance required`
                            : `${node.label} (${node.nodeType})${isLiveCheckpoint ? " — You are here" : ""}`
                        }
                        title={
                          isLocked
                            ? `Restricted (${ACCESS_TIER_META[node.effectiveAccessLevel || "staff"]?.label} Only)`
                            : node.label
                        }
                      >
                        {isLocked ? (
                          <i className="bx bx-lock-alt" aria-hidden="true" />
                        ) : (
                          (node.nodeType !== "corridor" || isLiveCheckpoint) && (
                            <i
                              className={
                                isLiveCheckpoint
                                  ? "bx bx-walk"
                                  : isStart
                                    ? "bx bx-navigation"
                                    : isEnd
                                      ? "bx bx-flag"
                                      : nodeIssues.length > 0
                                        ? "bx bx-error-circle"
                                        : nodeLf.length > 0
                                          ? "bx bx-package"
                                          : NODE_ICON[node.nodeType] || "bx bx-map-pin"
                              }
                              aria-hidden="true"
                            />
                          )
                        )}
                        {showTag && (
                          <span
                            className={`cn-pin-label ${isLocked ? "cn-pin-label--locked" : ""}`}
                          >
                            {isLocked ? (
                              <>
                                LOCKED · {ACCESS_TIER_META[node.effectiveAccessLevel || "staff"]?.shortLabel}
                              </>
                            ) : (
                              <>
                                {isLiveCheckpoint
                                  ? "YOU ARE HERE · "
                                  : isStart
                                    ? "START · "
                                    : isEnd
                                      ? "DEST · "
                                      : ""}
                                {node.code}
                                {nodeIssues.length > 0 ? ` (${nodeIssues.length} issue)` : ""}
                                {nodeLf.length > 0 ? ` (${nodeLf.length} found)` : ""}
                              </>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Selected Spot Inspector (or Restricted Access Card) */}
          <div className={`cn-inspector ${selectedNode?.isLocked ? "cn-inspector--locked" : ""}`}>
            {selectedNode ? (
              selectedNode.isLocked ? (
                <>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <i className="bx bx-lock-alt" aria-hidden="true" style={{ color: "#f87171" }} />
                        Restricted Area — Entry Blocked
                      </strong>
                      <span
                        className={`cn-tier-badge cn-tier-badge--${selectedNode.effectiveAccessLevel || "staff"}`}
                      >
                        {ACCESS_TIER_META[selectedNode.effectiveAccessLevel || "staff"]?.label} Clearance Required
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--av-ink-muted)", marginTop: "4px" }}>
                      {selectedNode.restrictedNotice ||
                        "Access to this sensitive campus zone is protected by institutional security policy. Routing into or through this zone is blocked."}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button
                      type="button"
                      disabled
                      className="av-btn av-btn--secondary av-btn--compact"
                      style={{ opacity: 0.45, cursor: "not-allowed" }}
                    >
                      <i className="bx bx-block" aria-hidden="true" />
                      Set as Start
                    </button>
                    <button
                      type="button"
                      disabled
                      className="av-btn av-btn--primary av-btn--compact"
                      style={{ opacity: 0.45, cursor: "not-allowed" }}
                    >
                      <i className="bx bx-lock-alt" aria-hidden="true" />
                      Entry Blocked
                    </button>
                    {!user && (
                      <Link to="/auth" className="av-btn av-btn--primary av-btn--compact">
                        <i className="bx bx-log-in" aria-hidden="true" />
                        Sign In with Authorized Account
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {selectedNode.label}
                      </span>
                      {selectedNode.effectiveAccessLevel &&
                        selectedNode.effectiveAccessLevel !== "public" && (
                          <span
                            className={`cn-tier-badge cn-tier-badge--${selectedNode.effectiveAccessLevel}`}
                          >
                            <i className="bx bx-shield-alt-2" aria-hidden="true" />
                            {ACCESS_TIER_META[selectedNode.effectiveAccessLevel]?.shortLabel} (Authorized)
                          </span>
                        )}
                    </div>
                    <div style={{ fontSize: "0.79rem", color: "var(--av-ink-muted)", marginTop: "2px" }}>
                      {selectedNode.code} · {selectedNode.nodeType} ·{" "}
                      {selectedNode.isAccessible ? "Wheelchair Accessible" : "Stairs Only"}
                      {selectedNode.displayQrSpotCode
                        ? ` · QR Spot: ${selectedNode.displayQrSpotCode}`
                        : ""}
                    </div>
                    {selectedComplaints.length > 0 && (
                      <div style={{ fontSize: "0.8rem", color: "#f87171", marginTop: "4px" }}>
                        Active Issue: {selectedComplaints[0].complaintId} — {selectedComplaints[0].title}
                      </div>
                    )}
                    {selectedLostFound.length > 0 && (
                      <div style={{ fontSize: "0.8rem", color: "#fbbf24", marginTop: "4px" }}>
                        Lost &amp; Found: {selectedLostFound[0].itemCode} — {selectedLostFound[0].title}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {selectedBuildingIndoorFloors.length > 0 && (
                      <button
                        type="button"
                        className="av-btn av-btn--primary av-btn--compact"
                        onClick={() => {
                          setActiveFloorId(selectedBuildingIndoorFloors[0].id);
                          setZoom(1);
                        }}
                      >
                        <i className="bx bx-layer" aria-hidden="true" />
                        Open Indoor Floor Plan ({selectedBuildingIndoorFloors.length}) →
                      </button>
                    )}
                    <button
                      type="button"
                      className="av-btn av-btn--secondary av-btn--compact"
                      onClick={() => handleQrAnchorLock(selectedNode, { source: "Map Pin Lock" })}
                    >
                      Set as Start
                    </button>
                    <button
                      type="button"
                      className="av-btn av-btn--primary av-btn--compact"
                      onClick={() => setEndNodeId(String(selectedNode.id))}
                    >
                      Navigate Here
                    </button>
                    <button
                      type="button"
                      className="av-btn av-btn--ghost av-btn--compact"
                      onClick={() => setPosterNode(selectedNode)}
                    >
                      <i className="bx bx-qr" aria-hidden="true" />
                      Show QR Poster
                    </button>
                    {selectedNode.qrSpotCode && (
                      <Link
                        to={`/report?spot=${encodeURIComponent(selectedNode.qrSpotCode)}`}
                        className="av-btn av-btn--ghost av-btn--compact"
                      >
                        Report via QR
                      </Link>
                    )}
                    {selectedLostFound.length > 0 && (
                      <button
                        type="button"
                        className="av-btn av-btn--ghost av-btn--compact"
                        onClick={() => navigate("/lost-found")}
                      >
                        Claim Found Item
                      </button>
                    )}
                  </div>
                </>
              )
            ) : (
              <div style={{ fontSize: "0.83rem", color: "var(--av-ink-muted)" }}>
                Click any room, lab, staircase, elevator, or locked zone pin on the floor plan to inspect details or verify access requirements.
              </div>
            )}
          </div>

          {/* Clean Color Legend */}
          <div className="cn-legend">
            <span className="cn-legend__item">
              <span className="cn-swatch" style={{ background: "#16a34a" }} /> Start / Accessible Lift
            </span>
            <span className="cn-legend__item">
              <span className="cn-swatch" style={{ background: "#ea580c" }} /> Destination / Route
            </span>
            <span className="cn-legend__item">
              <span className="cn-swatch" style={{ background: "#991b1b" }} /> Locked Restricted Zone ({lockedZoneCount})
            </span>
            <span className="cn-legend__item">
              <span className="cn-swatch" style={{ background: "#dc2626" }} /> Active Complaint
            </span>
            <span className="cn-legend__item">
              <span className="cn-swatch" style={{ background: "#ca8a04" }} /> Lost &amp; Found Item
            </span>
            <span className="cn-legend__item">
              <span className="cn-swatch" style={{ background: "#2563eb" }} /> QR Indoor Anchor
            </span>
          </div>
        </div>
      </div>

      {/* ── Configured University Academic & Course Directory ── */}
      <section style={{ marginTop: "32px" }}>
        <div className="cn-header" style={{ marginBottom: "8px" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 4px" }}>
              Campus Academic Structure &amp; Degree Programs
            </h2>
            <p className="cn-sub">
              Institution-configurable departments, degree programs, and building locations. Any college can customize this tree in Campus Studio.
            </p>
          </div>
        </div>

        <div className="cn-dept-grid">
          {departments.map((dept) => {
            const deptNode = nodes.find(
              (n) =>
                Number(n.buildingId) === Number(dept.buildingId) &&
                n.nodeType !== "corridor" &&
                !n.isLocked
            );
            return (
              <article key={dept.id} className="cn-dept-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div>
                    <div className="av-mono" style={{ fontSize: "0.74rem", color: "var(--av-primary)", fontWeight: 700 }}>
                      {dept.code}
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "2px 0" }}>
                      {dept.name}
                    </h3>
                    <div style={{ fontSize: "0.78rem", color: "var(--av-ink-muted)" }}>
                      {dept.hodName || "Department Office"}
                    </div>
                  </div>
                  {deptNode && (
                    <button
                      type="button"
                      className="av-btn av-btn--ghost av-btn--compact"
                      onClick={() => {
                        setEndNodeId(String(deptNode.id));
                        setActiveFloorId(deptNode.floorId);
                        setSelectedNodeId(deptNode.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Navigate →
                    </button>
                  )}
                </div>

                <div>
                  {(dept.courses || []).map((course) => (
                    <div key={course.id} className="cn-course-row">
                      <div>
                        <div style={{ fontWeight: 600 }}>{course.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--av-ink-muted)" }}>
                          {course.code} · {course.degreeLevel} · {course.durationYears} yrs · Div{" "}
                          {Array.isArray(course.divisions) ? course.divisions.join("/") : "A"}
                        </div>
                      </div>
                      <span className="av-mono" style={{ fontSize: "0.75rem", color: "var(--av-ink-muted)" }}>
                        {course.intakeCapacity} seats
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {/* ── In-App QR Anchor Scanner Modal ── */}
      <QrAnchorScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        nodes={nodes}
        qrAnchors={qrAnchors}
        onAnchorResolved={handleQrAnchorLock}
      />

      {/* ── Scannable Wayfinding QR Poster Modal ── */}
      <WayfindingQrPosterModal
        isOpen={Boolean(posterNode)}
        onClose={() => setPosterNode(null)}
        node={posterNode}
        floorLabel={
          posterNode ? floorById.get(Number(posterNode.floorId))?.floorLabel || "" : ""
        }
        institutionName={
          branding?.blindEvaluationMode
            ? "Smart Campus Navigator"
            : branding?.institutionName || "Smart Campus Navigator"
        }
        onSimulateScan={(node) => handleQrAnchorLock(node, { source: "QR Poster Lock" })}
      />
    </div>
  );
}
