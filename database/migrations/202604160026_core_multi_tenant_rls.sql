-- Hardening multi-tenant para os dados operacionais mais sensiveis.
-- As rotas server-side continuam usando service_role; o acesso direto autenticado
-- fica limitado ao id_salao do usuario.

grant execute on function public.usuario_tem_acesso_salao(uuid) to authenticated, service_role;
grant execute on function public.usuario_pode_operar_caixa(uuid) to authenticated, service_role;

alter table if exists public.comandas enable row level security;
alter table if exists public.comanda_itens enable row level security;
alter table if exists public.comanda_pagamentos enable row level security;
alter table if exists public.comissoes_lancamentos enable row level security;
alter table if exists public.produtos_movimentacoes enable row level security;
alter table if exists public.logs_sistema enable row level security;

revoke all on table public.vendas from anon;
revoke all on table public.vw_vendas_busca from anon;
revoke all on table public.comandas from anon;
revoke all on table public.comanda_itens from anon;
revoke all on table public.comanda_pagamentos from anon;
revoke all on table public.comissoes_lancamentos from anon;
revoke all on table public.produtos_movimentacoes from anon;
revoke all on table public.logs_sistema from anon;

grant select on table public.vendas to authenticated, service_role;
grant select on table public.vw_vendas_busca to authenticated, service_role;

grant select, insert, update, delete on table public.comandas to authenticated;
grant select, insert, update, delete on table public.comanda_itens to authenticated;
grant select on table public.comanda_pagamentos to authenticated;
grant select, insert, update, delete on table public.comanda_pagamentos to service_role;
grant select, update on table public.comissoes_lancamentos to authenticated;
grant select, insert, update, delete on table public.comissoes_lancamentos to service_role;
grant select, insert, update, delete on table public.produtos_movimentacoes to authenticated, service_role;
grant select on table public.logs_sistema to authenticated;
grant select, insert on table public.logs_sistema to service_role;

alter view if exists public.vendas set (security_invoker = true);
alter view if exists public.vw_vendas_busca set (security_invoker = true);

drop policy if exists "comandas_select_membros_salao" on public.comandas;
drop policy if exists "comandas_insert_membros_salao" on public.comandas;
drop policy if exists "comandas_update_membros_salao" on public.comandas;
drop policy if exists "comandas_delete_operadores_salao" on public.comandas;

create policy "comandas_select_membros_salao"
  on public.comandas
  for select
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao));

create policy "comandas_insert_membros_salao"
  on public.comandas
  for insert
  to authenticated
  with check (public.usuario_tem_acesso_salao(id_salao));

create policy "comandas_update_membros_salao"
  on public.comandas
  for update
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao))
  with check (public.usuario_tem_acesso_salao(id_salao));

create policy "comandas_delete_operadores_salao"
  on public.comandas
  for delete
  to authenticated
  using (public.usuario_pode_operar_caixa(id_salao));

drop policy if exists "comanda_itens_select_membros_salao" on public.comanda_itens;
drop policy if exists "comanda_itens_insert_membros_salao" on public.comanda_itens;
drop policy if exists "comanda_itens_update_membros_salao" on public.comanda_itens;
drop policy if exists "comanda_itens_delete_membros_salao" on public.comanda_itens;

create policy "comanda_itens_select_membros_salao"
  on public.comanda_itens
  for select
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao));

create policy "comanda_itens_insert_membros_salao"
  on public.comanda_itens
  for insert
  to authenticated
  with check (public.usuario_tem_acesso_salao(id_salao));

create policy "comanda_itens_update_membros_salao"
  on public.comanda_itens
  for update
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao))
  with check (public.usuario_tem_acesso_salao(id_salao));

create policy "comanda_itens_delete_membros_salao"
  on public.comanda_itens
  for delete
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao));

drop policy if exists "comanda_pagamentos_select_membros_salao" on public.comanda_pagamentos;
drop policy if exists "comanda_pagamentos_insert_operadores_salao" on public.comanda_pagamentos;
drop policy if exists "comanda_pagamentos_update_operadores_salao" on public.comanda_pagamentos;
drop policy if exists "comanda_pagamentos_delete_operadores_salao" on public.comanda_pagamentos;

create policy "comanda_pagamentos_select_membros_salao"
  on public.comanda_pagamentos
  for select
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao));

create policy "comanda_pagamentos_insert_operadores_salao"
  on public.comanda_pagamentos
  for insert
  to authenticated
  with check (public.usuario_pode_operar_caixa(id_salao));

create policy "comanda_pagamentos_update_operadores_salao"
  on public.comanda_pagamentos
  for update
  to authenticated
  using (public.usuario_pode_operar_caixa(id_salao))
  with check (public.usuario_pode_operar_caixa(id_salao));

create policy "comanda_pagamentos_delete_operadores_salao"
  on public.comanda_pagamentos
  for delete
  to authenticated
  using (public.usuario_pode_operar_caixa(id_salao));

drop policy if exists "comissoes_lancamentos_select_membros_salao" on public.comissoes_lancamentos;
drop policy if exists "comissoes_lancamentos_update_operadores_salao" on public.comissoes_lancamentos;

create policy "comissoes_lancamentos_select_membros_salao"
  on public.comissoes_lancamentos
  for select
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao));

create policy "comissoes_lancamentos_update_operadores_salao"
  on public.comissoes_lancamentos
  for update
  to authenticated
  using (public.usuario_pode_operar_caixa(id_salao))
  with check (public.usuario_pode_operar_caixa(id_salao));

drop policy if exists "produtos_movimentacoes_select_membros_salao" on public.produtos_movimentacoes;
drop policy if exists "produtos_movimentacoes_insert_operadores_salao" on public.produtos_movimentacoes;
drop policy if exists "produtos_movimentacoes_update_operadores_salao" on public.produtos_movimentacoes;
drop policy if exists "produtos_movimentacoes_delete_operadores_salao" on public.produtos_movimentacoes;

create policy "produtos_movimentacoes_select_membros_salao"
  on public.produtos_movimentacoes
  for select
  to authenticated
  using (public.usuario_tem_acesso_salao(id_salao));

create policy "produtos_movimentacoes_insert_operadores_salao"
  on public.produtos_movimentacoes
  for insert
  to authenticated
  with check (public.usuario_pode_operar_caixa(id_salao));

create policy "produtos_movimentacoes_update_operadores_salao"
  on public.produtos_movimentacoes
  for update
  to authenticated
  using (public.usuario_pode_operar_caixa(id_salao))
  with check (public.usuario_pode_operar_caixa(id_salao));

create policy "produtos_movimentacoes_delete_operadores_salao"
  on public.produtos_movimentacoes
  for delete
  to authenticated
  using (public.usuario_pode_operar_caixa(id_salao));

drop policy if exists "logs_sistema_select_membros_salao" on public.logs_sistema;

create policy "logs_sistema_select_membros_salao"
  on public.logs_sistema
  for select
  to authenticated
  using (id_salao is not null and public.usuario_tem_acesso_salao(id_salao));

revoke execute on function public.fn_gerar_comissoes_comanda(uuid)
  from public, anon, authenticated;
revoke execute on function public.fn_fechar_comanda(uuid)
  from public, anon, authenticated;

grant execute on function public.fn_gerar_comissoes_comanda(uuid) to service_role;
grant execute on function public.fn_fechar_comanda(uuid) to service_role;
