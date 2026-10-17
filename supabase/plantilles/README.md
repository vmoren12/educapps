# Plantilles de correu

Textos en català dels correus que envia Supabase. Es configuren a mà al tauler:
**Authentication → Emails → Templates**.

| Plantilla de Supabase | Fitxer | Assumpte |
| --- | --- | --- |
| Magic Link | [enllac-acces.html](enllac-acces.html) | El teu enllaç d'accés a EducApps |
| Confirm signup | [confirmacio-registre.html](confirmacio-registre.html) | Benvinguda a EducApps: confirma el teu correu |

*Magic Link* s'envia a qui ja té compte; *Confirm signup*, la primera vegada que algú entra amb un correu nou.

## Com aplicar-les

1. Obre la plantilla a Supabase i escriu l'assumpte de la taula.
2. Al cos del missatge, esborra el text actual i enganxa-hi el contingut sencer del fitxer.
3. Prem **Save** i prova-ho demanant un enllaç des de la web.

Les plantilles fan servir `{{ .ConfirmationURL }}`, que Supabase substitueix per l'enllaç d'accés. Els estils van dins de cada etiqueta perquè els programes de correu no llegeixen fulls d'estil externs.
