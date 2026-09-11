create table if not exists public.parceria_criativos_locais (
  id uuid primary key default gen_random_uuid(),
  id_campanha uuid not null references public.parceria_campanhas(id) on delete cascade,
  local_exibicao text not null,
  imagem_url text not null,
  formato text not null default 'card',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint parceria_criativos_locais_local_check check (
    local_exibicao in ('app_cliente_menu','parceiros','app_cliente','dashboard','app_profissional')
  ),
  unique (id_campanha, local_exibicao)
);

create index if not exists idx_parceria_criativos_locais_campanha
  on public.parceria_criativos_locais (id_campanha, local_exibicao)
  where ativo = true;

alter table public.parceria_criativos_locais enable row level security;
revoke all on public.parceria_criativos_locais from anon, authenticated;

comment on table public.parceria_criativos_locais is
  'Artes especificas por ponto de exibicao das campanhas. O backend usa a arte geral como fallback quando nao houver uma arte dedicada.';
