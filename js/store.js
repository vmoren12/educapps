import { storage } from './utils.js';

const FAVORITES_KEY = 'educapps:favorits';
const accountKey = (userId) => `${FAVORITES_KEY}:${userId}`;

/**
 * Favorits. Sense sessió es desen al navegador; amb sessió, al compte (taula «favorits»),
 * amb una còpia al navegador per mostrar-los a l'instant. Sincronitzats entre pestanyes.
 */
export function createFavorites({ onSyncError } = {}) {
  let key = FAVORITES_KEY;
  let ids = new Set(storage.get(key, []));
  let validIds = null;
  let remote = null; // { client, userId } quan els favorits són al compte
  const queued = new Map(); // canvis fets abans de confirmar la sessió: id → afegit (cert) o tret (fals)
  const listeners = new Set();
  const emit = (changedId) => listeners.forEach((fn) => fn(changedId));
  const save = () => storage.set(key, [...ids]);
  const keepValid = (list) => (validIds ? list.filter((id) => validIds.has(id)) : list);

  window.addEventListener('storage', (event) => {
    if (event.key !== key) return;
    ids = new Set(keepValid(storage.get(key, [])));
    emit(null);
  });

  async function writeRemote(id, active) {
    const { client, userId } = remote;
    const { error } = active
      ? await client.from('favorits').upsert({ usuari: userId, app_slug: id }, { onConflict: 'usuari,app_slug', ignoreDuplicates: true })
      : await client.from('favorits').delete().eq('usuari', userId).eq('app_slug', id);
    if (!error) return;
    console.error('No s\'ha pogut desar el favorit:', error);
    // Desfà el canvi perquè la interfície reflecteixi el que hi ha al compte.
    if (active) ids.delete(id);
    else ids.add(id);
    save();
    emit(id);
    onSyncError?.();
  }

  return {
    has: (id) => ids.has(id),
    get size() {
      return ids.size;
    },
    /** Cert si els favorits es desen al compte. */
    get synced() {
      return remote !== null;
    },
    toggle(id) {
      const active = !ids.has(id);
      if (active) ids.add(id);
      else ids.delete(id);
      save();
      emit(id);
      if (remote) writeRemote(id, active);
      else if (key !== FAVORITES_KEY) queued.set(id, active);
      return active;
    },
    /** Descarta identificadors que ja no existeixen al catàleg (només a la vista; el compte no es toca). */
    prune(valid) {
      validIds = valid;
      const before = ids.size;
      ids = new Set(keepValid([...ids]));
      if (ids.size !== before && !remote) save();
    },
    /**
     * Passa a desar els favorits al compte. Els que hi havia al navegador sense sessió s'hi afegeixen
     * i deixen de ser al navegador. Si la taula no existeix o falla la connexió, continua en local.
     */
    async connect(client, userId) {
      const { data, error } = await client.from('favorits').select('app_slug');
      if (error) {
        console.error('No s\'han pogut carregar els favorits del compte:', error);
        this.useLocal();
        return false;
      }
      const remoteIds = new Set(data.map((row) => row.app_slug));
      const options = { onConflict: 'usuari,app_slug', ignoreDuplicates: true };

      // Favorits del navegador sense sessió i canvis fets mentre es confirmava la sessió.
      const changes = new Map(keepValid(storage.get(FAVORITES_KEY, [])).map((id) => [id, true]));
      queued.forEach((active, id) => changes.set(id, active));
      queued.clear();
      const toAdd = [...changes].filter(([id, active]) => active && !remoteIds.has(id)).map(([id]) => id);
      const toRemove = [...changes].filter(([id, active]) => !active && remoteIds.has(id)).map(([id]) => id);

      if (toAdd.length) {
        const rows = toAdd.map((id) => ({ usuari: userId, app_slug: id }));
        const { error: batchError } = await client.from('favorits').upsert(rows, options);
        // Si alguna aplicació ja no és publicada, el lot falla: es desen una per una.
        const saved = batchError
          ? (await Promise.all(rows.map((row) => client.from('favorits').upsert(row, options))))
              .map((result, i) => (result.error ? null : toAdd[i]))
              .filter(Boolean)
          : toAdd;
        saved.forEach((id) => remoteIds.add(id));
      }
      if (toRemove.length) {
        const { error: removeError } = await client.from('favorits').delete().eq('usuari', userId).in('app_slug', toRemove);
        if (!removeError) toRemove.forEach((id) => remoteIds.delete(id));
      }

      storage.set(FAVORITES_KEY, []);
      remote = { client, userId };
      key = accountKey(userId);
      ids = new Set(keepValid([...remoteIds]));
      save();
      emit(null);
      return true;
    },
    /** Torna als favorits del navegador (sense sessió vàlida o sense connexió amb el compte). */
    useLocal() {
      remote = null;
      key = FAVORITES_KEY;
      ids = new Set(keepValid(storage.get(key, [])));
      queued.clear();
      emit(null);
    },
    /** Mostra la còpia del compte desada al navegador mentre es confirma la sessió. */
    preload(userId) {
      const cached = storage.get(accountKey(userId), []);
      key = accountKey(userId);
      ids = new Set(keepValid([...cached, ...ids]));
      emit(null);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** Esborra del navegador la còpia dels favorits d'un compte (en sortir). */
export function forgetAccountFavorites(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(accountKey(userId));
  } catch {
    /* sense persistència */
  }
}

export const preferences = {
  get view() {
    return storage.get('educapps:vista', 'graella') === 'llista' ? 'llista' : 'graella';
  },
  set view(value) {
    storage.set('educapps:vista', value);
  },
};
