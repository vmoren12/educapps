// Elements comuns a totes les pàgines: tema, capçalera, enllaç de compte i avisos.
import { storedUser, SESSION_STORAGE_KEY, PROFILE_STORAGE_KEY } from './auth.js';

export function setupShell() {
  setupTheme();
  setupHeaderScroll();
  updateAccountLink();
  // Entrar o sortir en una altra pestanya també actualitza aquesta capçalera.
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_STORAGE_KEY || event.key === PROFILE_STORAGE_KEY || event.key === null) updateAccountLink();
  });
}

function setupTheme() {
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const resolved = () => root.dataset.theme || (media.matches ? 'dark' : 'light');
  const sync = () => {
    root.dataset.resolvedTheme = resolved();
    button?.setAttribute('aria-label', resolved() === 'dark' ? 'Activa el tema clar' : 'Activa el tema fosc');
  };
  media.addEventListener('change', sync);
  button?.addEventListener('click', () => {
    const next = resolved() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('educapps:tema', next); } catch { /* sense persistència */ }
    sync();
  });
  sync();
}

function setupHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/** Nom curt per a la capçalera: el primer nom del perfil o, si no n'hi ha, el correu abans de l'@. */
function shortName(user) {
  return user.nom.trim().split(/\s+/)[0] || user.email.split('@')[0] || 'El meu compte';
}

/** Capçalera: «Entra» sense sessió; inicial i nom de la persona amb sessió. */
export function updateAccountLink(user = storedUser()) {
  const link = document.getElementById('account-link');
  if (!link) return;
  const label = link.querySelector('.nav-label');
  let avatar = link.querySelector('.avatar');

  if (!user) {
    link.classList.remove('is-signed-in');
    link.removeAttribute('title');
    link.removeAttribute('aria-label');
    if (avatar) avatar.hidden = true;
    if (label) label.textContent = 'Entra';
    return;
  }

  const name = shortName(user);
  if (!avatar) {
    avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    link.prepend(avatar);
  }
  avatar.textContent = name.charAt(0).toLocaleUpperCase('ca');
  avatar.hidden = false;
  if (label) label.textContent = name;
  link.classList.add('is-signed-in');
  link.title = user.email;
  link.setAttribute('aria-label', `El meu compte, ${user.nom.trim() || user.email}`);
}

let toastTimer;
export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}
