create table if not exists public.whatsapp_automacoes_saloes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  confirmacao_agendamento boolean not null default true,
  lembrete_agendamento boolean not null default true,
  agendamento_alterado boolean not null default true,
  agendamento_cancelado boolean not null default true,
  profissional_confirmado boolean not null default true,
  pagamento_confirmado boolean not null default true,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now()),
  unique (id_salao)
);

create index if not exists whatsapp_automacoes_saloes_salao_idx
  on public.whatsapp_automacoes_saloes (id_salao);

alter table public.whatsapp_automacoes_saloes enable row level security;
revoke all on table public.whatsapp_automacoes_saloes from anon, authenticated;

drop trigger if exists trg_touch_whatsapp_automacoes_saloes_atualizado_em
  on public.whatsapp_automacoes_saloes;
create trigger trg_touch_whatsapp_automacoes_saloes_atualizado_em
before update on public.whatsapp_automacoes_saloes
for each row
execute function public.touch_whatsapp_creditos_atualizado_em();

insert into public.whatsapp_automacoes_saloes (id_salao)
select id from public.saloes
on conflict (id_salao) do nothing;
