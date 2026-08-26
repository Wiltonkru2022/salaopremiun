-- Hardening direcionado: reduz superficie publica sem alterar fluxos server-side.

-- 1) Funcao apontada pelo advisor: fixa search_path.
alter function public.normalize_salao_public_slug(text) set search_path = public;

-- 2) Trigger functions SECURITY DEFINER nunca devem ser RPCs publicas.
revoke execute on function public.ensure_salao_app_cliente_slug() from public, anon, authenticated;
revoke execute on function public.seed_user_security_status_row() from public, anon, authenticated;
revoke execute on function public.set_user_security_status_updated_at() from public, anon, authenticated;
grant execute on function public.ensure_salao_app_cliente_slug() to service_role;
grant execute on function public.seed_user_security_status_row() to service_role;
grant execute on function public.set_user_security_status_updated_at() to service_role;

-- 3) Helper de permissao nao precisa ser chamavel por anon.
revoke execute on function public.fn_usuario_tem_permissao(text) from public, anon;
grant execute on function public.fn_usuario_tem_permissao(text) to authenticated, service_role;

-- 4) Helpers SECURITY DEFINER usados por RLS: somente usuario autenticado/service role.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'fn_id_salao_atual',
        'fn_usuario_admin',
        'fn_usuario_ativo',
        'fn_usuario_atual',
        'fn_usuario_mesmo_salao',
        'fn_usuario_nivel',
        'fn_usuario_pertence_ao_salao',
        'profissional_usuario_admin_mesmo_salao',
        'profissional_usuario_mesmo_salao',
        'ticket_usuario_tem_acesso',
        'usuario_pode_operar_caixa',
        'usuario_pode_ver_suporte',
        'usuario_tem_acesso_salao'
      )
  loop
    execute format('revoke execute on function %s from public, anon', r.signature);
    execute format('grant execute on function %s to authenticated, service_role', r.signature);
  end loop;
end $$;

-- 5) Todas as RPCs do App Profissional ficam exclusivamente server-side.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'app_profissional_%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end $$;

-- Credito manual tambem e exclusivamente server-side.
revoke execute on function public.fn_cliente_registrar_credito_manual(uuid, uuid, uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.fn_cliente_registrar_credito_manual(uuid, uuid, uuid, numeric, text, text) to service_role;

-- 6) Policies antigas TO PUBLIC que dependem de identidade passam a authenticated.
do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('agenda_bloqueios','agenda_bloqueios_select'),
      ('agenda_bloqueios_logs','agenda_bloqueios_logs_insert'),
      ('auditoria_logs','auditoria select same salao'),
      ('backups_salao','backups select same salao'),
      ('comanda_itens','comanda_itens_delete'),
      ('comanda_itens','comanda_itens_insert'),
      ('comanda_itens','comanda_itens_select'),
      ('comanda_itens','comanda_itens_update'),
      ('comanda_pagamentos','comanda_pagamentos_delete'),
      ('comanda_pagamentos','comanda_pagamentos_insert'),
      ('comanda_pagamentos','comanda_pagamentos_select'),
      ('comanda_pagamentos','comanda_pagamentos_update'),
      ('comandas_logs_exclusao','comandas_logs_exclusao_insert'),
      ('comandas_logs_exclusao','comandas_logs_exclusao_select'),
      ('comandas_logs_reabertura','comandas_logs_reabertura_insert'),
      ('comandas_logs_reabertura','comandas_logs_reabertura_select'),
      ('comissoes_lancamentos','comissoes_lancamentos_delete'),
      ('comissoes_lancamentos','comissoes_lancamentos_insert'),
      ('comissoes_lancamentos','comissoes_lancamentos_select'),
      ('comissoes_lancamentos','comissoes_lancamentos_update'),
      ('itens_extras','itens_extras_delete'),
      ('itens_extras','itens_extras_insert'),
      ('itens_extras','itens_extras_select'),
      ('itens_extras','itens_extras_update'),
      ('servicos','servicos_select')
    ) as v(table_name, policy_name)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename=item.table_name
        and policyname=item.policy_name
    ) then
      execute format('alter policy %I on public.%I to authenticated', item.policy_name, item.table_name);
    end if;
  end loop;
end $$;

-- 7) Remove acesso anon em tabelas internas/sensiveis que sao usadas por servidor/admin.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profissionais_acessos',
    'usuarios_permissoes',
    'usuarios_senhas_reuso',
    'user_security_status',
    'security_login_attempts',
    'saloes_google_calendar_connections',
    'backups_salao',
    'auditoria_logs',
    'notification_jobs',
    'push_delivery_log',
    'asaas_webhook_eventos'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all privileges on table public.%I from anon', t);
    end if;
  end loop;
end $$;
