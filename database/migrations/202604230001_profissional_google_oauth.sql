alter table public.profissionais_acessos
  add column if not exists google_auth_user_id uuid null,
  add column if not exists google_email text null,
  add column if not exists google_conectado_em timestamptz null;

create unique index if not exists idx_profissionais_acessos_google_auth_user_id
  on public.profissionais_acessos (google_auth_user_id)
  where google_auth_user_id is not null;

create index if not exists idx_profissionais_acessos_google_email
  on public.profissionais_acessos (lower(google_email))
  where google_email is not null;
