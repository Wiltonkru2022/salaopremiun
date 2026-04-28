alter table public.servicos_combo_itens enable row level security;

grant select, insert, update, delete on public.servicos_combo_itens to authenticated, service_role;

drop policy if exists "servicos_combo_itens_select_membros" on public.servicos_combo_itens;
drop policy if exists "servicos_combo_itens_insert_membros" on public.servicos_combo_itens;
drop policy if exists "servicos_combo_itens_update_membros" on public.servicos_combo_itens;
drop policy if exists "servicos_combo_itens_delete_membros" on public.servicos_combo_itens;

create policy "servicos_combo_itens_select_membros"
on public.servicos_combo_itens
for select
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));

create policy "servicos_combo_itens_insert_membros"
on public.servicos_combo_itens
for insert
to authenticated
with check (public.usuario_tem_acesso_salao(id_salao));

create policy "servicos_combo_itens_update_membros"
on public.servicos_combo_itens
for update
to authenticated
using (public.usuario_tem_acesso_salao(id_salao))
with check (public.usuario_tem_acesso_salao(id_salao));

create policy "servicos_combo_itens_delete_membros"
on public.servicos_combo_itens
for delete
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));
