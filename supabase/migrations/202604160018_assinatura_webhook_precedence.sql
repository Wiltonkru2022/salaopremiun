create extension if not exists pgcrypto;

create or replace function public.fn_asaas_webhook_event_order(
  p_evento text,
  p_payment_status text
)
returns integer
language sql
immutable
as $$
  with normalizado as (
    select
      upper(coalesce(p_evento, '')) as evento,
      upper(coalesce(p_payment_status, '')) as payment_status
  )
  select case
    when evento in (
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
      'PAYMENT_RECEIVED_IN_CASH_UNDONE',
      'PAYMENT_BANK_SLIP_CANCELLED',
      'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
    )
    or payment_status in (
      'REFUNDED',
      'REFUND_REQUESTED',
      'CHARGEBACK_DISPUTE',
      'CHARGEBACK_REQUESTED',
      'CHARGEBACK_RECEIVED',
      'AWAITING_CHARGEBACK_REVERSAL',
      'DUNNING_REQUESTED',
      'DUNNING_RECEIVED',
      'DUNNING_RETURNED',
      'CANCELLED'
    ) then 120
    when evento in (
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_RECEIVED_IN_CASH'
    )
    or payment_status in (
      'RECEIVED',
      'CONFIRMED',
      'RECEIVED_IN_CASH'
    ) then 100
    when evento = 'PAYMENT_OVERDUE'
      or payment_status = 'OVERDUE' then 60
    when evento = 'PAYMENT_RESTORED'
      or payment_status = 'PENDING' then 40
    else 20
  end
  from normalizado;
$$;

revoke all on function public.fn_asaas_webhook_event_order(text, text)
  from public, anon, authenticated;
grant execute on function public.fn_asaas_webhook_event_order(text, text)
  to service_role;

alter table public.asaas_webhook_eventos
  add column if not exists id_salao uuid,
  add column if not exists id_assinatura uuid,
  add column if not exists id_cobranca uuid,
  add column if not exists event_order integer not null default 0,
  add column if not exists decisao text;

alter table public.assinaturas_cobrancas
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists webhook_event_order integer not null default 0,
  add column if not exists webhook_processed_at timestamptz,
  add column if not exists asaas_status text;

update public.asaas_webhook_eventos
set event_order = public.fn_asaas_webhook_event_order(evento, payment_status),
    updated_at = now()
where coalesce(event_order, 0) = 0;

update public.assinaturas_cobrancas
set webhook_event_order = case
    when lower(coalesce(status, '')) in ('ativo', 'ativa', 'pago', 'paid', 'received', 'confirmed') then 100
    when lower(coalesce(status, '')) in ('cancelada', 'cancelado', 'cancelled', 'refunded', 'estornado') then 120
    when lower(coalesce(status, '')) in ('vencida', 'vencido', 'overdue') then 60
    when lower(coalesce(status, '')) in ('pendente', 'pending') then 40
    else public.fn_asaas_webhook_event_order(webhook_last_event, asaas_status)
  end,
  webhook_processed_at = coalesce(webhook_processed_at, updated_at, created_at, now())
where coalesce(webhook_event_order, 0) = 0
  and (
    webhook_last_event is not null
    or asaas_status is not null
    or status is not null
  );

create index if not exists asaas_webhook_eventos_salao_idx
  on public.asaas_webhook_eventos (id_salao, ultimo_recebido_em desc);

create index if not exists asaas_webhook_eventos_decisao_idx
  on public.asaas_webhook_eventos (decisao, ultimo_recebido_em desc);

create index if not exists assinaturas_cobrancas_webhook_order_idx
  on public.assinaturas_cobrancas (asaas_payment_id, webhook_event_order desc);
