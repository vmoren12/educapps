import { setupShell, updateAccountLink, showToast } from './shell.js';
import { getClient, readAuthErrorFromUrl, friendlyError, siteUrl } from './auth.js';
import { createCover, icon } from './render.js';
import { formatFullDate, hostname, isHttpUrl } from './utils.js';

const $ = (id) => document.getElementById(id);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEXT_PAGES = { proposa: 'proposa.html' };
const STATUS_LABELS = { pendent: 'Pendent de revisió', publicada: 'Publicada', rebutjada: 'Rebutjada' };

const next = new URLSearchParams(window.location.search).get('next');
let client;
let currentUserId;

init();

async function init() {
  setupShell();
  const urlError = readAuthErrorFromUrl();
  bindEvents();

  try {
    client = await getClient();
  } catch (error) {
    console.error(error);
    $('loading').textContent = "No s'ha pogut connectar amb el servidor. Torna-ho a provar més tard.";
    return;
  }

  // Emet INITIAL_SESSION en subscriure's (inclou la sessió que arriba des de l'enllaç del correu).
  client.auth.onAuthStateChange((event, session) => {
    // Recomanació de Supabase: no esperar crides a Supabase dins d'aquest callback.
    setTimeout(() => onSession(session, urlError), 0);
  });
}

function onSession(session, urlError) {
  const userId = session?.user?.id ?? null;
  updateAccountLink(Boolean(userId));
  if (userId === currentUserId && $('loading').hidden) return;
  currentUserId = userId;
  $('loading').hidden = true;

  if (!userId) {
    $('account-view').hidden = true;
    $('login-view').hidden = false;
    if (urlError) showLoginError(urlError);
    return;
  }

  if (next && NEXT_PAGES[next]) {
    window.location.replace(NEXT_PAGES[next]);
    return;
  }

  $('login-view').hidden = true;
  $('account-view').hidden = false;
  $('account-email').textContent = `Has entrat com a ${session.user.email}`;
  loadProfile();
  loadApps();
}

/* Accés ------------------------------------------------------------------------- */

function showLoginError(message) {
  const box = $('login-error');
  box.textContent = message;
  box.hidden = !message;
}

async function sendMagicLink(event) {
  event.preventDefault();
  const input = $('login-email');
  const email = input.value.trim().toLowerCase();
  const valid = EMAIL_PATTERN.test(email);
  input.setAttribute('aria-invalid', String(!valid));
  $('login-email-error').textContent = valid ? '' : 'Escriu una adreça de correu vàlida.';
  showLoginError('');
  if (!valid) {
    input.focus();
    return;
  }

  const button = $('login-submit');
  button.disabled = true;
  const redirect = siteUrl(`compte.html${next && NEXT_PAGES[next] ? `?next=${next}` : ''}`);
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect, shouldCreateUser: true },
  });
  button.disabled = false;

  if (error) {
    showLoginError(friendlyError(error));
    return;
  }
  $('login-sent-email').textContent = email;
  $('login-form').hidden = true;
  $('login-sent').hidden = false;
  $('login-retry').focus();
}

/* Perfil -------------------------------------------------------------------------- */

async function loadProfile() {
  const { data, error } = await client.from('profiles').select('nom, centre, web').eq('id', currentUserId).maybeSingle();
  if (error) {
    console.error(error);
    return;
  }
  $('profile-nom').value = data?.nom ?? '';
  $('profile-centre').value = data?.centre ?? '';
  $('profile-web').value = data?.web ?? '';
  $('profile-reminder').hidden = Boolean(data?.nom);
}

async function saveProfile(event) {
  event.preventDefault();
  const nom = $('profile-nom').value.trim();
  const centre = $('profile-centre').value.trim();
  const web = $('profile-web').value.trim();

  const nomError = nom && (nom.length < 2 || nom.length > 80) ? 'El nom ha de tenir entre 2 i 80 caràcters.' : '';
  const webError = web && !isHttpUrl(web) ? 'Escriu una adreça completa, per exemple https://exemple.cat' : '';
  $('profile-nom-error').textContent = nomError;
  $('profile-web-error').textContent = webError;
  $('profile-nom').setAttribute('aria-invalid', String(Boolean(nomError)));
  $('profile-web').setAttribute('aria-invalid', String(Boolean(webError)));
  if (nomError || webError) return;

  const button = $('profile-submit');
  button.disabled = true;
  const { error } = await client
    .from('profiles')
    .update({ nom: nom || null, centre: centre || null, web: web || null })
    .eq('id', currentUserId);
  button.disabled = false;

  const box = $('profile-error');
  box.hidden = !error;
  box.textContent = error ? friendlyError(error) : '';
  if (!error) {
    $('profile-reminder').hidden = Boolean(nom);
    showToast('Perfil desat');
  }
}

/* Les meves aplicacions ---------------------------------------------------------- */

async function loadApps() {
  const list = $('my-apps');
  list.setAttribute('aria-busy', 'true');
  const { data, error } = await client
    .from('apps')
    .select('id, slug, titol, url, ambit, estat, motiu_rebuig, created_at, updated_at')
    .eq('propietari', currentUserId)
    .order('created_at', { ascending: false });
  list.setAttribute('aria-busy', 'false');

  if (error) {
    list.replaceChildren(textItem(friendlyError(error)));
    return;
  }
  list.replaceChildren(...data.map(createRow));
  $('my-apps-empty').hidden = data.length > 0;
}

function textItem(text) {
  const li = document.createElement('li');
  li.className = 'alert alert-error';
  li.textContent = text;
  return li;
}

function actionLink(href, iconId, label) {
  const a = document.createElement('a');
  a.className = 'icon-btn';
  a.href = href;
  a.title = label;
  a.setAttribute('aria-label', label);
  a.append(icon(iconId));
  return a;
}

function createRow(app) {
  const li = document.createElement('li');
  li.className = 'row';
  li.dataset.ambit = app.ambit;

  const cover = document.createElement('div');
  cover.className = 'row-cover';
  cover.setAttribute('aria-hidden', 'true');
  cover.append(createCover(app.slug, { cols: 3, rows: 3 }));

  const main = document.createElement('div');
  main.className = 'row-main';

  const title = document.createElement('p');
  title.className = 'row-title';
  const name = document.createElement('span');
  name.textContent = app.titol;
  const status = document.createElement('span');
  status.className = `status status-${app.estat}`;
  status.textContent = STATUS_LABELS[app.estat] ?? app.estat;
  title.append(name, status);

  const meta = document.createElement('p');
  meta.className = 'row-meta';
  const edited = app.updated_at && app.updated_at.slice(0, 16) !== app.created_at.slice(0, 16);
  meta.textContent = `${hostname(app.url)} · ${edited ? 'Editada' : 'Enviada'} el ${formatFullDate(edited ? app.updated_at : app.created_at)}`;
  main.append(title, meta);

  if (app.estat === 'rebutjada' && app.motiu_rebuig) {
    const reason = document.createElement('p');
    reason.className = 'row-reason';
    reason.textContent = `Motiu: ${app.motiu_rebuig}. Pots editar-la i tornar-la a enviar.`;
    main.append(reason);
  }

  const actions = document.createElement('div');
  actions.className = 'row-actions';
  if (app.estat === 'publicada') {
    actions.append(actionLink(`./?app=${encodeURIComponent(app.slug)}`, 'i-eye', `Mostra ${app.titol} al catàleg`));
  }
  actions.append(actionLink(`proposa.html?id=${encodeURIComponent(app.id)}`, 'i-edit', `Edita ${app.titol}`));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-btn';
  remove.title = 'Esborra';
  remove.setAttribute('aria-label', `Esborra ${app.titol}`);
  remove.append(icon('i-trash'));
  remove.addEventListener('click', () => deleteApp(app, li));
  actions.append(remove);

  li.append(cover, main, actions);
  return li;
}

async function deleteApp(app, row) {
  if (!window.confirm(`Vols esborrar «${app.titol}»? Aquesta acció no es pot desfer.`)) return;
  const { error } = await client.from('apps').delete().eq('id', app.id);
  if (error) {
    showToast(friendlyError(error));
    return;
  }
  row.remove();
  $('my-apps-empty').hidden = $('my-apps').children.length > 0;
  showToast('Aplicació esborrada');
}

/* Esdeveniments -------------------------------------------------------------------- */

function bindEvents() {
  $('login-form').addEventListener('submit', sendMagicLink);
  $('login-retry').addEventListener('click', () => {
    $('login-sent').hidden = true;
    $('login-form').hidden = false;
    $('login-email').select();
  });
  $('profile-form').addEventListener('submit', saveProfile);
  $('logout').addEventListener('click', async () => {
    await client.auth.signOut();
    showToast('Has sortit del compte');
  });
}
