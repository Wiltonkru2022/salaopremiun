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
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_blog_posts_status_publicado
  on public.blog_posts (status, publicado_em desc);

create index if not exists idx_blog_posts_categoria
  on public.blog_posts (categoria_id);

alter table public.blog_categorias enable row level security;
alter table public.blog_posts enable row level security;

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

insert into public.blog_posts (
  categoria_id,
  slug,
  titulo,
  descricao,
  resumo,
  conteudo,
  imagem_capa_url,
  imagem_capa_alt,
  tempo_leitura,
  tags,
  status,
  destaque,
  publicado_em
)
select
  c.id,
  seed.slug,
  seed.titulo,
  seed.descricao,
  seed.resumo,
  seed.conteudo,
  seed.imagem,
  seed.imagem_alt,
  seed.tempo,
  seed.tags,
  'publicado',
  seed.destaque,
  now()
from (
  values
    (
      'agenda-online',
      'agenda-de-clientes-veja-vantagens-e-ferramentas-usadas',
      'Agenda de clientes: veja as vantagens e ferramentas usadas',
      'Entenda como uma agenda de clientes ajuda salões a reduzir faltas, organizar profissionais e melhorar a experiência de atendimento.',
      'Uma boa agenda deixa de ser apenas uma lista de horários e vira o centro da operação.',
      'A agenda de clientes é uma das ferramentas mais importantes para salões, barbearias, clínicas de estética e studios. Quando ela está integrada ao restante do sistema, cada horário marcado já nasce com contexto: quem é o cliente, qual serviço será feito, qual profissional atende e quais próximos passos precisam acontecer.' || E'\n\n' ||
      'No SalaoPremium, a agenda conversa com clientes, profissionais, comandas e caixa. Isso ajuda a diminuir remarcações perdidas, melhora a previsão de movimento do dia e facilita a rotina da recepção.',
      '/marketing-kit/site-hero.png',
      'Tela do sistema SalaoPremium com visão comercial e operacional',
      '6 min',
      array['agenda de clientes', 'sistema para salão', 'atendimento'],
      true
    ),
    (
      'automacao',
      '5-tarefas-de-vendas-para-automatizar-com-o-ecossistema-salao-premiun',
      '5 tarefas de vendas para automatizar com o ecossistema Salão Premiun',
      'Veja tarefas comerciais que podem ser automatizadas para vender mais serviços e produtos sem perder controle do atendimento.',
      'Automatizar vendas no salão tira peso operacional da equipe para ela atender melhor.',
      'A primeira tarefa é lembrar clientes sobre retornos. Corte, manutenção, hidratação, unha e procedimentos recorrentes podem gerar oportunidades futuras quando ficam registrados no sistema.' || E'\n\n' ||
      'A segunda é organizar comandas abertas. Cada atendimento precisa virar venda fechada com clareza de serviços, produtos, descontos e pagamentos.',
      '/marketing-kit/instagram-feed.png',
      'Peças de marketing para divulgação de salão nas redes sociais',
      '7 min',
      array['automação de vendas', 'whatsapp', 'gestão comercial'],
      false
    ),
    (
      'vendas-e-caixa',
      'o-que-o-salao-premium-oferece',
      'O que o SalaoPremium oferece para salões e barbearias',
      'Conheça os principais recursos do SalaoPremium: agenda, clientes, comandas, caixa, estoque, profissionais, comissões e app profissional.',
      'O SalaoPremium une agenda, financeiro, equipe e operação para o dono do salão tomar decisões com menos improviso.',
      'O SalaoPremium oferece uma base completa para administrar o dia a dia do salão. A agenda organiza horários e profissionais; o cadastro de clientes guarda histórico; as comandas registram serviços, produtos e pagamentos.' || E'\n\n' ||
      'No financeiro, o caixa ajuda a entender entradas, saídas e fechamento. No operacional, o controle de estoque evita perda de produtos e melhora a reposição.',
      '/marketing-kit/facebook-link.png',
      'Arte de divulgação do SalaoPremium para redes sociais',
      '5 min',
      array['sistema para salão', 'comandas', 'caixa'],
      false
    )
) as seed(categoria_slug, slug, titulo, descricao, resumo, conteudo, imagem, imagem_alt, tempo, tags, destaque)
join public.blog_categorias c on c.slug = seed.categoria_slug
on conflict (slug) do nothing;
