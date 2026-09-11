create or replace function public.fn_painel_busca_global(
  p_id_salao uuid,
  p_term text,
  p_clientes boolean default true,
  p_servicos boolean default true,
  p_agenda boolean default true,
  p_comandas boolean default true
)
returns table(id text, type text, title text, description text, href text, rank integer)
language sql
stable
security definer
set search_path = public
as $$
with q as (select trim(left(coalesce(p_term,''),80)) term),
clientes_r as (
  select c.id::text id, 'cliente'::text type, coalesce(c.nome,'Cliente sem nome') title,
    'Cadastro do cliente - ' || coalesce(c.whatsapp,c.telefone,c.email,'Sem contato') description,
    '/clientes/'||c.id::text href, 10 rank
  from clientes c,q where p_clientes and c.id_salao=p_id_salao and length(q.term)>=2
    and (c.nome ilike '%'||q.term||'%' or c.whatsapp ilike '%'||q.term||'%' or c.telefone ilike '%'||q.term||'%' or c.email ilike '%'||q.term||'%')
  order by c.nome asc limit 6
),
servicos_r as (
  select s.id::text, 'servico', coalesce(s.nome,'Serviço sem nome'),
    coalesce(s.categoria,'Catálogo') || ' - R$ ' || replace(to_char(coalesce(s.preco_padrao,s.preco,0),'FM999999990D00'),'.',',') || ' - ' || coalesce(s.status,case when s.ativo=false then 'inativo' else 'ativo' end),
    '/servicos/'||s.id::text, 20
  from servicos s,q where p_servicos and s.id_salao=p_id_salao and length(q.term)>=2
    and (s.nome ilike '%'||q.term||'%' or s.categoria ilike '%'||q.term||'%')
  order by s.nome asc limit 6
),
ag_r as (
  select a.id::text, 'agendamento', coalesce(c.nome,'Agendamento'),
    coalesce(s.nome,'Serviço') || ' - ' || to_char(a.data,'DD/MM/YYYY') || ' às ' || left(a.hora_inicio::text,5) || ' - ' || coalesce(a.status,'sem status'),
    '/agenda?cliente='||coalesce(a.cliente_id::text,'')||'&agendamento='||a.id::text, 30
  from agendamentos a
  left join clientes c on c.id=a.cliente_id and c.id_salao=a.id_salao
  left join servicos s on s.id=a.servico_id and s.id_salao=a.id_salao
  cross join q
  where p_agenda and a.id_salao=p_id_salao and length(q.term)>=2
    and concat_ws(' ',c.nome,s.nome,a.status,a.data::text,a.hora_inicio::text) ilike '%'||q.term||'%'
  order by a.data desc,a.hora_inicio desc limit 6
),
com_r as (
  select co.id::text, 'comanda', 'Comanda #'||coalesce(co.numero::text,left(co.id::text,8)),
    coalesce(c.nome,'Cliente não informado') || ' - R$ ' || replace(to_char(coalesce(co.total,0),'FM999999990D00'),'.',',') || ' - ' || coalesce(co.status,'sem status'),
    '/comandas/'||co.id::text, 40
  from comandas co left join clientes c on c.id=co.id_cliente and c.id_salao=co.id_salao cross join q
  where p_comandas and co.id_salao=p_id_salao and length(q.term)>=2
    and concat_ws(' ',co.numero::text,c.nome,co.status,co.total::text,co.aberta_em::text) ilike '%'||q.term||'%'
  order by co.aberta_em desc limit 6
)
select id,type,title,description,href,rank from (
  select * from clientes_r union all select * from servicos_r union all select * from ag_r union all select * from com_r
) x order by rank,title limit 12;
$$;

revoke all on function public.fn_painel_busca_global(uuid,text,boolean,boolean,boolean,boolean) from public, anon, authenticated;
grant execute on function public.fn_painel_busca_global(uuid,text,boolean,boolean,boolean,boolean) to service_role;

alter policy mfa_admin_saloes_update on public.saloes
  using ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
  with check ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');
alter policy mfa_admin_configuracoes_update on public.configuracoes_salao
  using ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
  with check ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');
alter policy mfa_admin_assinaturas_update on public.assinaturas
  using ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
  with check ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');
alter policy mfa_admin_usuarios_update on public.usuarios
  using ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
  with check ((not (select private.fn_usuario_admin())) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');

create index if not exists agendamento_adicionais_id_servico_idx on public.agendamento_adicionais(id_servico);
create index if not exists notification_jobs_id_profissional_idx2 on public.notification_jobs(id_profissional) where id_profissional is not null;
create index if not exists lista_espera_profissional_status_idx on public.lista_espera_agendamentos(id_profissional,status) where id_profissional is not null;
create index if not exists lista_espera_servico_status_idx on public.lista_espera_agendamentos(id_servico,status) where id_servico is not null;
create index if not exists whatsapp_creditos_mov_agendamento_idx on public.whatsapp_creditos_movimentacoes(id_agendamento) where id_agendamento is not null;
create index if not exists whatsapp_envios_credito_mov_idx on public.whatsapp_envios(id_credito_movimentacao) where id_credito_movimentacao is not null;
