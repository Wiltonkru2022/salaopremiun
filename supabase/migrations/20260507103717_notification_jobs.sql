create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid null references public.saloes(id) on delete cascade,
  id_cliente uuid null references public.clientes(id) on delete set null,
  id_profissional uuid null references public.profissionais(id) on delete set null,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete cascade,
  canal text not null check (canal in ('cliente_app', 'profissional_app', 'salao_painel')),
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  url text null,
  tag text null,
  status text not null default 'pendente' check (
    status in ('pendente', 'processando', 'enviada', 'falhou', 'cancelada')
  ),
  enviar_em timestamptz not null default timezone('utc', now()),
  enviada_em timestamptz null,
  tentativas integer not null default 0,
  sent_count integer not null default 0,
  erro_texto text null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_jobs_target_chk check (
    (
      canal = 'cliente_app'
      and cliente_app_conta_id is not null
    )
    or (
      canal = 'profissional_app'
      and id_salao is not null
      and id_profissional is not null
    )
    or (
      canal = 'salao_painel'
      and id_salao is not null
    )
  )
);

create unique index if not exists notification_jobs_idempotency_uidx
  on public.notification_jobs(idempotency_key);

create index if not exists notification_jobs_pending_idx
  on public.notification_jobs(status, enviar_em)
  where status = 'pendente';

create index if not exists notification_jobs_salao_idx
  on public.notification_jobs(id_salao, canal, status, created_at desc)
  where id_salao is not null;

create index if not exists notification_jobs_cliente_idx
  on public.notification_jobs(cliente_app_conta_id, status, created_at desc)
  where cliente_app_conta_id is not null;

create index if not exists notification_jobs_profissional_idx
  on public.notification_jobs(id_salao, id_profissional, status, created_at desc)
  where id_profissional is not null;

alter table public.notification_jobs enable row level security;
