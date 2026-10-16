# SQL de Supabase

Scripts de la base de dades d'EducApps, **numerats en ordre d'execució**.
Cada canvi nou de la base de dades s'afegeix com un fitxer nou amb el número següent; els fitxers ja executats no es modifiquen.

## Com executar-los

1. Obre el projecte a Supabase → **SQL Editor** → **New query**.
2. Copia el contingut sencer del fitxer i enganxa'l.
3. Prem **Run**. Si Supabase avisa d'operacions potencialment destructives (`drop policy`, `revoke`), confirma-ho: només reemplacen regles de seguretat, no esborren dades.
4. Marca'l com a executat a la taula de sota.

Els scripts 01–03 es poden tornar a executar sense perill.

## Registre

| Fitxer | Què fa | Executat |
| --- | --- | --- |
| [01_esquema.sql](01_esquema.sql) | Taules: àmbits, nivells, idiomes, perfils, aplicacions, informes; vista pública `apps_publicades` | ☐ |
| [02_seguretat.sql](02_seguretat.sql) | Funcions, disparadors, permisos i Row Level Security | ☐ |
| [03_dades_inicials.sql](03_dades_inicials.sql) | Taxonomies i les 19 aplicacions del catàleg actual | ☐ |
| [04_moderador.sql](04_moderador.sql) | Dona el rol de moderador a un correu (cal editar-lo abans) | ☐ |

## Regles que apliquen

- **Públic (sense sessió)**: llegeix només `apps_publicades` i les taxonomies.
- **Docent registrat**: crea aplicacions (sempre queden *pendents*), veu i edita només les seves; qualsevol edició torna l'aplicació a revisió. Màxim 5 propostes pendents alhora. Pot informar de problemes en aplicacions publicades.
- **Moderador**: veu i edita tot, publica o rebutja amb motiu, gestiona informes i taxonomies.
- Ningú no es pot donar el rol de moderador a si mateix; només des del SQL Editor (script 04).
- La base de dades valida: URL `https://`, llargades, àmbit/nivells/idiomes existents, URL i identificador únics. L'identificador (`slug`) es genera sol a partir del títol.

## Notes

- L'assessor de seguretat de Supabase pot avisar que `apps_publicades` és una *security definer view*. És intencionat: és l'única via de lectura pública i només exposa aplicacions publicades i camps públics.
- Els perfils (nom, centre, correu) **no són públics**. El nom que es mostra a cada aplicació és el camp `autor_nom`, que decideix qui la proposa.
- `03_dades_inicials.sql` es va generar a partir de `data/apps.json`.
