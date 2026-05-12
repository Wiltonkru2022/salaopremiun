alter table public.checklist_itens
  add column if not exists peso integer not null default 10,
  add column if not exists categoria text not null default 'onboarding',
  add column if not exists regra_json jsonb not null default '{}'::jsonb,
  add column if not exists atualizado_em timestamptz not null default now();

create index if not exists checklist_itens_categoria_ordem_idx
  on public.checklist_itens (categoria, ordem);

update public.checklist_itens
set
  peso = case codigo
    when 'cadastro_salao' then 12
    when 'profissionais' then 10
    when 'servicos' then 12
    when 'clientes' then 8
    when 'agendamentos' then 12
    when 'comandas' then 10
    when 'vendas' then 14
    when 'caixa' then 10
    when 'dias_acesso' then 6
    when 'modulos' then 6
    else peso
  end,
  categoria = 'onboarding',
  regra_json = case codigo
    when 'cadastro_salao' then '{"tipo":"booleano","campo":"cadastro_completo"}'::jsonb
    when 'profissionais' then '{"tipo":"minimo","campo":"profissionais","valor":2}'::jsonb
    when 'servicos' then '{"tipo":"minimo","campo":"servicos","valor":5}'::jsonb
    when 'clientes' then '{"tipo":"minimo","campo":"clientes","valor":5}'::jsonb
    when 'agendamentos' then '{"tipo":"minimo","campo":"agendamentos","valor":3}'::jsonb
    when 'comandas' then '{"tipo":"minimo","campo":"comandas","valor":1}'::jsonb
    when 'vendas' then '{"tipo":"minimo","campo":"vendas","valor":1}'::jsonb
    when 'caixa' then '{"tipo":"minimo","campo":"caixas","valor":1}'::jsonb
    when 'dias_acesso' then '{"tipo":"minimo","campo":"dias_com_acesso","valor":3}'::jsonb
    when 'modulos' then '{"tipo":"minimo","campo":"modulos_usados","valor":4}'::jsonb
    else regra_json
  end,
  atualizado_em = now();

create or replace function public.fn_admin_master_calcular_score_onboarding(p_id_salao uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer := 0;
  v_score_raw integer := 0;
  v_total_peso integer := 0;
  v_dias_acesso integer := 0;
  v_modulos_usados integer := 0;
  v_cadastro boolean := false;
  v_profissionais integer := 0;
  v_servicos integer := 0;
  v_clientes integer := 0;
  v_agendamentos integer := 0;
  v_comandas integer := 0;
  v_vendas integer := 0;
  v_caixas integer := 0;
  v_detalhes jsonb;
begin
  select (
    coalesce(nome, '') <> ''
    and coalesce(responsavel, '') <> ''
    and coalesce(telefone, whatsapp, '') <> ''
  )
  into v_cadastro
  from public.saloes
  where id = p_id_salao;

  select count(*) into v_profissionais from public.profissionais
  where id_salao = p_id_salao and coalesce(ativo, true) = true;

  select count(*) into v_servicos from public.servicos
  where id_salao = p_id_salao and coalesce(ativo, true) = true;

  select count(*) into v_clientes from public.clientes
  where id_salao = p_id_salao and deleted_at is null;

  select count(*) into v_agendamentos from public.agendamentos
  where id_salao = p_id_salao;

  select count(*) into v_comandas from public.comandas
  where id_salao = p_id_salao;

  select count(*) into v_vendas from public.comandas
  where id_salao = p_id_salao and lower(coalesce(status, '')) = 'fechada';

  select count(*) into v_caixas from public.caixa_sessoes
  where id_salao = p_id_salao;

  v_modulos_usados :=
    (case when v_agendamentos > 0 then 1 else 0 end) +
    (case when v_comandas > 0 then 1 else 0 end) +
    (case when v_vendas > 0 then 1 else 0 end) +
    (case when v_caixas > 0 then 1 else 0 end) +
    (case when v_clientes > 0 then 1 else 0 end) +
    (case when v_profissionais > 0 then 1 else 0 end);

  v_dias_acesso := least(3, greatest(0, v_modulos_usados - 1));

  select coalesce(sum(peso), 100)
    into v_total_peso
  from public.checklist_itens
  where ativo = true
    and categoria = 'onboarding';

  v_score_raw :=
    (case when v_cadastro then coalesce((select peso from public.checklist_itens where codigo = 'cadastro_salao' and ativo = true), 10) else 0 end) +
    (case when v_profissionais >= 2 then coalesce((select peso from public.checklist_itens where codigo = 'profissionais' and ativo = true), 10) else 0 end) +
    (case when v_servicos >= 5 then coalesce((select peso from public.checklist_itens where codigo = 'servicos' and ativo = true), 10) else 0 end) +
    (case when v_clientes >= 5 then coalesce((select peso from public.checklist_itens where codigo = 'clientes' and ativo = true), 10) else 0 end) +
    (case when v_agendamentos >= 3 then coalesce((select peso from public.checklist_itens where codigo = 'agendamentos' and ativo = true), 10) else 0 end) +
    (case when v_comandas >= 1 then coalesce((select peso from public.checklist_itens where codigo = 'comandas' and ativo = true), 10) else 0 end) +
    (case when v_vendas >= 1 then coalesce((select peso from public.checklist_itens where codigo = 'vendas' and ativo = true), 10) else 0 end) +
    (case when v_caixas >= 1 then coalesce((select peso from public.checklist_itens where codigo = 'caixa' and ativo = true), 10) else 0 end) +
    (case when v_dias_acesso >= 3 then coalesce((select peso from public.checklist_itens where codigo = 'dias_acesso' and ativo = true), 10) else 0 end) +
    (case when v_modulos_usados >= 4 then coalesce((select peso from public.checklist_itens where codigo = 'modulos' and ativo = true), 10) else 0 end);

  v_score := least(100, greatest(0, round((v_score_raw::numeric / greatest(v_total_peso, 1)) * 100)::integer));

  v_detalhes := jsonb_build_object(
    'cadastro_completo', v_cadastro,
    'profissionais', v_profissionais,
    'servicos', v_servicos,
    'clientes', v_clientes,
    'agendamentos', v_agendamentos,
    'comandas', v_comandas,
    'vendas', v_vendas,
    'caixas', v_caixas,
    'dias_com_acesso', v_dias_acesso,
    'modulos_usados', v_modulos_usados,
    'score_raw', v_score_raw,
    'peso_total', v_total_peso
  );

  insert into public.score_onboarding_salao (
    id_salao,
    score_total,
    dias_com_acesso,
    modulos_usados,
    detalhes_json,
    atualizado_em
  )
  values (p_id_salao, v_score, v_dias_acesso, v_modulos_usados, v_detalhes, now())
  on conflict (id_salao) do update set
    score_total = excluded.score_total,
    dias_com_acesso = excluded.dias_com_acesso,
    modulos_usados = excluded.modulos_usados,
    detalhes_json = excluded.detalhes_json,
    atualizado_em = now();

  return v_score;
end;
$$;

grant select, insert, update on table public.checklist_itens to service_role;
grant select, insert, update on table public.checklists_salao to service_role;
grant select, insert, update on table public.trial_extensoes_regras to service_role;
grant select, insert, update on table public.trial_extensoes_automaticas to service_role;
