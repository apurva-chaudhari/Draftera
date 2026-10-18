import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import Clarifications from "./pages/Clarifications.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import MyTasks from "./pages/MyTasks.jsx";
import ProjectDetail from "./pages/ProjectDetail.jsx";
import Projects from "./pages/Projects.jsx";
import Register from "./pages/Register.jsx";
import RevisionDetail from "./pages/RevisionDetail.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Everything below requires a verified session and gets the sidebar. */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/revisions/:revisionId" element={<RevisionDetail />} />
          <Route path="/tasks" element={<MyTasks />} />
          <Route path="/clarifications" element={<Clarifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
