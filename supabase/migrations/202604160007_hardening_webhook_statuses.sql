create extension if not exists pgcrypto;

create table if not exists public.asaas_webhook_eventos (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  evento text not null,
  payment_id text not null,
  payment_status text,
  status_processamento text not null default 'processando'
    check (status_processamento in ('processando', 'processado', 'erro')),
  tentativas integer not null default 1 check (tentativas > 0),
  payload jsonb not null default '{}'::jsonb,
  erro_mensagem text,
  primeiro_recebido_em timestamptz not null default now(),
  ultimo_recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asaas_webhook_eventos
  add column if not exists fingerprint text,
  add column if not exists evento text,
  add column if not exists payment_id text,
  add column if not exists payment_status text,
  add column if not exists status_processamento text default 'processando',
  add column if not exists tentativas integer default 1,
  add column if not exists payload jsonb default '{}'::jsonb,
  add column if not exists erro_mensagem text,
  add column if not exists primeiro_recebido_em timestamptz default now(),
  add column if not exists ultimo_recebido_em timestamptz default now(),
  add column if not exists processado_em timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.asaas_webhook_eventos
set fingerprint = coalesce(fingerprint, id::text),
    evento = coalesce(evento, 'legacy_event'),
    payment_id = coalesce(payment_id, id::text),
    status_processamento = coalesce(status_processamento, 'erro'),
    tentativas = greatest(coalesce(tentativas, 1), 1),
    payload = coalesce(payload, '{}'::jsonb),
    primeiro_recebido_em = coalesce(primeiro_recebido_em, now()),
    ultimo_recebido_em = coalesce(ultimo_recebido_em, now()),
    created_at = coalesce(created_at, now()),
    updated_at = now()
where fingerprint is null
   or evento is null
   or payment_id is null
   or status_processamento is null
   or tentativas is null
   or payload is null
   or primeiro_recebido_em is null
   or ultimo_recebido_em is null
   or created_at is null
   or updated_at is null;

create unique index if not exists asaas_webhook_eventos_fingerprint_key
  on public.asaas_webhook_eventos (fingerprint);

create index if not exists asaas_webhook_eventos_payment_idx
  on public.asaas_webhook_eventos (payment_id, evento, ultimo_recebido_em desc);

alter table public.asaas_webhook_eventos enable row level security;

revoke all on public.asaas_webhook_eventos from anon, authenticated;
grant select, insert, update on public.asaas_webhook_eventos to service_role;

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
begin
  insert into public.asaas_webhook_eventos (
    fingerprint,
    evento,
    payment_id,
    payment_status,
    status_processamento,
    tentativas,
    payload,
    erro_mensagem,
    primeiro_recebido_em,
    ultimo_recebido_em,
    updated_at
  )
  values (
    p_fingerprint,
    p_evento,
    p_payment_id,
    p_payment_status,
    'processando',
    1,
    coalesce(p_payload, '{}'::jsonb),
    null,
    now(),
    now(),
    now()
  )
  returning * into v_evento;

  return query
  select v_evento.id, true, v_evento.status_processamento, v_evento.tentativas;
  return;
exception
  when unique_violation then
    select *
      into v_evento
    from public.asaas_webhook_eventos
    where fingerprint = p_fingerprint
    for update;

    v_status_anterior := coalesce(v_evento.status_processamento, 'processando');

    update public.asaas_webhook_eventos
      set evento = p_evento,
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
          end
    where id = v_evento.id
    returning * into v_evento;

    return query
    select
      v_evento.id,
      (v_status_anterior = 'erro'),
      v_evento.status_processamento,
      v_evento.tentativas;
end;
$$;

revoke all on function public.fn_registrar_asaas_webhook_evento(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.fn_registrar_asaas_webhook_evento(text, text, text, text, jsonb) to service_role;

update public.comissoes_lancamentos
set status = case
  when lower(coalesce(status, '')) = 'paga' then 'pago'
  when lower(coalesce(status, '')) = 'cancelada' then 'cancelado'
  else status
end,
updated_at = now()
where lower(coalesce(status, '')) in ('paga', 'cancelada');
