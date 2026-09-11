create or replace function public.fn_reabrir_venda_para_caixa(
  p_id_comanda uuid,
  p_motivo text default null,
  p_reopened_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_usuario_nome text;
begin
  select lower(coalesce(status, ''))
    into v_status
  from public.comandas
  where id = p_id_comanda
  for update;

  if not found then
    raise exception 'Venda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if v_status not in ('fechada', 'cancelada') then
    raise exception 'Apenas vendas fechadas ou canceladas podem ser reabertas.'
      using errcode = 'P0001';
  end if;

  if p_reopened_by is not null then
    select coalesce(nullif(btrim(u.nome), ''), nullif(btrim(u.email), ''), p_reopened_by::text)
      into v_usuario_nome
    from public.usuarios u
    where u.id = p_reopened_by
       or u.auth_user_id = p_reopened_by
    order by case when u.id = p_reopened_by then 0 else 1 end
    limit 1;
  end if;

  v_usuario_nome := coalesce(nullif(btrim(v_usuario_nome), ''), p_reopened_by::text);

  perform set_config('app.reabrindo_venda_para_caixa', 'on', true);

  update public.comandas
  set
    status = 'aguardando_pagamento',
    fechada_em = null,
    cancelada_em = null,
    observacoes = trim(
      both E'\n' from concat_ws(
        E'\n',
        nullif(observacoes, ''),
        concat(
          '[reabertura]',
          case when v_usuario_nome is null then '' else ' usuario=' || v_usuario_nome end,
          case when p_motivo is null or btrim(p_motivo) = '' then '' else ' motivo=' || btrim(p_motivo) end
        )
      )
    ),
    updated_at = now()
  where id = p_id_comanda;

  update public.comissoes_lancamentos
  set
    status = 'cancelado',
    observacoes = trim(
      both E'\n' from concat_ws(
        E'\n',
        nullif(observacoes, ''),
        concat(
          'Venda reaberta',
          case when v_usuario_nome is null then '' else ' por ' || v_usuario_nome end,
          case when p_motivo is null or btrim(p_motivo) = '' then '' else ': ' || btrim(p_motivo) end
        )
      )
    ),
    updated_at = now()
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) in ('pendente', 'calculado');
end;
$$;

revoke all on function public.fn_reabrir_venda_para_caixa(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.fn_reabrir_venda_para_caixa(uuid, text, uuid) to service_role;
