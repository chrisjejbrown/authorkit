A navigation already exists and works locally, so I want to confirm what "setup navigation" should focus on before finalizing the plan.# Banner Health Navigation Setup Plan

## Goal

Keep the existing two-row Banner Health header (navy utility bar + white main nav) and make it work **on the published site**, where it currently does not appear and its logo/icon images 404. Apply the same same-origin image fix already used for content images, then verify across pages and locales.

## Background / What I Found

- A header block (`blocks/header/header.js` + `header.css`) already exists and renders correctly on **local preview** (`localhost:3000`): utility links, logo, main nav, search button, hamburger.
- Nav content is authored at `content/nav.plain.html` (two `<div>` sections: utility row + main row).
- `scripts/ak.js` `decorateHeader()` attaches the `<header>` element on every page; `header.js` fetches `/content/nav.plain.html` (falls back to `/nav.plain.html`).
- **Problem 1 — header missing on publish:** The published page (`main--authorkit--chrisjejbrown.aem.page/newsroom`) renders with **no `banner`/header region** at all, while local preview shows it. The nav document and/or its fetch path is not resolving the same way once published.
- **Problem 2 — broken nav images on publish:** `nav.plain.html` references `images/icon-patient.svg` and `images/header-logo.svg` (relative). These resolve locally (`/content/images/...` → 200) but **404 on the published site** at both `/images/...` and `/content/images/...`. This is the same class of issue just fixed for content images, where same-origin code-bus paths under `/img/...` publish reliably.

## Root-Cause Hypotheses to Confirm (read-only investigation first)

1. **Header fetch path on publish.** `header.js` fetches `/content/nav.plain.html`. On the published site, content is served at the site root (e.g. `/nav`), not under `/content/`. Need to confirm which path returns the nav document on publish and that the fallback works (the published `/nav.plain.html` returned 200 in checks, so the fallback should fire — but the header region was absent, so confirm whether `decorateHeader()` runs and whether `getMetadata('header')` resolves to `off` or the block fails).
2. **Nav image hosting.** Decide the durable location for `header-logo.svg` and `icon-patient.svg` so they publish. Candidates: move into the repo code-bus `/img/` dir (proven to serve on publish) and reference as absolute `/img/...`, mirroring the content-image fix.
3. **Whether nav must be published as a document.** Confirm the nav/header content document is present in DA and published (it may simply never have been published).

## Approach (pending confirmation of root cause)

- Reference nav images by absolute same-origin `/img/...` paths (copy the two SVGs into the repo `img/` dir) so they resolve identically on local and publish.
- Ensure `header.js`'s nav fetch resolves on the published site (verify the `/nav.plain.html` fallback path and document presence; adjust fetch order if needed).
- Confirm `decorateHeader()` runs on published pages and the header block loads (check `getMetadata('header')`, block load path).
- Re-verify the header renders with images on multiple published pages and both locales (EN + `/es/`).

## Checklist

- [ ] Confirm on the published site which path serves the nav document (`/nav.plain.html` vs `/content/nav.plain.html`) and whether the nav/header document is actually published in DA
- [ ] Determine why the `<header>`/banner region is absent on the published page (inspect published HTML, `decorateHeader()` execution, `getMetadata('header')`, header block load)
- [ ] Decide and confirm the durable same-origin location for nav images (`/img/...` code-bus path, proven to publish)
- [ ] Copy `header-logo.svg` and `icon-patient.svg` into the repo `img/` directory
- [ ] Update `content/nav.plain.html` to reference the logo and patient icon via absolute `/img/...` paths
- [ ] Adjust `header.js` nav-fetch path/order if the published fetch does not resolve (keep local preview working via the `/content/` path)
- [ ] Verify locally (`localhost:3000`) that the header still renders with images on a content page
- [ ] Publish the nav document + affected code, then verify on `main--authorkit--chrisjejbrown.aem.page` that the header renders with working logo/icon (no 404, no `about:error`)
- [ ] Verify the header on at least 3 published pages (e.g. `/newsroom`, `/index`, `/careers`) and on a Spanish page (e.g. `/es/about`)
- [ ] Confirm no console errors related to nav fetch or images on the published pages

## Notes

- Execution requires **Execute mode**; this artifact is the plan only.
- Keep the existing two-row nav **design** unchanged per the chosen scope — this is a publish + image-resolution fix, not a redesign or re-extraction.
- A content backup was already made during the prior image-localization work; any nav edits are small and reversible.
