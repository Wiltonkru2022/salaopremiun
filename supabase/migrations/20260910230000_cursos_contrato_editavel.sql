alter table public.cursos_catalogo
  add column if not exists contrato_versao text,
  add column if not exists contrato_conteudo text;

delete from public.cursos_catalogo
where slug = 'aperfeicoamento-profissional'
  and not exists (
    select 1 from public.cursos_matriculas
    where curso_id = cursos_catalogo.id
  );
