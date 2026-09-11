create or replace function public.enqueue_whatsapp_automatic_event(
  p_id_salao uuid,
  p_id_agendamento uuid,
  p_id_comanda uuid,
  p_evento text,
  p_idempotency_key text,
  p_payload_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if p_id_salao is null or nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    return;
  end if;

  begin
    insert into public.whatsapp_automatic_jobs (
      id_salao,
      id_agendamento,
      id_comanda,
      evento,
      idempotency_key,
      payload_json
    ) values (
      p_id_salao,
      p_id_agendamento,
      p_id_comanda,
      p_evento,
      p_idempotency_key,
      coalesce(p_payload_json, '{}'::jsonb)
    )
    on conflict (idempotency_key) do nothing
    returning id into v_job_id;
  exception when others then
    return;
  end;

  if v_job_id is not null then
    begin
      perform public.dispatch_whatsapp_automation_worker();
    exception when others then
      null;
    end;
  end if;
end;
$$;

revoke all on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) to service_role;
