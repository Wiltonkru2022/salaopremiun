drop function if exists public.fn_caixa_lancar_movimentacao(uuid, uuid, uuid, text, numeric, text, uuid, uuid, text);
drop function if exists public.fn_caixa_fechar_sessao(uuid, uuid, uuid, numeric, text);
drop function if exists public.fn_caixa_abrir_sessao(uuid, uuid, numeric, text);

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

create or replace function public.fn_caixa_fechar_sessao(
  p_id_salao uuid,
  p_id_sessao uuid,
  p_id_usuario uuid,
  p_valor_fechamento numeric,
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
  if p_id_salao is null or p_id_sessao is null then
    raise exception 'Salao e sessao obrigatorios para fechar o caixa.'
      using errcode = 'P0001';
  end if;

  if coalesce(p_valor_fechamento, 0) < 0 then
    raise exception 'Valor de fechamento invalido.'
      using errcode = 'P0001';
  end if;

  update public.caixa_sessoes
  set
    id_usuario_fechamento = p_id_usuario,
    valor_fechamento_informado = round(coalesce(p_valor_fechamento, 0)::numeric, 2),
    observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
    status = 'fechado',
    fechado_em = coalesce(fechado_em, now()),
    updated_at = now()
  where id = p_id_sessao
    and id_salao = p_id_salao
    and status = 'aberto'
  returning id into v_sessao_id;

  if v_sessao_id is null then
    raise exception 'Sessao de caixa aberta nao encontrada para fechamento.'
      using errcode = 'P0001';
  end if;

  return v_sessao_id;
end;
$$;

create or replace function public.fn_caixa_lancar_movimentacao(
  p_id_salao uuid,
  p_id_sessao uuid,
  p_id_usuario uuid,
  p_tipo text,
  p_valor numeric,
  p_descricao text default null,
  p_id_profissional uuid default null,
  p_id_comanda uuid default null,
  p_forma_pagamento text default null
)
returns table (
  id_movimentacao uuid,
  id_vale uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
begin
  if p_id_salao is null or p_id_sessao is null then
    raise exception 'Salao e sessao obrigatorios para lancar movimentacao.'
      using errcode = 'P0001';
  end if;

  if coalesce(p_valor, 0) <= 0 then
    raise exception 'Valor da movimentacao invalido.'
      using errcode = 'P0001';
  end if;

  v_tipo := lower(coalesce(p_tipo, ''));

  if v_tipo not in ('sangria', 'suprimento', 'vale_profissional', 'ajuste', 'venda') then
    raise exception 'Tipo de movimentacao invalido.'
      using errcode = 'P0001';
  end if;

  if v_tipo = 'vale_profissional' and p_id_profissional is null then
    raise exception 'Selecione o profissional para lancar o vale.'
      using errcode = 'P0001';
  end if;

  perform 1
  from public.caixa_sessoes s
  where s.id = p_id_sessao
    and s.id_salao = p_id_salao
    and s.status = 'aberto'
  for update;

  if not found then
    raise exception 'Caixa aberto nao encontrado para lancar movimentacao.'
      using errcode = 'P0001';
  end if;

  insert into public.caixa_movimentacoes (
    id_salao,
    id_sessao,
    id_usuario,
    id_comanda,
    id_profissional,
    tipo,
    forma_pagamento,
    valor,
    descricao
  )
  values (
    p_id_salao,
    p_id_sessao,
    p_id_usuario,
    p_id_comanda,
    p_id_profissional,
    v_tipo,
    nullif(trim(coalesce(p_forma_pagamento, '')), ''),
    round(coalesce(p_valor, 0)::numeric, 2),
    nullif(trim(coalesce(p_descricao, '')), '')
  )
  returning id into id_movimentacao;

  if v_tipo = 'vale_profissional' then
    insert into public.profissionais_vales (
      id_salao,
      id_profissional,
      id_usuario,
      id_sessao,
      id_movimentacao,
      valor,
      descricao,
      status
    )
    values (
      p_id_salao,
      p_id_profissional,
      p_id_usuario,
      p_id_sessao,
      id_movimentacao,
      round(coalesce(p_valor, 0)::numeric, 2),
      nullif(trim(coalesce(p_descricao, '')), ''),
      'aberto'
    )
    returning id into id_vale;
  end if;

  return next;
end;
$$;

revoke all on function public.fn_caixa_abrir_sessao(uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.fn_caixa_fechar_sessao(uuid, uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.fn_caixa_lancar_movimentacao(uuid, uuid, uuid, text, numeric, text, uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.fn_caixa_abrir_sessao(uuid, uuid, numeric, text) to service_role;
grant execute on function public.fn_caixa_fechar_sessao(uuid, uuid, uuid, numeric, text) to service_role;
grant execute on function public.fn_caixa_lancar_movimentacao(uuid, uuid, uuid, text, numeric, text, uuid, uuid, text) to service_role;
