# Theming Veridocs

The default theme is built entirely on CSS custom properties. You never edit
the theme itself — you override tokens (or whole files) from your project's
`theme/` directory, the same way Slate users edited `_variables.scss`.

## How overrides load

```
assets/theme.css        ← the default theme (copied on every build)
assets/variables.css    ← your theme/variables.css, loaded after it
assets/custom.css       ← your theme/custom.css, loaded last
```

Later wins. Token changes go in `variables.css`; structural CSS goes in
`custom.css`. Both are plain CSS — no build step, no preprocessor.

Colors use [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark):
the first value applies in light mode, the second in dark mode. A plain
value (`--vd-accent: hotpink`) applies to both.

## Token reference

### Layout

| Token | Default | Meaning |
| --- | --- | --- |
| `--vd-sidebar-w` | `264px` | Sidebar width |
| `--vd-examples` | `0.45` | Code column share of the content area (0–1) |
| `--vd-content-pad` | `36px` | Horizontal padding, prose column |
| `--vd-example-pad` | `26px` | Horizontal padding, code column |
| `--vd-topbar-h` | `52px` | Language-selector bar height |
| `--vd-content-max` | `52rem` | Max line length for prose |
| `--vd-radius` | `10px` | Corner radius for panels |

### Typography

| Token | Meaning |
| --- | --- |
| `--vd-font` | Body and UI font stack |
| `--vd-font-mono` | Code font stack |
| `--vd-font-size` | Base font size (default `15px`) |
| `--vd-line-height` | Prose line height (default `1.7`) |

Loading a webfont? Add the `<link>` in `theme/head.html`, then set
`--vd-font` here.

### Brand & prose

| Token | Meaning |
| --- | --- |
| `--vd-accent` | Links, active states, focus rings |
| `--vd-brand-gradient` | The logo mark's gradient |
| `--vd-bg` / `--vd-text` / `--vd-heading` | Prose column surfaces |
| `--vd-text-soft` | Secondary text |
| `--vd-border` / `--vd-divider` | Table borders / section dividers |
| `--vd-inline-code-bg` / `--vd-inline-code-text` | Inline `code` chips |
| `--vd-table-head` / `--vd-table-row-hover` | Table styling |
| `--vd-selection` | Text selection color |

### Sidebar

Dark in both modes by default — Slate's signature. Override freely:

| Token | Meaning |
| --- | --- |
| `--vd-sidebar-bg` | Sidebar background |
| `--vd-sidebar-text` / `--vd-sidebar-text-active` | Nav link colors |
| `--vd-sidebar-hover-bg` / `--vd-sidebar-active-bg` | Nav link states |
| `--vd-sidebar-accent` | Active indicator bar |
| `--vd-sidebar-border` | Hairlines inside the sidebar |

### Topbar (language selector)

| Token | Meaning |
| --- | --- |
| `--vd-topbar-bg` | Bar background (translucent; sits over both columns) |
| `--vd-topbar-text` / `--vd-topbar-text-active` | Tab label colors |

### Examples column

| Token | Meaning |
| --- | --- |
| `--vd-examples-bg` | The full-height dark panel |
| `--vd-code-bg` / `--vd-code-border` / `--vd-code-text` | Code panels |
| `--vd-code-bar-text` | The language label above each block |
| `--vd-annotation-bg` / `--vd-annotation-text` / `--vd-annotation-border` | Blockquote annotations |

### Syntax highlighting

The palette is eight tokens applied to highlight.js classes:

| Token | Used for |
| --- | --- |
| `--vd-tok-comment` | Comments (italic) |
| `--vd-tok-keyword` | Keywords |
| `--vd-tok-string` | Strings, regexps |
| `--vd-tok-number` | Numbers |
| `--vd-tok-function` | Function and section names |
| `--vd-tok-property` | Properties, attributes, JSON keys |
| `--vd-tok-type` | Types and built-ins |
| `--vd-tok-literal` | Literals (`true`, `null`, …) |

### Asides

`--vd-notice-*`, `--vd-warning-*`, `--vd-success-*` — each with `-bg`,
`-border`, and `-text`.

## Recipes

**Rebrand in four lines:**

```css
:root {
  --vd-accent: light-dark(#7c3aed, #a78bfa);
  --vd-brand-gradient: linear-gradient(135deg, #a78bfa, #f472b6);
  --vd-sidebar-accent: #a78bfa;
  --vd-examples: 0.5;
}
```

**Light sidebar:**

```css
:root {
  --vd-sidebar-bg: light-dark(#f8fafc, #0d1018);
  --vd-sidebar-text: light-dark(#475569, #9aa5b5);
  --vd-sidebar-text-active: light-dark(#0f172a, #ffffff);
  --vd-sidebar-border: light-dark(#e2e8f0, rgba(255,255,255,.07));
}
```

(The search input and footers use fixed dark-friendly colors; restyle them
in `custom.css` if you go fully light.)

**Custom font:** in `theme/head.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
```

and in `theme/variables.css`:

```css
:root { --vd-font: "Inter", ui-sans-serif, sans-serif; }
```

**Hide the footer credit:** `theme/custom.css` → `.vd-footer { display: none; }`

## Replacing the layout

Put a `layout.html` in `theme/` and Veridocs uses it instead of the default
([themes/default/layout.html](themes/default/layout.html) — start from a
copy). Placeholders, `{{name}}` escaped / `{{{name}}}` raw:

| Placeholder | Content |
| --- | --- |
| `{{title}}` | Page title from frontmatter |
| `{{{meta}}}` | `<meta>` tags from frontmatter `meta:` |
| `{{{brand}}}` | Logo image or generated mark + title |
| `{{{toc}}}` | Nested `<ul>` navigation tree |
| `{{{toc_footers}}}` | `<li>` items from `toc_footers:` |
| `{{{lang_bar}}}` | Language tab buttons |
| `{{{tab_css}}}` | Generated CSS for tab visibility |
| `{{{content}}}` | The rendered document |
| `{{{search_index}}}` | JSON search index (embed in a `<script type="application/json">`) |
| `{{{override_css}}}` / `{{{append_js}}}` | Links to your override assets |
| `{{{head_extra}}}` / `{{{header_extra}}}` / `{{{footer_extra}}}` | Your `head/header/footer.html` |
| `{{default_lang}}` | First language tab code (for `<body data-lang>`) |
| `{{{search_class}}}` | `vd-no-search` when search is disabled |

The default `app.js` only depends on element ids (`vd-search-input`,
`vd-toc`, …) and classes (`vd-lang`, `vd-copy`, …) — keep those and the
behaviors come along; drop them and ship your own script via `theme/app.js`.

## Beyond CSS: your own frontend

For ground-up custom UIs (React, Next.js, Vue…), skip the theme entirely:
`veridocs build --json` emits `docs.json`, and the `veridocs` package
exports `loadDocument` / `renderDocument`. See
[README → React, Next.js, and custom frontends](README.md#react-nextjs-and-custom-frontends).
