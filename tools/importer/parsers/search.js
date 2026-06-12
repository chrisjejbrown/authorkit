/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the Banner Health location/search finder widget.
 *
 * The live widget is a complex interactive component (facets, map, results)
 * with no authorable static content. For content migration we emit a standard
 * EDS "search" block whose single cell points at the site query index. The
 * interactive faceting/map behaviour is implemented in the block decoration
 * layer, not authored content.
 */
export default function parse(element, { document }) {
  const cells = [['Search'], ['/query-index.json']];
  const block = WebImporter.Blocks.createBlock(document, {
    name: 'search',
    cells,
  });
  element.replaceWith(block);
}
