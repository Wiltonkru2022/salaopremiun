drop function if exists public.increment_blog_post_views(uuid);

drop table if exists public.blog_views cascade;
drop table if exists public.newsletter_subscribers cascade;
drop table if exists public.blog_posts cascade;
drop table if exists public.blog_categorias cascade;
