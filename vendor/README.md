# Dependències copiades

| Fitxer | Origen | Versió | SHA-256 |
| --- | --- | --- | --- |
| `supabase-js-2.117.2.min.js` | `@supabase/supabase-js` (npm), `dist/umd/supabase.js` | 2.117.2 | `59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd` |

Es copien al repositori perquè la política de seguretat (CSP) només permet scripts del mateix domini.
Llicència: MIT (vegeu `supabase-js-LICENSE`).

Per actualitzar-la: `npm pack @supabase/supabase-js@<versió>`, copia `package/dist/umd/supabase.js` amb el nom nou,
actualitza `CLIENT_SCRIPT` a `js/auth.js` i aquesta taula. Fes servir versions publicades fa almenys dues setmanes.
