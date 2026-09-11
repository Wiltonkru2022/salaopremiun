create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'caixa_sessoes_um_aberto_por_salao_idx'
  ) and not exists (
    select 1
    from public.caixa_sessoes
    where lower(coalesce(status, '')) = 'aberto'
    group by id_salao
    having count(*) > 1
  ) then
    create unique index caixa_sessoes_um_aberto_por_salao_idx
      on public.caixa_sessoes (id_salao)
      where lower(coalesce(status, '')) = 'aberto';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'produtos_movimentacoes_comanda_obs_unique_idx'
  ) and not exists (
    select 1
    from public.produtos_movimentacoes
    where observacoes is not null
      and observacoes like 'COMANDA:%'
    group by id_salao, observacoes
    having count(*) > 1
  ) then
    create unique index produtos_movimentacoes_comanda_obs_unique_idx
      on public.produtos_movimentacoes (id_salao, observacoes)
      where observacoes is not null
        and observacoes like 'COMANDA:%';
  end if;
end $$;

create or replace function public.fn_sync_alerta_estoque_produto(
  p_id_salao uuid,
  p_id_produto uuid,
  p_estoque_atual numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto record;
  v_produto_json jsonb;
  v_estoque_minimo numeric(12, 2);
  v_alerta_id uuid;
begin
  select p.*
    into v_produto
  from public.produtos p
  where p.id = p_id_produto
    and p.id_salao = p_id_salao;

  if not found then
    return;
  end if;

  v_produto_json := to_jsonb(v_produto);
  v_estoque_minimo := round(
    coalesce((v_produto_json ->> 'estoque_minimo')::numeric, 0)::numeric,
    2
  );

  select pa.id
    into v_alerta_id
  from public.produtos_alertas pa
  where pa.id_salao = p_id_salao
    and pa.id_produto = p_id_produto
    and pa.tipo = 'estoque_minimo'
    and pa.resolvido = false
  order by pa.created_at desc
  limit 1;

  if round(coalesce(p_estoque_atual, 0)::numeric, 2) <= v_estoque_minimo then
    if v_alerta_id is null then
      insert into public.produtos_alertas (
        id_salao,
        id_produto,
        tipo,
        mensagem,
        resolvido
      )
      values (
        p_id_salao,
        p_id_produto,
        'estoque_minimo',
        'O produto "' || coalesce(v_produto_json ->> 'nome', 'Produto') || '" ficou com estoque baixo.',
        false
      );
    end if;
  elsif v_alerta_id is not null then
    update public.produtos_alertas
    set
      resolvido = true,
      resolved_at = now()
    where id = v_alerta_id;
  end if;
end;
$$;

create or replace function public.fn_custo_unitario_produto_json(
  p_produto_json jsonb,
  p_fallback numeric default null
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_fallback numeric;
  v_custo_por_dose numeric;
  v_custo_real numeric;
  v_preco_custo numeric;
  v_custos_extras numeric;
begin
  v_fallback := nullif(round(coalesce(p_fallback, 0)::numeric, 2), 0);
  v_custo_por_dose := nullif(round(coalesce((p_produto_json ->> 'custo_por_dose')::numeric, 0)::numeric, 2), 0);
  v_custo_real := nullif(round(coalesce((p_produto_json ->> 'custo_real')::numeric, 0)::numeric, 2), 0);
  v_preco_custo := round(coalesce((p_produto_json ->> 'preco_custo')::numeric, 0)::numeric, 2);
  v_custos_extras := round(coalesce((p_produto_json ->> 'custos_extras')::numeric, 0)::numeric, 2);

  return coalesce(v_fallback, v_custo_por_dose, v_custo_real, round(v_preco_custo + v_custos_extras, 2), 0);
end;
$$;

create or replace function public.fn_processar_estoque_comanda_atomic(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_usuario uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_item record;
  v_consumo record;
  v_produto record;
  v_produto_json jsonb;
  v_observacoes text;
  v_quantidade numeric(12, 2);
  v_unitario numeric(12, 2);
  v_total numeric(12, 2);
  v_estoque_atual numeric(12, 2);
  v_estoque_novo numeric(12, 2);
  v_custo_item numeric(12, 2);
  v_movimentos integer := 0;
  v_itens_atualizados integer := 0;
begin
  if p_id_salao is null or p_id_comanda is null then
    raise exception 'Salao e comanda sao obrigatorios para processar estoque.'
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('estoque_comanda:' || p_id_comanda::text, 0));

  select c.*
    into v_comanda
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Comanda nao encontrada para processar estoque.'
      using errcode = 'P0001';
  end if;

  for v_item in
    select *
    from public.comanda_itens
    where id_salao = p_id_salao
      and id_comanda = p_id_comanda
      and coalesce(ativo, true) = true
    order by id
  loop
    v_quantidade := round(greatest(coalesce(v_item.quantidade, 0), 0)::numeric, 2);

    if v_quantidade <= 0 then
      continue;
    end if;

    if lower(coalesce(v_item.tipo_item, '')) = 'produto'
      and v_item.id_produto is not null
    then
      select p.*
        into v_produto
      from public.produtos p
      where p.id = v_item.id_produto
        and p.id_salao = p_id_salao
      for update;

      if not found then
        continue;
      end if;

      v_produto_json := to_jsonb(v_produto);
      v_unitario := public.fn_custo_unitario_produto_json(v_produto_json, null);
      v_total := round((v_unitario * v_quantidade)::numeric, 2);
      v_observacoes :=
        'COMANDA:' || p_id_comanda::text ||
        '|ITEM:' || v_item.id::text ||
        '|PRODUTO:' || v_item.id_produto::text ||
        '|ORIGEM:PDV';

      update public.comanda_itens
      set
        custo_total = v_total,
        updated_at = now()
      where id = v_item.id
        and id_salao = p_id_salao;

      v_itens_atualizados := v_itens_atualizados + 1;

      if exists (
        select 1
        from public.produtos_movimentacoes pm
        where pm.id_salao = p_id_salao
          and pm.observacoes = v_observacoes
      ) then
        continue;
      end if;

      v_estoque_atual := round(coalesce((v_produto_json ->> 'estoque_atual')::numeric, 0)::numeric, 2);
      v_estoque_novo := round((v_estoque_atual - v_quantidade)::numeric, 2);

      if v_estoque_novo < 0 then
        raise exception 'Estoque insuficiente para finalizar a comanda. Ajuste: %.', coalesce(v_produto_json ->> 'nome', 'Produto')
          using errcode = 'P0001';
      end if;

      insert into public.produtos_movimentacoes (
        id_salao,
        id_produto,
        tipo,
        origem,
        quantidade,
        valor_unitario,
        valor_total,
        observacoes,
        id_usuario
      )
      values (
        p_id_salao,
        v_item.id_produto,
        'venda',
        'pdv',
        v_quantidade,
        v_unitario,
        v_total,
        v_observacoes,
        p_id_usuario
      );

      update public.produtos
      set
        estoque_atual = v_estoque_novo,
        updated_at = now()
      where id = v_item.id_produto
        and id_salao = p_id_salao;

      perform public.fn_sync_alerta_estoque_produto(
        p_id_salao,
        v_item.id_produto,
        v_estoque_novo
      );

      v_movimentos := v_movimentos + 1;
    elsif lower(coalesce(v_item.tipo_item, '')) = 'servico'
      and v_item.id_servico is not null
    then
      v_custo_item := 0;

      for v_consumo in
        select *
        from public.produto_servico_consumo psc
        where psc.id_salao = p_id_salao
          and psc.id_servico = v_item.id_servico
          and coalesce(psc.ativo, true) = true
      loop
        v_quantidade := round(
          (greatest(coalesce(v_item.quantidade, 0), 0) * coalesce(v_consumo.quantidade_consumo, 0))::numeric,
          2
        );

        if v_quantidade <= 0 then
          continue;
        end if;

        select p.*
          into v_produto
        from public.produtos p
        where p.id = v_consumo.id_produto
          and p.id_salao = p_id_salao
        for update;

        if not found then
          continue;
        end if;

        v_produto_json := to_jsonb(v_produto);
        v_unitario := public.fn_custo_unitario_produto_json(
          v_produto_json,
          coalesce(v_consumo.custo_estimado, 0)
        );
        v_total := round((v_unitario * v_quantidade)::numeric, 2);
        v_custo_item := round((v_custo_item + v_total)::numeric, 2);
        v_observacoes :=
          'COMANDA:' || p_id_comanda::text ||
          '|ITEM:' || v_item.id::text ||
          '|SERVICO:' || v_item.id_servico::text ||
          '|PRODUTO:' || v_consumo.id_produto::text ||
          '|ORIGEM:SERVICO';

        if exists (
          select 1
          from public.produtos_movimentacoes pm
          where pm.id_salao = p_id_salao
            and pm.observacoes = v_observacoes
        ) then
          continue;
        end if;

        v_estoque_atual := round(coalesce((v_produto_json ->> 'estoque_atual')::numeric, 0)::numeric, 2);
        v_estoque_novo := round((v_estoque_atual - v_quantidade)::numeric, 2);

        if v_estoque_novo < 0 then
          raise exception 'Estoque insuficiente para finalizar a comanda. Ajuste: %.', coalesce(v_produto_json ->> 'nome', 'Produto')
            using errcode = 'P0001';
        end if;

        insert into public.produtos_movimentacoes (
          id_salao,
          id_produto,
          tipo,
          origem,
          quantidade,
          valor_unitario,
          valor_total,
          observacoes,
          id_usuario
        )
        values (
          p_id_salao,
          v_consumo.id_produto,
          'consumo_interno',
          'servico',
          v_quantidade,
          v_unitario,
          v_total,
          v_observacoes,
          p_id_usuario
        );

        update public.produtos
        set
          estoque_atual = v_estoque_novo,
          updated_at = now()
        where id = v_consumo.id_produto
          and id_salao = p_id_salao;

        perform public.fn_sync_alerta_estoque_produto(
          p_id_salao,
          v_consumo.id_produto,
          v_estoque_novo
        );

        v_movimentos := v_movimentos + 1;
      end loop;

      update public.comanda_itens
      set
        custo_total = v_custo_item,
        updated_at = now()
      where id = v_item.id
        and id_salao = p_id_salao;

      v_itens_atualizados := v_itens_atualizados + 1;
    end if;
  end loop;

  if v_movimentos = 0 then
    return jsonb_build_object(
      'processed', false,
      'skipped', true,
      'reason', 'Estoque da comanda ja foi processado anteriormente.',
      'movements', 0,
      'itemsUpdated', v_itens_atualizados
    );
  end if;

  return jsonb_build_object(
    'processed', true,
    'skipped', false,
    'movements', v_movimentos,
    'itemsUpdated', v_itens_atualizados
  );
end;
$$;

create or replace function public.fn_reverter_estoque_comanda_atomic(
  p_id_salao uuid,
  p_id_comanda uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movimento record;
  v_produto record;
  v_produto_json jsonb;
  v_quantidade numeric(12, 2);
  v_estoque_atual numeric(12, 2);
  v_estoque_novo numeric(12, 2);
  v_movimentos integer := 0;
begin
  if p_id_salao is null or p_id_comanda is null then
    raise exception 'Salao e comanda sao obrigatorios para reverter estoque.'
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('estoque_comanda:' || p_id_comanda::text, 0));

  for v_movimento in
    select *
    from public.produtos_movimentacoes pm
    where pm.id_salao = p_id_salao
      and pm.observacoes like ('COMANDA:' || p_id_comanda::text || '|%')
    order by pm.id
    for update
  loop
    if v_movimento.id_produto is null then
      continue;
    end if;

    select p.*
      into v_produto
    from public.produtos p
    where p.id = v_movimento.id_produto
      and p.id_salao = p_id_salao
    for update;

    if found then
      v_produto_json := to_jsonb(v_produto);
      v_quantidade := round(coalesce(v_movimento.quantidade, 0)::numeric, 2);
      v_estoque_atual := round(coalesce((v_produto_json ->> 'estoque_atual')::numeric, 0)::numeric, 2);
      v_estoque_novo := round((v_estoque_atual + v_quantidade)::numeric, 2);

      update public.produtos
      set
        estoque_atual = v_estoque_novo,
        updated_at = now()
      where id = v_movimento.id_produto
        and id_salao = p_id_salao;

      perform public.fn_sync_alerta_estoque_produto(
        p_id_salao,
        v_movimento.id_produto,
        v_estoque_novo
      );
    end if;

    delete from public.produtos_movimentacoes
    where id = v_movimento.id
      and id_salao = p_id_salao;

    v_movimentos := v_movimentos + 1;
  end loop;

  if v_movimentos = 0 then
    return jsonb_build_object(
      'reverted', false,
      'skipped', true,
      'reason', 'Nao ha movimentacoes registradas para esta comanda.',
      'movements', 0
    );
  end if;

  return jsonb_build_object(
    'reverted', true,
    'skipped', false,
    'movements', v_movimentos
  );
end;
$$;

create or replace function public.fn_caixa_abrir_sessao(
  p_id_salao uuid,
  p_id_usuario uuid,
  p_valor_abertura numeric,
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sessao_id uuid;
begin
  if p_id_salao is null then
    raise exception 'Salao obrigatorio para abrir o caixa.'
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('caixa_aberto:' || p_id_salao::text, 0));

  if coalesce(p_valor_abertura, 0) < 0 then
    raise exception 'Valor de abertura invalido.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.caixa_sessoes s
    where s.id_salao = p_id_salao
      and s.status = 'aberto'
  ) then
    raise exception 'Ja existe um caixa aberto para este salao.'
      using errcode = 'P0001';
  end if;

  insert into public.caixa_sessoes (
    id_salao,
    id_usuario_abertura,
    valor_abertura,
    observacoes,
    status
  )
  values (
    p_id_salao,
    p_id_usuario,
    round(coalesce(p_valor_abertura, 0)::numeric, 2),
    nullif(trim(coalesce(p_observacoes, '')), ''),
    'aberto'
  )
  returning id into v_sessao_id;

  return v_sessao_id;
end;
$$;

create or replace function public.fn_caixa_finalizar_comanda(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_exigir_cliente boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_status text;
begin
  if p_id_salao is null or p_id_comanda is null then
    raise exception 'Salao e comanda sao obrigatorios para finalizar.'
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('finalizar_comanda:' || p_id_comanda::text, 0));

  select *
    into v_comanda
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Comanda nao encontrada para este salao.'
      using errcode = 'P0001';
  end if;

  v_status := lower(coalesce(v_comanda.status, ''));

  if p_exigir_cliente and v_comanda.id_cliente is null then
    raise exception 'Esta venda exige cliente vinculado antes da finalizacao.'
      using errcode = 'P0001';
  end if;

  if v_status = 'cancelada' then
    raise exception 'Comanda cancelada nao pode ser finalizada.'
      using errcode = 'P0001';
  end if;

  if v_status <> 'fechada' then
    perform public.fn_fechar_comanda(p_id_comanda);
  end if;

  perform public.fn_processar_estoque_comanda_atomic(
    p_id_salao,
    p_id_comanda,
    null
  );

  return 'fechada';
end;
$$;

revoke all on function public.fn_sync_alerta_estoque_produto(uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function public.fn_custo_unitario_produto_json(jsonb, numeric) from public, anon, authenticated;
revoke all on function public.fn_processar_estoque_comanda_atomic(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_reverter_estoque_comanda_atomic(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_caixa_abrir_sessao(uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.fn_caixa_finalizar_comanda(uuid, uuid, boolean) from public, anon, authenticated;

grant execute on function public.fn_sync_alerta_estoque_produto(uuid, uuid, numeric) to service_role;
grant execute on function public.fn_custo_unitario_produto_json(jsonb, numeric) to service_role;
grant execute on function public.fn_processar_estoque_comanda_atomic(uuid, uuid, uuid) to service_role;
grant execute on function public.fn_reverter_estoque_comanda_atomic(uuid, uuid) to service_role;
grant execute on function public.fn_caixa_abrir_sessao(uuid, uuid, numeric, text) to service_role;
grant execute on function public.fn_caixa_finalizar_comanda(uuid, uuid, boolean) to service_role;
