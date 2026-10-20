import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useResource from "../hooks/useResource.js";
import projectService from "../services/projectService.js";
import CreateProjectForm from "../components/projects/CreateProjectForm.jsx";
import { ProjectStatus } from "../components/ui/Badge.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import { isOpenProject, roleLabel } from "../utils/format.js";

function Projects() {
  const { user } = useAuth();
  // Subcontractors are invited onto projects; they do not start them.
  const canCreate = user.role !== "subcontractor";
  const { data, error, loading, reload } = useResource("projects", async () =>
    (await projectService.list()).projects
  );
  const projects = useMemo(() => data || [], [data]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  // Finished and archived projects stay out of the way until asked for.
  const [status, setStatus] = useState("open");

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesText =
        !text ||
        project.name.toLowerCase().includes(text) ||
        project.code.toLowerCase().includes(text);
      const matchesStatus =
        status === "all" ||
        (status === "open" ? isOpenProject(project.status) : project.status === status);
      return matchesText && matchesStatus;
    });
  }, [projects, search, status]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every project you supervise or work on. Your role can differ from one project to the next."
        actions={
          canCreate && !showForm && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              New project
            </button>
          )
        }
      />

      {showForm && (
        <CreateProjectForm
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

      {error && <Alert kind="error" onRetry={reload}>{error}</Alert>}

      <div className="toolbar">
        <input className="input" type="search" placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search projects" />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="open">Active and on hold</option>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <Loading label="Loading projects…" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState title={projects.length === 0 ? "No projects yet" : "No matching projects"}>
            {projects.length === 0
              ? canCreate
                ? "Create a project to start publishing drawing revisions to your team."
                : "You will see projects here once a supervisor adds you to their team."
              : status === "open"
                ? "Completed and archived projects are hidden here. Choose “All statuses” to see them."
                : "Try a different search or status filter."}
          </EmptyState>
        </div>
      ) : (
        <div className="projects-grid">
          {visible.map((project) => (
            <Link className={`card project-card status-${project.status}`} to={`/projects/${project._id}`} key={project._id}>
              <div className="project-card-top">
                <span className="code-tag">{project.code}</span>
                <ProjectStatus status={project.status} />
              </div>
              <h3>{project.name}</h3>
              <p>{project.description || "No description provided."}</p>
              <div className="project-card-foot">
                <span>{project.memberCount} team members</span>
                <strong>{roleLabel(project.myRole)}</strong>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default Projects;
