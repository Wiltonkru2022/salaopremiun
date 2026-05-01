alter table public.saloes_recursos_extras
add column if not exists limite_numero integer;

comment on column public.saloes_recursos_extras.limite_numero is
  'Override opcional de limite numerico por salao para o recurso informado.';
