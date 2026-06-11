'use strict';

// Minimal mustache-style templating: {{{raw}}} and {{escaped}}.
// Veridocs templates are assembled from precomputed strings, so no logic
// blocks are needed — a missing key renders as an empty string.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(template, data) {
  return template
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
      const value = data[key];
      return value == null ? '' : String(value);
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const value = data[key];
      return value == null ? '' : escapeHtml(value);
    });
}

module.exports = { render, escapeHtml };
