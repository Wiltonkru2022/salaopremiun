create or replace view public.admin_master_parceria_metricas_resumo
with (security_invoker = true)
as
select
  id_campanha,
  coalesce(sum(impressoes), 0)::bigint as impressoes,
  coalesce(sum(cliques), 0)::bigint as cliques,
  coalesce(sum(conversoes), 0)::bigint as conversoes,
  coalesce(sum(cupons_utilizados), 0)::bigint as cupons_utilizados,
  min(data) as primeira_data,
  max(data) as ultima_data
from public.parceria_metricas_diarias
group by id_campanha;

revoke all on public.admin_master_parceria_metricas_resumo from public;
revoke all on public.admin_master_parceria_metricas_resumo from anon;
revoke all on public.admin_master_parceria_metricas_resumo from authenticated;
grant select on public.admin_master_parceria_metricas_resumo to service_role;

comment on view public.admin_master_parceria_metricas_resumo is
  'Resumo por campanha para o Admin Master sem transferir milhares de linhas de metricas diarias.';
