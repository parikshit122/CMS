import React, { useState, useMemo, useCallback } from "react";
import StatusBadge from "../complaint/StatusBadge";


const STATUS_FILTERS = [
  { key: "all",         label: "All"         },
  { key: "pending",     label: "Pending"     },
  { key: "in-progress", label: "In Progress" },
  { key: "resolved",    label: "Resolved"    },
  { key: "rejected",    label: "Rejected"    },
];

const LOCKED_STATUSES = ["resolved", "rejected"];

const AssignedComplaintsTable = ({
  complaints = [],
  loading     = false,
  onSelectComplaint,
}) => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch]             = useState("");

  /* ── Filtered & searched list ── */
  const filtered = useMemo(() => {
    let list = [...complaints];

    if (activeFilter !== "all") {
      list = list.filter((c) => c.status === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.studentName?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [complaints, activeFilter, search]);

  const handleRowClick = useCallback(
    (complaint) => {
      if (LOCKED_STATUSES.includes(complaint.status)) return;
      onSelectComplaint(complaint);
    },
    [onSelectComplaint]
  );

  /* ── Priority badge ── */
  const PriorityBadge = ({ priority }) => {
    const map = {
      low:    { label: "Low",    cls: "ssd-priority--low"    },
      medium: { label: "Medium", cls: "ssd-priority--medium" },
      high:   { label: "High",   cls: "ssd-priority--high"   },
    };
    const cfg = map[priority] || map.low;
    return (
      <span className={`ssd-priority-badge ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  /* ── Skeleton rows ── */
  if (loading) {
    return (
      <div className="ssd-table-card">
        <TableHeader
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          search={search}
          setSearch={setSearch}
          count={0}
        />
        <div className="ssd-table-wrap">
          <table className="ssd-table">
            <TableHead />
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="ssd-table__row">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}>
                      <span className="ssd-skeleton ssd-skeleton--row" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="ssd-table-card">
      <TableHeader
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        search={search}
        setSearch={setSearch}
        count={filtered.length}
      />

      <div className="ssd-table-wrap">
        <table className="ssd-table">
          <TableHead />
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    search={search}
                    filter={activeFilter}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((complaint) => {
                const isLocked = LOCKED_STATUSES.includes(complaint.status);
                return (
                  <tr
                    key={complaint._id}
                    className={[
                      "ssd-table__row",
                      isLocked
                        ? "ssd-table__row--locked"
                        : "ssd-table__row--clickable",
                    ].join(" ")}
                    onClick={() => handleRowClick(complaint)}
                    title={
                      isLocked
                        ? `This complaint is ${complaint.status} and cannot be modified`
                        : "Click to update status"
                    }
                  >
                    {/* ID */}
                    <td className="ssd-table__cell ssd-table__cell--id">
                      <span className="ssd-complaint-id">
                        #{complaint._id?.slice(-6).toUpperCase()}
                      </span>
                    </td>

                    {/* Title + Category */}
                    <td className="ssd-table__cell">
                      <div className="ssd-complaint-title">
                        {complaint.title}
                      </div>
                      <div className="ssd-complaint-category">
                        {complaint.category}
                      </div>
                    </td>

                    {/* Student */}
                    <td className="ssd-table__cell">
                      <div className="ssd-student-info">
                        <div className="ssd-student-avatar">
                          {complaint.studentName?.charAt(0).toUpperCase()}
                        </div>
                        <span>{complaint.studentName || "—"}</span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="ssd-table__cell">
                      <PriorityBadge priority={complaint.priority} />
                    </td>

                    {/* Status */}
                    <td className="ssd-table__cell">
                      <StatusBadge status={complaint.status} />
                    </td>

                    {/* Action */}
                    <td className="ssd-table__cell ssd-table__cell--action">
                      {isLocked ? (
                        <span className="ssd-lock-icon" title="Locked">
                          <i className="bx bx-lock-alt" />
                        </span>
                      ) : (
                        <button
                          className="ssd-update-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectComplaint(complaint);
                          }}
                        >
                          Update
                          <i className="bx bx-chevron-right" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div className="ssd-table-footer">
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{complaints.length}</strong> complaints
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ── */
const TableHeader = ({
  activeFilter, setActiveFilter,
  search, setSearch, count,
}) => (
  <div className="ssd-table-header">
    <div className="ssd-table-header__top">
      <div>
        <h3 className="ssd-table-title">Assigned Complaints</h3>
        <p className="ssd-table-sub">
          Manage and update your assigned complaint statuses
        </p>
      </div>
      {/* Search */}
      <div className="ssd-table-search">
        <i className="bx bx-search" />
        <input
          type="text"
          placeholder="Search complaints…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="ssd-table-search__clear"
            onClick={() => setSearch("")}
          >
            <i className="bx bx-x" />
          </button>
        )}
      </div>
    </div>

    {/* Filter pills */}
    <div className="ssd-filter-pills">
      {STATUS_FILTERS.map((f) => (
        <button
          key={f.key}
          className={[
            "ssd-filter-pill",
            activeFilter === f.key ? "ssd-filter-pill--active" : "",
          ].join(" ")}
          onClick={() => setActiveFilter(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  </div>
);

const TableHead = () => (
  <thead>
    <tr>
      <th>ID</th>
      <th>Complaint</th>
      <th>Student</th>
      <th>Priority</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  </thead>
);

const EmptyState = ({ search, filter }) => (
  <div className="ssd-empty">
    <div className="ssd-empty__icon">
      {search ? "🔍" : "📋"}
    </div>
    <p className="ssd-empty__title">
      {search
        ? `No results for "${search}"`
        : filter === "all"
          ? "No complaints assigned yet"
          : `No ${filter} complaints`}
    </p>
    <p className="ssd-empty__sub">
      {search
        ? "Try a different search term"
        : "Check back later for new assignments"}
    </p>
  </div>
);

export default AssignedComplaintsTable;