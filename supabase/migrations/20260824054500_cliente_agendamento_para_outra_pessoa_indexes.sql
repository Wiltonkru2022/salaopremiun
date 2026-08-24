create index if not exists idx_agendamentos_pessoa_atendida_cliente_id
  on public.agendamentos (pessoa_atendida_cliente_id);

create index if not exists idx_agendamentos_agendado_por_app_conta_id
  on public.agendamentos (agendado_por_app_conta_id);
