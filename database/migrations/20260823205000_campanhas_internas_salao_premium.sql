alter table public.parceria_campanhas
  add column if not exists origem text not null default 'parceiro' check (origem in ('parceiro','salao_premium')),
  add column if not exists categoria_interna text null check (categoria_interna is null or categoria_interna in ('novidade','beneficio','comunicado','critico')),
  add column if not exists exige_parceiro boolean not null default true;

alter table public.parceria_campanhas alter column id_parceiro drop not null;

update public.parceria_campanhas
set origem = coalesce(origem,'parceiro'),
    exige_parceiro = case when id_parceiro is null then false else true end
where true;

create index if not exists parceria_campanhas_origem_status_idx
  on public.parceria_campanhas (origem, status, prioridade desc, inicio_em, fim_em);
