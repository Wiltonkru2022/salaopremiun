create or replace function public.fn_cliente_registrar_credito_manual(
  p_id_salao uuid,
  p_id_cliente uuid,
  p_id_usuario uuid,
  p_valor numeric,
  p_observacao text default null,
  p_origem text default 'agenda'
)
returns table (
  id_cliente uuid,
  saldo_anterior numeric,
  saldo_atual numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo_anterior numeric(12, 2);
  v_saldo_atual numeric(12, 2);
begin
  if round(coalesce(p_valor, 0)::numeric, 2) <= 0 then
    raise exception 'Valor de credito invalido.'
      using errcode = 'P0001';
  end if;

  select round(coalesce(cashback, 0), 2)
    into v_saldo_anterior
  from public.clientes
  where id = p_id_cliente
    and id_salao = p_id_salao
  for update;

  if v_saldo_anterior is null then
    raise exception 'Cliente nao encontrada neste salao.'
      using errcode = 'P0001';
  end if;

  v_saldo_atual := round(v_saldo_anterior + round(coalesce(p_valor, 0)::numeric, 2), 2);

  update public.clientes
  set
    cashback = v_saldo_atual,
    atualizado_em = now()
  where id = p_id_cliente
    and id_salao = p_id_salao;

  insert into public.logs_sistema (
    gravidade,
    modulo,
    id_salao,
    id_usuario,
    mensagem,
    detalhes_json
  ) values (
    'info',
    'clientes',
    p_id_salao,
    p_id_usuario,
    'Credito manual da cliente registrado pela agenda.',
    jsonb_build_object(
      'acao', 'registrar_credito_cliente',
      'origem', coalesce(nullif(trim(p_origem), ''), 'agenda'),
      'id_cliente', p_id_cliente,
      'valor', round(coalesce(p_valor, 0)::numeric, 2),
      'saldo_anterior', v_saldo_anterior,
      'saldo_atual', v_saldo_atual,
      'observacao', nullif(trim(coalesce(p_observacao, '')), '')
    )
  );

  return query
  select p_id_cliente, v_saldo_anterior, v_saldo_atual;
end;
$$;
