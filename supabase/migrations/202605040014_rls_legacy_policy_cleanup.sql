begin;

create or replace function public.profissional_usuario_mesmo_salao(target_id_profissional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profissionais p
    join public.usuarios u on u.id_salao = p.id_salao
    where p.id = target_id_profissional
      and u.auth_user_id = (select auth.uid())
      and coalesce(u.status, 'ativo') = 'ativo'
  );
$$;

create or replace function public.profissional_usuario_admin_mesmo_salao(target_id_profissional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profissionais p
    join public.usuarios u on u.id_salao = p.id_salao
    where p.id = target_id_profissional
      and u.auth_user_id = (select auth.uid())
      and coalesce(u.status, 'ativo') = 'ativo'
      and lower(coalesce(u.nivel, '')) in ('admin', 'gerente')
  );
$$;

do $$
declare
  legacy_pair text[];
begin
  foreach legacy_pair slice 1 in array array[
    ['agendamentos', 'agendamentos delete same salao'],
    ['agendamentos', 'agendamentos insert same salao'],
    ['agendamentos', 'agendamentos select same salao'],
    ['agendamentos', 'agendamentos update same salao'],
    ['agendamentos', 'agendamentos_delete'],
    ['agendamentos', 'agendamentos_insert'],
    ['agendamentos', 'agendamentos_select'],
    ['agendamentos', 'agendamentos_update'],
    ['clientes', 'delete same salao'],
    ['clientes', 'insert same salao'],
    ['clientes', 'select same salao'],
    ['clientes', 'update same salao'],
    ['clientes', 'clientes_delete'],
    ['clientes', 'clientes_insert'],
    ['clientes', 'clientes_select'],
    ['clientes', 'clientes_update'],
    ['usuarios', 'usuarios select same salao'],
    ['usuarios', 'usuarios update same salao'],
    ['usuarios', 'usuarios_select_proprio'],
    ['usuarios', 'usuarios_update_proprio'],
    ['saloes', 'Ler apenas seu salao'],
    ['saloes', 'saloes select own'],
    ['saloes', 'saloes update own'],
    ['saloes', 'saloes_update_mesmo_salao'],
    ['produtos', 'produtos update admin gerente'],
    ['produtos', 'produtos_update'],
    ['configuracoes_salao', 'config select same salao'],
    ['configuracoes_salao', 'configuracoes_salao_select'],
    ['configuracoes_salao', 'config update admin only'],
    ['configuracoes_salao', 'configuracoes_salao_update']
  ]
  loop
    execute format('drop policy if exists %I on public.%I', legacy_pair[2], legacy_pair[1]);
  end loop;
end
$$;

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

drop policy if exists configuracoes_salao_select_mesmo_salao on public.configuracoes_salao;
create policy configuracoes_salao_select_mesmo_salao
on public.configuracoes_salao
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists configuracoes_salao_update_so_admin on public.configuracoes_salao;
create policy configuracoes_salao_update_so_admin
on public.configuracoes_salao
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

drop policy if exists assinaturas_select_usuario_salao on public.assinaturas;
create policy assinaturas_select_usuario_salao
on public.assinaturas
for select
to authenticated
using (
  (select public.fn_usuario_ativo())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists assinaturas_insert_admin on public.assinaturas;
create policy assinaturas_insert_admin
on public.assinaturas
for insert
to authenticated
with check (
  (select public.fn_usuario_admin())
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists assinaturas_update_admin on public.assinaturas;
create policy assinaturas_update_admin
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

drop policy if exists clientes_preferencias_select on public.clientes_preferencias;
create policy clientes_preferencias_select
on public.clientes_preferencias
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_preferencias_insert on public.clientes_preferencias;
create policy clientes_preferencias_insert
on public.clientes_preferencias
for insert
to authenticated
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_preferencias_update on public.clientes_preferencias;
create policy clientes_preferencias_update
on public.clientes_preferencias
for update
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)))
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_autorizacoes_select on public.clientes_autorizacoes;
create policy clientes_autorizacoes_select
on public.clientes_autorizacoes
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_autorizacoes_insert on public.clientes_autorizacoes;
create policy clientes_autorizacoes_insert
on public.clientes_autorizacoes
for insert
to authenticated
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_autorizacoes_update on public.clientes_autorizacoes;
create policy clientes_autorizacoes_update
on public.clientes_autorizacoes
for update
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)))
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_autorizacoes_delete on public.clientes_autorizacoes;
create policy clientes_autorizacoes_delete
on public.clientes_autorizacoes
for delete
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_auth_select on public.clientes_auth;
create policy clientes_auth_select
on public.clientes_auth
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_auth_insert on public.clientes_auth;
create policy clientes_auth_insert
on public.clientes_auth
for insert
to authenticated
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_auth_update on public.clientes_auth;
create policy clientes_auth_update
on public.clientes_auth
for update
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)))
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_auth_delete on public.clientes_auth;
create policy clientes_auth_delete
on public.clientes_auth
for delete
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_historico_select on public.clientes_historico;
create policy clientes_historico_select
on public.clientes_historico
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_historico_insert on public.clientes_historico;
create policy clientes_historico_insert
on public.clientes_historico
for insert
to authenticated
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_historico_update on public.clientes_historico;
create policy clientes_historico_update
on public.clientes_historico
for update
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)))
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists clientes_historico_delete on public.clientes_historico;
create policy clientes_historico_delete
on public.clientes_historico
for delete
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists produtos_movimentacoes_select on public.produtos_movimentacoes;
create policy produtos_movimentacoes_select
on public.produtos_movimentacoes
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists produtos_movimentacoes_insert on public.produtos_movimentacoes;
create policy produtos_movimentacoes_insert
on public.produtos_movimentacoes
for insert
to authenticated
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists produtos_movimentacoes_update on public.produtos_movimentacoes;
create policy produtos_movimentacoes_update
on public.produtos_movimentacoes
for update
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)))
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists produtos_movimentacoes_delete on public.produtos_movimentacoes;
create policy produtos_movimentacoes_delete
on public.produtos_movimentacoes
for delete
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists produtos_alertas_select on public.produtos_alertas;
create policy produtos_alertas_select
on public.produtos_alertas
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists produtos_alertas_insert on public.produtos_alertas;
create policy produtos_alertas_insert
on public.produtos_alertas
for insert
to authenticated
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists produtos_alertas_update on public.produtos_alertas;
create policy produtos_alertas_update
on public.produtos_alertas
for update
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)))
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists produtos_alertas_delete on public.produtos_alertas;
create policy produtos_alertas_delete
on public.produtos_alertas
for delete
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists recursos_agenda_select on public.recursos_agenda;
create policy recursos_agenda_select
on public.recursos_agenda
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists recursos_agenda_insert on public.recursos_agenda;
create policy recursos_agenda_insert
on public.recursos_agenda
for insert
to authenticated
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists recursos_agenda_update on public.recursos_agenda;
create policy recursos_agenda_update
on public.recursos_agenda
for update
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)))
with check ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists recursos_agenda_delete on public.recursos_agenda;
create policy recursos_agenda_delete
on public.recursos_agenda
for delete
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists profissionais_acessos_select on public.profissionais_acessos;
create policy profissionais_acessos_select
on public.profissionais_acessos
for select
to authenticated
using ((select public.profissional_usuario_mesmo_salao(id_profissional)));

drop policy if exists profissionais_acessos_insert on public.profissionais_acessos;
create policy profissionais_acessos_insert
on public.profissionais_acessos
for insert
to authenticated
with check ((select public.profissional_usuario_admin_mesmo_salao(id_profissional)));

drop policy if exists profissionais_acessos_update on public.profissionais_acessos;
create policy profissionais_acessos_update
on public.profissionais_acessos
for update
to authenticated
using ((select public.profissional_usuario_admin_mesmo_salao(id_profissional)))
with check ((select public.profissional_usuario_admin_mesmo_salao(id_profissional)));

drop policy if exists profissionais_acessos_delete on public.profissionais_acessos;
create policy profissionais_acessos_delete
on public.profissionais_acessos
for delete
to authenticated
using ((select public.profissional_usuario_admin_mesmo_salao(id_profissional)));

commit;
