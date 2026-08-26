alter table public.saloes
  add column if not exists onboarding_concluido boolean not null default true,
  add column if not exists onboarding_etapa text not null default 'concluido',
  add column if not exists onboarding_concluido_em timestamptz;

comment on column public.saloes.onboarding_concluido is
  'Indica se o salão concluiu o onboarding inicial obrigatório.';

comment on column public.saloes.onboarding_etapa is
  'Última etapa do onboarding inicial do salão.';

create or replace function public.fn_salao_definir_onboarding_inicial()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.onboarding_concluido := false;
  new.onboarding_etapa := 'perfil';
  new.onboarding_concluido_em := null;
  return new;
end;
$$;

drop trigger if exists trg_salao_onboarding_inicial on public.saloes;

create trigger trg_salao_onboarding_inicial
before insert on public.saloes
for each row
execute function public.fn_salao_definir_onboarding_inicial();
