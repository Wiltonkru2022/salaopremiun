alter table public.whatsapp_envios
  add column if not exists provider text not null default 'meta_cloud',
  add column if not exists provider_message_id text null,
  add column if not exists payload_json jsonb not null default '{}'::jsonb,
  add column if not exists atualizado_em timestamptz not null default timezone('utc', now());

create index if not exists idx_whatsapp_envios_provider_message_id
  on public.whatsapp_envios (provider_message_id);

create index if not exists idx_whatsapp_envios_id_salao_criado_em
  on public.whatsapp_envios (id_salao, criado_em desc);

create or replace function public.touch_whatsapp_envios_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_whatsapp_envios_atualizado_em
  on public.whatsapp_envios;

create trigger trg_touch_whatsapp_envios_atualizado_em
before update on public.whatsapp_envios
for each row
execute function public.touch_whatsapp_envios_atualizado_em();

create or replace function public.reservar_credito_whatsapp(
  p_id_salao uuid,
  p_quantidade integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credito_id uuid;
begin
  if p_quantidade <= 0 then
    raise exception 'Quantidade de creditos invalida.';
  end if;

  with credito_alvo as (
    select id
    from public.whatsapp_pacote_saloes
    where id_salao = p_id_salao
      and status = 'ativo'
      and creditos_saldo >= p_quantidade
      and (
        expira_em is null
        or expira_em > timezone('utc', now())
      )
    order by
      case when expira_em is null then 1 else 0 end,
      expira_em asc,
      comprado_em asc
    limit 1
    for update
  )
  update public.whatsapp_pacote_saloes w
  set
    creditos_saldo = w.creditos_saldo - p_quantidade,
    creditos_usados = w.creditos_usados + p_quantidade
  from credito_alvo
  where w.id = credito_alvo.id
  returning w.id into v_credito_id;

  if v_credito_id is null then
    raise exception 'Saldo de creditos WhatsApp insuficiente.';
  end if;

  return v_credito_id;
end;
$$;

create or replace function public.estornar_credito_whatsapp(
  p_credito_id uuid,
  p_quantidade integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantidade <= 0 then
    raise exception 'Quantidade de creditos invalida.';
  end if;

  update public.whatsapp_pacote_saloes
  set
    creditos_saldo = creditos_saldo + p_quantidade,
    creditos_usados = greatest(creditos_usados - p_quantidade, 0)
  where id = p_credito_id;
end;
$$;
