alter table public.whatsapp_creditos_recargas
  add column if not exists expira_em timestamptz;

update public.whatsapp_creditos_recargas
set expira_em = coalesce(criado_em, timezone('utc', now())) + interval '24 hours'
where expira_em is null;

alter table public.whatsapp_creditos_recargas
  alter column expira_em set default (timezone('utc', now()) + interval '24 hours');

update public.whatsapp_creditos_recargas
set status = 'expirado',
    atualizado_em = timezone('utc', now())
where status = 'pendente'
  and coalesce(expira_em, criado_em + interval '24 hours') <= timezone('utc', now());

create index if not exists whatsapp_creditos_recargas_pendentes_expira_idx
  on public.whatsapp_creditos_recargas (expira_em)
  where status = 'pendente';

comment on column public.whatsapp_creditos_recargas.expira_em is
  'Validade logica do PIX de recarga no SalaoPremium: 24 horas apos a criacao.';
