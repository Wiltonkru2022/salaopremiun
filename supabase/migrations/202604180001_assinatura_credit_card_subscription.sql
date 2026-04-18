alter table public.assinaturas
  add column if not exists asaas_credit_card_token text,
  add column if not exists asaas_credit_card_brand text,
  add column if not exists asaas_credit_card_last4 text,
  add column if not exists asaas_credit_card_tokenized_at timestamptz,
  add column if not exists asaas_subscription_id text,
  add column if not exists asaas_subscription_status text;

alter table public.assinaturas_cobrancas
  add column if not exists asaas_subscription_id text;

create index if not exists assinaturas_asaas_subscription_idx
  on public.assinaturas (asaas_subscription_id)
  where asaas_subscription_id is not null;

create index if not exists assinaturas_cobrancas_asaas_subscription_idx
  on public.assinaturas_cobrancas (asaas_subscription_id, created_at desc)
  where asaas_subscription_id is not null;
