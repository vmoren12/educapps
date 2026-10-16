import { storage } from './utils.js';

const FAVORITES_KEY = 'educapps:favorits';

/** Favorits desats al navegador, sincronitzats entre pestanyes. */
export function createFavorites() {
  let ids = new Set(storage.get(FAVORITES_KEY, []));
  const listeners = new Set();
  const emit = (changedId) => listeners.forEach((fn) => fn(changedId));

  window.addEventListener('storage', (event) => {
    if (event.key !== FAVORITES_KEY) return;
    ids = new Set(storage.get(FAVORITES_KEY, []));
    emit(null);
  });

  return {
    has: (id) => ids.has(id),
    get size() {
      return ids.size;
    },
    toggle(id) {
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      storage.set(FAVORITES_KEY, [...ids]);
      emit(id);
      return ids.has(id);
    },
    /** Descarta identificadors que ja no existeixen al catàleg. */
    prune(validIds) {
      const before = ids.size;
      ids = new Set([...ids].filter((id) => validIds.has(id)));
      if (ids.size !== before) storage.set(FAVORITES_KEY, [...ids]);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const preferences = {
  get view() {
    return storage.get('educapps:vista', 'graella') === 'llista' ? 'llista' : 'graella';
  },
  set view(value) {
    storage.set('educapps:vista', value);
  },
};
