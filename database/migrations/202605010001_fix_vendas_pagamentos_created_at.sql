create or replace function public.fn_detalhes_venda(p_id_comanda uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda jsonb;
  v_itens jsonb;
  v_pagamentos jsonb;
  v_comissoes jsonb;
begin
  select to_jsonb(c.*)
    into v_comanda
  from public.comandas c
  where c.id = p_id_comanda;

  if v_comanda is null then
    raise exception 'Venda nao encontrada.'
      using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(to_jsonb(ci.*) order by ci.created_at), '[]'::jsonb)
    into v_itens
  from public.comanda_itens ci
  where ci.id_comanda = p_id_comanda
    and coalesce(ci.ativo, true) = true;

  select coalesce(jsonb_agg(to_jsonb(cp.*) order by cp.created_at), '[]'::jsonb)
    into v_pagamentos
  from public.comanda_pagamentos cp
  where cp.id_comanda = p_id_comanda;

  select coalesce(jsonb_agg(to_jsonb(cl.*) order by cl.criado_em), '[]'::jsonb)
    into v_comissoes
  from public.comissoes_lancamentos cl
  where cl.id_comanda = p_id_comanda;

  return jsonb_build_object(
    'comanda', v_comanda,
    'itens', v_itens,
    'pagamentos', v_pagamentos,
    'comissoes', v_comissoes
  );
end;
$$;
