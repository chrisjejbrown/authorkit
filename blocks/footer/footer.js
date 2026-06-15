// Banner Health footer: white logo, 4 link columns, social icons, legal bar.
// Content authored in /content/footer.plain.html; this reads that DOM and
// assigns layout roles. No copy is hardcoded here.

async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) {
    const footerPath = '/footer';
    resp = await fetch(`${footerPath}.plain.html`);
  }
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.querySelector('main') || doc.body;
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
