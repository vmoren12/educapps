// Elements comuns a totes les pàgines: tema, capçalera, enllaç de compte i avisos.
import { hasStoredSession } from './auth.js';

export function setupShell() {
  setupTheme();
  setupHeaderScroll();
  updateAccountLink();
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

export function updateAccountLink(signedIn = hasStoredSession()) {
  const label = document.querySelector('#account-link .nav-label');
  if (label) label.textContent = signedIn ? 'El meu compte' : 'Entra';
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
