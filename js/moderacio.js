import { setupShell, showToast } from './shell.js';
import { getClient, friendlyError } from './auth.js';
import { renderCover, icon } from './render.js';
import { coverUrl } from './config.js';
import { formatFullDate, safeUrl } from './utils.js';

const $ = (id) => document.getElementById(id);
const LIMIT = 100;
const STATUS_LABELS = { pendent: 'Pendent', publicada: 'Publicada', rebutjada: 'Rebutjada' };
const REPORT_LABELS = {
  'enllac-trencat': 'Enllaç trencat',
  'contingut-inadequat': 'Contingut inadequat',
  'dades-incorrectes': 'Dades incorrectes',
  altres: 'Altres',
};
const QUICK_REASONS = [
  "L'enllaç no funciona",
  'No té una finalitat educativa clara',
  'Requereix registre o pagament',
  'Contingut inadequat',
  'Ja és al catàleg',
];
const EMPTY = {
  pendent: ['Tot al dia', 'No hi ha cap proposta pendent de revisar.'],
  informes: ['Cap informe obert', 'Ningú no ha informat de cap problema.'],
  publicada: ['Encara no hi ha res publicat', ''],
  rebutjada: ['Cap aplicació rebutjada', ''],
};

let client;
let labels = { ambit: new Map(), nivell: new Map(), idioma: new Map() };
let currentTab = 'pendent';
let uid = 0;

init();

async function init() {
  setupShell();
  try {
    client = await getClient();
  } catch (error) {
    console.error(error);
    $('loading').textContent = "No s'ha pogut connectar amb el servidor.";
    return;
  }

  const { data } = await client.auth.getSession();
  if (!data.session) {
    window.location.replace('compte.html');
    return;
  }
  const { data: isModerator } = await client.rpc('es_moderador');
  $('loading').hidden = true;
  if (!isModerator) {
    $('denied').hidden = false;
    return;
  }

  await loadLabels();
  $('panel').hidden = false;
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
  refreshCounts();
  selectTab('pendent');
}

async function loadLabels() {
  const fetchList = (table) => client.from(table).select('id, nom').order('ordre');
  const [ambits, nivells, idiomes] = await Promise.all(['ambits', 'nivells', 'idiomes'].map(fetchList));
  labels = {
    ambit: new Map((ambits.data ?? []).map((t) => [t.id, t.nom])),
    nivell: new Map((nivells.data ?? []).map((t) => [t.id, t.nom])),
    idioma: new Map((idiomes.data ?? []).map((t) => [t.id, t.nom])),
  };
}

const names = (map, ids) => (ids ?? []).map((id) => map.get(id) ?? id).join(', ');

async function refreshCounts() {
  const [pending, reports] = await Promise.all([
    client.from('apps').select('id', { count: 'exact', head: true }).eq('estat', 'pendent'),
    client.from('informes').select('id', { count: 'exact', head: true }).eq('resolt', false),
  ]);
  const set = (key, value) => {
    const badge = document.querySelector(`[data-count="${key}"]`);
    badge.textContent = String(value ?? 0);
    badge.hidden = !value;
  };
  set('pendent', pending.count);
  set('informes', reports.count);
}

async function selectTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.tab === tab)));
  const list = $('mod-list');
  list.setAttribute('aria-busy', 'true');
  list.replaceChildren();
  $('mod-empty').hidden = true;
  $('mod-status').textContent = 'Carregant…';

  const items = tab === 'informes' ? await loadReports() : await loadApps(tab);
  if (tab !== currentTab) return; // l'usuari ha canviat de pestanya mentre es carregava
  list.setAttribute('aria-busy', 'false');
  if (!items) return;
  list.replaceChildren(...items);
  updateStatus();
}

function updateStatus() {
  const n = $('mod-list').children.length;
  $('mod-status').textContent = n ? `${n} ${n === 1 ? 'element' : 'elements'}${n >= LIMIT ? ' (es mostren els primers 100)' : ''}` : '';
  const [title, text] = EMPTY[currentTab];
  $('mod-empty-title').textContent = title;
  $('mod-empty-text').textContent = text;
  $('mod-empty').hidden = n > 0;
}

function showLoadError(error) {
  $('mod-status').textContent = friendlyError(error);
  return null;
}

/* Aplicacions ---------------------------------------------------------------------- */

async function loadApps(estat) {
  const { data, error } = await client
    .from('apps')
    .select('*')
    .eq('estat', estat)
    .order(estat === 'pendent' ? 'created_at' : 'updated_at', { ascending: estat === 'pendent' })
    .limit(LIMIT);
  if (error) return showLoadError(error);

  const owners = [...new Set(data.map((app) => app.propietari).filter(Boolean))];
  const profiles = new Map();
  if (owners.length) {
    const { data: rows } = await client.from('profiles').select('id, nom, centre').in('id', owners);
    (rows ?? []).forEach((row) => profiles.set(row.id, row));
  }
  return data.map((app) => createAppItem(app, profiles.get(app.propietari)));
}

function metaRow(dl, term, value) {
  if (!value) return;
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = term;
  if (value instanceof Node) dd.append(value);
  else dd.textContent = value;
  dl.append(dt, dd);
}

function externalLink(url, text) {
  const href = safeUrl(url);
  if (!href) return text ?? url;
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text ?? href.replace(/^https?:\/\//, '');
  return a;
}

function button(text, className, onClick, iconId) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn btn-sm ${className}`;
  if (iconId) b.append(icon(iconId));
  b.append(text);
  b.addEventListener('click', onClick);
  return b;
}

function linkButton(text, href, iconId, external = false) {
  const a = document.createElement('a');
  a.className = 'btn btn-sm btn-outline';
  a.href = href;
  if (external) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  if (iconId) a.append(icon(iconId));
  a.append(text);
  return a;
}

function createAppItem(app, profile) {
  const li = document.createElement('li');
  const article = document.createElement('article');
  article.className = 'mod-item';
  article.dataset.ambit = app.ambit;
  li.append(article);

  const cover = document.createElement('div');
  cover.className = 'mod-cover';
  renderCover(cover, { id: app.slug, imatge: coverUrl(app.imatge) }, { cols: 8, rows: 4 });

  const body = document.createElement('div');
  body.className = 'mod-body';

  const ambit = document.createElement('p');
  ambit.className = 'card-ambit';
  ambit.textContent = (app.ambits?.length ? app.ambits : [app.ambit]).map((id) => labels.ambit.get(id) ?? id).join(' · ');

  const title = document.createElement('h2');
  title.className = 'mod-title';
  const titleText = document.createElement('span');
  titleText.textContent = app.titol;
  const status = document.createElement('span');
  status.className = `status status-${app.estat}`;
  status.textContent = STATUS_LABELS[app.estat];
  title.append(titleText, status);

  const desc = document.createElement('p');
  desc.className = 'mod-desc';
  desc.textContent = app.descripcio;
  body.append(ambit, title, desc);

  if (app.detall) {
    const detail = document.createElement('p');
    detail.className = 'mod-detail';
    detail.textContent = app.detall;
    body.append(detail);
  }

  const meta = document.createElement('dl');
  meta.className = 'meta';
  metaRow(meta, 'Enllaç', externalLink(app.url));
  metaRow(meta, 'Nivells', names(labels.nivell, app.nivells));
  metaRow(meta, 'Idiomes', names(labels.idioma, app.idiomes));
  metaRow(meta, 'Etiquetes', (app.etiquetes ?? []).join(', '));
  metaRow(meta, 'Autoria', app.autor_url ? externalLink(app.autor_url, app.autor_nom) : app.autor_nom);
  metaRow(meta, 'Codi font', app.codi ? externalLink(app.codi) : '');
  const proposer = document.createElement('span');
  proposer.textContent = profile ? [profile.nom || 'Sense nom', profile.centre].filter(Boolean).join(' · ') : 'Administració';
  metaRow(meta, 'Proposada per', proposer);
  const edited = app.updated_at && app.updated_at.slice(0, 16) !== app.created_at.slice(0, 16);
  metaRow(meta, edited ? 'Editada' : 'Enviada', formatFullDate(edited ? app.updated_at : app.created_at));
  if (app.estat === 'rebutjada') metaRow(meta, 'Motiu del rebuig', app.motiu_rebuig);
  body.append(meta);

  if (app.propietari && profile) {
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'link-btn';
    reveal.textContent = 'Mostra el correu';
    reveal.addEventListener('click', async () => {
      const { data } = await client.rpc('correu_usuari', { usuari: app.propietari });
      const email = document.createElement('a');
      email.href = `mailto:${data}?subject=${encodeURIComponent(`EducApps: ${app.titol}`)}`;
      email.textContent = data ?? 'No disponible';
      reveal.replaceWith(email);
    }, { once: true });
    proposer.append(' · ', reveal);
  }

  const actions = document.createElement('div');
  actions.className = 'mod-actions';
  const reject = (label) => button(label, 'btn-outline', () => openRejectForm(article, app, actions));
  if (app.estat !== 'publicada') {
    actions.append(button('Publica', 'btn-primary', () => setStatus(article, app, 'publicada'), 'i-check'));
  }
  if (app.estat === 'pendent') actions.append(reject('Rebutja'));
  if (app.estat === 'publicada') {
    actions.append(reject('Retira del catàleg'));
    actions.append(linkButton('Mostra al catàleg', `./?app=${encodeURIComponent(app.slug)}`, 'i-eye'));
  }
  actions.append(linkButton("Obre l'enllaç", app.url, 'i-arrow', true));
  actions.append(linkButton('Edita', `proposa.html?id=${encodeURIComponent(app.id)}`, 'i-edit'));
  body.append(actions);

  article.append(cover, body);
  return li;
}

function openRejectForm(article, app, actions, { prefill = '', onDone } = {}) {
  if (article.querySelector('.mod-reject')) return;
  const form = $('tpl-reject').content.firstElementChild.cloneNode(true);
  const id = `reject-${++uid}`;
  const textarea = form.querySelector('textarea');
  const error = form.querySelector('.field-error');
  textarea.id = id;
  textarea.value = prefill;
  error.id = `${id}-error`;
  textarea.setAttribute('aria-describedby', error.id);
  form.querySelector('label').htmlFor = id;

  const chips = form.querySelector('.reason-chips');
  for (const reason of QUICK_REASONS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = reason;
    chip.addEventListener('click', () => {
      textarea.value = reason;
      textarea.focus();
    });
    chips.append(chip);
  }

  form.querySelector('[data-cancel]').addEventListener('click', () => {
    form.remove();
    actions.hidden = false;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const motiu = textarea.value.trim();
    error.textContent = motiu ? '' : "Escriu el motiu: l'autoria el veurà per poder-ho corregir.";
    textarea.setAttribute('aria-invalid', String(!motiu));
    if (!motiu) return textarea.focus();
    const done = await setStatus(article, app, 'rebutjada', motiu);
    if (done) onDone?.();
  });

  actions.hidden = true;
  actions.after(form);
  textarea.focus();
}

async function setStatus(article, app, estat, motiu = null) {
  const buttons = article.querySelectorAll('button');
  buttons.forEach((b) => { b.disabled = true; });
  const { error } = await client
    .from('apps')
    .update({ estat, motiu_rebuig: estat === 'rebutjada' ? motiu : null })
    .eq('id', app.id)
    .select('id')
    .single();
  buttons.forEach((b) => { b.disabled = false; });
  if (error) {
    showToast(friendlyError(error));
    return false;
  }
  showToast(estat === 'publicada' ? `«${app.titol}» publicada` : `«${app.titol}» rebutjada`);
  if (currentTab !== 'informes') removeItem(article);
  refreshCounts();
  return true;
}

function removeItem(article) {
  const li = article.closest('li');
  const next = li.nextElementSibling ?? li.previousElementSibling;
  li.remove();
  updateStatus();
  next?.querySelector('button, a')?.focus();
}

/* Informes ------------------------------------------------------------------------- */

async function loadReports() {
  const { data, error } = await client
    .from('informes')
    .select('id, motiu, comentari, created_at, app_id, apps ( id, slug, titol, url, estat, ambit, imatge )')
    .eq('resolt', false)
    .order('created_at', { ascending: true })
    .limit(LIMIT);
  if (error) return showLoadError(error);
  return data.map(createReportItem);
}

function createReportItem(report) {
  const app = report.apps ?? {};
  const li = document.createElement('li');
  const article = document.createElement('article');
  article.className = 'mod-item mod-item-compact';
  article.dataset.ambit = app.ambit ?? '';
  li.append(article);

  const cover = document.createElement('div');
  cover.className = 'mod-cover';
  renderCover(cover, { id: app.slug ?? 'informe', imatge: coverUrl(app.imatge) }, { cols: 4, rows: 2 });

  const body = document.createElement('div');
  body.className = 'mod-body';

  const kind = document.createElement('p');
  kind.className = 'card-ambit';
  kind.textContent = REPORT_LABELS[report.motiu] ?? report.motiu;

  const title = document.createElement('h2');
  title.className = 'mod-title';
  const titleText = document.createElement('span');
  titleText.textContent = app.titol ?? 'Aplicació esborrada';
  title.append(titleText);
  if (app.estat) {
    const status = document.createElement('span');
    status.className = `status status-${app.estat}`;
    status.textContent = STATUS_LABELS[app.estat];
    title.append(status);
  }
  body.append(kind, title);

  if (report.comentari) {
    const comment = document.createElement('p');
    comment.className = 'mod-desc';
    comment.textContent = `«${report.comentari}»`;
    body.append(comment);
  }
  const date = document.createElement('p');
  date.className = 'row-meta';
  date.textContent = `Informe del ${formatFullDate(report.created_at)}`;
  body.append(date);

  const actions = document.createElement('div');
  actions.className = 'mod-actions';
  actions.append(button('Marca com a resolt', 'btn-primary', () => resolveReport(article, report), 'i-check'));
  if (app.estat === 'publicada') {
    actions.append(
      button('Retira del catàleg', 'btn-outline', () =>
        openRejectForm(article, app, actions, {
          prefill: report.motiu === 'enllac-trencat' ? "L'enllaç no funciona" : '',
          onDone: () => resolveReport(article, report),
        }),
      ),
    );
  }
  if (app.url) actions.append(linkButton("Obre l'enllaç", app.url, 'i-arrow', true));
  if (app.id) actions.append(linkButton('Edita', `proposa.html?id=${encodeURIComponent(app.id)}`, 'i-edit'));
  body.append(actions);

  article.append(cover, body);
  return li;
}

async function resolveReport(article, report) {
  const { error } = await client.from('informes').update({ resolt: true }).eq('id', report.id).select('id').single();
  if (error) {
    showToast(friendlyError(error));
    return;
  }
  showToast('Informe resolt');
  removeItem(article);
  refreshCounts();
}

