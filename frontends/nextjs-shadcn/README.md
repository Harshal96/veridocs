# Veridocs × Next.js × shadcn/ui

The Veridocs reference React frontend: the same Slate-compatible pipeline
(`veridocs/src/parser` + `veridocs/src/markdown`) rendered through
[shadcn/ui](https://ui.shadcn.com) components on Next.js (App Router,
static export).

What you get on top of the default theme:

- **⌘K command palette** search (`cmdk` via shadcn `Command`), also bound to `/`
- **Radix `Tabs`** for the language switcher — still writes Slate-style
  `?python` URLs and persists to `localStorage`
- **`Sheet`** drawer navigation on mobile, **`Collapsible`** accordion TOC
  with scroll-spy on desktop
- **Light / dark / system** theming via `next-themes` + shadcn tokens
- The signature **dual-column layout** — examples float over a dark panel
  that stays dark in both modes

## Run it

```sh
npm install
npm run dev        # http://localhost:4569
npm run build      # static export → ./out — serve with any nginx
```

Point it at your own docs with `VERIDOCS_SOURCE=/path/to/source` (defaults
to the repo's `example/source`). The source format is exactly Slate's:
`index.html.md` + `includes/_*.md`.

## How it works

| Piece | File |
| --- | --- |
| Build-time data layer (parser + renderer) | `lib/docs.ts` |
| Static page, tab-visibility CSS, pre-hydration lang script | `app/page.tsx` |
| Shell: sidebar, search, tabs, theme (client) | `components/docs-shell.tsx` |
| shadcn tokens + docs content styles | `app/globals.css` |
| Generated shadcn components | `components/ui/` |

The pipeline runs only at build time — the export in `out/` is fully
static HTML with syntax highlighting already applied. Notes:

- `lib/docs.ts` deep-imports `veridocs/src/parser` and
  `veridocs/src/markdown` so the bundler never sees the CLI's dynamic
  config `require`.
- An inline script in `app/page.tsx` sets `body[data-lang]` before
  hydration, so code samples never flash hidden.
- Restyle everything through the CSS variables in `app/globals.css` —
  same drill as any shadcn project.
