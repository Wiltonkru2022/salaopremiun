begin;

do $$
declare
  policy_drop text[];
begin
  foreach policy_drop slice 1 in array array[
    ['agenda_bloqueios', 'agenda_bloqueios_select_membros_salao'],
    ['agenda_bloqueios', 'agenda_bloqueios_insert_membros_salao'],
    ['agenda_bloqueios', 'agenda_bloqueios_update_membros_salao'],
    ['agenda_bloqueios', 'agenda_bloqueios_delete_membros_salao'],
    ['agenda_bloqueios_logs', 'agenda_bloqueios_logs_insert_membros_salao'],
    ['agendamentos', 'agendamentos_select_membros_salao'],
    ['agendamentos', 'agendamentos_insert_membros_salao'],
    ['agendamentos', 'agendamentos_update_membros_salao'],
    ['agendamentos', 'agendamentos_delete_membros_salao'],
    ['assinaturas', 'assinaturas_select_mesmo_salao'],
    ['assinaturas', 'assinaturas_update_so_admin'],
    ['clientes', 'clientes_select_membros_salao'],
    ['clientes', 'clientes_insert_membros_salao'],
    ['clientes', 'clientes_update_membros_salao'],
    ['clientes', 'clientes_delete_membros_salao'],
    ['comanda_itens', 'comanda_itens_select_membros_salao'],
    ['comanda_itens', 'comanda_itens_insert_membros_salao'],
    ['comanda_itens', 'comanda_itens_update_membros_salao'],
    ['comanda_itens', 'comanda_itens_delete_membros_salao'],
    ['comanda_pagamentos', 'comanda_pagamentos_select_membros_salao'],
    ['comanda_pagamentos', 'comanda_pagamentos_insert_operadores_salao'],
    ['comanda_pagamentos', 'comanda_pagamentos_update_operadores_salao'],
    ['comanda_pagamentos', 'comanda_pagamentos_delete_operadores_salao'],
    ['comandas', 'comandas_select_membros_salao'],
    ['comandas', 'comandas_insert_membros_salao'],
    ['comandas', 'comandas_update_membros_salao'],
    ['comandas', 'comandas_delete_operadores_salao'],
    ['comandas', 'comandas_select_authenticated'],
    ['comandas', 'comandas_insert_authenticated'],
    ['comandas', 'comandas_update_authenticated'],
    ['comandas', 'comandas_delete_authenticated'],
    ['comissoes_lancamentos', 'comissoes_lancamentos_select_membros_salao'],
    ['comissoes_lancamentos', 'comissoes_lancamentos_update_operadores_salao'],
    ['itens_extras', 'itens_extras_select_membros_salao'],
    ['itens_extras', 'itens_extras_insert_membros_salao'],
    ['itens_extras', 'itens_extras_update_membros_salao'],
    ['itens_extras', 'itens_extras_delete_membros_salao'],
    ['produto_servico_consumo', 'produto_servico_consumo_select_membros_salao'],
    ['produto_servico_consumo', 'produto_servico_consumo_insert_membros_salao'],
    ['produto_servico_consumo', 'produto_servico_consumo_update_membros_salao'],
    ['produto_servico_consumo', 'produto_servico_consumo_delete_membros_salao'],
    ['produtos', 'produtos_select_membros_salao'],
    ['produtos', 'produtos_insert_membros_salao'],
    ['produtos', 'produtos_update_membros_salao'],
    ['produtos', 'produtos_delete_membros_salao'],
    ['produtos_movimentacoes', 'produtos_movimentacoes_select_membros_salao'],
    ['produtos_movimentacoes', 'produtos_movimentacoes_insert_operadores_salao'],
    ['produtos_movimentacoes', 'produtos_movimentacoes_update_operadores_salao'],
    ['produtos_movimentacoes', 'produtos_movimentacoes_delete_operadores_salao'],
    ['profissionais', 'profissionais_select_membros_salao'],
    ['profissionais', 'profissionais_insert_membros_salao'],
    ['profissionais', 'profissionais_update_membros_salao'],
    ['profissionais', 'profissionais_delete_membros_salao'],
    ['profissional_assistentes', 'profissional_assistentes_select_membros_salao'],
    ['profissional_assistentes', 'profissional_assistentes_insert_membros_salao'],
    ['profissional_assistentes', 'profissional_assistentes_update_membros_salao'],
    ['profissional_assistentes', 'profissional_assistentes_delete_membros_salao'],
    ['profissional_servicos', 'profissional_servicos_select_membros_salao'],
    ['profissional_servicos', 'profissional_servicos_insert_membros_salao'],
    ['profissional_servicos', 'profissional_servicos_update_membros_salao'],
    ['profissional_servicos', 'profissional_servicos_delete_membros_salao'],
    ['servicos', 'servicos_select_membros_salao'],
    ['servicos', 'servicos_insert_membros_salao'],
    ['servicos', 'servicos_update_membros_salao'],
    ['servicos', 'servicos_delete_membros_salao']
  ]
  loop
    execute format('drop policy if exists %I on public.%I', policy_drop[2], policy_drop[1]);
  end loop;
end
$$;

commit;
