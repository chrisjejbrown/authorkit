/*
 * Edge Delivery Services block: provider-search
 * Place at: /blocks/provider-search/provider-search.js (+ .css)
 *
 * Authoring: add a "Provider Search" block to any document. Optional first cell
 * overrides the index path. The provider list is maintained by a non-technical
 * author in a published spreadsheet that EDS exposes as JSON — no search engine,
 * no external service. At Banner production scale (~10k providers) swap the
 * fetch for the Kyruus provider API; the rendering logic is unchanged.
 *
 *   | Provider Search       |
 *   | /providers.json       |   <- optional; defaults to /providers.json
 */

const splitLangs = (p) => (p.languages || '').split(',').map((s) => s.trim()).filter(Boolean);
const uniq = (a) => [...new Set(a)].sort();
const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const hash = (n) => [...n].reduce((a, c) => a + c.charCodeAt(0), 0);
const AVATAR = ['#003087', '#00A3AD', '#5B5BD6', '#0E7C66', '#9A3DAA', '#B25E00'];
const stars = (r) => '★'.repeat(Math.round(+r)) + '☆'.repeat(5 - Math.round(+r)) + `<span>${r}</span>`;

export default async function decorate(block) {
  const indexPath = block.textContent.trim() || '/providers.json';
  block.textContent = '';

  let providers = [];
  try {
    const json = await (await fetch(indexPath)).json();
    providers = json.data || [];
  } catch (e) {
    block.innerHTML = '<p class="ps-error">We couldn’t load the provider directory right now. Please try again.</p>';
    return;
  }

  const state = {
    q: '', specialty: new Set(), city: new Set(), language: new Set(),
    gender: '', accepting: false, sort: 'best',
  };

  block.innerHTML = `
    <div class="ps">
      <div class="ps-search">
        <input type="search" class="ps-q" aria-label="Search providers"
          placeholder="Try “breast cancer”, “radiation”, or a doctor’s name">
      </div>
      <div class="ps-body">
        <aside class="ps-facets" aria-label="Filter providers">
          <div class="ps-fhead"><span>Refine</span><button class="ps-clear">Clear all</button></div>
          <label class="ps-toggle"><input type="checkbox" class="ps-accepting"> Accepting new patients</label>
          <fieldset class="ps-f" data-key="specialty"><legend>Specialty</legend></fieldset>
          <fieldset class="ps-f" data-key="city"><legend>Location</legend></fieldset>
          <fieldset class="ps-f" data-key="language"><legend>Language</legend></fieldset>
          <fieldset class="ps-f-gender"><legend>Provider gender</legend>
            <label class="ps-opt"><input type="radio" name="ps-gender" value="" checked> Any</label>
            <label class="ps-opt"><input type="radio" name="ps-gender" value="Female"> Female</label>
            <label class="ps-opt"><input type="radio" name="ps-gender" value="Male"> Male</label>
          </fieldset>
        </aside>
        <main class="ps-main">
          <div class="ps-toolbar">
            <div class="ps-count" aria-live="polite"><b>0</b> providers</div>
            <label class="ps-sort">Sort by
              <select>
                <option value="best">Best match</option>
                <option value="avail">Availability</option>
                <option value="az">Name A–Z</option>
                <option value="za">Name Z–A</option>
              </select>
            </label>
          </div>
          <div class="ps-grid"></div>
        </main>
      </div>
    </div>`;

  const grid = block.querySelector('.ps-grid');
  const countEl = block.querySelector('.ps-count b');

  const buildFacet = (fs, key, values) => {
    values.forEach((v) => {
      const ct = providers.filter((p) => (key === 'language' ? splitLangs(p).includes(v) : p[key] === v)).length;
      const lab = document.createElement('label');
      lab.className = 'ps-opt';
      lab.innerHTML = `<input type="checkbox" value="${v}"> ${v} <span class="ps-ct">${ct}</span>`;
      lab.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) state[key].add(v); else state[key].delete(v);
        render();
      });
      fs.appendChild(lab);
    });
  };

  const matches = (p) => {
    if (state.accepting && p.acceptingNewPatients !== 'Yes') return false;
    if (state.gender && p.gender !== state.gender) return false;
    if (state.specialty.size && !state.specialty.has(p.specialty)) return false;
    if (state.city.size && !state.city.has(p.city)) return false;
    if (state.language.size && !splitLangs(p).some((l) => state.language.has(l))) return false;
    if (state.q) {
      const hay = `${p.name} ${p.specialty} ${p.subspecialty} ${p.city} ${p.location}`.toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  };

  const sortFn = (a, b) => {
    if (state.sort === 'az') return a.name.localeCompare(b.name);
    if (state.sort === 'za') return b.name.localeCompare(a.name);
    if (state.sort === 'avail') {
      return (b.acceptingNewPatients === 'Yes') - (a.acceptingNewPatients === 'Yes') || (+b.rating) - (+a.rating);
    }
    return (+b.rating) - (+a.rating);
  };

  const card = (p) => {
    const ok = p.acceptingNewPatients === 'Yes';
    const col = AVATAR[hash(p.name) % AVATAR.length];
    return `<article class="ps-card">
      <div class="ps-top">
        <div class="ps-avatar" style="background:${col}">${initials(p.name)}</div>
        <div><div class="ps-nm">${p.name}, ${p.credentials}</div>
          <div class="ps-sp">${p.specialty}</div><div class="ps-sub">${p.subspecialty}</div></div>
      </div>
      <div class="ps-badges">
        ${ok ? '<span class="ps-badge ok">Accepting new patients</span>' : '<span class="ps-badge">Established patients</span>'}
        <span class="ps-badge">${p.gender}</span></div>
      <div class="ps-meta">
        <div>${p.location} · ${p.city}, ${p.state}</div>
        <div>${p.languages}</div>
        <div class="ps-stars">${stars(p.rating)}</div></div>
      <div class="ps-cta">
        <a class="ps-btn primary" href="${p.scheduleUrl}" target="_blank" rel="noopener">Schedule online</a>
        <a class="ps-btn ghost" href="${p.path}">View profile</a></div>
    </article>`;
  };

  const clearAll = () => {
    state.q = ''; state.gender = ''; state.accepting = false;
    state.specialty.clear(); state.city.clear(); state.language.clear();
    block.querySelector('.ps-q').value = '';
    block.querySelectorAll('.ps-facets input[type=checkbox]').forEach((c) => { c.checked = false; });
    block.querySelector('input[name=ps-gender][value=""]').checked = true;
    render();
  };

  function render() {
    const list = providers.filter(matches).sort(sortFn);
    countEl.textContent = list.length;
    if (!list.length) {
      grid.innerHTML = `<div class="ps-empty"><h3>No providers match those filters</h3>
        <p>Try removing a filter or searching a broader term like “oncology”.</p>
        <button class="ps-reset">Clear all filters</button></div>`;
      grid.querySelector('.ps-reset').addEventListener('click', clearAll);
      return;
    }
    grid.innerHTML = list.map(card).join('');
  }

  buildFacet(block.querySelector('[data-key=specialty]'), 'specialty', uniq(providers.map((p) => p.specialty)));
  buildFacet(block.querySelector('[data-key=city]'), 'city', uniq(providers.map((p) => p.city)));
  buildFacet(block.querySelector('[data-key=language]'), 'language', uniq(providers.flatMap(splitLangs)));
  block.querySelector('.ps-q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  block.querySelector('.ps-accepting').addEventListener('change', (e) => { state.accepting = e.target.checked; render(); });
  block.querySelector('.ps-sort select').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  block.querySelectorAll('input[name=ps-gender]').forEach((r) => r.addEventListener('change', (e) => { state.gender = e.target.value; render(); }));
  block.querySelector('.ps-clear').addEventListener('click', clearAll);
  render();
}
