# Com contribuir

Gràcies per voler fer créixer EducApps. Totes les aportacions són benvingudes: noves aplicacions, correccions de dades i millores de la web.

## Criteris per incloure una aplicació

- Té una finalitat educativa clara i es pot fer servir a l'aula.
- És d'accés gratuït i funciona al navegador.
- L'alumnat la pot fer servir sense cedir dades personals innecessàries.
- L'enllaç és públic i estable.
- Es prioritzen les aplicacions creades per docents i les de codi obert.

## Proposar una aplicació

La via principal és la web: **Afegeix la teva app** a <https://educapps.cat>, entra amb el teu correu i omple el formulari. L'aplicació queda pendent fins que un moderador la revisa i la publica. Des de «El meu compte» la pots editar o esborrar quan vulguis.

Si no vols crear un compte, omple el formulari de [nova aplicació](https://github.com/vmoren12/educapps/issues/new?template=nova-aplicacio.yml) a GitHub i algú de l'equip l'afegirà.

## Corregir dades d'una aplicació

Si és teva, edita-la des de «El meu compte». Si no, fes servir «Informa d'un problema» a la fitxa de l'aplicació.

El fitxer `data/apps.json` és una còpia de reserva que **es genera cada dia automàticament** a partir de Supabase: no l'editis amb una *pull request*, perquè els canvis es perdrien.

## Millores de la web

- Sense dependències ni compilació: HTML, CSS i JavaScript moderns (mòduls ES).
- Mantén l'accessibilitat: navegació amb teclat, contrast suficient i etiquetes ARIA.
- No afegeixis scripts, tipografies ni serveis de tercers: la CSP de `index.html` ho bloqueja intencionadament.
- Prova la web en local amb un servidor (`python -m http.server`) en tema clar i fosc i a amplada de mòbil.
