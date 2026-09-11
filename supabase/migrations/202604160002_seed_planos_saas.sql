do $$
begin
  if to_regclass('public.planos_saas') is null then
    raise exception 'Tabela public.planos_saas nao encontrada.';
  end if;
end
$$;

with planos(codigo, nome, descricao, valor_mensal, limite_usuarios, limite_profissionais, ativo) as (
  values
    ('teste_gratis', 'Teste gratis', 'Periodo de teste gratuito de 7 dias.', 0.00, 1, 3, true),
    ('basico', 'Basico', 'Ideal para salao pequeno.', 49.90, 2, 3, true),
    ('pro', 'Pro', 'Mais recursos e mais equipe.', 89.90, 5, 10, true),
    ('premium', 'Premium', 'Plano completo para operacao avancada.', 149.90, 999, 999, true)
)
update public.planos_saas as p
set
  nome = planos.nome,
  descricao = planos.descricao,
  valor_mensal = planos.valor_mensal,
  limite_usuarios = planos.limite_usuarios,
  limite_profissionais = planos.limite_profissionais,
  ativo = planos.ativo
from planos
where p.codigo = planos.codigo;

with planos(codigo, nome, descricao, valor_mensal, limite_usuarios, limite_profissionais, ativo) as (
  values
    ('teste_gratis', 'Teste gratis', 'Periodo de teste gratuito de 7 dias.', 0.00, 1, 3, true),
    ('basico', 'Basico', 'Ideal para salao pequeno.', 49.90, 2, 3, true),
    ('pro', 'Pro', 'Mais recursos e mais equipe.', 89.90, 5, 10, true),
    ('premium', 'Premium', 'Plano completo para operacao avancada.', 149.90, 999, 999, true)
)
insert into public.planos_saas (
  codigo,
  nome,
  descricao,
  valor_mensal,
  limite_usuarios,
  limite_profissionais,
  ativo
)
select
  planos.codigo,
  planos.nome,
  planos.descricao,
  planos.valor_mensal,
  planos.limite_usuarios,
  planos.limite_profissionais,
  planos.ativo
from planos
where not exists (
  select 1
  from public.planos_saas p
  where p.codigo = planos.codigo
);

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'planos_saas'
      and indexdef ilike '%unique%'
      and indexdef ilike '%(codigo)%'
  )
  and not exists (
    select 1
    from public.planos_saas
    group by codigo
    having count(*) > 1
  ) then
    execute 'create unique index planos_saas_codigo_unique_idx on public.planos_saas (codigo)';
  end if;
end
$$;
