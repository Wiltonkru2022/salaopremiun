create or replace function public.fn_sync_comissoes_status_comanda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.status, '')) = 'fechada'
    and lower(coalesce(old.status, '')) <> 'fechada'
  then
    begin
      perform public.fn_gerar_comissoes_comanda(new.id);
    exception
      when others then
        raise exception 'Falha ao gerar comissoes da comanda %: %', new.id, SQLERRM
          using errcode = SQLSTATE;
    end;
  elsif lower(coalesce(new.status, '')) in ('aberta', 'em_atendimento', 'aguardando_pagamento')
    and lower(coalesce(old.status, '')) = 'fechada'
  then
    delete from public.comissoes_lancamentos
    where id_comanda = new.id
      and lower(coalesce(status, 'pendente')) = 'pendente';

    delete from public.comissoes_assistentes
    where id_comanda = new.id
      and lower(coalesce(status, 'pendente')) = 'pendente';
  elsif lower(coalesce(new.status, '')) = 'cancelada' then
    update public.comissoes_lancamentos
    set
      status = 'cancelado',
      updated_at = now()
    where id_comanda = new.id
      and lower(coalesce(status, 'pendente')) = 'pendente';

    update public.comissoes_assistentes
    set
      status = 'cancelado',
      updated_at = now()
    where id_comanda = new.id
      and lower(coalesce(status, 'pendente')) = 'pendente';
  end if;

  return new;
end;
$$;

create or replace function public.fn_fechar_comanda(p_id_comanda uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_total_pago numeric(12, 2);
begin
  select *
    into v_comanda
  from public.comandas
  where id = p_id_comanda
  for update;

  if not found then
    raise exception 'Comanda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if lower(coalesce(v_comanda.status, '')) not in (
    'aberta',
    'em_atendimento',
    'aguardando_pagamento'
  ) then
    raise exception 'A comanda nao pode ser fechada no status atual.'
      using errcode = 'P0001';
  end if;

  select coalesce(round(sum(valor)::numeric, 2), 0)
    into v_total_pago
  from public.comanda_pagamentos
  where id_comanda = p_id_comanda;

  if v_total_pago + 0.009 < round(coalesce(v_comanda.total, 0)::numeric, 2) then
    raise exception 'A comanda ainda possui valor em aberto.'
      using errcode = 'P0001';
  end if;

  begin
    update public.comandas
    set
      status = 'fechada',
      fechada_em = coalesce(fechada_em, now()),
      updated_at = now()
    where id = p_id_comanda;
  exception
    when others then
      raise exception 'Falha ao atualizar status da comanda % no fechamento: %', p_id_comanda, SQLERRM
        using errcode = SQLSTATE;
  end;

  begin
    update public.agendamentos
    set
      status = 'atendido',
      updated_at = now()
    where id_comanda = p_id_comanda
      and lower(coalesce(status, '')) not in ('cancelado', 'cancelada', 'faltou');
  exception
    when others then
      raise exception 'Falha ao sincronizar agendamento da comanda %: %', p_id_comanda, SQLERRM
        using errcode = SQLSTATE;
  end;
end;
$$;
