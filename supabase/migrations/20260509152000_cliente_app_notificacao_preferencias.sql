alter table public.clientes_app_auth
  add column if not exists notificacoes_ativas boolean not null default true,
  add column if not exists notificacao_app_ativa boolean not null default true,
  add column if not exists notificacao_email_ativa boolean not null default true;

create index if not exists clientes_app_auth_notificacoes_idx
  on public.clientes_app_auth (notificacoes_ativas, notificacao_app_ativa, notificacao_email_ativa);
