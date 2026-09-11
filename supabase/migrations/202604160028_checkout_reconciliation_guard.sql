-- Evita cobrança duplicada quando o gateway criou pagamento, mas o app falhou
-- antes de persistir a cobranca local. Nesse caso, o retry deve parar para
-- reconciliacao operacional em vez de criar um novo pagamento no provedor.

create or replace function public.fn_assinatura_reservar_checkout(
  p_id_salao uuid,
  p_plano_codigo text,
  p_billing_type text,
  p_valor numeric,
  p_idempotency_key text,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  checkout_lock_id uuid,
  should_process boolean,
  reason text,
  existing_cobranca_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency_key text;
  v_lock public.assinatura_checkout_locks%rowtype;
  v_existing_cobranca uuid;
begin
  if p_id_salao is null then
    raise exception 'Salao obrigatorio para reservar checkout.'
      using errcode = 'P0001';
  end if;

  v_idempotency_key := nullif(left(trim(coalesce(p_idempotency_key, '')), 160), '');

  if v_idempotency_key is null then
    v_idempotency_key := gen_random_uuid()::text;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('assinatura_checkout:' || p_id_salao::text, 0)
  );

  update public.assinatura_checkout_locks
  set status = 'expirado',
      erro_texto = coalesce(erro_texto, 'Checkout expirado antes de finalizar.'),
      updated_at = now()
  where id_salao = p_id_salao
    and status = 'processando'
    and expires_at < now();

  select *
    into v_lock
  from public.assinatura_checkout_locks
  where id_salao = p_id_salao
    and idempotency_key = v_idempotency_key
  order by created_at desc
  limit 1
  for update;

  if found then
    if v_lock.status = 'concluido' and v_lock.id_cobranca is not null then
      return query
      select v_lock.id, false, 'existing_idempotency', v_lock.id_cobranca;
      return;
    end if;

    if v_lock.status = 'processando' and v_lock.expires_at >= now() then
      return query
      select v_lock.id, false, 'processing', v_lock.id_cobranca;
      return;
    end if;

    if v_lock.status in ('erro', 'expirado')
      and nullif(trim(coalesce(v_lock.asaas_payment_id, '')), '') is not null
      and v_lock.id_cobranca is null
    then
      return query
      select v_lock.id, false, 'provider_payment_pending_reconciliation', null::uuid;
      return;
    end if;

    update public.assinatura_checkout_locks
    set plano_codigo = lower(coalesce(nullif(p_plano_codigo, ''), plano_codigo)),
        billing_type = upper(coalesce(nullif(p_billing_type, ''), billing_type)),
        valor = coalesce(p_valor, valor),
        status = 'processando',
        id_cobranca = null,
        asaas_payment_id = null,
        response_json = '{}'::jsonb,
        payload_json = coalesce(p_payload, '{}'::jsonb),
        erro_texto = null,
        expires_at = now() + interval '10 minutes',
        updated_at = now()
    where id = v_lock.id
    returning * into v_lock;

    return query
    select v_lock.id, true, 'reserved_retry', null::uuid;
    return;
  end if;

  select c.id
    into v_existing_cobranca
  from public.assinaturas_cobrancas c
  where c.id_salao = p_id_salao
    and lower(coalesce(c.status, '')) in ('pending', 'pendente', 'aguardando_pagamento')
    and coalesce(c.deleted, false) = false
    and (c.data_expiracao is null or c.data_expiracao >= current_date)
  order by c.created_at desc nulls last, c.id desc
  limit 1;

  if v_existing_cobranca is not null then
    return query
    select null::uuid, false, 'existing_pending_charge', v_existing_cobranca;
    return;
  end if;

  select *
    into v_lock
  from public.assinatura_checkout_locks
  where id_salao = p_id_salao
    and status = 'processando'
  order by created_at desc
  limit 1
  for update;

  if found then
    return query
    select v_lock.id, false, 'processing', v_lock.id_cobranca;
    return;
  end if;

  insert into public.assinatura_checkout_locks (
    id_salao,
    plano_codigo,
    billing_type,
    valor,
    idempotency_key,
    status,
    payload_json,
    expires_at
  )
  values (
    p_id_salao,
    lower(coalesce(nullif(p_plano_codigo, ''), 'indefinido')),
    upper(coalesce(nullif(p_billing_type, ''), 'PIX')),
    coalesce(p_valor, 0),
    v_idempotency_key,
    'processando',
    coalesce(p_payload, '{}'::jsonb),
    now() + interval '10 minutes'
  )
  returning * into v_lock;

  return query
  select v_lock.id, true, 'reserved', null::uuid;
end;
$$;

revoke all on function public.fn_assinatura_reservar_checkout(uuid, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_assinatura_reservar_checkout(uuid, text, text, numeric, text, jsonb)
  to service_role;
