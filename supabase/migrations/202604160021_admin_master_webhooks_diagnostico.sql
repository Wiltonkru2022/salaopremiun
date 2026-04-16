alter table public.eventos_webhook
  add column if not exists chave text,
  add column if not exists automatico boolean not null default false,
  add column if not exists atualizado_em timestamptz not null default now();

update public.eventos_webhook
set automatico = coalesce(automatico, false),
    atualizado_em = coalesce(atualizado_em, processado_em, recebido_em, now())
where automatico is null
   or atualizado_em is null;

create unique index if not exists eventos_webhook_chave_unique_idx
  on public.eventos_webhook (chave);

create index if not exists eventos_webhook_origem_status_idx
  on public.eventos_webhook (origem, status, recebido_em desc);

create index if not exists eventos_webhook_salao_idx
  on public.eventos_webhook (id_salao, recebido_em desc);
