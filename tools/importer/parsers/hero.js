/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: hero
 * Base block: hero
 * Source URL: https://www.bannerhealth.com/about (template: section-landing-hero-cards)
 * Selector: .header-static .background-image-without-text
 * Generated: 2026-06-12T19:22:03Z
 *
 * This is a Banner Health section-landing hero: a background-image-only banner.
 * The matched element is `div.background-image-without-text` containing a single
 * lazy-loaded `<img class="lazy">`. There is NO overlaid heading or CTA, so the
 * output is the single-image (background-only) hero variant from the block library:
 *
 *   | Hero |
 *   | --- |
 *   | ![background](banner.jpg) |
 *
 * Lazy-load handling: the live image often has an empty/placeholder `src`, with the
 * real URL stored in a data attribute (data-src, data-original, data-lazy, ...).
 * resolveImageSrc() prefers a real URL from those attributes over an empty/placeholder
 * src so the imported image points at the actual asset.
 */
export default function parse(element, { document }) {
  // The hero is image-only. Find the background image within the matched element.
  const img = element.querySelector('img');

  // Resolve the real image URL, accounting for lazy-load patterns.
  function isRealUrl(value) {
    if (!value) return false;
    const v = value.trim();
    if (!v) return false;
    // Skip empty/inline placeholders used by lazy-loaders.
    if (v.startsWith('data:image')) return false;
    if (/^about:blank$/i.test(v)) return false;
    return true;
  }

  function firstUrlFromSrcset(value) {
    if (!value) return '';
    // srcset is "url 1x, url2 2x" — take the first URL.
    const first = value.split(',')[0].trim().split(/\s+/)[0];
    return first || '';
  }

  function resolveImageSrc(node) {
    if (!node) return '';
    // Prefer explicit data-* lazy-load URLs over the (often placeholder) src.
    const dataAttrs = [
      'data-src',
      'data-original',
      'data-lazy',
      'data-lazy-src',
      'data-original-src',
      'data-url',
      'data-img',
      'data-image',
    ];
    for (const attr of dataAttrs) {
      const val = node.getAttribute(attr);
      if (isRealUrl(val)) return val.trim();
    }
    // Lazy-loaded srcset variants.
    const dataSrcsetAttrs = ['data-srcset', 'data-lazy-srcset'];
    for (const attr of dataSrcsetAttrs) {
      const val = firstUrlFromSrcset(node.getAttribute(attr));
      if (isRealUrl(val)) return val.trim();
    }
    // Fall back to a real src, then a real srcset.
    const src = node.getAttribute('src');
    if (isRealUrl(src)) return src.trim();
    const srcset = firstUrlFromSrcset(node.getAttribute('srcset'));
    if (isRealUrl(srcset)) return srcset.trim();
    // Last resort: whatever src is present (may be placeholder).
    return src ? src.trim() : '';
  }

  const cells = [];

  if (img) {
    const resolvedSrc = resolveImageSrc(img);
    if (resolvedSrc) {
      // Normalize the img so the resolved URL is the actual src for import.
      img.setAttribute('src', resolvedSrc);
    }
    // Keep alt text if present for accessibility.
    cells.push([img]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
