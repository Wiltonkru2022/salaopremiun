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
  'Findings operacionais/de segurança importados de fontes como Supabase Advisors. INFO/WARN não são outage automaticamente.';
