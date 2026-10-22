import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService.js";
import BlueprintArt from "../components/ui/BlueprintArt.jsx";
import Logo from "../components/ui/Logo.jsx";
import LanguageSwitcher from "../i18n/LanguageSwitcher.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

function Login() {
  const { t } = useI18n();
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
      setError(error.message || t("auth.loginFailed"));
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
          {t("auth.login.tagline")}
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
          <p className="auth-eyebrow">{t("auth.login.eyebrow")}</p>
          <h1>{t("auth.login.title")}</h1>
          <p className="auth-subtitle">
            {t("auth.login.subtitle")}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />

            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
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
              {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>


          <p className="auth-footer">
            {t("auth.newHere")} <Link to="/register">{t("auth.createAccountLink")}</Link>
          </p>
          <p className="auth-footer">
            {t("auth.secureAccess")}
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
