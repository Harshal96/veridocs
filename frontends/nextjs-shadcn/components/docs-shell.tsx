"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  Menu,
  Monitor,
  Moon,
  Search,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Language, SearchEntry, TocGroup } from "@/lib/docs";

const SIDEBAR_WIDTH = "16.5rem";

interface DocsShellProps {
  title: string;
  languages: Language[];
  toc: TocGroup[];
  searchIndex: SearchEntry[];
  tocFooters: string[];
  children: React.ReactNode;
}

function topmostHeadingDelta(): { el: Element; top: number } | null {
  const headings = document.querySelectorAll(
    ".docs-content > h1[id], .docs-content > h2[id], .docs-content > h3[id]"
  );
  let best: Element | null = null;
  for (const h of headings) {
    if (h.getBoundingClientRect().top <= 90) best = h;
    else break;
  }
  return best ? { el: best, top: best.getBoundingClientRect().top } : null;
}

export function DocsShell({
  title,
  languages,
  toc,
  searchIndex,
  tocFooters,
  children,
}: DocsShellProps) {
  const [lang, setLangState] = React.useState(languages[0]?.code ?? "");
  const [activeId, setActiveId] = React.useState<string>(toc[0]?.id ?? "");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);

  /* ---- Language selection: body[data-lang] + ?lang URL + localStorage --- */

  const setLang = React.useCallback(
    (code: string, keepPosition = true) => {
      if (!languages.some((l) => l.code === code)) return;
      const anchor = keepPosition ? topmostHeadingDelta() : null;
      document.body.dataset.lang = code;
      setLangState(code);
      try {
        localStorage.setItem("vd-lang", code);
      } catch {}
      history.replaceState(null, "", `?${encodeURIComponent(code)}${location.hash}`);
      if (anchor) {
        window.scrollTo(
          0,
          window.scrollY + anchor.el.getBoundingClientRect().top - anchor.top
        );
      }
    },
    [languages]
  );

  React.useEffect(() => {
    // An inline script in the page set body[data-lang] pre-hydration;
    // adopt whatever it chose (URL ?lang beats localStorage beats first).
    const current = document.body.dataset.lang;
    if (current && languages.some((l) => l.code === current)) {
      setLangState(current);
    } else if (languages[0]) {
      document.body.dataset.lang = languages[0].code;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Scroll spy --------------------------------------------------------- */

  React.useEffect(() => {
    const ids = new Set(
      toc.flatMap((g) => [g.id, ...g.children.map((c) => c.id)])
    );
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const headings = document.querySelectorAll(
          ".docs-content > h1[id], .docs-content > h2[id]"
        );
        let current: string | null = null;
        for (const h of headings) {
          if (!ids.has(h.id)) continue;
          if (h.getBoundingClientRect().top <= 90) current = h.id;
          else break;
        }
        setActiveId(current ?? toc[0]?.id ?? "");
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc]);

  /* ---- Copy buttons (pipeline HTML) -------------------------------------- */

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element).closest?.(".vd-copy");
      if (!button) return;
      const code = button.closest(".vd-code")?.querySelector("pre code");
      if (!code?.textContent) return;
      navigator.clipboard.writeText(code.textContent).then(() => {
        button.classList.add("vd-copied");
        setTimeout(() => button.classList.remove("vd-copied"), 1400);
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /* ---- Search shortcuts ---------------------------------------------------- */

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = /^(input|textarea|select)$/i.test(
        (document.activeElement as HTMLElement)?.tagName ?? ""
      );
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) ||
          (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const jumpTo = (id: string) => {
    setSearchOpen(false);
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView();
    history.replaceState(null, "", `${location.search}#${encodeURIComponent(id)}`);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-indigo-500 text-sm text-white shadow-md">
          ✦
        </span>
        <span className="text-sm leading-tight font-semibold">{title}</span>
      </div>

      <div className="px-3 pb-3">
        <Button
          variant="outline"
          className="text-muted-foreground w-full justify-start gap-2 text-sm font-normal"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-4" />
          Search the docs
          <kbd className="bg-muted pointer-events-none ml-auto rounded border px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3">
        <nav aria-label="Table of contents" className="flex flex-col gap-0.5 pb-4">
          {toc.map((group) => {
            const groupActive =
              activeId === group.id ||
              group.children.some((c) => c.id === activeId);
            return (
              <Collapsible key={group.id} open={groupActive}>
                <div className="flex items-center">
                  <a
                    href={`#${group.id}`}
                    onClick={() => setNavOpen(false)}
                    className={cn(
                      "flex-1 rounded-md px-2.5 py-1.5 text-[13.5px] font-medium transition-colors",
                      groupActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {group.title}
                  </a>
                  {group.children.length > 0 && (
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-6"
                        tabIndex={-1}
                        aria-label={`Toggle ${group.title}`}
                      >
                        <ChevronRight
                          className={cn(
                            "size-3.5 transition-transform",
                            groupActive && "rotate-90"
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="border-sidebar-border mt-0.5 ml-3.5 flex flex-col gap-0.5 border-l pl-2">
                    {group.children.map((child) => (
                      <a
                        key={child.id}
                        href={`#${child.id}`}
                        onClick={() => setNavOpen(false)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[13px] transition-colors",
                          activeId === child.id
                            ? "text-primary font-medium"
                            : "text-muted-foreground hover:text-sidebar-accent-foreground"
                        )}
                      >
                        {child.title}
                      </a>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </ScrollArea>

      {tocFooters.length > 0 && (
        <>
          <Separator />
          <ul className="text-muted-foreground space-y-1.5 px-5 py-4 text-xs [&_a:hover]:text-foreground [&_a]:transition-colors">
            {tocFooters.map((footer, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: footer }} />
            ))}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <div style={{ "--sidebar-width": SIDEBAR_WIDTH } as React.CSSProperties}>
      {/* Desktop sidebar */}
      <aside className="bg-sidebar fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) border-r lg:block">
        {sidebar}
      </aside>

      <div className="lg:pl-(--sidebar-width)">
        {/* Topbar */}
        <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur-md">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-(--sidebar-width) p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>

          {languages.length > 0 && (
            <Tabs value={lang} onValueChange={(value) => setLang(value)}>
              <TabsList>
                {languages.map((language) => (
                  <TabsTrigger key={language.code} value={language.code}>
                    {language.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4.5" />
          </Button>
          <ThemeToggle />
        </header>

        {children}
      </div>

      {/* ⌘K search */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search the docs…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Sections">
            {searchIndex.map((entry) => (
              <CommandItem
                key={entry.id}
                value={entry.id}
                keywords={[entry.title, entry.text.slice(0, 300)]}
                onSelect={() => jumpTo(entry.id)}
                className="flex flex-col items-start gap-0.5"
              >
                <span className={cn(entry.level === 1 && "font-semibold")}>
                  {entry.title}
                </span>
                {entry.text && (
                  <span className="text-muted-foreground line-clamp-1 text-xs">
                    {entry.text.slice(0, 120)}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="size-4.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
