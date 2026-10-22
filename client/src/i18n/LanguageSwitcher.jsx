import { useI18n } from "./I18nProvider.jsx";

/** Dropdown that works on the sign-in pages and inside the app. */
function LanguageSwitcher({ className = "" }) {
  const { t, lang, setLang, languages } = useI18n();

  return (
    <label className={`lang-switcher ${className}`}>
      <span className="lang-switcher-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
        </svg>
        <span className="sr-only">{t("lang.label")}</span>
      </span>
      <select value={lang} onChange={(event) => setLang(event.target.value)} aria-label={t("lang.label")}>
        {languages.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {language.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
