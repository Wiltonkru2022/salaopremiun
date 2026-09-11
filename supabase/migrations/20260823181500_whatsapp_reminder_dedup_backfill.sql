-- Alinha a idempotencia do lembrete dedicado com o caminho legado de notification_jobs,
-- evitando envio/cobranca duplicados enquanto os dois mecanismos coexistem.

create or replace function public.fn_whatsapp_schedule_appointment_reminder(
  p_id_salao uuid,
  p_id_agendamento uuid,
  p_id_comanda uuid,
  p_data date,
  p_hora time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_send_at timestamptz;
  v_minutes integer := 30;
  v_key text;
begin
  delete from public.whatsapp_automatic_jobs
   where id_salao = p_id_salao
     and id_agendamento = p_id_agendamento
     and evento = 'lembrete_agendamento'
     and status = 'pendente';

  select least(greatest(coalesce(cn.lembrete_minutos_antes, 30), 5), 240)
    into v_minutes
    from public.configuracoes_notificacoes cn
   where cn.id_salao = p_id_salao
   limit 1;
  v_minutes := coalesce(v_minutes, 30);

  v_send_at := public.fn_whatsapp_reminder_send_at(p_id_salao, p_data, p_hora);
  if v_send_at <= timezone('utc', now()) then
    return;
  end if;

  -- Igual ao idempotencyKey produzido pelo caminho legado em processDueWhatsAppReminders:
  -- auto:lembrete: + lembrete_30min:<id>:cliente:<data>:<hora>:<minutos>
  v_key := 'auto:lembrete:lembrete_30min:' || p_id_agendamento::text ||
           ':cliente:' || p_data::text || ':' || to_char(p_hora, 'HH24:MI') || ':' || v_minutes::text;

  perform public.enqueue_whatsapp_automatic_event_at(
    p_id_salao,
    p_id_agendamento,
    p_id_comanda,
    'lembrete_agendamento',
    v_key,
    v_send_at,
    jsonb_build_object(
      'source', 'agendamento_confirmado',
      'scheduled_for', v_send_at,
      'minutes_before', v_minutes
    )
  );
end;
$$;

revoke all on function public.fn_whatsapp_schedule_appointment_reminder(uuid, uuid, uuid, date, time) from public, anon, authenticated;
grant execute on function public.fn_whatsapp_schedule_appointment_reminder(uuid, uuid, uuid, date, time) to service_role;

-- Remove apenas lembretes automaticos futuros criados pela versao imediatamente anterior
-- e recria uma fila deduplicada para agendamentos ja confirmados.
delete from public.whatsapp_automatic_jobs
 where evento = 'lembrete_agendamento'
   and status = 'pendente';

do $$
declare
  r record;
begin
  for r in
    select a.id, a.id_salao, a.id_comanda, a.data, a.hora_inicio
      from public.agendamentos a
     where lower(coalesce(a.status, '')) = 'confirmado'
       and a.data >= current_date - 1
       and a.data <= current_date + 90
  loop
    perform public.fn_whatsapp_schedule_appointment_reminder(
      r.id_salao,
      r.id,
      r.id_comanda,
      r.data,
      r.hora_inicio::time
    );
  end loop;
end;
$$;
