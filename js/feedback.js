// Formulari del peu: problemes o suggeriments sobre el web. No envia res des d'aquí:
// obre una issue de GitHub ja omplerta, perquè en quedi constància i arribi l'avís.

const ISSUE_URL = 'https://github.com/vmoren12/educapps/issues/new';
const TEMPLATE = 'problema-o-suggeriment.yml';

export function setupFeedback() {
  const toggle = document.getElementById('feedback-toggle');
  const panel = document.getElementById('feedback-panel');
  const form = document.getElementById('feedback-form');
  if (!toggle || !panel || !form) return;
  const text = document.getElementById('feedback-text');
  const error = document.getElementById('feedback-error');
  const pills = form.querySelector('.pills');

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      form.querySelector('input[name="tipus"]').focus();
    } else {
      form.reset();
      error.textContent = '';
      markInvalid(pills, false);
      markInvalid(text, false);
    }
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  document.getElementById('feedback-cancel').addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const tipus = form.querySelector('input[name="tipus"]:checked')?.value;
    const descripcio = text.value.trim();
    markInvalid(pills, !tipus);
    markInvalid(text, !descripcio);
    if (!tipus || !descripcio) {
      error.textContent = !tipus ? 'Tria si és un problema o un suggeriment.' : 'Explica breument què vols notificar.';
      return;
    }

    const params = new URLSearchParams({
      template: TEMPLATE,
      title: `[${tipus}] ${summary(descripcio)}`,
      tipus,
      descripcio,
      navegador: navigator.userAgent,
    });
    window.open(`${ISSUE_URL}?${params}`, '_blank', 'noopener');
    setOpen(false);
    toggle.focus();
  });
}

function markInvalid(el, invalid) {
  if (invalid) el.setAttribute('aria-invalid', 'true');
  else el.removeAttribute('aria-invalid');
}

/** Primera línia del text, escurçada perquè serveixi de títol. */
function summary(text) {
  const line = text.split('\n')[0].trim();
  return line.length > 70 ? `${line.slice(0, 69).trimEnd()}…` : line;
}
