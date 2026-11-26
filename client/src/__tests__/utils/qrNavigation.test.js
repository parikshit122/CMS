import { describe, it, expect } from "vitest";
import {
  parseQrAnchorInput,
  resolveQrAnchorNode,
  buildWayfindingQrUrl,
  buildWalkthroughState,
} from "../../utils/qrNavigation";

const SAMPLE_NODES = [
  {
    id: 1,
    floorId: 10,
    code: "OUT-GATE",
    label: "Main Campus Gate — Security Plaza",
    nodeType: "entrance",
    qrSpotCode: "CAMPUS-GATE-01",
    displayQrSpotCode: "CAMPUS-GATE-01",
  },
  {
    id: 2,
    floorId: 20,
    code: "B2-LAB2",
    label: "Computer Lab 2 — First Floor",
    nodeType: "lab",
    qrSpotCode: "CAMPUS-CSLAB-02",
    displayQrSpotCode: "CAMPUS-CSLAB-02",
  },
  {
    id: 3,
    floorId: 20,
    code: "B2-ELEV",
    label: "Accessible Lift — Block B",
    nodeType: "elevator",
    qrSpotCode: null,
    displayQrSpotCode: null,
  },
  {
    id: 4,
    floorId: 20,
    code: "B2-CORR",
    label: "Corridor Node",
    nodeType: "corridor",
    qrSpotCode: null,
  },
];

describe("parseQrAnchorInput", () => {
  it("extracts qr parameter from full campus-map URLs", () => {
    const res = parseQrAnchorInput("https://campus.example.edu/campus-map?qr=campus-cslab-02");
    expect(res.qrCode).toBe("CAMPUS-CSLAB-02");
    expect(res.nodeId).toBeNull();
  });

  it("extracts spot parameter from /report QR poster URLs", () => {
    const res = parseQrAnchorInput("https://campus.example.edu/report?spot=CAMPUS-GATE-01");
    expect(res.qrCode).toBe("CAMPUS-GATE-01");
  });

  it("extracts numeric node ID from ?from= or ?node= deep links", () => {
    const fromRes = parseQrAnchorInput("/campus-map?from=3");
    expect(fromRes.nodeId).toBe(3);

    const nodeRes = parseQrAnchorInput("https://app.test/campus-map?node=2");
    expect(nodeRes.nodeId).toBe(2);
  });

  it("handles raw spot codes, node codes, and blank inputs cleanly", () => {
    expect(parseQrAnchorInput("  b2-lab2  ").qrCode).toBe("B2-LAB2");
    expect(parseQrAnchorInput("3").nodeId).toBe(3);
    expect(parseQrAnchorInput("   ").token).toBe("");
  });
});

describe("resolveQrAnchorNode", () => {
  it("matches by QR spot code from URL or raw code", () => {
    const r1 = resolveQrAnchorNode("https://demo.app/campus-map?qr=CAMPUS-CSLAB-02", SAMPLE_NODES);
    expect(r1.matched).toBe(true);
    expect(r1.node.id).toBe(2);
    expect(r1.matchedBy).toBe("qr_spot_code");
  });

  it("matches by node code, numeric node ID, or room label", () => {
    const byCode = resolveQrAnchorNode("B2-ELEV", SAMPLE_NODES);
    expect(byCode.matched).toBe(true);
    expect(byCode.node.id).toBe(3);
    expect(byCode.matchedBy).toBe("node_code");

    const byId = resolveQrAnchorNode("/campus-map?from=3", SAMPLE_NODES);
    expect(byId.matched).toBe(true);
    expect(byId.node.id).toBe(3);
    expect(byId.matchedBy).toBe("node_id");

    const byLabel = resolveQrAnchorNode("Computer Lab 2", SAMPLE_NODES);
    expect(byLabel.matched).toBe(true);
    expect(byLabel.node.id).toBe(2);
    expect(byLabel.matchedBy).toBe("label");
  });

  it("returns helpful error when no node matches", () => {
    const miss = resolveQrAnchorNode("UNKNOWN-999", SAMPLE_NODES);
    expect(miss.matched).toBe(false);
    expect(miss.reason).toContain("UNKNOWN-999");
  });
});

describe("buildWayfindingQrUrl", () => {
  it("uses ?qr= when the node has a QR spot code and ?from= otherwise", () => {
    expect(buildWayfindingQrUrl("https://campus.test/", SAMPLE_NODES[1])).toBe(
      "https://campus.test/campus-map?qr=CAMPUS-CSLAB-02"
    );
    expect(buildWayfindingQrUrl("https://campus.test", SAMPLE_NODES[2])).toBe(
      "https://campus.test/campus-map?from=3"
    );
  });
});

describe("buildWalkthroughState", () => {
  const sampleRoute = {
    found: true,
    totalMeters: 100,
    estimatedSeconds: 80,
    nodes: SAMPLE_NODES,
    steps: [
      { stepNumber: 1, fromNodeId: 1, toNodeId: 3, floorId: 10, distanceMeters: 60, instruction: "Walk to Lift" },
      { stepNumber: 2, fromNodeId: 3, toNodeId: 2, floorId: 20, distanceMeters: 40, instruction: "Enter Computer Lab 2" },
    ],
  };

  it("tracks start, intermediate checkpoints, and arrival accurately", () => {
    const s0 = buildWalkthroughState(sampleRoute, 0);
    expect(s0.active).toBe(true);
    expect(s0.currentNodeId).toBe(1);
    expect(s0.currentFloorId).toBe(10);
    expect(s0.remainingMeters).toBe(100);
    expect(s0.progressPercent).toBe(0);
    expect(s0.isArrived).toBe(false);

    const s1 = buildWalkthroughState(sampleRoute, 1);
    expect(s1.currentNodeId).toBe(3);
    expect(s1.currentFloorId).toBe(20);
    expect(s1.remainingMeters).toBe(40);
    expect(s1.progressPercent).toBe(50);

    const s2 = buildWalkthroughState(sampleRoute, 2);
    expect(s2.isArrived).toBe(true);
    expect(s2.currentNodeId).toBe(2);
    expect(s2.remainingMeters).toBe(0);
    expect(s2.remainingSeconds).toBe(0);
    expect(s2.progressPercent).toBe(100);
  });
});
