insert into public.planos_recursos (id_plano, recurso_codigo, habilitado, limite_numero, observacao)
select
  p.id,
  recurso.recurso_codigo,
  true,
  case recurso.recurso_codigo
    when 'clientes' then
      case p.codigo
        when 'teste_gratis' then 100
        when 'basico' then 2000
        when 'pro' then 10000
        when 'premium' then 999
      end
    when 'servicos' then
      case p.codigo
        when 'teste_gratis' then 20
        when 'basico' then 80
        when 'pro' then 250
        when 'premium' then 999
      end
    when 'agendamentos_mensais' then
      case p.codigo
        when 'teste_gratis' then 40
        when 'basico' then 250
        when 'pro' then 900
        when 'premium' then 999
      end
  end,
  case recurso.recurso_codigo
    when 'clientes' then
      case p.codigo
        when 'teste_gratis' then 'Até 100 clientes'
        when 'basico' then 'Até 2.000 clientes'
        when 'pro' then 'Até 10.000 clientes'
        when 'premium' then 'Sem limite prático'
      end
    when 'servicos' then
      case p.codigo
        when 'teste_gratis' then 'Até 20 serviços'
        when 'basico' then 'Até 80 serviços'
        when 'pro' then 'Até 250 serviços'
        when 'premium' then 'Sem limite prático'
      end
    when 'agendamentos_mensais' then
      case p.codigo
        when 'teste_gratis' then 'Limite mensal do período de teste'
        when 'basico' then 'Limite mensal do plano Básico'
        when 'pro' then 'Limite mensal do plano Pro'
        when 'premium' then 'Sem limite prático'
      end
  end
from public.planos_saas p
cross join (
  values
    ('clientes'),
    ('servicos'),
    ('agendamentos_mensais')
) as recurso(recurso_codigo)
where p.codigo in ('teste_gratis', 'basico', 'pro', 'premium')
on conflict (id_plano, recurso_codigo) do update
set
  habilitado = excluded.habilitado,
  limite_numero = excluded.limite_numero,
  observacao = excluded.observacao,
  atualizado_em = now();
