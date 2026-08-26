alter function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) security definer;
alter function public.trg_agendamento_whatsapp_automatic_events() security definer;
alter function public.trg_comanda_whatsapp_pagamento_confirmado() security definer;

revoke all on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.trg_agendamento_whatsapp_automatic_events() from public, anon, authenticated;
revoke all on function public.trg_comanda_whatsapp_pagamento_confirmado() from public, anon, authenticated;

grant execute on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) to service_role;
