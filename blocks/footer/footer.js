// Banner Health footer: white logo, 4 link columns, social icons, legal bar.
// Content authored in /content/footer.plain.html; this reads that DOM and
// assigns layout roles. No copy is hardcoded here.

// SVG logos/icons must not pass through the picture/webply pipeline: on the
// published site DA wraps footer images in <picture> with an `image/webp`
// <source> whose SVG->webply rendition resolves to about:error, and relative
// `images/*` / `./media_*` paths resolve against the page path (404 at depth,
// e.g. /es/about). Collapse each <picture> to its <img> and resolve relative
// srcs to the site root so the footer renders from any page depth.
function normalizeFooterMedia(root) {
  root.querySelectorAll('picture').forEach((pic) => {
    const img = pic.querySelector('img');
    if (img) pic.replaceWith(img);
    else pic.remove();
  });
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith('./')) img.setAttribute('src', `/${src.slice(2)}`);
    else if (!/^(https?:)?\//.test(src)) img.setAttribute('src', `/${src}`);
    img.removeAttribute('loading');
  });
}

// Pick the response whose <main>/<body> actually has footer content. Both the
// local dev server (/content/footer.plain.html) and the published site
// (/footer.plain.html) may answer 200, but only one carries the authored
// footer; the other can be an empty placeholder, so choose by content.
function navBody(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.querySelector('main') || doc.body;
}

async function fetchFooter() {
  const paths = ['/content/footer.plain.html', '/footer.plain.html'];
  let chosen = null;
  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(path);
    if (resp.ok) {
      // eslint-disable-next-line no-await-in-loop
      const body = navBody(await resp.text());
      if (body && body.querySelector('a, img, h3')) {
        chosen = body;
        break;
      }
      if (body && !chosen) chosen = body;
    }
  }
  if (!chosen) return null;
  normalizeFooterMedia(chosen);
  return chosen;
}

export default async function init(el) {
  const content = await fetchFooter();
  if (!content) return;
  const sections = [...content.querySelectorAll(':scope > div')];
  el.textContent = '';
  el.classList.add('bh-footer');

  const top = document.createElement('div');
  top.className = 'footer-top';
  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  let legalSection = null;
  const socialWrap = document.createElement('div');
  socialWrap.className = 'footer-social';
  const columnsWrap = document.createElement('div');
  columnsWrap.className = 'footer-columns';
  const brandWrap = document.createElement('div');
  brandWrap.className = 'footer-brand';

  sections.forEach((sec) => {
    const hasHeading = sec.querySelector('h3');
    const imgs = sec.querySelectorAll('a img');
    const hasCopyright = [...sec.querySelectorAll('p')].some((p) => /©/.test(p.textContent));

    if (hasCopyright) {
      legalSection = sec;
      return;
    }
    if (hasHeading) {
      sec.classList.add('footer-column');
      columnsWrap.append(sec);
      return;
    }
    if (imgs.length === 1) {
      sec.classList.add('footer-logo');
      brandWrap.append(sec);
      return;
    }
    if (imgs.length > 1) {
      sec.querySelectorAll(':scope > p > a').forEach((a) => {
        a.classList.add('footer-social-link');
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
        socialWrap.append(a);
      });
    }
  });

  brandWrap.append(socialWrap);
  inner.append(brandWrap, columnsWrap);
  top.append(inner);
  el.append(top);

  if (legalSection) {
    legalSection.classList.add('footer-legal');
    const legalInner = document.createElement('div');
    legalInner.className = 'footer-legal-inner';
    while (legalSection.firstChild) legalInner.append(legalSection.firstChild);
    legalSection.append(legalInner);
    el.append(legalSection);
  }
}
