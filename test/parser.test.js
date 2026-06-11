'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseFrontmatter,
  normalizeLanguageTabs,
  createSlugger,
  loadDocument,
} = require('../src/parser');

test('parseFrontmatter splits YAML header from body', () => {
  const { frontmatter, body } = parseFrontmatter('---\ntitle: Hi\nsearch: true\n---\n# Hello\n');
  assert.equal(frontmatter.title, 'Hi');
  assert.equal(frontmatter.search, true);
  assert.equal(body, '# Hello\n');
});

test('parseFrontmatter passes through documents without frontmatter', () => {
  const { frontmatter, body } = parseFrontmatter('# Just markdown');
  assert.deepEqual(frontmatter, {});
  assert.equal(body, '# Just markdown');
});

test('normalizeLanguageTabs accepts Slate string and mapping forms', () => {
  const tabs = normalizeLanguageTabs(['shell', { ruby: 'Ruby on Rails' }, 'python', { shell: 'cURL' }]);
  assert.deepEqual(tabs, [
    { code: 'shell', label: 'Shell' },
    { code: 'ruby', label: 'Ruby on Rails' },
    { code: 'python', label: 'Python' },
    { code: 'shell', label: 'cURL' },
  ]);
});

test('normalizeLanguageTabs tolerates missing/invalid input', () => {
  assert.deepEqual(normalizeLanguageTabs(undefined), []);
  assert.deepEqual(normalizeLanguageTabs('shell'), []);
});

test('createSlugger produces GitHub-style slugs and de-duplicates', () => {
  const slug = createSlugger();
  assert.equal(slug('Get All Forecasts'), 'get-all-forecasts');
  assert.equal(slug('HTTP Request'), 'http-request');
  assert.equal(slug('HTTP Request'), 'http-request-2');
  assert.equal(slug('HTTP Request'), 'http-request-3');
  assert.equal(slug('Ünicode & Symbols!'), 'ünicode-symbols');
});

test('loadDocument appends includes in order, Slate style', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veridocs-'));
  fs.mkdirSync(path.join(dir, 'includes'));
  fs.writeFileSync(
    path.join(dir, 'index.html.md'),
    '---\ntitle: T\nincludes:\n  - errors\n  - nope\n---\n# Main\n'
  );
  fs.writeFileSync(path.join(dir, 'includes', '_errors.md'), '# Errors\n');

  const doc = loadDocument(dir);
  assert.match(doc.markdown, /# Main[\s\S]*# Errors/);
  assert.deepEqual(doc.missingIncludes, ['nope']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('loadDocument falls back to index.md', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veridocs-'));
  fs.writeFileSync(path.join(dir, 'index.md'), '# Plain\n');
  const doc = loadDocument(dir);
  assert.match(doc.markdown, /# Plain/);
  fs.rmSync(dir, { recursive: true, force: true });
});
