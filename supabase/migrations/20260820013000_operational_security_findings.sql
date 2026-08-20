create table if not exists public.operational_security_findings (
  finding_key text primary key,
  source text not null,
  source_rule text,
  title text not null,
  severity text not null default 'info',
  classification text not null default 'precisa_revisao',
  entity_type text,
  entity_name text,
  detail text,
  remediation_url text,
  operational_impact boolean not null default false,
  reviewed boolean not null default false,
  review_note text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_security_findings_classification_idx
  on public.operational_security_findings (classification, severity, last_seen_at desc);
create index if not exists operational_security_findings_open_idx
  on public.operational_security_findings (resolved_at, reviewed, last_seen_at desc);

alter table public.operational_security_findings enable row level security;
revoke all on table public.operational_security_findings from anon, authenticated;
grant select, insert, update, delete on table public.operational_security_findings to service_role;

comment on table public.operational_security_findings is
  'Findings operacionais/de segurança de fontes como postura SQL e Supabase Advisors. INFO/WARN não são outage automaticamente.';

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
  with rls_without_policy as (
    select
      'db:rls-no-policy:' || c.relname as finding_key,
      'rls_enabled_no_policy'::text as source_rule,
      'RLS habilitado sem policy'::text as title,
      'info'::text as severity,
      'precisa_revisao'::text as classification,
      'table'::text as entity_type,
      c.relname::text as entity_name,
      'Tabela em schema public com RLS habilitado e sem policy. Pode ser server-only intencional; revisar grants e uso antes de alterar.'::text as detail,
      false as operational_impact
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = true
      and not exists (
        select 1
        from pg_policy p
        where p.polrelid = c.oid
      )
  ), privileged_callable as (
    select
      'db:security-definer-callable:' || p.oid::regprocedure::text as finding_key,
      'security_definer_callable'::text as source_rule,
      'SECURITY DEFINER executável por role pública da aplicação'::text as title,
      'warn'::text as severity,
      'risco_seguranca'::text as classification,
      'function'::text as entity_type,
      p.oid::regprocedure::text as entity_name,
      'Função SECURITY DEFINER pode ser executada por anon/authenticated. Revisar autenticação interna, grants e search_path; não remover privilégio automaticamente sem validar o fluxo.'::text as detail,
      false as operational_impact
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  )
  select * from rls_without_policy
  union all
  select * from privileged_callable;
$$;

revoke all on function public.fn_operational_security_posture() from public, anon, authenticated;
grant execute on function public.fn_operational_security_posture() to service_role;
