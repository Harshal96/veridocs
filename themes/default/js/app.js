/* Veridocs default theme — zero-dependency client script. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ======================================================================
     Theme toggle (light / dark, default follows the OS)
     ====================================================================== */

  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function resolvedTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return media.matches ? 'dark' : 'light';
  }

  function syncResolved() {
    root.setAttribute('data-resolved', resolvedTheme());
  }

  syncResolved();
  media.addEventListener('change', syncResolved);

  var themeToggle = doc.getElementById('vd-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = resolvedTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('vd-theme', next); } catch (e) {}
      syncResolved();
    });
  }

  /* ======================================================================
     Mobile navigation
     ====================================================================== */

  var navToggle = doc.getElementById('vd-nav-toggle');
  var backdrop = doc.getElementById('vd-backdrop');

  function closeNav() { doc.body.classList.remove('vd-nav-open'); }
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      doc.body.classList.toggle('vd-nav-open');
    });
  }
  if (backdrop) backdrop.addEventListener('click', closeNav);

  /* ======================================================================
     Language tabs
     --------------------------------------------------------------------
     Selection is stored on <body data-lang>, persisted to localStorage,
     and reflected in the URL as ?<lang> — the exact format Slate uses,
     so old deep links keep working. Switching keeps the section you are
     reading anchored in place.
     ====================================================================== */

  var langButtons = Array.prototype.slice.call(doc.querySelectorAll('.vd-lang'));
  var knownLangs = langButtons.map(function (b) { return b.getAttribute('data-lang'); });

  function topmostHeading() {
    var headings = doc.querySelectorAll('.vd-content > h1[id], .vd-content > h2[id], .vd-content > h3[id]');
    var topbar = doc.getElementById('vd-topbar');
    var offset = (topbar ? topbar.offsetHeight : 0) + 24;
    var best = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= offset) best = headings[i];
      else break;
    }
    return best;
  }

  function setLang(lang, options) {
    if (knownLangs.indexOf(lang) === -1) return;
    var anchor = options && options.keepPosition ? topmostHeading() : null;
    var delta = anchor ? anchor.getBoundingClientRect().top : 0;

    doc.body.setAttribute('data-lang', lang);
    langButtons.forEach(function (b) {
      var active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    try { localStorage.setItem('vd-lang', lang); } catch (e) {}
    if (options && options.updateUrl !== false) {
      history.replaceState(null, '', '?' + encodeURIComponent(lang) + location.hash);
    }
    if (anchor) {
      window.scrollTo(0, window.scrollY + anchor.getBoundingClientRect().top - delta);
    }
  }

  langButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setLang(button.getAttribute('data-lang'), { keepPosition: true });
    });
  });

  (function restoreLang() {
    if (!knownLangs.length) return;
    var fromUrl = decodeURIComponent(location.search.replace(/^\?/, '').split('&')[0] || '');
    var stored = null;
    try { stored = localStorage.getItem('vd-lang'); } catch (e) {}
    var initial =
      (knownLangs.indexOf(fromUrl) !== -1 && fromUrl) ||
      (stored && knownLangs.indexOf(stored) !== -1 && stored) ||
      knownLangs[0];
    setLang(initial, { updateUrl: knownLangs.indexOf(fromUrl) !== -1 });
  })();

  /* ======================================================================
     Copy to clipboard
     ====================================================================== */

  var CHECK_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
    '<path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06l2.72 2.72 6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';

  doc.addEventListener('click', function (event) {
    var button = event.target.closest('.vd-copy');
    if (!button) return;
    var block = button.closest('.vd-code');
    var code = block && block.querySelector('pre code');
    if (!code) return;
    var text = code.textContent;
    var write = navigator.clipboard
      ? navigator.clipboard.writeText(text)
      : Promise.reject();
    write
      .catch(function () {
        var area = doc.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        doc.body.appendChild(area);
        area.select();
        doc.execCommand('copy');
        doc.body.removeChild(area);
      })
      .then(function () {
        var original = button.innerHTML;
        button.innerHTML = CHECK_SVG;
        button.classList.add('vd-copied');
        setTimeout(function () {
          button.innerHTML = original;
          button.classList.remove('vd-copied');
        }, 1400);
      });
  });

  /* ======================================================================
     Scroll spy: highlight the TOC entry for the section in view and
     expand its group.
     ====================================================================== */

  var tocLinks = Array.prototype.slice.call(doc.querySelectorAll('.vd-toc a[href^="#"]'));
  var linkById = {};
  tocLinks.forEach(function (link) {
    linkById[decodeURIComponent(link.getAttribute('href').slice(1))] = link;
  });

  var headingEls = Array.prototype.slice.call(
    doc.querySelectorAll('.vd-content > h1[id], .vd-content > h2[id], .vd-content > h3[id]')
  ).filter(function (h) { return linkById[h.id]; });

  var activeLink = null;

  function setActive(link) {
    if (link === activeLink) return;
    if (activeLink) {
      activeLink.parentElement.classList.remove('active');
    }
    doc.querySelectorAll('.vd-toc-item.expanded').forEach(function (item) {
      item.classList.remove('expanded');
    });
    activeLink = link;
    if (!link) return;
    var item = link.parentElement;
    item.classList.add('active');
    // Expand every ancestor group, plus the item's own subgroup.
    var node = item;
    while (node && !node.classList.contains('vd-toc')) {
      if (node.classList && node.classList.contains('vd-toc-item')) {
        node.classList.add('expanded');
      }
      node = node.parentElement;
    }
    // Keep the active entry visible in the sidebar.
    var toc = doc.getElementById('vd-toc');
    if (toc) {
      var linkRect = link.getBoundingClientRect();
      var tocRect = toc.getBoundingClientRect();
      if (linkRect.top < tocRect.top + 40 || linkRect.bottom > tocRect.bottom - 40) {
        toc.scrollTop += linkRect.top - tocRect.top - tocRect.height / 3;
      }
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var topbar = doc.getElementById('vd-topbar');
      var offset = (topbar ? topbar.offsetHeight : 0) + 28;
      var current = null;
      for (var i = 0; i < headingEls.length; i++) {
        if (headingEls[i].getBoundingClientRect().top <= offset) current = headingEls[i];
        else break;
      }
      if (!current && headingEls.length) current = headingEls[0];
      setActive(current ? linkById[current.id] : null);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // Close the mobile drawer when a TOC link is chosen.
  tocLinks.forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  /* ======================================================================
     Search: embedded index, scored matching, keyboard navigation.
     ====================================================================== */

  var input = doc.getElementById('vd-search-input');
  var resultsBox = doc.getElementById('vd-search-results');
  var indexEl = doc.getElementById('vd-search-index');

  if (input && resultsBox && indexEl) {
    var index = [];
    try { index = JSON.parse(indexEl.textContent) || []; } catch (e) {}
    var selected = -1;

    var escapeHtml = function (s) {
      return s.replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    };

    var highlightTerms = function (text, terms) {
      var safe = escapeHtml(text);
      terms.forEach(function (term) {
        var re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
        safe = safe.replace(re, '<mark>$1</mark>');
      });
      return safe;
    };

    var snippetAround = function (text, term) {
      var at = text.toLowerCase().indexOf(term);
      if (at < 0) return text.slice(0, 110);
      var start = Math.max(0, at - 40);
      return (start > 0 ? '…' : '') + text.slice(start, start + 130);
    };

    var search = function (query) {
      var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return [];
      var scored = [];
      for (var i = 0; i < index.length; i++) {
        var entry = index[i];
        var title = entry.title.toLowerCase();
        var text = entry.text.toLowerCase();
        var score = 0;
        var matchedAll = true;
        for (var t = 0; t < terms.length; t++) {
          var term = terms[t];
          if (title.indexOf(term) !== -1) {
            score += title === term ? 60 : title.indexOf(term) === 0 ? 30 : 18;
          } else if (text.indexOf(term) !== -1) {
            score += 6;
          } else {
            matchedAll = false;
            break;
          }
        }
        if (matchedAll) {
          // Prefer specific (deeper) sections slightly over part titles.
          scored.push({ entry: entry, score: score + (entry.level > 1 ? 2 : 0) });
        }
      }
      scored.sort(function (a, b) { return b.score - a.score; });
      return scored.slice(0, 10).map(function (s) { return s.entry; });
    };

    var close = function () {
      resultsBox.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      selected = -1;
    };

    var renderResults = function (query) {
      var entries = search(query);
      var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!query.trim()) { close(); return; }
      if (!entries.length) {
        resultsBox.innerHTML = '<div class="vd-search-empty">No matches for “' + escapeHtml(query) + '”</div>';
      } else {
        resultsBox.innerHTML = entries
          .map(function (entry, i) {
            var snippet = snippetAround(entry.text, terms[0] || '');
            return (
              '<a class="vd-search-result' + (i === selected ? ' active' : '') +
              '" role="option" href="#' + encodeURIComponent(entry.id) + '">' +
              '<span class="vd-sr-title">' + highlightTerms(entry.title, terms) + '</span>' +
              (snippet ? '<span class="vd-sr-snippet">' + highlightTerms(snippet, terms) + '</span>' : '') +
              '</a>'
            );
          })
          .join('');
      }
      resultsBox.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };

    input.addEventListener('input', function () {
      selected = -1;
      renderResults(input.value);
    });

    input.addEventListener('keydown', function (event) {
      var options = resultsBox.querySelectorAll('.vd-search-result');
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!options.length) return;
        event.preventDefault();
        selected += event.key === 'ArrowDown' ? 1 : -1;
        selected = (selected + options.length) % options.length;
        options.forEach(function (o, i) { o.classList.toggle('active', i === selected); });
        options[selected].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        var target = options[selected] || options[0];
        if (target) {
          event.preventDefault();
          target.click();
        }
      } else if (event.key === 'Escape') {
        input.value = '';
        close();
        input.blur();
      }
    });

    resultsBox.addEventListener('click', function (event) {
      if (event.target.closest('.vd-search-result')) {
        close();
        closeNav();
      }
    });

    doc.addEventListener('click', function (event) {
      if (!event.target.closest('#vd-search')) close();
    });

    doc.addEventListener('keydown', function (event) {
      if (
        event.key === '/' &&
        !event.metaKey && !event.ctrlKey && !event.altKey &&
        !/^(input|textarea|select)$/i.test(doc.activeElement.tagName) &&
        !doc.activeElement.isContentEditable
      ) {
        event.preventDefault();
        doc.body.classList.add('vd-nav-open');
        input.focus();
        input.select();
      }
    });
  }
})();
