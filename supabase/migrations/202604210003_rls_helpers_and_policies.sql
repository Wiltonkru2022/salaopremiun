begin;
create or replace function public.fn_auth_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;
create or replace function public.fn_usuario_atual()
returns public.usuarios
language sql
stable
security definer
set search_path = public
as $$
  select u.*
  from public.usuarios u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;
create or replace function public.fn_id_salao_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id_salao
  from public.usuarios u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;
create or replace function public.fn_usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.status = 'ativo'
  );
$$;
create or replace function public.fn_usuario_nivel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.nivel
  from public.usuarios u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;
create or replace function public.fn_usuario_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.status = 'ativo'
      and u.nivel = 'admin'
  );
$$;
create or replace function public.fn_usuario_mesmo_salao(target_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.status = 'ativo'
      and u.id_salao = target_id_salao
  );
$$;
grant execute on function public.fn_auth_user_id() to authenticated;
grant execute on function public.fn_usuario_atual() to authenticated;
grant execute on function public.fn_id_salao_atual() to authenticated;
grant execute on function public.fn_usuario_ativo() to authenticated;
grant execute on function public.fn_usuario_nivel() to authenticated;
grant execute on function public.fn_usuario_admin() to authenticated;
grant execute on function public.fn_usuario_mesmo_salao(uuid) to authenticated;
alter table public.usuarios enable row level security;
drop policy if exists usuarios_select_mesmo_salao on public.usuarios;
create policy usuarios_select_mesmo_salao
on public.usuarios
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists usuarios_update_so_admin on public.usuarios;
create policy usuarios_update_so_admin
on public.usuarios
for update
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
alter table public.saloes enable row level security;
drop policy if exists saloes_select_mesmo_salao on public.saloes;
create policy saloes_select_mesmo_salao
on public.saloes
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id = public.fn_id_salao_atual()
);
drop policy if exists saloes_update_so_admin on public.saloes;
create policy saloes_update_so_admin
on public.saloes
for update
to authenticated
using (
  public.fn_usuario_admin()
  and id = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_admin()
  and id = public.fn_id_salao_atual()
);
alter table public.clientes enable row level security;
drop policy if exists clientes_select_mesmo_salao on public.clientes;
create policy clientes_select_mesmo_salao
on public.clientes
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists clientes_insert_mesmo_salao on public.clientes;
create policy clientes_insert_mesmo_salao
on public.clientes
for insert
to authenticated
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists clientes_update_mesmo_salao on public.clientes;
create policy clientes_update_mesmo_salao
on public.clientes
for update
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists clientes_delete_so_admin on public.clientes;
create policy clientes_delete_so_admin
on public.clientes
for delete
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
alter table public.profissionais enable row level security;
drop policy if exists profissionais_select_mesmo_salao on public.profissionais;
create policy profissionais_select_mesmo_salao
on public.profissionais
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists profissionais_insert_so_admin on public.profissionais;
create policy profissionais_insert_so_admin
on public.profissionais
for insert
to authenticated
with check (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists profissionais_update_so_admin on public.profissionais;
create policy profissionais_update_so_admin
on public.profissionais
for update
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists profissionais_delete_so_admin on public.profissionais;
create policy profissionais_delete_so_admin
on public.profissionais
for delete
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
alter table public.agendamentos enable row level security;
drop policy if exists agendamentos_select_mesmo_salao on public.agendamentos;
create policy agendamentos_select_mesmo_salao
on public.agendamentos
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists agendamentos_insert_mesmo_salao on public.agendamentos;
create policy agendamentos_insert_mesmo_salao
on public.agendamentos
for insert
to authenticated
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists agendamentos_update_mesmo_salao on public.agendamentos;
create policy agendamentos_update_mesmo_salao
on public.agendamentos
for update
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists agendamentos_delete_so_admin on public.agendamentos;
create policy agendamentos_delete_so_admin
on public.agendamentos
for delete
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
alter table public.comandas enable row level security;
drop policy if exists comandas_select_mesmo_salao on public.comandas;
create policy comandas_select_mesmo_salao
on public.comandas
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists comandas_insert_mesmo_salao on public.comandas;
create policy comandas_insert_mesmo_salao
on public.comandas
for insert
to authenticated
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists comandas_update_mesmo_salao on public.comandas;
create policy comandas_update_mesmo_salao
on public.comandas
for update
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists comandas_delete_so_admin on public.comandas;
create policy comandas_delete_so_admin
on public.comandas
for delete
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
alter table public.produtos enable row level security;
drop policy if exists produtos_select_mesmo_salao on public.produtos;
create policy produtos_select_mesmo_salao
on public.produtos
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists produtos_insert_so_admin on public.produtos;
create policy produtos_insert_so_admin
on public.produtos
for insert
to authenticated
with check (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists produtos_update_so_admin on public.produtos;
create policy produtos_update_so_admin
on public.produtos
for update
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists produtos_delete_so_admin on public.produtos;
create policy produtos_delete_so_admin
on public.produtos
for delete
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
alter table public.assinaturas enable row level security;
drop policy if exists assinaturas_select_mesmo_salao on public.assinaturas;
create policy assinaturas_select_mesmo_salao
on public.assinaturas
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists assinaturas_update_so_admin on public.assinaturas;
create policy assinaturas_update_so_admin
on public.assinaturas
for update
to authenticated
using (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_admin()
  and id_salao = public.fn_id_salao_atual()
);
alter table public.tickets enable row level security;
drop policy if exists tickets_select_mesmo_salao on public.tickets;
create policy tickets_select_mesmo_salao
on public.tickets
for select
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists tickets_insert_mesmo_salao on public.tickets;
create policy tickets_insert_mesmo_salao
on public.tickets
for insert
to authenticated
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
drop policy if exists tickets_update_mesmo_salao on public.tickets;
create policy tickets_update_mesmo_salao
on public.tickets
for update
to authenticated
using (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
)
with check (
  public.fn_usuario_ativo()
  and id_salao = public.fn_id_salao_atual()
);
create or replace function public.fn_shell_resumo_painel()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id_salao uuid;
  v_usuario public.usuarios;
  v_salao jsonb;
  v_assinatura jsonb;
  v_tickets jsonb;
  v_onboarding jsonb;
begin
  v_usuario := public.fn_usuario_atual();
  if v_usuario.id is null then
    raise exception 'Usuario nao encontrado';
  end if;
  if v_usuario.status <> 'ativo' then
    raise exception 'Usuario inativo';
  end if;
  v_id_salao := v_usuario.id_salao;
  select to_jsonb(s)
  into v_salao
  from (
    select id, nome, responsavel, logo_url, plano, status
    from public.saloes
    where id = v_id_salao
    limit 1
  ) s;
  select to_jsonb(a)
  into v_assinatura
  from (
    select status, plano, vencimento_em, trial_fim_em
    from public.assinaturas
    where id_salao = v_id_salao
    limit 1
  ) a;
  select coalesce(jsonb_agg(t order by t.ultima_interacao_em desc), '[]'::jsonb)
  into v_tickets
  from (
    select id, numero, assunto, prioridade, status, ultima_interacao_em
    from public.tickets
    where id_salao = v_id_salao
      and status in ('aberto', 'em_atendimento', 'aguardando_cliente', 'aguardando_tecnico')
    order by ultima_interacao_em desc
    limit 10
  ) t;
  select to_jsonb(o)
  into v_onboarding
  from (
    select score_total, dias_com_acesso, modulos_usados, detalhes_json
    from public.score_onboarding_salao
    where id_salao = v_id_salao
    limit 1
  ) o;
  return jsonb_build_object(
    'usuario', jsonb_build_object(
      'id', v_usuario.id,
      'id_salao', v_usuario.id_salao,
      'nivel', v_usuario.nivel,
      'status', v_usuario.status
    ),
    'salao', coalesce(v_salao, '{}'::jsonb),
    'assinatura', coalesce(v_assinatura, '{}'::jsonb),
    'tickets', coalesce(v_tickets, '[]'::jsonb),
    'onboarding', coalesce(v_onboarding, '{}'::jsonb)
  );
end;
$$;
grant execute on function public.fn_shell_resumo_painel() to authenticated;
commit;
