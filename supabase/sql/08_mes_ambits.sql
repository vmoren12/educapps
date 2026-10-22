-- =============================================================================
-- 08 · Més àmbits perquè hi càpiguen totes les matèries
-- Requereix 01–07. Es pot tornar a executar: no duplica res.
--
-- · Afegeix Filosofia i valors, Economia i empresa, Educació física i
--   Tutoria i orientació.
-- · Reordena la llista (Eines d'aula queda al final). L'ordre relatiu dels àmbits
--   que ja existien no canvia, així que l'àmbit principal de les aplicacions
--   actuals continua sent el mateix.
-- =============================================================================

insert into public.ambits (id, nom, ordre) values
  ('matematiques', 'Matemàtiques', 1),
  ('ciencies', 'Ciències', 2),
  ('llengues', 'Llengües', 3),
  ('socials', 'Ciències socials', 4),
  ('filosofia', 'Filosofia i valors', 5),
  ('economia', 'Economia i empresa', 6),
  ('tecnologia', 'Tecnologia i programació', 7),
  ('arts', 'Arts i música', 8),
  ('educacio-fisica', 'Educació física', 9),
  ('tutoria', 'Tutoria i orientació', 10),
  ('eines', 'Eines d''aula', 11)
on conflict (id) do update set nom = excluded.nom, ordre = excluded.ordre;
