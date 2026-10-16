import { FACETS, SORTS } from './catalog.js';

/** Llegeix l'estat de la URL perquè qualsevol cerca o fitxa es pugui compartir. */
export function readUrlState(catalog) {
  const params = new URLSearchParams(window.location.search);
  const state = {
    q: params.get('q') ?? '',
    favorits: params.get('favorits') === '1',
    ordre: SORTS.includes(params.get('ordre')) ? params.get('ordre') : 'rellevancia',
    app: params.get('app'),
  };
  for (const facet of FACETS) {
    const values = (params.get(facet) ?? '').split(',').filter((v) => catalog.lookup[facet].has(v));
    state[facet] = new Set(values);
  }
  return state;
}

export function writeUrlState(state) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  for (const facet of FACETS) {
    if (state[facet].size) params.set(facet, [...state[facet]].join(','));
  }
  if (state.favorits) params.set('favorits', '1');
  if (state.ordre !== 'rellevancia') params.set('ordre', state.ordre);
  if (state.app) params.set('app', state.app);

  const search = params.toString().replace(/%2C/g, ',');
  const url = `${window.location.pathname}${search ? `?${search}` : ''}`;
  if (url !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, '', url);
  }
}

export function appUrl(id) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('app', id);
  return url.href;
}
