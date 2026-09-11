create or replace function public.fn_gerar_comissoes_comanda(p_id_comanda uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_comanda_status text;
  v_comanda_fechada_em timestamptz;
  v_comanda_id_salao uuid;
  v_competencia date;
  v_taxa_total numeric(12, 2);
  v_subtotal_itens numeric(12, 2);

  v_id_servico uuid;
  v_servico_padrao_percentual numeric(12, 4);
  v_servico_percentual numeric(12, 4);
  v_servico_assistente_percentual numeric(12, 4);
  v_servico_base_calculo text;
  v_servico_desconta_taxa boolean;

  v_vinculo_id uuid;
  v_vinculo_percentual numeric(12, 4);
  v_vinculo_assistente_percentual numeric(12, 4);
  v_vinculo_base_calculo text;
  v_vinculo_desconta_taxa boolean;

  v_base_original numeric(12, 2);
  v_base_calculo numeric(12, 2);
  v_base_profissional numeric(12, 2);
  v_percentual numeric(12, 4);
  v_percentual_assistente numeric(12, 4);
  v_valor_profissional_bruto numeric(12, 2);
  v_valor_profissional_final numeric(12, 2);
  v_valor_assistente numeric(12, 2);
  v_origem text;
  v_taxa_item numeric(12, 2);
  v_id_lancamento_assistente uuid;
  v_assistente_vinculado boolean;
begin
  select
    c.status,
    c.fechada_em,
    c.id_salao
  into
    v_comanda_status,
    v_comanda_fechada_em,
    v_comanda_id_salao
  from public.comandas c
  where c.id = p_id_comanda;

  if not found then
    raise exception 'Comanda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if lower(coalesce(v_comanda_status, '')) <> 'fechada' then
    return;
  end if;

  v_competencia := coalesce(v_comanda_fechada_em::date, current_date);

  select coalesce(round(sum(ci.valor_total)::numeric, 2), 0)
    into v_subtotal_itens
  from public.comanda_itens ci
  where ci.id_comanda = p_id_comanda
    and coalesce(ci.ativo, true) = true;

  select coalesce(round(sum(cp.taxa_maquininha_valor)::numeric, 2), 0)
    into v_taxa_total
  from public.comanda_pagamentos cp
  where cp.id_comanda = p_id_comanda;

  delete from public.comissoes_assistentes
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) = 'pendente';

  delete from public.comissoes_lancamentos
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) = 'pendente';

  for v_item in
    select
      ci.id,
      ci.id_servico,
      ci.id_agendamento,
      ci.id_profissional,
      ci.id_assistente,
      ci.tipo_item,
      ci.valor_total,
      ci.custo_total,
      ci.comissao_percentual_aplicada,
      ci.comissao_assistente_percentual_aplicada,
      ci.base_calculo_aplicada,
      ci.desconta_taxa_maquininha_aplicada,
      ci.descricao
    from public.comanda_itens ci
    where ci.id_comanda = p_id_comanda
      and coalesce(ci.ativo, true) = true
  loop
    v_id_servico := v_item.id_servico;
    v_servico_padrao_percentual := null;
    v_servico_percentual := null;
    v_servico_assistente_percentual := null;
    v_servico_base_calculo := null;
    v_servico_desconta_taxa := null;
    v_vinculo_id := null;
    v_vinculo_percentual := null;
    v_vinculo_assistente_percentual := null;
    v_vinculo_base_calculo := null;
    v_vinculo_desconta_taxa := null;

    if v_id_servico is null and v_item.id_agendamento is not null then
      select a.servico_id
        into v_id_servico
      from public.agendamentos a
      where a.id = v_item.id_agendamento;
    end if;

    if v_id_servico is not null then
      select
        s.comissao_percentual_padrao,
        s.comissao_percentual,
        s.comissao_assistente_percentual,
        s.base_calculo,
        s.desconta_taxa_maquininha
      into
        v_servico_padrao_percentual,
        v_servico_percentual,
        v_servico_assistente_percentual,
        v_servico_base_calculo,
        v_servico_desconta_taxa
      from public.servicos s
      where s.id = v_id_servico;

      if v_item.id_profissional is not null then
        select
          ps.id,
          ps.comissao_percentual,
          ps.comissao_assistente_percentual,
          ps.base_calculo,
          ps.desconta_taxa_maquininha
        into
          v_vinculo_id,
          v_vinculo_percentual,
          v_vinculo_assistente_percentual,
          v_vinculo_base_calculo,
          v_vinculo_desconta_taxa
        from public.profissional_servicos ps
        where ps.id_profissional = v_item.id_profissional
          and ps.id_servico = v_id_servico
          and coalesce(ps.ativo, true) = true
        limit 1;
      end if;
    end if;

    v_percentual := coalesce(
      v_vinculo_percentual,
      v_servico_padrao_percentual,
      v_servico_percentual,
      v_item.comissao_percentual_aplicada,
      0
    )::numeric;

    v_percentual_assistente := coalesce(
      v_vinculo_assistente_percentual,
      v_servico_assistente_percentual,
      v_item.comissao_assistente_percentual_aplicada,
      0
    )::numeric;

    v_origem := case
      when v_vinculo_id is not null then 'profissional_servico'
      when coalesce(v_servico_padrao_percentual, v_servico_percentual) is not null then 'servico_padrao'
      when v_percentual <= 0 then 'sem_regra'
      else 'manual'
    end;

    if lower(coalesce(
      v_vinculo_base_calculo,
      v_servico_base_calculo,
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
      v_vinculo_desconta_taxa,
      v_servico_desconta_taxa,
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
      where pa.id_salao = v_comanda_id_salao
        and pa.id_profissional = v_item.id_profissional
        and pa.id_assistente = v_item.id_assistente
        and coalesce(pa.ativo, true) = true
    );

    if not v_assistente_vinculado then
      v_percentual_assistente := 0;
    end if;

    if lower(coalesce(
      v_vinculo_base_calculo,
      v_servico_base_calculo,
      v_item.base_calculo_aplicada,
      'bruto'
    )) like 'liquido%' then
      v_base_profissional := greatest(round(v_base_original - v_taxa_item, 2), 0);
      v_valor_assistente := round((v_base_profissional * v_percentual_assistente) / 100, 2);
      v_valor_profissional_bruto := round((v_base_profissional * v_percentual) / 100, 2);
      v_valor_profissional_final := greatest(round(v_valor_profissional_bruto - v_valor_assistente, 2), 0);
      v_base_calculo := v_base_profissional;
    else
      v_base_calculo := v_base_original;
      v_valor_assistente := round((v_base_calculo * v_percentual_assistente) / 100, 2);
      v_valor_profissional_bruto := round((v_base_calculo * v_percentual) / 100, 2);
      v_valor_profissional_final := greatest(round(v_valor_profissional_bruto - v_taxa_item - v_valor_assistente, 2), 0);
    end if;

    update public.comanda_itens
    set
      id_servico = coalesce(id_servico, v_id_servico),
      comissao_percentual_aplicada = v_percentual,
      comissao_valor_aplicado = v_valor_profissional_final,
      comissao_assistente_percentual_aplicada = v_percentual_assistente,
      comissao_assistente_valor_aplicado = v_valor_assistente,
      base_calculo_aplicada = coalesce(
        v_vinculo_base_calculo,
        v_servico_base_calculo,
        v_item.base_calculo_aplicada,
        'bruto'
      ),
      desconta_taxa_maquininha_aplicada = coalesce(
        v_vinculo_desconta_taxa,
        v_servico_desconta_taxa,
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
        v_comanda_id_salao,
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
        coalesce(v_comanda_fechada_em, now()),
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
        v_comanda_id_salao,
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
        'Calculada no fechamento da comanda.',
        'assistente',
        coalesce(v_comanda_fechada_em, now()),
        now()
      );

      insert into public.comissoes_assistentes (
        id,
        id_salao,
        id_comanda,
        id_comanda_item,
        id_profissional,
        id_assistente,
        percentual,
        valor_base,
        valor_comissao,
        status,
        competencia_data,
        observacoes,
        created_at,
        updated_at
      )
      values (
        gen_random_uuid(),
        v_comanda_id_salao,
        p_id_comanda,
        v_item.id,
        v_item.id_profissional,
        v_item.id_assistente,
        v_percentual_assistente,
        v_base_calculo,
        v_valor_assistente,
        'pendente',
        v_competencia,
        'Gerada automaticamente no fechamento da comanda.',
        coalesce(v_comanda_fechada_em, now()),
        now()
      );
    end if;
  end loop;
end;
$$;
