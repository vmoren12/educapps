-- =============================================================================
-- 05 · Imatges de portada i eines de moderació
-- Requereix 01–04. Es pot tornar a executar sense perill.
-- =============================================================================

-- Columna d'imatge ----------------------------------------------------------------
-- Desa el camí dins del bucket «portades»: <id d'usuari>/<uuid>.webp

alter table public.apps add column if not exists imatge text;
alter table public.apps drop constraint if exists apps_imatge_check;
alter table public.apps add constraint apps_imatge_check
  check (imatge is null or imatge ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$');

-- Un autor només pot enllaçar imatges de la seva carpeta.
create or replace function public.validar_imatge_app()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.imatge is not null
     and (tg_op = 'INSERT' or new.imatge is distinct from old.imatge)
     and not public.es_privilegiat()
     and split_part(new.imatge, '/', 1) <> (select auth.uid())::text then
    raise exception 'La imatge de portada no és vàlida.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists abans_validar_imatge on public.apps;
create trigger abans_validar_imatge
  before insert or update on public.apps
  for each row execute function public.validar_imatge_app();

-- La vista pública inclou la imatge (columna nova al final).
create or replace view public.apps_publicades as
  select id, slug, titol, descripcio, detall, url, codi, autor_nom, autor_url,
         ambit, nivells, idiomes, etiquetes, publicada_at, updated_at, imatge
  from public.apps
  where estat = 'publicada';

grant select on public.apps_publicades to anon, authenticated;

-- Emmagatzematge: bucket públic «portades» ----------------------------------------
-- Màxim 1 MB per fitxer; només WebP, JPEG i PNG.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portades', 'portades', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portades: pujar a la carpeta propia" on storage.objects;
drop policy if exists "portades: veure les propies" on storage.objects;
drop policy if exists "portades: esborrar les propies" on storage.objects;

create policy "portades: pujar a la carpeta propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portades' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Necessària per poder esborrar fitxers amb l'API (la lectura pública no la requereix).
create policy "portades: veure les propies" on storage.objects
  for select to authenticated
  using (bucket_id = 'portades' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_moderador())));

create policy "portades: esborrar les propies" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portades' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_moderador())));

-- Moderació ------------------------------------------------------------------------

-- Correu de qui ha proposat una aplicació, només visible per a moderadors.
create or replace function public.correu_usuari(usuari uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from auth.users u
  where u.id = usuari and public.es_moderador();
$$;

revoke execute on function public.correu_usuari(uuid) from public, anon;
grant execute on function public.correu_usuari(uuid) to authenticated;
