alter table public.comanda_pagamentos
  add column if not exists valor_credito_cliente numeric(12, 2) not null default 0;

create or replace function public.fn_caixa_adicionar_pagamento_credito_cliente(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_usuario uuid,
  p_valor numeric,
  p_observacoes text default null,
  p_idempotency_key text default null
)
returns table (
  id_pagamento uuid,
  ja_existia boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_cliente uuid;
  v_total numeric(12, 2);
  v_credito_atual numeric(12, 2);
  v_pagamento_existente uuid;
begin
  if p_id_salao is null or p_id_comanda is null then
    raise exception 'Salao e comanda obrigatorios para usar credito da cliente.'
      using errcode = 'P0001';
  end if;

  if round(coalesce(p_valor, 0)::numeric, 2) <= 0 then
    raise exception 'Informe um valor valido para usar o credito da cliente.'
      using errcode = 'P0001';
  end if;

  if nullif(trim(coalesce(p_idempotency_key, '')), '') is not null then
    select cp.id
      into v_pagamento_existente
    from public.comanda_pagamentos cp
    where cp.id_salao = p_id_salao
      and cp.id_comanda = p_id_comanda
      and cp.idempotency_key = p_idempotency_key
    limit 1;

    if v_pagamento_existente is not null then
      return query
      select v_pagamento_existente, true;
      return;
    end if;
  end if;

  select c.id_cliente, round(coalesce(c.total, 0), 2)
    into v_id_cliente, v_total
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if v_id_cliente is null then
    raise exception 'Vincule uma cliente na comanda antes de usar credito.'
      using errcode = 'P0001';
  end if;

  select round(coalesce(cli.cashback, 0), 2)
    into v_credito_atual
  from public.clientes cli
  where cli.id = v_id_cliente
    and cli.id_salao = p_id_salao
  for update;

  if coalesce(v_credito_atual, 0) < round(coalesce(p_valor, 0)::numeric, 2) then
    raise exception 'Saldo de credito insuficiente para este pagamento.'
      using errcode = 'P0001';
  end if;

  update public.clientes
  set
    cashback = round(coalesce(cashback, 0) - round(coalesce(p_valor, 0)::numeric, 2), 2),
    atualizado_em = now()
  where id = v_id_cliente
    and id_salao = p_id_salao;

  insert into public.comanda_pagamentos (
    id_salao,
    id_comanda,
    forma_pagamento,
    valor,
    parcelas,
    taxa,
    taxa_maquininha_percentual,
    taxa_maquininha_valor,
    observacoes,
    idempotency_key,
    valor_credito_cliente
  ) values (
    p_id_salao,
    p_id_comanda,
    'credito_cliente',
    round(coalesce(p_valor, 0)::numeric, 2),
    1,
    0,
    0,
    0,
    nullif(trim(coalesce(p_observacoes, '')), ''),
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    0
  )
  returning id into id_pagamento;

  return query
  select id_pagamento, false;
end;
$$;

create or replace function public.fn_caixa_remover_pagamento_credito_cliente(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_pagamento uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_cliente uuid;
  v_valor_pagamento numeric(12, 2);
begin
  select c.id_cliente, round(coalesce(cp.valor, 0), 2)
    into v_id_cliente, v_valor_pagamento
  from public.comanda_pagamentos cp
  join public.comandas c
    on c.id = cp.id_comanda
   and c.id_salao = cp.id_salao
  where cp.id = p_id_pagamento
    and cp.id_comanda = p_id_comanda
    and cp.id_salao = p_id_salao
    and cp.forma_pagamento = 'credito_cliente'
  for update of cp;

  if v_id_cliente is null then
    raise exception 'Pagamento em credito da cliente nao encontrado.'
      using errcode = 'P0001';
  end if;

  update public.clientes
  set
    cashback = round(coalesce(cashback, 0) + coalesce(v_valor_pagamento, 0), 2),
    atualizado_em = now()
  where id = v_id_cliente
    and id_salao = p_id_salao;

  delete from public.comanda_pagamentos
  where id = p_id_pagamento
    and id_comanda = p_id_comanda
    and id_salao = p_id_salao;

  return p_id_pagamento;
end;
$$;

create or replace function public.fn_caixa_compensar_excedente_credito(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_pagamento uuid,
  p_valor_credito numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_cliente uuid;
begin
  if round(coalesce(p_valor_credito, 0)::numeric, 2) <= 0 then
    raise exception 'Valor de credito invalido.'
      using errcode = 'P0001';
  end if;

  select c.id_cliente
    into v_id_cliente
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if v_id_cliente is null then
    raise exception 'Vincule uma cliente na comanda antes de guardar excedente como credito.'
      using errcode = 'P0001';
  end if;

  update public.clientes
  set
    cashback = round(coalesce(cashback, 0) + round(coalesce(p_valor_credito, 0)::numeric, 2), 2),
    atualizado_em = now()
  where id = v_id_cliente
    and id_salao = p_id_salao;

  update public.comanda_pagamentos
  set valor_credito_cliente = round(
    coalesce(valor_credito_cliente, 0) + round(coalesce(p_valor_credito, 0)::numeric, 2),
    2
  )
  where id = p_id_pagamento
    and id_comanda = p_id_comanda
    and id_salao = p_id_salao;

  return p_id_pagamento;
end;
$$;

create or replace function public.fn_caixa_estornar_excedente_credito(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_pagamento uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_cliente uuid;
  v_credito_pagamento numeric(12, 2);
  v_credito_atual numeric(12, 2);
begin
  select c.id_cliente, round(coalesce(cp.valor_credito_cliente, 0), 2)
    into v_id_cliente, v_credito_pagamento
  from public.comanda_pagamentos cp
  join public.comandas c
    on c.id = cp.id_comanda
   and c.id_salao = cp.id_salao
  where cp.id = p_id_pagamento
    and cp.id_comanda = p_id_comanda
    and cp.id_salao = p_id_salao
  for update of cp;

  if coalesce(v_credito_pagamento, 0) <= 0 then
    return p_id_pagamento;
  end if;

  if v_id_cliente is null then
    raise exception 'Cliente vinculada nao encontrada para estornar credito.'
      using errcode = 'P0001';
  end if;

  select round(coalesce(cli.cashback, 0), 2)
    into v_credito_atual
  from public.clientes cli
  where cli.id = v_id_cliente
    and cli.id_salao = p_id_salao
  for update;

  if coalesce(v_credito_atual, 0) < coalesce(v_credito_pagamento, 0) then
    raise exception 'Nao foi possivel remover este pagamento porque o credito gerado ja foi usado pela cliente.'
      using errcode = 'P0001';
  end if;

  update public.clientes
  set
    cashback = round(coalesce(cashback, 0) - coalesce(v_credito_pagamento, 0), 2),
    atualizado_em = now()
  where id = v_id_cliente
    and id_salao = p_id_salao;

  update public.comanda_pagamentos
  set valor_credito_cliente = 0
  where id = p_id_pagamento
    and id_comanda = p_id_comanda
    and id_salao = p_id_salao;

  return p_id_pagamento;
end;
$$;
