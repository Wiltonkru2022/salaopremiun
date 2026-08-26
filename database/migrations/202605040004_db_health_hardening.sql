create index if not exists admin_master_anotacoes_salao_id_admin_usuario_idx
  on public.admin_master_anotacoes_salao (id_admin_usuario);

create index if not exists admin_master_anotacoes_salao_id_salao_idx
  on public.admin_master_anotacoes_salao (id_salao);

create index if not exists alertas_sistema_id_salao_idx
  on public.alertas_sistema (id_salao);

create index if not exists alertas_sistema_resolvido_por_idx
  on public.alertas_sistema (resolvido_por);

create index if not exists agendamentos_cliente_id_idx
  on public.agendamentos (cliente_id);

create index if not exists agendamentos_id_comanda_idx
  on public.agendamentos (id_comanda);

create index if not exists agendamentos_profissional_id_idx
  on public.agendamentos (profissional_id);

create index if not exists agendamentos_servico_id_idx
  on public.agendamentos (servico_id);

create index if not exists clientes_id_salao_idx
  on public.clientes (id_salao);

create index if not exists comandas_id_agendamento_principal_idx
  on public.comandas (id_agendamento_principal);

create index if not exists comandas_id_cliente_idx
  on public.comandas (id_cliente);

create index if not exists comandas_id_salao_idx
  on public.comandas (id_salao);

create index if not exists produtos_id_salao_idx
  on public.produtos (id_salao);

create index if not exists servicos_id_categoria_idx
  on public.servicos (id_categoria);

create index if not exists servicos_id_salao_idx
  on public.servicos (id_salao);

create index if not exists assinaturas_cobrancas_id_plano_idx
  on public.assinaturas_cobrancas (id_plano);

create index if not exists assinaturas_cobrancas_id_salao_idx
  on public.assinaturas_cobrancas (id_salao);

alter table public.profissional_login_rate_limits enable row level security;
revoke all on table public.profissional_login_rate_limits from anon, authenticated;

drop policy if exists usuarios_select_mesmo_salao on public.usuarios;
create policy usuarios_select_mesmo_salao
on public.usuarios
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists usuarios_update_so_admin on public.usuarios;
create policy usuarios_update_so_admin
on public.usuarios
for update
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists saloes_select_mesmo_salao on public.saloes;
create policy saloes_select_mesmo_salao
on public.saloes
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id = (select public.fn_id_salao_atual())
);

drop policy if exists saloes_update_so_admin on public.saloes;
create policy saloes_update_so_admin
on public.saloes
for update
to authenticated
using (
  (select public.fn_usuario_admin())
  and id = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_admin())
  and id = (select public.fn_id_salao_atual())
);

drop policy if exists clientes_select_mesmo_salao on public.clientes;
create policy clientes_select_mesmo_salao
on public.clientes
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists clientes_insert_mesmo_salao on public.clientes;
create policy clientes_insert_mesmo_salao
on public.clientes
for insert
to authenticated
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists clientes_update_mesmo_salao on public.clientes;
create policy clientes_update_mesmo_salao
on public.clientes
for update
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists clientes_delete_so_admin on public.clientes;
create policy clientes_delete_so_admin
on public.clientes
for delete
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists profissionais_select_mesmo_salao on public.profissionais;
create policy profissionais_select_mesmo_salao
on public.profissionais
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists profissionais_insert_so_admin on public.profissionais;
create policy profissionais_insert_so_admin
on public.profissionais
for insert
to authenticated
with check (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists profissionais_update_so_admin on public.profissionais;
create policy profissionais_update_so_admin
on public.profissionais
for update
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists profissionais_delete_so_admin on public.profissionais;
create policy profissionais_delete_so_admin
on public.profissionais
for delete
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agendamentos_select_mesmo_salao on public.agendamentos;
create policy agendamentos_select_mesmo_salao
on public.agendamentos
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agendamentos_insert_mesmo_salao on public.agendamentos;
create policy agendamentos_insert_mesmo_salao
on public.agendamentos
for insert
to authenticated
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agendamentos_update_mesmo_salao on public.agendamentos;
create policy agendamentos_update_mesmo_salao
on public.agendamentos
for update
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agendamentos_delete_so_admin on public.agendamentos;
create policy agendamentos_delete_so_admin
on public.agendamentos
for delete
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists comandas_select_mesmo_salao on public.comandas;
create policy comandas_select_mesmo_salao
on public.comandas
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists comandas_insert_mesmo_salao on public.comandas;
create policy comandas_insert_mesmo_salao
on public.comandas
for insert
to authenticated
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists comandas_update_mesmo_salao on public.comandas;
create policy comandas_update_mesmo_salao
on public.comandas
for update
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists comandas_delete_so_admin on public.comandas;
create policy comandas_delete_so_admin
on public.comandas
for delete
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists produtos_select_mesmo_salao on public.produtos;
create policy produtos_select_mesmo_salao
on public.produtos
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists produtos_insert_so_admin on public.produtos;
create policy produtos_insert_so_admin
on public.produtos
for insert
to authenticated
with check (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists produtos_update_so_admin on public.produtos;
create policy produtos_update_so_admin
on public.produtos
for update
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists produtos_delete_so_admin on public.produtos;
create policy produtos_delete_so_admin
on public.produtos
for delete
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists assinaturas_select_mesmo_salao on public.assinaturas;
create policy assinaturas_select_mesmo_salao
on public.assinaturas
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists assinaturas_update_so_admin on public.assinaturas;
create policy assinaturas_update_so_admin
on public.assinaturas
for update
to authenticated
using (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists tickets_select_mesmo_salao on public.tickets;
create policy tickets_select_mesmo_salao
on public.tickets
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists tickets_insert_mesmo_salao on public.tickets;
create policy tickets_insert_mesmo_salao
on public.tickets
for insert
to authenticated
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists tickets_update_mesmo_salao on public.tickets;
create policy tickets_update_mesmo_salao
on public.tickets
for update
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);
