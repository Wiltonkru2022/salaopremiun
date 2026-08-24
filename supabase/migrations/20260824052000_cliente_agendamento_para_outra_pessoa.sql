alter table public.agendamentos
  add column if not exists pessoa_agendada_tipo text not null default 'mim',
  add column if not exists pessoa_agendada_nome text,
  add column if not exists pessoa_agendada_whatsapp text,
  add column if not exists pessoa_atendida_cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists agendado_por_app_conta_id uuid references public.clientes_app_auth(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agendamentos_pessoa_agendada_tipo_check'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_pessoa_agendada_tipo_check
      check (pessoa_agendada_tipo in ('mim', 'outra_pessoa'));
  end if;
end $$;

create index if not exists idx_agendamentos_pessoa_atendida_cliente
  on public.agendamentos (id_salao, pessoa_atendida_cliente_id)
  where pessoa_atendida_cliente_id is not null;

create index if not exists idx_agendamentos_agendado_por_app
  on public.agendamentos (agendado_por_app_conta_id, data desc)
  where agendado_por_app_conta_id is not null;

comment on column public.agendamentos.pessoa_agendada_tipo is
  'Indica se a reserva foi feita para o titular da conta ou para outra pessoa.';
comment on column public.agendamentos.pessoa_atendida_cliente_id is
  'Ficha do cliente que efetivamente recebera o atendimento quando a reserva for feita por terceiro.';
comment on column public.agendamentos.agendado_por_app_conta_id is
  'Conta do App Cliente que realizou a reserva.';
