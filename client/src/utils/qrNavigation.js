/**
 * Pure QR Indoor Wayfinding & Checkpoint Walkthrough Utilities
 * Zero external hardware/beacons required — parses wall QR URLs, spot codes,
 * and node codes to lock indoor 'You Are Here' anchors and step through routes.
 */

/**
 * Extracts normalized lookup tokens from a scanned QR string, pasted URL,
 * spot code, or node code.
 *
 * Supported formats:
 * - https://.../campus-map?qr=CAMPUS-CSLAB-02
 * - https://.../campus-map?from=14
 * - https://.../campus-map?node=14
 * - https://.../report?spot=CAMPUS-CSLAB-02
 * - /campus-map?qr=OUT-GATE
 * - CAMPUS-CSLAB-02 / B2-LAB2 / OUT-GATE / 14
 */
export function parseQrAnchorInput(rawInput) {
  const trimmed = String(rawInput || "").trim();
  if (!trimmed) {
    return { raw: "", qrCode: "", nodeId: null, token: "" };
  }

  let qrCode = "";
  let nodeId = null;

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.includes("?qr=") ||
    trimmed.includes("?spot=") ||
    trimmed.includes("?from=") ||
    trimmed.includes("?node=") ||
    trimmed.includes("&qr=") ||
    trimmed.includes("&spot=") ||
    trimmed.includes("&from=");

  if (looksLikeUrl) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://campus.local${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
      const parsed = new URL(normalizedUrl);
      const q = parsed.searchParams.get("qr") || parsed.searchParams.get("spot");
      const fromParam = parsed.searchParams.get("from") || parsed.searchParams.get("node");
      if (q) qrCode = q.trim().toUpperCase();
      if (fromParam && /^\d+$/.test(fromParam.trim())) {
        nodeId = Number(fromParam.trim());
      }
    } catch {
      // Fallback to raw token matching below
    }
  }

  if (!qrCode && !nodeId) {
    if (/^\d+$/.test(trimmed)) {
      nodeId = Number(trimmed);
    } else {
      qrCode = trimmed.toUpperCase();
    }
  }

  return {
    raw: trimmed,
    qrCode,
    nodeId,
    token: qrCode || (nodeId !== null ? String(nodeId) : ""),
  };
}

/**
 * Resolves a scanned QR payload or typed spot code against the loaded campus graph nodes.
 */
export function resolveQrAnchorNode(rawInput, nodes = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { matched: false, node: null, matchedBy: null, reason: "Campus map nodes are not loaded yet." };
  }

  const parsed = parseQrAnchorInput(rawInput);
  if (!parsed.token) {
    return { matched: false, node: null, matchedBy: null, reason: "Enter or scan a valid campus QR code." };
  }

  // 1. Exact numeric node ID match
  if (parsed.nodeId !== null) {
    const byId = nodes.find((n) => Number(n.id) === Number(parsed.nodeId));
    if (byId) {
      return { matched: true, node: byId, matchedBy: "node_id", parsed };
    }
  }

  // 2. Exact QR spot code match (raw or display)
  if (parsed.qrCode) {
    const byQr = nodes.find(
      (n) =>
        String(n.qrSpotCode || "").trim().toUpperCase() === parsed.qrCode ||
        String(n.displayQrSpotCode || "").trim().toUpperCase() === parsed.qrCode
    );
    if (byQr) {
      return { matched: true, node: byQr, matchedBy: "qr_spot_code", parsed };
    }

    // 3. Exact node code match (e.g. OUT-GATE, B2-LAB2)
    const byCode = nodes.find(
      (n) => String(n.code || "").trim().toUpperCase() === parsed.qrCode
    );
    if (byCode) {
      return { matched: true, node: byCode, matchedBy: "node_code", parsed };
    }

    // 4. Case-insensitive partial label match (for typed room names)
    if (parsed.qrCode.length >= 3) {
      const lower = parsed.raw.toLowerCase();
      const byLabel = nodes.find(
        (n) =>
          n.nodeType !== "corridor" &&
          String(n.label || "").toLowerCase().includes(lower)
      );
      if (byLabel) {
        return { matched: true, node: byLabel, matchedBy: "label", parsed };
      }
    }
  }

  return {
    matched: false,
    node: null,
    matchedBy: null,
    parsed,
    reason: `No campus location matched "${parsed.raw}". Try scanning an official campus QR or selecting a quick anchor.`,
  };
}

/**
 * Generates the canonical scannable deep-link URL for a map node so scanning
 * it with any phone camera opens the Campus Navigator locked at that node.
 */
export function buildWayfindingQrUrl(origin, node) {
  const safeOrigin = String(origin || "").replace(/\/+$/, "");
  if (!node) return `${safeOrigin}/campus-map`;

  const qrCode = String(node.qrSpotCode || node.displayQrSpotCode || "").trim();
  if (qrCode) {
    return `${safeOrigin}/campus-map?qr=${encodeURIComponent(qrCode)}`;
  }

  return `${safeOrigin}/campus-map?from=${encodeURIComponent(String(node.id))}`;
}

/**
 * Computes step-by-step live walkthrough progress along a calculated Dijkstra route.
 * Index 0 = at Start node (preparing for Step 1), Index steps.length = Arrived at Destination.
 */
export function buildWalkthroughState(routeResult, rawStepIndex = 0) {
  if (!routeResult?.found || !Array.isArray(routeResult.steps) || routeResult.steps.length === 0) {
    return {
      active: false,
      stepIndex: 0,
      totalSteps: 0,
      currentNodeId: null,
      currentFloorId: null,
      currentStep: null,
      nextStep: null,
      remainingMeters: 0,
      remainingSeconds: 0,
      progressPercent: 0,
      isArrived: false,
    };
  }

  const steps = routeResult.steps;
  const totalSteps = steps.length;
  const clampedIndex = Math.max(0, Math.min(Number(rawStepIndex) || 0, totalSteps));
  const isArrived = clampedIndex >= totalSteps;

  const currentNodeId = isArrived
    ? steps[totalSteps - 1].toNodeId
    : steps[clampedIndex].fromNodeId;

  const currentNodeObj = (routeResult.nodes || []).find(
    (n) => Number(n.id) === Number(currentNodeId)
  );
  const currentFloorId =
    currentNodeObj?.floorId ??
    (isArrived ? steps[totalSteps - 1].floorId : steps[clampedIndex].floorId);

  const remainingSteps = steps.slice(clampedIndex);
  const remainingMeters = Math.round(
    remainingSteps.reduce((acc, s) => acc + (Number(s.distanceMeters) || 0), 0)
  );

  // Proportional ETA using route's own walking speed ratio
  const totalMeters = Math.max(1, Number(routeResult.totalMeters) || 1);
  const remainingSeconds = isArrived
    ? 0
    : Math.max(
        5,
        Math.round((remainingMeters / totalMeters) * (Number(routeResult.estimatedSeconds) || 0))
      );

  const progressPercent = isArrived ? 100 : Math.round((clampedIndex / totalSteps) * 100);

  return {
    active: true,
    stepIndex: clampedIndex,
    totalSteps,
    currentNodeId,
    currentFloorId,
    currentStep: isArrived ? null : steps[clampedIndex],
    nextStep: clampedIndex + 1 < totalSteps ? steps[clampedIndex + 1] : null,
    remainingMeters,
    remainingSeconds,
    progressPercent,
    isArrived,
  };
}
