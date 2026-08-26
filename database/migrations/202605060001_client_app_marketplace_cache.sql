create table if not exists public.client_app_next_slots (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_servico uuid null references public.servicos(id) on delete cascade,
  id_profissional uuid null references public.profissionais(id) on delete cascade,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '15 minutes'),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists client_app_next_slots_uidx
  on public.client_app_next_slots (id_salao, id_servico, id_profissional, data, hora_inicio);

create index if not exists client_app_next_slots_lookup_idx
  on public.client_app_next_slots (id_salao, expires_at, data, hora_inicio);

create table if not exists public.client_app_marketplace_cache (
  id_salao uuid primary key references public.saloes(id) on delete cascade,
  nome text not null,
  cidade text null,
  bairro text null,
  search_text text not null,
  payload jsonb not null default '{}'::jsonb,
  nota_media numeric(3,2) null,
  total_avaliacoes integer not null default 0,
  preco_minimo numeric(12,2) null,
  duracao_minima integer null,
  total_servicos integer not null default 0,
  total_profissionais integer not null default 0,
  proximo_horario_em timestamptz null,
  proximo_horario_label text null,
  categorias text[] not null default '{}'::text[],
  publicado boolean not null default true,
  ranking_score numeric(12,2) not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_app_marketplace_cache_publicado_rank_idx
  on public.client_app_marketplace_cache (publicado, ranking_score desc, nome);

create index if not exists client_app_marketplace_cache_local_idx
  on public.client_app_marketplace_cache (cidade, bairro)
  where publicado = true;

create index if not exists client_app_marketplace_cache_search_idx
  on public.client_app_marketplace_cache using gin (to_tsvector('portuguese', search_text));

create or replace function public.refresh_client_app_marketplace_cache(
  p_id_salao uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.client_app_marketplace_cache
  where p_id_salao is null or id_salao = p_id_salao;

  insert into public.client_app_marketplace_cache (
    id_salao,
    nome,
    cidade,
    bairro,
    search_text,
    payload,
    nota_media,
    total_avaliacoes,
    preco_minimo,
    duracao_minima,
    total_servicos,
    total_profissionais,
    proximo_horario_em,
    proximo_horario_label,
    categorias,
    publicado,
    ranking_score,
    updated_at
  )
  select
    s.id,
    coalesce(nullif(trim(s.nome_fantasia), ''), nullif(trim(s.nome), ''), 'Salao Premium') as nome,
    nullif(trim(s.cidade), '') as cidade,
    nullif(trim(s.bairro), '') as bairro,
    lower(concat_ws(
      ' ',
      s.nome,
      s.nome_fantasia,
      s.cidade,
      s.bairro,
      s.descricao_publica,
      array_to_string(coalesce(service_stats.categorias, '{}'::text[]), ' ')
    )) as search_text,
    jsonb_build_object(
      'id', s.id,
      'nome', coalesce(nullif(trim(s.nome_fantasia), ''), nullif(trim(s.nome), ''), 'Salao Premium'),
      'cidade', nullif(trim(s.cidade), ''),
      'estado', nullif(trim(s.estado), ''),
      'bairro', nullif(trim(s.bairro), ''),
      'endereco', nullif(trim(s.endereco), ''),
      'numero', nullif(trim(s.numero), ''),
      'cep', nullif(trim(s.cep), ''),
      'enderecoCompleto', nullif(concat_ws(' | ',
        nullif(concat_ws(', ', nullif(trim(s.endereco), ''), nullif(trim(s.numero), '')), ''),
        nullif(trim(s.bairro), ''),
        nullif(concat_ws(' - ', nullif(trim(s.cidade), ''), nullif(trim(s.estado), '')), ''),
        nullif(trim(s.cep), '')
      ), ''),
      'logoUrl', nullif(trim(s.logo_url), ''),
      'fotoCapaUrl', nullif(trim(s.foto_capa_url), ''),
      'latitude', s.latitude,
      'longitude', s.longitude,
      'whatsapp', nullif(trim(s.whatsapp), ''),
      'telefone', nullif(trim(s.telefone), ''),
      'descricaoPublica', nullif(trim(s.descricao_publica), ''),
      'estacionamento', coalesce(s.estacionamento, false),
      'formasPagamento', coalesce(s.formas_pagamento_publico, '[]'::jsonb)
    ) as payload,
    review_stats.nota_media,
    coalesce(review_stats.total_avaliacoes, 0),
    service_stats.preco_minimo,
    service_stats.duracao_minima,
    coalesce(service_stats.total_servicos, 0),
    coalesce(professional_stats.total_profissionais, 0),
    next_slot.proximo_horario_em,
    case
      when next_slot.proximo_horario_em is null then
        case when coalesce(service_stats.total_servicos, 0) > 0 then 'Agenda online' else 'Em publicacao' end
      when next_slot.proximo_horario_em::date = current_date then
        'Hoje ' || to_char(next_slot.proximo_horario_em, 'HH24:MI')
      when next_slot.proximo_horario_em::date = current_date + 1 then
        'Amanha ' || to_char(next_slot.proximo_horario_em, 'HH24:MI')
      else
        to_char(next_slot.proximo_horario_em, 'DD/MM HH24:MI')
    end as proximo_horario_label,
    coalesce(service_stats.categorias, '{}'::text[]),
    true,
    (
      coalesce(review_stats.nota_media, 0) * 10
      + least(coalesce(review_stats.total_avaliacoes, 0), 30)
      + least(coalesce(service_stats.total_servicos, 0), 20)
      + least(coalesce(professional_stats.total_profissionais, 0), 10)
      + case when next_slot.proximo_horario_em is not null then 20 else 0 end
    ) as ranking_score,
    timezone('utc', now())
  from public.saloes s
  join public.assinaturas a
    on a.id_salao = s.id
   and a.status = 'ativo'
   and a.plano = 'premium'
  left join lateral (
    select
      count(*)::integer as total_servicos,
      min(sv.preco)::numeric(12,2) as preco_minimo,
      min(coalesce(sv.duracao_minutos, sv.duracao))::integer as duracao_minima,
      array_remove(array_agg(distinct split_part(trim(sv.nome), ' ', 1)), '')::text[] as categorias
    from public.servicos sv
    where sv.id_salao = s.id
      and sv.ativo = true
      and sv.app_cliente_visivel = true
  ) service_stats on true
  left join lateral (
    select count(*)::integer as total_profissionais
    from public.profissionais p
    where p.id_salao = s.id
      and p.ativo = true
      and p.app_cliente_visivel = true
      and coalesce(p.eh_assistente, false) = false
  ) professional_stats on true
  left join lateral (
    select
      round(avg(ca.nota)::numeric, 2) as nota_media,
      count(*)::integer as total_avaliacoes
    from public.clientes_avaliacoes ca
    where ca.id_salao = s.id
  ) review_stats on true
  left join lateral (
    select min((n.data + n.hora_inicio)::timestamptz) as proximo_horario_em
    from public.client_app_next_slots n
    where n.id_salao = s.id
      and n.expires_at > timezone('utc', now())
      and (n.data + n.hora_inicio) >= now()
  ) next_slot on true
  where s.status = 'ativo'
    and s.app_cliente_publicado = true
    and (p_id_salao is null or s.id = p_id_salao);
end;
$$;

comment on table public.client_app_marketplace_cache is
  'Cache de vitrine do app cliente para evitar consultas pesadas no marketplace publico.';

comment on table public.client_app_next_slots is
  'Cache curto de proximos horarios do app cliente; pode ser preenchido por job quando a agenda muda.';
