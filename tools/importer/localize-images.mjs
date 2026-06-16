#!/usr/bin/env node
/**
 * Localize external Banner Health images referenced in the migrated content.
 *
 * WHY: every <img> in content/*.plain.html hotlinks https://www.bannerhealth.com/...
 * That host returns 403 to any non-browser request, so when AEM publishes a page
 * its server-side media pipeline cannot fetch the image and bakes src="about:error"
 * into the published HTML. Local preview works only because the browser fetches the
 * image directly. The durable fix is to serve the images from the SAME origin.
 *
 * WHAT: download each unique external image (sending a browser User-Agent to get
 * past the 403) into the repo code-bus dir img/migrated/, then rewrite every
 * reference in content/*.plain.html to an absolute same-origin path (/img/...).
 * The code bus serves /img/* on both local `aem up` and the published aem.page,
 * and tolerates the ?width=&format= query strings createPicture appends.
 *
 * Idempotent: a URL already downloaded is reused; already-rewritten refs are skipped.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CONTENT_DIR = join(REPO_ROOT, 'content');
const OUT_DIR = join(REPO_ROOT, 'img', 'migrated');
const PUBLIC_PREFIX = '/img/migrated';

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Only localize hosts that block server-side fetches / aren't already same-origin.
// img.youtube.com and other CDNs that serve thumbnails publicly are left as-is.
const LOCALIZE_HOST_RE = /^https:\/\/(www\.)?bannerhealth\.com\//i;

function listPlainHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listPlainHtml(full));
    else if (entry.endsWith('.plain.html')) out.push(full);
  }
  return out;
}

// Decode the HTML entities that appear inside src attributes (&amp; -> &).
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&');
}

function extFromUrl(u) {
  try {
    const { pathname } = new URL(u);
    const m = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return m ? m[1].toLowerCase() : 'jpg';
  } catch {
    return 'jpg';
  }
}

// Stable local filename: <slug-from-pathname>-<hash8>.<ext>. The hash keys off the
// full URL (including query) so two renditions of the same path stay distinct, and
// re-runs reuse the same file.
function localNameFor(url) {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
  let slug = 'image';
  try {
    const { pathname } = new URL(url);
    const base = pathname.split('/').filter(Boolean).pop() || 'image';
    slug = base.replace(/\.[a-zA-Z0-9]{2,5}$/, '').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 60) || 'image';
  } catch { /* keep default */ }
  return `${slug}-${hash}.${extFromUrl(url)}`;
}

// Node's built-in fetch is blocked by Banner Health's bot detection (its TLS
// fingerprint is flagged → 403) even with a browser User-Agent. curl with a
// browser UA gets a normal 200, so shell out to curl for the actual download.
function download(url, destPath) {
  execFileSync('curl', [
    '-sS', '--fail', '--location',
    '--max-time', '60',
    '-A', BROWSER_UA,
    '-H', 'Referer: https://www.bannerhealth.com/',
    '-H', 'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    '-H', 'Accept-Language: en-US,en;q=0.9',
    '-o', destPath,
    url,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (!existsSync(destPath) || statSync(destPath).size === 0) throw new Error('empty body');
  return statSync(destPath).size;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = listPlainHtml(CONTENT_DIR);

  // Pass 1: collect every unique external src across all files.
  const SRC_RE = /(src|srcset)="([^"]+)"/g;
  const urls = new Set();
  for (const file of files) {
    const html = readFileSync(file, 'utf-8');
    let m;
    while ((m = SRC_RE.exec(html)) !== null) {
      // srcset can hold multiple comma-separated candidates; split defensively.
      for (const part of decodeEntities(m[2]).split(',')) {
        const candidate = part.trim().split(/\s+/)[0];
        if (LOCALIZE_HOST_RE.test(candidate)) urls.add(candidate);
      }
    }
  }

  console.log(`Found ${urls.size} unique external Banner Health image URLs to localize.`);

  // Pass 2: download (or reuse) each, building url -> /img/migrated/<name> map.
  const map = new Map();
  let ok = 0; let failed = 0; let reused = 0;
  for (const url of urls) {
    const name = localNameFor(url);
    const destPath = join(OUT_DIR, name);
    const publicPath = `${PUBLIC_PREFIX}/${name}`;
    if (existsSync(destPath) && statSync(destPath).size > 0) {
      map.set(url, publicPath); reused++; continue;
    }
    try {
      const size = await download(url, destPath);
      map.set(url, publicPath); ok++;
      console.log(`  ✓ ${name} (${size} bytes)`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${url.slice(0, 90)}... — ${e.message}`);
    }
  }
  console.log(`Downloaded ${ok}, reused ${reused}, failed ${failed}.`);

  // Pass 3: rewrite references in every file.
  let rewrittenFiles = 0; let rewrittenRefs = 0;
  for (const file of files) {
    let html = readFileSync(file, 'utf-8');
    let changed = false;
    for (const [url, localPath] of map) {
      // Match the entity-encoded form that lives in the file.
      const encoded = url.replace(/&/g, '&amp;');
      for (const needle of [url, encoded]) {
        if (html.includes(needle)) {
          html = html.split(needle).join(localPath);
          changed = true; rewrittenRefs++;
        }
      }
    }
    if (changed) {
      writeFileSync(file, html, 'utf-8');
      rewrittenFiles++;
    }
  }
  console.log(`Rewrote ${rewrittenRefs} references across ${rewrittenFiles} files.`);

  if (failed > 0) {
    console.log('\nNote: some images could not be downloaded; their references were left unchanged.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
