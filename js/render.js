import { FACETS, label } from './catalog.js';
import { hashString, seededRandom, safeUrl, hostname, formatDate } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FACET_TITLES = { ambit: 'Àmbit', nivell: 'Nivell', idioma: 'Idioma' };

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

export function icon(id) {
  const svg = svgEl('svg', { class: 'icon', 'aria-hidden': 'true' });
  svg.append(svgEl('use', { href: `assets/icons.svg#${id}` }));
  return svg;
}

/**
 * Portada generativa: una retícula de formes geomètriques (quarts i mitjos cercles,
 * cercles) derivada de l'identificador. Cada aplicació té una imatge única i estable.
 */
export function createCover(seedText, { cols = 8, rows = 4 } = {}) {
  const random = seededRandom(hashString(seedText));
  const size = 40;
  const svg = svgEl('svg', {
    viewBox: `0 0 ${cols * size} ${rows * size}`,
    preserveAspectRatio: 'xMidYMid slice',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  const opacities = [0.12, 0.2, 0.3, 0.45];
  const density = 0.38 + random() * 0.2;
  let accentPlaced = false;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (random() > density) continue;
      const x = col * size;
      const y = row * size;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const rotation = Math.floor(random() * 4) * 90;
      const kind = random();
      let shape;

      if (kind < 0.45) {
        shape = svgEl('path', { d: `M${x} ${y}H${x + size}A${size} ${size} 0 0 1 ${x} ${y + size}Z` });
      } else if (kind < 0.75) {
        shape = svgEl('path', { d: `M${x} ${y + size}A${size / 2} ${size / 2} 0 0 1 ${x + size} ${y + size}Z` });
      } else if (kind < 0.9) {
        shape = svgEl('circle', { cx, cy, r: size * 0.34 });
      } else {
        shape = svgEl('rect', { x: x + size * 0.18, y: y + size * 0.18, width: size * 0.64, height: size * 0.64, rx: 3 });
      }

      let opacity = opacities[Math.floor(random() * opacities.length)];
      if (!accentPlaced && random() < 0.12) {
        opacity = 0.85;
        accentPlaced = true;
      }
      shape.setAttribute('fill', 'currentColor');
      shape.setAttribute('fill-opacity', String(opacity));
      if (rotation) shape.setAttribute('transform', `rotate(${rotation} ${cx} ${cy})`);
      svg.append(shape);
    }
  }
  return svg;
}

function levelsText(catalog, app) {
  return (app.nivells ?? []).map((id) => label(catalog, 'nivell', id));
}

/** Resumeix nivells consecutius com a interval: «Primària – Batxillerat». */
function levelsSummary(catalog, app) {
  const order = catalog.taxonomies.nivell.map((item) => item.id);
  const positions = (app.nivells ?? []).map((id) => order.indexOf(id)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (!positions.length) return '';
  const names = positions.map((i) => catalog.taxonomies.nivell[i].nom);
  const contiguous = positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  if (contiguous && names.length > 2) return `${names[0]} – ${names[names.length - 1]}`;
  return names.join(' · ');
}

export function createCard(template, catalog, app, handlers) {
  const node = template.content.firstElementChild.cloneNode(true);
  const inner = node.querySelector('.card-inner');
  inner.dataset.ambit = app.ambit;
  node.dataset.id = app.id;

  node.querySelector('.card-cover').append(createCover(app.id));
  node.querySelector('.card-ambit').textContent = label(catalog, 'ambit', app.ambit);

  const link = node.querySelector('.card-link');
  link.textContent = app.titol;
  link.addEventListener('click', () => handlers.onOpen(app.id));

  node.querySelector('.card-desc').textContent = app.descripcio;
  node.querySelector('.card-author').textContent = app.autor?.nom ?? '';

  const levels = node.querySelector('.card-levels');
  const summary = levelsSummary(catalog, app);
  levels.textContent = summary;
  levels.title = `Nivells: ${levelsText(catalog, app).join(', ')}`;
  levels.hidden = !summary;

  const fav = node.querySelector('.fav-btn');
  fav.addEventListener('click', () => handlers.onToggleFavorite(app.id, fav));

  const open = node.querySelector('.card-open');
  const href = safeUrl(app.url);
  if (href) {
    open.href = href;
    open.setAttribute('aria-label', `Obre ${app.titol} en una pestanya nova`);
    open.title = hostname(href);
  } else {
    open.remove();
  }

  return node;
}

export function setFavoriteButton(button, active, title) {
  button.setAttribute('aria-pressed', String(active));
  const text = active ? `Treu ${title} de favorits` : `Afegeix ${title} a favorits`;
  button.setAttribute('aria-label', text);
  button.title = active ? 'Treu de favorits' : 'Afegeix a favorits';
}

/** Construeix les opcions de cada faceta una sola vegada. */
export function buildFacets(root, catalog, onChange) {
  const inputs = {};
  for (const facet of FACETS) {
    const list = root.querySelector(`[data-facet="${facet}"] .facet-list`);
    inputs[facet] = new Map();
    for (const item of catalog.taxonomies[facet]) {
      const li = document.createElement('li');
      const option = document.createElement('label');
      option.className = 'facet-option';
      if (facet === 'ambit') option.dataset.ambit = item.id;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = facet;
      input.value = item.id;
      input.addEventListener('change', () => onChange(facet, item.id, input.checked));

      const name = document.createElement('span');
      name.className = 'facet-name';
      name.textContent = item.nom;

      const count = document.createElement('span');
      count.className = 'facet-count';

      option.append(input);
      if (facet === 'ambit') {
        const dot = document.createElement('span');
        dot.className = 'facet-dot';
        dot.setAttribute('aria-hidden', 'true');
        option.append(dot);
      }
      option.append(name, count);
      li.append(option);
      list.append(li);
      inputs[facet].set(item.id, { input, count, option });
    }
  }
  return inputs;
}

export function updateFacets(inputs, state, counts) {
  for (const facet of FACETS) {
    for (const [id, { input, count, option }] of inputs[facet]) {
      const n = counts[facet].get(id) ?? 0;
      input.checked = state[facet].has(id);
      count.textContent = String(n);
      option.classList.toggle('is-empty', n === 0 && !input.checked);
    }
  }
}

export function renderChips(container, catalog, state, onRemove) {
  container.replaceChildren();
  const add = (text, prefix, remove) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.setAttribute('aria-label', `Treu el filtre ${prefix ? `${prefix}: ` : ''}${text}`);
    if (prefix) {
      const span = document.createElement('span');
      span.className = 'chip-label';
      span.textContent = prefix;
      button.append(span);
    }
    button.append(document.createTextNode(text), icon('i-x'));
    button.addEventListener('click', remove);
    li.append(button);
    container.append(li);
  };

  if (state.q.trim()) add(`«${state.q.trim()}»`, 'Cerca', () => onRemove('q'));
  if (state.favorits) add('Només favorits', '', () => onRemove('favorits'));
  for (const facet of FACETS) {
    for (const id of state[facet]) add(label(catalog, facet, id), FACET_TITLES[facet], () => onRemove(facet, id));
  }
}

export function fillDialog(els, catalog, app) {
  els.dialog.dataset.ambit = app.ambit;
  els.cover.replaceChildren(createCover(app.id, { cols: 12, rows: 4 }));
  els.ambit.textContent = label(catalog, 'ambit', app.ambit);
  els.title.textContent = app.titol;

  els.author.replaceChildren();
  if (app.autor?.nom) {
    els.author.append('Per ');
    const authorUrl = safeUrl(app.autor.url);
    if (authorUrl) {
      const a = document.createElement('a');
      a.href = authorUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = app.autor.nom;
      els.author.append(a);
    } else {
      els.author.append(app.autor.nom);
    }
  }

  els.desc.textContent = app.detall || app.descripcio;

  const href = safeUrl(app.url);
  const rows = [
    ['Nivells', levelsText(catalog, app).join(', ')],
    ['Idiomes', (app.idiomes ?? []).map((id) => label(catalog, 'idioma', id)).join(', ')],
    ['Adreça', href ? hostname(href) : ''],
    ['Afegida', app.afegit ? formatDate(app.afegit) : ''],
  ];
  els.meta.replaceChildren();
  for (const [term, value] of rows) {
    if (!value) continue;
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = value;
    els.meta.append(dt, dd);
  }

  els.tags.replaceChildren();
  for (const tag of app.etiquetes ?? []) {
    const li = document.createElement('li');
    li.textContent = tag;
    els.tags.append(li);
  }

  if (href) {
    els.open.href = href;
    els.open.hidden = false;
  } else {
    els.open.hidden = true;
  }
  const code = safeUrl(app.codi);
  els.code.hidden = !code;
  if (code) els.code.href = code;
}
