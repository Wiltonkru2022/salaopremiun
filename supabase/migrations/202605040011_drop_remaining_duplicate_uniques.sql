alter table public.assinaturas
  drop constraint if exists assinaturas_id_salao_unique;

drop index if exists public.ux_assinaturas_id_salao;
drop index if exists public.ux_assinaturas_cobrancas_asaas_payment_id;
