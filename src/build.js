'use strict';

const fs = require('fs');
const path = require('path');
const { loadDocument } = require('./parser');
const { renderDocument } = require('./markdown');
const { render, escapeHtml } = require('./template');

const DEFAULT_THEME_DIR = path.join(__dirname, '..', 'themes', 'default');

// Project-level theme override files, in the spirit of Slate's
// editable stylesheets. Everything is optional.
const OVERRIDE_FILES = {
  variables: 'variables.css', // design tokens, loaded after the default theme
  custom: 'custom.css',       // arbitrary CSS, loaded last
  head: 'head.html',          // raw HTML injected into <head>
  header: 'header.html',      // raw HTML injected at the top of the sidebar
  footer: 'footer.html',      // raw HTML injected before </body>
  layout: 'layout.html',      // full layout replacement
  appendJs: 'app.js',         // extra JS loaded after the default bundle
};

function loadConfig(cwd, overrides = {}) {
  let fileConfig = {};
  for (const name of ['veridocs.config.json', 'veridocs.config.js']) {
    const file = path.join(cwd, name);
    if (fs.existsSync(file)) {
      fileConfig = name.endsWith('.json')
        ? JSON.parse(fs.readFileSync(file, 'utf8'))
        : require(file);
      break;
    }
  }
  const config = {
    source: 'source',
    out: 'build',
    theme: 'theme',
    port: 4567,
    ...fileConfig,
    ...overrides,
  };
  config.source = path.resolve(cwd, config.source);
  config.out = path.resolve(cwd, config.out);
  config.theme = path.resolve(cwd, config.theme);
  return config;
}

// Headings form a tree (h1 groups containing h2/h3); deeper levels reveal
// when their group is active, Slate's accordion behavior.
function buildTocTree(toc) {
  const root = { level: 0, children: [] };
  const stack = [root];
  for (const entry of toc) {
    const node = { ...entry, level: Math.min(entry.level, 3), children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= node.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root.children;
}

function renderTocList(nodes, cssClass) {
  if (!nodes.length) return '';
  const items = nodes
    .map(
      (n) =>
        `<li class="vd-toc-item vd-toc-h${n.level}"><a href="#${escapeHtml(n.id)}">${escapeHtml(
          n.title
        )}</a>${renderTocList(n.children, 'vd-toc-sub')}</li>`
    )
    .join('');
  return `<ul class="${cssClass}">${items}</ul>`;
}

function buildTocHtml(toc) {
  return renderTocList(buildTocTree(toc), 'vd-toc-list') || '<ul class="vd-toc-list"></ul>';
}

function buildLangBarHtml(languageTabs) {
  if (!languageTabs.length) return '';
  const buttons = languageTabs
    .map(
      (tab, i) =>
        `<button type="button" class="vd-lang${i === 0 ? ' active' : ''}" data-lang="${escapeHtml(
          tab.code
        )}">${escapeHtml(tab.label)}</button>`
    )
    .join('');
  return `<div class="vd-lang-tabs" role="tablist" aria-label="Code samples language">${buttons}</div>`;
}

function buildTabCss(languageTabs) {
  if (!languageTabs.length) return '';
  const rules = languageTabs
    .map(
      (tab) =>
        `body[data-lang="${tab.code}"] .vd-tab[data-tab-lang="${tab.code}"]{display:block;}`
    )
    .join('\n');
  return `.vd-tab{display:none;}\n${rules}`;
}

function buildMetaHtml(meta) {
  if (!Array.isArray(meta)) return '';
  return meta
    .map((tag) => {
      if (!tag || typeof tag !== 'object') return '';
      const attrs = Object.entries(tag)
        .map(([k, v]) => `${escapeHtml(k)}="${escapeHtml(String(v))}"`)
        .join(' ');
      return attrs ? `<meta ${attrs}>` : '';
    })
    .filter(Boolean)
    .join('\n    ');
}

function readOverride(themeDir, file) {
  const fullPath = path.join(themeDir, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : null;
}

function copyRecursive(from, to, shouldCopy) {
  if (!fs.existsSync(from)) return;
  for (const dirent of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, dirent.name);
    const dest = path.join(to, dirent.name);
    if (dirent.isDirectory()) {
      copyRecursive(src, dest, shouldCopy);
    } else if (!shouldCopy || shouldCopy(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

function findLogo(sourceDir) {
  for (const name of ['logo.svg', 'logo.png', 'logo.jpg', 'logo.webp']) {
    if (fs.existsSync(path.join(sourceDir, 'images', name))) return `images/${name}`;
  }
  return null;
}

function buildProject(config) {
  const doc = loadDocument(config.source);
  const fm = doc.frontmatter;
  const clipboard = fm.code_clipboard !== false;
  const searchEnabled = fm.search !== false;

  const { html, toc, searchIndex } = renderDocument(doc.markdown, {
    languageTabs: doc.languageTabs,
    clipboard,
  });

  const themeDir = config.theme;
  const layout =
    readOverride(themeDir, OVERRIDE_FILES.layout) ||
    fs.readFileSync(path.join(DEFAULT_THEME_DIR, 'layout.html'), 'utf8');

  const logo = findLogo(config.source);
  const title = fm.title || 'API Reference';
  const brandHtml = logo
    ? `<img class="vd-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(title)}">`
    : `<span class="vd-logo-mark" aria-hidden="true"></span><span class="vd-brand-name">${escapeHtml(
        title
      )}</span>`;

  const tocFooters = Array.isArray(fm.toc_footers)
    ? fm.toc_footers.map((f) => `<li>${f}</li>`).join('\n        ')
    : '';

  const overrideCss = [];
  const variablesCss = readOverride(themeDir, OVERRIDE_FILES.variables);
  const customCss = readOverride(themeDir, OVERRIDE_FILES.custom);
  if (variablesCss) overrideCss.push('<link rel="stylesheet" href="assets/variables.css">');
  if (customCss) overrideCss.push('<link rel="stylesheet" href="assets/custom.css">');
  const appendJs = readOverride(themeDir, OVERRIDE_FILES.appendJs);

  const page = render(layout, {
    title,
    lang_attr: fm.lang || 'en',
    meta: buildMetaHtml(fm.meta),
    head_extra: readOverride(themeDir, OVERRIDE_FILES.head) || '',
    header_extra: readOverride(themeDir, OVERRIDE_FILES.header) || '',
    footer_extra: readOverride(themeDir, OVERRIDE_FILES.footer) || '',
    override_css: overrideCss.join('\n    '),
    append_js: appendJs ? '<script src="assets/custom.js" defer></script>' : '',
    brand: brandHtml,
    toc: buildTocHtml(toc),
    toc_footers: tocFooters,
    lang_bar: buildLangBarHtml(doc.languageTabs),
    tab_css: buildTabCss(doc.languageTabs),
    content: html,
    search_index: searchEnabled ? JSON.stringify(searchIndex) : '[]',
    search_class: searchEnabled ? '' : ' vd-no-search',
    default_lang: doc.languageTabs[0] ? doc.languageTabs[0].code : '',
  });

  // Write output.
  fs.rmSync(config.out, { recursive: true, force: true });
  fs.mkdirSync(path.join(config.out, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(config.out, 'index.html'), page);

  fs.copyFileSync(
    path.join(DEFAULT_THEME_DIR, 'css', 'theme.css'),
    path.join(config.out, 'assets', 'theme.css')
  );
  fs.copyFileSync(
    path.join(DEFAULT_THEME_DIR, 'js', 'app.js'),
    path.join(config.out, 'assets', 'app.js')
  );
  if (variablesCss) fs.writeFileSync(path.join(config.out, 'assets', 'variables.css'), variablesCss);
  if (customCss) fs.writeFileSync(path.join(config.out, 'assets', 'custom.css'), customCss);
  if (appendJs) fs.writeFileSync(path.join(config.out, 'assets', 'custom.js'), appendJs);

  // Copy static assets from source (images, fonts, ...), skipping markdown.
  copyRecursive(config.source, config.out, (file) => {
    if (file.endsWith('.md')) return false;
    if (file.includes(`${path.sep}includes${path.sep}`)) return false;
    return true;
  });

  if (config.json) {
    const data = {
      generator: 'veridocs',
      title,
      frontmatter: fm,
      languages: doc.languageTabs,
      toc,
      sections: searchIndex,
      html,
    };
    fs.writeFileSync(path.join(config.out, 'docs.json'), JSON.stringify(data, null, 2));
  }

  return {
    out: config.out,
    title,
    toc,
    languages: doc.languageTabs,
    missingIncludes: doc.missingIncludes,
  };
}

module.exports = { buildProject, loadConfig, buildTocHtml, buildTabCss };
