create or replace function public.fn_salvar_servico_catalogo_transacional(
  p_id_salao uuid,
  p_id_servico uuid,
  p_servico jsonb,
  p_vinculos jsonb default '[]'::jsonb,
  p_consumos jsonb default '[]'::jsonb
)
returns table(id_servico uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_servico uuid;
begin
  if p_id_salao is null then
    raise exception 'Salao obrigatorio.';
  end if;

  if nullif(trim(p_servico->>'nome'), '') is null then
    raise exception 'Informe o nome do servico.';
  end if;

  if p_id_servico is null then
    insert into public.servicos (
      id_salao,
      nome,
      id_categoria,
      categoria,
      descricao,
      gatilho_retorno_dias,
      duracao_minutos,
      pausa_minutos,
      recurso_nome,
      preco_padrao,
      preco_variavel,
      preco_minimo,
      custo_produto,
      comissao_percentual_padrao,
      comissao_assistente_percentual,
      base_calculo,
      desconta_taxa_maquininha,
      exige_avaliacao,
      ativo,
      status
    )
    values (
      p_id_salao,
      p_servico->>'nome',
      nullif(p_servico->>'id_categoria', '')::uuid,
      nullif(p_servico->>'categoria', ''),
      nullif(p_servico->>'descricao', ''),
      nullif(p_servico->>'gatilho_retorno_dias', '')::integer,
      coalesce(nullif(p_servico->>'duracao_minutos', '')::integer, 0),
      coalesce(nullif(p_servico->>'pausa_minutos', '')::integer, 0),
      nullif(p_servico->>'recurso_nome', ''),
      coalesce(nullif(p_servico->>'preco_padrao', '')::numeric, 0),
      coalesce((p_servico->>'preco_variavel')::boolean, false),
      nullif(p_servico->>'preco_minimo', '')::numeric,
      coalesce(nullif(p_servico->>'custo_produto', '')::numeric, 0),
      nullif(p_servico->>'comissao_percentual_padrao', '')::numeric,
      coalesce(nullif(p_servico->>'comissao_assistente_percentual', '')::numeric, 0),
      coalesce(nullif(p_servico->>'base_calculo', ''), 'bruto'),
      coalesce((p_servico->>'desconta_taxa_maquininha')::boolean, false),
      coalesce((p_servico->>'exige_avaliacao')::boolean, false),
      coalesce((p_servico->>'ativo')::boolean, true),
      coalesce(nullif(p_servico->>'status', ''), 'ativo')
    )
    returning id into v_id_servico;
  else
    update public.servicos
      set nome = p_servico->>'nome',
          id_categoria = nullif(p_servico->>'id_categoria', '')::uuid,
          categoria = nullif(p_servico->>'categoria', ''),
          descricao = nullif(p_servico->>'descricao', ''),
          gatilho_retorno_dias = nullif(p_servico->>'gatilho_retorno_dias', '')::integer,
          duracao_minutos = coalesce(nullif(p_servico->>'duracao_minutos', '')::integer, 0),
          pausa_minutos = coalesce(nullif(p_servico->>'pausa_minutos', '')::integer, 0),
          recurso_nome = nullif(p_servico->>'recurso_nome', ''),
          preco_padrao = coalesce(nullif(p_servico->>'preco_padrao', '')::numeric, 0),
          preco_variavel = coalesce((p_servico->>'preco_variavel')::boolean, false),
          preco_minimo = nullif(p_servico->>'preco_minimo', '')::numeric,
          custo_produto = coalesce(nullif(p_servico->>'custo_produto', '')::numeric, 0),
          comissao_percentual_padrao = nullif(p_servico->>'comissao_percentual_padrao', '')::numeric,
          comissao_assistente_percentual = coalesce(nullif(p_servico->>'comissao_assistente_percentual', '')::numeric, 0),
          base_calculo = coalesce(nullif(p_servico->>'base_calculo', ''), 'bruto'),
          desconta_taxa_maquininha = coalesce((p_servico->>'desconta_taxa_maquininha')::boolean, false),
          exige_avaliacao = coalesce((p_servico->>'exige_avaliacao')::boolean, false),
          ativo = coalesce((p_servico->>'ativo')::boolean, true),
          status = coalesce(nullif(p_servico->>'status', ''), 'ativo')
      where id = p_id_servico
        and id_salao = p_id_salao
      returning id into v_id_servico;

    if v_id_servico is null then
      raise exception 'Servico nao encontrado para atualizacao.';
    end if;
  end if;

  delete from public.profissional_servicos
    where id_salao = p_id_salao
      and id_servico = v_id_servico;

  insert into public.profissional_servicos (
    id_salao,
    id_profissional,
    id_servico,
    ativo,
    duracao_minutos,
    preco_personalizado,
    comissao_percentual,
    comissao_assistente_percentual,
    base_calculo,
    desconta_taxa_maquininha
  )
  select
    p_id_salao,
    v.id_profissional,
    v_id_servico,
    true,
    v.duracao_minutos,
    v.preco_personalizado,
    v.comissao_percentual,
    v.comissao_assistente_percentual,
    v.base_calculo,
    v.desconta_taxa_maquininha
  from jsonb_to_recordset(coalesce(p_vinculos, '[]'::jsonb)) as v(
    id_profissional uuid,
    ativo boolean,
    duracao_minutos integer,
    preco_personalizado numeric,
    comissao_percentual numeric,
    comissao_assistente_percentual numeric,
    base_calculo text,
    desconta_taxa_maquininha boolean
  )
  join public.profissionais p
    on p.id = v.id_profissional
   and p.id_salao = p_id_salao
   and lower(coalesce(p.tipo_profissional, 'profissional')) <> 'assistente'
  where coalesce(v.ativo, false) = true;

  delete from public.produto_servico_consumo
    where id_salao = p_id_salao
      and id_servico = v_id_servico;

  insert into public.produto_servico_consumo (
    id_salao,
    id_servico,
    id_produto,
    quantidade_consumo,
    unidade_medida,
    custo_estimado,
    ativo
  )
  select
    p_id_salao,
    v_id_servico,
    c.id_produto,
    c.quantidade_consumo,
    nullif(c.unidade_medida, ''),
    c.custo_estimado,
    coalesce(c.ativo, true)
  from jsonb_to_recordset(coalesce(p_consumos, '[]'::jsonb)) as c(
    id_produto uuid,
    quantidade_consumo numeric,
    unidade_medida text,
    custo_estimado numeric,
    ativo boolean
  )
  join public.produtos p
    on p.id = c.id_produto
   and p.id_salao = p_id_salao
  where coalesce(c.quantidade_consumo, 0) > 0;

  return query select v_id_servico;
end;
$$;

grant execute on function public.fn_salvar_servico_catalogo_transacional(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb
) to service_role;
