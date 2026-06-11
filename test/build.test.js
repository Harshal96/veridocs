'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { renderDocument } = require('../src/markdown');
const { buildProject, loadConfig } = require('../src/build');

const TABS = [
  { code: 'shell', label: 'Shell' },
  { code: 'python', label: 'Python' },
];

test('renderDocument marks language_tabs fences as switchable, leaves others visible', () => {
  const md = [
    '# API',
    '```shell',
    'curl example.com',
    '```',
    '```json',
    '{"ok": true}',
    '```',
  ].join('\n');
  const { html } = renderDocument(md, { languageTabs: TABS });
  assert.match(html, /class="vd-example vd-code vd-tab" data-tab-lang="shell"/);
  assert.doesNotMatch(html, /data-tab-lang="json"/);
});

test('renderDocument assigns heading ids and builds a depth-limited toc', () => {
  const md = '# One\n## Two\n### Three\ntext';
  const { html, toc } = renderDocument(md, {});
  assert.match(html, /<h1 id="one">/);
  assert.match(html, /<h2 id="two">/);
  assert.match(html, /<h3 id="three">/);
  assert.deepEqual(
    toc.map((t) => t.id),
    ['one', 'two']
  );
});

test('renderDocument indexes section text and code for search', () => {
  const md = '# Alerts\nCreate an alert easily.\n```shell\ncurl -X POST /alerts\n```';
  const { searchIndex } = renderDocument(md, { languageTabs: TABS });
  assert.equal(searchIndex.length, 1);
  assert.match(searchIndex[0].text, /Create an alert easily/);
  assert.match(searchIndex[0].text, /curl -X POST/);
});

test('renderDocument styles blockquotes as annotations', () => {
  const { html } = renderDocument('> A note', {});
  assert.match(html, /<blockquote class="vd-example vd-annotation">/);
});

test('renderDocument escapes code blocks in unknown languages', () => {
  const { html } = renderDocument('```nonexistentlang\n<script>alert(1)</script>\n```', {});
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

function makeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veridocs-proj-'));
  fs.mkdirSync(path.join(dir, 'source', 'includes'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'source', 'index.html.md'),
    [
      '---',
      'title: Test API',
      'language_tabs:',
      '  - shell',
      'toc_footers:',
      "  - <a href='#'>Footer link</a>",
      'includes:',
      '  - errors',
      'search: true',
      '---',
      '# Intro',
      'Hello world.',
      '```shell',
      'curl test',
      '```',
    ].join('\n')
  );
  fs.writeFileSync(path.join(dir, 'source', 'includes', '_errors.md'), '# Errors\nBad things.\n');
  return dir;
}

test('buildProject writes a complete static site', () => {
  const dir = makeProject();
  const config = loadConfig(dir, { json: true });
  const result = buildProject(config);

  const html = fs.readFileSync(path.join(dir, 'build', 'index.html'), 'utf8');
  assert.match(html, /<title>Test API<\/title>/);
  assert.match(html, /Hello world\./);
  assert.match(html, /Bad things\./); // include was appended
  assert.match(html, /Footer link/);
  assert.match(html, /data-tab-lang="shell"/);
  assert.match(html, /vd-search-index/);
  assert.ok(fs.existsSync(path.join(dir, 'build', 'assets', 'theme.css')));
  assert.ok(fs.existsSync(path.join(dir, 'build', 'assets', 'app.js')));

  const json = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'docs.json'), 'utf8'));
  assert.equal(json.title, 'Test API');
  assert.deepEqual(json.languages, [{ code: 'shell', label: 'Shell' }]);
  assert.equal(json.toc[0].id, 'intro');

  assert.deepEqual(result.missingIncludes, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('buildProject applies theme overrides', () => {
  const dir = makeProject();
  fs.mkdirSync(path.join(dir, 'theme'));
  fs.writeFileSync(path.join(dir, 'theme', 'variables.css'), ':root { --vd-accent: hotpink; }');
  fs.writeFileSync(path.join(dir, 'theme', 'footer.html'), '<!-- analytics -->');

  buildProject(loadConfig(dir));
  const html = fs.readFileSync(path.join(dir, 'build', 'index.html'), 'utf8');
  assert.match(html, /assets\/variables\.css/);
  assert.match(html, /<!-- analytics -->/);
  assert.equal(
    fs.readFileSync(path.join(dir, 'build', 'assets', 'variables.css'), 'utf8'),
    ':root { --vd-accent: hotpink; }'
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('buildProject copies static assets but not markdown', () => {
  const dir = makeProject();
  fs.mkdirSync(path.join(dir, 'source', 'images'));
  fs.writeFileSync(path.join(dir, 'source', 'images', 'logo.png'), 'fake-png');

  buildProject(loadConfig(dir));
  assert.ok(fs.existsSync(path.join(dir, 'build', 'images', 'logo.png')));
  assert.ok(!fs.existsSync(path.join(dir, 'build', 'index.html.md')));
  assert.ok(!fs.existsSync(path.join(dir, 'build', 'includes')));

  // With a logo present, the brand uses it.
  const html = fs.readFileSync(path.join(dir, 'build', 'index.html'), 'utf8');
  assert.match(html, /<img class="vd-logo" src="images\/logo\.png"/);
  fs.rmSync(dir, { recursive: true, force: true });
});
