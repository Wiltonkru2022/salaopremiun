alter table public.asaas_webhook_eventos
  add column if not exists idempotencia_key text;

update public.asaas_webhook_eventos
set idempotencia_key = coalesce(
  nullif(trim(idempotencia_key), ''),
  nullif(trim(payload ->> 'id'), ''),
  nullif(trim(fingerprint), ''),
  concat_ws(':', nullif(trim(payment_id), ''), nullif(trim(evento), ''))
)
where idempotencia_key is null
   or trim(idempotencia_key) = '';

alter table public.asaas_webhook_eventos
  alter column idempotencia_key set default gen_random_uuid()::text;

alter table public.asaas_webhook_eventos
  alter column idempotencia_key set not null;

create unique index if not exists asaas_webhook_eventos_idempotencia_key_key
  on public.asaas_webhook_eventos (idempotencia_key);

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
    nullif(trim(coalesce(p_payload ->> 'id', '')), ''),
    nullif(trim(coalesce(p_fingerprint, '')), ''),
    nullif(
      trim(
        concat_ws(
          ':',
          nullif(trim(coalesce(p_payment_id, '')), ''),
          nullif(trim(coalesce(p_evento, '')), '')
        )
      ),
      ''
    ),
    gen_random_uuid()::text
  );

  insert into public.asaas_webhook_eventos (
    fingerprint,
    idempotencia_key,
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
    p_payment_id,
    p_payment_status,
    'processando',
    1,
    coalesce(p_payload, '{}'::jsonb),
    null,
    now(),
    now(),
    now(),
    public.fn_asaas_webhook_event_order(p_evento, p_payment_status)
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
    order by case
      when awe.fingerprint = p_fingerprint then 0
      else 1
    end
    limit 1
    for update;

    if not found then
      raise;
    end if;

    v_status_anterior := coalesce(v_evento.status_processamento, 'processando');

    update public.asaas_webhook_eventos awe
      set fingerprint = coalesce(nullif(trim(p_fingerprint), ''), awe.fingerprint),
          idempotencia_key = v_idempotencia_key,
          evento = p_evento,
          payment_id = p_payment_id,
          payment_status = p_payment_status,
          payload = coalesce(p_payload, '{}'::jsonb),
          tentativas = coalesce(v_evento.tentativas, 0) + 1,
          ultimo_recebido_em = now(),
          updated_at = now(),
          event_order = public.fn_asaas_webhook_event_order(p_evento, p_payment_status),
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
          end
    where awe.id = v_evento.id
    returning * into v_evento;

    return query
    select
      v_evento.id,
      (v_status_anterior = 'erro'),
      v_evento.status_processamento,
      v_evento.tentativas;
end;
$$;

revoke all on function public.fn_registrar_asaas_webhook_evento(text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_registrar_asaas_webhook_evento(text, text, text, text, jsonb)
  to service_role;
