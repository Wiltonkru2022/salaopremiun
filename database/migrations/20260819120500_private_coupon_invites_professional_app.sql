alter table public.cupom_salao_resgates drop constraint if exists cupom_salao_resgates_status_check;
alter table public.cupom_salao_resgates add constraint cupom_salao_resgates_status_check check (status = any (array['enviado'::text,'resgatado'::text,'usado'::text,'cancelado'::text,'expirado'::text]));

alter table public.cupons_salao drop constraint if exists cupons_salao_publico_tipo_check;
alter table public.cupons_salao add constraint cupons_salao_publico_tipo_check check (publico_tipo = any (array['link'::text,'link_privado'::text,'clientes_especificos'::text,'novos_clientes'::text]));

create unique index if not exists cupom_salao_resgates_token_uidx on public.cupom_salao_resgates(token);
create index if not exists cupom_salao_resgates_cliente_status_idx on public.cupom_salao_resgates(id_cliente,status,id_cupom);
