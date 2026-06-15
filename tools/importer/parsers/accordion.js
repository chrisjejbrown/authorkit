/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the Banner Health accordion (e.g. careers "Opportunities").
 * Source: div.accordion > div.card
 *   > .card-header > a.component-accordion-trigger > span.accordion-text (title)
 *   > .collapse > .card-body (content: text, lists, links)
 *
 * Emits one block row per accordion item: [titleCell, contentCell].
 */
export default function parse(element, { document }) {
  const cells = [];
  const items = element.querySelectorAll(':scope > .card, .card');

  items.forEach((card) => {
    const trigger = card.querySelector('.component-accordion-trigger, .accordion-header');
    const titleText = card.querySelector('.accordion-text')
      || (trigger ? trigger : null);
    const bodyEl = card.querySelector('.collapse .card-body, .card-body');
    if (!titleText && !bodyEl) return;

    const title = document.createElement('p');
    title.textContent = (titleText ? titleText.textContent : '').trim();

    const content = [];
    if (bodyEl) {
      [...bodyEl.children].forEach((n) => {
        // skip empty nodes
        if ((n.textContent || '').trim() || n.querySelector('a, img')) {
          content.push(n.cloneNode(true));
        }
      });
    }

    cells.push([[title], content.length ? content : ['']]);
  });

  if (!cells.length) return;

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'accordion',
    cells,
  });
  element.replaceWith(block);
}
