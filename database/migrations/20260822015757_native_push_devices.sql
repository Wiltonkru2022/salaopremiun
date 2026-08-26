create table if not exists public.native_push_devices (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (
    audience in ('cliente_app', 'profissional_app', 'salao_painel')
  ),
  fcm_token text not null,
  platform text not null default 'android' check (
    platform in ('android', 'ios')
  ),
  app_id text,
  id_salao uuid null references public.saloes(id) on delete cascade,
  id_usuario uuid null references public.usuarios(id) on delete cascade,
  id_profissional uuid null references public.profissionais(id) on delete cascade,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete cascade,
  user_agent text,
  app_version text,
  device_model text,
  ativo boolean not null default true,
  ultimo_uso_em timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error_code text,
  last_error_message text,
  failure_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint native_push_devices_owner_chk check (
    (
      audience = 'cliente_app'
      and cliente_app_conta_id is not null
      and id_salao is null
      and id_usuario is null
      and id_profissional is null
    )
    or (
      audience = 'profissional_app'
      and id_salao is not null
      and id_profissional is not null
      and cliente_app_conta_id is null
    )
    or (
      audience = 'salao_painel'
      and id_salao is not null
      and id_usuario is not null
      and cliente_app_conta_id is null
    )
  )
);

create unique index if not exists native_push_devices_audience_token_uidx
  on public.native_push_devices(audience, fcm_token);

create index if not exists native_push_devices_cliente_idx
  on public.native_push_devices(cliente_app_conta_id)
  where audience = 'cliente_app' and ativo = true;

create index if not exists native_push_devices_profissional_idx
  on public.native_push_devices(id_profissional, id_salao)
  where audience = 'profissional_app' and ativo = true;

create index if not exists native_push_devices_salao_idx
  on public.native_push_devices(id_salao)
  where audience = 'salao_painel' and ativo = true;

alter table public.native_push_devices enable row level security;

revoke all on table public.native_push_devices from anon, authenticated;
