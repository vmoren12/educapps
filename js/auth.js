// Client de Supabase carregat sota demanda: el catàleg públic no el necessita.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const CLIENT_SCRIPT = 'vendor/supabase-js-2.117.2.min.js';
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export const SESSION_STORAGE_KEY = STORAGE_KEY;
export const PROFILE_STORAGE_KEY = 'educapps:perfil';

/** Indica si hi ha una sessió desada sense haver de carregar el client. */
export function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

/** Usuari de la sessió desada ({ id, email, nom }), sense carregar el client. Null si no n'hi ha. */
export function storedUser() {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')?.user;
    if (!user?.id) return null;
    const profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? 'null');
    return { id: user.id, email: user.email ?? '', nom: profile?.id === user.id ? profile.nom ?? '' : '' };
  } catch {
    return null;
  }
}

/** Desa el nom del perfil per mostrar-lo a la capçalera sense consultar Supabase. */
export function rememberProfileName(id, nom) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ id, nom: nom || '' }));
  } catch {
    /* sense persistència */
  }
}

export function forgetProfileName() {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    /* sense persistència */
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No s'ha pogut carregar ${src}`));
    document.head.append(script);
  });
}

let clientPromise;

export function getClient() {
  clientPromise ??= (window.supabase ? Promise.resolve() : loadScript(CLIENT_SCRIPT)).then(() =>
    window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        // «implicit» permet obrir l'enllaç del correu en un altre dispositiu o navegador.
        flowType: 'implicit',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
  );
  return clientPromise;
}

export async function getSession() {
  const client = await getClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

/** URL absoluta d'una pàgina del lloc, per als enllaços que s'envien per correu. */
export function siteUrl(path) {
  return new URL(path, window.location.href).href;
}

/** Llegeix un error retornat per Supabase a la URL (p. ex. enllaç caducat). */
export function readAuthErrorFromUrl() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  const code = params.get('error_code') || params.get('error');
  if (!code) return null;
  const next = new URLSearchParams(window.location.search).get('next');
  window.history.replaceState(null, '', window.location.pathname + (next ? `?next=${encodeURIComponent(next)}` : ''));
  if (code === 'otp_expired') return "L'enllaç d'accés ha caducat o ja s'ha fet servir. Demana'n un de nou.";
  return params.get('error_description')?.replace(/\+/g, ' ') || "No s'ha pogut iniciar la sessió.";
}

const CHECK_MESSAGES = {
  apps_titol_check: 'El nom ha de tenir entre 2 i 80 caràcters.',
  apps_descripcio_check: 'La descripció breu ha de tenir entre 20 i 160 caràcters.',
  apps_detall_check: 'La descripció ampliada pot tenir com a màxim 2.000 caràcters.',
  apps_url_check: "L'enllaç ha de començar per https://.",
  apps_codi_check: "L'enllaç al codi font ha de començar per https://.",
  apps_autor_nom_check: "El nom de l'autoria ha de tenir entre 2 i 120 caràcters.",
  apps_autor_url_check: "L'enllaç de l'autoria no és vàlid.",
  apps_etiquetes_check: 'Pots posar com a màxim 10 etiquetes.',
  apps_ambits_check: 'Tria almenys un àmbit.',
  profiles_nom_check: 'El nom ha de tenir entre 2 i 80 caràcters.',
  profiles_web_check: 'La web ha de començar per http:// o https://.',
};

/** Tradueix errors de Supabase a missatges entenedors. */
export function friendlyError(error) {
  if (!error) return '';
  const message = error.message ?? String(error);
  if (error.code === '23505' && /url/.test(message)) return 'Aquesta adreça ja és al catàleg o està pendent de revisió.';
  if (error.code === '23505') return 'Ja existeix un registre igual.';
  if (error.code === 'P0001') return message;
  if (error.code === '23514') {
    const constraint = Object.keys(CHECK_MESSAGES).find((name) => message.includes(name));
    return constraint ? CHECK_MESSAGES[constraint] : message;
  }
  if (error.code === '23503') return 'Alguna categoria seleccionada no existeix.';
  if (error.code === '42501' || error.status === 401 || error.status === 403) {
    return 'No tens permís per fer aquesta acció. Torna a iniciar la sessió.';
  }
  if (/maximum allowed size|payload too large/i.test(message)) return 'La imatge supera la mida màxima (1 MB).';
  if (/mime type|invalid_mime_type/i.test(message)) return "Format d'imatge no admès. Fes servir JPG, PNG o WebP.";
  if (/bucket not found/i.test(message)) return "L'espai d'imatges encara no està configurat (cal executar l'script 05).";
  if (/'ambits' column/i.test(message)) return "La base de dades encara no admet diversos àmbits (cal executar l'script 07).";
  if (/imatge de portada/i.test(message)) return message;
  if (error.status === 429 || /rate limit/i.test(message)) return "S'han fet massa intents. Espera uns minuts i torna-ho a provar.";
  if (/invalid.*email|email.*invalid/i.test(message)) return 'Aquesta adreça de correu no és vàlida.';
  if (/fetch|network/i.test(message)) return 'No hi ha connexió amb el servidor. Comprova la xarxa i torna-ho a provar.';
  return message;
}
