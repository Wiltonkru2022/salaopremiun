create index if not exists comandas_salao_aberta_em_desc_idx
  on public.comandas (id_salao, aberta_em desc);

create index if not exists comandas_fila_salao_aberta_em_idx
  on public.comandas (id_salao, status, aberta_em asc)
  where status in ('aberta', 'em_atendimento', 'aguardando_pagamento');

create index if not exists comandas_fechadas_salao_fechada_em_desc_idx
  on public.comandas (id_salao, fechada_em desc)
  where status = 'fechada';

create index if not exists comandas_canceladas_salao_cancelada_em_desc_idx
  on public.comandas (id_salao, cancelada_em desc)
  where status = 'cancelada';

create index if not exists agendamentos_caixa_sem_comanda_idx
  on public.agendamentos (id_salao, data asc, hora_inicio asc)
  where id_comanda is null and status = 'aguardando_pagamento';
