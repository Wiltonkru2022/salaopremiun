alter table public.configuracoes_salao
  add column if not exists sinal_agendamento_ativo boolean not null default false,
  add column if not exists sinal_agendamento_percentual numeric(5,2) not null default 10,
  add column if not exists sinal_pix_chave text,
  add column if not exists sinal_pix_recebedor text,
  add column if not exists sinal_pix_cidade text,
  add column if not exists sinal_whatsapp text,
  add column if not exists sinal_reserva_minutos integer not null default 10,
  add column if not exists sinal_mensagem_comprovante text;

alter table public.servicos
  add column if not exists cobra_sinal_agendamento boolean not null default false,
  add column if not exists sinal_percentual_personalizado numeric(5,2);

alter table public.agendamentos
  add column if not exists reserva_expira_em timestamptz,
  add column if not exists sinal_percentual numeric(5,2),
  add column if not exists sinal_valor numeric(12,2) not null default 0,
  add column if not exists sinal_status text not null default 'nao_exigido',
  add column if not exists sinal_pix_chave text,
  add column if not exists sinal_pix_recebedor text,
  add column if not exists sinal_pix_cidade text,
  add column if not exists sinal_whatsapp text,
  add column if not exists sinal_mensagem_comprovante text,
  add column if not exists sinal_comprovante_enviado_em timestamptz,
  add column if not exists sinal_confirmado_em timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'configuracoes_salao_sinal_percentual_check'
  ) then
    alter table public.configuracoes_salao
      add constraint configuracoes_salao_sinal_percentual_check
      check (sinal_agendamento_percentual >= 0 and sinal_agendamento_percentual <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'configuracoes_salao_sinal_reserva_minutos_check'
  ) then
    alter table public.configuracoes_salao
      add constraint configuracoes_salao_sinal_reserva_minutos_check
      check (sinal_reserva_minutos between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'servicos_sinal_percentual_personalizado_check'
  ) then
    alter table public.servicos
      add constraint servicos_sinal_percentual_personalizado_check
      check (
        sinal_percentual_personalizado is null
        or (sinal_percentual_personalizado >= 0 and sinal_percentual_personalizado <= 100)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_sinal_status_check'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_sinal_status_check
      check (sinal_status in (
        'nao_exigido',
        'aguardando_pagamento',
        'comprovante_enviado',
        'confirmado',
        'expirado',
        'cancelado'
      ));
  end if;
end $$;

create index if not exists idx_agendamentos_reserva_temporaria
  on public.agendamentos (id_salao, profissional_id, data, hora_inicio, hora_fim, status, reserva_expira_em);

create unique index if not exists uq_agendamentos_slot_inicio_ativo
  on public.agendamentos (id_salao, profissional_id, data, hora_inicio)
  where status in ('pendente', 'confirmado', 'aguardando_pagamento', 'reservado_aguardando_pagamento', 'aguardando_confirmacao_salao');
