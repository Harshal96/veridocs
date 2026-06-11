'use strict';

// Programmatic API. Everything the CLI does is available here, so custom
// frontends (React, Next.js, anything that speaks JSON) can consume the
// same Slate-compatible pipeline:
//
//   const { loadDocument, renderDocument } = require('veridocs');
//   const doc = loadDocument('./source');
//   const { html, toc, searchIndex } = renderDocument(doc.markdown, {
//     languageTabs: doc.languageTabs,
//   });

const { loadDocument, parseFrontmatter, normalizeLanguageTabs, createSlugger } = require('./parser');
const { renderDocument, createRenderer } = require('./markdown');
const { buildProject, loadConfig } = require('./build');
const { startServer } = require('./serve');
const { initProject } = require('./init');

module.exports = {
  loadDocument,
  parseFrontmatter,
  normalizeLanguageTabs,
  createSlugger,
  renderDocument,
  createRenderer,
  buildProject,
  loadConfig,
  startServer,
  initProject,
};
