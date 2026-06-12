/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-feature. Base block: cards.
 * Source: https://www.bannerhealth.com/ (homepage template)
 * Generated: 2026-06-12
 *
 * This variant covers several distinct source card/promo containers that all
 * render as a single cards (feature) block. Each card becomes one row:
 *   - Optional leading image cell.
 *   - Body cell: heading + descriptive text/lists + optional CTA link(s).
 *
 * Handled source structures (selectors from page-templates.json instances[]):
 *   .video-card-v2          -> h1.video-title + .bh-side-by-side-buttons a, image in .background-image-without-text img
 *   .text-card (simple)     -> .card-body (optional heading, .card-text, links/iframe), no image
 *   .text-card (row)        -> .text-card-image img + nested .image-text-card-body body
 *   .image-text-card-body   -> .card-title + .card-text + .text-card-left-button a
 *   .basic-list-card        -> .card-title + text block + CTA button, no image
 *   .shell-card             -> .shell-card-title + .shell-card-text + .shell-card-image img (or kyruus title-only)
 *   .text-card-circle-icon  -> .icon img + .card-body (h3 + text + link) icon-grid item
 *   .list-card              -> .list-card-header (heading + sub-heading) + grid of .card-item
 *                              stat cards (icon + h3 [+ text]); one row per card
 *   .list-text-card-link    -> .list-card-header heading + grid of <a.text-card-link>
 *                              (title + content + the link href as CTA); one row per link card
 *   .text-card-full-width-image -> full-width promo band: leading <img> (+ optional heading/text/CTA)
 *
 * The .text-card "row" form contains a nested .image-text-card-body that is ALSO
 * matched by its own selector. To avoid double-extraction, when an element is a
 * .text-card row that wraps an .image-text-card-body we build the row from the
 * image + nested body here, and the standalone .image-text-card-body branch only
 * runs when the body is not already wrapped by a handled .text-card row.
 *
 * 🔴 HierarchyRequestError avoidance: on this template the source HTML is malformed
 * (many unclosed <div>/<img> tags), so the browser nests several separately-matched
 * containers (.basic-list-card, .text-card-full-width-image, .list-card-icon,
 * .text-card-circle-icon, .text-card, .list-text-card-link) INSIDE a .list-card.
 * If a branch put the live `element` (or a live ancestor) into a cell and then called
 * element.replaceWith(block), the new block would contain its own parent -> the DOM
 * throws "HierarchyRequestError: ... child contains the parent". The .list-card,
 * .list-text-card-link and .text-card-full-width-image branches therefore extract
 * ONLY detached clones (cloneNode) of the specific sub-content they own; they never
 * reference the live element or its live descendants. The .list-card branch also
 * scopes extraction to its OWN header + direct stat .card-item cards so it does not
 * re-wrap nested matched containers that have their own branches/replacements.
 */
export default function parse(element, { document }) {
  // A previously-processed outer card may have been replaced, detaching this element
  // from the live tree. replaceWith() on a detached node (or one whose parent now lives
  // inside a freshly built block) throws HierarchyRequestError. Skip it — its content
  // was already captured by the ancestor card that carried it.
  if (element.isConnected === false) {
    return;
  }

  // Malformed source markup sometimes nests one matched card-container inside another
  // (e.g. a bare .text-card-circle-icon inside a .card.text-card-circle-icon, or card
  // containers re-parented under a sibling). Building a block from a descendant whose
  // ancestor is also a matched container makes replaceWith() insert a node that contains
  // its own parent -> HierarchyRequestError. If any ancestor is itself a card container
  // this parser handles, skip the inner element; the outer one carries the content.
  const CARD_SELECTORS = '.video-card-v2, .text-card, .basic-list-card, .list-card,'
    + ' .list-text-card-link, .shell-card, .icon-shell-card, .text-card-circle-icon,'
    + ' .text-card-full-width-image, .text-card-feature-articles, .video-card-list,'
    + ' .text-card-article-list-xs';
  if (element.parentElement && element.parentElement.closest(CARD_SELECTORS)) {
    return;
  }

  const cells = [];

  // Clone a node detached from the live DOM tree so it can safely be placed in a
  // cell even when `element` (or one of its live ancestors) would otherwise be
  // re-parented under the new block. Returns null for missing/empty nodes.
  const clone = (n) => (n ? n.cloneNode(true) : null);

  // A node is "meaningful" if it has visible text or contains media/links.
  const hasContent = (n) => {
    if (!n) return false;
    if (n.querySelector && n.querySelector('img, iframe, a, ul, ol')) return true;
    return (n.textContent || '').trim().length > 0;
  };

  // Collect descriptive content nodes (headings, paragraphs, lists) + CTA links into ONE
  // body cell. Each card row has at most two cells: optional image, then this body cell.
  // Empty nodes (e.g. placeholder <p class="card-text"></p>) are dropped.
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

  // Wrap the collected body nodes as a single cell so they render stacked in one column
  // (matching the library example), instead of one column per node.
  const bodyCell = (body, fallback) => (body.length ? [body] : [[clone(fallback)]]);

  // Make a URL absolute against the page origin. Banner Health frequently emits
  // root-relative image URLs (e.g. "/healthcareblog/-/media/...") which must be
  // absolute for the import to fetch them.
  const absolutize = (u) => {
    if (!u) return u;
    try {
      return new URL(u, (document.location && document.location.href) || 'https://www.bannerhealth.com/').href;
    } catch (e) {
      return u;
    }
  };

  // Pull the first usable url(...) out of a CSS background-image declaration.
  const bgUrl = (node) => {
    if (!node) return '';
    const style = node.getAttribute && node.getAttribute('style');
    if (!style) return '';
    const m = style.match(/url\((['"]?)(.*?)\1\)/i);
    return m ? m[2] : '';
  };

  // Resolve a real image URL from a node that is either an <img> (possibly lazy-loaded
  // via data-src/data-original/data-srcset) OR a container carrying a background-image
  // style. Prefers a non-placeholder URL and resolves it to an absolute URL. Returns a
  // fresh detached <img> (never the live node), so it is safe to place in a block cell.
  // `bgFallback` is an optional extra element to check for a background-image when the
  // primary node yields nothing (e.g. the card container itself).
  const resolveImage = (node, bgFallback) => {
    const isReal = (u) => u && !/^data:|placeholder|blank\.gif|1x1|spacer/i.test(u);
    let src = '';
    if (node && node.tagName === 'IMG') {
      const candidates = [
        node.getAttribute('data-src'),
        node.getAttribute('data-original'),
        node.getAttribute('data-lazy'),
        node.getAttribute('data-srcset'),
        node.getAttribute('src'),
      ];
      for (const c of candidates) {
        if (!c) continue;
        const first = c.trim().split(/[\s,]+/)[0]; // data-srcset: "url 1x, url2 2x"
        if (isReal(first)) { src = first; break; }
      }
    }
    // background-image on the node itself, then on the provided fallback container.
    if (!src) {
      const b1 = bgUrl(node);
      if (isReal(b1)) src = b1;
    }
    if (!src && bgFallback) {
      const b2 = bgUrl(bgFallback);
      if (isReal(b2)) src = b2;
    }
    if (!src) return null;
    const out = document.createElement('img');
    out.setAttribute('src', absolutize(src));
    const alt = node && node.getAttribute && node.getAttribute('alt');
    if (alt) out.setAttribute('alt', alt);
    return out;
  };

  // Build one article-card body cell from a card root that uses Banner Health's blog
  // article markup (eyebrow / title-link / date). All nodes are freshly created and
  // detached so the block never references the live `element` or a live descendant
  // (these containers are nested into one another by the malformed source markup).
  // - eyebrowSel: optional category eyebrow (text or a link)
  // - titleSel: the title link (becomes a linked <h3> heading)
  // - dateSel: optional published date (rendered as a paragraph)
  const articleBody = (root, { eyebrowSel, titleSel, dateSel }) => {
    const body = [];
    if (eyebrowSel) {
      const eyebrow = root.querySelector(eyebrowSel);
      const text = eyebrow && (eyebrow.textContent || '').trim();
      if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        body.push(p);
      }
    }
    if (titleSel) {
      const titleLink = root.querySelector(titleSel);
      if (titleLink) {
        const text = (titleLink.textContent || '').trim();
        const href = titleLink.getAttribute('href');
        const h = document.createElement('h3');
        if (href) {
          const a = document.createElement('a');
          a.setAttribute('href', href);
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
      const text = date && (date.textContent || '').trim();
      if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        body.push(p);
      }
    }
    return body;
  };

  // .list-card: a card-grid container with a header (heading + sub-heading) and a grid
  // of stat .card-item cards (circle icon + h3 [+ description text]). Emit ONE cards-feature
  // block: a header row (heading + sub-heading) followed by one row per stat card
  // (icon image + h3 heading + any non-empty description text).
  // NOTE: on this template .list-card frequently NESTS other separately-matched containers
  // (.basic-list-card, .text-card-full-width-image, .list-card-icon, .text-card-circle-icon,
  // .text-card, .list-text-card-link) because of malformed/unclosed source markup. We must
  // NOT re-wrap those here, and we must NOT put any live ancestor of `element` into a cell.
  // So: scope to the header and to the stat cards under THIS list-card's first
  // .content-container, and place only detached clones into the cells.
  // .text-card-feature-articles: a featured-articles grid (1 medium + N small
  // div.text-card-feature-article cards). Each article card = image + category eyebrow
  // + title link. Emit ONE cards-feature block, one row per article card
  // (image cell + body cell). The source markup is malformed (cards nest inside each
  // other via unclosed <div>/<img>), so we query ALL .text-card-feature-article cards
  // and rebuild each from detached clones/new nodes — the live element is never reused.
  if (element.matches('.text-card-feature-articles')) {
    const articles = Array.from(element.querySelectorAll('.text-card-feature-article'));
    articles.forEach((card) => {
      // Scope image/eyebrow/title to THIS card's own .text-card-feature-article-info and
      // direct <img>, not to a nested child card (which has its own row).
      const info = card.querySelector(':scope > .text-card-feature-article-info, .text-card-feature-article-info');
      // Image is either a child <img> (snapshot markup) or a background-image on the
      // card container itself (live markup, root-relative URL).
      const img = resolveImage(card.querySelector(':scope > img, img'), card);
      const body = articleBody(info || card, {
        eyebrowSel: '.text-card-feature-article-eyebrow',
        titleSel: '.text-card-feature-article-title a, a.text-card-feature-article-button',
        dateSel: '.text-card-feature-article-date',
      });
      if (img) cells.push([img]);
      if (body.length) cells.push([body]);
    });
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .video-card-list: "Nuestros últimos videos" video gallery. A sidebar heading
  // (.video-card-list-heading) + a grid of .video-card-list-card items (each: optional
  // eyebrow, a title, and a play thumbnail image). Emit ONE cards-feature block: a
  // header row with the heading, then one row per video card (thumbnail image cell +
  // body cell with the video title). All nodes are freshly created/cloned detached.
  if (element.matches('.video-card-list')) {
    const heading = element.querySelector('.video-card-list-heading, h2');
    if (heading && hasContent(heading)) {
      const h = document.createElement('h2');
      h.textContent = (heading.textContent || '').trim();
      cells.push([[h]]);
    }
    const videos = Array.from(element.querySelectorAll('.video-card-list-card'));
    videos.forEach((card) => {
      // The card's only <img> is an inline SVG play-button data-URI (not a real thumbnail).
      // Each card instead exposes the video via data attributes: a YouTube id (data-yt),
      // the article link (data-article-link), and placeholder alt text. Build a real
      // thumbnail from the YouTube id when available.
      const ytId = card.getAttribute('data-yt');
      const articleLink = card.getAttribute('data-article-link');
      const placeholderAlt = card.getAttribute('data-placeholder-image') || '';
      let img = null;
      if (ytId) {
        img = document.createElement('img');
        img.setAttribute('src', `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
        if (placeholderAlt) img.setAttribute('alt', placeholderAlt);
      }
      const body = [];
      const eyebrow = card.querySelector('.video-card-list-card-eyebrow');
      const eyebrowText = eyebrow && (eyebrow.textContent || '').trim();
      if (eyebrowText) {
        const p = document.createElement('p');
        p.textContent = eyebrowText;
        body.push(p);
      }
      const title = card.querySelector('.video-card-list-card-title');
      const titleText = title && (title.textContent || '').trim();
      if (titleText) {
        const h = document.createElement('h3');
        if (articleLink) {
          const a = document.createElement('a');
          a.setAttribute('href', absolutize(articleLink));
          a.textContent = titleText;
          h.appendChild(a);
        } else {
          h.textContent = titleText;
        }
        body.push(h);
      }
      if (img) cells.push([img]);
      if (body.length) cells.push([body]);
    });
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .text-card-article-list-xs: a grid of small .text-card-article-card.x-small-card
  // articles (image + title link; no per-card date, list-level eyebrow only). Emit ONE
  // cards-feature block: optional header row from the list eyebrow, then one row per
  // article (image cell + body cell with the title as a linked heading). All detached.
  if (element.matches('.text-card-article-list-xs')) {
    const listEyebrow = element.querySelector('.text-card-article-list-xs-eyebrow');
    const eyebrowText = listEyebrow && (listEyebrow.textContent || '').trim();
    if (eyebrowText) {
      const p = document.createElement('p');
      p.textContent = eyebrowText;
      cells.push([[p]]);
    }
    const cards = Array.from(element.querySelectorAll('.text-card-article-card'));
    cards.forEach((card) => {
      // Image: child <img> (snapshot) or background-image on .text-card-article-card-image
      // (live markup, root-relative URL).
      const imageWrap = card.querySelector('.text-card-article-card-image');
      const img = resolveImage(card.querySelector('.text-card-article-card-image img, img'), imageWrap);
      const body = articleBody(card, {
        eyebrowSel: '.text-card-article-card-eyebrow a, .text-card-article-card-eyebrow',
        titleSel: '.text-card-article-card-title a, .text-card-article-card-title-link',
        dateSel: '.text-card-article-card-date',
      });
      if (img) cells.push([img]);
      if (body.length) cells.push([body]);
    });
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .icon-shell-card: a newsletter signup card (sibling/variant of .shell-card). It has a
  // heading (.icon-shell-card-title) + supporting text (.text-header span) + an email
  // signup form. This is a "da" content import without a real form block, so the form is
  // represented as a simple placeholder text cell. The source markup is malformed and the
  // page <footer> ends up NESTED inside this card, so we scope extraction strictly to the
  // card's own .text-header and .input-wrapper and rebuild from detached clones/new nodes —
  // we never reference the live element (whose live descendants include the footer).
  if (element.matches('.icon-shell-card')) {
    const body = [];
    const textHeader = element.querySelector('.text-header');
    const title = (textHeader || element).querySelector('.icon-shell-card-title, h2, h3, h4');
    const titleText = title && (title.textContent || '').trim();
    if (titleText) {
      const h = document.createElement('h3');
      h.textContent = titleText;
      body.push(h);
    }
    // Supporting text: the span (or paragraph) directly inside the card's text header.
    const support = textHeader
      ? textHeader.querySelector('span, p')
      : element.querySelector(':scope span, :scope p');
    const supportText = support && (support.textContent || '').trim();
    if (supportText) {
      const p = document.createElement('p');
      p.textContent = supportText;
      body.push(p);
    }
    // Email form placeholder (no real form block in this "da" import). Use the form's
    // button label if available, scoped to the card's own .input-wrapper.
    const wrapper = element.querySelector('.input-wrapper');
    const btn = wrapper && wrapper.querySelector('button, .btn');
    const btnLabel = (btn && (btn.textContent || '').trim()) || 'Sign up';
    const placeholder = document.createElement('p');
    placeholder.textContent = `Email signup: enter your email address and select “${btnLabel}”.`;
    body.push(placeholder);
    cells.push(body.length ? [body] : [['']]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  if (element.matches('.list-card')) {
    const header = element.querySelector('.list-card-header');
    if (header && hasContent(header)) cells.push([[clone(header)]]);

    // Stat cards live directly in this list-card's primary content grid. Restrict to
    // .card-item that are NOT inside a nested matched container (those have their own branch).
    const grid = element.querySelector(':scope > .container > .content-container, :scope .content-container');
    const items = grid
      ? Array.from(grid.querySelectorAll('.card-item')).filter((item) => {
          const owner = item.closest(
            '.basic-list-card, .text-card-full-width-image, .list-card-icon, .text-card-circle-icon, .text-card, .list-text-card-link',
          );
          // Keep only stat cards owned by this list-card grid (not by a nested container).
          return !owner || !element.contains(owner) || owner === element;
        })
      : [];
    items.forEach((item) => {
      const icon = item.querySelector('.icon-circle img, .icon img, img');
      const body = [];
      const heading = item.querySelector('.card-body h3, h3, [class*="heading"]');
      if (heading && hasContent(heading)) body.push(clone(heading));
      item.querySelectorAll('.card-body > p, .card-text').forEach((p) => {
        if (hasContent(p)) body.push(clone(p));
      });
      if (icon) cells.push([clone(icon)]);
      cells.push(body.length ? [body] : [['']]);
    });

    // If no header and no stat cards were found, fall back to a single detached clone.
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .list-text-card-link: a "Learn more" link-card grid. Header (heading) + a grid of
  // <a class="text-card-link"> link cards, each with .text-card-link-title and
  // .text-card-link-content. Emit ONE cards-feature block: optional header row, then one
  // row per link card. Each link-card body = title (as heading) + content text + a CTA
  // link whose href is the card's <a href>. All content is cloned/created detached so the
  // block never references the live element (which may be a nested descendant elsewhere).
  if (element.matches('.list-text-card-link')) {
    const header = element.querySelector('.list-card-header');
    if (header && hasContent(header)) cells.push([[clone(header)]]);

    const links = Array.from(element.querySelectorAll('a.text-card-link, .text-card-link'));
    links.forEach((link) => {
      const body = [];
      const title = link.querySelector('.text-card-link-title');
      const content = link.querySelector('.text-card-link-content');
      if (title && hasContent(title)) {
        // Promote the title to a heading for the card body.
        const h = document.createElement('h3');
        h.textContent = (title.textContent || '').trim();
        body.push(h);
      }
      if (content && hasContent(content)) body.push(clone(content));
      // Rebuild the CTA as a fresh detached anchor pointing at the link's href.
      const href = link.getAttribute('href');
      if (href) {
        const cta = document.createElement('a');
        cta.setAttribute('href', href);
        const label = (title && (title.textContent || '').trim()) || link.textContent.trim() || 'Learn more';
        cta.textContent = label;
        body.push(cta);
      }
      if (body.length) cells.push([body]);
    });

    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .text-card-full-width-image: a full-width promo band. On this template it carries
  // only a leading <img>; defensively also pick up an optional heading/text/CTA if present.
  // The image (and any body content) is cloned detached so replaceWith cannot create a
  // parent/child cycle when this band is nested inside a .list-card.
  if (element.matches('.text-card-full-width-image')) {
    const image = element.querySelector('img');
    if (image) cells.push([clone(image)]);
    const body = [];
    const heading = element.querySelector('h1, h2, h3, [class*="heading"], .card-title');
    if (heading && hasContent(heading)) body.push(clone(heading));
    element.querySelectorAll(':scope > p, .card-text, .sub-heading').forEach((p) => {
      if (hasContent(p)) body.push(clone(p));
    });
    element.querySelectorAll('a.btn, a[class*="button"]').forEach((a) => body.push(clone(a)));
    if (body.length) cells.push([body]);
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .text-card-circle-icon: icon image + body (h3 heading, text, link)
  if (element.matches('.text-card-circle-icon')) {
    // Malformed source markup can nest a bare .text-card-circle-icon inside another
    // matched .text-card-circle-icon card. Skip the inner phantom so we don't build a
    // block that contains its own ancestor (HierarchyRequestError on replaceWith).
    if (element.parentElement && element.parentElement.closest('.text-card-circle-icon')) {
      return;
    }
    const icon = element.querySelector('.icon img, img');
    const body = collectBody(
      element,
      'h3, .card-body h3, [class*="heading"]',
      '.card-body > p, .card-text',
      '.card-body a',
    );
    if (icon) cells.push([icon.cloneNode(true)]);
    cells.push(bodyCell(body, element));
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .video-card-v2: heading + CTA button, optional image
  if (element.matches('.video-card-v2')) {
    const image = element.querySelector('.background-image-without-text img, img');
    const body = collectBody(
      element,
      '.video-title, h1, h2',
      null,
      '.bh-side-by-side-buttons a, a.btn',
    );
    if (image) cells.push([image]);
    cells.push(bodyCell(body, element));
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .image-text-card-body: title + text + CTA (no image of its own here)
  if (element.matches('.image-text-card-body')) {
    const body = collectBody(
      element,
      '.card-title',
      '.card-text',
      '.text-card-left-button a, a.btn',
    );
    cells.push(bodyCell(body, element));
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .basic-list-card: card-title + text block + CTA button (no image)
  if (element.matches('.basic-list-card')) {
    const body = [];
    const heading = element.querySelector('.card-title, h2, h3');
    if (heading) body.push(heading);
    // Text lives in .content-container > div blocks that are not the heading wrapper or the CTA.
    element.querySelectorAll('.content-container > div').forEach((div) => {
      if (div.querySelector('.card-title, h2, h3')) return;
      if (div.querySelector('a.btn')) return;
      body.push(div);
    });
    element.querySelectorAll('a.btn').forEach((a) => body.push(a));
    cells.push(bodyCell(body, element));
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .shell-card: title + text + image (or kyruus search title-only variant)
  if (element.matches('.shell-card')) {
    const image = element.querySelector('.shell-card-image img, .icon-svg img, img');
    const body = collectBody(
      element,
      '.shell-card-title',
      '.shell-card-text',
      'a.btn',
    );
    if (image) cells.push([image]);
    cells.push(bodyCell(body, element));
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .text-card (default) — two sub-forms:
  //   1) row form: .text-card-image img + nested .image-text-card-body body
  //   2) simple form: .card-body with optional heading, .card-text (may contain iframe)
  if (element.matches('.text-card')) {
    const image = element.querySelector('.text-card-image img');
    const nestedBody = element.querySelector('.image-text-card-body');
    if (image && nestedBody) {
      const body = collectBody(
        nestedBody,
        '.card-title',
        '.card-text',
        '.text-card-left-button a, a.btn',
      );
      cells.push([image]);
      cells.push(bodyCell(body, nestedBody));
    } else {
      const body = collectBody(
        element,
        '.card-body > h1, .card-body > h2, .card-body > h3, h3',
        '.card-text, .card-body > p',
        '.card-body a.btn',
      );
      cells.push(bodyCell(body, element));
    }
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // Fallback: emit whatever the element contains as a single body cell.
  cells.push([element]);
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
  element.replaceWith(block);
}
