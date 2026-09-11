create or replace function public.fn_gerar_comissoes_comanda(p_id_comanda uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_item record;
  v_agendamento record;
  v_servico record;
  v_vinculo record;
  v_base_original numeric(12, 2);
  v_base_calculo numeric(12, 2);
  v_base_profissional numeric(12, 2);
  v_percentual numeric(12, 4);
  v_percentual_assistente numeric(12, 4);
  v_valor_profissional_bruto numeric(12, 2);
  v_valor_profissional_final numeric(12, 2);
  v_valor_assistente numeric(12, 2);
  v_competencia date;
  v_origem text;
  v_taxa_total numeric(12, 2);
  v_subtotal_itens numeric(12, 2);
  v_taxa_item numeric(12, 2);
  v_id_servico uuid;
  v_id_lancamento_assistente uuid;
  v_assistente_vinculado boolean;
begin
  select *
    into v_comanda
  from public.comandas
  where id = p_id_comanda;

  if not found then
    raise exception 'Comanda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if lower(coalesce(v_comanda.status, '')) <> 'fechada' then
    return;
  end if;

  v_competencia := coalesce(v_comanda.fechada_em::date, current_date);

  select coalesce(round(sum(valor_total)::numeric, 2), 0)
    into v_subtotal_itens
  from public.comanda_itens
  where id_comanda = p_id_comanda
    and coalesce(ativo, true) = true;

  select coalesce(round(sum(taxa_maquininha_valor)::numeric, 2), 0)
    into v_taxa_total
  from public.comanda_pagamentos
  where id_comanda = p_id_comanda;

  delete from public.comissoes_assistentes
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) = 'pendente';

  delete from public.comissoes_lancamentos
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) = 'pendente';

  for v_item in
    select *
    from public.comanda_itens
    where id_comanda = p_id_comanda
      and coalesce(ativo, true) = true
  loop
    select null::uuid as servico_id
      into v_agendamento;

    select
      null::uuid as id,
      null::numeric as comissao_percentual_padrao,
      null::numeric as comissao_percentual,
      null::numeric as comissao_assistente_percentual,
      null::text as base_calculo,
      null::boolean as desconta_taxa_maquininha
      into v_servico;

    select
      null::uuid as id,
      null::numeric as comissao_percentual,
      null::numeric as comissao_assistente_percentual,
      null::text as base_calculo,
      null::boolean as desconta_taxa_maquininha
      into v_vinculo;

    v_id_servico := v_item.id_servico;

    if v_id_servico is null and v_item.id_agendamento is not null then
      select *
        into v_agendamento
      from public.agendamentos
      where id = v_item.id_agendamento;

      v_id_servico := v_agendamento.servico_id;
    end if;

    if v_id_servico is not null then
      select *
        into v_servico
      from public.servicos
      where id = v_id_servico;

      if v_item.id_profissional is not null then
        select *
          into v_vinculo
        from public.profissional_servicos
        where id_profissional = v_item.id_profissional
          and id_servico = v_id_servico
          and coalesce(ativo, true) = true
        limit 1;
      end if;
    end if;

    v_percentual := coalesce(
      v_vinculo.comissao_percentual,
      v_servico.comissao_percentual_padrao,
      v_servico.comissao_percentual,
      v_item.comissao_percentual_aplicada,
      0
    )::numeric;

    v_percentual_assistente := coalesce(
      v_vinculo.comissao_assistente_percentual,
      v_servico.comissao_assistente_percentual,
      v_item.comissao_assistente_percentual_aplicada,
      0
    )::numeric;

    v_origem := case
      when v_vinculo.id is not null then 'profissional_servico'
      when coalesce(v_servico.comissao_percentual_padrao, v_servico.comissao_percentual) is not null then 'servico_padrao'
      when v_percentual <= 0 then 'sem_regra'
      else 'manual'
    end;

    if lower(coalesce(
      v_vinculo.base_calculo,
      v_servico.base_calculo,
      v_item.base_calculo_aplicada,
      'bruto'
    )) like 'liquido%' then
      v_base_original := greatest(
        round(coalesce(v_item.valor_total, 0)::numeric - coalesce(v_item.custo_total, 0)::numeric, 2),
        0
      );
    else
      v_base_original := round(coalesce(v_item.valor_total, 0)::numeric, 2);
    end if;

    if coalesce(
      v_vinculo.desconta_taxa_maquininha,
      v_servico.desconta_taxa_maquininha,
      v_item.desconta_taxa_maquininha_aplicada,
      false
    )
    and v_taxa_total > 0
    and v_subtotal_itens > 0 then
      v_taxa_item := round((v_taxa_total * coalesce(v_item.valor_total, 0)::numeric) / v_subtotal_itens, 2);
    else
      v_taxa_item := 0;
    end if;

    v_assistente_vinculado := exists (
      select 1
      from public.profissional_assistentes pa
      where pa.id_salao = v_comanda.id_salao
        and pa.id_profissional = v_item.id_profissional
        and pa.id_assistente = v_item.id_assistente
        and coalesce(pa.ativo, true) = true
    );

    if not v_assistente_vinculado then
      v_percentual_assistente := 0;
    end if;

    if lower(coalesce(
      v_vinculo.base_calculo,
      v_servico.base_calculo,
      v_item.base_calculo_aplicada,
      'bruto'
    )) like 'liquido%' then
      v_base_profissional := greatest(round(v_base_original - v_taxa_item, 2), 0);
      v_valor_assistente := round((v_base_profissional * v_percentual_assistente) / 100, 2);
      v_valor_profissional_bruto := round((v_base_profissional * v_percentual) / 100, 2);
      v_valor_profissional_final := greatest(
        round(v_valor_profissional_bruto - v_valor_assistente, 2),
        0
      );
      v_base_calculo := v_base_profissional;
    else
      v_base_calculo := v_base_original;
      v_valor_assistente := round((v_base_calculo * v_percentual_assistente) / 100, 2);
      v_valor_profissional_bruto := round((v_base_calculo * v_percentual) / 100, 2);
      v_valor_profissional_final := greatest(
        round(v_valor_profissional_bruto - v_taxa_item - v_valor_assistente, 2),
        0
      );
    end if;

    update public.comanda_itens
    set
      id_servico = coalesce(id_servico, v_id_servico),
      comissao_percentual_aplicada = v_percentual,
      comissao_valor_aplicado = v_valor_profissional_final,
      comissao_assistente_percentual_aplicada = v_percentual_assistente,
      comissao_assistente_valor_aplicado = v_valor_assistente,
      base_calculo_aplicada = coalesce(
        v_vinculo.base_calculo,
        v_servico.base_calculo,
        v_item.base_calculo_aplicada,
        'bruto'
      ),
      desconta_taxa_maquininha_aplicada = coalesce(
        v_vinculo.desconta_taxa_maquininha,
        v_servico.desconta_taxa_maquininha,
        v_item.desconta_taxa_maquininha_aplicada,
        false
      ),
      updated_at = now()
    where id = v_item.id;

    if v_item.id_profissional is not null
      and (
        lower(coalesce(v_item.tipo_item, '')) = 'servico'
        or v_percentual > 0
      )
    then
      insert into public.comissoes_lancamentos (
        id,
        id_salao,
        id_comanda,
        id_comanda_item,
        id_profissional,
        id_assistente,
        tipo_destinatario,
        tipo_profissional,
        descricao,
        percentual,
        percentual_aplicado,
        valor_base,
        valor_comissao,
        valor_comissao_assistente,
        status,
        competencia_data,
        observacoes,
        origem_percentual,
        criado_em,
        updated_at
      )
      values (
        gen_random_uuid(),
        v_comanda.id_salao,
        p_id_comanda,
        v_item.id,
        v_item.id_profissional,
        case when v_assistente_vinculado then v_item.id_assistente else null end,
        'profissional',
        'profissional',
        coalesce(v_item.descricao, 'Servico'),
        v_percentual,
        v_percentual,
        v_base_calculo,
        v_valor_profissional_final,
        0,
        'pendente',
        v_competencia,
        concat(
          'Calculada no fechamento. Bruto: ',
          round(v_valor_profissional_bruto, 2),
          '; taxa descontada: ',
          round(v_taxa_item, 2),
          '; assistente descontado: ',
          round(v_valor_assistente, 2),
          '.'
        ),
        v_origem,
        coalesce(v_comanda.fechada_em, now()),
        now()
      );
    end if;

    if v_assistente_vinculado and v_percentual_assistente > 0 then
      v_id_lancamento_assistente := gen_random_uuid();

      insert into public.comissoes_lancamentos (
        id,
        id_salao,
        id_comanda,
        id_comanda_item,
        id_profissional,
        id_assistente,
        tipo_destinatario,
        tipo_profissional,
        descricao,
        percentual,
        percentual_aplicado,
        valor_base,
        valor_comissao,
        valor_comissao_assistente,
        status,
        competencia_data,
        observacoes,
        origem_percentual,
        criado_em,
        updated_at
      )
      values (
        v_id_lancamento_assistente,
        v_comanda.id_salao,
        p_id_comanda,
        v_item.id,
        v_item.id_assistente,
        v_item.id_assistente,
        'assistente',
        'assistente',
        coalesce(v_item.descricao, 'Servico') || ' - assistente',
        v_percentual_assistente,
        v_percentual_assistente,
        v_base_calculo,
        v_valor_assistente,
        v_valor_assistente,
        'pendente',
        v_competencia,
        'Comissao do assistente separada do valor final do profissional.',
        'assistente',
        coalesce(v_comanda.fechada_em, now()),
        now()
      );

      insert into public.comissoes_assistentes (
        id_salao,
        id_comanda,
        id_comanda_item,
        id_profissional,
        id_assistente,
        id_comissao_lancamento,
        descricao,
        percentual_aplicado,
        valor_base,
        valor_assistente,
        status,
        competencia_data,
        observacoes,
        criado_em,
        updated_at
      )
      values (
        v_comanda.id_salao,
        p_id_comanda,
        v_item.id,
        v_item.id_profissional,
        v_item.id_assistente,
        v_id_lancamento_assistente,
        coalesce(v_item.descricao, 'Servico'),
        v_percentual_assistente,
        v_base_calculo,
        v_valor_assistente,
        'pendente',
        v_competencia,
        'Valor reservado para pagamento do assistente.',
        coalesce(v_comanda.fechada_em, now()),
        now()
      );
    end if;
  end loop;
end;
$$;
