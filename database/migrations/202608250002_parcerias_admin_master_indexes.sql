create index if not exists idx_parceria_metricas_diarias_data_desc
  on public.parceria_metricas_diarias (data desc);

create index if not exists idx_parceria_criativos_campanha
  on public.parceria_criativos (id_campanha);
