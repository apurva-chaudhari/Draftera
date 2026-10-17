import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService.js";
import { apiRequest } from "../services/api.js";
import drawingService from "../services/drawingService.js";

const summaryCards = [
  {
    key: "activeProjects",
    label: "Active Projects",
    detail: "Projects in progress",
    icon: "▦",
    color: "blue",
  },
  {
    key: "currentDrawings",
    label: "Current Drawings",
    detail: "Published drawing revisions",
    icon: "▤",
    color: "violet",
  },
  {
    key: "pendingAcknowledgments",
    label: "Pending Acknowledgments",
    detail: "Require your confirmation",
    icon: "◷",
    color: "amber",
  },
  {
    key: "openClarifications",
    label: "Open Clarifications",
    detail: "Awaiting resolution",
    icon: "☰",
    color: "green",
  },
];

const emptySummary = {
  activeProjects: 0,
  currentDrawings: 0,
  pendingAcknowledgments: 0,
  openClarifications: 0,
};

function Dashboard() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectSuccess, setProjectSuccess] = useState("");
  const [projectFormError, setProjectFormError] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [drawingProjectId, setDrawingProjectId] = useState("");
  const [drawingNumber, setDrawingNumber] = useState("");
  const [drawingTitle, setDrawingTitle] = useState("");
  const [drawingDescription, setDrawingDescription] = useState("");
  const [revisionNumber, setRevisionNumber] = useState("A");
  const [issueDate, setIssueDate] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [drawingFile, setDrawingFile] = useState(null);

  async function loadProjects() {
    setProjectsLoading(true);
    setProjectsError("");

    try {
      const response = await apiRequest("/projects");

      setProjects(response.projects || []);
    } catch (requestError) {
      setProjectsError(requestError.message || "Unable to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  }

  async function loadSummary() {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/dashboard/summary");
      setSummary(response.summary || emptySummary);
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  async function initializeDashboard() {
    await Promise.all([
      loadSummary(),
      loadProjects(),
    ]);
  }

  initializeDashboard();
}, []);

  function handleLogout() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  function resetProjectForm() {
    setProjectName("");
    setProjectCode("");
    setProjectDescription("");
    setProjectFormError("");
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    setProjectFormError("");
    setProjectSuccess("");

    const name = projectName.trim();
    const code = projectCode.trim().toUpperCase();
    const description = projectDescription.trim();

    if (name.length < 2 || name.length > 150) {
      setProjectFormError("Project name must contain 2–150 characters.");
      return;
    }

    if (
      code.length < 2 ||
      code.length > 30 ||
      !/^[A-Z0-9][A-Z0-9_-]*$/.test(code)
    ) {
      setProjectFormError(
        "Use 2–30 characters for the code: letters, numbers, hyphens, or underscores.",
      );
      return;
    }

    if (description.length > 2000) {
      setProjectFormError("Description cannot exceed 2000 characters.");
      return;
    }

    setCreatingProject(true);

    try {
      const response = await apiRequest("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          code,
          description,
        }),
      });

      if (response.project) {
        setProjects((previousProjects) => [
          response.project,
          ...previousProjects.filter(
            (project) => project._id !== response.project._id,
          ),
        ]);
      } else {
        await loadProjects();
      }

      setProjectSuccess(response.message || "Project created successfully.");

      resetProjectForm();
      setShowProjectForm(false);

      // Refresh the dashboard totals after project creation.
      await loadSummary();
    } catch (requestError) {
      setProjectFormError(requestError.message || "Unable to create project.");
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleUploadDrawing(event) {
    event.preventDefault();
    setUploadError("");
    setUploadSuccess("");

    if (!drawingProjectId) {
      setUploadError("Please select a project.");
      return;
    }

    if (!drawingFile) {
      setUploadError("Please select a PDF drawing.");
      return;
    }

    if (drawingFile.type !== "application/pdf") {
      setUploadError("Only PDF drawing files are allowed.");
      return;
    }

    if (drawingFile.size > 10 * 1024 * 1024) {
      setUploadError("The PDF must be 10 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("projectId", drawingProjectId);
    formData.append("drawingNumber", drawingNumber.trim());
    formData.append("title", drawingTitle.trim());
    formData.append("description", drawingDescription.trim());
    formData.append("revisionNumber", revisionNumber.trim());
    formData.append("issueDate", issueDate);
    formData.append("changeSummary", changeSummary.trim());
    formData.append("file", drawingFile);

    setUploadingDrawing(true);

    try {
      const response = await drawingService.uploadRevision(formData);

      setUploadSuccess(
        response.message || "Drawing revision uploaded as a draft.",
      );

      setDrawingNumber("");
      setDrawingTitle("");
      setDrawingDescription("");
      setRevisionNumber("A");
      setIssueDate("");
      setChangeSummary("");
      setDrawingFile(null);

      event.target.reset();
      await loadSummary();
    } catch (requestError) {
      setUploadError(requestError.message || "Unable to upload the drawing.");
    } finally {
      setUploadingDrawing(false);
    }
  }

  const filteredProjects = projects.filter((project) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      project.name?.toLowerCase().includes(searchText) ||
      project.code?.toLowerCase().includes(searchText) ||
      project.description?.toLowerCase().includes(searchText);

    const matchesStatus =
      filter === "All" ||
      (filter === "Active" && project.status === "active") ||
      (filter === "On hold" && project.status === "on_hold") ||
      (filter === "Completed" && project.status === "completed") ||
      (filter === "Archived" && project.status === "archived");

    return matchesSearch && matchesStatus;
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
            onClick={() => {
              setUploadError("");
              setUploadSuccess("");
              setShowUploadForm((visible) => !visible);
            }}
          >
            <span aria-hidden="true">＋</span>
            {showUploadForm ? "Close upload" : "Upload drawing"}
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

      {error && (
        <div className="dashboard-error" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={loadSummary}>
            Try again
          </button>
        </div>
      )}

      {showUploadForm && (
        <section className="content-panel" aria-labelledby="upload-heading">
          <div className="panel-heading">
            <div>
              <h2 id="upload-heading">Upload drawing revision</h2>
              <p>Upload a PDF as a draft before publishing it to recipients.</p>
            </div>
          </div>

          {uploadSuccess && (
            <div className="project-success" role="status">
              {uploadSuccess}
            </div>
          )}

          {uploadError && (
            <div className="dashboard-error" role="alert">
              {uploadError}
            </div>
          )}

          <form className="project-form" onSubmit={handleUploadDrawing}>
            <label>
              Construction project *
              <select
                value={drawingProjectId}
                onChange={(event) => setDrawingProjectId(event.target.value)}
                required
                disabled={uploadingDrawing || projectsLoading}
              >
                <option value="">Select a project</option>
                {projects
                  .filter((project) => project.status === "active")
                  .map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.code} — {project.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Drawing number *
              <input
                value={drawingNumber}
                onChange={(event) => setDrawingNumber(event.target.value)}
                placeholder="e.g. STR-001"
                maxLength={100}
                required
                disabled={uploadingDrawing}
              />
            </label>

            <label>
              Drawing title *
              <input
                value={drawingTitle}
                onChange={(event) => setDrawingTitle(event.target.value)}
                placeholder="e.g. Foundation layout"
                minLength={2}
                maxLength={200}
                required
                disabled={uploadingDrawing}
              />
            </label>

            <label>
              Revision number *
              <input
                value={revisionNumber}
                onChange={(event) => setRevisionNumber(event.target.value)}
                placeholder="e.g. A or B"
                maxLength={30}
                required
                disabled={uploadingDrawing}
              />
            </label>

            <label>
              Issue date *
              <input
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                required
                disabled={uploadingDrawing}
              />
            </label>

            <label>
              Change summary *
              <textarea
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value)}
                placeholder="Explain what changed in this revision."
                minLength={3}
                maxLength={5000}
                rows={4}
                required
                disabled={uploadingDrawing}
              />
            </label>

            <label>
              Description (optional)
              <textarea
                value={drawingDescription}
                onChange={(event) => setDrawingDescription(event.target.value)}
                placeholder="Additional drawing details"
                maxLength={2000}
                rows={2}
                disabled={uploadingDrawing}
              />
            </label>

            <label>
              Drawing PDF * (maximum 10 MB)
              <input
                type="file"
                accept="application/pdf,.pdf"
                required
                disabled={uploadingDrawing}
                onChange={(event) =>
                  setDrawingFile(event.target.files?.[0] || null)
                }
              />
            </label>

            <div className="project-form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={
                  uploadingDrawing || projectsLoading || projects.length === 0
                }
              >
                {uploadingDrawing ? "Uploading PDF..." : "Upload as draft"}
              </button>

              <button
                className="logout-button"
                type="button"
                disabled={uploadingDrawing}
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadError("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="summary-grid" aria-label="Project summary">
        {summaryCards.map((card) => (
          <article className="summary-card" key={card.key}>
            <div className="summary-card-top">
              <span className={`summary-icon ${card.color}`} aria-hidden="true">
                {card.icon}
              </span>
              <span className="summary-indicator">
                {loading ? "Loading" : "Live data"}
              </span>
            </div>

            <p className="summary-label">{card.label}</p>
            <p className="summary-value" aria-live="polite">
              {loading
                ? "—"
                : Number(summary[card.key] ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="summary-detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="content-panel" aria-labelledby="projects-heading">
        <div className="panel-heading">
          <div>
            <h2 id="projects-heading">Construction projects</h2>
            <p>Organize projects before publishing drawing revisions.</p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setProjectSuccess("");
              setProjectFormError("");
              setShowProjectForm((visible) => !visible);
            }}
          >
            {showProjectForm ? "Cancel" : "＋ New project"}
          </button>
        </div>

        {projectSuccess && (
          <div className="project-success" role="status">
            {projectSuccess}
          </div>
        )}

        {showProjectForm && (
          <form className="project-form" onSubmit={handleCreateProject}>
            <h3>Create a construction project</h3>

            {projectFormError && (
              <div className="dashboard-error" role="alert">
                {projectFormError}
              </div>
            )}

            <label>
              Project name *
              <input
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Riverside Commercial Building"
                minLength={2}
                maxLength={150}
                required
                disabled={creatingProject}
              />
            </label>

            <label>
              Project code *
              <input
                type="text"
                value={projectCode}
                onChange={(event) =>
                  setProjectCode(event.target.value.toUpperCase())
                }
                placeholder="e.g. RCB-001"
                minLength={2}
                maxLength={30}
                pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                title="Use letters, numbers, hyphens, or underscores."
                required
                disabled={creatingProject}
              />
            </label>

            <label>
              Description
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Project details (optional)"
                maxLength={2000}
                rows={3}
                disabled={creatingProject}
              />
            </label>

            <div className="project-form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={creatingProject}
              >
                {creatingProject ? "Creating..." : "Create project"}
              </button>

              <button
                className="logout-button"
                type="button"
                disabled={creatingProject}
                onClick={() => {
                  resetProjectForm();
                  setShowProjectForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {projectsError && (
          <div className="dashboard-error" role="alert">
            <p>{projectsError}</p>
            <button
              className="text-button"
              type="button"
              onClick={loadProjects}
            >
              Try again
            </button>
          </div>
        )}

        <div className="revision-toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search projects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="filter-field">
            <span className="visually-hidden">Filter projects by status</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="On hold">On hold</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </label>
        </div>

        {projectsLoading ? (
          <div className="empty-state">
            <h3>Loading projects...</h3>
            <p>Retrieving projects available to your account.</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">▦</span>
            <h3>
              {projects.length === 0
                ? "No projects available yet"
                : "No matching projects"}
            </h3>
            <p>
              {projects.length === 0
                ? "Create your first construction project to get started with drawing revision tracking."
                : "Try another search term or status filter."}
            </p>

            {projects.length === 0 && !showProjectForm && (
              <button
                className="primary-button"
                type="button"
                onClick={() => setShowProjectForm(true)}
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <article className="project-card" key={project._id}>
                <div className="project-card-top">
                  <span className="project-code">{project.code}</span>
                  <span
                    className={`project-status ${project.status || "active"}`}
                  >
                    {(project.status || "active")
                      .replace("_", " ")
                      .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  </span>
                </div>

                <h3>{project.name}</h3>

                <p className="project-description">
                  {project.description || "No description provided."}
                </p>

                <div className="project-card-footer">
                  <span>Project supervisor</span>
                  <strong>
                    {project.supervisor?.name || "Assigned supervisor"}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent drawing revisions</h2>
            <p>Published revisions and team responses will appear here.</p>
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

        <div className="empty-state">
          <span aria-hidden="true">▤</span>
          <h3>No revision activity available yet</h3>
          <p>
            Once drawing revisions are published, their details and
            acknowledgment status will appear here.
          </p>
        </div>

        <footer className="panel-footer">
          Revision activity will be connected in a later step.
        </footer>
      </section>
    </div>
  );
}

export default Dashboard;
