drop function if exists public.fn_enviar_comanda_para_pagamento(uuid, uuid, uuid, text, numeric, numeric);
drop function if exists public.fn_remover_item_comanda(uuid, uuid, uuid, numeric, numeric);
drop function if exists public.fn_adicionar_item_comanda(uuid, uuid, text, uuid, uuid, uuid, text, numeric, numeric, numeric, uuid, uuid, numeric, numeric, text, boolean, text, text, numeric, numeric);
drop function if exists public.fn_salvar_comanda_base(uuid, uuid, integer, uuid, text, text, numeric, numeric);
drop function if exists public.fn_recalcular_total_comanda(uuid, numeric, numeric);

create or replace function public.fn_recalcular_total_comanda(
  p_id_comanda uuid,
  p_desconto numeric default null,
  p_acrescimo numeric default null
)
returns table (
  subtotal numeric,
  desconto numeric,
  acrescimo numeric,
  total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12, 2);
  v_desconto numeric(12, 2);
  v_acrescimo numeric(12, 2);
  v_total numeric(12, 2);
begin
  select
    coalesce(round(sum(valor_total)::numeric, 2), 0),
    coalesce(p_desconto, c.desconto, 0),
    coalesce(p_acrescimo, c.acrescimo, 0)
  into
    v_subtotal,
    v_desconto,
    v_acrescimo
  from public.comandas c
  left join public.comanda_itens ci
    on ci.id_comanda = c.id
   and coalesce(ci.ativo, true) = true
  where c.id = p_id_comanda
  group by c.id, c.desconto, c.acrescimo;

  if v_subtotal is null then
    raise exception 'Comanda nao encontrada.'
      using errcode = 'P0001';
  end if;

  v_total := round((coalesce(v_subtotal, 0) - coalesce(v_desconto, 0) + coalesce(v_acrescimo, 0))::numeric, 2);

  update public.comandas
  set
    subtotal = v_subtotal,
    desconto = v_desconto,
    acrescimo = v_acrescimo,
    total = v_total,
    updated_at = now()
  where id = p_id_comanda;

  return query
  select v_subtotal, v_desconto, v_acrescimo, v_total;
end;
$$;

create or replace function public.fn_salvar_comanda_base(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_numero integer,
  p_id_cliente uuid,
  p_status text,
  p_observacoes text,
  p_desconto numeric,
  p_acrescimo numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_comanda uuid;
  v_status text;
  v_status_atual text;
begin
  if p_id_salao is null then
    raise exception 'Salao obrigatorio.'
      using errcode = 'P0001';
  end if;

  if p_numero is null or p_numero <= 0 then
    raise exception 'Numero da comanda invalido.'
      using errcode = 'P0001';
  end if;

  v_status := lower(coalesce(p_status, 'aberta'));

  if v_status not in ('aberta', 'em_atendimento', 'aguardando_pagamento') then
    raise exception 'Status da comanda invalido para edicao.'
      using errcode = 'P0001';
  end if;

  if p_id_comanda is null then
    insert into public.comandas (
      id_salao,
      numero,
      id_cliente,
      status,
      observacoes,
      subtotal,
      desconto,
      acrescimo,
      total
    )
    values (
      p_id_salao,
      p_numero,
      p_id_cliente,
      v_status,
      nullif(trim(coalesce(p_observacoes, '')), ''),
      0,
      coalesce(p_desconto, 0),
      coalesce(p_acrescimo, 0),
      round((coalesce(p_acrescimo, 0) - coalesce(p_desconto, 0))::numeric, 2)
    )
    returning id into v_id_comanda;
  else
    select
      c.id,
      lower(coalesce(c.status, ''))
      into v_id_comanda
        , v_status_atual
    from public.comandas c
    where c.id = p_id_comanda
      and c.id_salao = p_id_salao
    for update;

    if not found then
      raise exception 'Comanda nao encontrada para este salao.'
        using errcode = 'P0001';
    end if;

    if v_status_atual in ('fechada', 'cancelada') then
      raise exception 'Comanda fechada ou cancelada nao pode ser editada.'
        using errcode = 'P0001';
    end if;

    update public.comandas
    set
      numero = p_numero,
      id_cliente = p_id_cliente,
      status = v_status,
      observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
      updated_at = now()
    where id = v_id_comanda;
  end if;

  perform public.fn_recalcular_total_comanda(
    v_id_comanda,
    coalesce(p_desconto, 0),
    coalesce(p_acrescimo, 0)
  );

  return v_id_comanda;
end;
$$;

create or replace function public.fn_adicionar_item_comanda(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_tipo_item text,
  p_id_agendamento uuid,
  p_id_servico uuid,
  p_id_produto uuid,
  p_descricao text,
  p_quantidade numeric,
  p_valor_unitario numeric,
  p_custo_total numeric,
  p_id_profissional uuid,
  p_id_assistente uuid,
  p_comissao_percentual numeric,
  p_comissao_assistente_percentual numeric,
  p_base_calculo text,
  p_desconta_taxa_maquininha boolean,
  p_origem text,
  p_observacoes text,
  p_desconto numeric default null,
  p_acrescimo numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_status text;
begin
  select lower(coalesce(c.status, ''))
    into v_status
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Comanda nao encontrada para este salao.'
      using errcode = 'P0001';
  end if;

  if v_status in ('fechada', 'cancelada') then
    raise exception 'Comanda fechada ou cancelada nao pode receber novos itens.'
      using errcode = 'P0001';
  end if;

  insert into public.comanda_itens (
    id_salao,
    id_comanda,
    tipo_item,
    id_agendamento,
    id_servico,
    id_produto,
    descricao,
    quantidade,
    valor_unitario,
    valor_total,
    custo_total,
    id_profissional,
    id_assistente,
    comissao_percentual_aplicada,
    comissao_valor_aplicado,
    comissao_assistente_percentual_aplicada,
    comissao_assistente_valor_aplicado,
    base_calculo_aplicada,
    desconta_taxa_maquininha_aplicada,
    origem,
    observacoes
  )
  values (
    p_id_salao,
    p_id_comanda,
    lower(coalesce(p_tipo_item, 'extra')),
    p_id_agendamento,
    p_id_servico,
    p_id_produto,
    coalesce(nullif(trim(coalesce(p_descricao, '')), ''), 'Item manual'),
    greatest(coalesce(p_quantidade, 1), 1),
    coalesce(p_valor_unitario, 0),
    round((greatest(coalesce(p_quantidade, 1), 1) * coalesce(p_valor_unitario, 0))::numeric, 2),
    coalesce(p_custo_total, 0),
    p_id_profissional,
    p_id_assistente,
    coalesce(p_comissao_percentual, 0),
    0,
    coalesce(p_comissao_assistente_percentual, 0),
    0,
    coalesce(nullif(trim(coalesce(p_base_calculo, '')), ''), 'bruto'),
    coalesce(p_desconta_taxa_maquininha, false),
    coalesce(nullif(trim(coalesce(p_origem, '')), ''), 'manual'),
    nullif(trim(coalesce(p_observacoes, '')), '')
  )
  returning id into v_item_id;

  perform public.fn_recalcular_total_comanda(p_id_comanda, p_desconto, p_acrescimo);

  return v_item_id;
end;
$$;

create or replace function public.fn_remover_item_comanda(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_item uuid,
  p_desconto numeric default null,
  p_acrescimo numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select lower(coalesce(c.status, ''))
    into v_status
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Comanda nao encontrada para este salao.'
      using errcode = 'P0001';
  end if;

  if v_status in ('fechada', 'cancelada') then
    raise exception 'Comanda fechada ou cancelada nao pode remover itens.'
      using errcode = 'P0001';
  end if;

  delete from public.comanda_itens
  where id = p_id_item
    and id_comanda = p_id_comanda
    and id_salao = p_id_salao;

  if not found then
    raise exception 'Item da comanda nao encontrado.'
      using errcode = 'P0001';
  end if;

  perform public.fn_recalcular_total_comanda(p_id_comanda, p_desconto, p_acrescimo);
end;
$$;

create or replace function public.fn_enviar_comanda_para_pagamento(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_cliente uuid,
  p_observacoes text,
  p_desconto numeric,
  p_acrescimo numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select lower(coalesce(c.status, ''))
    into v_status
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Comanda nao encontrada para este salao.'
      using errcode = 'P0001';
  end if;

  if v_status not in ('aberta', 'em_atendimento', 'aguardando_pagamento') then
    raise exception 'Comanda bloqueada nao pode ser enviada ao caixa.'
      using errcode = 'P0001';
  end if;

  update public.comandas
  set
    id_cliente = p_id_cliente,
    observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
    status = 'aguardando_pagamento',
    updated_at = now()
  where id = p_id_comanda
    and id_salao = p_id_salao;

  perform public.fn_recalcular_total_comanda(p_id_comanda, p_desconto, p_acrescimo);
end;
$$;

revoke all on function public.fn_recalcular_total_comanda(uuid, numeric, numeric) from public, anon, authenticated;
revoke all on function public.fn_salvar_comanda_base(uuid, uuid, integer, uuid, text, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.fn_adicionar_item_comanda(uuid, uuid, text, uuid, uuid, uuid, text, numeric, numeric, numeric, uuid, uuid, numeric, numeric, text, boolean, text, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.fn_remover_item_comanda(uuid, uuid, uuid, numeric, numeric) from public, anon, authenticated;
revoke all on function public.fn_enviar_comanda_para_pagamento(uuid, uuid, uuid, text, numeric, numeric) from public, anon, authenticated;

grant execute on function public.fn_recalcular_total_comanda(uuid, numeric, numeric) to service_role;
grant execute on function public.fn_salvar_comanda_base(uuid, uuid, integer, uuid, text, text, numeric, numeric) to service_role;
grant execute on function public.fn_adicionar_item_comanda(uuid, uuid, text, uuid, uuid, uuid, text, numeric, numeric, numeric, uuid, uuid, numeric, numeric, text, boolean, text, text, numeric, numeric) to service_role;
grant execute on function public.fn_remover_item_comanda(uuid, uuid, uuid, numeric, numeric) to service_role;
grant execute on function public.fn_enviar_comanda_para_pagamento(uuid, uuid, uuid, text, numeric, numeric) to service_role;
