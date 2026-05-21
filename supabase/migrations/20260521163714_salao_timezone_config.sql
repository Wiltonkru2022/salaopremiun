alter table public.configuracoes_salao
  add column if not exists fuso_horario text not null default 'America/Sao_Paulo';

alter table public.configuracoes_salao
  drop constraint if exists configuracoes_salao_fuso_horario_check;

alter table public.configuracoes_salao
  add constraint configuracoes_salao_fuso_horario_check
  check (
    fuso_horario in (
      'America/Sao_Paulo',
      'America/Campo_Grande',
      'America/Cuiaba',
      'America/Manaus',
      'America/Belem',
      'America/Fortaleza',
      'America/Rio_Branco'
    )
  );

comment on column public.configuracoes_salao.fuso_horario is
  'Fuso horario IANA usado para agenda, notificacoes, relatorios e integracoes do salao.';
