import path from "node:path";

// The veridocs pipeline is the data layer: same Slate-compatible markdown
// in, structured content out. Runs at build time only (static export).
// Deep imports keep the bundler away from the CLI's dynamic config require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadDocument } = require("veridocs/src/parser");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderDocument } = require("veridocs/src/markdown");

export interface TocEntry {
  level: number;
  title: string;
  id: string;
}

export interface TocGroup extends TocEntry {
  children: TocEntry[];
}

export interface SearchEntry {
  id: string;
  title: string;
  level: number;
  text: string;
}

export interface Language {
  code: string;
  label: string;
}

export interface Docs {
  title: string;
  html: string;
  languages: Language[];
  toc: TocGroup[];
  searchIndex: SearchEntry[];
  tocFooters: string[];
  tabCss: string;
}

const SOURCE_DIR =
  process.env.VERIDOCS_SOURCE ??
  path.join(process.cwd(), "..", "..", "example", "source");

export function getDocs(): Docs {
  const doc = loadDocument(SOURCE_DIR);
  const { html, toc, searchIndex } = renderDocument(doc.markdown, {
    languageTabs: doc.languageTabs,
    clipboard: doc.frontmatter.code_clipboard !== false,
  });

  // Group h2s under their h1, for the sidebar accordion.
  const groups: TocGroup[] = [];
  for (const entry of toc as TocEntry[]) {
    if (entry.level === 1 || groups.length === 0) {
      groups.push({ ...entry, children: [] });
    } else {
      groups[groups.length - 1].children.push(entry);
    }
  }

  const tabCss =
    ".vd-tab{display:none}" +
    (doc.languageTabs as Language[])
      .map(
        (l: Language) =>
          `body[data-lang="${l.code}"] .vd-tab[data-tab-lang="${l.code}"]{display:block}`
      )
      .join("");

  return {
    title: doc.frontmatter.title ?? "API Reference",
    html,
    languages: doc.languageTabs,
    toc: groups,
    searchIndex,
    tocFooters: Array.isArray(doc.frontmatter.toc_footers)
      ? doc.frontmatter.toc_footers
      : [],
    tabCss,
  };
}
