alter table public.servicos_categorias enable row level security;

grant select, insert, update, delete on public.servicos_categorias to authenticated, service_role;

drop policy if exists "servicos_categorias_select_membros" on public.servicos_categorias;
drop policy if exists "servicos_categorias_insert_membros" on public.servicos_categorias;
drop policy if exists "servicos_categorias_update_membros" on public.servicos_categorias;
drop policy if exists "servicos_categorias_delete_membros" on public.servicos_categorias;

create policy "servicos_categorias_select_membros"
on public.servicos_categorias
for select
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));

create policy "servicos_categorias_insert_membros"
on public.servicos_categorias
for insert
to authenticated
with check (public.usuario_tem_acesso_salao(id_salao));

create policy "servicos_categorias_update_membros"
on public.servicos_categorias
for update
to authenticated
using (public.usuario_tem_acesso_salao(id_salao))
with check (public.usuario_tem_acesso_salao(id_salao));

create policy "servicos_categorias_delete_membros"
on public.servicos_categorias
for delete
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));
