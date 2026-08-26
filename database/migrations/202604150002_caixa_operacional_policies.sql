create or replace function public.usuario_tem_acesso_salao(p_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id::text = auth.uid()::text
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
  );
$$;

create or replace function public.usuario_pode_operar_caixa(p_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id::text = auth.uid()::text
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
      and lower(coalesce(u.nivel, '')) in ('admin', 'gerente')
  );
$$;

grant execute on function public.usuario_tem_acesso_salao(uuid) to authenticated;
grant execute on function public.usuario_pode_operar_caixa(uuid) to authenticated;

alter table public.caixa_sessoes enable row level security;
alter table public.caixa_movimentacoes enable row level security;
alter table public.profissionais_vales enable row level security;

grant select, insert, update, delete on public.caixa_sessoes to authenticated;
grant select, insert, update, delete on public.caixa_movimentacoes to authenticated;
grant select, insert, update, delete on public.profissionais_vales to authenticated;

drop policy if exists "caixa_sessoes_select_membros" on public.caixa_sessoes;
drop policy if exists "caixa_sessoes_insert_operadores" on public.caixa_sessoes;
drop policy if exists "caixa_sessoes_update_operadores" on public.caixa_sessoes;
drop policy if exists "caixa_sessoes_delete_operadores" on public.caixa_sessoes;

create policy "caixa_sessoes_select_membros"
on public.caixa_sessoes
for select
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));

create policy "caixa_sessoes_insert_operadores"
on public.caixa_sessoes
for insert
to authenticated
with check (public.usuario_pode_operar_caixa(id_salao));

create policy "caixa_sessoes_update_operadores"
on public.caixa_sessoes
for update
to authenticated
using (public.usuario_pode_operar_caixa(id_salao))
with check (public.usuario_pode_operar_caixa(id_salao));

create policy "caixa_sessoes_delete_operadores"
on public.caixa_sessoes
for delete
to authenticated
using (public.usuario_pode_operar_caixa(id_salao));

drop policy if exists "caixa_movimentacoes_select_membros" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_insert_operadores" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_update_operadores" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_delete_operadores" on public.caixa_movimentacoes;

create policy "caixa_movimentacoes_select_membros"
on public.caixa_movimentacoes
for select
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));

create policy "caixa_movimentacoes_insert_operadores"
on public.caixa_movimentacoes
for insert
to authenticated
with check (public.usuario_pode_operar_caixa(id_salao));

create policy "caixa_movimentacoes_update_operadores"
on public.caixa_movimentacoes
for update
to authenticated
using (public.usuario_pode_operar_caixa(id_salao))
with check (public.usuario_pode_operar_caixa(id_salao));

create policy "caixa_movimentacoes_delete_operadores"
on public.caixa_movimentacoes
for delete
to authenticated
using (public.usuario_pode_operar_caixa(id_salao));

drop policy if exists "profissionais_vales_select_membros" on public.profissionais_vales;
drop policy if exists "profissionais_vales_insert_operadores" on public.profissionais_vales;
drop policy if exists "profissionais_vales_update_operadores" on public.profissionais_vales;
drop policy if exists "profissionais_vales_delete_operadores" on public.profissionais_vales;

create policy "profissionais_vales_select_membros"
on public.profissionais_vales
for select
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));

create policy "profissionais_vales_insert_operadores"
on public.profissionais_vales
for insert
to authenticated
with check (public.usuario_pode_operar_caixa(id_salao));

create policy "profissionais_vales_update_operadores"
on public.profissionais_vales
for update
to authenticated
using (public.usuario_pode_operar_caixa(id_salao))
with check (public.usuario_pode_operar_caixa(id_salao));

create policy "profissionais_vales_delete_operadores"
on public.profissionais_vales
for delete
to authenticated
using (public.usuario_pode_operar_caixa(id_salao));
