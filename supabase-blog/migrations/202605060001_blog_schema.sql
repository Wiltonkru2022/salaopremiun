create table if not exists public.blog_categorias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descricao text,
  ordem integer not null default 100,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.blog_categorias(id) on delete restrict,
  slug text not null unique,
  titulo text not null,
  descricao text not null,
  resumo text,
  conteudo text not null,
  imagem_capa_url text,
  imagem_capa_alt text,
  tempo_leitura text not null default '5 min',
  tags text[] not null default '{}',
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  destaque boolean not null default false,
  views bigint not null default 0,
  data_agendamento timestamptz,
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

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

create index if not exists idx_blog_posts_status_publicado
  on public.blog_posts (status, publicado_em desc);

create index if not exists idx_blog_posts_categoria
  on public.blog_posts (categoria_id);

create index if not exists idx_blog_views_post_id_criado
  on public.blog_views (post_id, criado_em desc);

create index if not exists idx_newsletter_subscribers_criado
  on public.newsletter_subscribers (criado_em desc);

alter table public.blog_categorias enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_views enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "blog_categorias_public_read" on public.blog_categorias;
create policy "blog_categorias_public_read"
  on public.blog_categorias
  for select
  using (ativo = true);

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
  on public.blog_posts
  for select
  using (status = 'publicado');

grant select on public.blog_categorias to anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant insert on public.blog_views to anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;

drop policy if exists "blog_views_public_insert" on public.blog_views;
create policy "blog_views_public_insert"
  on public.blog_views
  for insert
  with check (true);

drop policy if exists "newsletter_subscribers_public_insert" on public.newsletter_subscribers;
create policy "newsletter_subscribers_public_insert"
  on public.newsletter_subscribers
  for insert
  with check (origem = 'blog');

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
grant execute on function public.increment_blog_post_views(uuid) to anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media',
  'blog-media',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.blog_categorias (slug, nome, descricao, ordem)
values
  ('agenda-online', 'Agenda online', 'Organização de horários, clientes, profissionais e remarcações.', 10),
  ('vendas-e-caixa', 'Vendas e caixa', 'Comandas, pagamentos, fechamento de caixa e gestão comercial.', 20),
  ('automacao', 'Automação', 'Rotinas que reduzem tarefas repetitivas no salão.', 30),
  ('marketing', 'Marketing e fidelização', 'Ideias para redes sociais, relacionamento e retorno de clientes.', 40)
on conflict (slug) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ordem = excluded.ordem,
  ativo = true,
  atualizado_em = now();
