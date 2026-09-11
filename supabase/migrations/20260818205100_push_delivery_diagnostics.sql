alter table public.push_subscriptions
  add column if not exists last_success_at timestamptz,
  add column if not exists last_failure_at timestamptz,
  add column if not exists last_error_code integer,
  add column if not exists last_error_message text,
  add column if not exists failure_count integer not null default 0;

create table if not exists public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  push_subscription_id uuid references public.push_subscriptions(id) on delete set null,
  audience text not null check (audience in ('cliente_app','profissional_app','salao_painel')),
  endpoint_host text,
  notification_tag text,
  title text,
  status text not null check (status in ('enviada','falhou','ignorada')),
  http_status integer,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.push_delivery_log enable row level security;

create index if not exists push_delivery_log_created_at_idx
  on public.push_delivery_log (created_at desc);
create index if not exists push_delivery_log_subscription_idx
  on public.push_delivery_log (push_subscription_id, created_at desc);
create index if not exists push_delivery_log_status_idx
  on public.push_delivery_log (status, created_at desc);

revoke all on table public.push_delivery_log from anon, authenticated;
