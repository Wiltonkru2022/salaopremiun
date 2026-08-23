alter table public.whatsapp_automatic_jobs
  drop constraint if exists whatsapp_automatic_jobs_evento_check;

alter table public.whatsapp_automatic_jobs
  add constraint whatsapp_automatic_jobs_evento_check
  check (evento in (
    'confirmacao_agendamento',
    'agendamento_alterado',
    'agendamento_cancelado',
    'profissional_confirmado',
    'pagamento_confirmado'
  ));

create or replace function public.trg_agendamento_whatsapp_automatic_events()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_version text;
begin
  v_version := replace(
    coalesce(new.updated_at, new.created_at, timezone('utc', clock_timestamp()))::text,
    ' ',
    'T'
  );

  if tg_op = 'INSERT' then
    if lower(coalesce(new.status, '')) = 'confirmado' then
      perform public.enqueue_whatsapp_automatic_event(
        new.id_salao, new.id, new.id_comanda, 'confirmacao_agendamento',
        'auto:confirmacao:' || new.id::text || ':' || v_version,
        jsonb_build_object('source', 'agendamentos_insert')
      );
    end if;
    return new;
  end if;

  if lower(coalesce(new.status, '')) = 'cancelado'
     and lower(coalesce(old.status, '')) <> 'cancelado' then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'agendamento_cancelado',
      'auto:cancelamento:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_status')
    );
    return new;
  end if;

  if lower(coalesce(new.status, '')) = 'confirmado'
     and lower(coalesce(old.status, '')) <> 'confirmado' then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'confirmacao_agendamento',
      'auto:confirmacao:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_status')
    );
  end if;

  if old.profissional_id is null
     and new.profissional_id is not null
     and lower(coalesce(new.status, '')) not in ('cancelado', 'atendido', 'faltou', 'expirado') then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'profissional_confirmado',
      'auto:profissional-confirmado:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_profissional')
    );
  elsif new.profissional_id is distinct from old.profissional_id
     and lower(coalesce(new.status, '')) not in ('cancelado', 'atendido', 'faltou', 'expirado') then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'agendamento_alterado',
      'auto:alteracao:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamentos_update', 'reason', 'profissional')
    );
  end if;

  if (
       new.data is distinct from old.data
       or new.hora_inicio is distinct from old.hora_inicio
       or new.servico_id is distinct from old.servico_id
     )
     and lower(coalesce(new.status, '')) not in ('cancelado', 'atendido', 'faltou', 'expirado') then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'agendamento_alterado',
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
      new.id_salao, new.id, new.id_comanda, 'pagamento_confirmado',
      'auto:pagamento-sinal:' || new.id::text || ':' || v_version,
      jsonb_build_object('source', 'agendamento_sinal', 'valor', new.sinal_valor)
    );
  end if;

  return new;
end;
$$;
