create table if not exists public.profissional_login_rate_limits (
  chave text primary key,
  tentativas integer not null default 0,
  primeira_tentativa_em timestamptz not null default timezone('utc', now()),
  bloqueado_ate timestamptz null,
  atualizado_em timestamptz not null default timezone('utc', now())
);
create index if not exists idx_profissional_login_rate_limits_bloqueado_ate
  on public.profissional_login_rate_limits (bloqueado_ate);
create index if not exists idx_profissional_login_rate_limits_atualizado_em
  on public.profissional_login_rate_limits (atualizado_em);
alter table public.profissional_login_rate_limits disable row level security;
create or replace function public.touch_profissional_login_rate_limits_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = timezone('utc', now());
  return new;
end;
$$;
drop trigger if exists trg_touch_profissional_login_rate_limits_atualizado_em
  on public.profissional_login_rate_limits;
create trigger trg_touch_profissional_login_rate_limits_atualizado_em
before update on public.profissional_login_rate_limits
for each row
execute function public.touch_profissional_login_rate_limits_atualizado_em();
create or replace function public.limpar_profissional_login_rate_limits_expirados()
returns void
language sql
as $$
  delete from public.profissional_login_rate_limits
  where
    (
      bloqueado_ate is null
      and primeira_tentativa_em < timezone('utc', now()) - interval '2 hours'
    )
    or (
      bloqueado_ate is not null
      and bloqueado_ate < timezone('utc', now()) - interval '2 hours'
    );
$$;
