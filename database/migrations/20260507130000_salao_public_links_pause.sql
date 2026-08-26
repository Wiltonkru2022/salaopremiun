alter table public.saloes
  add column if not exists app_cliente_pausado boolean not null default false,
  add column if not exists app_cliente_pausa_mensagem text not null default 'Salao pausado no momento. Em breve a agenda online volta ao normal.',
  add column if not exists app_cliente_slug text;

create or replace function public.normalize_salao_public_slug(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(
        translate(
          lower(coalesce(p_value, '')),
          'áàãâäéèêëíìîïóòõôöúùûüçñ',
          'aaaaaeeeeiiiiooooouuuucn'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '-+',
      '-',
      'g'
    )),
    ''
  );
$$;

update public.saloes
set app_cliente_slug = left(
  coalesce(
    public.normalize_salao_public_slug(nome_fantasia),
    public.normalize_salao_public_slug(nome),
    'salao'
  ) || '-' || left(replace(id::text, '-', ''), 6),
  64
)
where app_cliente_slug is null or trim(app_cliente_slug) = '';

alter table public.saloes
  alter column app_cliente_slug set not null;

create unique index if not exists saloes_app_cliente_slug_uidx
  on public.saloes (app_cliente_slug);

create index if not exists saloes_app_cliente_vitrine_idx
  on public.saloes (status, app_cliente_publicado, app_cliente_pausado, cidade, bairro)
  where app_cliente_publicado = true;
