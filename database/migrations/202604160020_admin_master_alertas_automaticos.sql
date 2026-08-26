alter table public.alertas_sistema
  add column if not exists chave text,
  add column if not exists automatico boolean not null default false,
  add column if not exists atualizado_em timestamptz not null default now();

update public.alertas_sistema
set atualizado_em = coalesce(atualizado_em, criado_em, now()),
    automatico = coalesce(automatico, false)
where atualizado_em is null
   or automatico is null;

create unique index if not exists alertas_sistema_chave_unique_idx
  on public.alertas_sistema (chave);

create index if not exists alertas_sistema_ativos_gravidade_idx
  on public.alertas_sistema (automatico, resolvido, gravidade, criado_em desc);

create index if not exists alertas_sistema_tipo_salao_idx
  on public.alertas_sistema (tipo, id_salao, criado_em desc);
