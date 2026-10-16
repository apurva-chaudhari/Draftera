
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService.js";

const summaryCards = [
  {
    label: "Active Projects",
    value: "08",
    detail: "Projects in progress",
    icon: "▦",
    color: "blue",
  },
  {
    label: "Current Drawings",
    value: "124",
    detail: "Across all projects",
    icon: "▤",
    color: "violet",
  },
  {
    label: "Pending Acknowledgments",
    value: "12",
    detail: "Require team confirmation",
    icon: "◷",
    color: "amber",
  },
  {
    label: "Open Clarifications",
    value: "06",
    detail: "Awaiting a response",
    icon: "☰",
    color: "green",
  },
];

const initialRevisions = [
  {
    drawing: "Structural Foundation Plan",
    code: "STR-001",
    project: "North Tower Residence",
    revision: "Rev C",
    date: "14 Oct 2026",
    status: "Pending acknowledgment",
    statusClass: "pending",
  },
  {
    drawing: "Electrical Layout - Level 02",
    code: "ELE-024",
    project: "Westside Commercial Hub",
    revision: "Rev B",
    date: "13 Oct 2026",
    status: "Under clarification",
    statusClass: "clarification",
  },
  {
    drawing: "Plumbing & Drainage Plan",
    code: "PLB-012",
    project: "North Tower Residence",
    revision: "Rev D",
    date: "12 Oct 2026",
    status: "Acknowledged",
    statusClass: "acknowledged",
  },
  {
    drawing: "HVAC Coordination Layout",
    code: "MEC-018",
    project: "Greenfield Office Park",
    revision: "Rev A",
    date: "11 Oct 2026",
    status: "Pending acknowledgment",
    statusClass: "pending",
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  function handleLogout() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  const filteredRevisions = initialRevisions.filter((item) => {
    const matchesSearch =
      item.drawing.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.project.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      (filter === "Pending" && item.statusClass === "pending") ||
      (filter === "Clarifications" &&
        item.statusClass === "clarification") ||
      (filter === "Acknowledged" &&
        item.statusClass === "acknowledged");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PROJECT OVERVIEW</p>
          <h1>Good morning, Apurva</h1>
          <p className="page-description">
            Here's what's happening across your construction projects.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              window.alert(
                "Drawing upload will be available in a later step."
              )
            }
          >
            <span aria-hidden="true">＋</span> Upload drawing
          </button>

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            <span aria-hidden="true">↪</span> Logout
          </button>
        </div>
      </header>

      <section className="summary-grid" aria-label="Project summary">
        {summaryCards.map((card) => (
          <article className="summary-card" key={card.label}>
            <div className="summary-card-top">
              <span
                className={`summary-icon ${card.color}`}
                aria-hidden="true"
              >
                {card.icon}
              </span>
              <span className="summary-indicator">Overview</span>
            </div>

            <p className="summary-label">{card.label}</p>
            <p className="summary-value">{card.value}</p>
            <p className="summary-detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent drawing revisions</h2>
            <p>Track the latest updates and team responses.</p>
          </div>

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSearch("");
              setFilter("All");
            }}
          >
            Reset filters
          </button>
        </div>

        <div className="revision-toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search drawings or projects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="filter-field">
            <span className="visually-hidden">
              Filter revisions by status
            </span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending acknowledgment</option>
              <option value="Clarifications">Under clarification</option>
              <option value="Acknowledged">Acknowledged</option>
            </select>
          </label>
        </div>

        <div className="revision-list">
          {filteredRevisions.map((item) => (
            <article className="revision-row" key={item.code}>
              <div className="drawing-file-icon" aria-hidden="true">
                <span>DWG</span>
              </div>

              <div className="revision-main">
                <h3>{item.drawing}</h3>
                <p>
                  {item.code} <span className="meta-divider">·</span>{" "}
                  {item.project}
                </p>
              </div>

              <div className="revision-version">
                <span className="revision-label">Revision</span>
                <strong>{item.revision}</strong>
              </div>

              <div className="revision-date">
                <span className="revision-label">Updated</span>
                <span>{item.date}</span>
              </div>

              <div className="revision-status">
                <span className={`status-badge ${item.statusClass}`}>
                  <span className="status-dot" />
                  {item.status}
                </span>
              </div>

              <button
                className="row-action"
                type="button"
                aria-label={`View ${item.drawing}`}
                onClick={() =>
                  window.alert(
                    `${item.drawing}: details will be added in a later step.`
                  )
                }
              >
                →
              </button>
            </article>
          ))}

          {filteredRevisions.length === 0 && (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No matching revisions</h3>
              <p>
                Try another search term or change the status filter.
              </p>
            </div>
          )}
        </div>

        <footer className="panel-footer">
          Showing {filteredRevisions.length} of {initialRevisions.length}{" "}
          sample revisions
        </footer>
      </section>

      <p className="demo-notice">
        Demo data is displayed for the initial UI. Live project data will be
        connected to the Draftera API in a later step.
      </p>
    </div>
  );
}

export default Dashboard;
