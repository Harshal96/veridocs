'use strict';

const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');
const { createSlugger, labelFor } = require('./parser');
const { escapeHtml } = require('./template');

function highlight(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch {
      /* fall through to plain text */
    }
  }
  return escapeHtml(code);
}

function createRenderer({ tabLangs = new Set(), clipboard = true } = {}) {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

  // Code fences. Blocks whose language appears in language_tabs become
  // switchable examples (Slate behavior); anything else is always visible.
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const lang = (token.info || '').trim().split(/\s+/)[0] || '';
    const isTab = lang && tabLangs.has(lang);
    const body = highlight(token.content, lang);
    const langClass = lang ? ` language-${escapeHtml(lang)}` : '';
    const copyButton = clipboard
      ? '<button class="vd-copy" type="button" aria-label="Copy to clipboard">' +
        '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
        '<path fill="currentColor" d="M10.5 1h-7A1.5 1.5 0 0 0 2 2.5v9h1.5v-9h7V1Zm2 3h-7A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16h7a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 4Zm0 10.5h-7v-9h7v9Z"/>' +
        '</svg></button>'
      : '';
    const attrs = isTab ? ` data-tab-lang="${escapeHtml(lang)}"` : '';
    return (
      `<div class="vd-example vd-code${isTab ? ' vd-tab' : ''}"${attrs}>` +
      `<div class="vd-code-bar"><span class="vd-code-lang">${escapeHtml(
        lang ? labelFor(lang) : 'Text'
      )}</span>${copyButton}</div>` +
      `<pre><code class="hljs${langClass}">${body}</code></pre>` +
      `</div>\n`
    );
  };

  // Blockquotes are right-column annotations in the Slate layout.
  const defaultBlockquoteOpen =
    md.renderer.rules.blockquote_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrJoin('class', 'vd-example vd-annotation');
    return defaultBlockquoteOpen(tokens, idx, options, env, self);
  };

  return md;
}

function inlineText(token) {
  if (!token || !token.children) return token ? token.content : '';
  return token.children
    .filter((t) => t.type === 'text' || t.type === 'code_inline')
    .map((t) => t.content)
    .join('');
}

// Renders a full document. Returns the HTML plus the data every frontend
// needs: a heading tree for the TOC and a flat search index.
// tocDepth 2 matches Slate: h1 and h2 in the sidebar; h3+ stay searchable.
function renderDocument(markdown, { languageTabs = [], clipboard = true, tocDepth = 2 } = {}) {
  const tabLangs = new Set(languageTabs.map((t) => t.code));
  const md = createRenderer({ tabLangs, clipboard });
  const slugger = createSlugger();

  const tokens = md.parse(markdown, {});
  const toc = [];
  const searchIndex = [];
  let current = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      const level = Number(token.tag.slice(1));
      const title = inlineText(tokens[i + 1]).trim();
      const id = slugger(title);
      token.attrSet('id', id);
      if (level <= tocDepth) toc.push({ level, title, id });
      current = { id, title, level, text: '' };
      searchIndex.push(current);
    } else if (current && token.type === 'inline' && tokens[i - 1]?.type !== 'heading_open') {
      current.text += ` ${inlineText(token)}`;
    } else if (current && token.type === 'fence') {
      current.text += ` ${token.content}`;
    }
  }

  for (const entry of searchIndex) {
    entry.text = entry.text.replace(/\s+/g, ' ').trim().slice(0, 4000);
  }

  return { html: md.renderer.render(tokens, md.options, {}), toc, searchIndex };
}

module.exports = { renderDocument, createRenderer };
