export type BlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  categorySlug: string;
  categoryName: string;
  readTime: string;
  publishedAt: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  body: string[];
  featured?: boolean;
};

export const defaultBlogCategories: BlogCategory[] = [
  {
    id: "agenda-online",
    slug: "agenda-online",
    name: "Agenda online",
    description: "Organizacao de horarios, clientes, profissionais e remarcacoes.",
  },
  {
    id: "vendas-e-caixa",
    slug: "vendas-e-caixa",
    name: "Vendas e caixa",
    description: "Comandas, pagamentos, fechamento de caixa e gestao comercial.",
  },
  {
    id: "automacao",
    slug: "automacao",
    name: "Automacao",
    description: "Rotinas que reduzem tarefas repetitivas no salao.",
  },
  {
    id: "marketing",
    slug: "marketing",
    name: "Marketing e fidelizacao",
    description: "Ideias para redes sociais, relacionamento e retorno de clientes.",
  },
];

export const defaultBlogPosts: BlogPost[] = [
  {
    id: "agenda-clientes-vantagens-ferramentas",
    slug: "agenda-de-clientes-veja-vantagens-e-ferramentas-usadas",
    title: "Agenda de clientes: veja as vantagens e ferramentas usadas",
    description:
      "Entenda como uma agenda de clientes ajuda saloes a reduzir faltas, organizar profissionais e melhorar a experiencia de atendimento.",
    excerpt:
      "Uma boa agenda deixa de ser apenas uma lista de horarios e vira o centro da operacao: cliente, servico, profissional, comanda e historico no mesmo fluxo.",
    categorySlug: "agenda-online",
    categoryName: "Agenda online",
    readTime: "6 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/site-hero.png",
    coverAlt: "Tela do sistema SalaoPremium com visao comercial e operacional",
    tags: ["agenda de clientes", "sistema para salao", "atendimento"],
    featured: true,
    body: [
      "A agenda de clientes e uma das ferramentas mais importantes para saloes, barbearias, clinicas de estetica e studios. Quando ela esta integrada ao restante do sistema, cada horario marcado ja nasce com contexto: quem e o cliente, qual servico sera feito, qual profissional atende e quais proximos passos precisam acontecer.",
      "No SalaoPremium, a agenda conversa com clientes, profissionais, comandas e caixa. Isso ajuda a diminuir remarcacoes perdidas, melhora a previsao de movimento do dia e facilita a rotina da recepcao.",
      "Outra vantagem esta no historico. Saber quando a cliente voltou, qual servico costuma fazer e qual profissional prefere ajuda o salao a vender melhor sem parecer insistente.",
    ],
  },
  {
    id: "tarefas-vendas-automatizar",
    slug: "5-tarefas-de-vendas-para-automatizar-com-o-ecossistema-salao-premiun",
    title: "5 tarefas de vendas para automatizar com o ecossistema Salao Premiun",
    description:
      "Veja tarefas comerciais que podem ser automatizadas para vender mais servicos e produtos sem perder controle do atendimento.",
    excerpt:
      "Automatizar vendas no salao nao significa perder o toque humano. Significa tirar peso operacional da equipe para ela atender melhor.",
    categorySlug: "automacao",
    categoryName: "Automacao",
    readTime: "7 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/instagram-feed.png",
    coverAlt: "Pecas de marketing para divulgacao de salao nas redes sociais",
    tags: ["automacao de vendas", "whatsapp", "gestao comercial"],
    body: [
      "A primeira tarefa e lembrar clientes sobre retornos. Corte, manutencao, hidratacao, unha e procedimentos recorrentes podem gerar oportunidades futuras quando ficam registrados no sistema.",
      "A segunda e organizar comandas abertas. Cada atendimento precisa virar venda fechada com clareza de servicos, produtos, descontos e pagamentos.",
      "A terceira e acompanhar clientes sem visita recente. Uma lista simples de leitura comercial ja mostra quem merece uma campanha, uma mensagem ou uma oferta de retorno.",
      "A quarta e padronizar pacotes e combos. Quando os servicos estao bem cadastrados, a equipe oferece com mais seguranca.",
      "A quinta e medir resultados. Sem relatorio, o salao vende no escuro. Com sistema, da para enxergar faturamento, ticket medio, produtos e profissionais com mais saida.",
    ],
  },
  {
    id: "o-que-oferece",
    slug: "o-que-o-salao-premium-oferece",
    title: "O que o SalaoPremium oferece para saloes e barbearias",
    description:
      "Conheca os principais recursos do SalaoPremium: agenda, clientes, comandas, caixa, estoque, profissionais, comissoes e app profissional.",
    excerpt:
      "O SalaoPremium une agenda, financeiro, equipe e operacao para o dono do salao tomar decisoes com menos improviso.",
    categorySlug: "vendas-e-caixa",
    categoryName: "Vendas e caixa",
    readTime: "5 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/facebook-link.png",
    coverAlt: "Arte de divulgacao do SalaoPremium para redes sociais",
    tags: ["sistema para salao", "comandas", "caixa"],
    body: [
      "O SalaoPremium oferece uma base completa para administrar o dia a dia do salao. A agenda organiza horarios e profissionais; o cadastro de clientes guarda historico; as comandas registram servicos, produtos e pagamentos.",
      "No financeiro, o caixa ajuda a entender entradas, saidas e fechamento. No operacional, o controle de estoque evita perda de produtos e melhora a reposicao.",
      "Para equipes, o app profissional permite acompanhar agenda, clientes e atendimentos com mais autonomia, mantendo o dono do salao no controle.",
    ],
  },
  {
    id: "agenda-online",
    slug: "o-que-e-uma-agenda-online",
    title: "O que e uma agenda online e por que ela melhora a rotina do salao",
    description:
      "Saiba como a agenda online ajuda a centralizar horarios, reduzir desencontros e criar uma experiencia mais profissional para clientes.",
    excerpt:
      "Agenda online e o ponto de partida para transformar horarios soltos em uma operacao organizada e vendavel.",
    categorySlug: "agenda-online",
    categoryName: "Agenda online",
    readTime: "4 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/stories.png",
    coverAlt: "Modelo visual para comunicacao do salao em stories",
    tags: ["agenda online", "marcacao de horario", "produtividade"],
    body: [
      "Uma agenda online e um sistema acessivel pela internet para registrar, consultar e atualizar horarios. Diferente de uma agenda em papel, ela pode ser compartilhada com equipe, atualizada em tempo real e conectada a outros dados do negocio.",
      "No salao, isso evita conflitos de horario, melhora a comunicacao entre recepcao e profissional e ajuda o gestor a acompanhar a ocupacao da equipe.",
      "Quando a agenda esta integrada a clientes e comandas, cada atendimento deixa rastro comercial. Esse rastro vira historico, relatorio e oportunidade de fidelizacao.",
    ],
  },
  {
    id: "fidelizar-clientes",
    slug: "como-posso-fidelizar-clientes-no-salao",
    title: "Como posso fidelizar clientes no salao?",
    description:
      "Ideias praticas para fidelizar clientes usando historico de atendimento, retornos, ofertas e relacionamento organizado.",
    excerpt:
      "Fidelizacao acontece quando o cliente sente que o salao lembra dele, entende seu gosto e facilita sua proxima visita.",
    categorySlug: "marketing",
    categoryName: "Marketing e fidelizacao",
    readTime: "6 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/site-hero.png",
    coverAlt: "Visao institucional do sistema SalaoPremium",
    tags: ["fidelizacao", "clientes", "retencao"],
    body: [
      "Para fidelizar clientes, comece pelo historico. Anote preferencias, servicos feitos, produtos comprados e frequencia de retorno.",
      "Depois, transforme esse historico em acao. Um lembrete de manutencao, uma oferta no momento certo ou uma mensagem pos-atendimento podem ser mais fortes que descontos genericos.",
      "O sistema tambem ajuda a identificar clientes que sumiram. Essa lista de leitura comercial mostra quem precisa de contato antes que escolha outro salao.",
    ],
  },
  {
    id: "redes-sociais",
    slug: "o-que-fazer-para-estar-a-frente-nas-redes-sociais",
    title: "O que fazer para estar a frente nas redes sociais",
    description:
      "Veja ideias de conteudo para saloes crescerem nas redes sociais com consistencia, prova social e ofertas bem organizadas.",
    excerpt:
      "Redes sociais funcionam melhor quando o salao combina rotina real, resultado visual, agenda organizada e chamada clara para marcar horario.",
    categorySlug: "marketing",
    categoryName: "Marketing e fidelizacao",
    readTime: "5 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/instagram-feed.png",
    coverAlt: "Layout de feed para conteudo de salao no Instagram",
    tags: ["redes sociais", "instagram para salao", "marketing"],
    body: [
      "Para estar a frente nas redes sociais, mostre bastidores, antes e depois, agenda da semana, servicos mais procurados e depoimentos de clientes.",
      "O segredo e transformar a operacao em conteudo. Se o salao sabe quais servicos vendem mais, quais horarios estao livres e quais clientes voltam sempre, fica mais facil publicar com intencao.",
      "Use chamadas simples: marcar horario, conhecer pacote, falar no WhatsApp ou ver disponibilidade. Conteudo bom precisa abrir caminho para uma acao.",
    ],
  },
  {
    id: "gerenciar-vendas-agenda",
    slug: "como-posso-gerenciar-minhas-vendas-com-sistema-de-agenda",
    title: "Como posso gerenciar minhas vendas com sistema de agenda?",
    description:
      "Entenda como uma agenda integrada ao caixa ajuda a controlar vendas, comandas, produtos, servicos e desempenho da equipe.",
    excerpt:
      "A venda comeca antes do pagamento. Ela nasce na agenda, passa pelo atendimento e se confirma na comanda e no caixa.",
    categorySlug: "vendas-e-caixa",
    categoryName: "Vendas e caixa",
    readTime: "6 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/facebook-link.png",
    coverAlt: "Arte comercial do SalaoPremium para divulgacao",
    tags: ["vendas", "agenda integrada", "caixa"],
    body: [
      "Gerenciar vendas com sistema de agenda significa ligar cada horario marcado a um possivel faturamento. O atendimento deixa de ser um evento isolado e passa a fazer parte de um fluxo comercial.",
      "Quando a cliente chega, a comanda pode registrar servicos, produtos, descontos e formas de pagamento. No fim do dia, o caixa mostra o que realmente entrou.",
      "Essa visao ajuda o gestor a saber quais servicos trazem mais receita, quais profissionais estao com agenda cheia e quais produtos saem junto com os atendimentos.",
    ],
  },
];

export function getDefaultCategory(slug: string) {
  return defaultBlogCategories.find((category) => category.slug === slug);
}

