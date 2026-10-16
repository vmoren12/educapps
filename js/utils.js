/** Normalitza text per a cerques: minúscules i sense diacrítics. */
export function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/l[·.]l/g, 'll') // «col·legi», «col.legi» i «collegi» són equivalents
    .trim();
}

export function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Hash FNV-1a de 32 bits: estable entre execucions. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generador pseudoaleatori determinista (mulberry32). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Retorna l'URL només si és http(s); evita esquemes perillosos. */
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function hostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const dateFormat = new Intl.DateTimeFormat('ca', { month: 'long', year: 'numeric' });

export function formatDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

export function plural(n, singular, pluralForm) {
  return n === 1 ? singular : pluralForm;
}

/** Accés a localStorage tolerant a errors (mode privat, quota, bloqueig). */
export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* sense persistència: l'aplicació continua funcionant */
    }
  },
};

const fullDateFormat = new Intl.DateTimeFormat('ca', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatFullDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : fullDateFormat.format(date);
}

/** Converteix un títol en identificador: «Col·laboració àgil» → collaboracio-agil (igual que la base de dades). */
export function slugify(text) {
  const slug = String(text ?? '')
    .replace(/·/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'app';
}

export const isHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname.includes('.'));
  } catch {
    return false;
  }
};

export const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
};
