alter table public.alertas_sistema
  add column if not exists id_ticket uuid references public.tickets(id) on delete set null;

create index if not exists alertas_sistema_ticket_idx
  on public.alertas_sistema (id_ticket);
