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

## Automacao de novo post com Resend

Depois de verificar o dominio no Resend, configure tambem:

```env
RESEND_API_KEY=
BLOG_WEBHOOK_SECRET=
BLOG_PUBLIC_URL=https://blog.salaopremiun.com.br
BLOG_EMAIL_FROM=Blog SalaoPremium <novidades@salaopremiun.com.br>
BLOG_EMAIL_AUDIENCE_TO=novidades@salaopremiun.com.br
BLOG_EMAIL_REPLY_TO=contato@salaopremiun.com.br
```

Crie um segredo forte para `BLOG_WEBHOOK_SECRET` e use o mesmo valor no
Database Webhook do Supabase.

No Supabase do blog, crie o webhook:

- Nome: `on_post_published`
- Tabela: `public.blog_posts`
- Eventos: `INSERT` e `UPDATE`
- Metodo: `POST`
- URL: `https://salaopremiun.com.br/api/blog/post-published-webhook`
- Header: `x-blog-webhook-secret: <valor de BLOG_WEBHOOK_SECRET>`

A rota so envia e-mail quando o post entra em `status = publicado`.
Atualizacoes posteriores em um post que ja estava publicado nao reenviam a
newsletter.
