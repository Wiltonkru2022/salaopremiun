alter table public.tickets
  add column if not exists solicitante_nome text,
  add column if not exists solicitante_email text,
  add column if not exists ultima_interacao_em timestamptz not null default now(),
  add column if not exists origem_contexto jsonb not null default '{}'::jsonb;

update public.tickets
set ultima_interacao_em = coalesce(ultima_interacao_em, atualizado_em, criado_em, now()),
    origem_contexto = coalesce(origem_contexto, '{}'::jsonb)
where ultima_interacao_em is null
   or origem_contexto is null;

alter table public.ticket_mensagens
  add column if not exists id_profissional uuid references public.profissionais(id) on delete set null,
  add column if not exists autor_nome text;

create index if not exists tickets_salao_status_interacao_idx
  on public.tickets (id_salao, status, ultima_interacao_em desc);

create index if not exists ticket_mensagens_ticket_criada_idx
  on public.ticket_mensagens (id_ticket, criada_em asc);
