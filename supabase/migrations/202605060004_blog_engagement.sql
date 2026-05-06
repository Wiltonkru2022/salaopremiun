alter table public.blog_posts
  add column if not exists views bigint not null default 0,
  add column if not exists data_agendamento timestamptz;

create table if not exists public.blog_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  session_id text,
  user_agent text,
  criado_em timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  origem text not null default 'blog',
  post_slug text,
  criado_em timestamptz not null default now()
);

alter table public.blog_views enable row level security;
alter table public.newsletter_subscribers enable row level security;

create or replace function public.increment_blog_post_views(p_post_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_views bigint;
begin
  update public.blog_posts
  set views = views + 1
  where id = p_post_id
  returning views into next_views;

  return coalesce(next_views, 0);
end;
$$;

revoke all on function public.increment_blog_post_views(uuid) from public;
grant execute on function public.increment_blog_post_views(uuid) to service_role;

create index if not exists idx_blog_views_post_id_criado
  on public.blog_views (post_id, criado_em desc);

create index if not exists idx_newsletter_subscribers_criado
  on public.newsletter_subscribers (criado_em desc);
