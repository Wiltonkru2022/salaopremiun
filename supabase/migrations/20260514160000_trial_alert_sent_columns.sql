alter table public.assinaturas
  add column if not exists email_trial_3d_sent_at timestamptz,
  add column if not exists email_trial_1d_sent_at timestamptz,
  add column if not exists email_trial_today_sent_at timestamptz,
  add column if not exists email_trial_expired_sent_at timestamptz;

create index if not exists assinaturas_trial_alerts_pending_idx
  on public.assinaturas (
    trial_fim_em,
    email_trial_3d_sent_at,
    email_trial_1d_sent_at,
    email_trial_today_sent_at,
    email_trial_expired_sent_at
  )
  where trial_fim_em is not null
    and status in ('teste_gratis', 'trial', 'trialing', 'ativa');
