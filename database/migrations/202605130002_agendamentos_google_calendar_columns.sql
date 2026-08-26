alter table if exists public.agendamentos
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_sync_status text default 'pendente',
  add column if not exists google_calendar_synced_at timestamptz;

create index if not exists idx_agendamentos_google_calendar_event_id
  on public.agendamentos(google_calendar_event_id)
  where google_calendar_event_id is not null;

create index if not exists idx_agendamentos_google_calendar_sync
  on public.agendamentos(id_salao, profissional_id, data, google_calendar_sync_status);

