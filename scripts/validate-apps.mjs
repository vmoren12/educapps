#!/usr/bin/env node
// Valida data/apps.json. Ús: node scripts/validate-apps.mjs
import { readFile } from 'node:fs/promises';

const FILE = new URL('../data/apps.json', import.meta.url);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DESCRIPTION = 160;

const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

let data;
try {
  data = JSON.parse(await readFile(FILE, 'utf8'));
} catch (error) {
  console.error(`No s'ha pogut llegir o analitzar data/apps.json: ${error.message}`);
  process.exit(1);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function checkTaxonomy(key) {
  const list = data[key];
  if (!Array.isArray(list) || list.length === 0) {
    fail(key, 'ha de ser una llista no buida');
    return new Set();
  }
  const ids = new Set();
  list.forEach((item, i) => {
    if (!item?.id || !ID_PATTERN.test(item.id)) fail(`${key}[${i}]`, 'id invàlid');
    if (!item?.nom) fail(`${key}[${i}]`, 'falta el nom');
    if (ids.has(item.id)) fail(`${key}[${i}]`, `id duplicat «${item.id}»`);
    ids.add(item.id);
  });
  return ids;
}

const ambits = checkTaxonomy('ambits');
const nivells = checkTaxonomy('nivells');
const idiomes = checkTaxonomy('idiomes');

if (!Array.isArray(data.apps)) {
  fail('apps', 'ha de ser una llista');
} else {
  const ids = new Set();
  const urls = new Set();

  data.apps.forEach((app, i) => {
    const where = `apps[${i}]${app?.id ? ` (${app.id})` : ''}`;

    if (!app.id || !ID_PATTERN.test(app.id)) fail(where, 'id obligatori en format slug (minúscules i guions)');
    else if (ids.has(app.id)) fail(where, 'id duplicat');
    ids.add(app.id);

    for (const field of ['titol', 'descripcio']) {
      if (typeof app[field] !== 'string' || !app[field].trim()) fail(where, `falta «${field}»`);
    }
    if (app.descripcio?.length > MAX_DESCRIPTION) {
      fail(where, `«descripcio» supera ${MAX_DESCRIPTION} caràcters (${app.descripcio.length}); fes servir «detall» per al text llarg`);
    }
    if (app.detall !== undefined && typeof app.detall !== 'string') fail(where, '«detall» ha de ser text');

    if (!isHttpUrl(app.url)) fail(where, '«url» ha de ser una adreça http(s) vàlida');
    else if (urls.has(app.url)) fail(where, `URL duplicada ${app.url}`);
    urls.add(app.url);
    if (app.codi !== undefined && !isHttpUrl(app.codi)) fail(where, '«codi» ha de ser una adreça http(s) vàlida');
    if (app.imatge !== undefined && !String(app.imatge).startsWith('https://')) fail(where, '«imatge» ha de ser una adreça https');

    if (!app.autor?.nom) fail(where, 'falta «autor.nom»');
    if (app.autor?.url !== undefined && !isHttpUrl(app.autor.url)) fail(where, '«autor.url» no és vàlida');

    if (!ambits.has(app.ambit)) fail(where, `àmbit desconegut «${app.ambit}»`);

    const checkList = (field, allowed) => {
      if (!Array.isArray(app[field]) || app[field].length === 0) {
        fail(where, `«${field}» ha de ser una llista no buida`);
        return;
      }
      for (const value of app[field]) if (!allowed.has(value)) fail(where, `valor desconegut a «${field}»: «${value}»`);
    };
    checkList('nivells', nivells);
    checkList('idiomes', idiomes);

    if (app.etiquetes !== undefined && (!Array.isArray(app.etiquetes) || app.etiquetes.some((t) => typeof t !== 'string' || !t.trim()))) {
      fail(where, '«etiquetes» ha de ser una llista de textos');
    }

    if (!DATE_PATTERN.test(app.afegit ?? '') || Number.isNaN(Date.parse(app.afegit))) {
      fail(where, '«afegit» ha de tenir el format AAAA-MM-DD');
    }
  });
}

if (errors.length) {
  console.error(`S'han trobat ${errors.length} errors a data/apps.json:\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`data/apps.json és vàlid: ${data.apps.length} aplicacions.`);
