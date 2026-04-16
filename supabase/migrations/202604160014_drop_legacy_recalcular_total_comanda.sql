-- Remove a assinatura antiga com 1 parametro. Ela conflita com a versao nova,
-- que aceita desconto/acrescimo opcionais por parametros default.
drop function if exists public.fn_recalcular_total_comanda(uuid);

revoke all on function public.fn_recalcular_total_comanda(uuid, numeric, numeric)
  from public, anon, authenticated;

grant execute on function public.fn_recalcular_total_comanda(uuid, numeric, numeric)
  to service_role;
