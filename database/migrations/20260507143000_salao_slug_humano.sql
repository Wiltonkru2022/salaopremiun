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

drop index if exists public.saloes_app_cliente_slug_uidx;

with bases as (
  select
    id,
    coalesce(
      public.normalize_salao_public_slug(nome_fantasia),
      public.normalize_salao_public_slug(nome),
      'salao'
    ) as base_slug
  from public.saloes
),
dedup as (
  select
    id,
    case
      when count(*) over (partition by base_slug) = 1 then base_slug
      else left(base_slug || '-' || left(replace(id::text, '-', ''), 6), 64)
    end as next_slug
  from bases
)
update public.saloes s
set app_cliente_slug = d.next_slug
from dedup d
where d.id = s.id
  and s.app_cliente_slug is distinct from d.next_slug;

alter table public.saloes
  alter column app_cliente_slug set not null;

create unique index if not exists saloes_app_cliente_slug_uidx
  on public.saloes (app_cliente_slug);

create or replace function public.ensure_salao_app_cliente_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  candidate text;
  suffix text;
  attempt integer := 0;
begin
  base_slug := coalesce(
    public.normalize_salao_public_slug(new.app_cliente_slug),
    public.normalize_salao_public_slug(new.nome_fantasia),
    public.normalize_salao_public_slug(new.nome),
    'salao'
  );

  candidate := left(base_slug, 64);

  loop
    exit when not exists (
      select 1
      from public.saloes s
      where s.app_cliente_slug = candidate
        and s.id is distinct from new.id
    );

    attempt := attempt + 1;
    suffix := case
      when new.id is not null then left(replace(new.id::text, '-', ''), 6)
      else substr(md5(random()::text || clock_timestamp()::text), 1, 6)
    end;
    candidate := left(base_slug, greatest(1, 63 - length(suffix))) || '-' || suffix;

    if attempt > 1 then
      candidate := left(base_slug, greatest(1, 63 - length(suffix) - 3))
        || '-' || suffix || '-' || attempt::text;
    end if;
  end loop;

  new.app_cliente_slug := candidate;

  if nullif(trim(coalesce(new.app_cliente_pausa_mensagem, '')), '') is null then
    new.app_cliente_pausa_mensagem := 'Salao pausado no momento. Em breve a agenda online volta ao normal.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_salao_app_cliente_slug on public.saloes;

create trigger trg_ensure_salao_app_cliente_slug
before insert or update of nome, nome_fantasia, app_cliente_slug, app_cliente_pausa_mensagem
on public.saloes
for each row
execute function public.ensure_salao_app_cliente_slug();
