import { useState } from "react";
import projectService from "../../services/projectService.js";
import { roleLabel, initials, formatDate } from "../../utils/format.js";
import { Alert } from "../ui/Feedback.jsx";

function TeamPanel({ project, isSupervisor, onChanged }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("subcontractor");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleAdd(event) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const response = await projectService.addMember(project._id, { email, role });
      setMessage({ kind: "success", text: response.message });
      setEmail("");
      onChanged();
    } catch (requestError) {
      setMessage({ kind: "error", text: requestError.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      {isSupervisor && (
        <form className="card" onSubmit={handleAdd}>
          <div className="card-header">
            <div>
              <h2>Add a team member</h2>
              <p>They need a Draftera account first. Only people on this list can be chosen as revision recipients.</p>
            </div>
          </div>
          <div className="card-body">
            {message && <Alert kind={message.kind}>{message.text}</Alert>}
            <div className="form-grid">
              <label className="field">
                Email address
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required disabled={saving} />
              </label>
              <label className="field">
                Role on this project
                <select value={role} onChange={(e) => setRole(e.target.value)} disabled={saving}>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="site_engineer">Site engineer</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add to project"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Project team ({project.members.length})</h2>
        </div>
        {project.members.map((member) => (
          <div className="list-item" key={member.user._id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="user-avatar">{initials(member.user.name)}</span>
              <div>
                <span className="cell-title">{member.user.name}</span>
                <span className="cell-sub">{member.user.email}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="cell-title">{roleLabel(member.role)}</span>
              <span className="cell-sub">Added {formatDate(member.addedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamPanel;
