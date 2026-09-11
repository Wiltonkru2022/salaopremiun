alter table if exists public.comanda_pagamentos
  add column if not exists id_movimentacao uuid references public.caixa_movimentacoes(id) on delete set null;

create index if not exists comanda_pagamentos_movimentacao_idx
  on public.comanda_pagamentos (id_movimentacao);

drop function if exists public.fn_caixa_cancelar_comanda(uuid, uuid, text);
drop function if exists public.fn_caixa_finalizar_comanda(uuid, uuid, boolean);
drop function if exists public.fn_caixa_remover_pagamento_comanda(uuid, uuid, uuid);
drop function if exists public.fn_caixa_adicionar_pagamento_comanda(uuid, uuid, uuid, uuid, text, numeric, integer, numeric, numeric, text);

create or replace function public.fn_caixa_adicionar_pagamento_comanda(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_sessao uuid,
  p_id_usuario uuid,
  p_forma_pagamento text,
  p_valor numeric,
  p_parcelas integer,
  p_taxa_percentual numeric,
  p_taxa_valor numeric,
  p_observacoes text
)
returns table (
  id_pagamento uuid,
  id_movimentacao uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_sessao_id uuid;
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
    descricao
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
    )
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
    observacoes
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
    nullif(trim(coalesce(p_observacoes, '')), '')
  )
  returning id into id_pagamento;

  return next;
end;
$$;

create or replace function public.fn_caixa_remover_pagamento_comanda(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_id_pagamento uuid
)
returns table (
  id_pagamento uuid,
  id_movimentacao uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_pagamento record;
begin
  select lower(coalesce(c.status, ''))
    into v_status
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Comanda nao encontrada para este salao.'
      using errcode = 'P0001';
  end if;

  if v_status in ('fechada', 'cancelada') then
    raise exception 'Comanda fechada ou cancelada nao pode remover pagamentos.'
      using errcode = 'P0001';
  end if;

  select *
    into v_pagamento
  from public.comanda_pagamentos cp
  where cp.id = p_id_pagamento
    and cp.id_salao = p_id_salao
    and cp.id_comanda = p_id_comanda
  for update;

  if not found then
    raise exception 'Pagamento nao encontrado para esta comanda.'
      using errcode = 'P0001';
  end if;

  id_pagamento := v_pagamento.id;
  id_movimentacao := v_pagamento.id_movimentacao;

  if id_movimentacao is not null then
    delete from public.caixa_movimentacoes
    where id = id_movimentacao
      and id_salao = p_id_salao
      and id_comanda = p_id_comanda
      and tipo = 'venda';
  end if;

  delete from public.comanda_pagamentos
  where id = id_pagamento
    and id_salao = p_id_salao
    and id_comanda = p_id_comanda;

  return next;
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
begin
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

  if p_exigir_cliente and v_comanda.id_cliente is null then
    raise exception 'Esta venda exige cliente vinculado antes da finalizacao.'
      using errcode = 'P0001';
  end if;

  perform public.fn_fechar_comanda(p_id_comanda);

  return 'fechada';
end;
$$;

create or replace function public.fn_caixa_cancelar_comanda(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_motivo text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_pagamentos integer;
  v_observacoes_atual text;
begin
  select
    lower(coalesce(c.status, '')),
    c.observacoes
    into v_status,
      v_observacoes_atual
  from public.comandas c
  where c.id = p_id_comanda
    and c.id_salao = p_id_salao
  for update;

  if not found then
    raise exception 'Comanda nao encontrada para este salao.'
      using errcode = 'P0001';
  end if;

  if v_status in ('fechada', 'cancelada') then
    raise exception 'A comanda nao pode ser cancelada no status atual.'
      using errcode = 'P0001';
  end if;

  if to_regprocedure('public.fn_cancelar_comanda(uuid, text)') is not null then
    execute 'select public.fn_cancelar_comanda($1, $2)' using p_id_comanda, p_motivo;
    return 'cancelada';
  end if;

  if to_regprocedure('public.fn_cancelar_comanda(uuid)') is not null then
    execute 'select public.fn_cancelar_comanda($1)' using p_id_comanda;
    return 'cancelada';
  end if;

  select count(*)
    into v_pagamentos
  from public.comanda_pagamentos cp
  where cp.id_salao = p_id_salao
    and cp.id_comanda = p_id_comanda;

  if coalesce(v_pagamentos, 0) > 0 then
    raise exception 'Remova os pagamentos da comanda antes de cancelar.'
      using errcode = 'P0001';
  end if;

  update public.comandas
  set
    status = 'cancelada',
    cancelada_em = coalesce(cancelada_em, now()),
    observacoes = case
      when nullif(trim(coalesce(p_motivo, '')), '') is null then observacoes
      when nullif(trim(coalesce(v_observacoes_atual, '')), '') is null then trim(p_motivo)
      else v_observacoes_atual || chr(10) || 'Cancelamento: ' || trim(p_motivo)
    end,
    updated_at = now()
  where id = p_id_comanda
    and id_salao = p_id_salao;

  update public.agendamentos
  set
    status = 'cancelado',
    updated_at = now()
  where id_comanda = p_id_comanda
    and lower(coalesce(status, '')) not in ('cancelado', 'cancelada', 'faltou', 'atendido');

  return 'cancelada';
end;
$$;

revoke all on function public.fn_caixa_adicionar_pagamento_comanda(uuid, uuid, uuid, uuid, text, numeric, integer, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.fn_caixa_remover_pagamento_comanda(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_caixa_finalizar_comanda(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.fn_caixa_cancelar_comanda(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.fn_caixa_adicionar_pagamento_comanda(uuid, uuid, uuid, uuid, text, numeric, integer, numeric, numeric, text) to service_role;
grant execute on function public.fn_caixa_remover_pagamento_comanda(uuid, uuid, uuid) to service_role;
grant execute on function public.fn_caixa_finalizar_comanda(uuid, uuid, boolean) to service_role;
grant execute on function public.fn_caixa_cancelar_comanda(uuid, uuid, text) to service_role;
