drop function if exists public.fn_detalhes_venda(uuid);
drop function if exists public.fn_reabrir_venda_para_caixa(uuid, text, uuid);
drop function if exists public.fn_excluir_venda_completa(uuid, text, uuid);
drop function if exists public.fn_criar_comanda_por_agendamento(uuid);

create or replace function public.fn_criar_comanda_por_agendamento(p_id_agendamento uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agendamento record;
  v_servico record;
  v_id_comanda uuid;
  v_numero integer;
begin
  select *
    into v_agendamento
  from public.agendamentos
  where id = p_id_agendamento
  for update;

  if not found then
    raise exception 'Agendamento nao encontrado.'
      using errcode = 'P0001';
  end if;

  if v_agendamento.id_comanda is not null then
    return v_agendamento.id_comanda;
  end if;

  select *
    into v_servico
  from public.servicos
  where id = v_agendamento.servico_id
    and id_salao = v_agendamento.id_salao;

  if not found then
    raise exception 'Servico do agendamento nao encontrado.'
      using errcode = 'P0001';
  end if;

  select coalesce(max(numero), 0) + 1
    into v_numero
  from public.comandas
  where id_salao = v_agendamento.id_salao;

  v_id_comanda := public.fn_salvar_comanda_base(
    v_agendamento.id_salao,
    null,
    v_numero,
    v_agendamento.cliente_id,
    'aguardando_pagamento',
    v_agendamento.observacoes,
    0,
    0
  );

  perform public.fn_adicionar_item_comanda(
    v_agendamento.id_salao,
    v_id_comanda,
    'servico',
    v_agendamento.id,
    v_agendamento.servico_id,
    null,
    coalesce(v_servico.nome, 'Servico'),
    1,
    coalesce(v_servico.preco_padrao, v_servico.preco, 0),
    coalesce(v_servico.custo_produto, 0),
    v_agendamento.profissional_id,
    null,
    coalesce(v_servico.comissao_percentual_padrao, v_servico.comissao_percentual, 0),
    coalesce(v_servico.comissao_assistente_percentual, 0),
    coalesce(v_servico.base_calculo, 'bruto'),
    coalesce(v_servico.desconta_taxa_maquininha, false),
    'agenda',
    null,
    0,
    0
  );

  update public.agendamentos
  set
    id_comanda = v_id_comanda,
    status = 'aguardando_pagamento',
    updated_at = now()
  where id = p_id_agendamento;

  return v_id_comanda;
end;
$$;

create or replace function public.fn_detalhes_venda(p_id_comanda uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda jsonb;
  v_itens jsonb;
  v_pagamentos jsonb;
  v_comissoes jsonb;
begin
  select to_jsonb(c.*)
    into v_comanda
  from public.comandas c
  where c.id = p_id_comanda;

  if v_comanda is null then
    raise exception 'Venda nao encontrada.'
      using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(to_jsonb(ci.*) order by ci.created_at), '[]'::jsonb)
    into v_itens
  from public.comanda_itens ci
  where ci.id_comanda = p_id_comanda
    and coalesce(ci.ativo, true) = true;

  select coalesce(jsonb_agg(to_jsonb(cp.*) order by cp.criado_em), '[]'::jsonb)
    into v_pagamentos
  from public.comanda_pagamentos cp
  where cp.id_comanda = p_id_comanda;

  select coalesce(jsonb_agg(to_jsonb(cl.*) order by cl.criado_em), '[]'::jsonb)
    into v_comissoes
  from public.comissoes_lancamentos cl
  where cl.id_comanda = p_id_comanda;

  return jsonb_build_object(
    'comanda', v_comanda,
    'itens', v_itens,
    'pagamentos', v_pagamentos,
    'comissoes', v_comissoes
  );
end;
$$;

create or replace function public.fn_reabrir_venda_para_caixa(
  p_id_comanda uuid,
  p_motivo text default null,
  p_reopened_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select lower(coalesce(status, ''))
    into v_status
  from public.comandas
  where id = p_id_comanda
  for update;

  if not found then
    raise exception 'Venda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if v_status not in ('fechada', 'cancelada') then
    raise exception 'Apenas vendas fechadas ou canceladas podem ser reabertas.'
      using errcode = 'P0001';
  end if;

  update public.comandas
  set
    status = 'aguardando_pagamento',
    fechada_em = null,
    cancelada_em = null,
    observacoes = trim(
      both E'\n' from concat_ws(
        E'\n',
        nullif(observacoes, ''),
        concat(
          '[reabertura]',
          case when p_motivo is null or btrim(p_motivo) = '' then '' else ' ' || btrim(p_motivo) end
        )
      )
    ),
    updated_at = now()
  where id = p_id_comanda;

  update public.comissoes_lancamentos
  set
    status = 'cancelado',
    observacoes = trim(
      both E'\n' from concat_ws(
        E'\n',
        nullif(observacoes, ''),
        concat(
          'Venda reaberta',
          case when p_reopened_by is null then '' else ' por ' || p_reopened_by::text end,
          case when p_motivo is null or btrim(p_motivo) = '' then '' else ': ' || btrim(p_motivo) end
        )
      )
    ),
    updated_at = now()
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) in ('pendente', 'calculado');
end;
$$;

create or replace function public.fn_excluir_venda_completa(
  p_id_comanda uuid,
  p_motivo text default null,
  p_deleted_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select lower(coalesce(status, ''))
    into v_status
  from public.comandas
  where id = p_id_comanda
  for update;

  if not found then
    raise exception 'Venda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if v_status not in ('fechada', 'aguardando_pagamento') then
    raise exception 'A venda nao pode ser excluida no status atual.'
      using errcode = 'P0001';
  end if;

  update public.comandas
  set
    status = 'cancelada',
    cancelada_em = coalesce(cancelada_em, now()),
    observacoes = trim(
      both E'\n' from concat_ws(
        E'\n',
        nullif(observacoes, ''),
        concat(
          '[cancelamento venda]',
          case when p_deleted_by is null then '' else ' usuario=' || p_deleted_by::text end,
          case when p_motivo is null or btrim(p_motivo) = '' then '' else ' motivo=' || btrim(p_motivo) end
        )
      )
    ),
    updated_at = now()
  where id = p_id_comanda;

  update public.agendamentos
  set
    status = 'cancelado',
    updated_at = now()
  where id_comanda = p_id_comanda
    and lower(coalesce(status, '')) not in ('cancelado', 'cancelada', 'faltou');

  update public.comissoes_lancamentos
  set
    status = 'cancelado',
    observacoes = trim(
      both E'\n' from concat_ws(
        E'\n',
        nullif(observacoes, ''),
        'Venda cancelada/excluida'
      )
    ),
    updated_at = now()
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) in ('pendente', 'calculado');
end;
$$;

revoke all on function public.fn_detalhes_venda(uuid) from public, anon, authenticated;
revoke all on function public.fn_reabrir_venda_para_caixa(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.fn_excluir_venda_completa(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.fn_criar_comanda_por_agendamento(uuid) from public, anon, authenticated;

grant execute on function public.fn_detalhes_venda(uuid) to service_role;
grant execute on function public.fn_reabrir_venda_para_caixa(uuid, text, uuid) to service_role;
grant execute on function public.fn_excluir_venda_completa(uuid, text, uuid) to service_role;
grant execute on function public.fn_criar_comanda_por_agendamento(uuid) to service_role;
