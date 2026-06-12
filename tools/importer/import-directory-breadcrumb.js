/* eslint-disable */
/* global WebImporter */

import searchParser from "./parsers/search.js";
import cardsFeatureParser from "./parsers/cards-feature.js";
import bannerhealthCleanupTransformer from './transformers/bannerhealth-cleanup.js';

const parsers = {
  "search": searchParser,
  "cards-feature": cardsFeatureParser,
};

const transformers = [bannerhealthCleanupTransformer];

const PAGE_TEMPLATE = {
  "name": "directory-breadcrumb",
  "description": "Directory entry page with breadcrumbs and a provider-search widget",
  "urls": [
    "https://www.bannerhealth.com/es/physician-directory"
  ],
  "blocks": [
    {
      "name": "search",
      "instances": [
        "#physician_search",
        "section.search-bar-container",
        "form.search-filter"
      ]
    },
    {
      "name": "cards-feature",
      "instances": [
        ".list-card",
        ".text-card",
        ".basic-list-card"
      ]
    }
  ],
  "sections": []
};

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => { try { fn.call(null, hookName, element, enhancedPayload); } catch (e) { console.error(`Transformer failed at ${hookName}:`, e); } });
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
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    const path = WebImporter.FileUtils.sanitizePath(new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''));
    return [{ element: main, path: path || '/index', report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) } }];
  },
};
