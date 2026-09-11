create index if not exists agendamentos_salao_profissional_data_hora_idx
  on public.agendamentos (id_salao, profissional_id, data, hora_inicio);

create index if not exists agenda_bloqueios_salao_profissional_data_hora_idx
  on public.agenda_bloqueios (id_salao, profissional_id, data, hora_inicio);
