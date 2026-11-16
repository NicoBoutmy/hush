// MINT: sanitizer for the HTML produced by Readability.
// Readability removes most junk, but its output is still page-controlled
// markup, so it is parsed in an inert document and stripped of anything
// that can run code, submit data or embed other pages before it is shown.
(() => {
  const NS = (globalThis.__mintNS = globalThis.__mintNS || {});

  const DROP_ELEMENTS = [
    "script", "style", "link", "meta", "base", "noscript", "template",
    "iframe", "frame", "frameset", "object", "embed", "applet", "portal",
    "form", "input", "button", "select", "textarea", "option", "dialog",
    "canvas", "audio", "video", "track", "math", "foreignObject", "use", "animate", "set",
  ].join(",");

  const URL_ATTRS = ["href", "src", "xlink:href", "action", "formaction", "poster", "cite", "background"];

  function isSafeUrl(value, attr) {
    const v = value.trim().replace(/[\u0000-\u001f\s]+/g, "").toLowerCase();
    if (v.startsWith("javascript:") || v.startsWith("vbscript:")) return false;
    if (v.startsWith("data:")) {
      // Inline images are fine; any other data: URL is not.
      return attr === "src" && /^data:image\/(png|gif|jpe?g|webp|avif|svg\+xml);/.test(v);
    }
    return true;
  }

  // Returns a DocumentFragment that is safe to insert into the reader.
  function sanitize(html, targetDocument) {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    doc.body.querySelectorAll(DROP_ELEMENTS).forEach((el) => el.remove());

    doc.body.querySelectorAll("*").forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (
          name.startsWith("on") ||
          name === "style" ||
          name === "class" ||
          name === "contenteditable" ||
          name === "autofocus" ||
          name === "tabindex"
        ) {
          el.removeAttribute(attr.name);
        } else if (URL_ATTRS.includes(name) && !isSafeUrl(attr.value, name)) {
          el.removeAttribute(attr.name);
        } else if (name === "srcset" && /javascript:|vbscript:/i.test(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
    });

    // Fixed pixel sizes on images would fight the column; CSS scales them.
    doc.body.querySelectorAll("img").forEach((img) => {
      img.setAttribute("decoding", "async");
      if (!img.getAttribute("alt")) img.setAttribute("alt", "");
    });

    const fragment = targetDocument.createDocumentFragment();
    for (const node of Array.from(doc.body.childNodes)) {
      fragment.appendChild(targetDocument.importNode(node, true));
    }
    return fragment;
  }

  NS.sanitize = sanitize;
})();
