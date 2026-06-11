# Veridocs ✦

**Beautiful API documentation. Slate-compatible. Static by default, hackable by design.**

Veridocs turns a folder of markdown into the classic three-column API
reference — prose on the left, live-switching code samples on the right —
with a modern engine and a design you'll actually want to ship.

- 🪶 **One markdown file in, one static site out.** No Ruby, no framework,
  no client-side rendering. Three small npm dependencies, builds in
  milliseconds.
- 🧳 **Slate-compatible.** Migrating from [Slate](https://github.com/slatedocs/slate)?
  Copy your `source/` folder into a Veridocs project and build. Frontmatter
  (`language_tabs`, `includes`, `toc_footers`, `search`, `code_clipboard`),
  `includes/_*.md` partials, `<aside class="notice">`, blockquote
  annotations, and `?shell`-style deep links all work as before.
- 🎨 **Beautiful by default, overridable by design.** Light & dark mode,
  scroll-spy accordion sidebar, instant client-side search, copy buttons,
  keyboard shortcuts. Every color, font, and dimension is a documented CSS
  custom property you can override from one file — see [THEMING.md](THEMING.md).
- 🚪 **Doors open for React, Next.js, and custom JS.** The parser and
  renderer are a programmatic API, and `veridocs build --json` emits the
  whole document as structured JSON for any frontend you want to build.
- 📦 **Host it anywhere.** Plain files behind nginx, a ~10 MB Docker image,
  GitHub Pages — config for all three is included.
- 🆓 **MIT licensed.** Free for everyone, forever.

## Quickstart

```sh
npm install -g veridocs

veridocs init my-api-docs
cd my-api-docs
veridocs serve          # live-reloading dev server → http://localhost:4567
veridocs build          # static site → ./build
```

`init` scaffolds a complete example project — the Aurora API reference —
with language tabs, includes, search, asides, theme override stubs, a
Dockerfile, an nginx config, and a GitHub Pages workflow.

## Writing docs

Veridocs reads `source/index.html.md` (Slate's convention):

````markdown
---
title: Aurora API Reference
language_tabs:
  - shell: cURL
  - python
toc_footers:
  - <a href='#'>Sign up for an API key</a>
includes:
  - errors
search: true
---

# Authentication

> To authorize, pass your API key with every request:

```shell
curl "https://api.example.com" -H "Authorization: Bearer KEY"
```

```python
client = aurora.Client(api_key="KEY")
```

The API uses keys to authenticate requests.

<aside class="warning">Never ship an API key in client-side code.</aside>
````

The rules, identical to Slate:

- **`# h1` and `## h2`** become sidebar navigation (h3+ are searchable but
  not listed).
- **Fenced code blocks** in a `language_tabs` language become switchable
  samples in the right column. Blocks in other languages (e.g. `json`
  responses) are always visible.
- **Blockquotes (`>`)** become annotations in the right column.
- **`<aside class="notice|warning|success">`** render as callouts.
- **`includes`** pull in `source/includes/_<name>.md` partials, appended in
  order.
- Tables, of course, are tables.

## Deploying

### Plain files + nginx

```sh
veridocs build    # everything lands in ./build — index.html, assets/, images/
```

Copy `build/` to your server and point nginx at it. A production-ready site
config ships with the scaffold ([example/nginx.conf](example/nginx.conf)):
caching for assets, gzip, `try_files` fallback.

### Docker

The scaffolded `Dockerfile` is a two-stage build — Node builds the docs,
nginx serves them, and the final image contains nothing else:

```sh
docker build -t my-docs .
docker run -p 8080:80 my-docs       # → http://localhost:8080
```

Or `docker compose up`. To try this repo's bundled example:
`docker build -t veridocs-demo . && docker run -p 8080:80 veridocs-demo`.

### GitHub Pages

The scaffold includes `.github/workflows/pages.yml`. Enable Pages
(Source: GitHub Actions) and push to `main`.

## Migrating from Slate

1. `veridocs init my-docs && cd my-docs`
2. Delete the scaffolded `source/` and copy in your Slate `source/` folder
   (`index.html.md`, `includes/`, `images/` — all of it).
3. `veridocs build`

Your frontmatter, includes, asides, and `?shell#section` deep links keep
working. Logos at `source/images/logo.png` are picked up automatically.
Slate's SCSS variables don't transfer — recreate your palette in
`theme/variables.css` in a few lines (see [THEMING.md](THEMING.md)).

## Customizing the design

Everything is a CSS custom property. Drop overrides in `theme/variables.css`:

```css
:root {
  --vd-accent: light-dark(#7c3aed, #a78bfa);   /* light mode, dark mode */
  --vd-brand-gradient: linear-gradient(135deg, #a78bfa, #f472b6);
  --vd-sidebar-w: 300px;
  --vd-examples: 0.5;            /* code column takes half the page */
  --vd-font: "Inter", ui-sans-serif, sans-serif;
}
```

The override files, all optional, all in `theme/`:

| File | Purpose |
| --- | --- |
| `variables.css` | Design tokens, loaded after the default theme |
| `custom.css` | Arbitrary CSS, loaded last |
| `head.html` | Raw HTML injected into `<head>` (fonts, meta, analytics) |
| `header.html` | HTML injected at the top of the sidebar |
| `footer.html` | HTML injected before `</body>` |
| `app.js` | Extra JS loaded after the default bundle |
| `layout.html` | Replace the entire page template |

Full token reference and a custom-layout guide: [THEMING.md](THEMING.md).

## React, Next.js, and custom frontends

The default theme is plain HTML+CSS+JS — but the pipeline is yours:

**Structured JSON.** `veridocs build --json` writes `build/docs.json`:
frontmatter, normalized languages, the heading tree, per-section text, and
the rendered HTML. Fetch it from any SPA or static-render it however you like.

**Programmatic API.** Use the parser/renderer directly — for example in a
Next.js route:

```js
import { loadDocument, renderDocument } from "veridocs";

export async function getStaticProps() {
  const doc = loadDocument("./docs/source");
  const { html, toc, searchIndex } = renderDocument(doc.markdown, {
    languageTabs: doc.languageTabs,
  });
  return { props: { html, toc, title: doc.frontmatter.title } };
}
```

`renderDocument` gives you the same Slate-compatible HTML, TOC tree, and
search index the default theme uses; bring your own components around it.

**Full layout control.** `theme/layout.html` replaces the page template
wholesale — keep the pipeline, ship your own shell (and load your own
bundles from `head.html`).

**Reference implementation: Next.js + shadcn/ui.** A complete React
frontend lives in [frontends/nextjs-shadcn](frontends/nextjs-shadcn) —
the same Slate-compatible pipeline rendered through shadcn/ui components
(⌘K command-palette search, Radix tabs for languages, sheet drawer on
mobile, light/dark/system themes). `next build` statically exports it, so
the nginx/Docker hosting story is unchanged. Fork it as the starting
point for your own React docs.

## CLI reference

```
veridocs init [dir]        scaffold a new docs project
veridocs build [options]   build the static site
veridocs serve [options]   dev server with live reload

--source <dir>   markdown source directory     (default: source)
--out <dir>      output directory              (default: build)
--theme <dir>    theme overrides directory     (default: theme)
--port <n>       dev server port               (default: 4567)
--json           also emit docs.json
```

Options can live in `veridocs.config.json` instead; flags win.

## Development

```sh
git clone https://github.com/harshalparekh/veridocs && cd veridocs
npm install
npm test                  # node:test suite
npm run serve:example     # hack on the engine/theme against the example
```

PRs welcome. The whole engine is ~600 lines across [src/](src/); the theme
lives in [themes/default/](themes/default/).

## License

[MIT](LICENSE) — free for everyone, commercial or otherwise.
