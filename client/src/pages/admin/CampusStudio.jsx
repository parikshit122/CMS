import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import { useToast } from "../../components/common/Alert";
import { broadcastBrandingUpdate } from "../../hooks/useInstitutionBranding";
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

  // Map Editor state
  const [activeFloorId, setActiveFloorId] = useState(null);
  const [tool, setTool] = useState("select"); // "select" | "add-node" | "connect-edge"
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [edgeStartId, setEdgeStartId] = useState(null);
  const [edgeType, setEdgeType] = useState("corridor");

  // Pending new node settings
  const [newNodeForm, setNewNodeForm] = useState({
    label: "",
    code: "",
    nodeType: "room",
    qrSpotCode: "",
  });

  // Cross-floor vertical connector form
  const [crossFromId, setCrossFromId] = useState("");
  const [crossToId, setCrossToId] = useState("");
  const [crossEdgeType, setCrossEdgeType] = useState("elevator");

  // Upload Floor Plan / New Building forms
  const [buildingForm, setBuildingForm] = useState({
    code: "",
    name: "",
    shortLabel: "",
    category: "academic",
  });
  const [floorForm, setFloorForm] = useState({
    buildingId: "",
    floorNumber: "1",
    floorLabel: "",
    widthMeters: "60",
    heightMeters: "42",
    isOutdoor: false,
  });
  const [floorImageFile, setFloorImageFile] = useState(null);
  const [uploadingFloor, setUploadingFloor] = useState(false);

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [navRes, settingsRes] = await Promise.all([
        API.get("/public/campus-navigation"),
        API.get("/settings").catch(() => null),
      ]);
      if (navRes.data?.success && navRes.data?.data) {
        const data = navRes.data.data;
        setBundle(data);
        setActiveFloorId((prev) => prev || data.floors?.[0]?.id || null);
        if (data.departments?.length > 0) {
          setCourseForm((prev) => ({
            ...prev,
            departmentId: prev.departmentId || String(data.departments[0].id),
          }));
        }
        if (data.buildings?.length > 0) {
          setFloorForm((prev) => ({
            ...prev,
            buildingId: prev.buildingId || String(data.buildings[0].id),
          }));
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

  const floors = useMemo(() => bundle?.floors || [], [bundle]);
  const buildings = useMemo(() => bundle?.buildings || [], [bundle]);
  const nodes = useMemo(() => bundle?.nodes || [], [bundle]);
  const edges = useMemo(() => bundle?.edges || [], [bundle]);
  const departments = useMemo(() => bundle?.departments || [], [bundle]);

  const activeFloor = useMemo(
    () => floors.find((f) => Number(f.id) === Number(activeFloorId)) || floors[0] || null,
    [floors, activeFloorId]
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

  const selectedNode = selectedNodeId ? nodeById.get(Number(selectedNodeId)) : null;

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
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setNewNodeForm((prev) => ({ ...prev, label: "", code: "", qrSpotCode: "" }));
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

    setSelectedNodeId(node.id);
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

  const handleUploadFloor = async (e) => {
    e.preventDefault();
    if (!floorForm.floorLabel.trim()) {
      toast.error("Enter a floor or campus map label.");
      return;
    }
    if (!floorImageFile) {
      toast.error("Select a PNG, JPG, WebP, or SVG floor plan file to upload.");
      return;
    }
    try {
      setUploadingFloor(true);
      const fd = new FormData();
      fd.append("floorLabel", floorForm.floorLabel.trim());
      fd.append("floorNumber", String(floorForm.floorNumber));
      fd.append("widthMeters", String(floorForm.widthMeters || 60));
      fd.append("heightMeters", String(floorForm.heightMeters || 42));
      fd.append("isOutdoor", String(floorForm.isOutdoor));
      if (!floorForm.isOutdoor && floorForm.buildingId) {
        fd.append("buildingId", String(floorForm.buildingId));
      }
      fd.append("mapImage", floorImageFile);

      const res = await API.post("/campus/floors", fd);
      if (res.data?.success) {
        toast.success(res.data.message);
        setFloorForm((prev) => ({ ...prev, floorLabel: "" }));
        setFloorImageFile(null);
        await loadData();
        if (res.data.data?.id) setActiveFloorId(res.data.data.id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Floor plan upload failed.");
    } finally {
      setUploadingFloor(false);
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
          Map &amp; Floor-Plan Editor ({floors.length})
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

      {/* ═══════════════ TAB 1: MAP & FLOOR-PLAN EDITOR ═══════════════ */}
      {activeTab === "maps" && (
        <div className="cn-workspace">
          {/* Left Editing Controls */}
          <div>
            <div className="cn-panel">
              <div className="cn-panel__title">
                <span>1. Interactive Graph Tools</span>
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
                  Select
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
                      placeholder="e.g., Smart Lab 208 or Ramp North"
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
                  <p style={{ fontSize: "0.79rem", color: "var(--av-ink-muted)", margin: 0 }}>
                    {edgeStartId
                      ? `Start pin selected (#${edgeStartId}). Now click the second pin on this floor to connect.`
                      : "Click Node A, then click Node B on the map to create a walkable edge."}
                  </p>
                </div>
              )}

              {tool === "select" && selectedNode && (
                <div style={{ paddingTop: "6px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{selectedNode.label}</div>
                  <div style={{ fontSize: "0.77rem", color: "var(--av-ink-muted)", margin: "3px 0 10px" }}>
                    {selectedNode.code} · {selectedNode.nodeType} · ({selectedNode.x}%, {selectedNode.y}%)
                  </div>
                  <button
                    type="button"
                    className="av-btn av-btn--ghost av-btn--compact"
                    style={{ color: "#f87171" }}
                    onClick={() => handleDeleteNode(selectedNode.id)}
                  >
                    <i className="bx bx-trash" aria-hidden="true" />
                    Delete Pin
                  </button>
                </div>
              )}
            </div>

            {/* Cross-Floor Vertical Connector */}
            <form className="cn-panel" onSubmit={handleCreateCrossEdge}>
              <div className="cn-panel__title">
                <span>2. Link Floors (Stairs / Elevator / Entry)</span>
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
                  {nodes.map((n) => (
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
                  {nodes.map((n) => (
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

            {/* Upload Custom Floor Plan */}
            <form className="cn-panel" onSubmit={handleUploadFloor}>
              <div className="cn-panel__title">
                <span>3. Upload College Map / Floor Plan</span>
              </div>
              <div className="cn-field">
                <label htmlFor="st-fl-label">Floor / Map Title</label>
                <input
                  id="st-fl-label"
                  className="cn-input"
                  placeholder="e.g., Block B — 1st Floor"
                  value={floorForm.floorLabel}
                  onChange={(e) => setFloorForm((p) => ({ ...p, floorLabel: e.target.value }))}
                  required
                />
              </div>
              <div className="cn-field">
                <label htmlFor="st-fl-bldg">Building</label>
                <select
                  id="st-fl-bldg"
                  className="cn-select"
                  value={floorForm.buildingId}
                  onChange={(e) => setFloorForm((p) => ({ ...p, buildingId: e.target.value }))}
                  disabled={floorForm.isOutdoor}
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="cn-field">
                  <label htmlFor="st-fl-w">Width (m)</label>
                  <input
                    id="st-fl-w"
                    type="number"
                    className="cn-input"
                    value={floorForm.widthMeters}
                    onChange={(e) => setFloorForm((p) => ({ ...p, widthMeters: e.target.value }))}
                  />
                </div>
                <div className="cn-field">
                  <label htmlFor="st-fl-h">Height (m)</label>
                  <input
                    id="st-fl-h"
                    type="number"
                    className="cn-input"
                    value={floorForm.heightMeters}
                    onChange={(e) => setFloorForm((p) => ({ ...p, heightMeters: e.target.value }))}
                  />
                </div>
              </div>
              <div className="cn-field">
                <label htmlFor="st-fl-img">Blueprint Image (PNG / JPG / SVG)</label>
                <input
                  id="st-fl-img"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="cn-input"
                  onChange={(e) => setFloorImageFile(e.target.files?.[0] || null)}
                />
              </div>
              <button
                type="submit"
                disabled={uploadingFloor}
                className="av-btn av-btn--primary av-btn--compact"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <i className="bx bx-upload" aria-hidden="true" />
                {uploadingFloor ? "Uploading..." : "Upload Floor Plan"}
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
                    }}
                  >
                    {fl.isOutdoor ? "Outdoor Site" : fl.floorLabel}
                  </button>
                ))}
              </div>
              <span className="av-mono" style={{ fontSize: "0.76rem", color: "var(--av-ink-muted)" }}>
                {floorNodes.length} pins · {floorEdges.length} walkways
              </span>
            </div>

            <div className="cn-canvas-viewport">
              <div
                className={`cn-canvas-stage ${tool === "add-node" ? "is-crosshair" : ""}`}
                onClick={handleCanvasClick}
              >
                {activeFloor?.mapImageUrl && (
                  <img
                    src={activeFloor.mapImageUrl}
                    alt={activeFloor.floorLabel}
                    className="cn-map-img"
                  />
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
                    return (
                      <line
                        key={edge.id}
                        x1={a.x * 10}
                        y1={a.y * 7}
                        x2={b.x * 10}
                        y2={b.y * 7}
                        stroke={edge.isAccessible ? "#22c55e" : "#f59e0b"}
                        strokeWidth={3.5}
                        strokeDasharray="6 4"
                        opacity={0.75}
                      />
                    );
                  })}
                </svg>

                {floorNodes.map((node) => {
                  const isSelected =
                    Number(selectedNodeId) === Number(node.id) ||
                    Number(edgeStartId) === Number(node.id);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`cn-pin ${
                        node.nodeType === "corridor"
                          ? "cn-pin--corridor"
                          : node.nodeType === "stairs"
                            ? "cn-pin--stairs"
                            : node.nodeType === "elevator" || node.nodeType === "ramp"
                              ? "cn-pin--elevator"
                              : node.qrSpotCode
                                ? "cn-pin--qr"
                                : ""
                      } ${isSelected ? "is-selected" : ""}`}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      onClick={(e) => handleNodeClick(e, node)}
                      title={`${node.label} (${node.code})`}
                    >
                      {node.nodeType !== "corridor" && <i className="bx bx-map-pin" aria-hidden="true" />}
                      <span className="cn-pin-label">{node.code}</span>
                    </button>
                  );
                })}
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
