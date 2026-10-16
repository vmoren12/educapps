# Com contribuir

Gràcies per voler fer créixer EducApps. Totes les aportacions són benvingudes: noves aplicacions, correccions de dades i millores de la web.

## Criteris per incloure una aplicació

- Té una finalitat educativa clara i es pot fer servir a l'aula.
- És d'accés gratuït i funciona al navegador.
- L'alumnat la pot fer servir sense cedir dades personals innecessàries.
- L'enllaç és públic i estable.
- Es prioritzen les aplicacions creades per docents i les de codi obert.

## Proposar una aplicació sense Git

Omple el formulari de [nova aplicació](https://github.com/vmoren12/educapps/issues/new?template=nova-aplicacio.yml). Algú de l'equip la revisarà i l'afegirà al catàleg.

## Afegir-la directament

1. Fes un *fork* del repositori i crea una branca.
2. Afegeix l'entrada a la llista `apps` de `data/apps.json`.
3. Executa `node scripts/validate-apps.mjs`.
4. Obre una *pull request*. La validació s'executa automàticament.

### Camps

| Camp | Obligatori | Descripció |
| --- | --- | --- |
| `id` | Sí | Identificador únic en minúscules i guions. Defineix l'URL de la fitxa. |
| `titol` | Sí | Nom de l'aplicació. |
| `descripcio` | Sí | Resum de 160 caràcters com a màxim. Es mostra a la targeta. |
| `detall` | No | Descripció llarga per a la fitxa de detall. |
| `url` | Sí | Adreça pública de l'aplicació. |
| `codi` | No | Repositori del codi font. |
| `autor.nom` | Sí | Persona, centre o col·lectiu autor. |
| `autor.url` | No | Web o perfil de l'autoria. |
| `ambit` | Sí | Un `id` de la llista `ambits`. |
| `nivells` | Sí | Un o més `id` de la llista `nivells`. |
| `idiomes` | Sí | Un o més `id` de la llista `idiomes`. |
| `etiquetes` | No | Paraules clau que ajuden a la cerca. |
| `afegit` | Sí | Data d'incorporació, en format `AAAA-MM-DD`. |

## Millores de la web

- Sense dependències ni compilació: HTML, CSS i JavaScript moderns (mòduls ES).
- Mantén l'accessibilitat: navegació amb teclat, contrast suficient i etiquetes ARIA.
- No afegeixis scripts, tipografies ni serveis de tercers: la CSP de `index.html` ho bloqueja intencionadament.
- Prova la web en local amb un servidor (`python -m http.server`) en tema clar i fosc i a amplada de mòbil.
