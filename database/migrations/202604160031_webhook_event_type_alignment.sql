alter table public.asaas_webhook_eventos
  add column if not exists event_type text;

update public.asaas_webhook_eventos
set event_type = coalesce(
  nullif(trim(event_type), ''),
  nullif(trim(evento), ''),
  nullif(trim(payload ->> 'event'), ''),
  'legacy_event'
)
where event_type is null
   or trim(event_type) = '';

alter table public.asaas_webhook_eventos
  alter column event_type set not null;

drop function if exists public.fn_registrar_asaas_webhook_evento(text, text, text, text, jsonb);

create or replace function public.fn_registrar_asaas_webhook_evento(
  p_fingerprint text,
  p_evento text,
  p_payment_id text,
  p_payment_status text,
  p_payload jsonb
)
returns table (
  id uuid,
  should_process boolean,
  status_processamento text,
  tentativas integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento public.asaas_webhook_eventos%rowtype;
  v_status_anterior text;
  v_idempotencia_key text;
begin
  v_idempotencia_key := coalesce(
    nullif(trim(p_payload ->> 'id'), ''),
    nullif(trim(p_payment_id), '') || ':' || nullif(trim(p_evento), ''),
    p_fingerprint
  );

  insert into public.asaas_webhook_eventos (
    fingerprint,
    idempotencia_key,
    event_type,
    evento,
    payment_id,
    payment_status,
    status_processamento,
    tentativas,
    payload,
    erro_mensagem,
    primeiro_recebido_em,
    ultimo_recebido_em,
    updated_at,
    event_order
  )
  values (
    p_fingerprint,
    v_idempotencia_key,
    p_evento,
    p_evento,
    p_payment_id,
    p_payment_status,
    'processando',
    1,
    coalesce(p_payload, '{}'::jsonb),
    null,
    now(),
    now(),
    now(),
    case
      when upper(coalesce(p_evento, '')) in (
        'PAYMENT_DELETED',
        'PAYMENT_REFUNDED',
        'PAYMENT_RECEIVED_IN_CASH_UNDONE',
        'PAYMENT_BANK_SLIP_CANCELLED',
        'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
      ) then 120
      when upper(coalesce(p_evento, '')) in (
        'PAYMENT_CONFIRMED',
        'PAYMENT_RECEIVED',
        'PAYMENT_RECEIVED_IN_CASH'
      ) then 100
      when upper(coalesce(p_evento, '')) = 'PAYMENT_OVERDUE' then 60
      when upper(coalesce(p_evento, '')) = 'PAYMENT_RESTORED' then 40
      else 20
    end
  )
  returning * into v_evento;

  return query
  select v_evento.id, true, v_evento.status_processamento, v_evento.tentativas;
  return;
exception
  when unique_violation then
    select *
      into v_evento
    from public.asaas_webhook_eventos awe
    where awe.fingerprint = p_fingerprint
       or awe.idempotencia_key = v_idempotencia_key
    order by awe.updated_at desc
    limit 1
    for update;

    v_status_anterior := coalesce(v_evento.status_processamento, 'processando');

    update public.asaas_webhook_eventos
      set idempotencia_key = v_idempotencia_key,
          event_type = p_evento,
          evento = p_evento,
          payment_id = p_payment_id,
          payment_status = p_payment_status,
          payload = coalesce(p_payload, '{}'::jsonb),
          tentativas = coalesce(v_evento.tentativas, 0) + 1,
          ultimo_recebido_em = now(),
          updated_at = now(),
          status_processamento = case
            when v_status_anterior = 'erro' then 'processando'
            else v_status_anterior
          end,
          erro_mensagem = case
            when v_status_anterior = 'erro' then null
            else v_evento.erro_mensagem
          end,
          processado_em = case
            when v_status_anterior = 'erro' then null
            else v_evento.processado_em
          end,
          event_order = case
            when upper(coalesce(p_evento, '')) in (
              'PAYMENT_DELETED',
              'PAYMENT_REFUNDED',
              'PAYMENT_RECEIVED_IN_CASH_UNDONE',
              'PAYMENT_BANK_SLIP_CANCELLED',
              'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
            ) then 120
            when upper(coalesce(p_evento, '')) in (
              'PAYMENT_CONFIRMED',
              'PAYMENT_RECEIVED',
              'PAYMENT_RECEIVED_IN_CASH'
            ) then 100
            when upper(coalesce(p_evento, '')) = 'PAYMENT_OVERDUE' then 60
            when upper(coalesce(p_evento, '')) = 'PAYMENT_RESTORED' then 40
            else 20
          end
    where id = v_evento.id
    returning * into v_evento;

    return query
    select
      v_evento.id,
      v_status_anterior = 'erro',
      v_evento.status_processamento,
      v_evento.tentativas;
end;
$$;
