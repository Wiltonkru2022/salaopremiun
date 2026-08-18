-- App Cliente: identidade global por CPF + data de nascimento.
-- Migration não destrutiva: preserva IDs, vínculos, histórico e hashes legados.

alter table public.clientes_app_auth
  add column if not exists cpf text,
  add column if not exists data_nascimento date,
  add column if not exists whatsapp text,
  add column if not exists auth_version integer not null default 1,
  add column if not exists migracao_identidade_concluida boolean not null default false,
  add column if not exists email_verificado_em timestamptz;

alter table public.clientes_app_auth
  alter column email drop not null;

update public.clientes_app_auth
set whatsapp = telefone
where whatsapp is null
  and telefone is not null;

update public.clientes_app_auth
set email = null
where email is not null
  and (
    lower(email) like '%@telefone.salaopremium.local'
    or lower(email) like '%@salaopremiun.local'
    or lower(email) like '%@salaopremium.local'
  );

alter table public.clientes_app_auth
  drop constraint if exists clientes_app_auth_cpf_format_check;

alter table public.clientes_app_auth
  add constraint clientes_app_auth_cpf_format_check
  check (cpf is null or cpf ~ '^[0-9]{11}$');

create unique index if not exists clientes_app_auth_cpf_unique
  on public.clientes_app_auth (cpf)
  where cpf is not null;

create index if not exists clientes_app_auth_migracao_idx
  on public.clientes_app_auth (migracao_identidade_concluida, ativo)
  where ativo = true;

-- O mesmo e-mail pode existir no vínculo de salões diferentes.
-- A conta global continua controlando a identidade da pessoa.
alter table public.clientes_auth
  drop constraint if exists clientes_auth_email_key;

drop index if exists public.clientes_auth_email_key;

create unique index if not exists clientes_auth_salao_email_uidx
  on public.clientes_auth (id_salao, lower(email))
  where email is not null;

create unique index if not exists clientes_auth_salao_conta_uidx
  on public.clientes_auth (id_salao, app_conta_id)
  where app_conta_id is not null;

create table if not exists public.cliente_app_email_verificacoes (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid null references public.clientes_app_auth(id) on delete cascade,
  finalidade text not null check (finalidade in (
    'recuperar_acesso_email',
    'recuperar_acesso_identidade',
    'alterar_email',
    'verificar_email_cadastro'
  )),
  email text not null,
  codigo_hash text not null,
  expira_em timestamptz not null,
  tentativas integer not null default 0,
  consumido_em timestamptz null,
  criado_em timestamptz not null default timezone('utc', now()),
  ip_hash text null,
  user_agent_hash text null
);

create index if not exists cliente_app_email_verificacoes_lookup_idx
  on public.cliente_app_email_verificacoes (conta_id, finalidade, email, criado_em desc)
  where consumido_em is null;

alter table public.cliente_app_email_verificacoes enable row level security;
revoke all on table public.cliente_app_email_verificacoes from anon, authenticated;

create table if not exists public.cliente_app_migracao_tokens (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cliente uuid not null references public.clientes(id) on delete cascade,
  conta_id uuid null references public.clientes_app_auth(id) on delete set null,
  token_hash text not null,
  expira_em timestamptz not null,
  consumido_em timestamptz null,
  criado_por_usuario uuid null references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default timezone('utc', now())
);

create unique index if not exists cliente_app_migracao_tokens_hash_uidx
  on public.cliente_app_migracao_tokens (token_hash);

create index if not exists cliente_app_migracao_tokens_cliente_idx
  on public.cliente_app_migracao_tokens (id_salao, id_cliente, criado_em desc);

alter table public.cliente_app_migracao_tokens enable row level security;
revoke all on table public.cliente_app_migracao_tokens from anon, authenticated;
