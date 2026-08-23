create table if not exists public.whatsapp_automatic_jobs (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_agendamento uuid references public.agendamentos(id) on delete cascade,
  id_comanda uuid references public.comandas(id) on delete cascade,
  evento text not null check (evento in (
    'confirmacao_agendamento',
    'agendamento_alterado',
    'agendamento_cancelado',
    'pagamento_confirmado'
  )),
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'enviado', 'falhou')),
  enviar_em timestamptz not null default timezone('utc', now()),
  tentativas integer not null default 0 check (tentativas >= 0),
  idempotency_key text not null unique,
  payload_json jsonb not null default '{}'::jsonb,
  erro_texto text,
  processado_em timestamptz,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

create index if not exists whatsapp_automatic_jobs_pending_idx
  on public.whatsapp_automatic_jobs (status, enviar_em)
  where status = 'pendente';

create index if not exists whatsapp_automatic_jobs_salao_idx
  on public.whatsapp_automatic_jobs (id_salao, criado_em desc);

alter table public.whatsapp_automatic_jobs enable row level security;
revoke all on table public.whatsapp_automatic_jobs from anon, authenticated;
grant all on table public.whatsapp_automatic_jobs to service_role;

create or replace function public.enqueue_whatsapp_automatic_event(
  p_id_salao uuid,
  p_id_agendamento uuid,
  p_id_comanda uuid,
  p_evento text,
  p_idempotency_key text,
  p_payload_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_id_salao is null or nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    return;
  end if;

  insert into public.whatsapp_automatic_jobs (
    id_salao,
    id_agendamento,
    id_comanda,
    evento,
    idempotency_key,
    payload_json
  ) values (
    p_id_salao,
    p_id_agendamento,
    p_id_comanda,
    p_evento,
    p_idempotency_key,
    coalesce(p_payload_json, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

revoke all on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) to service_role;

create or replace function public.trg_agendamento_whatsapp_automatic_events()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_version text;
begin
  v_version := replace(
    coalesce(new.updated_at, new.created_at, timezone('utc', clock_timestamp()))::text,
    ' ',
    'T'
  );

  if tg_op = 'INSERT' then
    if lower(coalesce(new.status, '')) = 'confirmado' then
      perform public.enqueue_whatsapp_automatic_event(
        new.id_salao,
        new.id,
        new.id_comanda,
        'confirmacao_agendamento',
        'auto:confirmacao:' || new.id::text || ':' || v_version,
        jsonb_build_object('source', 'agendamentos_insert')
      );
    end if;
    return new;
  end if;

  if lower(coalesce(new.status, '')) = 'cancelado'
     and lower(coalesce(old.status, '')) <> 'cancelado' then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'agendamento_cancelado',
      'auto:cancelamento:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_status')
    );
    return new;
  end if;

  if lower(coalesce(new.status, '')) = 'confirmado'
     and lower(coalesce(old.status, '')) <> 'confirmado' then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'confirmacao_agendamento',
      'auto:confirmacao:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_status')
    );
  end if;

  if (
       new.data is distinct from old.data
       or new.hora_inicio is distinct from old.hora_inicio
       or new.profissional_id is distinct from old.profissional_id
       or new.servico_id is distinct from old.servico_id
     )
     and lower(coalesce(new.status, '')) not in ('cancelado', 'atendido', 'faltou', 'expirado') then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'agendamento_alterado',
      'auto:alteracao:' || new.id::text || ':' || v_version,
      jsonb_build_object(
        'source', 'agendamentos_update',
        'old_data', old.data,
        'old_hora_inicio', old.hora_inicio
      )
    );
  end if;

  if lower(coalesce(new.sinal_status, '')) = 'confirmado'
     and lower(coalesce(old.sinal_status, '')) <> 'confirmado'
     and coalesce(new.sinal_valor, 0) > 0 then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'pagamento_confirmado',
      'auto:pagamento-sinal:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamento_sinal', 'valor', new.sinal_valor)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_agendamento_whatsapp_automatic_events on public.agendamentos;
create trigger trg_agendamento_whatsapp_automatic_events
after insert or update on public.agendamentos
for each row
execute function public.trg_agendamento_whatsapp_automatic_events();

create or replace function public.trg_comanda_whatsapp_pagamento_confirmado()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_version text;
begin
  if lower(coalesce(new.status, '')) = 'fechada'
     and lower(coalesce(old.status, '')) <> 'fechada'
     and new.id_cliente is not null
     and coalesce(new.total, 0) > 0 then
    v_version := replace(
      coalesce(new.fechada_em, new.updated_at, timezone('utc', clock_timestamp()))::text,
      ' ',
      'T'
    );

    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id_agendamento_principal,
      new.id,
      'pagamento_confirmado',
      'auto:pagamento-comanda:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'comanda_fechada', 'valor', new.total)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comanda_whatsapp_pagamento_confirmado on public.comandas;
create trigger trg_comanda_whatsapp_pagamento_confirmado
after update on public.comandas
for each row
execute function public.trg_comanda_whatsapp_pagamento_confirmado();

insert into public.whatsapp_templates (
  nome,
  categoria,
  conteudo,
  ativo,
  nome_meta,
  idioma,
  cabecalho,
  categoria_meta,
  tipo_interno,
  variaveis_json,
  atualizado_em
)
select
  'Confirmacao de agendamento',
  'utility',
  'Olá, {{1}}! ✅ Seu agendamento está confirmado para {{2}}, às {{3}}, com {{4}}.\n\n✂️ Serviço: {{5}}.\n\nSe precisar alterar ou cancelar seu horário, entre em contato com o salão.',
  true,
  'confirmacao_agendamento',
  'pt_BR',
  'Agendamento confirmado',
  'utility',
  'agendamento_confirmacao',
  '[
    {"position":1,"key":"cliente","label":"Cliente"},
    {"position":2,"key":"data","label":"Data"},
    {"position":3,"key":"horario","label":"Horário"},
    {"position":4,"key":"profissional","label":"Profissional"},
    {"position":5,"key":"servico","label":"Serviço"}
  ]'::jsonb,
  timezone('utc', now())
where not exists (
  select 1
  from public.whatsapp_templates
  where lower(coalesce(nome_meta, '')) = 'confirmacao_agendamento'
);
