import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import authService from "../../services/authService.js";
import { AuthContext } from "../../context/AuthContext.jsx";

/**
 * Verifies the stored token with the server before showing any protected
 * page, then shares the verified user with the page tree.
 */
function ProtectedRoute({ children }) {
  const [state, setState] = useState({ status: "checking", user: null });

  useEffect(() => {
    let isActive = true;

    async function verifySession() {
      if (!authService.getToken()) {
        if (isActive) setState({ status: "anonymous", user: null });
        return;
      }

      try {
        const response = await authService.getCurrentUser();

        if (isActive) {
          setState(
            response.success
              ? { status: "authenticated", user: response.user }
              : { status: "anonymous", user: null }
          );
        }
      } catch {
        authService.logout();
        if (isActive) setState({ status: "anonymous", user: null });
      }
    }

    verifySession();

    return () => {
      isActive = false;
    };
  }, []);

  if (state.status === "checking") {
    return (
      <div className="loading-block" style={{ minHeight: "100vh" }}>
        <span className="spinner" /> Verifying your session…
      </div>
    );
  }

  if (state.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthContext.Provider value={{ user: state.user }}>
      {children}
    </AuthContext.Provider>
  );
}

export default ProtectedRoute;
