import { createPicture } from '../../scripts/utils/picture.js';

// Feature-articles mosaic: 1 large card + stacked small cards, each with the
// category eyebrow and title overlaid on the article image.
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const cells = [...row.children];
    const imageCell = cells.find((c) => c.querySelector('picture, img'));
    const bodyCell = cells.find((c) => c !== imageCell) || cells[cells.length - 1];

    // First body paragraph is the size marker ('large' | 'small').
    let size = 'small';
    if (bodyCell) {
      const firstP = bodyCell.querySelector(':scope > p');
      if (firstP && /^(large|small)$/i.test(firstP.textContent.trim())) {
        size = firstP.textContent.trim().toLowerCase();
        firstP.remove();
      }
    }
    li.classList.add(`feature-article-${size}`);

    if (imageCell) {
      const img = imageCell.querySelector('img');
      if (img) {
        const pic = createPicture({ src: img.src, alt: img.alt || '', breakpoints: [{ width: '1200' }] });
        const imgWrap = document.createElement('div');
        imgWrap.className = 'feature-article-image';
        imgWrap.append(pic);
        li.append(imgWrap);
      }
    }

    const info = document.createElement('div');
    info.className = 'feature-article-info';
    if (bodyCell) {
      // remaining body nodes: eyebrow <p> then title <h3><a>
      [...bodyCell.children].forEach((n) => {
        if (n.tagName === 'P') n.classList.add('feature-article-eyebrow');
        if (n.tagName === 'H3') n.classList.add('feature-article-title');
        info.append(n);
      });
    }
    li.append(info);

    // Make the whole card clickable via the title link.
    const link = li.querySelector('.feature-article-title a');
    if (link) li.dataset.href = link.getAttribute('href');

    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);

  // Card-level click delegates to the title link.
  block.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const card = e.target.closest('li[data-href]');
    if (card) window.location.assign(card.dataset.href);
  });
}
