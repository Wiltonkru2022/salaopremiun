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
  ('agenda-online', 'Agenda online', 'Organizacao de horarios, clientes, profissionais e remarcacoes.', 10),
  ('vendas-e-caixa', 'Vendas e caixa', 'Comandas, pagamentos, fechamento de caixa e gestao comercial.', 20),
  ('automacao', 'Automacao', 'Rotinas que reduzem tarefas repetitivas no salao.', 30),
  ('marketing', 'Marketing e fidelizacao', 'Ideias para redes sociais, relacionamento e retorno de clientes.', 40)
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
      'Entenda como uma agenda de clientes ajuda saloes a reduzir faltas, organizar profissionais e melhorar a experiencia de atendimento.',
      'Uma boa agenda deixa de ser apenas uma lista de horarios e vira o centro da operacao.',
      'A agenda de clientes e uma das ferramentas mais importantes para saloes, barbearias, clinicas de estetica e studios. Quando ela esta integrada ao restante do sistema, cada horario marcado ja nasce com contexto: quem e o cliente, qual servico sera feito, qual profissional atende e quais proximos passos precisam acontecer.' || E'\n\n' ||
      'No SalaoPremium, a agenda conversa com clientes, profissionais, comandas e caixa. Isso ajuda a diminuir remarcacoes perdidas, melhora a previsao de movimento do dia e facilita a rotina da recepcao.',
      '/marketing-kit/site-hero.png',
      'Tela do sistema SalaoPremium com visao comercial e operacional',
      '6 min',
      array['agenda de clientes', 'sistema para salao', 'atendimento'],
      true
    ),
    (
      'automacao',
      '5-tarefas-de-vendas-para-automatizar-com-o-ecossistema-salao-premiun',
      '5 tarefas de vendas para automatizar com o ecossistema Salao Premiun',
      'Veja tarefas comerciais que podem ser automatizadas para vender mais servicos e produtos sem perder controle do atendimento.',
      'Automatizar vendas no salao tira peso operacional da equipe para ela atender melhor.',
      'A primeira tarefa e lembrar clientes sobre retornos. Corte, manutencao, hidratacao, unha e procedimentos recorrentes podem gerar oportunidades futuras quando ficam registrados no sistema.' || E'\n\n' ||
      'A segunda e organizar comandas abertas. Cada atendimento precisa virar venda fechada com clareza de servicos, produtos, descontos e pagamentos.',
      '/marketing-kit/instagram-feed.png',
      'Pecas de marketing para divulgacao de salao nas redes sociais',
      '7 min',
      array['automacao de vendas', 'whatsapp', 'gestao comercial'],
      false
    ),
    (
      'vendas-e-caixa',
      'o-que-o-salao-premium-oferece',
      'O que o SalaoPremium oferece para saloes e barbearias',
      'Conheca os principais recursos do SalaoPremium: agenda, clientes, comandas, caixa, estoque, profissionais, comissoes e app profissional.',
      'O SalaoPremium une agenda, financeiro, equipe e operacao para o dono do salao tomar decisoes com menos improviso.',
      'O SalaoPremium oferece uma base completa para administrar o dia a dia do salao. A agenda organiza horarios e profissionais; o cadastro de clientes guarda historico; as comandas registram servicos, produtos e pagamentos.' || E'\n\n' ||
      'No financeiro, o caixa ajuda a entender entradas, saidas e fechamento. No operacional, o controle de estoque evita perda de produtos e melhora a reposicao.',
      '/marketing-kit/facebook-link.png',
      'Arte de divulgacao do SalaoPremium para redes sociais',
      '5 min',
      array['sistema para salao', 'comandas', 'caixa'],
      false
    )
) as seed(categoria_slug, slug, titulo, descricao, resumo, conteudo, imagem, imagem_alt, tempo, tags, destaque)
join public.blog_categorias c on c.slug = seed.categoria_slug
on conflict (slug) do nothing;
