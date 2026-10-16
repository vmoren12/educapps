-- =============================================================================
-- 01 · Esquema: taxonomies, perfils, aplicacions i informes
-- Executa'l a Supabase → SQL Editor → New query → Run.
-- Es pot tornar a executar sense perill (no esborra dades).
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- Taxonomies ------------------------------------------------------------------

create table if not exists public.ambits (
  id    text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom   text not null check (char_length(nom) between 2 and 60),
  ordre smallint not null default 0
);

create table if not exists public.nivells (
  id    text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom   text not null check (char_length(nom) between 2 and 60),
  ordre smallint not null default 0
);

create table if not exists public.idiomes (
  id    text primary key check (id ~ '^[a-z]{2,3}$'),
  nom   text not null check (char_length(nom) between 2 and 60),
  ordre smallint not null default 0
);

-- Perfils (un per usuari registrat; privats) ----------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nom        text check (nom is null or char_length(nom) between 2 and 80),
  centre     text check (centre is null or char_length(centre) <= 120),
  web        text check (web is null or web ~* '^https?://\S+$'),
  rol        text not null default 'docent' check (rol in ('docent', 'moderador')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Dades de les persones registrades. No són públiques.';

-- Aplicacions -----------------------------------------------------------------

create table if not exists public.apps (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  titol        text not null check (char_length(titol) between 2 and 80),
  descripcio   text not null check (char_length(descripcio) between 20 and 160),
  detall       text check (detall is null or char_length(detall) <= 2000),
  url          text not null unique check (url ~* '^https://\S+$' and char_length(url) <= 500),
  codi         text check (codi is null or (codi ~* '^https://\S+$' and char_length(codi) <= 500)),
  autor_nom    text not null check (char_length(autor_nom) between 2 and 120),
  autor_url    text check (autor_url is null or (autor_url ~* '^https?://\S+$' and char_length(autor_url) <= 500)),
  ambit        text not null references public.ambits (id) on update cascade,
  nivells      text[] not null check (cardinality(nivells) between 1 and 10),
  idiomes      text[] not null check (cardinality(idiomes) between 1 and 10),
  etiquetes    text[] not null default '{}' check (cardinality(etiquetes) <= 10),
  estat        text not null default 'pendent' check (estat in ('pendent', 'publicada', 'rebutjada')),
  motiu_rebuig text check (motiu_rebuig is null or char_length(motiu_rebuig) <= 500),
  propietari   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  publicada_at timestamptz
);

comment on column public.apps.estat is 'pendent: en revisió · publicada: visible a la web · rebutjada: no visible, amb motiu';

create index if not exists apps_estat_idx on public.apps (estat);
create index if not exists apps_propietari_idx on public.apps (propietari);
create index if not exists apps_ambit_idx on public.apps (ambit);

-- Informes de problemes (enllaç trencat, contingut inadequat...) --------------

create table if not exists public.informes (
  id         bigint generated always as identity primary key,
  app_id     uuid not null references public.apps (id) on delete cascade,
  motiu      text not null check (motiu in ('enllac-trencat', 'contingut-inadequat', 'dades-incorrectes', 'altres')),
  comentari  text check (comentari is null or char_length(comentari) <= 1000),
  autor      uuid references auth.users (id) on delete set null default auth.uid(),
  resolt     boolean not null default false,
  created_at timestamptz not null default now()
);

-- Una persona no pot obrir dos informes pendents sobre la mateixa aplicació.
create unique index if not exists informes_un_obert_per_persona
  on public.informes (app_id, autor) where not resolt;

-- Vista pública: només aplicacions publicades i només camps públics -----------
-- S'executa amb els permisos del propietari de la vista (no del visitant), de
-- manera que el públic pot llegir el catàleg sense accés a la taula base.

create or replace view public.apps_publicades as
  select id, slug, titol, descripcio, detall, url, codi, autor_nom, autor_url,
         ambit, nivells, idiomes, etiquetes, publicada_at, updated_at
  from public.apps
  where estat = 'publicada';

comment on view public.apps_publicades is 'Catàleg públic. Intencionadament sense security_invoker.';
