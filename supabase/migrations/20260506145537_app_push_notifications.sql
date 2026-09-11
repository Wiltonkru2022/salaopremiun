create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (
    audience in ('cliente_app', 'profissional_app', 'salao_painel')
  ),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  id_salao uuid null references public.saloes(id) on delete cascade,
  id_usuario uuid null references public.usuarios(id) on delete cascade,
  id_profissional uuid null references public.profissionais(id) on delete cascade,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete cascade,
  user_agent text null,
  ativo boolean not null default true,
  ultimo_uso_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint push_subscriptions_owner_chk check (
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

create unique index if not exists push_subscriptions_audience_endpoint_uidx
  on public.push_subscriptions(audience, endpoint);

create index if not exists push_subscriptions_cliente_idx
  on public.push_subscriptions(cliente_app_conta_id)
  where audience = 'cliente_app' and ativo = true;

create index if not exists push_subscriptions_profissional_idx
  on public.push_subscriptions(id_profissional, id_salao)
  where audience = 'profissional_app' and ativo = true;

create index if not exists push_subscriptions_salao_idx
  on public.push_subscriptions(id_salao)
  where audience = 'salao_painel' and ativo = true;

alter table public.push_subscriptions enable row level security;
