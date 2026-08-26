drop function if exists public.fn_processar_comissoes_lancamentos(uuid, uuid[], text);

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
      coalesce(array_agg(id), '{}'::uuid[]) as ids_processados
    from atualizados
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
    coalesce((select total_lancamentos from resumo_atualizados), 0),
    coalesce((select round(sum(valor)::numeric, 2) from vales_atualizados), 0::numeric),
    coalesce((select count(distinct id_profissional)::integer from vales_atualizados), 0),
    coalesce((select ids_processados from resumo_atualizados), '{}'::uuid[])
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

revoke all on function public.fn_processar_comissoes_lancamentos(uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.fn_processar_comissoes_lancamentos(uuid, uuid[], text) to service_role;
