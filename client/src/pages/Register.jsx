
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService.js";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError("Name must be between 2 and 100 characters.");
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError("Password must be between 8 and 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      // Registration will sign the user in after the auth service
      // is updated in a later step.
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(
        requestError.message || "Unable to create your account. Please try again."
      );
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
          Every team aligned with the right drawing revision.
        </p>
        <div className="brand-note">
          <span className="brand-note-dot" />
          Built for construction teams
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrapper">
          <p className="auth-eyebrow">GET STARTED</p>
          <h1>Create your account</h1>
          <p className="auth-subtitle">
            Join your construction team and keep drawing revisions clear.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={100}
              disabled={isSubmitting}
            />

            <label htmlFor="register-email">Work email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              disabled={isSubmitting}
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={72}
              disabled={isSubmitting}
            />

            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p className="auth-footer">
            Registration creates a site engineer account.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;
