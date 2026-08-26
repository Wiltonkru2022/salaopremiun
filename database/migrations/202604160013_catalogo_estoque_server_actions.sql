drop function if exists public.fn_excluir_servico_catalogo(uuid, uuid);
drop function if exists public.fn_excluir_produto_catalogo(uuid, uuid);
drop function if exists public.fn_registrar_movimentacao_estoque_manual(uuid, uuid, uuid, text, text, numeric, numeric, text);

create or replace function public.fn_registrar_movimentacao_estoque_manual(
  p_id_salao uuid,
  p_id_produto uuid,
  p_id_usuario uuid,
  p_tipo text,
  p_origem text,
  p_quantidade numeric,
  p_valor_unitario numeric default null,
  p_observacoes text default null
)
returns table (
  id_movimentacao uuid,
  estoque_atual numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto record;
  v_tipo text;
  v_quantidade numeric(12, 2);
  v_valor_unitario numeric(12, 2);
  v_valor_total numeric(12, 2);
  v_estoque_atual numeric(12, 2);
  v_novo_estoque numeric(12, 2);
  v_alerta_id uuid;
begin
  if p_id_salao is null or p_id_produto is null then
    raise exception 'Salao e produto sao obrigatorios para movimentar estoque.'
      using errcode = 'P0001';
  end if;

  v_tipo := lower(coalesce(p_tipo, ''));
  v_quantidade := round(coalesce(p_quantidade, 0)::numeric, 2);
  v_valor_unitario := round(coalesce(p_valor_unitario, 0)::numeric, 2);

  if v_tipo not in ('entrada', 'saida', 'ajuste', 'consumo_interno', 'venda') then
    raise exception 'Tipo de movimentacao de estoque invalido.'
      using errcode = 'P0001';
  end if;

  if v_quantidade <= 0 then
    raise exception 'Quantidade invalida para movimentacao de estoque.'
      using errcode = 'P0001';
  end if;

  select
    p.id,
    p.nome,
    coalesce(p.estoque_atual, 0) as estoque_atual,
    coalesce(p.estoque_minimo, 0) as estoque_minimo
  into v_produto
  from public.produtos p
  where p.id = p_id_produto
    and p.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Produto nao encontrado para este salao.'
      using errcode = 'P0001';
  end if;

  v_estoque_atual := round(coalesce(v_produto.estoque_atual, 0)::numeric, 2);

  if v_tipo = 'entrada' then
    v_novo_estoque := v_estoque_atual + v_quantidade;
  elsif v_tipo in ('saida', 'consumo_interno', 'venda') then
    v_novo_estoque := v_estoque_atual - v_quantidade;
  else
    v_novo_estoque := v_quantidade;
  end if;

  if v_novo_estoque < 0 then
    raise exception 'O estoque nao pode ficar negativo.'
      using errcode = 'P0001';
  end if;

  v_valor_total := case
    when v_valor_unitario > 0 then round((v_quantidade * v_valor_unitario)::numeric, 2)
    else null
  end;

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
    p_id_produto,
    v_tipo,
    nullif(trim(coalesce(p_origem, '')), ''),
    v_quantidade,
    case when v_valor_unitario > 0 then v_valor_unitario else null end,
    v_valor_total,
    nullif(trim(coalesce(p_observacoes, '')), ''),
    p_id_usuario
  )
  returning id into id_movimentacao;

  update public.produtos
  set
    estoque_atual = v_novo_estoque,
    updated_at = now()
  where id = p_id_produto
    and id_salao = p_id_salao;

  estoque_atual := v_novo_estoque;

  select pa.id
    into v_alerta_id
  from public.produtos_alertas pa
  where pa.id_salao = p_id_salao
    and pa.id_produto = p_id_produto
    and pa.tipo = 'estoque_minimo'
    and pa.resolvido = false
  order by pa.created_at desc
  limit 1;

  if v_novo_estoque <= round(coalesce(v_produto.estoque_minimo, 0)::numeric, 2) then
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
        'O produto "' || coalesce(v_produto.nome, 'Produto') || '" ficou com estoque baixo.',
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

  return next;
end;
$$;

create or replace function public.fn_excluir_produto_catalogo(
  p_id_salao uuid,
  p_id_produto uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1
  from public.produtos p
  where p.id = p_id_produto
    and p.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Produto nao encontrado para este salao.'
      using errcode = 'P0001';
  end if;

  delete from public.produtos_movimentacoes
  where id_produto = p_id_produto
    and id_salao = p_id_salao;

  delete from public.produto_servico_consumo
  where id_produto = p_id_produto
    and id_salao = p_id_salao;

  delete from public.produtos_alertas
  where id_produto = p_id_produto
    and id_salao = p_id_salao;

  delete from public.produtos
  where id = p_id_produto
    and id_salao = p_id_salao;

  if not found then
    raise exception 'Produto nao encontrado para exclusao.'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.fn_excluir_servico_catalogo(
  p_id_salao uuid,
  p_id_servico uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1
  from public.servicos s
  where s.id = p_id_servico
    and s.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Servico nao encontrado para este salao.'
      using errcode = 'P0001';
  end if;

  delete from public.profissional_servicos
  where id_servico = p_id_servico
    and id_salao = p_id_salao;

  delete from public.produto_servico_consumo
  where id_servico = p_id_servico
    and id_salao = p_id_salao;

  delete from public.servicos
  where id = p_id_servico
    and id_salao = p_id_salao;

  if not found then
    raise exception 'Servico nao encontrado para exclusao.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.fn_registrar_movimentacao_estoque_manual(uuid, uuid, uuid, text, text, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.fn_excluir_produto_catalogo(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_excluir_servico_catalogo(uuid, uuid) from public, anon, authenticated;

grant execute on function public.fn_registrar_movimentacao_estoque_manual(uuid, uuid, uuid, text, text, numeric, numeric, text) to service_role;
grant execute on function public.fn_excluir_produto_catalogo(uuid, uuid) to service_role;
grant execute on function public.fn_excluir_servico_catalogo(uuid, uuid) to service_role;
