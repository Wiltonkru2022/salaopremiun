create table if not exists public.whatsapp_pacote_compras (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_pacote uuid not null references public.whatsapp_pacotes(id) on delete restrict,
  status text not null default 'pendente',
  billing_type text not null default 'PIX',
  valor numeric(12, 2) not null default 0,
  quantidade_creditos integer not null default 0,
  idempotency_key text,
  external_reference text not null unique,
  asaas_customer_id text,
  asaas_payment_id text unique,
  invoice_url text,
  bank_slip_url text,
  pix_copia_cola text,
  qr_code_base64 text,
  response_json jsonb not null default '{}'::jsonb,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_whatsapp_pacote_compras_salao_status
  on public.whatsapp_pacote_compras (id_salao, status, criado_em desc);

create unique index if not exists idx_whatsapp_pacote_compras_idempotency
  on public.whatsapp_pacote_compras (id_salao, idempotency_key)
  where idempotency_key is not null;

create or replace function public.touch_whatsapp_pacote_compras_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_whatsapp_pacote_compras_atualizado_em
  on public.whatsapp_pacote_compras;

create trigger trg_touch_whatsapp_pacote_compras_atualizado_em
before update on public.whatsapp_pacote_compras
for each row
execute function public.touch_whatsapp_pacote_compras_atualizado_em();
