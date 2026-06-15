/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the Banner Health blog "feature articles" mosaic.
 * Source container: div.text-card-feature-articles
 *   > div.text-card-feature-article(.medium-card | .small-card)
 *       > img
 *       > div.text-card-feature-article-info
 *           > div.text-card-feature-article-eyebrow  (category)
 *           > div.text-card-feature-article-title > a (article link)
 *
 * Emits one block row per article card: [imageCell, bodyCell]. The body cell
 * holds the eyebrow (as a <p>), the title as a linked <h3>, and a leading "+"
 * marker on the first (medium) card so the block JS can give it the large
 * 2-row span. Text overlays the image at render time via CSS.
 */
export default function parse(element, { document }) {
  const cells = [];
  const cards = element.querySelectorAll('.text-card-feature-article');

  // Resolve a real image URL: lazy-loaded imgs keep the real URL in a data
  // attribute (data-src/data-original/...) or a CSS background-image, while the
  // live <img src> can be an empty/placeholder until scrolled into view.
  const DATA_ATTRS = ['data-src', 'data-original', 'data-lazy', 'data-lazy-src', 'data-original-src', 'data-url', 'data-image'];
  const isReal = (u) => u && !u.startsWith('data:') && u !== 'about:blank';
  const bgUrl = (node) => {
    const style = node && node.getAttribute && node.getAttribute('style');
    if (!style) return '';
    const m = style.match(/url\((['"]?)(.*?)\1\)/i);
    return m ? m[2] : '';
  };
  const resolveSrc = (card) => {
    const img = card.querySelector('img');
    if (img) {
      for (const a of DATA_ATTRS) {
        const v = img.getAttribute(a);
        if (isReal(v)) return v;
      }
      if (isReal(img.getAttribute('src'))) return img.getAttribute('src');
    }
    // background-image on the card or its image wrapper
    const bgNode = card.querySelector('[style*="background-image"]') || card;
    const bg = bgUrl(bgNode);
    if (isReal(bg)) return bg;
    return '';
  };

  cards.forEach((card) => {
    const eyebrow = card.querySelector('.text-card-feature-article-eyebrow');
    const titleLink = card.querySelector('.text-card-feature-article-title a');
    const isMedium = card.classList.contains('medium-card');

    const src = resolveSrc(card);
    let imageCell = '';
    if (src) {
      const newImg = document.createElement('img');
      newImg.setAttribute('src', src);
      newImg.setAttribute('alt', titleLink ? titleLink.textContent.trim() : '');
      imageCell = newImg;
    }

    const body = [];
    // size marker (first cell text) lets the block JS flag the large card
    const size = document.createElement('p');
    size.textContent = isMedium ? 'large' : 'small';
    body.push(size);
    if (eyebrow && eyebrow.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = eyebrow.textContent.trim();
      body.push(p);
    }
    if (titleLink) {
      const h = document.createElement('h3');
      const a = document.createElement('a');
      a.setAttribute('href', titleLink.getAttribute('href') || '#');
      a.textContent = titleLink.textContent.trim();
      h.append(a);
      body.push(h);
    }

    cells.push([imageCell, body]);
  });

  if (!cells.length) return;

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'feature-articles',
    cells,
  });
  element.replaceWith(block);
}
