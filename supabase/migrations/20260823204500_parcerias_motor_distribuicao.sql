alter table public.parceria_campanhas
  add column if not exists prioridade integer not null default 0,
  add column if not exists peso_rotacao integer not null default 1,
  add column if not exists limite_frequencia_dia integer not null default 2,
  add column if not exists limite_impressoes_dia integer,
  add column if not exists exclusiva boolean not null default false;

alter table public.parceria_campanhas
  drop constraint if exists parceria_campanhas_prioridade_check,
  add constraint parceria_campanhas_prioridade_check check (prioridade between 0 and 100),
  drop constraint if exists parceria_campanhas_peso_rotacao_check,
  add constraint parceria_campanhas_peso_rotacao_check check (peso_rotacao between 1 and 100),
  drop constraint if exists parceria_campanhas_limite_frequencia_dia_check,
  add constraint parceria_campanhas_limite_frequencia_dia_check check (limite_frequencia_dia between 1 and 50),
  drop constraint if exists parceria_campanhas_limite_impressoes_dia_check,
  add constraint parceria_campanhas_limite_impressoes_dia_check check (limite_impressoes_dia is null or limite_impressoes_dia >= 1);

create index if not exists idx_parceria_campanhas_distribuicao
  on public.parceria_campanhas (status, prioridade desc, inicio_em, fim_em);

create index if not exists idx_parceria_metricas_diarias_lookup
  on public.parceria_metricas_diarias (id_campanha, data, local_exibicao);
