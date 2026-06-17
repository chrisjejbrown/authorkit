// Banner Health header: utility bar (row 0) + main nav (row 1).
// Content is authored in /content/nav.plain.html; this module reads that DOM,
// builds the two rows, and wires interactive controls (search, hamburger).

const DESKTOP_MIN = 992;

// SVG logos must not pass through the picture/webply pipeline: on the published
// site DA wraps the nav images in <picture> with an `image/webp` <source>, and
// the SVG→webply rendition resolves to about:error (the browser commits to that
// source and never falls back to the <img>). Collapse every <picture> to its
// inner <img>, and resolve relative media paths (./media_* / images/*) to the
// site root so the logo loads from any page depth.
function normalizeNavMedia(root) {
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

// Pick the response whose <main>/<body> actually has nav content. Both the
// local dev server (/content/nav.plain.html) and the published site
// (/nav.plain.html) may answer 200, but only one carries the authored nav; the
// other can be an empty placeholder, so choose by content.
function navBody(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.querySelector('main') || doc.body;
}

async function fetchNav() {
  const paths = ['/content/nav.plain.html', '/nav.plain.html'];
  let chosen = null;
  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(path);
    if (resp.ok) {
      // eslint-disable-next-line no-await-in-loop
      const body = navBody(await resp.text());
      if (body && body.querySelector('a, img')) {
        chosen = body;
        break;
      }
      if (body && !chosen) chosen = body;
    }
  }
  if (!chosen) return null;
  normalizeNavMedia(chosen);
  return chosen;
}

function buildSearchButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-search-toggle';
  btn.setAttribute('aria-label', 'Search');
  btn.innerHTML = '<span class="nav-icon nav-icon-search" aria-hidden="true"></span><span class="nav-search-label">Search</span>';
  btn.addEventListener('click', () => {
    document.querySelector('header').classList.toggle('search-open');
  });
  return btn;
}

function buildHamburger() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-hamburger';
  btn.setAttribute('aria-label', 'Open menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="nav-hamburger-bar"></span><span class="nav-hamburger-bar"></span><span class="nav-hamburger-bar"></span>';
  btn.addEventListener('click', () => {
    const header = document.querySelector('header');
    const open = header.classList.toggle('is-mobile-open');
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  return btn;
}

// Build a <ul> of links from a flat content section's <p><a> children.
function linkListFromSection(section) {
  const ul = document.createElement('ul');
  section.querySelectorAll(':scope > p > a').forEach((a) => {
    const li = document.createElement('li');
    li.append(a);
    ul.append(li);
  });
  return ul;
}

function buildUtilityRow(section) {
  const row = document.createElement('div');
  row.className = 'nav-utility';
  const inner = document.createElement('div');
  inner.className = 'nav-utility-inner';

  const links = linkListFromSection(section);
  links.classList.add('nav-utility-links');

  // The account link (last item, has an image) moves to the right group.
  const tools = document.createElement('div');
  tools.className = 'nav-utility-tools';
  tools.append(buildSearchButton());
  const accountItem = [...links.children].find((li) => li.querySelector('img'));
  if (accountItem) {
    accountItem.classList.add('nav-account');
    tools.append(accountItem);
  }

  inner.append(links, tools);
  row.append(inner);
  return row;
}

function buildMainRow(section) {
  const row = document.createElement('div');
  row.className = 'nav-main';
  const inner = document.createElement('div');
  inner.className = 'nav-main-inner';

  // First link is the logo (contains an <img>).
  const links = linkListFromSection(section);
  const logoItem = [...links.children].find((li) => li.querySelector('img'));
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (logoItem) {
    const logoLink = logoItem.querySelector('a');
    brand.append(logoLink);
    logoItem.remove();
  }

  links.classList.add('nav-main-links');

  // The CTA (last link, /get-care-now) gets button styling.
  const items = [...links.children];
  const cta = items[items.length - 1];
  if (cta && cta.querySelector('a[href*="get-care-now"]')) {
    cta.classList.add('nav-cta');
  }

  const navEl = document.createElement('nav');
  navEl.setAttribute('aria-label', 'Main navigation');
  navEl.append(links);

  inner.append(brand, navEl, buildHamburger());
  row.append(inner);
  return row;
}

function handleResize() {
  const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
  mq.addEventListener('change', (e) => {
    if (e.matches) {
      const header = document.querySelector('header');
      header.classList.remove('is-mobile-open', 'search-open');
      const burger = header.querySelector('.nav-hamburger');
      if (burger) {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
      }
    }
  });
}

export default async function init(el) {
  const nav = await fetchNav();
  if (!nav) return;
  const sections = nav.querySelectorAll(':scope > div');
  el.textContent = '';
  el.classList.add('bh-header');
  if (sections[0]) el.append(buildUtilityRow(sections[0]));
  if (sections[1]) el.append(buildMainRow(sections[1]));
  handleResize();
}
