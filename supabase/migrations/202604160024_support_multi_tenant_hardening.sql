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
     where u.auth_user_id::text = auth.uid()::text
       and u.id_salao = p_id_salao
       and lower(coalesce(u.status, '')) = 'ativo'
       and lower(coalesce(u.nivel, '')) in ('admin', 'gerente', 'profissional', 'recepcao')
  );
$$;

create or replace function public.ticket_usuario_tem_acesso(p_id_ticket uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.tickets t
     where t.id = p_id_ticket
       and public.usuario_pode_ver_suporte(t.id_salao)
  );
$$;

revoke all on function public.usuario_pode_ver_suporte(uuid)
  from public, anon;
revoke all on function public.ticket_usuario_tem_acesso(uuid)
  from public, anon;

grant execute on function public.usuario_pode_ver_suporte(uuid)
  to authenticated, service_role;
grant execute on function public.ticket_usuario_tem_acesso(uuid)
  to authenticated, service_role;

alter table public.tickets enable row level security;
alter table public.ticket_mensagens enable row level security;
alter table public.ticket_eventos enable row level security;

drop policy if exists "tickets_select_suporte_membros" on public.tickets;
drop policy if exists "ticket_mensagens_select_suporte_membros" on public.ticket_mensagens;
drop policy if exists "ticket_eventos_select_suporte_membros" on public.ticket_eventos;

create policy "tickets_select_suporte_membros"
  on public.tickets
  for select
  to authenticated
  using (public.usuario_pode_ver_suporte(id_salao));

create policy "ticket_mensagens_select_suporte_membros"
  on public.ticket_mensagens
  for select
  to authenticated
  using (public.ticket_usuario_tem_acesso(id_ticket));

create policy "ticket_eventos_select_suporte_membros"
  on public.ticket_eventos
  for select
  to authenticated
  using (public.ticket_usuario_tem_acesso(id_ticket));

grant select on public.tickets to authenticated;
grant select on public.ticket_mensagens to authenticated;
grant select on public.ticket_eventos to authenticated;

create index if not exists logs_sistema_modulo_criado_idx
  on public.logs_sistema (modulo, criado_em desc);

create index if not exists logs_sistema_salao_criado_idx
  on public.logs_sistema (id_salao, criado_em desc);
