alter table public.saloes
  add column if not exists pix_modulo_ativo boolean not null default true;

alter table public.servicos
  add column if not exists onboarding_chave text;

alter table public.profissionais
  add column if not exists onboarding_chave text;

alter table public.produtos
  add column if not exists onboarding_chave text;

create unique index if not exists servicos_onboarding_chave_uidx
  on public.servicos (id_salao, onboarding_chave)
  where onboarding_chave is not null;

create unique index if not exists profissionais_onboarding_chave_uidx
  on public.profissionais (id_salao, onboarding_chave)
  where onboarding_chave is not null;

create unique index if not exists produtos_onboarding_chave_uidx
  on public.produtos (id_salao, onboarding_chave)
  where onboarding_chave is not null;

comment on column public.saloes.pix_modulo_ativo is
  'Preferencia do salao para uso de Pix no onboarding e configuracoes financeiras.';
comment on column public.servicos.onboarding_chave is
  'Chave idempotente usada durante o onboarding inicial.';
comment on column public.profissionais.onboarding_chave is
  'Chave idempotente usada durante o onboarding inicial.';
comment on column public.produtos.onboarding_chave is
  'Chave idempotente usada durante o onboarding inicial.';
