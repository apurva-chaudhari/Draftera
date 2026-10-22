
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService.js";
import BlueprintArt from "../components/ui/BlueprintArt.jsx";
import Logo from "../components/ui/Logo.jsx";
import LanguageSwitcher from "../i18n/LanguageSwitcher.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

function Register() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("site_engineer");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError(t("auth.err.name"));
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError(t("auth.err.passwordLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.err.passwordMatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });

      // Registration also signs the user in, so go straight to the app.
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        requestError.message || t("auth.registerFailed")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Logo size={48} />
        <p className="brand-name">Draftera</p>
        <p className="brand-description">
          {t("auth.register.tagline")}
        </p>
        <div className="brand-note">
          <span className="brand-note-dot" />
          {t("auth.builtFor")}
        </div>
        <BlueprintArt />
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrapper">
          <LanguageSwitcher className="lang-switcher-auth" />
          <p className="auth-eyebrow">{t("auth.register.eyebrow")}</p>
          <h1>{t("auth.register.title")}</h1>
          <p className="auth-subtitle">
            {t("auth.register.subtitle")}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="register-name">{t("auth.fullName")}</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder={t("auth.fullNamePlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={100}
              disabled={isSubmitting}
            />

            <label htmlFor="register-email">{t("auth.email")}</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              disabled={isSubmitting}
            />

            <label htmlFor="register-role">{t("auth.workAs")}</label>
            <select
              id="register-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="site_engineer">{t("auth.role.siteEngineer")}</option>
              <option value="subcontractor">{t("role.subcontractor")}</option>
            </select>
            <p className="auth-hint">
              {role === "subcontractor"
                ? t("auth.hint.subcontractor")
                : t("auth.hint.siteEngineer")}
            </p>

            <label htmlFor="register-password">{t("auth.password")}</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.passwordNew")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={72}
              disabled={isSubmitting}
            />

            <label htmlFor="confirm-password">{t("auth.confirmPassword")}</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.confirmPlaceholder")}
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
              {isSubmitting ? t("auth.creating") : t("auth.createAccount")}
            </button>
          </form>

          <p className="auth-footer">
            {t("auth.haveAccount")} <Link to="/login">{t("auth.signIn")}</Link>
          </p>
          <p className="auth-footer">
            {t("auth.registerNote")}
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;
