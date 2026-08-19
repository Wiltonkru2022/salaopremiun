alter table public.blog_categorias enable row level security;
alter table public.blog_posts enable row level security;

drop policy if exists blog_categorias_public_write on public.blog_categorias;
drop policy if exists blog_posts_public_write on public.blog_posts;
drop policy if exists blog_categorias_public_read on public.blog_categorias;
drop policy if exists blog_posts_public_read on public.blog_posts;

create policy blog_categorias_public_read
on public.blog_categorias
for select
to anon, authenticated
using (ativo = true);

create policy blog_posts_public_read
on public.blog_posts
for select
to anon, authenticated
using (status = 'publicado');

revoke all on table public.blog_categorias from anon, authenticated;
revoke all on table public.blog_posts from anon, authenticated;

grant select on table public.blog_categorias to anon, authenticated;
grant select on table public.blog_posts to anon, authenticated;

grant select, insert, update, delete on table public.blog_categorias to service_role;
grant select, insert, update, delete on table public.blog_posts to service_role;
