import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useResource from "../hooks/useResource.js";
import projectService from "../services/projectService.js";
import CreateProjectForm from "../components/projects/CreateProjectForm.jsx";
import { ProjectStatus } from "../components/ui/Badge.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import { roleLabel } from "../utils/format.js";

function Projects() {
  const { data, error, loading, reload } = useResource("projects", async () =>
    (await projectService.list()).projects
  );
  const projects = useMemo(() => data || [], [data]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesText =
        !text ||
        project.name.toLowerCase().includes(text) ||
        project.code.toLowerCase().includes(text);
      return matchesText && (status === "all" || project.status === status);
    });
  }, [projects, search, status]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every project you supervise or work on. Your role can differ from one project to the next."
        actions={
          !showForm && (
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
              ? "Create a project to start publishing drawing revisions to your team."
              : "Try a different search or status filter."}
          </EmptyState>
        </div>
      ) : (
        <div className="projects-grid">
          {visible.map((project) => (
            <Link className="card project-card" to={`/projects/${project._id}`} key={project._id}>
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
