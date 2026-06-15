/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-feature. Base block: cards.
 * Source: https://www.bannerhealth.com/ (homepage template)
 * Generated: 2026-06-12
 * Re-architected: 2026-06-13
 *
 * This variant covers several distinct source card/promo containers that all
 * render as a single cards (feature) block.
 *
 * 🔵 OUTPUT SHAPE (one row per card, two cells per card):
 *   The block JS (blocks/cards-feature/cards-feature.js) turns EACH block ROW into
 *   one <li> (one grid cell), and inside that <li> classes a single-<picture> child
 *   div as `.cards-feature-card-image` and any other child div as
 *   `.cards-feature-card-body`. Therefore every card MUST be ONE row containing TWO
 *   cells: [ imageNode, bodyNodes ] — image first, body second — so the image stacks
 *   above the body within ONE grid cell. When a card has no image, push a single-cell
 *   row [ bodyNodes ]. (Previously the parser pushed image and body as TWO separate
 *   rows, which produced two side-by-side grid cells per card — fixed here.)
 *
 * 🔵 GRID GROUPING (one block per grid, one row per card):
 *   The import script invokes parse() once per matched card element. A responsive grid
 *   of N same-type cards must become ONE cards-feature block with N rows (not N blocks).
 *   Banner Health builds grids with the Bootstrap pattern:
 *       div.row > [class*="col-"] (column wrapper) > div.card.<card-type>
 *   so a "grid" is detected as: the card sits inside a column wrapper ([class*="col-"])
 *   whose parent is a .row, and that .row contains 2+ cards matching the SAME selector
 *   the matched element matches. (Verified on the live homepage: the 8 service cards are
 *   8 .text-card-circle-icon inside 8 col-lg-3 wrappers under one div.row inside
 *   div.list-card-icon. Standalone promos — video-card-v2, the WebMD/symptom basic-list
 *   cards, the shell cards — are NOT inside a col-* / .row grid, so they stay one-row
 *   blocks even though several share a distant page-stack ancestor.)
 *
 *   When parse() runs on a card that IS part of such a grid:
 *     - if it is NOT the first same-type card in that .row, return early (the first
 *       sibling absorbs the whole grid);
 *     - if it IS the first, collect ALL same-type cards in the .row, emit ONE block
 *       with one row per card, and replaceWith() on the .row container so the other
 *       siblings are detached. The import script will still call parse() on those
 *       detached siblings later — the `element.isConnected === false` guard at the top
 *       skips them safely.
 *
 * 🔴 HierarchyRequestError avoidance: on this template the source HTML is malformed
 * (many unclosed <div>/<img> tags), so the browser nests several separately-matched
 * containers (.basic-list-card, .text-card-full-width-image, .list-card-icon,
 * .text-card-circle-icon, .text-card, .list-text-card-link) INSIDE a .list-card.
 * If a branch put the live `element` (or a live ancestor) into a cell and then called
 * element.replaceWith(block), the new block would contain its own parent -> the DOM
 * throws "HierarchyRequestError: ... child contains the parent". Branches that own
 * nested matched containers (.list-card, .list-text-card-link, .text-card-full-width-image,
 * .text-card-feature-articles, .video-card-list, .text-card-article-list-xs) therefore
 * extract ONLY detached clones (cloneNode) of the specific sub-content they own; they
 * never reference the live element or its live descendants.
 */
export default function parse(element, { document }) {
  // A previously-processed outer card may have been replaced, detaching this element
  // from the live tree. replaceWith() on a detached node (or one whose parent now lives
  // inside a freshly built block) throws HierarchyRequestError. Skip it — its content
  // was already captured by the ancestor card (or grid) that carried it.
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
  // body array. Each card row is [optionalImageCell, bodyCell]; the body cell stacks all
  // these nodes in one column. Empty nodes (e.g. placeholder <p class="card-text"></p>)
  // are dropped.
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

  // Build ONE card row from an (optional) image node and a body-nodes array.
  // - With an image: a single row of TWO cells [imageNode, bodyNodes] so the JS classes
  //   the image div as .cards-feature-card-image and the body div as
  //   .cards-feature-card-body, stacked within one <li>/grid cell.
  // - Without an image: a single one-cell row [bodyNodes].
  // `fallback` is cloned into the body cell when the body is empty so a card never
  // produces an empty cell.
  const pushCardRow = (image, body, fallback) => {
    const bodyNodes = body && body.length ? body : [clone(fallback)];
    if (image) {
      cells.push([image, bodyNodes]);
    } else {
      cells.push([bodyNodes]);
    }
  };

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

  // ──────────────────────────────────────────────────────────────────────────────
  // GRID GROUPING for the leaf "single card" branches
  // (.text-card-circle-icon, .text-card, .basic-list-card, .video-card-v2,
  //  .shell-card, .icon-shell-card).
  //
  // Banner Health lays out card grids as: div.row > [class*="col-"] > div.card.<type>.
  // gridSiblings(element, sameSel) returns the ordered list of same-type cards in the
  // matched card's grid .row, or null when the card is NOT part of such a grid (a
  // standalone promo). A grid requires:
  //   1. the card sits inside a column wrapper ([class*="col-"]),
  //   2. whose parent is a .row,
  //   3. and that .row contains 2+ cards matching `sameSel`.
  // This deliberately does NOT group standalone promos that merely share a distant
  // page-stack ancestor (they have no col-*/.row wrapper), so each stays a one-row block.
  const gridSiblings = (el, sameSel) => {
    const colWrap = el.closest('[class*="col-"]');
    if (!colWrap) return null;
    const row = colWrap.parentElement;
    if (!row || !row.matches || !row.matches('.row')) return null;
    const siblings = Array.from(row.querySelectorAll(sameSel)).filter((c) => {
      // Only same-type cards that live in a direct column child of THIS row (avoid
      // accidentally pulling in a nested card from a deeper structure).
      const w = c.closest('[class*="col-"]');
      return w && w.parentElement === row;
    });
    return siblings.length >= 2 ? siblings : null;
  };

  // Emit ONE cards-feature block for a grid of same-type cards. Only the FIRST card calls
  // this. `buildCard(card)` returns { image, body } for one card; each sibling becomes one
  // row [image, body] (or [body]), all from detached clones.
  //
  // The import harness collects every matched card up front, then calls parse() on each in
  // turn against ONE shared live DOM. So the FIRST card must consume the WHOLE grid in one
  // pass and DETACH the other sibling cards, otherwise each later sibling would re-run
  // gridSiblings (now believing it is the first remaining card) and re-emit the grid.
  // We therefore:
  //   - build ONE block (one row per card) and replace the first card (`element`) with it;
  //   - replace EACH other sibling card with an empty <div>, fully detaching the original
  //     sibling node. When the harness later parses those detached originals, the
  //     `element.isConnected === false` guard at the top of parse() skips them and the
  //     harness (which reads each element's parent/nextSibling at parse time, both null for
  //     a detached node) produces no output for them.
  // Detaching the original sibling node (not just an ancestor wrapper) is important: a
  // half-detached node with a live parent made the harness fall back to rendering raw card
  // content in an earlier iteration.
  const emitGrid = (siblings, buildCard) => {
    siblings.forEach((card) => {
      const { image, body, fallback } = buildCard(card);
      pushCardRow(image, body, fallback || card);
    });
    if (!cells.length) cells.push([[clone(siblings[0])]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    // Detach the other siblings first (replace each with an empty placeholder), then
    // replace the first card with the single grid block.
    siblings.forEach((card) => {
      if (card === element) return;
      if (card.isConnected) card.replaceWith(document.createElement('div'));
    });
    element.replaceWith(block);
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // CONTAINER branches (each owns an internal grid of sub-cards and emits ONE block).
  // These are not themselves repeated as same-type cards in a .row, so they are handled
  // directly (no gridSiblings grouping). Each sub-card is one row [image, body].

  // NOTE: .text-card-feature-articles is handled by the dedicated
  // feature-articles parser/block (overlay-text mosaic), not here.

  // .video-card-list: video gallery. Sidebar heading + grid of .video-card-list-card
  // items (thumbnail + title). Header row, then one row per video card (image + body).
  if (element.matches('.video-card-list')) {
    const heading = element.querySelector('.video-card-list-heading, h2');
    if (heading && hasContent(heading)) {
      const h = document.createElement('h2');
      h.textContent = (heading.textContent || '').trim();
      cells.push([[h]]);
    }
    const videos = Array.from(element.querySelectorAll('.video-card-list-card'));
    videos.forEach((card) => {
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
      if (img || body.length) pushCardRow(img, body, card);
    });
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .text-card-article-list-xs: grid of small article cards (image + title link).
  // Optional list-eyebrow header row, then one row per article (image + body).
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
      const imageWrap = card.querySelector('.text-card-article-card-image');
      const img = resolveImage(card.querySelector('.text-card-article-card-image img, img'), imageWrap);
      const body = articleBody(card, {
        eyebrowSel: '.text-card-article-card-eyebrow a, .text-card-article-card-eyebrow',
        titleSel: '.text-card-article-card-title a, .text-card-article-card-title-link',
        dateSel: '.text-card-article-card-date',
      });
      if (img || body.length) pushCardRow(img, body, card);
    });
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .icon-shell-card: a newsletter signup card. Single body cell (no image). Scope
  // extraction strictly to the card's own .text-header / .input-wrapper (the page
  // <footer> can be nested inside this card via malformed markup).
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
    const support = textHeader
      ? textHeader.querySelector('span, p')
      : element.querySelector(':scope span, :scope p');
    const supportText = support && (support.textContent || '').trim();
    if (supportText) {
      const p = document.createElement('p');
      p.textContent = supportText;
      body.push(p);
    }
    const wrapper = element.querySelector('.input-wrapper');
    const btn = wrapper && wrapper.querySelector('button, .btn');
    const btnLabel = (btn && (btn.textContent || '').trim()) || 'Sign up';
    const placeholder = document.createElement('p');
    placeholder.textContent = `Email signup: enter your email address and select “${btnLabel}”.`;
    body.push(placeholder);
    // No image: single one-cell row.
    pushCardRow(null, body, element);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .list-card: a card-grid container with a header + a grid of stat .card-item cards.
  // Header row, then one row per stat card (icon image + body). Scope strictly to this
  // list-card's own header and stat cards; place only detached clones into cells so
  // replaceWith never creates a parent/child cycle (nested matched containers exist).
  if (element.matches('.list-card')) {
    const header = element.querySelector('.list-card-header');
    if (header && hasContent(header)) cells.push([[clone(header)]]);

    const grid = element.querySelector(':scope > .container > .content-container, :scope .content-container');
    const items = grid
      ? Array.from(grid.querySelectorAll('.card-item')).filter((item) => {
          const owner = item.closest(
            '.basic-list-card, .text-card-full-width-image, .list-card-icon, .text-card-circle-icon, .text-card, .list-text-card-link',
          );
          return !owner || !element.contains(owner) || owner === element;
        })
      : [];
    items.forEach((item) => {
      const icon = resolveImage(item.querySelector('.icon-circle img, .icon img, img'), item)
        || (item.querySelector('.icon-circle img, .icon img, img') ? clone(item.querySelector('.icon-circle img, .icon img, img')) : null);
      const body = [];
      const heading = item.querySelector('.card-body h3, h3, [class*="heading"]');
      if (heading && hasContent(heading)) body.push(clone(heading));
      item.querySelectorAll('.card-body > p, .card-text').forEach((p) => {
        if (hasContent(p)) body.push(clone(p));
      });
      pushCardRow(icon, body, item);
    });

    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .list-text-card-link: a "Learn more" link-card grid. Optional header row, then one
  // row per link card (no image): title heading + content text + a CTA pointing at the
  // card's href. All content cloned/created detached.
  if (element.matches('.list-text-card-link')) {
    const header = element.querySelector('.list-card-header');
    if (header && hasContent(header)) cells.push([[clone(header)]]);

    const links = Array.from(element.querySelectorAll('a.text-card-link, .text-card-link'));
    links.forEach((link) => {
      const body = [];
      const title = link.querySelector('.text-card-link-title');
      const content = link.querySelector('.text-card-link-content');
      if (title && hasContent(title)) {
        const h = document.createElement('h3');
        h.textContent = (title.textContent || '').trim();
        body.push(h);
      }
      if (content && hasContent(content)) body.push(clone(content));
      const href = link.getAttribute('href');
      if (href) {
        const cta = document.createElement('a');
        cta.setAttribute('href', href);
        const label = (title && (title.textContent || '').trim()) || link.textContent.trim() || 'Learn more';
        cta.textContent = label;
        body.push(cta);
      }
      if (body.length) pushCardRow(null, body, link);
    });

    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .text-card-full-width-image: a full-width promo band (leading <img> + optional
  // heading/text/CTA). One row [image, body] (or [body]). Cloned detached.
  if (element.matches('.text-card-full-width-image')) {
    const image = element.querySelector('img');
    const imgClone = image ? clone(image) : null;
    const body = [];
    const heading = element.querySelector('h1, h2, h3, [class*="heading"], .card-title');
    if (heading && hasContent(heading)) body.push(clone(heading));
    element.querySelectorAll(':scope > p, .card-text, .sub-heading').forEach((p) => {
      if (hasContent(p)) body.push(clone(p));
    });
    element.querySelectorAll('a.btn, a[class*="button"]').forEach((a) => body.push(clone(a)));
    if (imgClone || body.length) pushCardRow(imgClone, body, element);
    if (!cells.length) cells.push([[clone(element)]]);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // LEAF "single card" branches — each card is one row [image, body] (or [body]).
  // These participate in GRID GROUPING: if the matched card is part of a Bootstrap
  // .row grid of 2+ same-type cards, the first sibling emits ONE block with one row per
  // card and replaceWith() on the .row; later siblings are skipped via isConnected.

  // .text-card-circle-icon: icon image + body (h3 heading, text, link)
  if (element.matches('.text-card-circle-icon')) {
    // Malformed source markup can nest a bare .text-card-circle-icon inside another
    // matched .text-card-circle-icon card. Skip the inner phantom.
    if (element.parentElement && element.parentElement.closest('.text-card-circle-icon')) {
      return;
    }
    const buildCard = (card) => {
      const iconNode = card.querySelector('.icon img, img');
      const image = iconNode ? clone(iconNode) : null;
      // The CTA "Learn more." link lives INSIDE the descriptive <p>, so it is captured by
      // the text selector — do NOT also collect it via a separate CTA selector (that would
      // duplicate the link in the body cell).
      const body = collectBody(
        card,
        'h3, .card-body h3, [class*="heading"]',
        '.card-body > p, .card-text',
        null,
      ).map((n) => clone(n));
      return { image, body };
    };
    const siblings = gridSiblings(element, '.text-card-circle-icon');
    if (siblings) {
      // Only the first sibling builds the whole grid (and detaches the rest). When the
      // harness later parses a now-detached sibling, the isConnected guard at top skips it.
      if (element !== siblings[0]) return;
      emitGrid(siblings, buildCard);
      return;
    }
    // Standalone circle-icon card -> one-row block.
    const { image, body } = buildCard(element);
    pushCardRow(image, body, element);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .video-card-v2: heading + CTA button, optional image
  if (element.matches('.video-card-v2')) {
    const buildCard = (card) => {
      const imgNode = card.querySelector('.background-image-without-text img, img');
      const image = imgNode ? clone(imgNode) : null;
      const body = collectBody(
        card,
        '.video-title, h1, h2',
        null,
        '.bh-side-by-side-buttons a, a.btn',
      ).map((n) => clone(n));
      return { image, body };
    };
    const siblings = gridSiblings(element, '.video-card-v2');
    if (siblings) {
      if (element !== siblings[0]) return;
      emitGrid(siblings, buildCard);
      return;
    }
    // Standalone: reference live nodes directly (no nesting concern here).
    const image = element.querySelector('.background-image-without-text img, img');
    const body = collectBody(
      element,
      '.video-title, h1, h2',
      null,
      '.bh-side-by-side-buttons a, a.btn',
    );
    pushCardRow(image, body, element);
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
    pushCardRow(null, body, element);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .basic-list-card: card-title + text block + CTA button (no image)
  if (element.matches('.basic-list-card')) {
    const buildCard = (card) => {
      const body = [];
      const heading = card.querySelector('.card-title, h2, h3');
      if (heading) body.push(clone(heading));
      card.querySelectorAll('.content-container > div').forEach((div) => {
        if (div.querySelector('.card-title, h2, h3')) return;
        if (div.querySelector('a.btn')) return;
        body.push(clone(div));
      });
      card.querySelectorAll('a.btn').forEach((a) => body.push(clone(a)));
      return { image: null, body };
    };
    const siblings = gridSiblings(element, '.basic-list-card');
    if (siblings) {
      if (element !== siblings[0]) return;
      emitGrid(siblings, buildCard);
      return;
    }
    // Standalone: build from live nodes.
    const body = [];
    const heading = element.querySelector('.card-title, h2, h3');
    if (heading) body.push(heading);
    element.querySelectorAll('.content-container > div').forEach((div) => {
      if (div.querySelector('.card-title, h2, h3')) return;
      if (div.querySelector('a.btn')) return;
      body.push(div);
    });
    element.querySelectorAll('a.btn').forEach((a) => body.push(a));
    pushCardRow(null, body, element);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .shell-card: title + text + image (or kyruus search title-only variant)
  if (element.matches('.shell-card')) {
    const buildCard = (card) => {
      const imgNode = card.querySelector('.shell-card-image img, .icon-svg img, img');
      const image = imgNode ? clone(imgNode) : null;
      const body = collectBody(
        card,
        '.shell-card-title',
        '.shell-card-text',
        'a.btn',
      ).map((n) => clone(n));
      return { image, body };
    };
    const siblings = gridSiblings(element, '.shell-card');
    if (siblings) {
      if (element !== siblings[0]) return;
      emitGrid(siblings, buildCard);
      return;
    }
    // Standalone: build from live nodes.
    const image = element.querySelector('.shell-card-image img, .icon-svg img, img');
    const body = collectBody(
      element,
      '.shell-card-title',
      '.shell-card-text',
      'a.btn',
    );
    pushCardRow(image, body, element);
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // .text-card (default) — two sub-forms:
  //   1) row form: .text-card-image img + nested .image-text-card-body body
  //   2) simple form: .card-body with optional heading, .card-text (may contain iframe)
  if (element.matches('.text-card')) {
    const buildCard = (card) => {
      const imgNode = card.querySelector('.text-card-image img');
      const nestedBody = card.querySelector('.image-text-card-body');
      if (imgNode && nestedBody) {
        const body = collectBody(
          nestedBody,
          '.card-title',
          '.card-text',
          '.text-card-left-button a, a.btn',
        ).map((n) => clone(n));
        return { image: clone(imgNode), body };
      }
      const body = collectBody(
        card,
        '.card-body > h1, .card-body > h2, .card-body > h3, h3',
        '.card-text, .card-body > p',
        '.card-body a.btn',
      ).map((n) => clone(n));
      return { image: null, body };
    };
    const siblings = gridSiblings(element, '.text-card');
    if (siblings) {
      if (element !== siblings[0]) return;
      emitGrid(siblings, buildCard);
      return;
    }
    // Standalone: build from live nodes (no nesting concern for a top-level promo).
    const image = element.querySelector('.text-card-image img');
    const nestedBody = element.querySelector('.image-text-card-body');
    if (image && nestedBody) {
      const body = collectBody(
        nestedBody,
        '.card-title',
        '.card-text',
        '.text-card-left-button a, a.btn',
      );
      pushCardRow(image, body, nestedBody);
    } else {
      const body = collectBody(
        element,
        '.card-body > h1, .card-body > h2, .card-body > h3, h3',
        '.card-text, .card-body > p',
        '.card-body a.btn',
      );
      pushCardRow(null, body, element);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
    element.replaceWith(block);
    return;
  }

  // Fallback: emit whatever the element contains as a single body cell.
  pushCardRow(null, [element], element);
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
  element.replaceWith(block);
}
