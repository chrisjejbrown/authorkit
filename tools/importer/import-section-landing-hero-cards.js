/* eslint-disable */
/* global WebImporter */

import heroParser from "./parsers/hero.js";
import accordionParser from "./parsers/accordion.js";
import personasParser from "./parsers/personas.js";
import cardsFeatureParser from "./parsers/cards-feature.js";
import bannerhealthCleanupTransformer from './transformers/bannerhealth-cleanup.js';

const parsers = {
  "hero": heroParser,
  "accordion": accordionParser,
  "personas": personasParser,
  "cards-feature": cardsFeatureParser,
};

const transformers = [bannerhealthCleanupTransformer];

const PAGE_TEMPLATE = {
  "name": "section-landing-hero-cards",
  "description": "Section landing page with hero banner, breadcrumbs, and a long stack of card grids",
  "urls": [
    "https://www.bannerhealth.com/about",
    "https://www.bannerhealth.com/careers",
    "https://www.bannerhealth.com/es/about",
    "https://www.bannerhealth.com/es/careers",
    "https://www.bannerhealth.com/es/staying-well",
    "https://www.bannerhealth.com/getcarenow",
    "https://www.bannerhealth.com/health-professionals",
    "https://www.bannerhealth.com/insurance",
    "https://www.bannerhealth.com/staying-well"
  ],
  "blocks": [
    {
      "name": "hero",
      "instances": [
        ".header-static .background-image-without-text",
        ".text-card-background-image"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".accordion"
      ]
    },
    {
      "name": "personas",
      "instances": [
        ".persona-list"
      ]
    },
    {
      "name": "cards-feature",
      "instances": [
        ".text-card",
        ".basic-list-card",
        ".list-card",
        ".list-text-card-link",
        ".text-card-circle-icon",
        ".text-card-full-width-image"
      ]
    }
  ],
  "sections": []
};

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => { try { fn.call(null, hookName, element, enhancedPayload); } catch (e) { console.error(`Transformer failed at ${hookName}:`, e); } });
}

// Banner Health section-landing pages alternate coloured bands: a navy
// (bg-primary) hero-intro/accordion band, white card bands, and a light-grey
// (bg-blue-50) persona band. The block parsers preserve the content but the
// band wrappers (and their backgrounds) are dropped, so the import flattens
// into one white section. Re-introduce EDS section breaks + Section Metadata
// so the rendered page keeps the original colour rhythm. Band → style mapping
// is derived from the source classes (bg-primary → navy, bg-blue-50 → grey).
function sectionMetadata(document, style) {
  return WebImporter.Blocks.createBlock(document, { name: 'Section Metadata', cells: { style } });
}

// Locate the deepest element whose text matches `re`. querySelectorAll yields
// ancestors before descendants and textContent bubbles up, so the most specific
// match is the matching node with the shortest textContent.
function locate(root, re) {
  const matches = [...root.querySelectorAll('h1,h2,h3,h4,h5,p,div,span,td,a,li')]
    .filter((el) => re.test(el.textContent));
  if (!matches.length) return null;
  return matches.reduce((best, el) => (el.textContent.length < best.textContent.length ? el : best));
}

// Insert an EDS section break before the band that contains `re`. At import
// time parsed blocks are tables (the `.cards-feature` / `.personas` classes
// only appear after markdown rendering), so anchor the break to the enclosing
// block table when the match sits inside one; otherwise to the loose element.
function startBand(document, main, re, style) {
  const node = locate(main, re);
  if (!node) return;
  const anchor = node.closest('table') || node;
  anchor.before(document.createElement('hr'));
  if (style) anchor.before(sectionMetadata(document, style));
}

function applySectionBands(main, document) {
  // Navy band: "Find your future" intro + the careers accordion.
  startBand(document, main, /find your future/i, 'navy');
  // White band: the "Grow your career" feature cards (default background).
  startBand(document, main, /grow your career with us/i, null);
  // Grey band: the "See what our employees are saying" persona testimonials.
  startBand(document, main, /see what our employees are saying/i, 'grey');
  // Navy band: the "Banner Health is a great place to work" statement.
  startBand(document, main, /great place to work/i, 'navy');
  // White band: the closing "Questions? Our careers team can help" card.
  startBand(document, main, /our careers team can help/i, null);
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (seen.has(element)) return;
        for (const prev of seen) { if (prev.contains(element) || element.contains(prev)) return; }
        seen.add(element);
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;
    executeTransformers('beforeTransform', main, payload);
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) { try { parser(block.element, { document, url, params }); } catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); } }
      else { console.warn(`No parser found for block: ${block.name}`); }
    });
    executeTransformers('afterTransform', main, payload);
    applySectionBands(main, document);
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    // transformBackgroundImages materialises CSS background-image URLs into
    // <img> tags; the navy hero carries a decorative vertical-dotted-line
    // texture (background-dotted-lines-*.svg) that is pure flourish and gets
    // stretched full-width by the global img{width:100%} rule. Drop it now
    // that it exists as an element (no transformer hook runs this late).
    main.querySelectorAll('img[src*="background-dotted-lines"]').forEach((img) => {
      const wrap = img.closest('p, picture') || img;
      (wrap.closest('p') || wrap).remove();
    });
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    const path = WebImporter.FileUtils.sanitizePath(new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''));
    return [{ element: main, path: path || '/index', report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) } }];
  },
};
