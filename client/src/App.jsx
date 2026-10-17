
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import authService from "./services/authService.js";
import "./App.css";

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function verifySession() {
      if (!authService.getToken()) {
        if (isActive) setIsAuthenticated(false);
        return;
      }

      try {
        const response = await authService.getCurrentUser();

        if (isActive) {
          setIsAuthenticated(response.success === true);
        }
      } catch {
        authService.logout();

        if (isActive) {
          setIsAuthenticated(false);
        }
      }
    }

    verifySession();

    return () => {
      isActive = false;
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <main className="auth-page">
        <div className="auth-form-wrapper">
          <p>Verifying your session...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
