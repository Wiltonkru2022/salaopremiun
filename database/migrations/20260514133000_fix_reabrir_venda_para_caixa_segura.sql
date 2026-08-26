create or replace function public.impedir_edicao_comanda_bloqueada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_comanda uuid;
  v_reabertura_autorizada boolean := current_setting('app.reabrindo_venda_para_caixa', true) = 'on';
  v_allowed_comanda_keys text[] := array[
    'status',
    'updated_at',
    'fechada_em',
    'cancelada_em',
    'observacoes',
    'reaberta_em',
    'reopened_at',
    'reopened_by',
    'deleted_at',
    'deleted_by',
    'motivo_cancelamento',
    'motivo_reabertura',
    'motivo_exclusao'
  ];
  v_allowed_item_keys text[] := array[
    'id_servico',
    'custo_total',
    'comissao_percentual_aplicada',
    'comissao_valor_aplicado',
    'comissao_assistente_percentual_aplicada',
    'comissao_assistente_valor_aplicado',
    'base_calculo_aplicada',
    'desconta_taxa_maquininha_aplicada',
    'updated_at'
  ];
begin
  if TG_TABLE_NAME = 'comandas' then
    if TG_OP = 'UPDATE'
      and lower(coalesce(old.status, '')) in ('fechada', 'cancelada')
      and v_reabertura_autorizada
      and lower(coalesce(new.status, '')) in ('aguardando_pagamento', 'aberta', 'em_atendimento')
    then
      return new;
    end if;

    if TG_OP = 'UPDATE'
      and lower(coalesce(old.status, '')) in ('fechada', 'cancelada')
      and (to_jsonb(new) - v_allowed_comanda_keys) <>
          (to_jsonb(old) - v_allowed_comanda_keys)
    then
      raise exception 'Comanda fechada ou cancelada nao pode ter dados financeiros alterados.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_id_comanda := new.id_comanda;
  elsif TG_OP = 'UPDATE' then
    v_id_comanda := coalesce(new.id_comanda, old.id_comanda);
  else
    v_id_comanda := old.id_comanda;
  end if;

  if public.comanda_status_bloqueado(v_id_comanda) then
    if TG_TABLE_NAME = 'comanda_itens'
      and TG_OP = 'UPDATE'
      and (to_jsonb(new) - v_allowed_item_keys) =
          (to_jsonb(old) - v_allowed_item_keys)
    then
      return new;
    end if;

    raise exception 'Comanda fechada ou cancelada nao permite alterar %.', TG_TABLE_NAME
      using errcode = '23514';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
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

  perform set_config('app.reabrindo_venda_para_caixa', 'on', true);

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
          case when p_reopened_by is null then '' else ' usuario=' || p_reopened_by::text end,
          case when p_motivo is null or btrim(p_motivo) = '' then '' else ' motivo=' || btrim(p_motivo) end
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

revoke all on function public.fn_reabrir_venda_para_caixa(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.fn_reabrir_venda_para_caixa(uuid, text, uuid) to service_role;
