import { setupShell } from './shell.js';
import { getClient, friendlyError } from './auth.js';
import { prepareCatalog } from './catalog.js';
import { createCard } from './render.js';
import { debounce, slugify, isHttpsUrl, isHttpUrl } from './utils.js';

const $ = (id) => document.getElementById(id);
const editId = new URLSearchParams(window.location.search).get('id');

const LIMITS = { titol: [2, 80], descripcio: [20, 160], detall: [0, 2000], autor_nom: [2, 120] };
const FIELD_IDS = {
  url: 'f-url',
  titol: 'f-titol',
  descripcio: 'f-descripcio',
  detall: 'f-detall',
  ambit: 'f-ambit',
  nivells: 'f-nivells',
  idiomes: 'f-idiomes',
  etiquetes: 'f-etiquetes',
  autor_nom: 'f-autor-nom',
  autor_url: 'f-autor-url',
  codi: 'f-codi',
};

let client;
let taxonomies;
let fixedSlug = null;
let submittedOnce = false;
let dirty = false;

init();

async function init() {
  setupShell();
  try {
    client = await getClient();
  } catch (error) {
    console.error(error);
    return fail("No s'ha pogut connectar amb el servidor. Torna-ho a provar més tard.");
  }

  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    window.location.replace('compte.html?next=proposa');
    return;
  }

  const [tax, profile, existing] = await Promise.all([
    loadTaxonomies(),
    client.from('profiles').select('nom').eq('id', user.id).maybeSingle(),
    editId ? client.from('apps').select('*').eq('id', editId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!tax) return fail("No s'han pogut carregar les categories. Torna-ho a provar més tard.");
  if (editId && !existing.data) return fail("No s'ha trobat l'aplicació o no tens permís per editar-la.");
  taxonomies = tax;

  buildPills('f-ambit', 'ambit', 'radio', taxonomies.ambits);
  buildPills('f-nivells', 'nivells', 'checkbox', taxonomies.nivells);
  buildPills('f-idiomes', 'idiomes', 'checkbox', taxonomies.idiomes);

  if (existing.data) {
    fillForm(existing.data);
    setupEditMode(existing.data);
  } else if (profile.data?.nom) {
    $('f-autor-nom').value = profile.data.nom;
  }

  bindEvents();
  updateCounters();
  updatePreview();
  $('loading').hidden = true;
  $('editor').hidden = false;
}

function fail(message) {
  $('loading').textContent = message;
}

async function loadTaxonomies() {
  const fetchList = (table) => client.from(table).select('id, nom').order('ordre');
  const [ambits, nivells, idiomes] = await Promise.all(['ambits', 'nivells', 'idiomes'].map(fetchList));
  if (ambits.error || nivells.error || idiomes.error) return null;
  return { ambits: ambits.data, nivells: nivells.data, idiomes: idiomes.data };
}

/* Formulari ----------------------------------------------------------------------- */

function buildPills(containerId, name, type, items) {
  const container = $(containerId);
  for (const item of items) {
    const label = document.createElement('label');
    label.className = 'pill';
    if (name === 'ambit') label.dataset.ambit = item.id;
    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.value = item.id;
    const text = document.createElement('span');
    text.textContent = item.nom;
    label.append(input, text);
    container.append(label);
  }
}

function fillForm(app) {
  fixedSlug = app.slug;
  $('f-url').value = app.url ?? '';
  $('f-titol').value = app.titol ?? '';
  $('f-descripcio').value = app.descripcio ?? '';
  $('f-detall').value = app.detall ?? '';
  $('f-etiquetes').value = (app.etiquetes ?? []).join(', ');
  $('f-autor-nom').value = app.autor_nom ?? '';
  $('f-autor-url').value = app.autor_url ?? '';
  $('f-codi').value = app.codi ?? '';
  const check = (name, values) =>
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = values.includes(input.value);
    });
  check('ambit', [app.ambit]);
  check('nivells', app.nivells ?? []);
  check('idiomes', app.idiomes ?? []);
}

function setupEditMode(app) {
  document.title = `Edita ${app.titol} · EducApps`;
  $('page-title').textContent = "Edita l'aplicació";
  $('page-lead').textContent = `Estàs editant «${app.titol}».`;
  $('edit-notice').hidden = app.estat !== 'publicada';
  $('submit').textContent = 'Desa els canvis';
}

function parseTags(value) {
  const tags = value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

function readForm() {
  const value = (id) => $(id).value.trim();
  const checked = (name) => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
  return {
    url: value('f-url'),
    titol: value('f-titol'),
    descripcio: value('f-descripcio').replace(/\s+/g, ' '),
    detall: value('f-detall'),
    ambit: checked('ambit')[0] ?? '',
    nivells: checked('nivells'),
    idiomes: checked('idiomes'),
    etiquetes: parseTags($('f-etiquetes').value),
    autor_nom: value('f-autor-nom'),
    autor_url: value('f-autor-url'),
    codi: value('f-codi'),
  };
}

function lengthError(field, text, label) {
  const [min, max] = LIMITS[field];
  if (min && !text) return `Escriu ${label}.`;
  if (text.length < min) return `Ha de tenir com a mínim ${min} caràcters (ara en té ${text.length}).`;
  if (text.length > max) return `Ha de tenir com a màxim ${max} caràcters (ara en té ${text.length}).`;
  return '';
}

function validate(v) {
  const errors = {};
  if (!v.url) errors.url = "Escriu l'enllaç on es pot fer servir l'aplicació.";
  else if (/^http:\/\//i.test(v.url)) errors.url = "L'enllaç ha de començar per https:// (GitHub Pages i Netlify ja el fan servir).";
  else if (!isHttpsUrl(v.url)) errors.url = "Escriu l'adreça completa, per exemple https://usuari.github.io/app/";

  errors.titol = lengthError('titol', v.titol, "el nom de l'aplicació");
  errors.descripcio = lengthError('descripcio', v.descripcio, 'una descripció breu');
  errors.detall = lengthError('detall', v.detall, '');
  errors.autor_nom = lengthError('autor_nom', v.autor_nom, "el nom de l'autoria");

  if (!v.ambit) errors.ambit = 'Tria un àmbit.';
  if (!v.nivells.length) errors.nivells = 'Tria almenys un nivell.';
  if (!v.idiomes.length) errors.idiomes = 'Tria almenys un idioma.';

  if (v.etiquetes.length > 10) errors.etiquetes = `Pots posar com a màxim 10 etiquetes (ara n'hi ha ${v.etiquetes.length}).`;
  else if (v.etiquetes.some((tag) => tag.length > 30)) errors.etiquetes = 'Cada etiqueta pot tenir com a màxim 30 caràcters.';

  if (v.autor_url && !isHttpUrl(v.autor_url)) errors.autor_url = "Escriu l'adreça completa, començant per https://";
  if (v.codi && !isHttpsUrl(v.codi)) errors.codi = "L'enllaç al codi ha de començar per https://";

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

function showErrors(errors) {
  for (const [field, id] of Object.entries(FIELD_IDS)) {
    const message = errors[field] ?? '';
    $(`${id}-error`).textContent = message;
    $(id).setAttribute('aria-invalid', String(Boolean(message)));
  }
}

function focusFirstError(errors) {
  const field = Object.keys(FIELD_IDS).find((key) => errors[key]);
  if (!field) return;
  const element = $(FIELD_IDS[field]);
  const target = element.matches('input, textarea') ? element : element.querySelector('input');
  target?.focus();
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateCounters() {
  const desc = $('f-descripcio').value.trim().length;
  const descCounter = $('f-descripcio-count');
  descCounter.textContent = `${desc}/160`;
  descCounter.classList.toggle('is-over', desc > 160);
  const detall = $('f-detall').value.trim().length;
  $('f-detall-count').textContent = detall ? `${detall}/2000` : '';
}

/* Vista prèvia --------------------------------------------------------------------- */

function updatePreview() {
  const v = readForm();
  const app = {
    id: fixedSlug ?? slugify(v.titol || 'la-teva-app'),
    titol: v.titol || "Nom de l'aplicació",
    descripcio: v.descripcio || 'La descripció breu apareixerà aquí.',
    url: isHttpsUrl(v.url) ? v.url : '',
    autor: { nom: v.autor_nom || 'Autoria' },
    ambit: v.ambit,
    nivells: v.nivells,
    idiomes: v.idiomes,
    etiquetes: v.etiquetes,
  };
  const catalog = prepareCatalog({ ...taxonomies, apps: [app] });
  const card = createCard($('tpl-card'), catalog, catalog.apps[0], { onOpen() {}, onToggleFavorite() {} });
  card.querySelector('.card-link').tabIndex = -1;
  $('preview').replaceChildren(card);
}

/* Enviament --------------------------------------------------------------------------- */

async function submit(event) {
  event.preventDefault();
  submittedOnce = true;
  const values = readForm();
  const errors = validate(values);
  showErrors(errors);
  const formError = $('form-error');
  formError.hidden = true;

  if (Object.keys(errors).length) {
    focusFirstError(errors);
    return;
  }

  const payload = {
    ...values,
    detall: values.detall || null,
    autor_url: values.autor_url || null,
    codi: values.codi || null,
  };

  const button = $('submit');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  const request = editId
    ? client.from('apps').update(payload).eq('id', editId)
    : client.from('apps').insert(payload);
  const { error } = await request.select('slug').single();
  button.disabled = false;
  button.removeAttribute('aria-busy');

  if (error) {
    formError.textContent =
      error.code === 'PGRST116' ? "No s'ha trobat l'aplicació o no tens permís per editar-la." : friendlyError(error);
    formError.hidden = false;
    formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  dirty = false;
  if (editId) {
    $('sent-title').textContent = 'Canvis desats';
    $('sent-text').textContent = "L'aplicació torna a estar pendent de revisió. La pots seguir des de «Les meves aplicacions».";
  }
  $('editor').hidden = true;
  $('sent').hidden = false;
  $('sent').focus();
  window.scrollTo({ top: 0 });
}

function bindEvents() {
  const form = $('app-form');
  const refreshPreview = debounce(updatePreview, 120);

  form.addEventListener('input', () => {
    dirty = true;
    updateCounters();
    refreshPreview();
    if (submittedOnce) showErrors(validate(readForm()));
  });
  form.addEventListener('change', () => {
    refreshPreview();
    if (submittedOnce) showErrors(validate(readForm()));
  });
  form.addEventListener('submit', submit);

  // Valida cada camp en sortir-ne, només si s'hi ha escrit alguna cosa.
  form.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) || !target.value.trim()) return;
    const field = Object.keys(FIELD_IDS).find((key) => FIELD_IDS[key] === target.id);
    if (!field) return;
    const message = validate(readForm())[field] ?? '';
    $(`${target.id}-error`).textContent = message;
    target.setAttribute('aria-invalid', String(Boolean(message)));
  });

  window.addEventListener('beforeunload', (event) => {
    if (dirty) event.preventDefault();
  });
}
