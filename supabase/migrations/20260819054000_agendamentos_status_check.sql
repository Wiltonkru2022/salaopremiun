-- Impede gravacao de estados arbitrarios na agenda por clientes autenticados.
-- A lista inclui todos os estados operacionais usados atualmente pelos tres apps.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.agendamentos'::regclass
      and conname = 'agendamentos_status_operacional_check'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_status_operacional_check
      check (
        status = any (
          array[
            'pendente'::text,
            'confirmado'::text,
            'em_atendimento'::text,
            'atendido'::text,
            'aguardando_pagamento'::text,
            'aguardando_confirmacao_salao'::text,
            'aguardando_confirmacao_profissional'::text,
            'reservado_aguardando_pagamento'::text,
            'cancelado'::text,
            'faltou'::text,
            'expirado'::text
          ]
        )
      );
  end if;
end
$$;
