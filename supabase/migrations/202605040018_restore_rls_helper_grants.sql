begin;

grant execute on function public.fn_usuario_atual() to authenticated;
grant execute on function public.fn_id_salao_atual() to authenticated;
grant execute on function public.fn_usuario_ativo() to authenticated;
grant execute on function public.fn_usuario_nivel() to authenticated;
grant execute on function public.fn_usuario_admin() to authenticated;
grant execute on function public.fn_usuario_mesmo_salao(uuid) to authenticated;

commit;
