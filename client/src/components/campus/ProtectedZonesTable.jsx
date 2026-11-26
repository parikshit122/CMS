import { useMemo, useState } from "react";
import { ACCESS_TIER_META, CAMPUS_ACCESS_TIERS } from "../../utils/campusPathfinder";

export default function ProtectedZonesTable({
  floors = [],
  nodes = [],
  edges = [],
  onSelectFloor,
  onSelectNode,
  onQuickTierChange,
  busyKey = "",
}) {
  const [tierFilter, setTierFilter] = useState("all");
  const [query, setQuery] = useState("");

  const floorMap = useMemo(
    () => new Map(floors.map((f) => [Number(f.id), f])),
    [floors]
  );
  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [Number(n.id), n])),
    [nodes]
  );

  const rows = useMemo(() => {
    const list = [];

    for (const fl of floors) {
      const tier = fl.accessLevel || "public";
      if (tier !== "public" || fl.isSensitive) {
        list.push({
          key: `floor-${fl.id}`,
          kind: "floor",
          id: fl.id,
          floorId: fl.id,
          code: fl.isOutdoor ? "OUTDOOR" : `FL-${fl.floorNumber}`,
          name: fl.floorLabel,
          location: fl.isOutdoor ? "Campus Site Plan" : "Entire Floor",
          tier,
          notice: fl.restrictedNotice || "",
        });
      }
    }

    for (const n of nodes) {
      const tier = n.accessLevel || "public";
      if (tier !== "public" || n.isSensitive) {
        const fl = floorMap.get(Number(n.floorId));
        list.push({
          key: `node-${n.id}`,
          kind: "node",
          id: n.id,
          floorId: n.floorId,
          code: n.code,
          name: n.label,
          location: fl?.floorLabel || "Floor",
          tier,
          notice: n.restrictedNotice || "",
        });
      }
    }

    for (const e of edges) {
      const tier = e.accessLevel || "public";
      if (tier !== "public" || e.isSensitive) {
        const a = nodeMap.get(Number(e.fromNodeId));
        const b = nodeMap.get(Number(e.toNodeId));
        const fl = a ? floorMap.get(Number(a.floorId)) : null;
        list.push({
          key: `edge-${e.id}`,
          kind: "edge",
          id: e.id,
          floorId: a?.floorId ?? null,
          code: `EDGE-${e.id}`,
          name: `${a?.code || e.fromNodeId} ↔ ${b?.code || e.toNodeId}`,
          location: fl?.floorLabel || "Corridor",
          tier,
          notice: `${e.edgeType} (${e.distanceMeters}m)`,
        });
      }
    }

    return list.filter((row) => {
      if (tierFilter !== "all" && row.tier !== tierFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.notice.toLowerCase().includes(q)
      );
    });
  }, [floors, nodes, edges, floorMap, nodeMap, tierFilter, query]);

  return (
    <section className="cn-panel" aria-label="Protected Zones and Access Policies">
      <div className="cn-panel__title" style={{ flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span>Protected Zones &amp; Security Policy Directory</span>
          <div style={{ fontSize: "0.78rem", fontWeight: 400, color: "var(--av-ink-muted)", marginTop: "2px" }}>
            Unauthorized viewers see these places as locked restricted areas and are blocked from routing into or through them.
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <input
            type="search"
            className="cn-input"
            style={{ width: "220px", minHeight: "36px", padding: "6px 10px" }}
            placeholder="Search restricted room or code..."
            aria-label="Search protected zones"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="cn-select"
            style={{ width: "160px", minHeight: "36px", padding: "6px 10px" }}
            aria-label="Filter protected zones by tier"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="all">All Tiers</option>
            <option value="student">Verified Student</option>
            <option value="staff">Staff Only</option>
            <option value="admin">Admin Only</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="cn-empty-state">
          <i className="bx bx-shield-quarter" aria-hidden="true" />
          <strong>No protected zones match this filter.</strong>
          <span>
            Select any room, corridor, or floor in the blueprint editor to assign a Verified Student, Staff, or Admin access tier.
          </span>
        </div>
      ) : (
        <div className="cn-table-wrap">
          <table className="cn-policy-table">
            <thead>
              <tr>
                <th>Scope</th>
                <th>Code</th>
                <th>Location / Zone</th>
                <th>Floor</th>
                <th>Required Tier</th>
                <th>Restriction Notice</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td style={{ textTransform: "capitalize" }}>{row.kind}</td>
                  <td className="av-mono" style={{ fontWeight: 700, fontSize: "0.76rem" }}>
                    {row.code}
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  <td style={{ color: "var(--av-ink-muted)" }}>{row.location}</td>
                  <td>
                    <select
                      aria-label={`Change clearance tier for ${row.name}`}
                      className={`cn-tier-select cn-tier-select--${row.tier}`}
                      disabled={busyKey === row.key}
                      value={row.tier}
                      onChange={(e) =>
                        onQuickTierChange?.(row.kind, row.id, e.target.value, row.key)
                      }
                    >
                      {CAMPUS_ACCESS_TIERS.map((t) => (
                        <option key={t} value={t}>
                          {ACCESS_TIER_META[t].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ color: "var(--av-ink-muted)", maxWidth: "280px" }}>
                    {row.notice || ACCESS_TIER_META[row.tier]?.description}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="av-btn av-btn--ghost av-btn--compact"
                      onClick={() => {
                        if (row.kind === "node") {
                          onSelectNode?.(row.id, row.floorId);
                        } else if (row.floorId) {
                          onSelectFloor?.(row.floorId);
                        }
                      }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
