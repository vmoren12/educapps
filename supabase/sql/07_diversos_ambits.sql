-- =============================================================================
-- 07 · Diversos àmbits per aplicació
-- Requereix 01–06. Es pot tornar a executar sense perill (no esborra dades).
--
-- · Columna nova «ambits» (llista). Les aplicacions existents hi reben el seu àmbit.
-- · «ambit» es manté com a àmbit principal (el primer de la llista, en l'ordre de la
--   taula «ambits»): és el que dona color a la targeta. El disparador el calcula sol.
-- =============================================================================

alter table public.apps add column if not exists ambits text[];

update public.apps
set ambits = array[ambit]
where ambits is null or cardinality(ambits) = 0;

alter table public.apps alter column ambits set not null;
alter table public.apps drop constraint if exists apps_ambits_check;
alter table public.apps add constraint apps_ambits_check check (cardinality(ambits) between 1 and 10);

create index if not exists apps_ambits_idx on public.apps using gin (ambits);

comment on column public.apps.ambits is 'Àmbits de l''aplicació, en l''ordre de la taula «ambits».';
comment on column public.apps.ambit is 'Àmbit principal: el primer de «ambits». El calcula el disparador abans_ambits_app.';

-- Normalitza els àmbits ------------------------------------------------------------
-- · Treu repeticions i els ordena com a la taula «ambits».
-- · Rebutja àmbits que no existeixen.
-- · Si només s'envia «ambit» (versions antigues de la web), «ambits» passa a ser aquest.

create or replace function public.preparar_ambits_app()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ordenats text[];
begin
  if new.ambits is null or cardinality(new.ambits) = 0 then
    new.ambits := array[new.ambit];
  elsif tg_op = 'UPDATE' then
    -- Una edició que només canvia «ambit» (versió antiga de la web) substitueix la llista.
    if new.ambit is distinct from old.ambit and new.ambits = old.ambits then
      new.ambits := array[new.ambit];
    end if;
  end if;

  if exists (select 1 from unnest(new.ambits) v where v is null or v not in (select id from public.ambits)) then
    raise exception 'Hi ha algun àmbit desconegut.' using errcode = '23514';
  end if;

  select array_agg(a.id order by a.ordre) into ordenats
  from public.ambits a
  where a.id = any (new.ambits);

  new.ambits := ordenats;
  new.ambit := ordenats[1];
  return new;
end;
$$;

-- Els disparadors s'executen per ordre alfabètic: aquest va abans d'«abans_desar_app».
drop trigger if exists abans_ambits_app on public.apps;
create trigger abans_ambits_app
  before insert or update on public.apps
  for each row execute function public.preparar_ambits_app();

-- La vista pública inclou els àmbits (columna nova al final).
create or replace view public.apps_publicades as
  select id, slug, titol, descripcio, detall, url, codi, autor_nom, autor_url,
         ambit, nivells, idiomes, etiquetes, publicada_at, updated_at, imatge, ambits
  from public.apps
  where estat = 'publicada';

grant select on public.apps_publicades to anon, authenticated;
