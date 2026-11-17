// MINT: the reader view overlay.
// Injected on demand (toolbar icon or shortcut) into the active tab only.
// Exposes globalThis.__mint.toggle() for the service worker.
(() => {
  if (globalThis.__mint) return;
  const NS = globalThis.__mintNS;
  const S = NS.settings;

  const WORDS_PER_MINUTE = 230;
  const CJK_CHARS_PER_MINUTE = 500;
  const MIN_ARTICLE_WORDS = 150;

  let state = null; // non-null while the reader is open
  let busy = false;

  // ---------------------------------------------------------------- helpers

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v === null || v === undefined) continue;
      if (k === "text") node.textContent = v;
      else node.setAttribute(k, v === true ? "" : String(v));
    }
    for (const child of [].concat(children)) {
      if (child) node.append(child);
    }
    return node;
  }

  function svg(markup) {
    const t = document.createElement("template");
    t.innerHTML = markup.trim(); // static, extension-authored markup only
    return t.content.firstChild;
  }

  function readingMinutes(text) {
    const cjk = (text.match(/[぀-ヿ㐀-䶿一-鿿가-힯]/g) || []).length;
    const words = text.replace(/[぀-ヿ㐀-䶿一-鿿가-힯]/g, " ")
      .split(/\s+/).filter(Boolean).length;
    return { words: words + cjk / 2, minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE + cjk / CJK_CHARS_PER_MINUTE)) };
  }

  // Many sites lazy-load images by keeping the real URL in a data attribute.
  function promoteLazyImages(doc) {
    const srcAttrs = ["data-src", "data-lazy-src", "data-original", "data-url", "data-hi-res-src"];
    doc.querySelectorAll("img").forEach((img) => {
      const current = img.getAttribute("src") || "";
      const placeholder = !current || current.startsWith("data:") || /blank|spacer|placeholder|pixel\.gif/i.test(current);
      if (placeholder) {
        for (const a of srcAttrs) {
          const v = img.getAttribute(a);
          if (v && !v.startsWith("data:")) { img.setAttribute("src", v); break; }
        }
      }
      const lazySet = img.getAttribute("data-srcset") || img.getAttribute("data-lazy-srcset");
      if (lazySet && (!img.getAttribute("srcset") || placeholder)) img.setAttribute("srcset", lazySet);
    });
    doc.querySelectorAll("source[data-srcset]").forEach((s) => {
      s.setAttribute("srcset", s.getAttribute("data-srcset"));
    });
  }

  // ---------------------------------------------------------------- clutter

  // Readability keeps some page furniture that sits inside the article body.
  // Each rule below removes a block only while it stays short (BLOCK_MAX_WORDS)
  // and never climbs past the article itself, so real text is not at risk.
  const BLOCK_MAX_WORDS = 120;
  // data-nosnippet is an explicit publisher signal, so it gets more room
  // (consent overlays on embeds run long); article text is far longer still.
  const NOSNIPPET_MAX_WORDS = 200;
  const LABEL_MAX_CHARS = 40;
  const STOP_TAGS = new Set(["BODY", "MAIN", "ARTICLE", "HEADER"]);
  const IN_TEXT = "p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption, td, th";

  const AD_LABEL = /^(sponsored|sponsored content|sponsored post|paid content|paid post|paid partnership|partner content|advertisement|advertorial|sponsoris[ée]|contenu sponsoris[ée]|publicit[ée]|publi-?r[ée]dactionnel|anzeige|werbung|gesponsert|patrocinado|contenido patrocinado|publicidad|sponsorizzato|contenuto sponsorizzato|pubblicit[àa]|gesponsord|advertentie)$/i;
  const RELATED_LABEL = /^(pour aller plus loin|[àa] lire aussi|lire aussi|sur le m[êe]me sujet|read more|read next|related|related (articles|stories|posts|content|reading)|more stories|see also|you might also like|you may also like|recommended|recommended for you|mehr zum thema|weiterlesen|auch interessant|lee tambi[ée]n|te puede interesar|leggi anche|potrebbe interessarti|lees ook)$/i;

  // Visible words only: <noscript> fallbacks hold raw <img> markup as text.
  function wordCount(node) {
    let text = node.textContent || "";
    for (const hidden of node.querySelectorAll("noscript, script, style, template")) {
      text = text.replace(hidden.textContent, " ");
    }
    return text.split(/\s+/).filter(Boolean).length;
  }

  function labelText(node) {
    return (node.textContent || "").replace(/\s+/g, " ").trim().replace(/\s*:$/, "");
  }

  // Short standalone labels ("Sponsored", "Read more") matching `re`.
  // Returns the outermost element that holds nothing but the label.
  function findLabels(root, re, classHint) {
    const found = [];
    for (const leaf of root.querySelectorAll("*")) {
      if (leaf.children.length) continue;
      const text = labelText(leaf);
      if (!text || text.length > LABEL_MAX_CHARS) continue;
      if (!re.test(text) && !(classHint && Array.from(leaf.classList).some((c) => classHint.test(c)))) continue;
      let node = leaf;
      while (node.parentElement && node.parentElement !== root && labelText(node.parentElement) === text) {
        node = node.parentElement;
      }
      // Category chips, breadcrumbs and headings can legitimately say these
      // words, and a word inside a sentence is not a label.
      if (node.closest("a, button, nav, h1, h2, h3, h4, h5, h6")) continue;
      if (node.parentElement && node.parentElement.closest(IN_TEXT)) continue;
      found.push(node);
    }
    return found;
  }

  // The largest ancestor of `node` that is still short, stopping at `root`.
  function climb(node, root) {
    let block = node;
    for (let p = node.parentElement; p && p !== root && !STOP_TAGS.has(p.tagName); p = p.parentElement) {
      if (p.querySelector("h1") || wordCount(p) > BLOCK_MAX_WORDS) break;
      block = p;
    }
    return block;
  }

  // Collect first, then remove: a block may already sit inside another one.
  function removeAll(blocks) {
    for (const block of blocks) if (block.isConnected) block.remove();
  }

  // Before extraction, on the cloned page, while boxes are still intact:
  // sponsored boxes, whose small "Sponsored" label Readability drops (its
  // class matches Readability's filters) while keeping the box; and "Read
  // more" boxes, which Readability splits so the label no longer sits with
  // the linked titles.
  function removeLabelledBlocks(doc) {
    if (!doc.body) return;
    const labels = [
      ...findLabels(doc.body, AD_LABEL, /(^|[-_])sponsor/i),
      ...findLabels(doc.body, RELATED_LABEL),
    ];
    removeAll(new Set(labels.map((l) => climb(l, doc.body))));
  }

  // A short block that is almost all links: "latest news on…" lists, link
  // carousels. Running text and captions are never link-dense like this.
  function isLinkList(node) {
    const links = node.querySelectorAll("a[href]");
    if (links.length < 3) return false;
    const words = wordCount(node);
    if (!words || words > BLOCK_MAX_WORDS) return false;
    let linkWords = 0;
    for (const a of links) linkWords += wordCount(a);
    return linkWords / words >= 0.8;
  }

  // After extraction, on Readability's output only (so byline and metadata
  // detection are unaffected): page furniture that survived inside the body.
  function removeBoilerplate(root) {
    const blocks = new Set();
    // Publishers mark non-article furniture (consent overlays on embeds,
    // app-install cards, newsletter prompts) with Google's data-nosnippet.
    for (const n of root.querySelectorAll("div[data-nosnippet], section[data-nosnippet], aside[data-nosnippet]")) {
      if (n.parentElement && n.parentElement.closest(IN_TEXT)) continue;
      if (wordCount(n) <= NOSNIPPET_MAX_WORDS) blocks.add(n);
    }
    for (const n of root.querySelectorAll("div, section, aside")) {
      if (n.parentElement && n.parentElement.closest(IN_TEXT)) continue;
      if (isLinkList(n)) blocks.add(n);
    }
    removeAll(blocks);
  }

  function extract() {
    try {
      const clone = document.cloneNode(true);
      promoteLazyImages(clone);
      removeLabelledBlocks(clone);
      const article = new Readability(clone, { keepClasses: false }).parse();
      if (!article || !article.content) return null;
      // An inert document: nothing in it loads or runs.
      const body = new DOMParser().parseFromString(`<body>${article.content}</body>`, "text/html").body;
      removeBoilerplate(body);
      const { words, minutes } = readingMinutes(body.textContent || "");
      if (words < MIN_ARTICLE_WORDS) return null;
      return { ...article, content: body.innerHTML, textContent: body.textContent, minutes };
    } catch (_) {
      return null;
    }
  }

  // ---------------------------------------------------------------- building

  function buildToolbar(withSettings) {
    const close = el("button", {
      class: "cr-btn cr-icon-btn cr-close",
      type: "button",
      "aria-label": "Close reader view (Esc)",
      title: "Close reader view (Esc)",
    }, svg('<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'));

    const items = [];
    let aa = null;
    if (withSettings) {
      aa = el("button", {
        class: "cr-btn cr-icon-btn cr-aa",
        type: "button",
        "aria-label": "Text and display settings",
        title: "Text and display settings",
        "aria-haspopup": "dialog",
        "aria-expanded": "false",
        "aria-controls": "cr-popover",
      }, [el("span", { class: "cr-aa-small", "aria-hidden": "true", text: "A" }), el("span", { "aria-hidden": "true", text: "A" })]);
      items.push(aa);
    }
    items.push(close);
    return { toolbar: el("div", { class: "cr-toolbar" }, items), close, aa };
  }

  function radioGroup(className, label, options, current, render) {
    const group = el("div", { class: className, role: "radiogroup", "aria-label": label });
    for (const opt of options) {
      const btn = render(opt);
      btn.setAttribute("role", "radio");
      btn.setAttribute("type", "button");
      btn.dataset.value = opt.id;
      group.append(btn);
    }
    setRadio(group, current);
    return group;
  }

  function setRadio(group, value) {
    for (const btn of group.querySelectorAll('[role="radio"]')) {
      const on = btn.dataset.value === value;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1; // roving tabindex: one tab stop per group
    }
  }

  const WIDTH_ICONS = {
    narrow: '<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><path d="M8 3h6M8 7h6M8 11h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    medium: '<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><path d="M5.5 3h11M5.5 7h11M5.5 11h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    wide: '<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><path d="M2 3h18M2 7h18M2 11h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };
  const SPACING_ICONS = {
    tight: '<svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M3 5h12M3 8h12M3 11h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    normal: '<svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M3 3.5h12M3 8h12M3 12.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    loose: '<svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M3 1.5h12M3 8h12M3 14.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  function buildPopover(settings) {
    const dec = el("button", { class: "cr-ctl cr-size-dec", type: "button", "aria-label": "Smaller text", title: "Smaller text", text: "A" });
    const inc = el("button", { class: "cr-ctl cr-size-inc", type: "button", "aria-label": "Larger text", title: "Larger text", text: "A" });
    const sizeStatus = el("span", { class: "cr-visually-hidden", role: "status", "aria-live": "polite" });

    const themes = radioGroup("cr-themes", "Theme", S.THEMES, settings.theme, (t) =>
      el("button", { class: "cr-swatch", "aria-label": t.label, title: t.label }));

    const fonts = radioGroup("cr-fonts", "Font", S.FONTS, settings.font, (f) => {
      const btn = el("button", { class: "cr-font" }, [
        el("span", { text: f.label }),
        svg('<svg class="cr-check" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
      ]);
      btn.style.fontFamily = f.stack; // each font shown in its own typeface
      return btn;
    });

    const widths = radioGroup("cr-seg", "Column width", S.WIDTHS, settings.width, (w) => {
      const b = el("button", { class: "cr-ctl", "aria-label": `${w.label} column`, title: `${w.label} column` });
      b.append(svg(WIDTH_ICONS[w.id]));
      return b;
    });
    const spacings = radioGroup("cr-seg", "Line spacing", S.SPACINGS, settings.spacing, (s) => {
      const b = el("button", { class: "cr-ctl", "aria-label": `${s.label} line spacing`, title: `${s.label} line spacing` });
      b.append(svg(SPACING_ICONS[s.id]));
      return b;
    });

    const popover = el("div", {
      class: "cr-popover",
      id: "cr-popover",
      role: "dialog",
      "aria-label": "Text and display settings",
      hidden: true,
    }, [
      el("div", { class: "cr-section cr-size-row", role: "group", "aria-label": "Text size" }, [dec, inc, sizeStatus]),
      el("div", { class: "cr-section" }, themes),
      el("div", { class: "cr-section" }, fonts),
      el("div", { class: "cr-section" }, [
        el("div", { class: "cr-row" }, [el("span", { class: "cr-row-label", "aria-hidden": "true", text: "Width" }), widths]),
        el("div", { class: "cr-row" }, [el("span", { class: "cr-row-label", "aria-hidden": "true", text: "Spacing" }), spacings]),
      ]),
    ]);

    return { popover, dec, inc, sizeStatus, groups: { theme: themes, font: fonts, width: widths, spacing: spacings } };
  }

  function buildArticle(article) {
    const meta = [article.byline, article.siteName].map((s) => (s || "").trim()).filter(Boolean);
    // Avoid "By Jane Doe · Jane Doe" when Readability finds the same string twice.
    const uniqueMeta = meta.filter((m, i) => meta.indexOf(m) === i);

    const content = el("div", { class: "cr-content" });
    content.append(NS.sanitize(article.content, document));

    // Readability often keeps the headline as the first heading of the body.
    const firstHeading = content.querySelector("h1, h2");
    const title = (article.title || document.title || "").trim();
    if (firstHeading && firstHeading.textContent.trim() === title) {
      const prev = firstHeading.previousElementSibling;
      if (!prev || !prev.textContent.trim()) firstHeading.remove();
    }

    const lang = article.lang || document.documentElement.lang || null;
    const dir = article.dir || null;

    return el("article", { class: "cr-article", lang, dir }, [
      el("header", { class: "cr-header" }, [
        el("h1", { class: "cr-title", text: title }),
        uniqueMeta.length ? el("p", { class: "cr-meta", text: uniqueMeta.join(" · ") }) : null,
        el("p", { class: "cr-meta cr-time", text: `${article.minutes} min read` }),
      ]),
      content,
    ]);
  }

  function buildEmpty() {
    const back = el("button", { class: "cr-btn cr-back", type: "button", text: "Back to page" });
    const view = el("div", { class: "cr-empty" }, el("div", { class: "cr-empty-inner" }, [
      el("h1", { text: "This page doesn't look like an article" }),
      el("p", { text: "Reader view works best on articles and blog posts. Try it on a story or post page." }),
      back,
    ]));
    return { view, back };
  }

  // ---------------------------------------------------------------- applying settings

  function apply(settings) {
    if (!state) return;
    state.settings = settings;
    state.root.dataset.theme = settings.theme;
    const art = state.articleEl;
    if (art) {
      const font = S.FONTS.find((f) => f.id === settings.font);
      art.style.setProperty("--font", font.stack);
      art.style.setProperty("--size", `${settings.fontSize}px`);
      art.style.setProperty("--measure", S.WIDTHS.find((w) => w.id === settings.width).value);
      art.style.setProperty("--leading", S.SPACINGS.find((s) => s.id === settings.spacing).value);
    }
    const p = state.pop;
    if (p) {
      p.dec.disabled = settings.fontSize <= S.FONT_SIZE.min;
      p.inc.disabled = settings.fontSize >= S.FONT_SIZE.max;
      for (const [key, group] of Object.entries(p.groups)) setRadio(group, settings[key]);
    }
    updateProgress();
  }

  function change(patch) {
    const next = S.validate({ ...state.settings, ...patch });
    apply(next);
    S.save(next);
  }

  // ---------------------------------------------------------------- popover

  function popoverFocusables() {
    const p = state.pop.popover;
    return Array.from(p.querySelectorAll("button")).filter((b) => !b.disabled && b.tabIndex !== -1);
  }

  function openPopover() {
    const { popover } = state.pop;
    popover.hidden = false;
    state.aa.setAttribute("aria-expanded", "true");
    const first = popoverFocusables()[0];
    if (first) first.focus();
  }

  function closePopover(returnFocus = true) {
    if (!state || !state.pop || state.pop.popover.hidden) return false;
    state.pop.popover.hidden = true;
    state.aa.setAttribute("aria-expanded", "false");
    if (returnFocus) state.aa.focus();
    return true;
  }

  function onPopoverClick(e) {
    const btn = e.target.closest("button");
    if (!btn || btn.disabled) return;
    const p = state.pop;
    if (btn === p.dec || btn === p.inc) {
      const delta = btn === p.inc ? S.FONT_SIZE.step : -S.FONT_SIZE.step;
      change({ fontSize: state.settings.fontSize + delta });
      p.sizeStatus.textContent = `Text size ${state.settings.fontSize} pixels`;
      if (btn.disabled) (btn === p.inc ? p.dec : p.inc).focus(); // keep focus off a disabled button
      return;
    }
    for (const [key, group] of Object.entries(p.groups)) {
      if (group.contains(btn) && btn.dataset.value) change({ [key]: btn.dataset.value });
    }
  }

  function onPopoverKeydown(e) {
    // Arrow keys move and select inside each radio group (like native radios).
    const btn = e.target.closest('[role="radio"]');
    if (btn && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(e.key)) {
      const radios = Array.from(btn.parentElement.querySelectorAll('[role="radio"]'));
      let i = radios.indexOf(btn);
      if (e.key === "Home") i = 0;
      else if (e.key === "End") i = radios.length - 1;
      else i = (i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + radios.length) % radios.length;
      e.preventDefault();
      radios[i].click();
      radios[i].focus();
      return;
    }
    // Keep Tab inside the open popover.
    if (e.key === "Tab") {
      const items = popoverFocusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = state.shadow.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  }

  // ---------------------------------------------------------------- progress

  function updateProgress() {
    if (!state || !state.progress) return;
    const r = state.root;
    const max = r.scrollHeight - r.clientHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, r.scrollTop / max)) : 1;
    state.progress.style.transform = `scaleX(${ratio})`;
  }

  function onScroll() {
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      updateProgress();
    });
  }

  // ---------------------------------------------------------------- open / close

  async function open() {
    const settings = await S.load(); // before first paint, so the theme never flashes
    const article = extract();

    const host = document.createElement("div");
    host.setAttribute("data-mint", "");
    host.style.cssText =
      "all: initial !important; position: fixed !important; inset: 0 !important;" +
      "z-index: 2147483647 !important; display: block !important;";
    const shadow = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = NS.styles;

    const root = el("div", { class: "cr-root", tabindex: "-1", role: "document" });
    root.dataset.theme = settings.theme;

    const html = document.documentElement;
    state = {
      host, shadow, root, settings,
      scrollX: window.scrollX, scrollY: window.scrollY,
      previousFocus: document.activeElement,
      overflow: [html.style.getPropertyValue("overflow"), html.style.getPropertyPriority("overflow"),
        document.body ? document.body.style.getPropertyValue("overflow") : "",
        document.body ? document.body.style.getPropertyPriority("overflow") : ""],
      cleanups: [],
      raf: 0,
    };

    if (article) {
      state.progress = el("div", { class: "cr-progress", "aria-hidden": "true" });
      const { toolbar, close, aa } = buildToolbar(true);
      state.aa = aa;
      state.pop = buildPopover(settings);
      state.articleEl = buildArticle(article);
      root.setAttribute("aria-label", `Reader view: ${state.articleEl.querySelector(".cr-title").textContent}`);
      root.append(state.progress, toolbar, state.pop.popover, state.articleEl);

      close.addEventListener("click", () => closeReader());
      aa.addEventListener("click", () => (state.pop.popover.hidden ? openPopover() : closePopover()));
      state.pop.popover.addEventListener("click", onPopoverClick);
      state.pop.popover.addEventListener("keydown", onPopoverKeydown);
      root.addEventListener("scroll", onScroll, { passive: true });
      state.articleEl.addEventListener("click", onArticleClick);
      // Outside click closes the popover.
      root.addEventListener("pointerdown", (e) => {
        const path = e.composedPath();
        if (!state.pop.popover.hidden && !path.includes(state.pop.popover) && !path.includes(state.aa)) {
          closePopover(false);
        }
      });
      state.cleanups.push(S.onChange((s) => apply(s))); // keep in sync with other tabs
    } else {
      const { toolbar } = buildToolbar(false);
      const empty = buildEmpty();
      root.setAttribute("aria-label", "Reader view unavailable");
      root.append(toolbar, empty.view);
      toolbar.querySelector(".cr-close").addEventListener("click", () => closeReader());
      empty.back.addEventListener("click", () => closeReader());
    }

    // Stop keystrokes inside the reader from reaching the page's own handlers.
    for (const type of ["keydown", "keyup", "keypress"]) {
      host.addEventListener(type, (e) => e.stopPropagation());
    }
    const onKey = (e) => {
      if (e.key !== "Escape" || !state) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!closePopover()) closeReader();
    };
    window.addEventListener("keydown", onKey, true);
    state.cleanups.push(() => window.removeEventListener("keydown", onKey, true));

    shadow.append(style, root);
    html.style.setProperty("overflow", "hidden", "important");
    if (document.body) document.body.style.setProperty("overflow", "hidden", "important");
    html.appendChild(host);

    apply(settings);
    // Article: focus the scroller so arrow keys / space scroll right away.
    // Not an article: focus the way back.
    const back = root.querySelector(".cr-back");
    (back || root).focus({ preventScroll: true });
  }

  // In-article footnote links (#id) must scroll inside the reader, not the page.
  function onArticleClick(e) {
    const a = e.target.closest("a[href]");
    if (!a) return;
    let url;
    try { url = new URL(a.getAttribute("href"), document.baseURI); } catch (_) { return; }
    const here = new URL(location.href);
    if (url.hash && url.origin === here.origin && url.pathname === here.pathname && url.search === here.search) {
      const id = decodeURIComponent(url.hash.slice(1));
      const target = state.shadow.getElementById(id) || state.shadow.querySelector(`[name="${CSS.escape(id)}"]`);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ block: "start" });
      }
    }
  }

  function closeReader() {
    if (!state) return;
    const s = state;
    state = null;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.cleanups.forEach((fn) => { try { fn(); } catch (_) { /* ignore */ } });
    s.host.remove();

    const html = document.documentElement;
    restoreStyle(html, "overflow", s.overflow[0], s.overflow[1]);
    if (document.body) restoreStyle(document.body, "overflow", s.overflow[2], s.overflow[3]);
    window.scrollTo({ left: s.scrollX, top: s.scrollY, behavior: "instant" });

    if (s.previousFocus && typeof s.previousFocus.focus === "function" && document.contains(s.previousFocus)) {
      s.previousFocus.focus({ preventScroll: true });
    }
  }

  function restoreStyle(node, prop, value, priority) {
    if (value) node.style.setProperty(prop, value, priority);
    else node.style.removeProperty(prop);
  }

  async function toggle() {
    if (busy) return;
    busy = true;
    try {
      if (state) closeReader();
      else await open();
    } finally {
      busy = false;
    }
  }

  globalThis.__mint = { toggle, isOpen: () => Boolean(state) };
})();
