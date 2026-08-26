begin;

grant execute on function public.fn_usuario_pertence_ao_salao(uuid) to authenticated;
grant execute on function public.usuario_tem_acesso_salao(uuid) to authenticated;
grant execute on function public.usuario_pode_operar_caixa(uuid) to authenticated;
grant execute on function public.usuario_pode_ver_suporte(uuid) to authenticated;
grant execute on function public.ticket_usuario_tem_acesso(uuid) to authenticated;

commit;
