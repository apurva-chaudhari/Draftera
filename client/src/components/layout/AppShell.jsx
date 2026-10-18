import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import authService from "../../services/authService.js";
import Logo from "../ui/Logo.jsx";
import { initials, roleLabel } from "../../utils/format.js";

const icon = (path) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

// `short` is the label used in the phone bottom bar.
const NAV_ITEMS = [
  { to: "/", label: "Overview", short: "Home", end: true, icon: icon(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) },
  { to: "/projects", label: "Projects", short: "Projects", icon: icon(<><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></>) },
  { to: "/tasks", label: "My tasks", short: "Tasks", icon: icon(<><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>) },
  { to: "/clarifications", label: "Clarifications", short: "Questions", icon: icon(<><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>) },
];

function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="hazard-band" />
        <NavLink to="/" className="sidebar-brand">
          <Logo />
          <strong>Draftera</strong>
        </NavLink>

        <nav className="sidebar-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{initials(user.name)}</span>
            <div style={{ minWidth: 0 }}>
              <strong>{user.name}</strong>
              <span>{roleLabel(user.role)}</span>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 8 }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <div>
        <div className="mobile-bar">
          <div className="hazard-band" />
          <button type="button" aria-label="Open account menu" onClick={() => setMenuOpen(true)}>
            {icon(<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>)}
          </button>
          <Logo size={28} />
          <strong>Draftera</strong>
        </div>

        <main className="content">
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {item.icon}
              {item.short}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default AppShell;
