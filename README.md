# EducApps

**<https://educapps.cat>**

Repositori obert d'aplicacions educatives creades i recomanades per la comunitat docent. Una web estàtica, ràpida i accessible per descobrir petites i mitjanes aplicacions web allotjades a GitHub Pages, Netlify o serveis similars.

## Funcionalitats

- **Cerca instantània** per nom, descripció, etiquetes i autoria, tolerant a accents i a la ela geminada.
- **Filtres combinables** per àmbit, nivell educatiu i idioma, amb recomptes en temps real.
- **Favorits** desats al navegador o, amb sessió iniciada, al compte (disponibles a qualsevol dispositiu).
- **Fitxa de detall** de cada aplicació, amb enllaç directe per compartir-la.
- **URL compartibles**: la cerca, els filtres i la fitxa oberta queden reflectits a l'adreça.
- **Vista de graella o de llista**, ordenació per rellevància, data o alfabètica.
- **Tema clar i fosc**, que segueix el sistema o es pot triar manualment.
- **Responsive**, amb calaix de filtres a mòbil.
- **Accessible**: navegació amb teclat (`/` per cercar), etiquetes ARIA, respecte per `prefers-reduced-motion`.
- **Comptes de docents**: accés sense contrasenya (enllaç per correu), formulari amb vista prèvia en directe i pàgina «Les meves aplicacions» per seguir l'estat de revisió, editar i esborrar.
- **Imatge de portada opcional**: es retalla i es comprimeix al navegador (WebP, 1200 × 525) abans de pujar-la. Sense imatge, es genera una portada geomètrica.
- **Moderació**: tota aplicació nova o editada queda pendent fins que un moderador l'aprova des del panell `moderacio.html` (publicar, rebutjar amb motiu, retirar, atendre informes).
- **Informes de problemes**: des de la fitxa de cada aplicació, qualsevol persona registrada pot avisar d'un enllaç trencat o d'un contingut inadequat.
- **Privacitat**: sense galetes, analítica ni peticions a tercers. Política de seguretat de contingut (CSP) estricta. Política de privacitat a `privacitat.html`.

## Arquitectura

- **Web estàtica** a GitHub Pages, sense procés de compilació.
- **Supabase** (PostgreSQL a la UE) per al catàleg, els comptes i la moderació. Les regles d'accés són a la base de dades (Row Level Security): vegeu [supabase/sql/](supabase/sql/README.md).
- **Còpia local** `data/apps.json`, actualitzada cada dia des de Supabase: si Supabase no respon, la web la fa servir automàticament.

## Estructura

```
├── index.html              Catàleg
├── compte.html             Accés i «Les meves aplicacions»
├── proposa.html            Formulari per afegir o editar una aplicació
├── moderacio.html          Panell de moderació
├── privacitat.html         Política de privacitat
├── CNAME                   Domini propi per a GitHub Pages
├── css/styles.css          Estils (tokens, components, responsive)
├── assets/icons.svg        Icones (sprite SVG)
├── js/
│   ├── main.js             Catàleg: arrencada, estat i esdeveniments
│   ├── compte.js           Accés, perfil i llistat propi
│   ├── proposa.js          Formulari, validació i vista prèvia
│   ├── moderacio.js        Panell de moderació
│   ├── image-tools.js      Retall i compressió de la imatge de portada
│   ├── auth.js             Client de Supabase (es carrega sota demanda)
│   ├── data-source.js      Lectura del catàleg (Supabase o còpia local)
│   ├── config.js           URL i clau pública de Supabase
│   ├── shell.js            Capçalera, tema i avisos compartits
│   ├── catalog.js          Cerca, filtres, recomptes i ordenació (funcions pures)
│   ├── render.js           Generació del DOM i portades generatives
│   ├── store.js            Favorits (navegador o compte) i preferències
│   ├── url-state.js        Sincronització amb la URL
│   ├── theme-init.js       Aplica el tema abans de pintar
│   └── utils.js
├── vendor/                 supabase-js (versió fixada, vegeu vendor/README.md)
├── supabase/sql/           Scripts de la base de dades, numerats
├── supabase/plantilles/    Correus d'accés en català (per enganxar a Supabase)
├── data/apps.json          Còpia local del catàleg (generada cada dia; no l'editis)
├── scripts/
│   ├── sync-catalog.mjs    Actualitza la còpia local des de Supabase
│   └── validate-apps.mjs   Validador de la còpia local
└── .github/                Plantilles d'issues i PR, validació i còpia diària
```

## Executar en local

Com que el catàleg es carrega amb `fetch`, cal un servidor local (obrir `index.html` directament no funciona):

```bash
python -m http.server 8000
# o bé
npx serve .
```

I obre <http://localhost:8000>.

## Afegir una aplicació

La via principal és la web: **Afegeix la teva app** → entra amb el teu correu → omple el formulari. L'aplicació queda pendent fins que un moderador la publica.

Alternativa: obrir una [proposta a GitHub](https://github.com/vmoren12/educapps/issues/new?template=nova-aplicacio.yml). Detalls a [CONTRIBUTING.md](CONTRIBUTING.md).

## Còpia diària del catàleg

`data/apps.json` **es genera automàticament**: no l'editis a mà, perquè els canvis es perdrien. Cada dia, el flux [.github/workflows/sync.yml](.github/workflows/sync.yml) executa `scripts/sync-catalog.mjs`, que llegeix les aplicacions publicades i les taxonomies de Supabase, valida el resultat amb `scripts/validate-apps.mjs` i, si hi ha canvis, en fa un commit. Es pot executar a mà des de *Actions → Còpia diària del catàleg → Run workflow*, o en local:

```bash
node scripts/sync-catalog.mjs
```

La consulta diària també evita que el projecte gratuït de Supabase es posi en pausa per inactivitat. GitHub desactiva els fluxos programats d'un repositori sense activitat durant 60 dies (n'avisa per correu): si passa, cal tornar-lo a activar des de la pestanya *Actions*.

Les taxonomies (`ambits`, `nivells`, `idiomes`) es gestionen a Supabase. Per afegir un àmbit nou, cal afegir-lo a la taula `ambits` i definir-ne els colors a `css/styles.css` (variables `--c-<id>` i `--c-<id>-tint`, en tema clar i fosc).

## Publicació

**GitHub Pages**: *Settings → Pages → Build and deployment → Deploy from a branch*, branca `main`, carpeta `/ (root)`, amb el domini propi `educapps.cat` (fitxer `CNAME`, que no s'ha d'esborrar). Els DNS són a Hostinger: registres `A`/`AAAA` del domini cap a GitHub Pages i `CNAME` de `www` cap a `vmoren12.github.io`. L'adreça antiga `https://vmoren12.github.io/educapps/` redirigeix al domini.

**Correu**: els enllaços d'accés s'envien per l'SMTP de Brevo des de `noreply@educapps.cat` (domini autenticat amb DKIM i DMARC).

**Netlify / Vercel / Cloudflare Pages**: importa el repositori sense ordre de compilació i amb el directori de publicació a l'arrel.

## Catàleg inicial

El catàleg inclou una selecció inicial de recursos web educatius coneguts perquè la interfície es pugui provar amb dades reals. La intenció és anar-hi incorporant les aplicacions creades per la comunitat docent.

## Llicència

Codi sota llicència [MIT](LICENSE). Cada aplicació enllaçada pertany a la seva autoria i es regeix per les seves pròpies condicions.
