begin;

create or replace function public.fn_dashboard_resumo_painel()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_usuario public.usuarios;
  v_result jsonb;
begin
  v_usuario := public.fn_usuario_atual();

  if v_usuario.id is null then
    raise exception 'Usuario nao encontrado';
  end if;

  if v_usuario.status <> 'ativo' then
    raise exception 'Usuario inativo';
  end if;

  with limites as (
    select
      current_date as hoje,
      localtimestamp as agora_local,
      (localtimestamp + interval '2 hours') as daqui_duas_horas,
      date_trunc('month', now()) as inicio_mes,
      (date_trunc('month', now()) + interval '1 month') as fim_mes,
      date_trunc('day', now()) as inicio_dia,
      (date_trunc('day', now()) + interval '1 day') as fim_dia
  ),
  agendamentos_hoje as (
    select count(*)::int as total
    from public.agendamentos a
    cross join limites l
    where a.id_salao = v_usuario.id_salao
      and a.data = l.hoje
      and a.status in ('confirmado', 'pendente', 'atendido', 'aguardando_pagamento')
  ),
  proximos_confirmados as (
    select count(*)::int as total
    from public.agendamentos a
    cross join limites l
    where a.id_salao = v_usuario.id_salao
      and a.status = 'confirmado'
      and (a.data + a.hora_inicio) >= l.agora_local
      and (a.data + a.hora_inicio) <= l.daqui_duas_horas
  ),
  clientes_ativos as (
    select count(*)::int as total
    from public.clientes c
    where c.id_salao = v_usuario.id_salao
  ),
  comandas_mes as (
    select
      count(*)::int as total,
      coalesce(sum(coalesce(c.total, 0)), 0)::numeric as faturamento,
      count(distinct c.id_cliente)::int as clientes_unicos
    from public.comandas c
    cross join limites l
    where c.id_salao = v_usuario.id_salao
      and c.status = 'fechada'
      and c.fechada_em >= l.inicio_mes
      and c.fechada_em < l.fim_mes
  ),
  comissoes_pendentes as (
    select coalesce(sum(coalesce(cl.valor_comissao, 0)), 0)::numeric as total
    from public.comissoes_lancamentos cl
    cross join limites l
    where cl.id_salao = v_usuario.id_salao
      and cl.status = 'pendente'
      and cl.competencia_data >= l.inicio_mes::date
      and cl.competencia_data < l.fim_mes::date
  ),
  caixa_dia as (
    select coalesce(sum(coalesce(c.total, 0)), 0)::numeric as total
    from public.comandas c
    cross join limites l
    where c.id_salao = v_usuario.id_salao
      and c.status = 'fechada'
      and c.fechada_em >= l.inicio_dia
      and c.fechada_em < l.fim_dia
  ),
  profissionais_ativos as (
    select count(*)::int as total
    from public.profissionais p
    where p.id_salao = v_usuario.id_salao
      and p.status = 'ativo'
  ),
  aguardando_pagamento as (
    select count(*)::int as total
    from public.comandas c
    where c.id_salao = v_usuario.id_salao
      and c.status = 'aguardando_pagamento'
  ),
  cancelamentos_mes as (
    select count(*)::int as total
    from public.agendamentos a
    cross join limites l
    where a.id_salao = v_usuario.id_salao
      and a.status = 'cancelado'
      and a.data >= l.inicio_mes::date
      and a.data < l.fim_mes::date
  ),
  salao_info as (
    select coalesce(s.plano, '-') as plano
    from public.saloes s
    where s.id = v_usuario.id_salao
    limit 1
  )
  select jsonb_build_object(
    'usuario', jsonb_build_object(
      'id', v_usuario.id,
      'id_salao', v_usuario.id_salao,
      'nivel', v_usuario.nivel,
      'status', v_usuario.status
    ),
    'resumo', jsonb_build_object(
      'agendamentosHoje', coalesce((select total from agendamentos_hoje), 0),
      'proximosConfirmados', coalesce((select total from proximos_confirmados), 0),
      'clientesAtivos', coalesce((select total from clientes_ativos), 0),
      'servicosMes', coalesce((select total from comandas_mes), 0),
      'faturamentoMes', coalesce((select faturamento from comandas_mes), 0),
      'ticketMedioMes',
        case
          when coalesce((select total from comandas_mes), 0) > 0
            then round(
              (select faturamento from comandas_mes)
              / greatest((select total from comandas_mes), 1)::numeric,
              2
            )
          else 0
        end,
      'comissaoPendenteMes', coalesce((select total from comissoes_pendentes), 0),
      'caixaDia', coalesce((select total from caixa_dia), 0),
      'retornoClientes',
        case
          when coalesce((select clientes_unicos from comandas_mes), 0) > 0
            then least(
              round(
                ((select total from comandas_mes)::numeric
                / greatest((select clientes_unicos from comandas_mes), 1)::numeric) * 100
              ),
              100
            )::int
          else 0
        end,
      'profissionaisAtivos', coalesce((select total from profissionais_ativos), 0),
      'cancelamentosMes', coalesce((select total from cancelamentos_mes), 0),
      'aguardandoPagamento', coalesce((select total from aguardando_pagamento), 0),
      'planoSalao', coalesce((select plano from salao_info), '-'),
      'notificacoesPendentes',
        coalesce((select total from aguardando_pagamento), 0)
        + coalesce((select total from proximos_confirmados), 0)
    )
  )
  into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

grant execute on function public.fn_dashboard_resumo_painel() to authenticated;

commit;
