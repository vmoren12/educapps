# EducApps

Repositori obert d'aplicacions educatives creades i recomanades per la comunitat docent. Una web estàtica, ràpida i accessible per descobrir petites i mitjanes aplicacions web allotjades a GitHub Pages, Netlify o serveis similars.

## Funcionalitats

- **Cerca instantània** per nom, descripció, etiquetes i autoria, tolerant a accents i a la ela geminada.
- **Filtres combinables** per àmbit, nivell educatiu i idioma, amb recomptes en temps real.
- **Favorits** desats al navegador i sincronitzats entre pestanyes.
- **Fitxa de detall** de cada aplicació, amb enllaç directe per compartir-la.
- **URL compartibles**: la cerca, els filtres i la fitxa oberta queden reflectits a l'adreça.
- **Vista de graella o de llista**, ordenació per rellevància, data o alfabètica.
- **Tema clar i fosc**, que segueix el sistema o es pot triar manualment.
- **Responsive**, amb calaix de filtres a mòbil.
- **Accessible**: navegació amb teclat (`/` per cercar), etiquetes ARIA, respecte per `prefers-reduced-motion`.
- **Privacitat**: sense galetes, analítica ni peticions a tercers. Política de seguretat de contingut (CSP) estricta.

## Estructura

```
├── index.html              Pàgina única
├── css/styles.css          Estils (tokens, components, responsive)
├── js/
│   ├── main.js             Arrencada, estat i esdeveniments
│   ├── catalog.js          Cerca, filtres, recomptes i ordenació (funcions pures)
│   ├── render.js           Generació del DOM i portades generatives
│   ├── store.js            Favorits i preferències (localStorage)
│   ├── url-state.js        Sincronització amb la URL
│   ├── theme-init.js       Aplica el tema abans de pintar
│   └── utils.js
├── data/apps.json          Catàleg i taxonomies
├── scripts/validate-apps.mjs   Validador del catàleg
└── .github/                Plantilles d'issues i PR, validació automàtica
```

No hi ha dependències ni procés de compilació.

## Executar en local

Com que el catàleg es carrega amb `fetch`, cal un servidor local (obrir `index.html` directament no funciona):

```bash
python -m http.server 8000
# o bé
npx serve .
```

I obre <http://localhost:8000>.

## Afegir una aplicació

Hi ha dues vies:

1. **Sense Git**: obre una [proposta d'aplicació](https://github.com/vmoren12/educapps/issues/new?template=nova-aplicacio.yml) i omple el formulari.
2. **Amb Git**: afegeix una entrada a `data/apps.json` i obre una *pull request*. Detalls a [CONTRIBUTING.md](CONTRIBUTING.md).

```json
{
  "id": "fraccions-visuals",
  "titol": "Fraccions visuals",
  "descripcio": "Representa i compara fraccions amb models d'àrea i recta numèrica.",
  "detall": "Text llarg opcional que es mostra a la fitxa.",
  "url": "https://usuari.github.io/fraccions/",
  "codi": "https://github.com/usuari/fraccions",
  "autor": { "nom": "Nom Cognom", "url": "https://..." },
  "ambit": "matematiques",
  "nivells": ["primaria"],
  "idiomes": ["ca"],
  "etiquetes": ["fraccions", "manipulables"],
  "afegit": "2026-10-16"
}
```

Valida els canvis abans de publicar-los:

```bash
node scripts/validate-apps.mjs
```

Les taxonomies (`ambits`, `nivells`, `idiomes`) es defineixen al mateix fitxer. Per afegir un àmbit nou, afegeix-lo a `ambits` i defineix-ne els colors a `css/styles.css` (variables `--c-<id>` i `--c-<id>-tint`, en tema clar i fosc).

## Publicació

**GitHub Pages**: *Settings → Pages → Build and deployment → Deploy from a branch*, branca `main`, carpeta `/ (root)`. La web quedarà a `https://vmoren12.github.io/educapps/`.

**Netlify / Vercel / Cloudflare Pages**: importa el repositori sense ordre de compilació i amb el directori de publicació a l'arrel.

## Catàleg inicial

El catàleg inclou una selecció inicial de recursos web educatius coneguts perquè la interfície es pugui provar amb dades reals. La intenció és anar-hi incorporant les aplicacions creades per la comunitat docent.

## Llicència

Codi sota llicència [MIT](LICENSE). Cada aplicació enllaçada pertany a la seva autoria i es regeix per les seves pròpies condicions.
