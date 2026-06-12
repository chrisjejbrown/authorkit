/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import searchParser from './parsers/search.js';
import cardsFeatureParser from './parsers/cards-feature.js';

// TRANSFORMER IMPORTS
import bannerhealthCleanupTransformer from './transformers/bannerhealth-cleanup.js';

const parsers = {
  search: searchParser,
  'cards-feature': cardsFeatureParser,
};

const transformers = [
  bannerhealthCleanupTransformer,
];

const PAGE_TEMPLATE = {
  name: 'search-listing',
  description: 'Directory/listing page with breadcrumbs and a search/filter block (locations, calendar, newsroom, medicare)',
  urls: [
    'https://www.bannerhealth.com/locations',
  ],
  blocks: [
    {
      name: 'search',
      instances: ['section.search-bar-container'],
    },
    {
      name: 'cards-feature',
      instances: [
        '.video-card-v2',
        '.text-card',
        '.basic-list-card',
        '.list-card',
        '.list-text-card-link',
        '.shell-card',
        '.text-card-circle-icon',
        '.text-card-full-width-image',
      ],
    },
  ],
  sections: [],
};

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (seen.has(element)) return;
        for (const prev of seen) {
          if (prev.contains(element) || element.contains(prev)) return;
        }
        seen.add(element);
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path: path || '/index',
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
