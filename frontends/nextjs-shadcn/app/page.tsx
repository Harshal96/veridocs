import { getDocs } from "@/lib/docs";
import { DocsShell } from "@/components/docs-shell";

export default function Page() {
  const docs = getDocs();
  const langCodes = docs.languages.map((l) => l.code);
  // Picks the language (URL ?lang > localStorage > first) before hydration,
  // so code samples never flash hidden.
  const langInit = `(function(){var L=${JSON.stringify(langCodes)};var u=decodeURIComponent(location.search.replace(/^\\?/,"").split("&")[0]||"");var s=null;try{s=localStorage.getItem("vd-lang")}catch(e){}document.body.dataset.lang=L.indexOf(u)>-1?u:(s&&L.indexOf(s)>-1?s:L[0]||"")})()`;
  return (
    <>
      {/* Build-time CSS controlling which language's samples are visible. */}
      <style dangerouslySetInnerHTML={{ __html: docs.tabCss }} />
      <script dangerouslySetInnerHTML={{ __html: langInit }} />
      <DocsShell
        title={docs.title}
        languages={docs.languages}
        toc={docs.toc}
        searchIndex={docs.searchIndex}
        tocFooters={docs.tocFooters}
      >
        <main id="docs-content">
          <div className="docs-darkbox" aria-hidden />
          <div
            className="docs-content"
            dangerouslySetInnerHTML={{ __html: docs.html }}
          />
          <div className="docs-content-end" aria-hidden />
        </main>
      </DocsShell>
    </>
  );
}
