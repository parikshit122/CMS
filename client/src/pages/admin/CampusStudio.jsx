import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import { useToast } from "../../components/common/Alert";
import { broadcastBrandingUpdate } from "../../hooks/useInstitutionBranding";
import BlueprintManagerPanel from "../../components/campus/BlueprintManagerPanel";
import ProtectedZonesTable from "../../components/campus/ProtectedZonesTable";
import {
  ACCESS_TIER_META,
  CAMPUS_ACCESS_TIERS,
  applyCampusAccessPreview,
} from "../../utils/campusPathfinder";
import "../../styles/CampusNavigation.css";

const NODE_TYPES = [
  { value: "room", label: "Classroom / Office" },
  { value: "lab", label: "Laboratory" },
  { value: "corridor", label: "Corridor Waypoint" },
  { value: "entrance", label: "Building / Gate Entrance" },
  { value: "stairs", label: "Staircase (Non-Accessible)" },
  { value: "elevator", label: "Wheelchair Elevator" },
  { value: "ramp", label: "Accessible Ramp" },
  { value: "desk", label: "Help / Custody Desk" },
  { value: "washroom", label: "Washroom" },
  { value: "qr_anchor", label: "QR Indoor Anchor" },
];

const EDGE_TYPES = [
  { value: "corridor", label: "Indoor Corridor (Accessible)" },
  { value: "walkway", label: "Outdoor Walkway (Accessible)" },
  { value: "ramp", label: "Wheelchair Ramp (Accessible)" },
  { value: "elevator", label: "Elevator Shaft (Accessible)" },
  { value: "stairs", label: "Stairwell (Stairs Only)" },
];

export default function CampusStudio() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("maps"); // "maps" | "academics" | "branding"
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Branding & Avishkar Blind-Evaluation Mode state
  const [brandForm, setBrandForm] = useState({
    blindEvaluationMode: true,
    siteName: "ComplaintSync",
    siteTagline: "Smart Campus Institution",
    institutionCode: "CAMPUS",
    allowedDomain: "campus.edu",
  });
  const [savingBrand, setSavingBrand] = useState(false);

  // Map Editor & Policy State
  const [activeFloorId, setActiveFloorId] = useState(null);
  const [tool, setTool] = useState("select"); // "select" | "add-node" | "connect-edge"
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [edgeStartId, setEdgeStartId] = useState(null);
  const [edgeType, setEdgeType] = useState("corridor");
  const [edgeAccessLevel, setEdgeAccessLevel] = useState("public");
  const [previewTier, setPreviewTier] = useState("admin"); // admin | staff | student | public
  const [blueprintPreviewUrl, setBlueprintPreviewUrl] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [busyPolicyKey, setBusyPolicyKey] = useState("");

  // Pending new node settings
  const [newNodeForm, setNewNodeForm] = useState({
    label: "",
    code: "",
    nodeType: "room",
    qrSpotCode: "",
    accessLevel: "public",
    restrictedNotice: "",
  });

  // Active selected node policy edit form
  const [nodePolicyForm, setNodePolicyForm] = useState({
    label: "",
    accessLevel: "public",
    isSensitive: false,
    restrictedNotice: "",
  });

  // Cross-floor vertical connector form
  const [crossFromId, setCrossFromId] = useState("");
  const [crossToId, setCrossToId] = useState("");
  const [crossEdgeType, setCrossEdgeType] = useState("elevator");

  // New Building form
  const [buildingForm, setBuildingForm] = useState({
    code: "",
    name: "",
    shortLabel: "",
    category: "academic",
  });

  // Academic Department & Course forms
  const [deptForm, setDeptForm] = useState({
    code: "",
    name: "",
    buildingId: "",
    hodName: "",
    hodEmail: "",
  });
  const [courseForm, setCourseForm] = useState({
    departmentId: "",
    code: "",
    name: "",
    degreeLevel: "UG",
    durationYears: "4",
    divisions: "A, B",
    intakeCapacity: "60",
  });

  const loadData = useCallback(async (preferredFloorId = null) => {
    try {
      setLoading(true);
      const [navRes, settingsRes] = await Promise.all([
        API.get("/campus/studio-bundle").catch(() => API.get("/public/campus-navigation")),
        API.get("/settings").catch(() => null),
      ]);
      if (navRes.data?.success && navRes.data?.data) {
        const data = navRes.data.data;
        setBundle(data);
        setActiveFloorId((prev) => preferredFloorId || prev || data.floors?.[0]?.id || null);
        if (data.departments?.length > 0) {
          setCourseForm((prev) => ({
            ...prev,
            departmentId: prev.departmentId || String(data.departments[0].id),
          }));
        }
        if (data.buildings?.length > 0) {
          setDeptForm((prev) => ({
            ...prev,
            buildingId: prev.buildingId || String(data.buildings[0].id),
          }));
        }
      }
      const rawSettings = settingsRes?.data?.settings || settingsRes?.data?.data;
      if (rawSettings) {
        setBrandForm({
          blindEvaluationMode: rawSettings.blindEvaluationMode !== false,
          siteName: rawSettings.siteName || "ComplaintSync",
          siteTagline: rawSettings.siteTagline || "Smart Campus Institution",
          institutionCode: rawSettings.institutionCode || "CAMPUS",
          allowedDomain: rawSettings.allowedDomain || "campus.edu",
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load Campus Studio.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rawFloors = useMemo(() => bundle?.floors || [], [bundle]);
  const buildings = useMemo(() => bundle?.buildings || [], [bundle]);
  const rawNodes = useMemo(() => bundle?.nodes || [], [bundle]);
  const rawEdges = useMemo(() => bundle?.edges || [], [bundle]);
  const departments = useMemo(() => bundle?.departments || [], [bundle]);

  // Apply selected preview tier so admin can visually verify locked zones in real time
  const previewBundle = useMemo(
    () => (bundle ? applyCampusAccessPreview(bundle, previewTier) : null),
    [bundle, previewTier]
  );

  const floors = useMemo(() => previewBundle?.floors || rawFloors, [previewBundle, rawFloors]);
  const nodes = useMemo(() => previewBundle?.nodes || rawNodes, [previewBundle, rawNodes]);
  const edges = useMemo(() => previewBundle?.edges || rawEdges, [previewBundle, rawEdges]);

  const protectedZonesCount = useMemo(() => {
    const pf = rawFloors.filter((f) => (f.accessLevel && f.accessLevel !== "public") || f.isSensitive).length;
    const pn = rawNodes.filter((n) => (n.accessLevel && n.accessLevel !== "public") || n.isSensitive).length;
    const pe = rawEdges.filter((e) => (e.accessLevel && e.accessLevel !== "public") || e.isSensitive).length;
    return pf + pn + pe;
  }, [rawFloors, rawNodes, rawEdges]);

  const activeFloor = useMemo(
    () => floors.find((f) => Number(f.id) === Number(activeFloorId)) || floors[0] || null,
    [floors, activeFloorId]
  );

  const rawActiveFloor = useMemo(
    () => rawFloors.find((f) => Number(f.id) === Number(activeFloor?.id)) || null,
    [rawFloors, activeFloor]
  );

  const floorNodes = useMemo(
    () => nodes.filter((n) => Number(n.floorId) === Number(activeFloor?.id)),
    [nodes, activeFloor]
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

  const rawNodeById = useMemo(
    () => new Map(rawNodes.map((n) => [Number(n.id), n])),
    [rawNodes]
  );

  const selectedNode = selectedNodeId ? rawNodeById.get(Number(selectedNodeId)) : null;
  const selectedEdge = selectedEdgeId
    ? rawEdges.find((e) => Number(e.id) === Number(selectedEdgeId)) || null
    : null;

  useEffect(() => {
    if (!selectedNode) return;
    setNodePolicyForm({
      label: selectedNode.label || "",
      accessLevel: selectedNode.accessLevel || "public",
      isSensitive: Boolean(
        selectedNode.isSensitive || (selectedNode.accessLevel && selectedNode.accessLevel !== "public")
      ),
      restrictedNotice: selectedNode.restrictedNotice || "",
    });
  }, [selectedNode]);

  // ── Handlers ────────────────────────────────────────────

  const handleSaveBranding = async (overrideBlind = null) => {
    try {
      setSavingBrand(true);
      const payload =
        typeof overrideBlind === "boolean"
          ? { ...brandForm, blindEvaluationMode: overrideBlind }
          : brandForm;
      const res = await API.patch("/campus/branding", payload);
      if (res.data?.success && res.data?.data) {
        setBrandForm((prev) => ({
          ...prev,
          blindEvaluationMode: res.data.data.blindEvaluationMode,
        }));
        broadcastBrandingUpdate(res.data.data);
        toast.success(res.data.message);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update institution settings.");
    } finally {
      setSavingBrand(false);
    }
  };

  const handleCanvasClick = async (e) => {
    if (tool !== "add-node" || !activeFloor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    const label = newNodeForm.label.trim();
    if (!label) {
      toast.error("Enter a node label first (e.g., Room 208 or Corridor C), then click on the map.");
      return;
    }

    try {
      const res = await API.post("/campus/nodes", {
        floorId: activeFloor.id,
        buildingId: activeFloor.buildingId,
        label,
        code: newNodeForm.code.trim() || undefined,
        nodeType: newNodeForm.nodeType,
        x,
        y,
        isAccessible: newNodeForm.nodeType !== "stairs",
        qrSpotCode: newNodeForm.qrSpotCode.trim() || null,
        accessLevel: newNodeForm.accessLevel,
        isSensitive: newNodeForm.accessLevel !== "public",
        restrictedNotice: newNodeForm.restrictedNotice.trim(),
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setNewNodeForm((prev) => ({
          ...prev,
          label: "",
          code: "",
          qrSpotCode: "",
          restrictedNotice: "",
        }));
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to place node.");
    }
  };

  const handleNodeClick = async (e, node) => {
    e.stopPropagation();
    if (tool === "connect-edge") {
      if (!edgeStartId) {
        setEdgeStartId(node.id);
        toast.info(`Walkway start: ${node.label}. Click a second pin to connect.`);
        return;
      }
      if (Number(edgeStartId) === Number(node.id)) {
        setEdgeStartId(null);
        return;
      }
      try {
        const res = await API.post("/campus/edges", {
          fromNodeId: edgeStartId,
          toNodeId: node.id,
          edgeType,
          isAccessible: edgeType !== "stairs",
          accessLevel: edgeAccessLevel,
          isSensitive: edgeAccessLevel !== "public",
        });
        if (res.data?.success) {
          toast.success(res.data.message);
          setEdgeStartId(null);
          await loadData();
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Could not connect nodes.");
      }
      return;
    }

    setSelectedEdgeId(null);
    setSelectedNodeId(node.id);
  };

  const handleSaveNodePolicy = async (e) => {
    e.preventDefault();
    if (!selectedNode) return;
    try {
      setSavingPolicy(true);
      const res = await API.patch(`/campus/nodes/${selectedNode.id}`, {
        label: nodePolicyForm.label.trim() || selectedNode.label,
        accessLevel: nodePolicyForm.accessLevel,
        isSensitive: nodePolicyForm.isSensitive || nodePolicyForm.accessLevel !== "public",
        restrictedNotice: nodePolicyForm.restrictedNotice.trim(),
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save node access policy.");
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleUpdateEdgePolicy = async (edgeId, nextTier) => {
    try {
      setSavingPolicy(true);
      const res = await API.patch(`/campus/edges/${edgeId}`, {
        accessLevel: nextTier,
        isSensitive: nextTier !== "public",
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update walkway policy.");
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeleteEdge = async (edgeId) => {
    try {
      const res = await API.delete(`/campus/edges/${edgeId}`);
      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedEdgeId(null);
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete walkway.");
    }
  };

  const handleQuickPolicyTierChange = async (kind, id, nextTier, rowKey) => {
    try {
      setBusyPolicyKey(rowKey);
      const endpoint =
        kind === "floor"
          ? `/campus/floors/${id}`
          : kind === "edge"
            ? `/campus/edges/${id}`
            : `/campus/nodes/${id}`;
      const res = await API.patch(endpoint, {
        accessLevel: nextTier,
        isSensitive: nextTier !== "public",
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update clearance tier.");
    } finally {
      setBusyPolicyKey("");
    }
  };

  const handleDeleteNode = async (id) => {
    try {
      const res = await API.delete(`/campus/nodes/${id}`);
      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedNodeId(null);
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete node.");
    }
  };

  const handleCreateCrossEdge = async (e) => {
    e.preventDefault();
    if (!crossFromId || !crossToId) {
      toast.error("Select both source and target nodes to link across floors.");
      return;
    }
    try {
      const res = await API.post("/campus/edges", {
        fromNodeId: Number(crossFromId),
        toNodeId: Number(crossToId),
        edgeType: crossEdgeType,
        isAccessible: crossEdgeType !== "stairs",
        distanceMeters: 9,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setCrossFromId("");
        setCrossToId("");
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to link floors.");
    }
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/campus/buildings", buildingForm);
      if (res.data?.success) {
        toast.success(res.data.message);
        setBuildingForm({ code: "", name: "", shortLabel: "", category: "academic" });
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add building.");
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/campus/departments", {
        ...deptForm,
        buildingId: deptForm.buildingId ? Number(deptForm.buildingId) : null,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setDeptForm((prev) => ({ ...prev, code: "", name: "", hodName: "", hodEmail: "" }));
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add department.");
    }
  };

  const handleDeleteDepartment = async (id) => {
    try {
      const res = await API.delete(`/campus/departments/${id}`);
      if (res.data?.success) {
        toast.success(res.data.message);
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete department.");
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const divisions = String(courseForm.divisions || "A")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const res = await API.post("/campus/courses", {
        departmentId: Number(courseForm.departmentId),
        code: courseForm.code,
        name: courseForm.name,
        degreeLevel: courseForm.degreeLevel,
        durationYears: Number(courseForm.durationYears),
        divisions,
        intakeCapacity: Number(courseForm.intakeCapacity),
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setCourseForm((prev) => ({ ...prev, code: "", name: "" }));
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add course.");
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      const res = await API.delete(`/campus/courses/${id}`);
      if (res.data?.success) {
        toast.success(res.data.message);
        await loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete course.");
    }
  };

  if (loading && !bundle) {
    return (
      <div className="cn-page">
        <div className="cn-panel" style={{ textAlign: "center", padding: "56px 20px" }}>
          <p className="cn-sub" style={{ margin: "0 auto" }}>
            Loading Campus Map &amp; Academic Studio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cn-page">
      {/* ── Header ── */}
      <div className="cn-header">
        <div>
          <p className="av-kicker" style={{ marginBottom: "6px" }}>
            Multi-University Onboarding · Zero-Code Campus Builder
          </p>
          <h1 className="cn-title">Campus Map &amp; Academic Structure Studio</h1>
          <p className="cn-sub">
            Upload any institution’s campus maps and floor plans, draw walkable indoor corridors &amp; lifts, configure academic departments/courses, and control Avishkar Blind-Evaluation anonymity.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <Link to="/campus-map" className="av-btn av-btn--secondary av-btn--compact">
            <i className="bx bx-navigation" aria-hidden="true" />
            Preview Live Wayfinder
          </Link>
        </div>
      </div>

      {/* ── Avishkar Blind-Evaluation Mode Quick Bar ── */}
      <div
        className={`cn-switch-row ${brandForm.blindEvaluationMode ? "is-on" : ""}`}
        style={{ marginBottom: "20px", padding: "14px 18px" }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            Avishkar Blind-Evaluation Anonymity Mode{" "}
            <span className="av-mono" style={{ fontSize: "0.78rem", color: brandForm.blindEvaluationMode ? "#22c55e" : "#f59e0b" }}>
              · {brandForm.blindEvaluationMode ? "ACTIVE (ANONYMOUS)" : "CUSTOM BRANDING"}
            </span>
          </div>
          <div style={{ fontSize: "0.81rem", color: "var(--av-ink-muted)", marginTop: "2px" }}>
            Complies with Maharashtra State Inter-University Avishkar rules by masking college &amp; creator identifiers across the UI, QR posters, Demo accounts, and exported NAAC PDFs.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={brandForm.blindEvaluationMode}
          aria-label="Toggle Avishkar Blind-Evaluation Anonymity Mode"
          disabled={savingBrand}
          className={`cn-switch-btn ${brandForm.blindEvaluationMode ? "is-on" : ""}`}
          onClick={() => handleSaveBranding(!brandForm.blindEvaluationMode)}
        />
      </div>

      {/* ── Studio Section Tabs ── */}
      <div className="cn-seg" role="tablist" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "maps"}
          className={`cn-seg__btn ${activeTab === "maps" ? "is-active" : ""}`}
          onClick={() => setActiveTab("maps")}
        >
          <i className="bx bx-map-alt" aria-hidden="true" />
          Blueprints &amp; Map Editor ({floors.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "policies"}
          className={`cn-seg__btn ${activeTab === "policies" ? "is-active" : ""}`}
          onClick={() => setActiveTab("policies")}
        >
          <i className="bx bx-shield-quarter" aria-hidden="true" />
          Protected Zones ({protectedZonesCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "academics"}
          className={`cn-seg__btn ${activeTab === "academics" ? "is-active" : ""}`}
          onClick={() => setActiveTab("academics")}
        >
          <i className="bx bxs-graduation" aria-hidden="true" />
          Departments &amp; Courses ({departments.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "branding"}
          className={`cn-seg__btn ${activeTab === "branding" ? "is-active" : ""}`}
          onClick={() => setActiveTab("branding")}
        >
          <i className="bx bx-buildings" aria-hidden="true" />
          Institution Profile
        </button>
      </div>

      {/* ═══════════════ TAB 1: BLUEPRINTS & MAP EDITOR ═══════════════ */}
      {activeTab === "maps" && (
        <div className="cn-workspace">
          {/* Left Editing Controls */}
          <div>
            {/* 1. Blueprint Upload / Replacement & Floor Policy */}
            <BlueprintManagerPanel
              activeFloor={rawActiveFloor}
              buildings={buildings}
              onPreviewUrlChange={setBlueprintPreviewUrl}
              onSaved={(nextId) => loadData(nextId)}
            />

            {/* 2. Interactive Graph & Node/Edge Security Tools */}
            <div className="cn-panel">
              <div className="cn-panel__title">
                <span>Interactive Pins &amp; Zone Policies</span>
              </div>

              <div className="cn-seg" style={{ width: "100%", marginBottom: "14px" }}>
                <button
                  type="button"
                  className={`cn-seg__btn ${tool === "select" ? "is-active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setTool("select");
                    setEdgeStartId(null);
                  }}
                >
                  Inspect / Policy
                </button>
                <button
                  type="button"
                  className={`cn-seg__btn ${tool === "add-node" ? "is-active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setTool("add-node");
                    setEdgeStartId(null);
                  }}
                >
                  + Pin Node
                </button>
                <button
                  type="button"
                  className={`cn-seg__btn ${tool === "connect-edge" ? "is-active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setTool("connect-edge");
                    setEdgeStartId(null);
                  }}
                >
                  Connect Path
                </button>
              </div>

              {tool === "add-node" && (
                <div>
                  <div className="cn-field">
                    <label htmlFor="st-node-label">Room / Landmark Label</label>
                    <input
                      id="st-node-label"
                      className="cn-input"
                      placeholder="e.g., Server Room 208 or Exam Vault"
                      value={newNodeForm.label}
                      onChange={(e) => setNewNodeForm((p) => ({ ...p, label: e.target.value }))}
                    />
                  </div>
                  <div className="cn-field">
                    <label htmlFor="st-node-type">Node Type</label>
                    <select
                      id="st-node-type"
                      className="cn-select"
                      value={newNodeForm.nodeType}
                      onChange={(e) => setNewNodeForm((p) => ({ ...p, nodeType: e.target.value }))}
                    >
                      {NODE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cn-field">
                    <label htmlFor="st-node-tier">Access Clearance Tier</label>
                    <select
                      id="st-node-tier"
                      className="cn-select"
                      value={newNodeForm.accessLevel}
                      onChange={(e) =>
                        setNewNodeForm((p) => ({ ...p, accessLevel: e.target.value }))
                      }
                    >
                      {CAMPUS_ACCESS_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {ACCESS_TIER_META[tier].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {newNodeForm.accessLevel !== "public" && (
                    <div className="cn-field">
                      <label htmlFor="st-node-notice">Restriction Notice</label>
                      <input
                        id="st-node-notice"
                        className="cn-input"
                        placeholder="e.g., IT Admin Clearance Required"
                        value={newNodeForm.restrictedNotice}
                        onChange={(e) =>
                          setNewNodeForm((p) => ({ ...p, restrictedNotice: e.target.value }))
                        }
                      />
                    </div>
                  )}
                  <div className="cn-field">
                    <label htmlFor="st-node-qr">Optional QR Spot Code</label>
                    <input
                      id="st-node-qr"
                      className="cn-input"
                      placeholder="e.g., CAMPUS-CSLAB-02"
                      value={newNodeForm.qrSpotCode}
                      onChange={(e) => setNewNodeForm((p) => ({ ...p, qrSpotCode: e.target.value }))}
                    />
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--av-primary)", margin: 0 }}>
                    Click anywhere on the floor blueprint to pin this node.
                  </p>
                </div>
              )}

              {tool === "connect-edge" && (
                <div>
                  <div className="cn-field">
                    <label htmlFor="st-edge-type">Walkway Type</label>
                    <select
                      id="st-edge-type"
                      className="cn-select"
                      value={edgeType}
                      onChange={(e) => setEdgeType(e.target.value)}
                    >
                      {EDGE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cn-field">
                    <label htmlFor="st-edge-tier">Walkway Clearance Tier</label>
                    <select
                      id="st-edge-tier"
                      className="cn-select"
                      value={edgeAccessLevel}
                      onChange={(e) => setEdgeAccessLevel(e.target.value)}
                    >
                      {CAMPUS_ACCESS_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {ACCESS_TIER_META[tier].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p style={{ fontSize: "0.79rem", color: "var(--av-ink-muted)", margin: 0 }}>
                    {edgeStartId
                      ? `Start pin selected (#${edgeStartId}). Click the second pin on this floor to connect.`
                      : "Click Node A, then click Node B on the map to create a walkable edge."}
                  </p>
                </div>
              )}

              {tool === "select" && selectedNode && (
                <form onSubmit={handleSaveNodePolicy} style={{ paddingTop: "4px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span className="av-mono" style={{ fontSize: "0.75rem", color: "var(--av-ink-muted)" }}>
                      {selectedNode.code} · ({selectedNode.x}%, {selectedNode.y}%)
                    </span>
                    <span className={`cn-tier-badge cn-tier-badge--${nodePolicyForm.accessLevel}`}>
                      <i
                        className={`bx ${nodePolicyForm.accessLevel === "public" ? "bx-check-circle" : "bx-lock-alt"}`}
                        aria-hidden="true"
                      />
                      {ACCESS_TIER_META[nodePolicyForm.accessLevel]?.shortLabel}
                    </span>
                  </div>

                  <div className="cn-field">
                    <label htmlFor="st-sel-label">Room / Zone Name</label>
                    <input
                      id="st-sel-label"
                      className="cn-input"
                      value={nodePolicyForm.label}
                      onChange={(e) => setNodePolicyForm((p) => ({ ...p, label: e.target.value }))}
                    />
                  </div>

                  <div className="cn-field">
                    <label htmlFor="st-sel-tier">Minimum Access Tier</label>
                    <select
                      id="st-sel-tier"
                      className="cn-select"
                      value={nodePolicyForm.accessLevel}
                      onChange={(e) => {
                        const tier = e.target.value;
                        setNodePolicyForm((p) => ({
                          ...p,
                          accessLevel: tier,
                          isSensitive: tier !== "public",
                        }));
                      }}
                    >
                      {CAMPUS_ACCESS_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier === "public"
                            ? "Public — Open Access"
                            : `${ACCESS_TIER_META[tier].label} (${ACCESS_TIER_META[tier].shortLabel})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cn-field">
                    <label htmlFor="st-sel-notice">Restricted Area Notice (shown to unauthorized viewers)</label>
                    <input
                      id="st-sel-notice"
                      className="cn-input"
                      placeholder="e.g., Authorized Staff Only — Exam Control Vault"
                      value={nodePolicyForm.restrictedNotice}
                      onChange={(e) =>
                        setNodePolicyForm((p) => ({ ...p, restrictedNotice: e.target.value }))
                      }
                    />
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      disabled={savingPolicy}
                      className="av-btn av-btn--primary av-btn--compact"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <i className="bx bx-shield-alt-2" aria-hidden="true" />
                      {savingPolicy ? "Saving..." : "Save Policy"}
                    </button>
                    <button
                      type="button"
                      className="av-btn av-btn--ghost av-btn--compact"
                      style={{ color: "#f87171" }}
                      onClick={() => handleDeleteNode(selectedNode.id)}
                    >
                      <i className="bx bx-trash" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </form>
              )}

              {tool === "select" && !selectedNode && (
                <div style={{ fontSize: "0.79rem", color: "var(--av-ink-muted)" }}>
                  Click any pin on the blueprint to configure its access tier and restriction notice, or select a walkway below to protect a corridor.
                </div>
              )}

              {floorEdges.length > 0 && tool === "select" && (
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--av-border)" }}>
                  <div className="cn-field" style={{ marginBottom: "8px" }}>
                    <label htmlFor="st-corridor-select">Restrict a Corridor / Walkway on this Floor</label>
                    <select
                      id="st-corridor-select"
                      className="cn-select"
                      value={selectedEdgeId || ""}
                      onChange={(e) => setSelectedEdgeId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Select corridor to configure policy...</option>
                      {floorEdges.map((edge) => {
                        const a = rawNodeById.get(Number(edge.fromNodeId));
                        const b = rawNodeById.get(Number(edge.toNodeId));
                        return (
                          <option key={edge.id} value={edge.id}>
                            {a?.code || edge.fromNodeId} ↔ {b?.code || edge.toNodeId} ({edge.distanceMeters}m ·{" "}
                            {ACCESS_TIER_META[edge.accessLevel || "public"]?.shortLabel})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedEdge && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <select
                        aria-label="Selected corridor access tier"
                        className="cn-select"
                        style={{ minHeight: "36px", flex: 1 }}
                        disabled={savingPolicy}
                        value={selectedEdge.accessLevel || "public"}
                        onChange={(e) => handleUpdateEdgePolicy(selectedEdge.id, e.target.value)}
                      >
                        {CAMPUS_ACCESS_TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            Corridor Tier: {ACCESS_TIER_META[tier].label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="av-btn av-btn--ghost av-btn--compact"
                        style={{ color: "#f87171" }}
                        aria-label="Remove selected corridor"
                        onClick={() => handleDeleteEdge(selectedEdge.id)}
                      >
                        <i className="bx bx-trash" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Cross-Floor Vertical Connector */}
            <form className="cn-panel" onSubmit={handleCreateCrossEdge}>
              <div className="cn-panel__title">
                <span>Link Floors (Stairs / Elevator / Entry)</span>
              </div>
              <div className="cn-field">
                <label htmlFor="st-cross-a">Node on Floor A</label>
                <select
                  id="st-cross-a"
                  className="cn-select"
                  value={crossFromId}
                  onChange={(e) => setCrossFromId(e.target.value)}
                >
                  <option value="">Select Node A...</option>
                  {rawNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.code}] {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cn-field">
                <label htmlFor="st-cross-b">Node on Floor B</label>
                <select
                  id="st-cross-b"
                  className="cn-select"
                  value={crossToId}
                  onChange={(e) => setCrossToId(e.target.value)}
                >
                  <option value="">Select Node B...</option>
                  {rawNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.code}] {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cn-field">
                <label htmlFor="st-cross-type">Connector Type</label>
                <select
                  id="st-cross-type"
                  className="cn-select"
                  value={crossEdgeType}
                  onChange={(e) => setCrossEdgeType(e.target.value)}
                >
                  <option value="elevator">Elevator (Accessible)</option>
                  <option value="ramp">Ramp / Building Entry (Accessible)</option>
                  <option value="stairs">Staircase (Non-Accessible)</option>
                </select>
              </div>
              <button type="submit" className="av-btn av-btn--secondary av-btn--compact" style={{ width: "100%", justifyContent: "center" }}>
                Connect Across Floors
              </button>
            </form>
          </div>

          {/* Right Interactive Floor Blueprint Canvas */}
          <div className="cn-map-shell">
            <div className="cn-map-toolbar">
              <div className="cn-seg">
                {floors.map((fl) => (
                  <button
                    key={fl.id}
                    type="button"
                    className={`cn-seg__btn ${Number(activeFloor?.id) === Number(fl.id) ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveFloorId(fl.id);
                      setEdgeStartId(null);
                      setSelectedNodeId(null);
                      setSelectedEdgeId(null);
                    }}
                  >
                    {fl.accessLevel && fl.accessLevel !== "public" && (
                      <i className="bx bx-lock-alt" aria-hidden="true" />
                    )}
                    {fl.isOutdoor ? "Outdoor Site" : fl.floorLabel}
                  </button>
                ))}
              </div>
              <span className="av-mono" style={{ fontSize: "0.76rem", color: "var(--av-ink-muted)" }}>
                {floorNodes.length} pins · {floorEdges.length} walkways · {activeFloor?.widthMeters || 60}m×{activeFloor?.heightMeters || 42}m
              </span>
            </div>

            {/* Live "Preview Map As Tier" Simulator Bar */}
            <div className="cn-preview-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <i className="bx bx-show-alt" aria-hidden="true" style={{ fontSize: "1.1rem", color: "#60a5fa" }} />
                <strong>Preview Map As Tier:</strong>
                <span style={{ color: "var(--av-ink-muted)" }}>
                  {previewTier === "admin"
                    ? "Admin view (all zones unlocked)"
                    : `Simulating ${ACCESS_TIER_META[previewTier].label} — unauthorized places render locked`}
                </span>
              </div>
              <div className="cn-seg" role="group" aria-label="Preview map as clearance tier">
                {["admin", "staff", "student", "public"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`cn-seg__btn ${previewTier === t ? "is-active" : ""}`}
                    style={{ minHeight: "30px", padding: "4px 9px", fontSize: "0.74rem" }}
                    onClick={() => setPreviewTier(t)}
                  >
                    {t === "admin" ? "Admin (All)" : ACCESS_TIER_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cn-canvas-viewport">
              <div
                className={`cn-canvas-stage ${tool === "add-node" ? "is-crosshair" : ""}`}
                onClick={handleCanvasClick}
              >
                {activeFloor?.isLocked && previewTier !== "admin" ? (
                  <div className="cn-restricted-shield">
                    <div className="cn-restricted-shield__icon">
                      <i className="bx bx-lock-alt" aria-hidden="true" />
                    </div>
                    <span className={`cn-tier-badge cn-tier-badge--${activeFloor.effectiveAccessLevel}`}>
                      {ACCESS_TIER_META[activeFloor.effectiveAccessLevel]?.label} Clearance Required
                    </span>
                    <h3>{activeFloor.floorLabel} — Locked Floor Preview</h3>
                    <p>
                      {activeFloor.restrictedNotice ||
                        "Unauthorized viewers cannot inspect this blueprint or route onto this floor."}
                    </p>
                  </div>
                ) : (
                  <>
                    {blueprintPreviewUrl || activeFloor?.mapImageUrl ? (
                      <img
                        src={blueprintPreviewUrl || activeFloor.mapImageUrl}
                        alt={activeFloor?.floorLabel || "Campus Blueprint"}
                        className="cn-map-img"
                      />
                    ) : (
                      <div className="cn-default-grid">
                        <span className="cn-default-grid__tag">
                          Default Grid · {activeFloor?.widthMeters || 60}m × {activeFloor?.heightMeters || 42}m
                        </span>
                      </div>
                    )}

                    <svg
                      className="cn-svg-overlay"
                      viewBox="0 0 1000 700"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      {floorEdges.map((edge) => {
                        const a = nodeById.get(Number(edge.fromNodeId));
                        const b = nodeById.get(Number(edge.toNodeId));
                        if (!a || !b) return null;
                        const isRestrictedEdge =
                          edge.isLocked || (edge.accessLevel && edge.accessLevel !== "public");
                        return (
                          <line
                            key={edge.id}
                            x1={a.x * 10}
                            y1={a.y * 7}
                            x2={b.x * 10}
                            y2={b.y * 7}
                            stroke={
                              isRestrictedEdge
                                ? "#ef4444"
                                : edge.isAccessible
                                  ? "#22c55e"
                                  : "#f59e0b"
                            }
                            strokeWidth={Number(selectedEdgeId) === Number(edge.id) ? 6 : 3.5}
                            strokeDasharray="6 4"
                            opacity={0.85}
                          />
                        );
                      })}
                    </svg>

                    {floorNodes.map((node) => {
                      const isSelected =
                        Number(selectedNodeId) === Number(node.id) ||
                        Number(edgeStartId) === Number(node.id);
                      const isProtected =
                        node.effectiveAccessLevel && node.effectiveAccessLevel !== "public";
                      const isLockedPreview = Boolean(node.isLocked);
                      return (
                        <button
                          key={node.id}
                          type="button"
                          className={`cn-pin ${
                            isLockedPreview
                              ? "cn-pin--locked"
                              : node.nodeType === "corridor"
                                ? "cn-pin--corridor"
                                : node.nodeType === "stairs"
                                  ? "cn-pin--stairs"
                                  : node.nodeType === "elevator" || node.nodeType === "ramp"
                                    ? "cn-pin--elevator"
                                    : node.qrSpotCode
                                      ? "cn-pin--qr"
                                      : ""
                          } ${!isLockedPreview && isProtected ? "cn-pin--protected-unlocked" : ""} ${
                            isSelected ? "is-selected" : ""
                          }`}
                          style={{ left: `${node.x}%`, top: `${node.y}%` }}
                          onClick={(e) => handleNodeClick(e, node)}
                          title={`${node.label} (${node.code}) · ${ACCESS_TIER_META[node.effectiveAccessLevel || "public"]?.label}`}
                        >
                          {isLockedPreview ? (
                            <i className="bx bx-lock-alt" aria-hidden="true" />
                          ) : isProtected ? (
                            <i className="bx bx-shield-alt-2" aria-hidden="true" />
                          ) : (
                            node.nodeType !== "corridor" && (
                              <i className="bx bx-map-pin" aria-hidden="true" />
                            )
                          )}
                          <span
                            className={`cn-pin-label ${isLockedPreview ? "cn-pin-label--locked" : ""}`}
                          >
                            {isLockedPreview
                              ? `LOCKED · ${ACCESS_TIER_META[node.effectiveAccessLevel]?.shortLabel}`
                              : isProtected
                                ? `${node.code} · ${ACCESS_TIER_META[node.effectiveAccessLevel]?.shortLabel}`
                                : node.code}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Quick Add Building Bar below canvas */}
            <form
              onSubmit={handleCreateBuilding}
              className="cn-inspector"
              style={{ gap: "10px" }}
            >
              <strong style={{ fontSize: "0.84rem" }}>Add Campus Building:</strong>
              <input
                className="cn-input"
                style={{ maxWidth: "120px" }}
                placeholder="Code (BLK-C)"
                value={buildingForm.code}
                onChange={(e) => setBuildingForm((p) => ({ ...p, code: e.target.value }))}
                required
              />
              <input
                className="cn-input"
                style={{ flex: "1 1 200px" }}
                placeholder="Building Name (e.g., Pharmacy & Research Block)"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <button type="submit" className="av-btn av-btn--secondary av-btn--compact">
                + Add Building
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: PROTECTED ZONES & SECURITY POLICIES ═══════════════ */}
      {activeTab === "policies" && (
        <ProtectedZonesTable
          floors={rawFloors}
          nodes={rawNodes}
          edges={rawEdges}
          busyKey={busyPolicyKey}
          onQuickTierChange={handleQuickPolicyTierChange}
          onSelectFloor={(floorId) => {
            setActiveFloorId(floorId);
            setSelectedNodeId(null);
            setActiveTab("maps");
          }}
          onSelectNode={(nodeId, floorId) => {
            if (floorId) setActiveFloorId(floorId);
            setTool("select");
            setSelectedNodeId(nodeId);
            setActiveTab("maps");
          }}
        />
      )}

      {/* ═══════════════ TAB 2: DEPARTMENTS & COURSES ═══════════════ */}
      {activeTab === "academics" && (
        <div className="cn-workspace">
          <div>
            {/* Add Department Form */}
            <form className="cn-panel" onSubmit={handleCreateDepartment}>
              <div className="cn-panel__title">
                <span>Add Academic Department / School</span>
              </div>
              <div className="cn-field">
                <label htmlFor="ac-dept-code">Department Code</label>
                <input
                  id="ac-dept-code"
                  className="cn-input"
                  placeholder="e.g., CIVIL, AIDS, PHARM"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
              <div className="cn-field">
                <label htmlFor="ac-dept-name">Department Name</label>
                <input
                  id="ac-dept-name"
                  className="cn-input"
                  placeholder="e.g., Civil & Environmental Engineering"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="cn-field">
                <label htmlFor="ac-dept-bldg">Campus Building</label>
                <select
                  id="ac-dept-bldg"
                  className="cn-select"
                  value={deptForm.buildingId}
                  onChange={(e) => setDeptForm((p) => ({ ...p, buildingId: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cn-field">
                <label htmlFor="ac-dept-hod">HOD / Coordinator Role Title</label>
                <input
                  id="ac-dept-hod"
                  className="cn-input"
                  placeholder="e.g., Head of Dept — Civil Engineering"
                  value={deptForm.hodName}
                  onChange={(e) => setDeptForm((p) => ({ ...p, hodName: e.target.value }))}
                />
              </div>
              <button type="submit" className="av-btn av-btn--primary av-btn--compact" style={{ width: "100%", justifyContent: "center" }}>
                + Create Department
              </button>
            </form>

            {/* Add Course Form */}
            <form className="cn-panel" onSubmit={handleCreateCourse}>
              <div className="cn-panel__title">
                <span>Add Degree Course / Program</span>
              </div>
              <div className="cn-field">
                <label htmlFor="ac-course-dept">Department</label>
                <select
                  id="ac-course-dept"
                  className="cn-select"
                  value={courseForm.departmentId}
                  onChange={(e) => setCourseForm((p) => ({ ...p, departmentId: e.target.value }))}
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cn-field">
                <label htmlFor="ac-course-code">Course Code</label>
                <input
                  id="ac-course-code"
                  className="cn-input"
                  placeholder="e.g., BTECH-CIVIL"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
              <div className="cn-field">
                <label htmlFor="ac-course-name">Program Title</label>
                <input
                  id="ac-course-name"
                  className="cn-input"
                  placeholder="e.g., B.Tech Civil Engineering"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="cn-field">
                  <label htmlFor="ac-course-lvl">Degree Level</label>
                  <select
                    id="ac-course-lvl"
                    className="cn-select"
                    value={courseForm.degreeLevel}
                    onChange={(e) => setCourseForm((p) => ({ ...p, degreeLevel: e.target.value }))}
                  >
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                    <option value="Diploma">Diploma</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                <div className="cn-field">
                  <label htmlFor="ac-course-yrs">Duration (Yrs)</label>
                  <input
                    id="ac-course-yrs"
                    type="number"
                    min="1"
                    max="6"
                    className="cn-input"
                    value={courseForm.durationYears}
                    onChange={(e) => setCourseForm((p) => ({ ...p, durationYears: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="cn-field">
                  <label htmlFor="ac-course-div">Divisions</label>
                  <input
                    id="ac-course-div"
                    className="cn-input"
                    placeholder="A, B"
                    value={courseForm.divisions}
                    onChange={(e) => setCourseForm((p) => ({ ...p, divisions: e.target.value }))}
                  />
                </div>
                <div className="cn-field">
                  <label htmlFor="ac-course-cap">Intake</label>
                  <input
                    id="ac-course-cap"
                    type="number"
                    className="cn-input"
                    value={courseForm.intakeCapacity}
                    onChange={(e) => setCourseForm((p) => ({ ...p, intakeCapacity: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="av-btn av-btn--secondary av-btn--compact" style={{ width: "100%", justifyContent: "center" }}>
                + Add Program
              </button>
            </form>
          </div>

          {/* Right Configured Hierarchy View */}
          <div>
            <div className="cn-dept-grid" style={{ marginTop: 0 }}>
              {departments.map((dept) => (
                <article key={dept.id} className="cn-dept-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div>
                      <div className="av-mono" style={{ fontSize: "0.75rem", color: "var(--av-primary)", fontWeight: 700 }}>
                        {dept.code}
                      </div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "2px 0" }}>
                        {dept.name}
                      </h3>
                      <div style={{ fontSize: "0.78rem", color: "var(--av-ink-muted)" }}>
                        {dept.hodName || "Department Office"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="av-btn av-btn--ghost av-btn--compact"
                      style={{ color: "#f87171" }}
                      onClick={() => handleDeleteDepartment(dept.id)}
                      aria-label={`Delete ${dept.name}`}
                    >
                      <i className="bx bx-trash" aria-hidden="true" />
                    </button>
                  </div>

                  <div>
                    {(dept.courses || []).length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "var(--av-ink-muted)", margin: 0 }}>
                        No courses yet — add one on the left.
                      </p>
                    ) : (
                      dept.courses.map((c) => (
                        <div key={c.id} className="cn-course-row">
                          <div>
                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--av-ink-muted)" }}>
                              {c.code} · {c.degreeLevel} · {c.durationYears} yrs · Div{" "}
                              {Array.isArray(c.divisions) ? c.divisions.join("/") : "A"} · {c.intakeCapacity} seats
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(c.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#f87171",
                              cursor: "pointer",
                              fontSize: "0.95rem",
                            }}
                            aria-label={`Remove ${c.name}`}
                          >
                            <i className="bx bx-x" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: INSTITUTION PROFILE ═══════════════ */}
      {activeTab === "branding" && (
        <form
          className="cn-panel"
          style={{ maxWidth: "640px" }}
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveBranding();
          }}
        >
          <div className="cn-panel__title">
            <span>White-Label University / College Identity</span>
          </div>
          <p className="cn-sub" style={{ marginBottom: "16px" }}>
            Configure how this deployment identifies a university or college when Avishkar Blind-Evaluation Mode is turned off.
          </p>
          <div className="cn-field">
            <label htmlFor="br-name">Platform Display Name</label>
            <input
              id="br-name"
              className="cn-input"
              value={brandForm.siteName}
              onChange={(e) => setBrandForm((p) => ({ ...p, siteName: e.target.value }))}
            />
          </div>
          <div className="cn-field">
            <label htmlFor="br-inst">University / College Name (Masked in Blind Mode)</label>
            <input
              id="br-inst"
              className="cn-input"
              value={brandForm.siteTagline}
              onChange={(e) => setBrandForm((p) => ({ ...p, siteTagline: e.target.value }))}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="cn-field">
              <label htmlFor="br-code">Institution Short Code</label>
              <input
                id="br-code"
                className="cn-input"
                value={brandForm.institutionCode}
                onChange={(e) => setBrandForm((p) => ({ ...p, institutionCode: e.target.value }))}
              />
            </div>
            <div className="cn-field">
              <label htmlFor="br-domain">Campus Email Domain</label>
              <input
                id="br-domain"
                className="cn-input"
                value={brandForm.allowedDomain}
                onChange={(e) => setBrandForm((p) => ({ ...p, allowedDomain: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingBrand}
            className="av-btn av-btn--primary av-btn--compact"
          >
            {savingBrand ? "Saving..." : "Save Institution Profile"}
          </button>
        </form>
      )}
    </div>
  );
}
