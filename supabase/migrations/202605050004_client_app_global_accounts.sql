create table if not exists public.clientes_app_auth (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  telefone text null,
  senha_hash text not null,
  preferencias_gerais text null,
  ativo boolean not null default true,
  ultimo_login_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists clientes_app_auth_email_uidx
  on public.clientes_app_auth (lower(email));

alter table public.clientes_auth
  add column if not exists app_conta_id uuid null references public.clientes_app_auth(id) on delete set null;

create index if not exists clientes_auth_app_conta_idx
  on public.clientes_auth (app_conta_id, id_salao)
  where app_conta_id is not null;
