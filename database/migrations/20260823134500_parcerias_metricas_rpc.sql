create or replace function public.registrar_parceria_metrica(
  p_id_campanha uuid,
  p_local_exibicao text,
  p_tipo text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tipo not in ('impressao','clique','conversao','cupom') then
    raise exception 'tipo de metrica invalido';
  end if;

  insert into public.parceria_metricas_diarias (
    id_campanha, data, local_exibicao, impressoes, cliques, conversoes, cupons_utilizados
  ) values (
    p_id_campanha,
    current_date,
    p_local_exibicao,
    case when p_tipo = 'impressao' then 1 else 0 end,
    case when p_tipo = 'clique' then 1 else 0 end,
    case when p_tipo = 'conversao' then 1 else 0 end,
    case when p_tipo = 'cupom' then 1 else 0 end
  )
  on conflict (id_campanha, data, local_exibicao)
  do update set
    impressoes = public.parceria_metricas_diarias.impressoes + excluded.impressoes,
    cliques = public.parceria_metricas_diarias.cliques + excluded.cliques,
    conversoes = public.parceria_metricas_diarias.conversoes + excluded.conversoes,
    cupons_utilizados = public.parceria_metricas_diarias.cupons_utilizados + excluded.cupons_utilizados,
    atualizado_em = now();
end;
$$;

revoke all on function public.registrar_parceria_metrica(uuid,text,text) from public, anon, authenticated;
grant execute on function public.registrar_parceria_metrica(uuid,text,text) to service_role;
