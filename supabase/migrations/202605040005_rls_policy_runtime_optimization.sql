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
    where u.auth_user_id::text = (select auth.uid())::text
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
    where u.auth_user_id::text = (select auth.uid())::text
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
      and lower(coalesce(u.nivel, '')) in ('admin', 'gerente')
  );
$$;

create or replace function public.usuario_pode_ver_suporte(p_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.usuarios u
     where u.auth_user_id::text = (select auth.uid())::text
       and u.id_salao = p_id_salao
       and lower(coalesce(u.status, '')) = 'ativo'
       and lower(coalesce(u.nivel, '')) in ('admin', 'gerente', 'profissional', 'recepcao')
  );
$$;

create index if not exists tickets_id_salao_idx
  on public.tickets (id_salao);

create index if not exists ticket_mensagens_id_ticket_idx
  on public.ticket_mensagens (id_ticket);

create index if not exists ticket_eventos_id_ticket_idx
  on public.ticket_eventos (id_ticket);

create index if not exists caixa_movimentacoes_id_salao_idx
  on public.caixa_movimentacoes (id_salao);

create index if not exists caixa_movimentacoes_id_sessao_idx
  on public.caixa_movimentacoes (id_sessao);

create index if not exists caixa_sessoes_id_salao_idx
  on public.caixa_sessoes (id_salao);

create index if not exists profissionais_vales_id_salao_idx
  on public.profissionais_vales (id_salao);

drop policy if exists "caixa_sessoes_select_membros" on public.caixa_sessoes;
create policy "caixa_sessoes_select_membros"
on public.caixa_sessoes
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists "caixa_sessoes_insert_operadores" on public.caixa_sessoes;
create policy "caixa_sessoes_insert_operadores"
on public.caixa_sessoes
for insert
to authenticated
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "caixa_sessoes_update_operadores" on public.caixa_sessoes;
create policy "caixa_sessoes_update_operadores"
on public.caixa_sessoes
for update
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)))
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "caixa_sessoes_delete_operadores" on public.caixa_sessoes;
create policy "caixa_sessoes_delete_operadores"
on public.caixa_sessoes
for delete
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "caixa_movimentacoes_select_membros" on public.caixa_movimentacoes;
create policy "caixa_movimentacoes_select_membros"
on public.caixa_movimentacoes
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists "caixa_movimentacoes_insert_operadores" on public.caixa_movimentacoes;
create policy "caixa_movimentacoes_insert_operadores"
on public.caixa_movimentacoes
for insert
to authenticated
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "caixa_movimentacoes_update_operadores" on public.caixa_movimentacoes;
create policy "caixa_movimentacoes_update_operadores"
on public.caixa_movimentacoes
for update
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)))
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "caixa_movimentacoes_delete_operadores" on public.caixa_movimentacoes;
create policy "caixa_movimentacoes_delete_operadores"
on public.caixa_movimentacoes
for delete
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "profissionais_vales_select_membros" on public.profissionais_vales;
create policy "profissionais_vales_select_membros"
on public.profissionais_vales
for select
to authenticated
using ((select public.usuario_tem_acesso_salao(id_salao)));

drop policy if exists "profissionais_vales_insert_operadores" on public.profissionais_vales;
create policy "profissionais_vales_insert_operadores"
on public.profissionais_vales
for insert
to authenticated
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "profissionais_vales_update_operadores" on public.profissionais_vales;
create policy "profissionais_vales_update_operadores"
on public.profissionais_vales
for update
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)))
with check ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "profissionais_vales_delete_operadores" on public.profissionais_vales;
create policy "profissionais_vales_delete_operadores"
on public.profissionais_vales
for delete
to authenticated
using ((select public.usuario_pode_operar_caixa(id_salao)));

drop policy if exists "tickets_select_suporte_membros" on public.tickets;
create policy "tickets_select_suporte_membros"
  on public.tickets
  for select
  to authenticated
  using ((select public.usuario_pode_ver_suporte(id_salao)));

drop policy if exists "ticket_mensagens_select_suporte_membros" on public.ticket_mensagens;
create policy "ticket_mensagens_select_suporte_membros"
  on public.ticket_mensagens
  for select
  to authenticated
  using ((select public.ticket_usuario_tem_acesso(id_ticket)));

drop policy if exists "ticket_eventos_select_suporte_membros" on public.ticket_eventos;
create policy "ticket_eventos_select_suporte_membros"
  on public.ticket_eventos
  for select
  to authenticated
  using ((select public.ticket_usuario_tem_acesso(id_ticket)));
