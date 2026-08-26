insert into public.planos_recursos (
  id_plano,
  recurso_codigo,
  habilitado,
  limite_numero,
  observacao
)
select
  p.id,
  'google_calendar',
  p.codigo in ('teste_gratis', 'pro', 'premium'),
  null,
  case
    when p.codigo in ('teste_gratis', 'pro', 'premium')
      then 'Sincronizacao automatica dos atendimentos confirmados com Google Calendar.'
    else 'Disponivel a partir do plano Pro.'
  end
from public.planos_saas p
where p.codigo in ('teste_gratis', 'basico', 'pro', 'premium')
on conflict (id_plano, recurso_codigo) do update
set
  habilitado = excluded.habilitado,
  limite_numero = excluded.limite_numero,
  observacao = excluded.observacao;
