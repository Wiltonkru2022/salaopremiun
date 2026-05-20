create or replace function public.buscar_saloes_proximos(
  lat_cliente double precision,
  lon_cliente double precision,
  raio_km double precision default 20.0,
  limite integer default 24,
  busca text default null
)
returns table (
  id uuid,
  distancia_km double precision
)
language sql
stable
set search_path = ''
as $$
  with parametros as (
    select
      case
        when lat_cliente between -90 and 90
          and lon_cliente between -180 and 180
          and not (lat_cliente = 0 and lon_cliente = 0)
        then extensions.st_setsrid(
          extensions.st_makepoint(lon_cliente, lat_cliente),
          4326
        )::extensions.geography
        else null
      end as ponto_cliente,
      greatest(1.0, least(coalesce(raio_km, 20.0), 100.0)) * 1000.0 as raio_metros,
      greatest(1, least(coalesce(limite, 24), 50)) as limite_busca,
      nullif(trim(coalesce(busca, '')), '') as termo
  )
  select
    s.id,
    round(
      (
        extensions.st_distance(localizacao.ponto_salao, parametros.ponto_cliente) / 1000.0
      )::numeric,
      2
    )::double precision as distancia_km
  from public.saloes s
  cross join parametros
  cross join lateral (
    select extensions.st_setsrid(
      extensions.st_makepoint(s.longitude::double precision, s.latitude::double precision),
      4326
    )::extensions.geography as ponto_salao
  ) localizacao
  where parametros.ponto_cliente is not null
    and lower(regexp_replace(trim(coalesce(s.status, '')), '[-\s]+', '_', 'g'))
      in ('ativo', 'ativa', 'teste_gratis', 'trial', 'trialing', 'em_teste', 'pago', 'active')
    and s.app_cliente_publicado = true
    and coalesce(s.app_cliente_pausado, false) = false
    and s.latitude is not null
    and s.longitude is not null
    and s.latitude between -34 and 6
    and s.longitude between -75 and -30
    and not (s.latitude = 0 and s.longitude = 0)
    and (
      parametros.termo is null
      or lower(concat_ws(' ', s.nome, s.nome_fantasia, s.cidade, s.bairro, s.descricao_publica))
        like '%' || lower(parametros.termo) || '%'
    )
    and extensions.st_dwithin(
      localizacao.ponto_salao,
      parametros.ponto_cliente,
      parametros.raio_metros
    )
  order by localizacao.ponto_salao operator(extensions.<->) parametros.ponto_cliente
  limit (select limite_busca from parametros);
$$;
