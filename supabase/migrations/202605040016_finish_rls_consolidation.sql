begin;

drop policy if exists comandas_select on public.comandas;
drop policy if exists comandas_insert on public.comandas;
drop policy if exists comandas_update on public.comandas;
drop policy if exists comandas_delete on public.comandas;

drop policy if exists produtos_select on public.produtos;
drop policy if exists produtos_insert on public.produtos;
drop policy if exists produtos_delete on public.produtos;

drop policy if exists profissionais_select on public.profissionais;
drop policy if exists profissionais_insert on public.profissionais;
drop policy if exists profissionais_update on public.profissionais;
drop policy if exists profissionais_delete on public.profissionais;

drop policy if exists tickets_select_mesmo_salao on public.tickets;
drop policy if exists "multi tenant usuarios" on public.usuarios;
drop policy if exists "usuario pode ver o proprio perfil" on public.usuarios;
drop policy if exists usuarios_select_own on public.usuarios;
drop policy if exists "usuario pode atualizar o proprio perfil" on public.usuarios;
drop policy if exists "usuarios update" on public.usuarios;
drop policy if exists "usuarios insert" on public.usuarios;
drop policy if exists "usuarios insert same salao" on public.usuarios;

drop policy if exists usuarios_select_mesmo_salao on public.usuarios;
create policy usuarios_select_mesmo_salao
on public.usuarios
for select
to authenticated
using (
  (auth_user_id = (select auth.uid()))
  or (id = (select auth.uid()))
  or (email = (select auth.email()))
  or (
    (select public.fn_usuario_ativo())
    and id_salao = (select public.fn_id_salao_atual())
  )
);

drop policy if exists usuarios_update_so_admin on public.usuarios;
create policy usuarios_update_so_admin
on public.usuarios
for update
to authenticated
using (
  (auth_user_id = (select auth.uid()))
  or (id = (select auth.uid()))
  or (
    (select public.fn_usuario_admin())
    and id_salao = (select public.fn_id_salao_atual())
  )
)
with check (
  (auth_user_id = (select auth.uid()))
  or (id = (select auth.uid()))
  or (
    (select public.fn_usuario_admin())
    and id_salao = (select public.fn_id_salao_atual())
  )
);

create policy usuarios_insert_mesmo_salao
on public.usuarios
for insert
to authenticated
with check (
  ((select auth.uid()) = auth_user_id)
  or (
    (select public.fn_usuario_admin())
    and id_salao = (select public.fn_id_salao_atual())
  )
);

drop policy if exists "tickets_select_suporte_membros" on public.tickets;
create policy "tickets_select_suporte_membros"
on public.tickets
for select
to authenticated
using (
  (select public.usuario_pode_ver_suporte(id_salao))
  or (
    (select public.fn_usuario_ativo())
    and id_salao = (select public.fn_id_salao_atual())
  )
);

commit;
