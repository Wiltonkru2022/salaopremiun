create table if not exists public.operational_security_reviews (
  entity_type text not null,
  entity_name text not null,
  definition_hash text not null,
  classification text not null default 'configuracao_intencional',
  review_note text not null,
  reviewed_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (entity_type, entity_name)
);
alter table public.operational_security_reviews enable row level security;
revoke all on table public.operational_security_reviews from anon, authenticated;
grant select, insert, update, delete on table public.operational_security_reviews to service_role;

-- Tabela em public com RLS ligado e zero policies é deny-all para roles da aplicação.
-- Removemos grants legados para tornar o contrato server-only explícito.
do $$
declare r record;
begin
  for r in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = true
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      r.nspname,
      r.relname
    );
  end loop;
end $$;

-- Não expor a linha inteira de usuarios (inclui coluna senha legada) como RPC authenticated.
revoke execute on function public.fn_usuario_atual() from public, anon, authenticated;
grant execute on function public.fn_usuario_atual() to service_role;

-- Helpers SECURITY DEFINER revisados: somente authenticated/service_role, nunca anon/PUBLIC.
do $$
declare sig text;
begin
  foreach sig in array array[
    'fn_id_salao_atual()',
    'fn_usuario_admin()',
    'fn_usuario_ativo()',
    'fn_usuario_mesmo_salao(uuid)',
    'fn_usuario_nivel()',
    'fn_usuario_pertence_ao_salao(uuid)',
    'fn_usuario_tem_permissao(text)',
    'profissional_usuario_admin_mesmo_salao(uuid)',
    'profissional_usuario_mesmo_salao(uuid)',
    'ticket_usuario_tem_acesso(uuid)',
    'usuario_pode_operar_caixa(uuid)',
    'usuario_pode_ver_suporte(uuid)',
    'usuario_tem_acesso_salao(uuid)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', sig);
    execute format('grant execute on function public.%s to authenticated, service_role', sig);
  end loop;
end $$;

-- A revisão é vinculada ao hash da definição. Se a função mudar, o scanner volta a alertar.
insert into public.operational_security_reviews(
  entity_type,
  entity_name,
  definition_hash,
  classification,
  review_note,
  reviewed_at,
  active
)
select
  'function',
  p.oid::regprocedure::text,
  md5(pg_get_functiondef(p.oid)),
  'configuracao_intencional',
  'Helper de autorização/RLS revisado: SECURITY DEFINER com search_path fixo, sem EXECUTE para anon/PUBLIC e escopo baseado em auth.uid()/helper autenticado.',
  now(),
  true
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.oid::regprocedure::text = any(array[
    'fn_id_salao_atual()',
    'fn_usuario_admin()',
    'fn_usuario_ativo()',
    'fn_usuario_mesmo_salao(uuid)',
    'fn_usuario_nivel()',
    'fn_usuario_pertence_ao_salao(uuid)',
    'fn_usuario_tem_permissao(text)',
    'profissional_usuario_admin_mesmo_salao(uuid)',
    'profissional_usuario_mesmo_salao(uuid)',
    'ticket_usuario_tem_acesso(uuid)',
    'usuario_pode_operar_caixa(uuid)',
    'usuario_pode_ver_suporte(uuid)',
    'usuario_tem_acesso_salao(uuid)'
  ])
on conflict (entity_type, entity_name) do update set
  definition_hash = excluded.definition_hash,
  classification = excluded.classification,
  review_note = excluded.review_note,
  reviewed_at = excluded.reviewed_at,
  active = true;

create or replace function public.fn_operational_security_posture()
returns table(
  finding_key text,
  source_rule text,
  title text,
  severity text,
  classification text,
  entity_type text,
  entity_name text,
  detail text,
  operational_impact boolean
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  with rls_ambiguous as (
    select
      'db:rls-no-policy-grant:' || c.relname as finding_key,
      'rls_enabled_no_policy_with_app_grant'::text as source_rule,
      'RLS sem policy com grant para role da aplicação'::text as title,
      'info'::text as severity,
      'precisa_revisao'::text as classification,
      'table'::text as entity_type,
      c.relname::text as entity_name,
      'Tabela deny-all por RLS ainda possui grant para anon/authenticated. Revogar o grant se for server-only ou criar policy mínima se o cliente realmente precisar acessar.'::text as detail,
      false as operational_impact
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = true
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
      and (
        has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
        or has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
      )
  ), security_definer_unreviewed as (
    select
      'db:security-definer-callable:' || p.oid::regprocedure::text as finding_key,
      'security_definer_callable'::text as source_rule,
      'SECURITY DEFINER executável por role da aplicação sem revisão válida'::text as title,
      'warn'::text as severity,
      'risco_seguranca'::text as classification,
      'function'::text as entity_type,
      p.oid::regprocedure::text as entity_name,
      case
        when has_function_privilege('anon', p.oid, 'EXECUTE') then
          'Função SECURITY DEFINER executável por anon. Remover EXECUTE público/anon e revisar autenticação interna.'
        else
          'Função SECURITY DEFINER executável por authenticated não possui revisão vigente para a definição atual. Revisar escopo, auth.uid(), grants e search_path.'
      end::text as detail,
      false as operational_impact
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join public.operational_security_reviews r
      on r.entity_type = 'function'
     and r.entity_name = p.oid::regprocedure::text
     and r.definition_hash = md5(pg_get_functiondef(p.oid))
     and r.active = true
    where n.nspname = 'public'
      and p.prosecdef = true
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or r.entity_name is null
      )
  )
  select * from rls_ambiguous
  union all
  select * from security_definer_unreviewed;
$$;

revoke all on function public.fn_operational_security_posture() from public, anon, authenticated;
grant execute on function public.fn_operational_security_posture() to service_role;

-- Limpeza das subscriptions comprovadamente inválidas.
update public.push_subscriptions
set ativo = false,
    updated_at = now()
where ativo = true
  and (
    last_error_code in (404, 410)
    or (
      last_error_code = 400
      and failure_count >= 2
      and endpoint like 'https://web.push.apple.com/%'
    )
  );

-- O Database passa a ser aferido dentro do próprio PostgreSQL, sem depender do Data API.
update public.operational_components
set intervalo_esperado_segundos = 60,
    freshness_ttl_segundos = 180,
    updated_at = now()
where component_key = 'supabase.database';

do $$
declare jid bigint;
begin
  for jid in
    select jobid from cron.job where jobname = 'salaopremium-db-heartbeat-1m'
  loop
    perform cron.unschedule(jid);
  end loop;

  perform cron.schedule(
    'salaopremium-db-heartbeat-1m',
    '* * * * *',
    $cron$
      select * from public.fn_operational_record_probe(
        p_component_key => 'supabase.database',
        p_probe_key => 'probe:supabase:database',
        p_name => 'Supabase Database',
        p_status => 'ok',
        p_score => 100,
        p_latency_ms => 0,
        p_motivo => 'Heartbeat interno do PostgreSQL executado pelo pg_cron.',
        p_evidence => '{"source":"pg_cron","internal":true}'::jsonb,
        p_intervalo_esperado_segundos => 60,
        p_freshness_ttl_segundos => 180,
        p_sucessos_para_recuperar => 1,
        p_falhas_para_degradar => 2,
        p_probe_version => 'db-heartbeat-v1'
      );
    $cron$
  );
end $$;

select * from public.fn_operational_record_probe(
  p_component_key => 'supabase.database',
  p_probe_key => 'probe:supabase:database',
  p_name => 'Supabase Database',
  p_status => 'ok',
  p_score => 100,
  p_latency_ms => 0,
  p_motivo => 'Heartbeat interno do PostgreSQL executado pelo pg_cron.',
  p_evidence => '{"source":"pg_cron","internal":true}'::jsonb,
  p_intervalo_esperado_segundos => 60,
  p_freshness_ttl_segundos => 180,
  p_sucessos_para_recuperar => 1,
  p_falhas_para_degradar => 2,
  p_probe_version => 'db-heartbeat-v1'
);
