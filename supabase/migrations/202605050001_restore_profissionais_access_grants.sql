begin;

grant execute on function public.profissional_usuario_mesmo_salao(uuid) to authenticated;
grant execute on function public.profissional_usuario_admin_mesmo_salao(uuid) to authenticated;

commit;
