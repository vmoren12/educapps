// S'executa de manera síncrona al <head> per evitar el parpelleig del tema.
(function () {
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('educapps:tema'); } catch (e) { /* emmagatzematge no disponible */ }
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-resolved-theme', stored || (prefersDark ? 'dark' : 'light'));
})();
