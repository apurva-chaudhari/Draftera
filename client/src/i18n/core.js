import en from "./locales/en.js";
import hi from "./locales/hi.js";
import mr from "./locales/mr.js";

/**
 * Framework-free translation core. Keeping it outside React lets plain helpers
 * (utils/format.js) translate too, and lets the unit tests run in Node.
 */
export const LANGUAGES = [
  { code: "en", name: "English", locale: "en-IN" },
  { code: "hi", name: "हिन्दी", locale: "hi-IN" },
  { code: "mr", name: "मराठी", locale: "mr-IN" },
];

const DICTIONARIES = { en, hi, mr };
const STORAGE_KEY = "draftera.lang";
const listeners = new Set();

function isSupported(code) {
  return LANGUAGES.some((language) => language.code === code);
}

function detectLanguage() {
  // Outside a browser (unit tests in Node) always start in English.
  if (!globalThis.document) return "en";

  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (isSupported(saved)) return saved;
  } catch {
    // Storage can be blocked (private mode); fall through to the browser language.
  }

  const preferred = globalThis.navigator?.language?.slice(0, 2);
  return isSupported(preferred) ? preferred : "en";
}

let current = detectLanguage();

export function getLanguage() {
  return current;
}

export function getLocale() {
  return LANGUAGES.find((language) => language.code === current).locale;
}

export function setLanguage(code) {
  if (!isSupported(code) || code === current) return;

  current = code;

  try {
    if (globalThis.document) globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    // Not being able to remember the choice is fine; it still applies now.
  }

  if (globalThis.document) document.documentElement.lang = code;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * translate("time.minAgo", { n: 5 }) -> "5 min ago"
 * - {name} placeholders are filled from `params`
 * - when params.count is given, "key_one" / "key_other" is preferred
 * - a missing translation falls back to English, then to the key itself,
 *   so an untranslated string never leaves a blank hole in the screen
 */
export function translate(key, params = {}, lang = current) {
  const dictionary = DICTIONARIES[lang] || en;
  let name = key;

  if (typeof params.count === "number") {
    const suffix = params.count === 1 ? "_one" : "_other";
    if (dictionary[key + suffix] || en[key + suffix]) name = key + suffix;
  }

  const template = dictionary[name] ?? en[name] ?? key;

  return template.replace(/\{(\w+)\}/g, (match, token) =>
    params[token] === undefined ? match : String(params[token])
  );
}

if (globalThis.document) document.documentElement.lang = current;
