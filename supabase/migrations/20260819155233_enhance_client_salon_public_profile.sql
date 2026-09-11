alter table public.saloes
  add column if not exists instagram_url text,
  add column if not exists acessibilidade boolean not null default false,
  add column if not exists wifi boolean not null default false,
  add column if not exists cafe boolean not null default false,
  add column if not exists ar_condicionado boolean not null default false;

alter table public.servicos
  add column if not exists imagem_url text;

alter table public.clientes_avaliacoes
  add column if not exists id_profissional uuid references public.profissionais(id) on delete set null,
  add column if not exists imagens_url jsonb not null default '[]'::jsonb;

update public.clientes_avaliacoes ca
set id_profissional = a.profissional_id
from public.agendamentos a
where ca.id_profissional is null
  and ca.id_agendamento = a.id
  and a.profissional_id is not null;

create index if not exists clientes_avaliacoes_id_profissional_idx
  on public.clientes_avaliacoes (id_profissional)
  where id_profissional is not null;
