/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/cards-feature.js
  function parse(element, { document }) {
    if (element.isConnected === false) {
      return;
    }
    const CARD_SELECTORS = ".video-card-v2, .text-card, .basic-list-card, .list-card, .list-text-card-link, .shell-card, .icon-shell-card, .text-card-circle-icon, .text-card-full-width-image, .text-card-feature-articles, .video-card-list, .text-card-article-list-xs";
    if (element.parentElement && element.parentElement.closest(CARD_SELECTORS)) {
      return;
    }
    const cells = [];
    const clone = (n) => n ? n.cloneNode(true) : null;
    const hasContent = (n) => {
      if (!n) return false;
      if (n.querySelector && n.querySelector("img, iframe, a, ul, ol")) return true;
      return (n.textContent || "").trim().length > 0;
    };
    const collectBody = (root, headingSel, textSel, ctaSel) => {
      const body = [];
      if (headingSel) {
        const heading = root.querySelector(headingSel);
        if (heading && hasContent(heading)) body.push(heading);
      }
      if (textSel) {
        root.querySelectorAll(textSel).forEach((n) => {
          if (hasContent(n)) body.push(n);
        });
      }
      if (ctaSel) {
        root.querySelectorAll(ctaSel).forEach((a) => {
          if (a) body.push(a);
        });
      }
      return body;
    };
    const pushCardRow = (image, body, fallback) => {
      const bodyNodes = body && body.length ? body : [clone(fallback)];
      if (image) {
        cells.push([image, bodyNodes]);
      } else {
        cells.push([bodyNodes]);
      }
    };
    const absolutize = (u) => {
      if (!u) return u;
      try {
        return new URL(u, document.location && document.location.href || "https://www.bannerhealth.com/").href;
      } catch (e) {
        return u;
      }
    };
    const bgUrl = (node) => {
      if (!node) return "";
      const style = node.getAttribute && node.getAttribute("style");
      if (!style) return "";
      const m = style.match(/url\((['"]?)(.*?)\1\)/i);
      return m ? m[2] : "";
    };
    const resolveImage = (node, bgFallback) => {
      const isReal = (u) => u && !/^data:|placeholder|blank\.gif|1x1|spacer/i.test(u);
      let src = "";
      if (node && node.tagName === "IMG") {
        const candidates = [
          node.getAttribute("data-src"),
          node.getAttribute("data-original"),
          node.getAttribute("data-lazy"),
          node.getAttribute("data-srcset"),
          node.getAttribute("src")
        ];
        for (const c of candidates) {
          if (!c) continue;
          const first = c.trim().split(/[\s,]+/)[0];
          if (isReal(first)) {
            src = first;
            break;
          }
        }
      }
      if (!src) {
        const b1 = bgUrl(node);
        if (isReal(b1)) src = b1;
      }
      if (!src && bgFallback) {
        const b2 = bgUrl(bgFallback);
        if (isReal(b2)) src = b2;
      }
      if (!src) return null;
      const out = document.createElement("img");
      out.setAttribute("src", absolutize(src));
      const alt = node && node.getAttribute && node.getAttribute("alt");
      if (alt) out.setAttribute("alt", alt);
      return out;
    };
    const articleBody = (root, { eyebrowSel, titleSel, dateSel }) => {
      const body = [];
      if (eyebrowSel) {
        const eyebrow = root.querySelector(eyebrowSel);
        const text = eyebrow && (eyebrow.textContent || "").trim();
        if (text) {
          const p = document.createElement("p");
          p.textContent = text;
          body.push(p);
        }
      }
      if (titleSel) {
        const titleLink = root.querySelector(titleSel);
        if (titleLink) {
          const text = (titleLink.textContent || "").trim();
          const href = titleLink.getAttribute("href");
          const h = document.createElement("h3");
          if (href) {
            const a = document.createElement("a");
            a.setAttribute("href", href);
            a.textContent = text;
            h.appendChild(a);
          } else {
            h.textContent = text;
          }
          if (text) body.push(h);
        }
      }
      if (dateSel) {
        const date = root.querySelector(dateSel);
        const text = date && (date.textContent || "").trim();
        if (text) {
          const p = document.createElement("p");
          p.textContent = text;
          body.push(p);
        }
      }
      return body;
    };
    const gridSiblings = (el, sameSel) => {
      const colWrap = el.closest('[class*="col-"]');
      if (!colWrap) return null;
      const row = colWrap.parentElement;
      if (!row || !row.matches || !row.matches(".row")) return null;
      const siblings = Array.from(row.querySelectorAll(sameSel)).filter((c) => {
        const w = c.closest('[class*="col-"]');
        return w && w.parentElement === row;
      });
      return siblings.length >= 2 ? siblings : null;
    };
    const emitGrid = (siblings, buildCard) => {
      siblings.forEach((card) => {
        const { image, body, fallback } = buildCard(card);
        pushCardRow(image, body, fallback || card);
      });
      if (!cells.length) cells.push([[clone(siblings[0])]]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      siblings.forEach((card) => {
        if (card === element) return;
        if (card.isConnected) card.replaceWith(document.createElement("div"));
      });
      element.replaceWith(block2);
    };
    if (element.matches(".text-card-feature-articles")) {
      const articles = Array.from(element.querySelectorAll(".text-card-feature-article"));
      articles.forEach((card) => {
        const info = card.querySelector(":scope > .text-card-feature-article-info, .text-card-feature-article-info");
        const img = resolveImage(card.querySelector(":scope > img, img"), card);
        const body = articleBody(info || card, {
          eyebrowSel: ".text-card-feature-article-eyebrow",
          titleSel: ".text-card-feature-article-title a, a.text-card-feature-article-button",
          dateSel: ".text-card-feature-article-date"
        });
        if (img || body.length) pushCardRow(img, body, card);
      });
      if (!cells.length) cells.push([[clone(element)]]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".video-card-list")) {
      const heading = element.querySelector(".video-card-list-heading, h2");
      if (heading && hasContent(heading)) {
        const h = document.createElement("h2");
        h.textContent = (heading.textContent || "").trim();
        cells.push([[h]]);
      }
      const videos = Array.from(element.querySelectorAll(".video-card-list-card"));
      videos.forEach((card) => {
        const ytId = card.getAttribute("data-yt");
        const articleLink = card.getAttribute("data-article-link");
        const placeholderAlt = card.getAttribute("data-placeholder-image") || "";
        let img = null;
        if (ytId) {
          img = document.createElement("img");
          img.setAttribute("src", `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
          if (placeholderAlt) img.setAttribute("alt", placeholderAlt);
        }
        const body = [];
        const eyebrow = card.querySelector(".video-card-list-card-eyebrow");
        const eyebrowText = eyebrow && (eyebrow.textContent || "").trim();
        if (eyebrowText) {
          const p = document.createElement("p");
          p.textContent = eyebrowText;
          body.push(p);
        }
        const title = card.querySelector(".video-card-list-card-title");
        const titleText = title && (title.textContent || "").trim();
        if (titleText) {
          const h = document.createElement("h3");
          if (articleLink) {
            const a = document.createElement("a");
            a.setAttribute("href", absolutize(articleLink));
            a.textContent = titleText;
            h.appendChild(a);
          } else {
            h.textContent = titleText;
          }
          body.push(h);
        }
        if (img || body.length) pushCardRow(img, body, card);
      });
      if (!cells.length) cells.push([[clone(element)]]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".text-card-article-list-xs")) {
      const listEyebrow = element.querySelector(".text-card-article-list-xs-eyebrow");
      const eyebrowText = listEyebrow && (listEyebrow.textContent || "").trim();
      if (eyebrowText) {
        const p = document.createElement("p");
        p.textContent = eyebrowText;
        cells.push([[p]]);
      }
      const cards = Array.from(element.querySelectorAll(".text-card-article-card"));
      cards.forEach((card) => {
        const imageWrap = card.querySelector(".text-card-article-card-image");
        const img = resolveImage(card.querySelector(".text-card-article-card-image img, img"), imageWrap);
        const body = articleBody(card, {
          eyebrowSel: ".text-card-article-card-eyebrow a, .text-card-article-card-eyebrow",
          titleSel: ".text-card-article-card-title a, .text-card-article-card-title-link",
          dateSel: ".text-card-article-card-date"
        });
        if (img || body.length) pushCardRow(img, body, card);
      });
      if (!cells.length) cells.push([[clone(element)]]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".icon-shell-card")) {
      const body = [];
      const textHeader = element.querySelector(".text-header");
      const title = (textHeader || element).querySelector(".icon-shell-card-title, h2, h3, h4");
      const titleText = title && (title.textContent || "").trim();
      if (titleText) {
        const h = document.createElement("h3");
        h.textContent = titleText;
        body.push(h);
      }
      const support = textHeader ? textHeader.querySelector("span, p") : element.querySelector(":scope span, :scope p");
      const supportText = support && (support.textContent || "").trim();
      if (supportText) {
        const p = document.createElement("p");
        p.textContent = supportText;
        body.push(p);
      }
      const wrapper = element.querySelector(".input-wrapper");
      const btn = wrapper && wrapper.querySelector("button, .btn");
      const btnLabel = btn && (btn.textContent || "").trim() || "Sign up";
      const placeholder = document.createElement("p");
      placeholder.textContent = `Email signup: enter your email address and select \u201C${btnLabel}\u201D.`;
      body.push(placeholder);
      pushCardRow(null, body, element);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".list-card")) {
      const header = element.querySelector(".list-card-header");
      if (header && hasContent(header)) cells.push([[clone(header)]]);
      const grid = element.querySelector(":scope > .container > .content-container, :scope .content-container");
      const items = grid ? Array.from(grid.querySelectorAll(".card-item")).filter((item) => {
        const owner = item.closest(
          ".basic-list-card, .text-card-full-width-image, .list-card-icon, .text-card-circle-icon, .text-card, .list-text-card-link"
        );
        return !owner || !element.contains(owner) || owner === element;
      }) : [];
      items.forEach((item) => {
        const icon = resolveImage(item.querySelector(".icon-circle img, .icon img, img"), item) || (item.querySelector(".icon-circle img, .icon img, img") ? clone(item.querySelector(".icon-circle img, .icon img, img")) : null);
        const body = [];
        const heading = item.querySelector('.card-body h3, h3, [class*="heading"]');
        if (heading && hasContent(heading)) body.push(clone(heading));
        item.querySelectorAll(".card-body > p, .card-text").forEach((p) => {
          if (hasContent(p)) body.push(clone(p));
        });
        pushCardRow(icon, body, item);
      });
      if (!cells.length) cells.push([[clone(element)]]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".list-text-card-link")) {
      const header = element.querySelector(".list-card-header");
      if (header && hasContent(header)) cells.push([[clone(header)]]);
      const links = Array.from(element.querySelectorAll("a.text-card-link, .text-card-link"));
      links.forEach((link) => {
        const body = [];
        const title = link.querySelector(".text-card-link-title");
        const content = link.querySelector(".text-card-link-content");
        if (title && hasContent(title)) {
          const h = document.createElement("h3");
          h.textContent = (title.textContent || "").trim();
          body.push(h);
        }
        if (content && hasContent(content)) body.push(clone(content));
        const href = link.getAttribute("href");
        if (href) {
          const cta = document.createElement("a");
          cta.setAttribute("href", href);
          const label = title && (title.textContent || "").trim() || link.textContent.trim() || "Learn more";
          cta.textContent = label;
          body.push(cta);
        }
        if (body.length) pushCardRow(null, body, link);
      });
      if (!cells.length) cells.push([[clone(element)]]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".text-card-full-width-image")) {
      const image = element.querySelector("img");
      const imgClone = image ? clone(image) : null;
      const body = [];
      const heading = element.querySelector('h1, h2, h3, [class*="heading"], .card-title');
      if (heading && hasContent(heading)) body.push(clone(heading));
      element.querySelectorAll(":scope > p, .card-text, .sub-heading").forEach((p) => {
        if (hasContent(p)) body.push(clone(p));
      });
      element.querySelectorAll('a.btn, a[class*="button"]').forEach((a) => body.push(clone(a)));
      if (imgClone || body.length) pushCardRow(imgClone, body, element);
      if (!cells.length) cells.push([[clone(element)]]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".text-card-circle-icon")) {
      if (element.parentElement && element.parentElement.closest(".text-card-circle-icon")) {
        return;
      }
      const buildCard = (card) => {
        const iconNode = card.querySelector(".icon img, img");
        const image2 = iconNode ? clone(iconNode) : null;
        const body2 = collectBody(
          card,
          'h3, .card-body h3, [class*="heading"]',
          ".card-body > p, .card-text",
          null
        ).map((n) => clone(n));
        return { image: image2, body: body2 };
      };
      const siblings = gridSiblings(element, ".text-card-circle-icon");
      if (siblings) {
        if (element !== siblings[0]) return;
        emitGrid(siblings, buildCard);
        return;
      }
      const { image, body } = buildCard(element);
      pushCardRow(image, body, element);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".video-card-v2")) {
      const buildCard = (card) => {
        const imgNode = card.querySelector(".background-image-without-text img, img");
        const image2 = imgNode ? clone(imgNode) : null;
        const body2 = collectBody(
          card,
          ".video-title, h1, h2",
          null,
          ".bh-side-by-side-buttons a, a.btn"
        ).map((n) => clone(n));
        return { image: image2, body: body2 };
      };
      const siblings = gridSiblings(element, ".video-card-v2");
      if (siblings) {
        if (element !== siblings[0]) return;
        emitGrid(siblings, buildCard);
        return;
      }
      const image = element.querySelector(".background-image-without-text img, img");
      const body = collectBody(
        element,
        ".video-title, h1, h2",
        null,
        ".bh-side-by-side-buttons a, a.btn"
      );
      pushCardRow(image, body, element);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".image-text-card-body")) {
      const body = collectBody(
        element,
        ".card-title",
        ".card-text",
        ".text-card-left-button a, a.btn"
      );
      pushCardRow(null, body, element);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".basic-list-card")) {
      const buildCard = (card) => {
        const body2 = [];
        const heading2 = card.querySelector(".card-title, h2, h3");
        if (heading2) body2.push(clone(heading2));
        card.querySelectorAll(".content-container > div").forEach((div) => {
          if (div.querySelector(".card-title, h2, h3")) return;
          if (div.querySelector("a.btn")) return;
          body2.push(clone(div));
        });
        card.querySelectorAll("a.btn").forEach((a) => body2.push(clone(a)));
        return { image: null, body: body2 };
      };
      const siblings = gridSiblings(element, ".basic-list-card");
      if (siblings) {
        if (element !== siblings[0]) return;
        emitGrid(siblings, buildCard);
        return;
      }
      const body = [];
      const heading = element.querySelector(".card-title, h2, h3");
      if (heading) body.push(heading);
      element.querySelectorAll(".content-container > div").forEach((div) => {
        if (div.querySelector(".card-title, h2, h3")) return;
        if (div.querySelector("a.btn")) return;
        body.push(div);
      });
      element.querySelectorAll("a.btn").forEach((a) => body.push(a));
      pushCardRow(null, body, element);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".shell-card")) {
      const buildCard = (card) => {
        const imgNode = card.querySelector(".shell-card-image img, .icon-svg img, img");
        const image2 = imgNode ? clone(imgNode) : null;
        const body2 = collectBody(
          card,
          ".shell-card-title",
          ".shell-card-text",
          "a.btn"
        ).map((n) => clone(n));
        return { image: image2, body: body2 };
      };
      const siblings = gridSiblings(element, ".shell-card");
      if (siblings) {
        if (element !== siblings[0]) return;
        emitGrid(siblings, buildCard);
        return;
      }
      const image = element.querySelector(".shell-card-image img, .icon-svg img, img");
      const body = collectBody(
        element,
        ".shell-card-title",
        ".shell-card-text",
        "a.btn"
      );
      pushCardRow(image, body, element);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    if (element.matches(".text-card")) {
      const buildCard = (card) => {
        const imgNode = card.querySelector(".text-card-image img");
        const nestedBody2 = card.querySelector(".image-text-card-body");
        if (imgNode && nestedBody2) {
          const body2 = collectBody(
            nestedBody2,
            ".card-title",
            ".card-text",
            ".text-card-left-button a, a.btn"
          ).map((n) => clone(n));
          return { image: clone(imgNode), body: body2 };
        }
        const body = collectBody(
          card,
          ".card-body > h1, .card-body > h2, .card-body > h3, h3",
          ".card-text, .card-body > p",
          ".card-body a.btn"
        ).map((n) => clone(n));
        return { image: null, body };
      };
      const siblings = gridSiblings(element, ".text-card");
      if (siblings) {
        if (element !== siblings[0]) return;
        emitGrid(siblings, buildCard);
        return;
      }
      const image = element.querySelector(".text-card-image img");
      const nestedBody = element.querySelector(".image-text-card-body");
      if (image && nestedBody) {
        const body = collectBody(
          nestedBody,
          ".card-title",
          ".card-text",
          ".text-card-left-button a, a.btn"
        );
        pushCardRow(image, body, nestedBody);
      } else {
        const body = collectBody(
          element,
          ".card-body > h1, .card-body > h2, .card-body > h3, h3",
          ".card-text, .card-body > p",
          ".card-body a.btn"
        );
        pushCardRow(null, body, element);
      }
      const block2 = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
      element.replaceWith(block2);
      return;
    }
    pushCardRow(null, [element], element);
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/bannerhealth-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#gcnModal",
        "#searchModal",
        "#geoLocationModal",
        "#destination_publishing_iframe_bannerhealthcare_0",
        ".aamIframeLoaded",
        // Dismissible global app-install promo widget (logo + INSTALL/Open),
        // not authorable page content. Verified in cleaned.html (line ~248).
        "section.bh-app-mobile-download"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer.global-footer",
        "nav.navbar-utility",
        "nav.navbar-main",
        "button.header-search"
      ]);
    }
  }

  // tools/importer/import-homepage.js
  var parsers = {
    "cards-feature": parse
  };
  var transformers = [
    transform
  ];
  var PAGE_TEMPLATE = {
    name: "homepage",
    description: "Top-level landing page composed entirely of stacked card/promo blocks (no hero)",
    urls: [
      "https://www.bannerhealth.com/"
    ],
    blocks: [
      {
        name: "cards-feature",
        instances: [
          ".video-card-v2",
          ".text-card",
          ".basic-list-card",
          ".shell-card",
          ".text-card-circle-icon"
        ]
      }
    ],
    sections: []
  };
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    const seen = /* @__PURE__ */ new Set();
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          if (seen.has(element)) return;
          seen.add(element);
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_homepage_default = {
    transform: (payload) => {
      const {
        document,
        url,
        html,
        params
      } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path: path || "/index",
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();
