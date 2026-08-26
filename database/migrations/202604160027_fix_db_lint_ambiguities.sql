-- Corrige referencias ambiguas apontadas pelo Supabase DB lint em funcoes criticas.

create or replace function public.fn_processar_comissoes_lancamentos(
  p_id_salao uuid,
  p_ids uuid[],
  p_acao text
)
returns table (
  total_lancamentos integer,
  total_vales numeric,
  total_profissionais_com_vales integer,
  ids_processados uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_total_lancamentos integer := 0;
  v_total_vales numeric := 0;
  v_total_profissionais_com_vales integer := 0;
  v_ids_processados uuid[] := '{}'::uuid[];
begin
  v_ids := array(
    select distinct unnest(coalesce(p_ids, '{}'::uuid[]))
  );

  if p_id_salao is null then
    raise exception 'id_salao obrigatorio.';
  end if;

  if p_acao not in ('marcar_pago', 'cancelar') then
    raise exception 'acao invalida para processamento de comissoes.';
  end if;

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return query
    select 0, 0::numeric, 0, '{}'::uuid[];
    return;
  end if;

  with alvo as (
    select
      c.id,
      c.id_profissional,
      lower(coalesce(c.tipo_destinatario, c.tipo_profissional, 'profissional')) as tipo_destinatario,
      lower(coalesce(c.status, '')) as status_normalizado
    from public.comissoes_lancamentos c
    where c.id_salao = p_id_salao
      and c.id = any(v_ids)
    for update
  ),
  atualizados as (
    update public.comissoes_lancamentos c
    set
      status = case
        when p_acao = 'marcar_pago' then 'pago'
        else 'cancelado'
      end,
      pago_em = case
        when p_acao = 'marcar_pago' then coalesce(c.pago_em, now())
        else c.pago_em
      end,
      updated_at = now()
    where c.id in (
      select a.id
      from alvo a
      where case
        when p_acao = 'marcar_pago' then a.status_normalizado = 'pendente'
        else a.status_normalizado <> 'cancelado'
      end
    )
    returning
      c.id,
      c.id_profissional,
      lower(coalesce(c.tipo_destinatario, c.tipo_profissional, 'profissional')) as tipo_destinatario
  ),
  resumo_atualizados as (
    select
      count(*)::integer as total_lancamentos,
      coalesce(array_agg(a.id), '{}'::uuid[]) as ids_processados
    from atualizados a
  ),
  profissionais_alvo as (
    select distinct on (a.id_profissional)
      a.id_profissional,
      a.id as id_comissao_lancamento
    from atualizados a
    where p_acao = 'marcar_pago'
      and a.tipo_destinatario <> 'assistente'
      and a.id_profissional is not null
    order by a.id_profissional, a.id
  ),
  vales_existentes as (
    select
      v.id,
      v.valor,
      v.id_profissional,
      p.id_comissao_lancamento
    from public.profissionais_vales v
    join profissionais_alvo p
      on p.id_profissional = v.id_profissional
    where v.id_salao = p_id_salao
      and v.status = 'aberto'
    for update
  ),
  vales_atualizados as (
    update public.profissionais_vales v
    set
      status = 'descontado',
      descontado_em = now(),
      id_comissao_lancamento = ve.id_comissao_lancamento,
      updated_at = now()
    from vales_existentes ve
    where v.id = ve.id
    returning
      ve.valor,
      ve.id_profissional
  )
  select
    coalesce((select ra.total_lancamentos from resumo_atualizados ra), 0),
    coalesce((select round(sum(va.valor)::numeric, 2) from vales_atualizados va), 0::numeric),
    coalesce((select count(distinct va.id_profissional)::integer from vales_atualizados va), 0),
    coalesce((select ra.ids_processados from resumo_atualizados ra), '{}'::uuid[])
  into
    v_total_lancamentos,
    v_total_vales,
    v_total_profissionais_com_vales,
    v_ids_processados;

  return query
  select
    v_total_lancamentos,
    v_total_vales,
    v_total_profissionais_com_vales,
    v_ids_processados;
end;
$$;

revoke all on function public.fn_processar_comissoes_lancamentos(uuid, uuid[], text)
  from public, anon, authenticated;
grant execute on function public.fn_processar_comissoes_lancamentos(uuid, uuid[], text)
  to service_role;

create or replace function public.fn_registrar_asaas_webhook_evento(
  p_fingerprint text,
  p_evento text,
  p_payment_id text,
  p_payment_status text,
  p_payload jsonb
)
returns table (
  id uuid,
  should_process boolean,
  status_processamento text,
  tentativas integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento public.asaas_webhook_eventos%rowtype;
  v_status_anterior text;
begin
  insert into public.asaas_webhook_eventos (
    fingerprint,
    evento,
    payment_id,
    payment_status,
    status_processamento,
    tentativas,
    payload,
    erro_mensagem,
    primeiro_recebido_em,
    ultimo_recebido_em,
    updated_at
  )
  values (
    p_fingerprint,
    p_evento,
    p_payment_id,
    p_payment_status,
    'processando',
    1,
    coalesce(p_payload, '{}'::jsonb),
    null,
    now(),
    now(),
    now()
  )
  returning * into v_evento;

  return query
  select v_evento.id, true, v_evento.status_processamento, v_evento.tentativas;
  return;
exception
  when unique_violation then
    select *
      into v_evento
    from public.asaas_webhook_eventos awe
    where awe.fingerprint = p_fingerprint
    for update;

    v_status_anterior := coalesce(v_evento.status_processamento, 'processando');

    update public.asaas_webhook_eventos awe
      set evento = p_evento,
          payment_id = p_payment_id,
          payment_status = p_payment_status,
          payload = coalesce(p_payload, '{}'::jsonb),
          tentativas = coalesce(v_evento.tentativas, 0) + 1,
          ultimo_recebido_em = now(),
          updated_at = now(),
          status_processamento = case
            when v_status_anterior = 'erro' then 'processando'
            else v_status_anterior
          end,
          erro_mensagem = case
            when v_status_anterior = 'erro' then null
            else v_evento.erro_mensagem
          end,
          processado_em = case
            when v_status_anterior = 'erro' then null
            else v_evento.processado_em
          end
    where awe.id = v_evento.id
    returning * into v_evento;

    return query
    select
      v_evento.id,
      (v_status_anterior = 'erro'),
      v_evento.status_processamento,
      v_evento.tentativas;
end;
$$;

revoke all on function public.fn_registrar_asaas_webhook_evento(text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_registrar_asaas_webhook_evento(text, text, text, text, jsonb)
  to service_role;

create or replace function public.fn_admin_master_avaliar_extensao_trial(p_id_salao uuid default null)
returns table (
  id_salao uuid,
  score integer,
  aplicado boolean,
  mensagem text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_score integer;
  v_regra record;
  v_trial_original timestamptz;
  v_trial_novo timestamptz;
begin
  select *
    into v_regra
  from public.trial_extensoes_regras ter
  where ter.ativo = true
  order by ter.score_minimo asc
  limit 1;

  if not found then
    return;
  end if;

  for r in
    select
      s.id,
      s.trial_fim_em,
      a.id as id_assinatura,
      a.trial_fim_em as assinatura_trial_fim,
      a.vencimento_em,
      lower(coalesce(a.status, s.status, '')) as status_atual
    from public.saloes s
    left join public.assinaturas a on a.id_salao = s.id
    where (p_id_salao is null or s.id = p_id_salao)
      and lower(coalesce(a.status, s.status, '')) in ('teste_gratis', 'trial')
      and not exists (
        select 1
        from public.trial_extensoes_automaticas tea
        where tea.id_salao = s.id
      )
  loop
    v_score := public.fn_admin_master_calcular_score_onboarding(r.id);
    v_trial_original := coalesce(
      nullif(r.assinatura_trial_fim, '')::timestamptz,
      r.trial_fim_em,
      r.vencimento_em::timestamptz
    );

    if v_trial_original is null then
      id_salao := r.id;
      score := v_score;
      aplicado := false;
      mensagem := 'Trial sem data final para avaliacao.';
      return next;
      continue;
    end if;

    if v_trial_original::date < (current_date + interval '1 day')::date
       or v_trial_original::date > (current_date + interval '2 days')::date then
      id_salao := r.id;
      score := v_score;
      aplicado := false;
      mensagem := 'Salao fora da janela de avaliacao do dia 6 ou 7.';
      return next;
      continue;
    end if;

    if v_score < v_regra.score_minimo then
      id_salao := r.id;
      score := v_score;
      aplicado := false;
      mensagem := 'Score insuficiente para extensao automatica.';
      return next;
      continue;
    end if;

    v_trial_novo := v_trial_original + make_interval(days => v_regra.dias_extra);

    insert into public.trial_extensoes_automaticas (
      id_salao,
      trial_original_fim,
      trial_novo_fim,
      score_atingido,
      motivo,
      aplicado_automaticamente
    )
    values (
      r.id,
      v_trial_original,
      v_trial_novo,
      v_score,
      'Extensao automatica por bom uso do sistema.',
      true
    );

    update public.saloes s
    set
      trial_fim_em = v_trial_novo,
      updated_at = now()::text
    where s.id = r.id;

    update public.assinaturas a
    set
      trial_fim_em = v_trial_novo::text,
      vencimento_em = v_trial_novo::date,
      updated_at = now()
    where a.id_salao = r.id
      and lower(coalesce(a.status, '')) in ('teste_gratis', 'trial');

    insert into public.notificacoes_globais (
      titulo,
      descricao,
      tipo,
      publico_tipo,
      filtros_json,
      status,
      enviada_em
    )
    values (
      'Voce ganhou mais 7 dias gratis',
      'Vimos que voce esta aproveitando bem o SalaoPremium. Liberamos mais 7 dias gratis para explorar ainda mais o sistema.',
      'conquista',
      'salao_especifico',
      jsonb_build_object('id_salao', r.id),
      'enviada',
      now()
    );

    id_salao := r.id;
    score := v_score;
    aplicado := true;
    mensagem := 'Trial estendido automaticamente.';
    return next;
  end loop;
end;
$$;

revoke all on function public.fn_admin_master_avaliar_extensao_trial(uuid)
  from public, anon, authenticated;
grant execute on function public.fn_admin_master_avaliar_extensao_trial(uuid)
  to service_role;
