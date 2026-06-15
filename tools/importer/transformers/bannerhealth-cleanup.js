/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Banner Health site-wide cleanup.
 *
 * Banner Health is a Sitecore site rendered with Bootstrap-style markup. The
 * captured DOM (migration-work/cleaned.html) wraps the authorable card/promo
 * content (lines ~249-589) between a global header/nav (lines 31-247) and a
 * global footer (line 591+). After the footer the page injects modal overlays
 * (#gcnModal get-care-now, #searchModal, #geoLocationModal) and an Adobe/demdex
 * ID-syncing tracking iframe. None of these are authorable and must be removed
 * so block parsing sees only the page content.
 *
 * ALL selectors below were verified against migration-work/cleaned.html.
 * NOTE: the authorable "video" card embeds a YouTube <iframe> (cleaned.html
 * line 551), so we never do a blanket `iframe` removal — only the specific
 * demdex tracking iframe is removed by its id.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Modal overlays / dialogs and the tracking iframe live after the content
    // and can interfere with block matching. Remove them before parsing.
    // Verified in cleaned.html: #gcnModal (813), #searchModal (923),
    // #geoLocationModal (981), demdex iframe (1016).
    WebImporter.DOMUtils.remove(element, [
      '#gcnModal',
      '#searchModal',
      '#geoLocationModal',
      '#destination_publishing_iframe_bannerhealthcare_0',
      '.aamIframeLoaded',
      // Dismissible global app-install promo widget (logo + INSTALL/Open),
      // not authorable page content. Verified in cleaned.html (line ~248).
      'section.bh-app-mobile-download',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable global chrome.
    // Verified in cleaned.html: <header> (31), footer.global-footer (591),
    // nav.navbar-utility (33), nav.navbar-main (104), button.header-search (143).
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer.global-footer',
      'nav.navbar-utility',
      'nav.navbar-main',
      'button.header-search',
    ]);
  }
}
