import { SUPABASE_URL, SUPABASE_KEY, FALLBACK_URL, coverUrl } from './config.js';

const TIMEOUT_MS = 6000;

async function getJson(url, { headers = {}, signal } = {}) {
  const response = await fetch(url, { headers, signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

/** Converteix una fila de la vista `apps_publicades` al format intern (el de data/apps.json). */
function fromRow(row) {
  return {
    id: row.slug,
    uuid: row.id,
    titol: row.titol,
    descripcio: row.descripcio,
    detall: row.detall ?? undefined,
    url: row.url,
    codi: row.codi ?? undefined,
    autor: { nom: row.autor_nom, url: row.autor_url ?? undefined },
    ambit: row.ambit,
    nivells: row.nivells ?? [],
    idiomes: row.idiomes ?? [],
    etiquetes: row.etiquetes ?? [],
    imatge: coverUrl(row.imatge),
    afegit: (row.publicada_at ?? '').slice(0, 10),
  };
}

async function fromSupabase() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const options = { headers: { apikey: SUPABASE_KEY }, signal: controller.signal };
  const rest = (path) => getJson(`${SUPABASE_URL}/rest/v1/${path}`, options);

  try {
    const [ambits, nivells, idiomes, apps] = await Promise.all([
      rest('ambits?select=id,nom&order=ordre'),
      rest('nivells?select=id,nom&order=ordre'),
      rest('idiomes?select=id,nom&order=ordre'),
      rest('apps_publicades?select=*&order=publicada_at.desc'),
    ]);
    return { ambits, nivells, idiomes, apps: apps.map(fromRow) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Carrega el catàleg de Supabase i, si falla (sense connexió, projecte en pausa
 * o encara no configurat), de la còpia local.
 */
export async function loadCatalogData() {
  try {
    const data = await fromSupabase();
    document.documentElement.dataset.source = 'supabase';
    return data;
  } catch (error) {
    console.warn('Supabase no disponible; es fa servir la còpia local.', error);
    document.documentElement.dataset.source = 'local';
    return getJson(FALLBACK_URL);
  }
}
