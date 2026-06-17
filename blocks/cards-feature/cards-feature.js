import { createPicture } from '../../scripts/utils/picture.js';

// Some Banner Health card icons are SVGs filled entirely with white/near-white
// (e.g. the "by the numbers" stat icons), authored for a navy card background
// on the source site. On our default white cards they vanish. Detect a
// white-only SVG and flag its card so CSS can restore the dark background.
async function isWhiteOnlySvg(src) {
  try {
    const resp = await fetch(src);
    if (!resp.ok) return false;
    const text = await resp.text();
    const colors = text.match(/(?:fill|stroke)\s*[:=]\s*["']?#?[0-9a-z]+/gi) || [];
    let sawColor = false;
    let sawNonWhite = false;
    colors.forEach((decl) => {
      const val = decl.split(/[:=]/)[1].trim().replace(/["']/g, '').toLowerCase();
      if (val === 'none' || val === 'transparent' || val === 'currentcolor') return;
      sawColor = true;
      const isWhite = val === 'white' || val === '#fff' || val === '#ffffff'
        || /^#f[0-9a-f]f[0-9a-f]f[0-9a-f]$/.test(val); // very light tints like #f5fcff
      if (!isWhite) sawNonWhite = true;
    });
    return sawColor && !sawNonWhite;
  } catch (e) {
    return false;
  }
}

async function markWhiteIconCards(ul) {
  const imgs = [...ul.querySelectorAll('.cards-feature-card-image img')]
    .filter((img) => /\.svg(\?|$)/i.test(img.getAttribute('src') || ''));
  await Promise.all(imgs.map(async (img) => {
    if (await isWhiteOnlySvg(img.src)) {
      const li = img.closest('li');
      if (li) li.classList.add('cards-feature-card-invert');
    }
  }));
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-feature-card-image';
      else div.className = 'cards-feature-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createPicture({ src: img.src, alt: img.alt, breakpoints: [{ width: '750' }] });
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
  markWhiteIconCards(ul);
}
