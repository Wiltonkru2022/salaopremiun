alter table public.parceria_campanhas
  drop constraint if exists parceria_campanhas_modelo_cobranca_check;

alter table public.parceria_campanhas
  add constraint parceria_campanhas_modelo_cobranca_check
  check (modelo_cobranca in ('mensal','periodo','cpm','cpc','cpa','permuta','interno'));

comment on column public.parceria_campanhas.modelo_cobranca is
  'Modelo comercial da campanha. Campanhas próprias do Salão Premium usam interno.';
