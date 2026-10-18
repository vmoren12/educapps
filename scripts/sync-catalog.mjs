#!/usr/bin/env node
// Actualitza la còpia local data/apps.json amb el catàleg publicat a Supabase.
// Ús: node scripts/sync-catalog.mjs
// La fa servir el flux .github/workflows/sync.yml cada dia: així la còpia de reserva queda al dia
// i el projecte de Supabase té activitat (el pla gratuït es posa en pausa després d'una setmana sense).
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../data/apps.json', import.meta.url);
const CONFIG = new URL('../js/config.js', import.meta.url);

// La URL i la clau pública es llegeixen de js/config.js, perquè siguin les mateixes que fa servir la web.
const config = await readFile(CONFIG, 'utf8');
const constant = (name) => config.match(new RegExp(`export const ${name} = '([^']+)'`))?.[1];
const SUPABASE_URL = process.env.SUPABASE_URL || constant('SUPABASE_URL');
const SUPABASE_KEY = process.env.SUPABASE_KEY || constant('SUPABASE_KEY');
const COVERS_BUCKET = constant('COVERS_BUCKET');
if (!SUPABASE_URL || !SUPABASE_KEY || !COVERS_BUCKET) {
  console.error('No s\'ha trobat la configuració de Supabase a js/config.js.');
  process.exit(1);
}

async function rest(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} a ${path}`);
  return response.json();
}

const coverUrl = (path) => (path ? `${SUPABASE_URL}/storage/v1/object/public/${COVERS_BUCKET}/${path}` : undefined);

/** Mateix format que data/apps.json (vegeu fromRow a js/data-source.js, sense l'identificador intern). */
function fromRow(row) {
  return {
    id: row.slug,
    titol: row.titol,
    descripcio: row.descripcio,
    detall: row.detall ?? undefined,
    url: row.url,
    codi: row.codi ?? undefined,
    autor: { nom: row.autor_nom, url: row.autor_url ?? undefined },
    ambit: row.ambit,
    ambits: row.ambits ?? [row.ambit],
    nivells: row.nivells ?? [],
    idiomes: row.idiomes ?? [],
    etiquetes: row.etiquetes ?? [],
    imatge: coverUrl(row.imatge),
    afegit: (row.publicada_at ?? '').slice(0, 10),
  };
}

/* Format del fitxer: una línia per camp, i llistes i objectes petits en una sola línia. */

const inline = (value) => {
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`;
  if (value && typeof value === 'object') {
    const fields = Object.entries(value).filter(([, v]) => v !== undefined);
    return `{ ${fields.map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
};

const block = (value, indent) => {
  const pad = ' '.repeat(indent);
  const fields = Object.entries(value).filter(([, v]) => v !== undefined);
  return `${pad}{\n${fields.map(([k, v]) => `${pad}  ${JSON.stringify(k)}: ${inline(v)}`).join(',\n')}\n${pad}}`;
};

function format(data) {
  const section = (key, items, render) => `  ${JSON.stringify(key)}: [\n${items.map(render).join(',\n')}\n  ]`;
  return `{\n${[
    section('ambits', data.ambits, (item) => `    ${inline(item)}`),
    section('nivells', data.nivells, (item) => `    ${inline(item)}`),
    section('idiomes', data.idiomes, (item) => `    ${inline(item)}`),
    section('apps', data.apps, (app) => block(app, 4)),
  ].join(',\n')}\n}\n`;
}

/* Execució ------------------------------------------------------------------------ */

let data;
try {
  const [ambits, nivells, idiomes, rows] = await Promise.all([
    rest('ambits?select=id,nom&order=ordre'),
    rest('nivells?select=id,nom&order=ordre'),
    rest('idiomes?select=id,nom&order=ordre'),
    rest('apps_publicades?select=*&order=publicada_at.asc,slug.asc'),
  ]);
  data = { ambits, nivells, idiomes, apps: rows.map(fromRow) };
} catch (error) {
  console.error(`No s'ha pogut llegir el catàleg de Supabase: ${error.message}`);
  process.exit(1);
}

// Una resposta buida no ha de deixar la web sense còpia de reserva.
if (!data.apps.length || !data.ambits.length || !data.nivells.length || !data.idiomes.length) {
  console.error('Supabase ha retornat un catàleg buit; no es modifica data/apps.json.');
  process.exit(1);
}

const before = await readFile(FILE, 'utf8').catch(() => '');
const after = format(data);
if (before === after) {
  console.log(`Sense canvis: ${data.apps.length} aplicacions.`);
} else {
  await writeFile(FILE, after);
  console.log(`data/apps.json actualitzat: ${data.apps.length} aplicacions.`);
}
