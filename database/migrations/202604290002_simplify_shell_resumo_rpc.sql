begin;

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

  return jsonb_build_object(
    'usuario', jsonb_build_object(
      'id', v_usuario.id,
      'id_salao', v_usuario.id_salao,
      'nivel', v_usuario.nivel,
      'status', v_usuario.status
    ),
    'salao', coalesce(v_salao, '{}'::jsonb),
    'assinatura', coalesce(v_assinatura, '{}'::jsonb),
    'tickets', '[]'::jsonb,
    'onboarding', '{}'::jsonb
  );
end;
$$;

grant execute on function public.fn_shell_resumo_painel() to authenticated;

commit;
