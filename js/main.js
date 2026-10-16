import { FACETS, prepareCatalog, query } from './catalog.js';
import { createFavorites, preferences } from './store.js';
import { readUrlState, writeUrlState, appUrl } from './url-state.js';
import { buildFacets, updateFacets, renderChips, createCard, setFavoriteButton, fillDialog } from './render.js';
import { debounce, plural } from './utils.js';
import { loadCatalogData } from './data-source.js';
import { setupShell, showToast } from './shell.js';
import { getClient, hasStoredSession, friendlyError } from './auth.js';

const PAGE_SIZE = 24;

const $ = (selector) => document.querySelector(selector);

const els = {
  search: $('#q'),
  searchForm: $('#search-form'),
  heroStats: $('#hero-stats'),
  filters: $('#filters'),
  openFilters: $('#open-filters'),
  closeFilters: $('#close-filters'),
  applyFilters: $('#apply-filters'),
  clearFilters: $('#clear-filters'),
  filtersCount: $('#filters-count'),
  backdrop: $('#drawer-backdrop'),
  results: $('#resultats'),
  resultCount: $('#result-count'),
  sort: $('#sort'),
  viewButtons: document.querySelectorAll('[data-view]:is(button)'),
  chips: $('#active-filters'),
  list: $('#app-list'),
  empty: $('#empty-state'),
  emptyTitle: $('#empty-title'),
  emptyText: $('#empty-text'),
  emptyReset: $('#empty-reset'),
  loadMoreWrap: $('#load-more-wrap'),
  loadMore: $('#load-more'),
  favToggle: $('#fav-toggle'),
  favCount: $('#fav-count'),
  cardTemplate: $('#tpl-card'),
  skeletonTemplate: $('#tpl-skeleton'),
  dialog: {
    dialog: $('#app-dialog'),
    cover: $('#dialog-cover'),
    close: $('#dialog-close'),
    ambit: $('#dialog-ambit'),
    title: $('#dialog-title'),
    author: $('#dialog-author'),
    desc: $('#dialog-desc'),
    meta: $('#dialog-meta'),
    tags: $('#dialog-tags'),
    open: $('#dialog-open'),
    code: $('#dialog-code'),
    share: $('#dialog-share'),
    fav: $('#dialog-fav'),
  },
};

const favorites = createFavorites();
const cards = new Map();
let catalog;
let state;
let visible = PAGE_SIZE;
let facetInputs;

/* Arrencada ------------------------------------------------------------------ */

init();

async function init() {
  setupShell();
  applyView(preferences.view);
  showSkeletons();

  try {
    catalog = prepareCatalog(await loadCatalogData());
  } catch (error) {
    console.error('No s\'ha pogut carregar el catàleg:', error);
    showLoadError();
    return;
  }

  favorites.prune(new Set(catalog.apps.map((app) => app.id)));
  state = readUrlState(catalog);
  els.search.value = state.q;
  els.sort.value = state.ordre;

  facetInputs = buildFacets(els.filters, catalog, onFacetChange);
  renderHeroStats();
  bindEvents();
  update({ resetPage: true, syncUrl: false });

  if (state.app) openApp(state.app, { focusReturn: null });
}

/* Renderitzat ----------------------------------------------------------------- */

function update({ resetPage = false, syncUrl = true } = {}) {
  if (resetPage) visible = PAGE_SIZE;
  const { results, counts } = query(catalog, state, favorites);

  updateFacets(facetInputs, state, counts);
  renderChips(els.chips, catalog, state, removeFilter);
  renderList(results);
  renderCount(results.length);
  renderEmpty(results.length);
  renderFavoritesNav();
  renderFiltersBadge();

  els.applyFilters.textContent = results.length
    ? `Mostra ${results.length} ${plural(results.length, 'resultat', 'resultats')}`
    : 'Cap resultat';

  if (syncUrl) writeUrlState(state);
}

function renderList(results) {
  const shown = results.slice(0, visible);
  const current = [...els.list.children].map((node) => node.dataset.id);
  const unchanged = current.length === shown.length && shown.every((app, i) => app.id === current[i]);
  // Si l'ordre no canvia no toquem el DOM: així no es perd el focus del teclat.
  if (!unchanged) els.list.replaceChildren(buildCards(shown));
  els.list.setAttribute('aria-busy', 'false');
  els.loadMoreWrap.hidden = results.length <= visible;
  if (results.length > visible) {
    const remaining = results.length - visible;
    els.loadMore.textContent = `Mostra'n més (${remaining} ${plural(remaining, 'restant', 'restants')})`;
  }
}

function buildCards(apps) {
  const fragment = document.createDocumentFragment();
  for (const app of apps) {
    let card = cards.get(app.id);
    if (!card) {
      card = createCard(els.cardTemplate, catalog, app, {
        onOpen: (id) => openApp(id),
        onToggleFavorite: toggleFavorite,
      });
      setFavoriteButton(card.querySelector('.fav-btn'), favorites.has(app.id), app.titol);
      cards.set(app.id, card);
    }
    fragment.append(card);
  }
  return fragment;
}

function renderCount(n) {
  const strong = document.createElement('strong');
  strong.textContent = String(n);
  const noun = plural(n, 'aplicació', 'aplicacions');
  const suffix = hasActiveFilters() ? ` ${plural(n, 'trobada', 'trobades')}` : '';
  els.resultCount.replaceChildren(strong, ` ${noun}${suffix}`);
}

function renderEmpty(n) {
  els.empty.hidden = n > 0;
  if (n > 0) return;
  const noFavorites = state.favorits && favorites.size === 0;
  els.emptyTitle.textContent = noFavorites ? 'Encara no tens favorits' : 'Cap coincidència';
  els.emptyText.textContent = noFavorites
    ? 'Marca el cor de qualsevol aplicació per desar-la aquí. Els favorits es guarden en aquest navegador.'
    : 'Prova amb altres paraules o treu algun dels filtres actius.';
  els.emptyReset.textContent = noFavorites ? 'Explora tot el catàleg' : 'Esborra la cerca i els filtres';
}

function renderFavoritesNav() {
  els.favCount.textContent = String(favorites.size);
  els.favToggle.setAttribute('aria-pressed', String(state.favorits));
  els.favToggle.setAttribute(
    'aria-label',
    `Favorits, ${favorites.size} ${plural(favorites.size, 'desat', 'desats')}${state.favorits ? ', filtre actiu' : ''}`,
  );
}

function renderFiltersBadge() {
  const n = FACETS.reduce((sum, facet) => sum + state[facet].size, 0);
  els.filtersCount.hidden = n === 0;
  els.filtersCount.textContent = String(n);
  els.clearFilters.hidden = !hasActiveFilters();
}

function renderHeroStats() {
  const apps = catalog.apps.length;
  const ambits = catalog.taxonomies.ambit.length;
  els.heroStats.textContent = `${apps} ${plural(apps, 'aplicació', 'aplicacions')} · ${ambits} àmbits · Contribucions obertes`;
}

function showSkeletons() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 6; i++) fragment.append(els.skeletonTemplate.content.cloneNode(true));
  els.list.replaceChildren(fragment);
}

function showLoadError() {
  els.list.replaceChildren();
  els.list.setAttribute('aria-busy', 'false');
  els.empty.hidden = false;
  els.emptyTitle.textContent = 'No s\'ha pogut carregar el catàleg';
  els.emptyText.textContent = 'Comprova la connexió i torna-ho a provar. Si obres el fitxer directament des del disc, cal servir-lo amb un servidor local.';
  els.emptyReset.textContent = 'Torna-ho a provar';
  els.emptyReset.addEventListener('click', () => window.location.reload(), { once: true });
}

/* Estat ----------------------------------------------------------------------- */

function hasActiveFilters() {
  return Boolean(state.q.trim()) || state.favorits || FACETS.some((facet) => state[facet].size > 0);
}

function onFacetChange(facet, id, checked) {
  if (checked) state[facet].add(id);
  else state[facet].delete(id);
  update({ resetPage: true });
}

function removeFilter(key, id) {
  if (key === 'q') {
    state.q = '';
    els.search.value = '';
  } else if (key === 'favorits') {
    state.favorits = false;
  } else {
    state[key].delete(id);
  }
  update({ resetPage: true });
}

function resetAll() {
  state.q = '';
  els.search.value = '';
  state.favorits = false;
  FACETS.forEach((facet) => state[facet].clear());
  update({ resetPage: true });
}

function toggleFavorite(id, button) {
  const active = favorites.toggle(id);
  button.classList.remove('is-popping');
  void button.offsetWidth; // reinicia l'animació
  button.classList.add('is-popping');
  showToast(active ? 'Afegida a favorits' : 'Treta de favorits');
}

favorites.subscribe((changedId) => {
  if (!catalog || !state) return;
  const ids = changedId ? [changedId] : [...cards.keys()];
  for (const id of ids) {
    const card = cards.get(id);
    const app = catalog.apps.find((a) => a.id === id);
    if (card && app) setFavoriteButton(card.querySelector('.fav-btn'), favorites.has(id), app.titol);
  }
  if (state.app) {
    const app = catalog.apps.find((a) => a.id === state.app);
    if (app) setFavoriteButton(els.dialog.fav, favorites.has(app.id), app.titol);
  }
  // En la vista de favorits la llista canvia; fora d'ella només s'actualitzen comptadors.
  update({ syncUrl: false });
});

/* Fitxa de detall --------------------------------------------------------------- */

let returnFocus = null;

function openApp(id, { focusReturn = document.activeElement } = {}) {
  const app = catalog.apps.find((a) => a.id === id);
  if (!app) {
    state.app = null;
    writeUrlState(state);
    return;
  }
  returnFocus = focusReturn;
  state.app = id;
  fillDialog(els.dialog, catalog, app);
  resetReport(app);
  setFavoriteButton(els.dialog.fav, favorites.has(id), app.titol);
  document.title = `${app.titol} · EducApps`;
  if (!els.dialog.dialog.open) els.dialog.dialog.showModal();
  writeUrlState(state);
}

/* Informes de problemes ------------------------------------------------------------ */

const report = {
  toggle: $('#report-toggle'),
  panel: $('#report-panel'),
  login: $('#report-login'),
  form: $('#report-form'),
  comment: $('#report-comment'),
  error: $('#report-error'),
  submit: $('#report-submit'),
};

function resetReport(app) {
  report.toggle.hidden = !app.uuid; // la còpia local no té identificador de base de dades
  report.toggle.setAttribute('aria-expanded', 'false');
  report.panel.hidden = true;
  report.form.reset();
  report.error.textContent = '';
}

function toggleReport() {
  const open = report.panel.hidden;
  report.panel.hidden = !open;
  report.toggle.setAttribute('aria-expanded', String(open));
  if (!open) return;
  const signedIn = hasStoredSession();
  report.login.hidden = signedIn;
  report.form.hidden = !signedIn;
  if (signedIn) report.form.querySelector('input[name="motiu"]').focus();
}

async function sendReport(event) {
  event.preventDefault();
  const app = catalog.apps.find((a) => a.id === state.app);
  const motiu = report.form.querySelector('input[name="motiu"]:checked')?.value;
  if (!app?.uuid) return;
  if (!motiu) {
    report.error.textContent = 'Tria quin problema hi ha.';
    return;
  }
  report.error.textContent = '';
  report.submit.disabled = true;
  try {
    const client = await getClient();
    const { error } = await client.from('informes').insert({
      app_id: app.uuid,
      motiu,
      comentari: report.comment.value.trim() || null,
    });
    if (error) {
      report.error.textContent =
        error.code === '23505' ? "Ja n'havies informat. Ho estem revisant." : friendlyError(error);
      return;
    }
    resetReport(app);
    report.toggle.focus();
    showToast("Gràcies per avisar. Ho revisarem aviat.");
  } catch (error) {
    report.error.textContent = friendlyError(error);
  } finally {
    report.submit.disabled = false;
  }
}

function onDialogClose() {
  state.app = null;
  document.title = 'EducApps · Aplicacions educatives de la comunitat docent';
  writeUrlState(state);
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  returnFocus = null;
}

async function shareCurrentApp() {
  const url = appUrl(state.app);
  try {
    await navigator.clipboard.writeText(url);
    showToast('Enllaç copiat al porta-retalls');
  } catch {
    showToast('No s\'ha pogut copiar l\'enllaç');
  }
}

/* Calaix de filtres (mòbil) ------------------------------------------------------ */

const drawerQuery = window.matchMedia('(max-width: 960px)');
let drawerReturnFocus = null;

function openDrawer() {
  drawerReturnFocus = document.activeElement;
  els.backdrop.hidden = false;
  requestAnimationFrame(() => els.backdrop.classList.add('is-visible'));
  els.filters.classList.add('is-open');
  els.filters.setAttribute('role', 'dialog');
  els.filters.setAttribute('aria-modal', 'true');
  els.openFilters.setAttribute('aria-expanded', 'true');
  document.body.style.setProperty('overflow', 'hidden');
  els.closeFilters.focus();
}

function closeDrawer() {
  if (!els.filters.classList.contains('is-open')) return;
  els.filters.classList.remove('is-open');
  els.filters.removeAttribute('role');
  els.filters.removeAttribute('aria-modal');
  els.backdrop.classList.remove('is-visible');
  els.openFilters.setAttribute('aria-expanded', 'false');
  document.body.style.removeProperty('overflow');
  setTimeout(() => { els.backdrop.hidden = true; }, 300);
  drawerReturnFocus?.focus();
}

function trapFocus(event) {
  if (event.key !== 'Tab' || !els.filters.classList.contains('is-open')) return;
  const focusable = [...els.filters.querySelectorAll('button:not([hidden]), input')].filter((el) => el.offsetParent !== null);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* Vista ------------------------------------------------------------------------------ */

function applyView(view) {
  els.list.dataset.view = view;
  els.viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
}

/* Interacció ------------------------------------------------------------------------ */

function bindEvents() {
  const onSearch = debounce(() => {
    state.q = els.search.value;
    update({ resetPage: true });
  }, 160);
  els.search.addEventListener('input', onSearch);
  els.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.q = els.search.value;
    update({ resetPage: true });
    els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  els.sort.addEventListener('change', () => {
    state.ordre = els.sort.value;
    update({ resetPage: true });
  });

  els.viewButtons.forEach((button) =>
    button.addEventListener('click', () => {
      preferences.view = button.dataset.view;
      applyView(button.dataset.view);
    }),
  );

  els.favToggle.addEventListener('click', () => {
    state.favorits = !state.favorits;
    update({ resetPage: true });
    if (window.scrollY < els.results.offsetTop - 200) {
      els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  els.clearFilters.addEventListener('click', resetAll);
  els.emptyReset.addEventListener('click', resetAll);
  els.loadMore.addEventListener('click', () => {
    const firstNew = visible;
    visible += PAGE_SIZE;
    update();
    els.list.children[firstNew]?.querySelector('.card-link')?.focus();
  });

  // Calaix de filtres
  els.openFilters.addEventListener('click', openDrawer);
  els.closeFilters.addEventListener('click', closeDrawer);
  els.applyFilters.addEventListener('click', closeDrawer);
  els.backdrop.addEventListener('click', closeDrawer);
  els.filters.addEventListener('keydown', trapFocus);
  drawerQuery.addEventListener('change', (event) => { if (!event.matches) closeDrawer(); });

  // Diàleg
  const { dialog, close, share, fav } = els.dialog;
  report.toggle.addEventListener('click', toggleReport);
  report.form.addEventListener('submit', sendReport);
  $('#report-cancel').addEventListener('click', () => {
    toggleReport();
    report.toggle.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', onDialogClose);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  share.addEventListener('click', shareCurrentApp);
  fav.addEventListener('click', () => toggleFavorite(state.app, fav));

  // Dreceres de teclat
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.filters.classList.contains('is-open')) {
      closeDrawer();
      return;
    }
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !dialog.open) {
      event.preventDefault();
      els.search.focus();
      els.search.select();
    }
  });

  // Navegació enrere/endavant
  window.addEventListener('popstate', () => {
    const next = readUrlState(catalog);
    Object.assign(state, next);
    els.search.value = state.q;
    els.sort.value = state.ordre;
    update({ resetPage: true, syncUrl: false });
    if (state.app) openApp(state.app);
    else if (dialog.open) dialog.close();
  });
}
