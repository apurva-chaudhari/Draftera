import { useCallback, useSyncExternalStore } from "react";
import { LANGUAGES, getLanguage, setLanguage, subscribe, translate } from "./core.js";

/**
 * useI18n() gives a component { t, lang, setLang, languages }.
 * Calling it also subscribes the component, so it redraws in the new
 * language the moment the user switches, without a page reload.
 */
export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLanguage, () => "en");

  // A new `t` each time the language changes keeps memoised children honest.
  const t = useCallback((key, params) => translate(key, params, lang), [lang]);

  return { t, lang, setLang: setLanguage, languages: LANGUAGES };
}
