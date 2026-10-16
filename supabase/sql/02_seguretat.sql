-- =============================================================================
-- 02 · Seguretat: funcions, disparadors, permisos i Row Level Security
-- Requereix 01_esquema.sql. Es pot tornar a executar sense perill.
-- =============================================================================

-- Funcions auxiliars -----------------------------------------------------------

-- Cert si qui fa la petició és moderador.
create or replace function public.es_moderador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'moderador'
  );
$$;

-- Cert per a moderadors i per a l'administració (SQL Editor, clau secreta).
create or replace function public.es_privilegiat()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated') or public.es_moderador();
$$;

-- Genera un identificador únic llegible a partir del títol: «Fraccions visuals» → fraccions-visuals
create or replace function public.generar_slug(text_base text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidat text;
  n int := 1;
begin
  base := lower(extensions.unaccent(replace(coalesce(text_base, ''), '·', '')));
  base := trim(both '-' from regexp_replace(base, '[^a-z0-9]+', '-', 'g'));
  base := trim(both '-' from left(base, 60));
  if base = '' then base := 'app'; end if;
  candidat := base;
  while exists (select 1 from public.apps where slug = candidat) loop
    n := n + 1;
    candidat := base || '-' || n;
  end loop;
  return candidat;
end;
$$;

-- Perfil automàtic en registrar-se -------------------------------------------

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nom text := btrim(new.raw_user_meta_data ->> 'nom');
begin
  insert into public.profiles (id, nom)
  values (new.id, case when char_length(nom) between 2 and 80 then nom end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists en_crear_usuari on auth.users;
create trigger en_crear_usuari
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Perfils per a usuaris que ja existissin abans d'aquest script.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- Ningú no es pot autoassignar el rol de moderador.
create or replace function public.protegir_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_privilegiat() then
    new.rol := old.rol;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists abans_desar_perfil on public.profiles;
create trigger abans_desar_perfil
  before update on public.profiles
  for each row execute function public.protegir_perfil();

-- Normalització i regles de les aplicacions -----------------------------------
-- · Les persones que no moderen sempre creen o editen en estat «pendent».
-- · Qualsevol edició d'un autor torna l'aplicació a revisió.
-- · Màxim 5 propostes pendents per persona.

create or replace function public.preparar_app()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  privilegiat boolean := public.es_privilegiat();
begin
  new.titol      := btrim(new.titol);
  new.descripcio := btrim(new.descripcio);
  new.detall     := nullif(btrim(new.detall), '');
  new.url        := btrim(new.url);
  new.codi       := nullif(btrim(new.codi), '');
  new.autor_nom  := btrim(new.autor_nom);
  new.autor_url  := nullif(btrim(new.autor_url), '');
  new.etiquetes  := coalesce((
    select array_agg(distinct lower(btrim(e)))
    from unnest(new.etiquetes) as e
    where btrim(e) <> ''
  ), '{}');

  if exists (select 1 from unnest(new.nivells) v where v not in (select id from public.nivells)) then
    raise exception 'Hi ha algun nivell educatiu desconegut.' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.idiomes) v where v not in (select id from public.idiomes)) then
    raise exception 'Hi ha algun idioma desconegut.' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.etiquetes) e where char_length(e) > 30) then
    raise exception 'Cada etiqueta pot tenir com a màxim 30 caràcters.' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if not privilegiat then
      new.estat        := 'pendent';
      new.motiu_rebuig := null;
      new.publicada_at := null;
      new.propietari   := auth.uid();
      new.created_at   := now();
      if (select count(*) from public.apps where propietari = auth.uid() and estat = 'pendent') >= 5 then
        raise exception 'Tens 5 propostes pendents de revisió. Espera que es revisin abans d''enviar-ne més.'
          using errcode = 'P0001';
      end if;
    end if;
    if coalesce(new.slug, '') = '' then
      new.slug := public.generar_slug(new.titol);
    end if;
  else
    new.updated_at := now();
    if not privilegiat then
      new.slug         := old.slug;
      new.propietari   := old.propietari;
      new.created_at   := old.created_at;
      new.publicada_at := old.publicada_at;
      new.estat        := 'pendent';
      new.motiu_rebuig := null;
    end if;
  end if;

  if new.estat = 'publicada' then
    new.publicada_at := coalesce(new.publicada_at, now());
    new.motiu_rebuig := null;
  end if;

  return new;
end;
$$;

drop trigger if exists abans_desar_app on public.apps;
create trigger abans_desar_app
  before insert or update on public.apps
  for each row execute function public.preparar_app();

-- Informes: l'autor sempre és qui l'envia.
create or replace function public.preparar_informe()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_privilegiat() then
    if tg_op = 'INSERT' then
      new.autor := auth.uid();
      new.resolt := false;
      new.created_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists abans_desar_informe on public.informes;
create trigger abans_desar_informe
  before insert or update on public.informes
  for each row execute function public.preparar_informe();

-- Permisos de taula --------------------------------------------------------------

revoke all on public.ambits, public.nivells, public.idiomes,
              public.profiles, public.apps, public.informes, public.apps_publicades
  from anon, authenticated;

grant select on public.ambits, public.nivells, public.idiomes, public.apps_publicades to anon, authenticated;
grant insert, update, delete on public.ambits, public.nivells, public.idiomes to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.apps to authenticated;
grant select, insert, update, delete on public.informes to authenticated;

revoke execute on function public.generar_slug(text) from public, anon;
grant execute on function public.generar_slug(text) to authenticated; -- el fa servir el disparador d'apps
revoke execute on function public.crear_perfil() from public, anon, authenticated;
grant execute on function public.es_moderador() to anon, authenticated;

-- Row Level Security ---------------------------------------------------------------

alter table public.ambits   enable row level security;
alter table public.nivells  enable row level security;
alter table public.idiomes  enable row level security;
alter table public.profiles enable row level security;
alter table public.apps     enable row level security;
alter table public.informes enable row level security;

-- Taxonomies: lectura pública, escriptura només moderadors.
do $$
declare t text;
begin
  foreach t in array array['ambits', 'nivells', 'idiomes'] loop
    execute format('drop policy if exists "lectura publica" on public.%I', t);
    execute format('drop policy if exists "moderadors gestionen" on public.%I', t);
    execute format('create policy "lectura publica" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "moderadors gestionen" on public.%I for all to authenticated using ((select public.es_moderador())) with check ((select public.es_moderador()))', t);
  end loop;
end;
$$;

-- Perfils: cadascú veu i edita el seu; moderadors veuen tots.
drop policy if exists "veure el propi perfil" on public.profiles;
drop policy if exists "editar el propi perfil" on public.profiles;
create policy "veure el propi perfil" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_moderador()));
create policy "editar el propi perfil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.es_moderador()))
  with check (id = (select auth.uid()) or (select public.es_moderador()));

-- Aplicacions.
drop policy if exists "veure publicades, propies o totes si modera" on public.apps;
drop policy if exists "crear les propies" on public.apps;
drop policy if exists "editar les propies" on public.apps;
drop policy if exists "esborrar les propies" on public.apps;
create policy "veure publicades, propies o totes si modera" on public.apps
  for select to authenticated
  using (estat = 'publicada' or propietari = (select auth.uid()) or (select public.es_moderador()));
create policy "crear les propies" on public.apps
  for insert to authenticated
  with check (propietari = (select auth.uid()) or (select public.es_moderador()));
create policy "editar les propies" on public.apps
  for update to authenticated
  using (propietari = (select auth.uid()) or (select public.es_moderador()))
  with check (propietari = (select auth.uid()) or (select public.es_moderador()));
create policy "esborrar les propies" on public.apps
  for delete to authenticated
  using (propietari = (select auth.uid()) or (select public.es_moderador()));

-- Informes: qualsevol registrat n'envia sobre apps publicades; només moderadors els gestionen.
drop policy if exists "enviar informes" on public.informes;
drop policy if exists "veure informes" on public.informes;
drop policy if exists "moderadors resolen informes" on public.informes;
drop policy if exists "moderadors esborren informes" on public.informes;
create policy "enviar informes" on public.informes
  for insert to authenticated
  with check (
    autor = (select auth.uid())
    and exists (select 1 from public.apps a where a.id = app_id and a.estat = 'publicada')
  );
create policy "veure informes" on public.informes
  for select to authenticated
  using (autor = (select auth.uid()) or (select public.es_moderador()));
create policy "moderadors resolen informes" on public.informes
  for update to authenticated
  using ((select public.es_moderador()))
  with check ((select public.es_moderador()));
create policy "moderadors esborren informes" on public.informes
  for delete to authenticated
  using ((select public.es_moderador()));
