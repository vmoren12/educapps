-- =============================================================================
-- 04 · Assignar el rol de moderador
-- Abans: crea el teu usuari a Supabase → Authentication → Users → Add user
--        (o registra't a la web quan hi hagi l'inici de sessió).
-- Substitueix EL_TEU_CORREU pel correu real i executa. Repeteix per a cada moderador.
-- =============================================================================

update public.profiles
set rol = 'moderador'
where id = (select id from auth.users where email = lower('EL_TEU_CORREU'));

-- Comprovació: llista de moderadors actuals.
select u.email, p.nom, p.rol
from public.profiles p
join auth.users u on u.id = p.id
where p.rol = 'moderador';
