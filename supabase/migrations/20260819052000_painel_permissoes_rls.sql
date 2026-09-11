-- Endurece as mutacoes do painel para respeitar permissoes por acao.
-- App Cliente e App Profissional continuam usando rotas/RPCs server-side com SECURITY DEFINER.

create or replace function public.fn_usuario_tem_permissao(p_permissao text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_nivel text;
  v_override boolean;
  v_default boolean := false;
begin
  select
    lower(coalesce(u.nivel, '')),
    case
      when up.id is null then null
      when to_jsonb(up) ? p_permissao then (to_jsonb(up) ->> p_permissao)::boolean
      else null
    end
  into v_nivel, v_override
  from public.usuarios u
  left join public.usuarios_permissoes up
    on up.id_usuario = u.id
   and up.id_salao = u.id_salao
  where u.auth_user_id = (select auth.uid())
    and lower(coalesce(u.status, '')) = 'ativo'
  limit 1;

  if v_nivel is null then
    return false;
  end if;

  v_default := case p_permissao
    when 'agenda_criar' then v_nivel in ('admin', 'gerente', 'profissional', 'recepcao')
    when 'agenda_editar' then v_nivel in ('admin', 'gerente', 'profissional', 'recepcao')
    when 'agenda_excluir' then v_nivel in ('admin', 'gerente')
    when 'clientes_criar' then v_nivel in ('admin', 'gerente', 'recepcao')
    when 'clientes_editar' then v_nivel in ('admin', 'gerente', 'recepcao')
    when 'clientes_excluir' then v_nivel in ('admin', 'gerente')
    when 'profissionais_criar' then v_nivel in ('admin', 'gerente')
    when 'profissionais_editar' then v_nivel in ('admin', 'gerente')
    when 'profissionais_excluir' then v_nivel = 'admin'
    when 'servicos_criar' then v_nivel in ('admin', 'gerente')
    when 'servicos_editar' then v_nivel in ('admin', 'gerente')
    when 'servicos_excluir' then v_nivel in ('admin', 'gerente')
    when 'produtos_criar' then v_nivel in ('admin', 'gerente')
    when 'produtos_editar' then v_nivel in ('admin', 'gerente')
    when 'produtos_excluir' then v_nivel in ('admin', 'gerente')
    when 'configuracoes_editar' then v_nivel = 'admin'
    else false
  end;

  return coalesce(v_override, v_default);
end;
$$;

grant execute on function public.fn_usuario_tem_permissao(text) to authenticated;

-- Agenda
drop policy if exists agendamentos_insert_mesmo_salao on public.agendamentos;
create policy agendamentos_insert_mesmo_salao
on public.agendamentos for insert to authenticated
with check (
  public.fn_usuario_tem_permissao('agenda_criar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agendamentos_update_mesmo_salao on public.agendamentos;
create policy agendamentos_update_mesmo_salao
on public.agendamentos for update to authenticated
using (
  public.fn_usuario_tem_permissao('agenda_editar')
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  public.fn_usuario_tem_permissao('agenda_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agendamentos_delete_so_admin on public.agendamentos;
create policy agendamentos_delete_so_admin
on public.agendamentos for delete to authenticated
using (
  public.fn_usuario_tem_permissao('agenda_excluir')
  and id_salao = (select public.fn_id_salao_atual())
);

-- Clientes
drop policy if exists clientes_insert_mesmo_salao on public.clientes;
create policy clientes_insert_mesmo_salao
on public.clientes for insert to authenticated
with check (
  public.fn_usuario_tem_permissao('clientes_criar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists clientes_update_mesmo_salao on public.clientes;
create policy clientes_update_mesmo_salao
on public.clientes for update to authenticated
using (
  public.fn_usuario_tem_permissao('clientes_editar')
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  public.fn_usuario_tem_permissao('clientes_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists clientes_delete_so_admin on public.clientes;
create policy clientes_delete_so_admin
on public.clientes for delete to authenticated
using (
  public.fn_usuario_tem_permissao('clientes_excluir')
  and id_salao = (select public.fn_id_salao_atual())
);

-- Profissionais
drop policy if exists profissionais_insert_so_admin on public.profissionais;
create policy profissionais_insert_so_admin
on public.profissionais for insert to authenticated
with check (
  public.fn_usuario_tem_permissao('profissionais_criar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists profissionais_update_so_admin on public.profissionais;
create policy profissionais_update_so_admin
on public.profissionais for update to authenticated
using (
  public.fn_usuario_tem_permissao('profissionais_editar')
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  public.fn_usuario_tem_permissao('profissionais_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists profissionais_delete_so_admin on public.profissionais;
create policy profissionais_delete_so_admin
on public.profissionais for delete to authenticated
using (
  public.fn_usuario_tem_permissao('profissionais_excluir')
  and id_salao = (select public.fn_id_salao_atual())
);

-- Servicos
drop policy if exists servicos_insert on public.servicos;
create policy servicos_insert
on public.servicos for insert to authenticated
with check (
  public.fn_usuario_tem_permissao('servicos_criar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists servicos_update on public.servicos;
create policy servicos_update
on public.servicos for update to authenticated
using (
  public.fn_usuario_tem_permissao('servicos_editar')
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  public.fn_usuario_tem_permissao('servicos_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists servicos_delete on public.servicos;
create policy servicos_delete
on public.servicos for delete to authenticated
using (
  public.fn_usuario_tem_permissao('servicos_excluir')
  and id_salao = (select public.fn_id_salao_atual())
);

-- Produtos
drop policy if exists produtos_insert_so_admin on public.produtos;
create policy produtos_insert_so_admin
on public.produtos for insert to authenticated
with check (
  public.fn_usuario_tem_permissao('produtos_criar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists produtos_update_so_admin on public.produtos;
create policy produtos_update_so_admin
on public.produtos for update to authenticated
using (
  public.fn_usuario_tem_permissao('produtos_editar')
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  public.fn_usuario_tem_permissao('produtos_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists produtos_delete_so_admin on public.produtos;
create policy produtos_delete_so_admin
on public.produtos for delete to authenticated
using (
  public.fn_usuario_tem_permissao('produtos_excluir')
  and id_salao = (select public.fn_id_salao_atual())
);

-- Configuracoes do salao
drop policy if exists configuracoes_salao_insert on public.configuracoes_salao;
create policy configuracoes_salao_insert
on public.configuracoes_salao for insert to authenticated
with check (
  public.fn_usuario_tem_permissao('configuracoes_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists configuracoes_salao_update_so_admin on public.configuracoes_salao;
create policy configuracoes_salao_update_so_admin
on public.configuracoes_salao for update to authenticated
using (
  public.fn_usuario_tem_permissao('configuracoes_editar')
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  public.fn_usuario_tem_permissao('configuracoes_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists configuracoes_salao_delete on public.configuracoes_salao;
create policy configuracoes_salao_delete
on public.configuracoes_salao for delete to authenticated
using (
  public.fn_usuario_tem_permissao('configuracoes_editar')
  and id_salao = (select public.fn_id_salao_atual())
);
