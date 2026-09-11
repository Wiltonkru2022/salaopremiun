alter table public.saloes
  add column if not exists produtos_modulo_ativo boolean not null default true;

update public.saloes
set produtos_modulo_ativo = true
where produtos_modulo_ativo is null;
