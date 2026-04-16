alter table public.caixa_movimentacoes
  add column if not exists idempotency_key text;

alter table public.comanda_pagamentos
  add column if not exists idempotency_key text;

alter table public.profissionais_vales
  add column if not exists idempotency_key text;

create unique index if not exists caixa_movimentacoes_idempotency_key_idx
  on public.caixa_movimentacoes (id_salao, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists comanda_pagamentos_idempotency_key_idx
  on public.comanda_pagamentos (id_salao, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists profissionais_vales_idempotency_key_idx
  on public.profissionais_vales (id_salao, idempotency_key)
  where idempotency_key is not null;

create or replace function public.fn_caixa_lancar_movimentacao_idempotente(
  p_id_salao uuid,
  p_id_sessao uuid,
  p_id_usuario uuid,
  p_tipo text,
  p_valor numeric,
  p_descricao text default null,
  p_id_profissional uuid default null,
  p_id_comanda uuid default null,
  p_forma_pagamento text default null,
  p_idempotency_key text default null
)
returns table (
  id_movimentacao uuid,
  id_vale uuid,
  ja_existia boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
  v_idempotency_key text;
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
  v_idempotency_key := nullif(left(trim(coalesce(p_idempotency_key, '')), 160), '');

  if v_tipo not in ('sangria', 'suprimento', 'vale_profissional', 'ajuste', 'venda') then
    raise exception 'Tipo de movimentacao invalido.'
      using errcode = 'P0001';
  end if;

  if v_tipo = 'vale_profissional' and p_id_profissional is null then
    raise exception 'Selecione o profissional para lancar o vale.'
      using errcode = 'P0001';
  end if;

  if v_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'caixa_idem:' || p_id_salao::text || ':' || v_idempotency_key,
        0
      )
    );

    select m.id, v.id
      into id_movimentacao, id_vale
    from public.caixa_movimentacoes m
    left join public.profissionais_vales v
      on v.id_movimentacao = m.id
     and v.id_salao = m.id_salao
    where m.id_salao = p_id_salao
      and m.idempotency_key = v_idempotency_key
    limit 1;

    if id_movimentacao is not null then
      ja_existia := true;
      return next;
      return;
    end if;
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
    descricao,
    idempotency_key
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
    nullif(trim(coalesce(p_descricao, '')), ''),
    v_idempotency_key
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
      status,
      idempotency_key
    )
    values (
      p_id_salao,
      p_id_profissional,
      p_id_usuario,
      p_id_sessao,
      id_movimentacao,
      round(coalesce(p_valor, 0)::numeric, 2),
      nullif(trim(coalesce(p_descricao, '')), ''),
      'aberto',
      v_idempotency_key
    )
    returning id into id_vale;
  end if;

  ja_existia := false;
  return next;
end;
$$;

create or replace function public.fn_caixa_adicionar_pagamento_comanda_idempotente(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_sessao uuid,
  p_id_usuario uuid,
  p_forma_pagamento text,
  p_valor numeric,
  p_parcelas integer,
  p_taxa_percentual numeric,
  p_taxa_valor numeric,
  p_observacoes text,
  p_idempotency_key text default null
)
returns table (
  id_pagamento uuid,
  id_movimentacao uuid,
  ja_existia boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_sessao_id uuid;
  v_idempotency_key text;
begin
  if p_id_salao is null or p_id_comanda is null or p_id_sessao is null then
    raise exception 'Salao, comanda e sessao do caixa sao obrigatorios.'
      using errcode = 'P0001';
  end if;

  if coalesce(p_valor, 0) <= 0 then
    raise exception 'Valor do pagamento invalido.'
      using errcode = 'P0001';
  end if;

  if coalesce(p_parcelas, 0) <= 0 then
    raise exception 'Quantidade de parcelas invalida.'
      using errcode = 'P0001';
  end if;

  v_idempotency_key := nullif(left(trim(coalesce(p_idempotency_key, '')), 160), '');

  if v_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'caixa_idem:' || p_id_salao::text || ':' || v_idempotency_key,
        0
      )
    );

    select cp.id, cp.id_movimentacao
      into id_pagamento, id_movimentacao
    from public.comanda_pagamentos cp
    where cp.id_salao = p_id_salao
      and cp.idempotency_key = v_idempotency_key
    limit 1;

    if id_pagamento is not null then
      ja_existia := true;
      return next;
      return;
    end if;
  end if;

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

  if lower(coalesce(v_comanda.status, '')) not in (
    'aberta',
    'em_atendimento',
    'aguardando_pagamento'
  ) then
    raise exception 'A comanda nao permite novos pagamentos no status atual.'
      using errcode = 'P0001';
  end if;

  select s.id
    into v_sessao_id
  from public.caixa_sessoes s
  where s.id = p_id_sessao
    and s.id_salao = p_id_salao
    and s.status = 'aberto'
  for update;

  if not found then
    raise exception 'Caixa aberto nao encontrado para lancar o pagamento.'
      using errcode = 'P0001';
  end if;

  insert into public.caixa_movimentacoes (
    id_salao,
    id_sessao,
    id_usuario,
    id_comanda,
    tipo,
    forma_pagamento,
    valor,
    descricao,
    idempotency_key
  )
  values (
    p_id_salao,
    v_sessao_id,
    p_id_usuario,
    p_id_comanda,
    'venda',
    nullif(trim(coalesce(p_forma_pagamento, '')), ''),
    round(coalesce(p_valor, 0)::numeric, 2),
    coalesce(
      nullif(trim(coalesce(p_observacoes, '')), ''),
      'Pagamento da comanda #' || coalesce(v_comanda.numero::text, '-')
    ),
    v_idempotency_key
  )
  returning id into id_movimentacao;

  insert into public.comanda_pagamentos (
    id_salao,
    id_comanda,
    id_movimentacao,
    forma_pagamento,
    valor,
    parcelas,
    taxa_maquininha_percentual,
    taxa_maquininha_valor,
    observacoes,
    idempotency_key
  )
  values (
    p_id_salao,
    p_id_comanda,
    id_movimentacao,
    nullif(trim(coalesce(p_forma_pagamento, '')), ''),
    round(coalesce(p_valor, 0)::numeric, 2),
    p_parcelas,
    round(coalesce(p_taxa_percentual, 0)::numeric, 2),
    round(coalesce(p_taxa_valor, 0)::numeric, 2),
    nullif(trim(coalesce(p_observacoes, '')), ''),
    v_idempotency_key
  )
  returning id into id_pagamento;

  ja_existia := false;
  return next;
end;
$$;

revoke all on function public.fn_caixa_lancar_movimentacao_idempotente(uuid, uuid, uuid, text, numeric, text, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.fn_caixa_adicionar_pagamento_comanda_idempotente(uuid, uuid, uuid, uuid, text, numeric, integer, numeric, numeric, text, text) from public, anon, authenticated;

grant execute on function public.fn_caixa_lancar_movimentacao_idempotente(uuid, uuid, uuid, text, numeric, text, uuid, uuid, text, text) to service_role;
grant execute on function public.fn_caixa_adicionar_pagamento_comanda_idempotente(uuid, uuid, uuid, uuid, text, numeric, integer, numeric, numeric, text, text) to service_role;
