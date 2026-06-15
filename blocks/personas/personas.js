import { createPicture } from '../../scripts/utils/picture.js';

// Personas: testimonial cards (circular image, name, job title/location, quote)
// laid out as a responsive grid.
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'persona';
    const cells = [...row.children];
    const imageCell = cells.find((c) => c.querySelector('picture, img'));
    const bodyCell = cells.find((c) => c !== imageCell) || cells[cells.length - 1];

    if (imageCell) {
      const img = imageCell.querySelector('img');
      if (img) {
        const pic = createPicture({ src: img.src, alt: img.alt || '', breakpoints: [{ width: '400' }] });
        const wrap = document.createElement('div');
        wrap.className = 'persona-image';
        wrap.append(pic);
        li.append(wrap);
      }
    }

    const info = document.createElement('div');
    info.className = 'persona-info';
    if (bodyCell) {
      while (bodyCell.firstChild) info.append(bodyCell.firstChild);
    }
    li.append(info);
    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
}
