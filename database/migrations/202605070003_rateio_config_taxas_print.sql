alter table public.configuracoes_salao
  add column if not exists rateio_config jsonb not null default '{}'::jsonb;

comment on column public.configuracoes_salao.rateio_config is
  'Preferencias do salao para colunas e detalhes exibidos na impressao do rateio de comissoes.';
