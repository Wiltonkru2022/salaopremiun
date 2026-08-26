create table if not exists public.salao_portfolio_fotos (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  imagem_url text not null,
  legenda text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists salao_portfolio_fotos_salao_idx
  on public.salao_portfolio_fotos (id_salao, ativo, ordem, created_at desc);

alter table public.salao_portfolio_fotos enable row level security;

drop policy if exists "salao_portfolio_fotos_public_read_active" on public.salao_portfolio_fotos;
create policy "salao_portfolio_fotos_public_read_active"
  on public.salao_portfolio_fotos
  for select
  to anon, authenticated
  using (ativo = true);

grant select on public.salao_portfolio_fotos to anon, authenticated;
