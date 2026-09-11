create table if not exists public.security_login_attempts (
  id uuid primary key default gen_random_uuid(),
  tipo_usuario text not null,
  user_id uuid null,
  id_salao uuid null,
  identidade text null,
  ip text null,
  user_agent text null,
  risco text not null default 'baixo',
  criado_em timestamptz not null default timezone('utc', now()),
  constraint security_login_attempts_tipo_usuario_check
    check (tipo_usuario in ('cliente', 'salao', 'profissional'))
);

alter table public.security_login_attempts enable row level security;

create index if not exists idx_security_login_attempts_user_recent
  on public.security_login_attempts (tipo_usuario, user_id, criado_em desc)
  where user_id is not null;

create index if not exists idx_security_login_attempts_identity_recent
  on public.security_login_attempts (tipo_usuario, identidade, criado_em desc)
  where identidade is not null;

create index if not exists idx_security_login_attempts_cleanup
  on public.security_login_attempts (criado_em);
