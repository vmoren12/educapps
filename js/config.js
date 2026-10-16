// Configuració pública de Supabase. La clau «publishable» és pública per disseny:
// la seguretat la garanteixen les regles de Row Level Security de la base de dades.
// No hi posis MAI la clau secreta (service_role / sb_secret_...).
export const SUPABASE_URL = 'https://vvvsuksrsczuvmswmjaw.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_LgZeOoscJMPqJJWNzn0jrg_WvfjQ9QI';

// Còpia local del catàleg, que es fa servir si Supabase no respon.
export const FALLBACK_URL = 'data/apps.json';
