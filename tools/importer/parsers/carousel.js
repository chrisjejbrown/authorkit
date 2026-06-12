/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel.
 * Base block: carousel.
 * Source: https://www.bannerhealth.com/es/healthcareblog (div.text-card-al-carousel)
 * Generated: 2026-06-12
 *
 * Source is a Banner Health slick-style "ARTÍCULOS RECIENTES" slider.
 * Structure (validated against migration-work/block-context/carousel/source.html):
 *   div.text-card-al-carousel
 *     h2.text-card-al-carousel-heading                       (section heading, not emitted as a slide)
 *     div.text-card-al-carousel-slick
 *       div.text-card-al-carousel-slide                      (one per slide)
 *         div.text-card-article-card
 *           div.text-card-article-card-image > img + a.text-card-article-card-image-link
 *           div.text-card-article-card-copy-area
 *             div.text-card-article-card-eyebrow > a.text-card-article-card-eyebrow-link   (category)
 *             div.text-card-article-card-title   > a.text-card-article-card-title-link     (article title)
 *             div.text-card-article-card-footer  > span.text-card-article-card-date        (date)
 *
 * Output: a "Carousel" block table with one row per slide.
 *   col 1: image cell (resolved real image URL)
 *   col 2: content cell -> <h3>[title link]</h3> + category + date
 *
 * NOTE on HierarchyRequestError: all emitted nodes are NEW detached nodes
 * (createElement / cloneNode), so nothing referenced by `element` is moved
 * into the block before element.replaceWith(block) runs.
 */
export default function parse(element, { document }) {
  const isPlaceholder = (u) => /data:image|blank|placeholder|spacer|1x1|loading/i.test(u);

  // Resolve the real image URL from a lazy-load-aware <img>, preferring a
  // non-placeholder candidate.
  function resolveImgUrl(img) {
    if (!img) return null;
    const candidates = [
      img.getAttribute('data-src'),
      img.getAttribute('data-original'),
      img.getAttribute('data-lazy'),
      img.getAttribute('data-lazy-src'),
      img.getAttribute('src'),
    ].filter(Boolean);
    const real = candidates.find((u) => !isPlaceholder(u));
    return real || candidates[0] || null;
  }

  // Extract a URL from a CSS background-image declaration.
  // The live slick slider renders slide images as background-image on the
  // .text-card-article-card-image div (no <img>), while the cached/static
  // snapshot uses a real <img>. Handle both.
  function urlFromBackground(node) {
    if (!node) return null;
    const inline = node.getAttribute && node.getAttribute('style');
    let raw = inline;
    if ((!raw || !/url\(/i.test(raw)) && typeof getComputedStyle === 'function') {
      try {
        const bg = getComputedStyle(node).backgroundImage;
        if (bg && bg !== 'none') raw = bg;
      } catch (e) { /* getComputedStyle unavailable (jsdom) — ignore */ }
    }
    if (!raw) return null;
    const m = raw.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    return m ? m[1] : null;
  }

  // Resolve the slide image URL, preferring a real <img>, then a
  // background-image, then a non-placeholder fallback.
  function resolveSlideImageUrl(imageContainer, img) {
    const fromImg = resolveImgUrl(img);
    if (fromImg && !isPlaceholder(fromImg)) return fromImg;
    const fromBg = urlFromBackground(imageContainer);
    if (fromBg && !isPlaceholder(fromBg)) return fromBg;
    return fromImg || fromBg || null;
  }

  // Slides — direct article cards inside the slick track. Fall back to any slide
  // markup variant so re-runs against slightly different DOM still work.
  let slides = Array.from(element.querySelectorAll('.text-card-al-carousel-slide'));
  if (!slides.length) {
    slides = Array.from(element.querySelectorAll('.text-card-article-card')).map((c) => c);
  }

  const cells = [];

  slides.forEach((slide) => {
    const card = slide.querySelector('.text-card-article-card') || slide;
    if (!card) return;

    const titleLink = card.querySelector('.text-card-article-card-title-link, .text-card-article-card-title a');
    const imageLink = card.querySelector('.text-card-article-card-image-link, .text-card-article-card-image a');
    const eyebrowLink = card.querySelector('.text-card-article-card-eyebrow-link, .text-card-article-card-eyebrow a');
    const dateEl = card.querySelector('.text-card-article-card-date');
    const imageContainer = card.querySelector('.text-card-article-card-image');
    const srcImg = card.querySelector('.text-card-article-card-image img, img');

    // Primary link = article title link href (falls back to image link href).
    const primaryHref = (titleLink && titleLink.getAttribute('href'))
      || (imageLink && imageLink.getAttribute('href'))
      || '';

    // --- Image cell (new detached <img>) ---
    let imageCell = '';
    const imageUrl = resolveSlideImageUrl(imageContainer, srcImg);
    if (imageUrl) {
      const newImg = document.createElement('img');
      newImg.setAttribute('src', imageUrl);
      const alt = (srcImg && srcImg.getAttribute('alt'))
        || (titleLink && titleLink.textContent.trim())
        || '';
      if (alt) newImg.setAttribute('alt', alt);
      imageCell = newImg;
    }

    // --- Content cell (new detached nodes) ---
    const contentCell = [];

    // Title as a linked heading.
    if (titleLink) {
      const h3 = document.createElement('h3');
      const a = document.createElement('a');
      if (primaryHref) a.setAttribute('href', primaryHref);
      const titleVal = titleLink.getAttribute('title');
      if (titleVal) a.setAttribute('title', titleVal);
      a.textContent = titleLink.textContent.trim();
      h3.appendChild(a);
      contentCell.push(h3);
    }

    // Category eyebrow.
    if (eyebrowLink) {
      const p = document.createElement('p');
      const ea = document.createElement('a');
      const eHref = eyebrowLink.getAttribute('href');
      if (eHref) ea.setAttribute('href', eHref);
      ea.textContent = eyebrowLink.textContent.trim();
      p.appendChild(ea);
      contentCell.push(p);
    }

    // Date.
    if (dateEl && dateEl.textContent.trim()) {
      const dp = document.createElement('p');
      dp.textContent = dateEl.textContent.trim();
      contentCell.push(dp);
    }

    // Only emit a slide row if we extracted something meaningful.
    if (imageCell || contentCell.length) {
      cells.push([imageCell, contentCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel', cells });
  element.replaceWith(block);
}
