'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const LANGUAGE_LABELS = {
  shell: 'Shell',
  bash: 'Bash',
  sh: 'Shell',
  curl: 'cURL',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  node: 'Node',
  python: 'Python',
  ruby: 'Ruby',
  php: 'PHP',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  objective_c: 'Objective-C',
  elixir: 'Elixir',
  clojure: 'Clojure',
  scala: 'Scala',
  http: 'HTTP',
  graphql: 'GraphQL',
  sql: 'SQL',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  plaintext: 'Text',
};

function labelFor(code) {
  if (LANGUAGE_LABELS[code]) return LANGUAGE_LABELS[code];
  return code.charAt(0).toUpperCase() + code.slice(1);
}

// Slate's language_tabs accepts plain strings and { code: "Display Label" }
// single-pair mappings, often mixed in one list. Normalize both forms.
function normalizeLanguageTabs(raw) {
  if (!Array.isArray(raw)) return [];
  const tabs = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      tabs.push({ code: entry, label: labelFor(entry) });
    } else if (entry && typeof entry === 'object') {
      for (const [code, label] of Object.entries(entry)) {
        tabs.push({ code, label: label == null ? labelFor(code) : String(label) });
      }
    }
  }
  return tabs;
}

// Parses a Slate-style document: optional YAML frontmatter delimited by ---.
function parseFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { frontmatter: {}, body: source };
  let frontmatter;
  try {
    frontmatter = yaml.load(match[1]) || {};
  } catch (err) {
    throw new Error(`Invalid YAML frontmatter: ${err.message}`);
  }
  return { frontmatter, body: source.slice(match[0].length) };
}

// Resolves a Slate include name to a file. Slate convention: `errors`
// maps to includes/_errors.md (subdirectories allowed: `api/errors` ->
// includes/api/_errors.md). Bare filenames are also accepted.
function resolveInclude(sourceDir, name) {
  const dir = path.dirname(name);
  const base = path.basename(name);
  const candidates = [
    path.join(sourceDir, 'includes', dir, `_${base}.md`),
    path.join(sourceDir, 'includes', dir, `${base}.md`),
    path.join(sourceDir, 'includes', dir, base),
    path.join(sourceDir, dir, `_${base}.md`),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// Loads the main document plus its includes, Slate style: includes are
// appended after the main body in the order they are listed.
function loadDocument(sourceDir, entry = 'index.html.md') {
  const entryCandidates = [entry, 'index.html.md', 'index.md'].map((name) =>
    path.join(sourceDir, name)
  );
  const entryPath = entryCandidates.find((p) => fs.existsSync(p));
  if (!entryPath) {
    throw new Error(
      `No entry document found in ${sourceDir} (looked for ${entry}, index.html.md, index.md)`
    );
  }

  const raw = fs.readFileSync(entryPath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);

  const parts = [body];
  const includeNames = Array.isArray(frontmatter.includes) ? frontmatter.includes : [];
  const missing = [];
  for (const name of includeNames) {
    const file = resolveInclude(sourceDir, String(name));
    if (!file) {
      missing.push(String(name));
      continue;
    }
    // Includes may carry their own frontmatter; it is ignored, like Slate.
    const { body: includeBody } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    parts.push(includeBody);
  }

  return {
    entryPath,
    frontmatter,
    languageTabs: normalizeLanguageTabs(frontmatter.language_tabs),
    markdown: parts.join('\n\n'),
    missingIncludes: missing,
  };
}

// GitHub-flavored slugs with de-duplication, matching what Slate users
// expect for deep links (#section-title, #section-title-2, ...).
function createSlugger() {
  const seen = new Map();
  return function slug(text) {
    let base = String(text)
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s+/g, '-');
    if (!base) base = 'section';
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

module.exports = {
  parseFrontmatter,
  normalizeLanguageTabs,
  resolveInclude,
  loadDocument,
  createSlugger,
  labelFor,
};
