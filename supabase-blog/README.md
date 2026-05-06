# Projeto Supabase separado do blog

Este diretório guarda as migrations do novo projeto Supabase chamado `blog`.

Depois de criar o projeto no painel/CLI da Supabase, configure no Vercel:

```env
BLOG_SUPABASE_URL=
BLOG_SUPABASE_ANON_KEY=
BLOG_SUPABASE_SERVICE_ROLE_KEY=
```

O sistema principal continua usando `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
