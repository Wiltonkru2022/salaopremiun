drop function if exists public.fn_atualizar_item_comanda(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  boolean,
  text,
  text,
  numeric,
  numeric
);

create or replace function public.fn_atualizar_item_comanda(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_item uuid,
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
    raise exception 'Comanda fechada ou cancelada nao pode atualizar itens.'
      using errcode = 'P0001';
  end if;

  update public.comanda_itens
  set
    tipo_item = lower(coalesce(p_tipo_item, 'extra')),
    id_agendamento = p_id_agendamento,
    id_servico = p_id_servico,
    id_produto = p_id_produto,
    descricao = coalesce(nullif(trim(coalesce(p_descricao, '')), ''), 'Item manual'),
    quantidade = greatest(coalesce(p_quantidade, 1), 1),
    valor_unitario = coalesce(p_valor_unitario, 0),
    valor_total = round((greatest(coalesce(p_quantidade, 1), 1) * coalesce(p_valor_unitario, 0))::numeric, 2),
    custo_total = coalesce(p_custo_total, 0),
    id_profissional = p_id_profissional,
    id_assistente = p_id_assistente,
    comissao_percentual_aplicada = coalesce(p_comissao_percentual, 0),
    comissao_valor_aplicado = 0,
    comissao_assistente_percentual_aplicada = coalesce(p_comissao_assistente_percentual, 0),
    comissao_assistente_valor_aplicado = 0,
    base_calculo_aplicada = coalesce(nullif(trim(coalesce(p_base_calculo, '')), ''), 'bruto'),
    desconta_taxa_maquininha_aplicada = coalesce(p_desconta_taxa_maquininha, false),
    origem = coalesce(nullif(trim(coalesce(p_origem, '')), ''), 'manual'),
    observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
    updated_at = now()
  where id = p_id_item
    and id_comanda = p_id_comanda
    and id_salao = p_id_salao;

  if not found then
    raise exception 'Item da comanda nao encontrado.'
      using errcode = 'P0001';
  end if;

  perform public.fn_recalcular_total_comanda(
    p_id_comanda,
    p_desconto,
    p_acrescimo
  );
end;
$$;

revoke all on function public.fn_atualizar_item_comanda(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  boolean,
  text,
  text,
  numeric,
  numeric
) from public, anon, authenticated;

grant execute on function public.fn_atualizar_item_comanda(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  boolean,
  text,
  text,
  numeric,
  numeric
) to service_role;
