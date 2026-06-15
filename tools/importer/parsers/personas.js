/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the Banner Health persona/testimonial cards (careers page).
 * Source: a carousel (.owl-carousel) of div.persona-card, each with:
 *   img.persona-card-image (circular), h3.persona-card-title (name),
 *   .persona-card-info (Job Title / Location pairs), .persona-card-text (quote).
 *
 * The carousel clones items for looping; de-duplicate by name. Emits one block
 * row per unique persona: [imageCell, bodyCell(name + info pairs + quote)].
 */
export default function parse(element, { document }) {
  const cells = [];
  const seen = new Set();
  const cards = element.querySelectorAll('.persona-card');

  cards.forEach((card) => {
    const nameEl = card.querySelector('.persona-card-title');
    const name = nameEl ? nameEl.textContent.trim() : '';
    if (!name || seen.has(name)) return;
    seen.add(name);

    const img = card.querySelector('.persona-card-image, img');
    const imageCell = img ? img.cloneNode(true) : '';

    const body = [];
    if (name) {
      const h = document.createElement('h3');
      h.textContent = name;
      body.push(h);
    }
    // info pairs (Job Title / Location)
    card.querySelectorAll('.persona-card-info > div').forEach((pair) => {
      const label = pair.querySelector('.info-title');
      const value = pair.querySelector('.info-desc');
      if (value && value.textContent.trim()) {
        const p = document.createElement('p');
        if (label && label.textContent.trim()) {
          const strong = document.createElement('strong');
          strong.textContent = `${label.textContent.trim()}: `;
          p.append(strong);
        }
        p.append(document.createTextNode(value.textContent.trim()));
        body.push(p);
      }
    });
    // quote
    const quote = card.querySelector('.persona-card-text');
    if (quote && quote.textContent.trim()) {
      const q = document.createElement('p');
      const em = document.createElement('em');
      em.textContent = quote.textContent.trim();
      q.append(em);
      body.push(q);
    }

    cells.push([imageCell, body]);
  });

  if (!cells.length) return;

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'personas',
    cells,
  });
  element.replaceWith(block);
}
