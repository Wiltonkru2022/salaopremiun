create index if not exists whatsapp_automatic_jobs_agendamento_idx
  on public.whatsapp_automatic_jobs (id_agendamento)
  where id_agendamento is not null;

create index if not exists whatsapp_automatic_jobs_comanda_idx
  on public.whatsapp_automatic_jobs (id_comanda)
  where id_comanda is not null;

create or replace function public.trg_agendamento_whatsapp_automatic_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version text;
  v_became_confirmed boolean;
begin
  v_version := replace(
    coalesce(new.updated_at, new.created_at, timezone('utc', clock_timestamp()))::text,
    ' ',
    'T'
  );

  if tg_op = 'INSERT' then
    if lower(coalesce(new.status, '')) = 'confirmado' then
      perform public.enqueue_whatsapp_automatic_event(
        new.id_salao,
        new.id,
        new.id_comanda,
        'confirmacao_agendamento',
        'auto:confirmacao:' || new.id::text || ':' || v_version,
        jsonb_build_object('source', 'agendamentos_insert')
      );
    end if;
    return new;
  end if;

  if lower(coalesce(new.status, '')) = 'cancelado'
     and lower(coalesce(old.status, '')) <> 'cancelado' then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'agendamento_cancelado',
      'auto:cancelamento:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_status')
    );
    return new;
  end if;

  v_became_confirmed :=
    lower(coalesce(new.status, '')) = 'confirmado'
    and lower(coalesce(old.status, '')) <> 'confirmado';

  if v_became_confirmed then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'confirmacao_agendamento',
      'auto:confirmacao:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_status')
    );
  end if;

  if not v_became_confirmed
     and (
       new.data is distinct from old.data
       or new.hora_inicio is distinct from old.hora_inicio
       or new.profissional_id is distinct from old.profissional_id
       or new.servico_id is distinct from old.servico_id
     )
     and lower(coalesce(new.status, '')) not in ('cancelado', 'atendido', 'faltou', 'expirado') then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'agendamento_alterado',
      'auto:alteracao:' || new.id::text || ':' || v_version,
      jsonb_build_object(
        'source', 'agendamentos_update',
        'old_data', old.data,
        'old_hora_inicio', old.hora_inicio
      )
    );
  end if;

  if lower(coalesce(new.sinal_status, '')) = 'confirmado'
     and lower(coalesce(old.sinal_status, '')) <> 'confirmado'
     and coalesce(new.sinal_valor, 0) > 0 then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id,
      new.id_comanda,
      'pagamento_confirmado',
      'auto:pagamento-sinal:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamento_sinal', 'valor', new.sinal_valor)
    );
  end if;

  return new;
end;
$$;

revoke all on function public.trg_agendamento_whatsapp_automatic_events() from public, anon, authenticated;
