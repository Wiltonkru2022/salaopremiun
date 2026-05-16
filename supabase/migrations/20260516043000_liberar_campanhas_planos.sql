insert into public.planos_recursos (
  id_plano,
  recurso_codigo,
  habilitado,
  limite_numero,
  observacao
)
select
  p.id,
  'campanhas',
  case
    when p.codigo in ('teste_gratis', 'pro', 'premium') then true
    else false
  end,
  null,
  case
    when p.codigo = 'basico' then 'Disponivel a partir do Pro'
    when p.codigo in ('teste_gratis', 'pro', 'premium') then 'Liberado'
    else 'Disponivel a partir do Pro'
  end
from public.planos_saas p
where p.codigo in ('teste_gratis', 'basico', 'pro', 'premium')
on conflict (id_plano, recurso_codigo)
do update set
  habilitado = excluded.habilitado,
  limite_numero = excluded.limite_numero,
  observacao = excluded.observacao,
  atualizado_em = now();
