
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService.js";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await authService.login({
        email: email.trim(),
        password,
      });

      navigate("/", { replace: true });
    } catch (error) {
      setError(error.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-mark">D</div>
        <p className="brand-name">Draftera</p>
        <p className="brand-description">
          One source of truth for every drawing revision.
        </p>
        <div className="brand-note">
          <span className="brand-note-dot" />
          Built for construction teams
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrapper">
          <p className="auth-eyebrow">WELCOME BACK</p>
          <h1>Sign in to Draftera</h1>
          <p className="auth-subtitle">
            Keep your project team aligned with the latest drawings.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="auth-submit-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-footer">
            Secure access for your construction project team.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
