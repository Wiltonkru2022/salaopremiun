create table if not exists public.user_security_status (
  user_id uuid primary key,
  tipo_usuario text not null,
  status text not null default 'ativo',
  motivo text null,
  risco_atual text not null default 'baixo',
  bloqueado_ate timestamptz null,
  verificacao_necessaria boolean not null default false,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now()),
  constraint user_security_status_tipo_usuario_check
    check (tipo_usuario in ('cliente', 'salao', 'profissional')),
  constraint user_security_status_status_check
    check (status in (
      'ativo',
      'verificacao_necessaria',
      'bloqueado_temporario',
      'bloqueado',
      'em_analise'
    ))
);

alter table public.user_security_status enable row level security;

create index if not exists idx_user_security_status_tipo_status
  on public.user_security_status (tipo_usuario, status);

create index if not exists idx_user_security_status_bloqueado_ate
  on public.user_security_status (bloqueado_ate)
  where bloqueado_ate is not null;

create or replace function public.set_user_security_status_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_user_security_status_updated_at on public.user_security_status;
create trigger trg_user_security_status_updated_at
before update on public.user_security_status
for each row
execute function public.set_user_security_status_updated_at();

create or replace function public.seed_user_security_status_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tipo text := coalesce(nullif(trim(TG_ARGV[0]), ''), 'salao');
begin
  insert into public.user_security_status (
    user_id,
    tipo_usuario,
    status,
    risco_atual,
    verificacao_necessaria,
    criado_em,
    atualizado_em
  )
  values (
    new.id,
    tipo,
    'ativo',
    'baixo',
    false,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_seed_user_security_status_usuarios on public.usuarios;
create trigger trg_seed_user_security_status_usuarios
after insert on public.usuarios
for each row
execute function public.seed_user_security_status_row('salao');

drop trigger if exists trg_seed_user_security_status_clientes_app_auth on public.clientes_app_auth;
create trigger trg_seed_user_security_status_clientes_app_auth
after insert on public.clientes_app_auth
for each row
execute function public.seed_user_security_status_row('cliente');

drop trigger if exists trg_seed_user_security_status_profissionais on public.profissionais;
create trigger trg_seed_user_security_status_profissionais
after insert on public.profissionais
for each row
execute function public.seed_user_security_status_row('profissional');

alter table public.saloes
  add column if not exists status_seguranca text not null default 'ativo',
  add column if not exists motivo_seguranca text null,
  add column if not exists bloqueado_ate timestamptz null;

create index if not exists idx_saloes_status_seguranca
  on public.saloes (status_seguranca);

create index if not exists idx_saloes_bloqueado_ate
  on public.saloes (bloqueado_ate)
  where bloqueado_ate is not null;

