alter table if exists public.profissionais
  add column if not exists intervalo_agenda_minutos integer not null default 30,
  add column if not exists sinal_pix_proprio boolean not null default false,
  add column if not exists sinal_pix_recebedor text,
  add column if not exists sinal_whatsapp text,
  add column if not exists sinal_confirmacao_responsavel text not null default 'salao';

alter table if exists public.profissionais
  drop constraint if exists profissionais_intervalo_agenda_minutos_check,
  add constraint profissionais_intervalo_agenda_minutos_check
    check (intervalo_agenda_minutos in (30, 60, 120));

alter table if exists public.profissionais
  drop constraint if exists profissionais_sinal_confirmacao_responsavel_check,
  add constraint profissionais_sinal_confirmacao_responsavel_check
    check (sinal_confirmacao_responsavel in ('salao', 'profissional'));

alter table if exists public.agendamentos
  add column if not exists sinal_percentual numeric,
  add column if not exists sinal_pix_chave text,
  add column if not exists sinal_pix_recebedor text,
  add column if not exists sinal_pix_cidade text,
  add column if not exists sinal_whatsapp text,
  add column if not exists sinal_mensagem_comprovante text,
  add column if not exists sinal_confirmacao_responsavel text not null default 'salao',
  add column if not exists sinal_confirmado_por_tipo text,
  add column if not exists sinal_confirmado_por_id uuid,
  add column if not exists sinal_confirmado_por_nome text,
  add column if not exists sinal_confirmado_em timestamptz;

alter table if exists public.agendamentos
  drop constraint if exists agendamentos_sinal_confirmacao_responsavel_check,
  add constraint agendamentos_sinal_confirmacao_responsavel_check
    check (sinal_confirmacao_responsavel in ('salao', 'profissional'));

alter table if exists public.agendamentos
  drop constraint if exists agendamentos_sinal_confirmado_por_tipo_check,
  add constraint agendamentos_sinal_confirmado_por_tipo_check
    check (
      sinal_confirmado_por_tipo is null
      or sinal_confirmado_por_tipo in ('salao', 'profissional')
    );

create index if not exists profissionais_sinal_confirmacao_idx
  on public.profissionais (id_salao, sinal_confirmacao_responsavel)
  where sinal_pix_proprio is true;

create index if not exists agendamentos_sinal_status_confirmacao_idx
  on public.agendamentos (id_salao, sinal_status, sinal_confirmacao_responsavel);
