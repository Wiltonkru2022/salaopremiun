alter table public.profissionais
  add column if not exists notificacoes_ativas boolean not null default true,
  add column if not exists notificacao_app_ativa boolean not null default true,
  add column if not exists notificacao_email_ativa boolean not null default true;

create index if not exists idx_profissionais_notificacoes
  on public.profissionais (id_salao, id, notificacoes_ativas, notificacao_app_ativa);
