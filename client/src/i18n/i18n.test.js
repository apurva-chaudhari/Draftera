import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import en from "./locales/en.js";
import hi from "./locales/hi.js";
import mr from "./locales/mr.js";
import { getLanguage, setLanguage, translate } from "./core.js";
import { dueLabel, roleLabel, timeAgo } from "../utils/format.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("Hindi and Marathi define exactly the keys English does", () => {
  for (const [name, dictionary] of [["hi", hi], ["mr", mr]]) {
    const missing = Object.keys(en).filter((key) => !(key in dictionary));
    const extra = Object.keys(dictionary).filter((key) => !(key in en));
    assert.deepEqual(missing, [], `${name} is missing keys`);
    assert.deepEqual(extra, [], `${name} has keys English does not`);
  }
});

test("translations keep the same {placeholders} as English", () => {
  for (const [name, dictionary] of [["hi", hi], ["mr", mr]]) {
    for (const key of Object.keys(en)) {
      assert.deepEqual(placeholders(dictionary[key]), placeholders(en[key]), `${name}: ${key}`);
    }
  }
});

test("no translation is left empty", () => {
  for (const dictionary of [en, hi, mr]) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.ok(value.trim().length > 0, key);
    }
  }
});

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(jsx?|js)$/.test(entry.name) && !entry.name.endsWith(".test.js") ? [full] : [];
  });
}

test("every key used in the code exists in the English dictionary", () => {
  const srcDirectory = path.join(here, "..");
  const used = new Set();

  for (const file of sourceFiles(srcDirectory)) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/\b(?:t|translate)\(\s*"([\w.]+)"/g)) used.add(match[1]);
  }

  const known = (key) => key in en || `${key}_one` in en;
  const unknown = [...used].filter((key) => !known(key));
  assert.deepEqual(unknown, []);
});

test("plurals pick the singular or plural form", () => {
  assert.equal(translate("projects.members", { count: 1 }), "1 team member");
  assert.equal(translate("projects.members", { count: 4 }), "4 team members");
});

test("switching language changes helpers that return text", () => {
  assert.equal(getLanguage(), "en");
  assert.equal(roleLabel("subcontractor"), "Subcontractor");

  setLanguage("hi");
  assert.equal(roleLabel("subcontractor"), hi["role.subcontractor"]);
  assert.match(timeAgo(new Date(Date.now() - 5 * 60000).toISOString()), /5 मिनट पहले/);
  assert.match(dueLabel(null), /समय सीमा/);

  setLanguage("mr");
  assert.equal(roleLabel("subcontractor"), mr["role.subcontractor"]);

  setLanguage("en");
  assert.equal(roleLabel("subcontractor"), "Subcontractor");
});

test("a missing key falls back to the key itself instead of crashing", () => {
  assert.equal(translate("does.not.exist"), "does.not.exist");
});
