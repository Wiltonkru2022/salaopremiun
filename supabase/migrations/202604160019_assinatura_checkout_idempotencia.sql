create extension if not exists pgcrypto;

create table if not exists public.assinatura_checkout_locks (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null,
  plano_codigo text not null,
  billing_type text not null,
  valor numeric(12, 2) not null default 0,
  idempotency_key text not null,
  status text not null default 'processando'
    check (status in ('processando', 'concluido', 'erro', 'expirado')),
  id_cobranca uuid,
  asaas_payment_id text,
  response_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  erro_texto text,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assinatura_checkout_locks
  add column if not exists id_salao uuid,
  add column if not exists plano_codigo text,
  add column if not exists billing_type text,
  add column if not exists valor numeric(12, 2) default 0,
  add column if not exists idempotency_key text,
  add column if not exists status text default 'processando',
  add column if not exists id_cobranca uuid,
  add column if not exists asaas_payment_id text,
  add column if not exists response_json jsonb default '{}'::jsonb,
  add column if not exists payload_json jsonb default '{}'::jsonb,
  add column if not exists erro_texto text,
  add column if not exists expires_at timestamptz default (now() + interval '10 minutes'),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.assinatura_checkout_locks
set idempotency_key = coalesce(nullif(idempotency_key, ''), id::text),
    plano_codigo = coalesce(nullif(plano_codigo, ''), 'indefinido'),
    billing_type = coalesce(nullif(billing_type, ''), 'PIX'),
    valor = coalesce(valor, 0),
    status = coalesce(nullif(status, ''), 'erro'),
    response_json = coalesce(response_json, '{}'::jsonb),
    payload_json = coalesce(payload_json, '{}'::jsonb),
    expires_at = coalesce(expires_at, now()),
    created_at = coalesce(created_at, now()),
    updated_at = now()
where idempotency_key is null
   or plano_codigo is null
   or billing_type is null
   or valor is null
   or status is null
   or response_json is null
   or payload_json is null
   or expires_at is null
   or created_at is null
   or updated_at is null;

create unique index if not exists assinatura_checkout_locks_salao_processando_idx
  on public.assinatura_checkout_locks (id_salao)
  where status = 'processando';

create unique index if not exists assinatura_checkout_locks_idempotency_idx
  on public.assinatura_checkout_locks (id_salao, idempotency_key);

create index if not exists assinatura_checkout_locks_salao_created_idx
  on public.assinatura_checkout_locks (id_salao, created_at desc);

alter table public.assinatura_checkout_locks enable row level security;

revoke all on public.assinatura_checkout_locks from anon, authenticated;
grant select, insert, update on public.assinatura_checkout_locks to service_role;

alter table public.assinaturas_cobrancas
  add column if not exists idempotency_key text,
  add column if not exists checkout_lock_id uuid;

create unique index if not exists assinaturas_cobrancas_checkout_idempotency_idx
  on public.assinaturas_cobrancas (id_salao, idempotency_key)
  where idempotency_key is not null;

create index if not exists assinaturas_cobrancas_checkout_lock_idx
  on public.assinaturas_cobrancas (checkout_lock_id)
  where checkout_lock_id is not null;

drop function if exists public.fn_assinatura_reservar_checkout(uuid, text, text, numeric, text, jsonb);

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

drop function if exists public.fn_assinatura_concluir_checkout(uuid, uuid, text, jsonb);

create or replace function public.fn_assinatura_concluir_checkout(
  p_checkout_lock_id uuid,
  p_id_cobranca uuid,
  p_asaas_payment_id text,
  p_response_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_checkout_lock_id is null then
    return;
  end if;

  update public.assinatura_checkout_locks
  set status = 'concluido',
      id_cobranca = p_id_cobranca,
      asaas_payment_id = nullif(trim(coalesce(p_asaas_payment_id, '')), ''),
      response_json = coalesce(p_response_json, '{}'::jsonb),
      erro_texto = null,
      expires_at = now() + interval '1 day',
      updated_at = now()
  where id = p_checkout_lock_id;
end;
$$;

drop function if exists public.fn_assinatura_falhar_checkout(uuid, text, text, jsonb);

create or replace function public.fn_assinatura_falhar_checkout(
  p_checkout_lock_id uuid,
  p_erro_texto text,
  p_asaas_payment_id text default null,
  p_response_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_checkout_lock_id is null then
    return;
  end if;

  update public.assinatura_checkout_locks
  set status = 'erro',
      asaas_payment_id = coalesce(nullif(trim(coalesce(p_asaas_payment_id, '')), ''), asaas_payment_id),
      response_json = coalesce(p_response_json, response_json, '{}'::jsonb),
      erro_texto = left(coalesce(p_erro_texto, 'Erro ao processar checkout.'), 1000),
      expires_at = now(),
      updated_at = now()
  where id = p_checkout_lock_id;
end;
$$;

revoke all on function public.fn_assinatura_reservar_checkout(uuid, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.fn_assinatura_concluir_checkout(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.fn_assinatura_falhar_checkout(uuid, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.fn_assinatura_reservar_checkout(uuid, text, text, numeric, text, jsonb)
  to service_role;
grant execute on function public.fn_assinatura_concluir_checkout(uuid, uuid, text, jsonb)
  to service_role;
grant execute on function public.fn_assinatura_falhar_checkout(uuid, text, text, jsonb)
  to service_role;
