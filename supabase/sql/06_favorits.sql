-- =============================================================================
-- 06 · Favorits associats al compte
-- Requereix 01–05. Es pot tornar a executar sense perill (no esborra dades).
-- =============================================================================

-- Cada fila és una aplicació que una persona ha marcat com a favorita.
-- Es fa servir l'identificador públic (slug), que és immutable i és el que fa servir la web.
create table if not exists public.favorits (
  usuari     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app_slug   text not null references public.apps (slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuari, app_slug)
);

comment on table public.favorits is 'Favorits de cada persona registrada. Privats: cadascú només veu els seus.';

-- Per esborrar ràpidament els favorits quan s'esborra una aplicació.
create index if not exists favorits_app_slug_idx on public.favorits (app_slug);

-- Permisos ------------------------------------------------------------------------

revoke all on public.favorits from public, anon, authenticated;
grant select, insert, delete on public.favorits to authenticated;

alter table public.favorits enable row level security;

drop policy if exists "veure els propis favorits" on public.favorits;
drop policy if exists "afegir favorits propis" on public.favorits;
drop policy if exists "treure favorits propis" on public.favorits;

create policy "veure els propis favorits" on public.favorits
  for select to authenticated
  using (usuari = (select auth.uid()));

-- Només es poden marcar aplicacions publicades.
create policy "afegir favorits propis" on public.favorits
  for insert to authenticated
  with check (
    usuari = (select auth.uid())
    and exists (select 1 from public.apps a where a.slug = app_slug and a.estat = 'publicada')
  );

create policy "treure favorits propis" on public.favorits
  for delete to authenticated
  using (usuari = (select auth.uid()));
