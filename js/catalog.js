import { normalize } from './utils.js';

export const FACETS = ['ambit', 'nivell', 'idioma'];
export const SORTS = ['rellevancia', 'recents', 'alfabetic'];

const collator = new Intl.Collator('ca', { sensitivity: 'base' });

/** Prepara les dades en brut del JSON per filtrar i cercar ràpidament. */
export function prepareCatalog(data) {
  const taxonomies = {
    ambit: data.ambits ?? [],
    nivell: data.nivells ?? [],
    idioma: data.idiomes ?? [],
  };
  const lookup = Object.fromEntries(
    FACETS.map((facet) => [facet, new Map(taxonomies[facet].map((item) => [item.id, item]))]),
  );

  const apps = (data.apps ?? []).map((app) => {
    const facets = {
      ambit: [app.ambit],
      nivell: app.nivells ?? [],
      idioma: app.idiomes ?? [],
    };
    const text = [
      app.descripcio,
      app.detall,
      app.autor?.nom,
      lookup.ambit.get(app.ambit)?.nom,
      ...(app.etiquetes ?? []),
    ].join(' ');
    return {
      ...app,
      facets,
      index: { titol: normalize(app.titol), text: normalize(text) },
    };
  });

  return { apps, taxonomies, lookup };
}

export function label(catalog, facet, id) {
  return catalog.lookup[facet].get(id)?.nom ?? id;
}

function terms(query) {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** Puntua una aplicació: 0 si no coincideix amb tots els termes. */
function score(app, queryTerms) {
  if (!queryTerms.length) return 1;
  let total = 0;
  for (const term of queryTerms) {
    const { titol, text } = app.index;
    if (titol.startsWith(term)) total += 8;
    else if (titol.includes(` ${term}`)) total += 6;
    else if (titol.includes(term)) total += 4;
    else if (text.includes(term)) total += 1;
    else return 0;
  }
  return total;
}

function matchesFacets(app, state, skip) {
  for (const facet of FACETS) {
    if (facet === skip) continue;
    const selected = state[facet];
    if (selected.size && !app.facets[facet].some((value) => selected.has(value))) return false;
  }
  return true;
}

const byDate = (a, b) => (b.app.afegit ?? '').localeCompare(a.app.afegit ?? '');
const byTitle = (a, b) => collator.compare(a.app.titol, b.app.titol);

/**
 * Aplica cerca, favorits i filtres. Dins d'una faceta els valors es combinen amb O,
 * entre facetes amb I. Els recomptes de cada faceta ignoren la seva pròpia selecció.
 */
export function query(catalog, state, favorites) {
  const queryTerms = terms(state.q);
  const candidates = [];

  for (const app of catalog.apps) {
    if (state.favorits && !favorites.has(app.id)) continue;
    const s = score(app, queryTerms);
    if (s > 0) candidates.push({ app, score: s });
  }

  const counts = {};
  for (const facet of FACETS) {
    const map = new Map();
    for (const item of candidates) {
      if (!matchesFacets(item.app, state, facet)) continue;
      for (const value of item.app.facets[facet]) map.set(value, (map.get(value) ?? 0) + 1);
    }
    counts[facet] = map;
  }

  const results = candidates.filter((item) => matchesFacets(item.app, state, null));

  if (state.ordre === 'alfabetic') {
    results.sort(byTitle);
  } else if (state.ordre === 'recents' || !queryTerms.length) {
    results.sort((a, b) => byDate(a, b) || byTitle(a, b));
  } else {
    results.sort((a, b) => b.score - a.score || byDate(a, b) || byTitle(a, b));
  }

  return { results: results.map((item) => item.app), counts, total: catalog.apps.length };
}
